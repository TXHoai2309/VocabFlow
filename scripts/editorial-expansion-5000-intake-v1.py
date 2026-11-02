"""Read-only source multipart ZIP intake; never execute returned scripts or write DB."""
from pathlib import Path, PurePosixPath
import argparse
import bisect
import hashlib
import io
import json
import os
import re
import stat
import zipfile
import shutil
import subprocess
import concurrent.futures
import collections
import array


class PartsReader(io.RawIOBase):
    """Expose ordered byte-split parts as one seekable file without another 5GB copy."""
    def __init__(self, paths):
        super().__init__()
        self.paths = [Path(p).resolve(strict=True) for p in paths]
        self.files = []
        self.starts = []
        self.length = 0
        self.position = 0
        for p in self.paths:
            self.starts.append(self.length)
            self.length += p.stat().st_size
            self.files.append(p.open('rb'))

    def readable(self):
        return True

    def seekable(self):
        return True

    def tell(self):
        return self.position

    def seek(self, offset, whence=0):
        if whence not in (0, 1, 2):
            raise ValueError('INVALID_WHENCE')
        target = offset if whence == 0 else self.position + offset if whence == 1 else self.length + offset
        if target < 0:
            raise ValueError('NEGATIVE_SEEK')
        self.position = target
        return target

    def read(self, size=-1):
        if size < 0:
            size = self.length - self.position
        size = min(size, max(0, self.length - self.position))
        result = bytearray()
        while size:
            index = bisect.bisect_right(self.starts, self.position) - 1
            end = self.starts[index + 1] if index + 1 < len(self.starts) else self.length
            f = self.files[index]
            f.seek(self.position - self.starts[index])
            block = f.read(min(size, end - self.position))
            if not block:
                raise ValueError('SOURCE_PART_CHANGED_OR_TRUNCATED')
            result.extend(block)
            self.position += len(block)
            size -= len(block)
        return bytes(result)

    def close(self):
        for f in getattr(self, 'files', []):
            f.close()
        super().close()


def require(condition, code):
    if not condition:
        raise ValueError(code)


def safe_path(root, rel):
    require(isinstance(rel, str) and '\\' not in rel and ':' not in rel, 'UNSAFE_PATH')
    p = PurePosixPath(rel)
    require(bool(p.parts) and not p.is_absolute() and '..' not in p.parts and p.as_posix() == rel,
            'UNSAFE_PATH')
    reserved = {'con', 'prn', 'aux', 'nul', *(f'com{i}' for i in range(1, 10)), *(f'lpt{i}' for i in range(1, 10))}
    require(all(not part.endswith((' ', '.')) and part.split('.')[0].casefold() not in reserved
                and not any(ord(c) < 32 for c in part) for part in p.parts), 'UNSAFE_WINDOWS_PATH')
    target = (root / rel).resolve()
    require(target.is_relative_to(root.resolve()), 'PATH_OUTSIDE_ROOT')
    return target


def read_json(path):
    return json.loads(Path(path).read_text(encoding='utf-8'))


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + '.writing')
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    os.replace(temporary, path)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def file_hash(path):
    h = hashlib.sha256()
    with path.open('rb') as f:
        for block in iter(lambda: f.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def open_archive(parts):
    reader = PartsReader(parts)
    archive = None
    try:
        archive = zipfile.ZipFile(reader)
        seen = set()
        for info in archive.infolist():
            safe_path(Path.cwd(), info.orig_filename.rstrip('/') if info.is_dir() else info.orig_filename)
            require(info.orig_filename == info.filename, 'AMBIGUOUS_ARCHIVE_PATH')
            safe_path(Path.cwd(), info.filename.rstrip('/') if info.is_dir() else info.filename)
            require(info.filename not in seen, 'DUPLICATE_ARCHIVE_PATH')
            seen.add(info.filename)
            require(not info.flag_bits & 1, 'ENCRYPTED_ARCHIVE_ENTRY')
            require(not stat.S_ISLNK(info.external_attr >> 16), 'ARCHIVE_SYMLINK')
            require(info.compress_type in (zipfile.ZIP_STORED, zipfile.ZIP_DEFLATED), 'UNSUPPORTED_COMPRESSION')
            require(0 <= info.file_size <= 64 * 1024 * 1024, 'ENTRY_SIZE_LIMIT')
        require(sum(i.file_size for i in archive.infolist()) <= 24 * 1024 ** 3, 'ARCHIVE_SIZE_LIMIT')
        return reader, archive
    except Exception:
        if archive is not None:
            archive.close()
        reader.close()
        raise


def inspect(parts, output, ready):
    reader, archive = open_archive(parts)
    try:
        inventory = []
        metadata = output / 'provider-metadata'
        for info in archive.infolist():
            inventory.append({'path': info.filename, 'bytes': info.file_size,
                              'compressedBytes': info.compress_size, 'crc32': info.CRC})
            if info.is_dir() or info.filename.startswith('media/'):
                continue
            # zipfile checks the complete entry CRC. Returned code is only stored, never run.
            content = archive.read(info)
            target = safe_path(metadata, info.filename)
            target.parent.mkdir(parents=True, exist_ok=True)
            if target.exists():
                require(target.read_bytes() == content, 'METADATA_CHANGED_BETWEEN_PARTS')
            else:
                target.write_bytes(content)
        mismatches = []
        compared = 0
        for path in ready.rglob('*'):
            if path.is_file() and '__pycache__' not in path.parts:
                rel = path.relative_to(ready).as_posix()
                try:
                    returned = archive.read(rel)
                except KeyError:
                    mismatches.append({'path': rel, 'reason': 'MISSING_FROZEN_INPUT'})
                    continue
                compared += 1
                if sha(returned) != file_hash(path):
                    mismatches.append({'path': rel, 'reason': 'FROZEN_INPUT_CHANGED'})
        report = {'status': 'ARCHIVE_INSPECTED', 'parts': [str(p) for p in reader.paths],
                  'archiveBytes': reader.length, 'entries': inventory,
                  'frozenInputFilesCompared': compared, 'frozenInputMismatches': mismatches}
        write_json(output / 'archive-inventory.current.json', report)
        require(not mismatches, 'FROZEN_INPUT_MISMATCH_SEE_INVENTORY')
        return report
    finally:
        archive.close()
        reader.close()


def extract(parts, output, ready):
    jobs_document = read_json(ready / 'media-jobs.json')
    jobs = {j['jobId']: j for j in jobs_document['jobs']}
    receipts_document = read_json(output / 'provider-metadata/media-results.json')
    require(receipts_document['jobsSha256'] == file_hash(ready / 'media-jobs.json'), 'RETURNED_JOBS_PIN_MISMATCH')
    receipts = {}
    for receipt in receipts_document['results']:
        jid = receipt.get('jobId')
        require(jid in jobs and jid not in receipts, 'UNKNOWN_OR_DUPLICATE_RECEIPT')
        job = jobs[jid]
        for key in ('itemId', 'kind', 'targetContentSha256', 'requestSha256'):
            require(receipt.get(key) == job[key], 'RECEIPT_BINDING_MISMATCH_' + key)
        require(receipt.get('path') == job['outputPath'], 'RECEIPT_PATH_MISMATCH')
        require(receipt.get('status') in ('SUCCEEDED', 'FAILED'), 'UNRESOLVED_RECEIPT_STATUS')
        if job['kind'] != 'IMAGE':
            require(receipt.get('exactText') == job['request']['exactText'], 'RECEIPT_EXACT_TEXT_MISMATCH')
        receipts[jid] = receipt
    require(set(receipts) == set(jobs), 'MISSING_RECEIPTS')
    expected = {r['path']: r for r in receipts.values() if r['status'] == 'SUCCEEDED'}
    reader, archive = open_archive(parts)
    try:
        actual = {i.filename: i for i in archive.infolist() if i.filename.startswith('media/') and not i.is_dir()}
        require(set(actual) == set(expected), 'UNEXPECTED_OR_MISSING_MEDIA_MEMBERS')
        required = sum(i.file_size for name, i in actual.items() if not safe_path(output, name).exists())
        require(shutil.disk_usage(output).free >= required + 512 * 1024 ** 2, 'INSUFFICIENT_FREE_SPACE')
        pins = []
        combined_hash = hashlib.sha256()
        for path in reader.paths:
            h = hashlib.sha256()
            with path.open('rb') as f:
                for block in iter(lambda: f.read(4 * 1024 * 1024), b''):
                    h.update(block)
                    combined_hash.update(block)
            pins.append({'path': str(path), 'byteLength': path.stat().st_size, 'sha256': h.hexdigest()})
            print(json.dumps({'phase': 'SOURCE_PART_HASHED', 'part': path.name}), flush=True)
        write_json(output / 'source-parts.current.json', {'parts': pins, 'archiveSha256': combined_hash.hexdigest(),
                   'archiveBytes': reader.length, 'virtualConcatenation': True, 'originalPartsDeleted': False})
        extracted = []
        checksums = {}
        for line in (output / 'provider-metadata/SHA256SUMS.txt').read_text(encoding='utf-8').splitlines():
            h, name = line.split('  ', 1)
            require(re.fullmatch('[0-9a-f]{64}', h) and name not in checksums, 'INVALID_PROVIDER_CHECKSUM_LIST')
            checksums[name] = h
        for n, (name, info) in enumerate(actual.items(), 1):
            receipt = expected[name]
            require(info.file_size == receipt['byteLength'], 'RECEIPT_BYTE_LENGTH_MISMATCH')
            target = safe_path(output, name)
            if target.exists():
                require(target.stat().st_size == info.file_size and file_hash(target) == receipt['sha256'],
                        'EXISTING_MEDIA_CHANGED')
            else:
                target.parent.mkdir(parents=True, exist_ok=True)
                temporary = target.with_name(target.name + '.extracting')
                h = hashlib.sha256()
                try:
                    with archive.open(info) as source, temporary.open('wb') as dest:
                        for block in iter(lambda: source.read(1024 * 1024), b''):
                            dest.write(block)
                            h.update(block)
                    require(h.hexdigest() == receipt['sha256'], 'MEDIA_RECEIPT_HASH_MISMATCH')
                    os.replace(temporary, target)
                finally:
                    if temporary.exists():
                        temporary.unlink()
            if name in checksums:
                require(checksums[name] == receipt['sha256'], 'PROVIDER_CHECKSUM_MISMATCH')
            extracted.append({'jobId': receipt['jobId'], 'path': name, 'sha256': receipt['sha256'],
                              'byteLength': info.file_size, 'kind': receipt['kind'],
                              'providerChecksumListed': name in checksums})
            if n % 1000 == 0:
                print(json.dumps({'phase': 'MEDIA_EXTRACTED_HASH_VERIFIED', 'files': n, 'total': len(actual)}), flush=True)
        failed = [r for r in receipts.values() if r['status'] == 'FAILED']
        report = {'status': 'FILES_VERIFIED_DECODE_PENDING', 'files': extracted, 'failedJobs': failed,
                  'mediaFiles': len(extracted), 'byKind': dict(collections.Counter(r['kind'] for r in extracted)),
                  'providerChecksumEntries': len(checksums),
                  'mediaMissingFromProviderChecksumList': sum(not r['providerChecksumListed'] for r in extracted),
                  'allMediaMatchedIndividualReceiptSha256': True, 'dbWrites': 0}
        write_json(output / 'extraction.current.json', report)
        return report
    finally:
        archive.close()
        reader.close()


def decode(output, workers=6):
    from PIL import Image
    import imageio_ffmpeg
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    extracted = read_json(output / 'extraction.current.json')
    previous_path = output / 'decode.current.json'
    previous = read_json(previous_path) if previous_path.exists() else {'files': []}
    cached = {r['jobId']: r for r in previous['files'] if r.get('status') == 'PASS'}

    def check(entry):
        record = {'jobId': entry['jobId'], 'sha256': entry['sha256'], 'kind': entry['kind']}
        try:
            old = cached.get(entry['jobId'])
            if old and old['sha256'] == entry['sha256']:
                return old
            path = safe_path(output, entry['path'])
            if entry['kind'] == 'IMAGE':
                with Image.open(path) as image:
                    require(image.format == 'PNG' and image.size == (768, 768), 'PNG_FORMAT_OR_DIMENSIONS')
                    image.verify()
                with Image.open(path) as image:
                    image.load()
                    require(image.getextrema() != ((0, 0), (0, 0), (0, 0)), 'EMPTY_BLACK_IMAGE')
                record.update(width=768, height=768)
            else:
                require(entry['byteLength'] > 26, 'EMPTY_AUDIO')
                run = subprocess.run([ffmpeg, '-nostdin', '-hide_banner', '-v', 'error', '-xerror',
                                      '-err_detect', 'explode', '-threads', '1', '-i', str(path),
                                      '-map', '0:a:0', '-t', '61', '-ac', '1', '-ar', '16000',
                                      '-f', 's16le', '-'], capture_output=True, timeout=60)
                require(run.returncode == 0, 'AUDIO_DECODE_FAILED')
                samples = array.array('h')
                samples.frombytes(run.stdout)
                duration = len(samples) / 16000
                require(0.08 < duration <= 60, 'AUDIO_DURATION_INVALID')
                peak = max(abs(v) for v in samples)
                require(peak > 100, 'SILENT_AUDIO')
                record.update(durationSeconds=round(duration, 5), peakAmplitude=peak)
            record['status'] = 'PASS'
        except Exception as error:
            record.update(status='FAIL', error=str(error)[:250])
        return record

    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as pool:
        for n, result in enumerate(pool.map(check, extracted['files']), 1):
            results.append(result)
            if n % 1000 == 0:
                write_json(previous_path, {'status': 'IN_PROGRESS', 'files': results})
                print(json.dumps({'phase': 'MEDIA_DECODED', 'files': n, 'total': len(extracted['files'])}), flush=True)
    report = {'status': 'PASS' if all(r['status'] == 'PASS' for r in results) else 'DECODE_FAILURES',
              'files': results, 'tested': len(results),
              'passed': sum(r['status'] == 'PASS' for r in results),
              'failed': [r for r in results if r['status'] != 'PASS'],
              'audioDecoder': str(ffmpeg), 'semanticListeningAcceptance': 'NOT_CLAIMED'}
    write_json(previous_path, report)
    return report


def assemble(output, ready):
    """Bind only measured local media; keep incomplete items without dropping identities."""
    dataset = read_json(ready / 'dataset.json')
    plan = read_json(ready / 'production-plan.json')
    jobs = {j['jobId']: j for j in read_json(ready / 'media-jobs.json')['jobs']}
    extraction = read_json(output / 'extraction.current.json')
    extracted = {e['jobId']: e for e in extraction['files']}
    decoded = {e['jobId']: e for e in read_json(output / 'decode.current.json')['files']}
    receipts = {r['jobId']: r for r in read_json(output / 'provider-metadata/media-results.json')['results']}
    topics = {t['code']: t['labelVi'] for t in plan['topics']}
    bound = []
    unresolved = []
    for item in dataset['items']:
        media = {}
        missing = []
        for name, job_id in item['mediaJobIds'].items():
            job = jobs[job_id]
            entry = extracted.get(job_id)
            measurement = decoded.get(job_id)
            if entry and measurement and measurement['status'] == 'PASS':
                media[name] = {**entry, 'localPath': str(safe_path(output, entry['path'])),
                               'decode': measurement, 'sourceReceiptPath': 'provider-metadata/media-results.json',
                               'actualProviderReported': receipts[job_id].get('actualProvider'),
                               'actualModelReported': receipts[job_id].get('actualModel'),
                               'actualVoiceReported': receipts[job_id].get('actualVoice'),
                               'processingReported': receipts[job_id].get('processing', []),
                               'sourceAttribution': 'Muse media supplied by owner; model/provider identifiers undisclosed',
                               'semanticAcceptance': 'PENDING'}
            else:
                problem = {'itemId': item['itemId'], 'displayForm': item['displayForm'],
                           'jobId': job_id, 'kind': job['kind'], 'outputPath': job['outputPath'],
                           'error': measurement.get('error') if measurement else receipts[job_id].get('error')}
                missing.append(problem)
                unresolved.append(problem)
        bound.append({'sourceItem': item, 'media': media, 'missingMedia': missing,
                      'status': 'FILES_COMPLETE_VERIFIED_PENDING_CONTENT_ACCEPTANCE' if not missing else 'INCOMPLETE_MEDIA'})
    good = {row['sourceItem']['itemId'] for row in bound if not row['missingMedia']}
    require(len(bound) == 5000 and len({x['sourceItem']['itemId'] for x in bound}) == 5000, 'ASSEMBLY_ITEM_COUNT')
    groups = collections.defaultdict(list)
    for item in dataset['items']:
        groups[(item['topicCodes'][0], item['learningLevel'])].append(item)
    lessons = []
    for (topic, level), items in sorted(groups.items()):
        # Partition all identities before excluding incomplete entries, so later
        # audio retries never move an item into a different lesson or reset progress.
        for start in range(0, len(items), 20):
            chunk = items[start:start + 20]
            number = start // 20 + 1
            lesson = {'lessonKey': f'{dataset["campaignId"]}:{topic}:{level}:{number:02}',
                      'topicCode': topic, 'topicLabelVi': topics[topic], 'learningLevel': level,
                      'part': number, 'classificationStatus': 'EDITORIAL_ESTIMATE',
                      'plannedItemIds': [i['itemId'] for i in chunk],
                      'fileCompleteItemIds': [i['itemId'] for i in chunk if i['itemId'] in good],
                      'pendingItemIds': [i['itemId'] for i in chunk if i['itemId'] not in good],
                      'runtimePublished': False}
            lessons.append(lesson)
    require(sum(len(l['plannedItemIds']) for l in lessons) == 5000, 'LESSON_PARTITION_COUNT')
    require(len({iid for l in lessons for iid in l['plannedItemIds']}) == 5000, 'LESSON_DUPLICATE_ITEM')
    topic_summary = []
    for topic, label in topics.items():
        rows = [x for x in bound if x['sourceItem']['topicCodes'][0] == topic]
        topic_summary.append({'code': topic, 'labelVi': label, 'items': len(rows),
                              'fileComplete': sum(not x['missingMedia'] for x in rows),
                              'levelCounts': dict(collections.Counter(x['sourceItem']['learningLevel'] for x in rows))})
    assembled = {'artifactType': 'OWNER_EXPANSION_LOCAL_LESSON_DRAFT', 'campaignId': dataset['campaignId'],
                 'status': 'PARTIAL_MEDIA_BOUND_NOT_PUBLISHED' if unresolved else 'MEDIA_BOUND_NOT_PUBLISHED',
                 'sourceDatasetSha256': file_hash(ready / 'dataset.json'), 'runtimeEligible': False,
                 'counts': {'items': 5000, 'fileCompleteItems': len(good), 'incompleteItems': 5000 - len(good),
                            'topics': len(topics), 'lessons': len(lessons), 'boundMedia': sum(len(x['media']) for x in bound)},
                 'levelCounts': dict(collections.Counter(x['sourceItem']['learningLevel'] for x in bound)),
                 'topics': topic_summary, 'lessons': lessons, 'items': bound}
    write_json(output / 'dataset-with-media.current.json', assembled)
    write_json(output / 'lessons/index.current.json', {'campaignId': dataset['campaignId'], 'lessons': lessons})
    for topic in topics:
        write_json(output / f'lessons/{topic}.json',
                   {'topic': next(t for t in topic_summary if t['code'] == topic),
                    'lessons': [l for l in lessons if l['topicCode'] == topic]})
    write_json(output / 'missing-jobs.current.json', {'campaignId': dataset['campaignId'], 'jobs': unresolved,
               'retryJobs': [jobs[p['jobId']] for p in unresolved], 'itemIdsPreserved': True})
    summary = {'status': assembled['status'], **assembled['counts'], 'unresolvedJobs': unresolved,
               'existingSelectedItemsUnchanged': 1547, 'databaseWrites': 0, 'cloudinaryUploads': 0,
               'allFrozenInputsUnchanged': True, 'humanOrIndependentSemanticAcceptance': 'NOT_CLAIMED'}
    write_json(output / 'assembly.current.json', summary)
    render_gallery(output, assembled)
    checksum_lines = [entry['sha256'] + '  ' + entry['path'] for entry in extraction['files']]
    (output / 'media-checksums.verified.sha256').write_text('\n'.join(checksum_lines) + '\n', encoding='utf-8')
    return summary


def render_gallery(output, assembled):
    rows = []
    for row in assembled['items']:
        item = row['sourceItem']
        rows.append({'id': item['itemId'], 'word': item['displayForm'], 'pos': item['partOfSpeech'],
                     'level': item['learningLevel'], 'topic': item['topicCodes'][0],
                     'meaning': item['meaningVi'], 'definition': item['definitionEn'],
                     'exampleEn': item['example']['en'], 'exampleVi': item['example']['vi'],
                     'media': {key: value['path'] for key, value in row['media'].items()},
                     'pending': bool(row['missingMedia']),
                     'carrierAudio': any(p.get('step') == 'carrier-phrase-isolation'
                                         for p in row['media'].get('wordAudio', {}).get('processingReported', []))})
    data = json.dumps({'counts': assembled['counts'], 'topics': assembled['topics'], 'items': rows},
                      ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c')
    template = r'''<!doctype html><html lang="vi"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>5.000 mục — bản ghép media local</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#f7f8fc;color:#162039;font:16px/1.5 system-ui,sans-serif}
main{max-width:1250px;margin:auto;padding:28px 20px}h1{margin:0;font-size:28px}p{margin:8px 0 18px}
.notice{background:#fff4db;padding:14px;border-radius:12px}.filters{display:flex;flex-wrap:wrap;gap:12px;margin:20px 0}
label{display:grid;gap:4px;font-size:14px}input,select,button{font:inherit;border:1px solid #d5d9e6;border-radius:9px;background:white;padding:10px;min-height:44px}
input{min-width:250px}button{cursor:pointer}button:disabled{opacity:.45;cursor:default}:focus-visible{outline:3px solid #6955ff;outline-offset:2px}
#cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:18px}.card{background:white;border:1px solid #e0e4ef;border-radius:16px;overflow:hidden}
.card img{width:100%;height:235px;object-fit:contain;background:#fafafa}.text{padding:16px}.word{font-size:23px;margin:0}.meta{color:#636b80;font-size:13px}
.example{padding:10px;background:#f2f3fa;border-radius:9px;margin:12px 0}.pending{color:#935500}.image-missing{height:235px;display:grid;place-content:center;background:#fff4db}
audio{display:block;width:100%;margin:5px 0 12px}.pager{display:flex;gap:16px;align-items:center;justify-content:center;margin:22px 0}
small{display:block;color:#636b80}footer{margin-top:24px;color:#636b80}
</style><main><h1>Bộ mở rộng 5.000 mục</h1>
<p id="summary"></p><div class="notice">Bản ghép local theo chủ đề và cấp độ; chưa phát hành lên ứng dụng.
Kiểm tra file không thay cho nghiệm thu nội dung hay nghe toàn bộ audio. Cấp độ là ước lượng biên tập.
Các mục còn lỗi vẫn giữ ID và phần chữ để bổ sung sau.</div>
<div class="filters"><label>Tìm từ hoặc nghĩa<input id="search" placeholder="Ví dụ: relative, họ hàng"></label>
<label>Chủ đề<select id="topic"><option value="">Tất cả chủ đề</option></select></label>
<label>Cấp độ<select id="level"><option value="">Tất cả cấp độ</option></select></label>
<label>Tình trạng<select id="status"><option value="">Tất cả mục</option><option value="complete">Đủ file</option><option value="pending">Chờ bổ sung</option><option value="carrier">Audio đã cắt cần nghe lại</option></select></label></div>
<p id="found" role="status"></p><div id="cards"></div><div class="pager"><button id="prev">Trang trước</button><span id="page"></span><button id="next">Trang sau</button></div>
<footer>Ảnh/TTS: Muse do chủ sở hữu cung cấp. Phần chữ Codex giữ nguyên. <a href="lessons/index.current.json">Danh sách bài học JSON</a> · <a href="missing-jobs.current.json">Mục cần bổ sung</a></footer></main>
<script id="data" type="application/json">__DATA__</script><script>
const d=JSON.parse(document.getElementById('data').textContent),el=id=>document.getElementById(id),label=Object.fromEntries(d.topics.map(t=>[t.code,t.labelVi]));
el('summary').textContent=`${d.counts.items.toLocaleString('vi-VN')} mục · ${d.counts.topics} chủ đề · ${d.counts.lessons} bài theo cấp độ · ${d.counts.fileCompleteItems.toLocaleString('vi-VN')} mục đủ file · ${d.counts.incompleteItems} mục chờ bổ sung.`;
const levels=['FIRST_WORDS','A1','A2','B1','B2','C1','C2'];
for(const t of d.topics){const o=document.createElement('option');o.value=t.code;o.textContent=`${t.labelVi} (${t.fileComplete}/${t.items})`;el('topic').append(o)}
for(const v of levels){if(!d.items.some(i=>i.level===v))continue;const o=document.createElement('option');o.value=v;o.textContent=v==='FIRST_WORDS'?'Từ đầu tiên':v;el('level').append(o)}
const fold=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase();
for(const r of d.items)r.find=fold([r.word,r.meaning,r.exampleEn,r.definition].join(' '));let page=0,filtered=[];const size=12;
function txt(tag,value,className){const n=document.createElement(tag);n.textContent=value;if(className)n.className=className;return n}
function audio(parent,title,path){parent.append(txt('small',title));if(path){const a=document.createElement('audio');a.controls=true;a.preload='none';a.src=path;a.setAttribute('aria-label',title);parent.append(a)}else parent.append(txt('p','Chờ bổ sung audio đọc từ.','pending'))}
function render(){const q=fold(el('search').value.trim()),topic=el('topic').value,level=el('level').value,status=el('status').value;
filtered=d.items.filter(r=>(!q||r.find.includes(q))&&(!topic||r.topic===topic)&&(!level||r.level===level)&&(!status||(status==='pending'?r.pending:status==='carrier'?r.carrierAudio:!r.pending)));
const pages=Math.max(1,Math.ceil(filtered.length/size));page=Math.min(page,pages-1);el('cards').replaceChildren();
for(const r of filtered.slice(page*size,(page+1)*size)){const card=txt('article','','card');if(r.media.image){const im=document.createElement('img');im.src=r.media.image;im.alt=`Minh họa ${r.word}`;im.loading='lazy';card.append(im)}else card.append(txt('div','Chờ ảnh thay thế','image-missing'));
const body=txt('div','','text');body.append(txt('h2',r.word,'word'),txt('p',`${r.level} · ${r.pos} · ${label[r.topic]}`,'meta'),txt('p',r.meaning),txt('small',r.definition));const ex=txt('div','','example');ex.append(txt('div',r.exampleEn),txt('small',r.exampleVi));body.append(ex);
if(r.pending)body.append(txt('p','Mục này đang chờ bổ sung media.','pending'));if(r.carrierAudio)body.append(txt('small','Audio được tách khỏi câu dẫn; cần nghe lại.'));
audio(body,'Nghe từ',r.media.wordAudio);audio(body,'Nghe ví dụ',r.media.exampleAudio);card.append(body);el('cards').append(card)}
el('found').textContent=`${filtered.length.toLocaleString('vi-VN')} mục phù hợp`;el('page').textContent=`Trang ${page+1} / ${pages}`;el('prev').disabled=page===0;el('next').disabled=page===pages-1}
for(const id of ['search','topic','level','status'])el(id).addEventListener('input',()=>{page=0;render()});el('prev').onclick=()=>{page--;render();scrollTo(0,0)};el('next').onclick=()=>{page++;render();scrollTo(0,0)};render();
</script></html>'''
    (output / 'review-gallery.current.html').write_text(template.replace('__DATA__', data), encoding='utf-8')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--parts', type=Path, nargs='+', required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--ready', type=Path, required=True)
    parser.add_argument('--extract', action='store_true')
    parser.add_argument('--decode', action='store_true')
    parser.add_argument('--assemble', action='store_true')
    args = parser.parse_args()
    result = inspect(args.parts, args.output.resolve(), args.ready.resolve())
    print(json.dumps({k: v for k, v in result.items() if k != 'entries'}))
    if args.extract:
        result = extract(args.parts, args.output.resolve(), args.ready.resolve())
        print(json.dumps({k: v for k, v in result.items() if k not in ('files', 'failedJobs')}), flush=True)
    if args.decode:
        result = decode(args.output.resolve())
        print(json.dumps({k: v for k, v in result.items() if k != 'files'}), flush=True)
    if args.assemble:
        print(json.dumps(assemble(args.output.resolve(), args.ready.resolve())), flush=True)
