"""Prepare an honest, non-executable handoff scaffold; never synthesize word content."""
from pathlib import Path
import hashlib
import json
import secrets
import shutil
import time
import unicodedata
import uuid
import zipfile

ROOT = Path(__file__).resolve().parents[1]
DOC = ROOT / 'docs/plans/editorial-refresh-2026-10-28/ticket14-5000-r0001'
OUT = ROOT / '.vocabflow-local/editorial-refresh-20261031/ticket14-expansion-5000-r0001'
PACK = OUT / 'preparation'
SOURCE = ROOT / 'data/owner-publication/catalog-1547-r0001.json'
SOURCE_SHA = 'e90e04892b940f01dd0797b1536c53ff73d86b916670f1001967acb6863d26ba'
CAMPAIGN = 'expansion-5000-20261031-r0001'
TOPICS = '''family-relationships|Gia đình và các mối quan hệ
people-life-stages|Con người và các giai đoạn cuộc sống
character-behaviour|Tính cách và hành vi
emotions-feelings|Cảm xúc và tâm trạng
body-senses|Cơ thể và giác quan
hygiene-personal-care|Vệ sinh và chăm sóc cá nhân
health-common-conditions|Sức khỏe và tình trạng thường gặp
healthcare-first-aid|Chăm sóc sức khỏe và sơ cứu
home-rooms-furniture|Nhà ở, phòng và nội thất
household-appliances-tools|Thiết bị và dụng cụ trong nhà
household-chores-repairs|Việc nhà và sửa chữa
food-ingredients|Thực phẩm và nguyên liệu
cooking-kitchen|Nấu ăn và nhà bếp
meals-dining|Bữa ăn và ăn uống
clothes-accessories|Quần áo và phụ kiện
weather-seasons|Thời tiết và mùa
nature-landscapes|Thiên nhiên và cảnh quan
animals-wildlife|Động vật và thế giới hoang dã
plants-gardening|Cây cối và làm vườn
environment-sustainability|Môi trường và lối sống bền vững
school-classroom|Trường học và lớp học
learning-study-skills|Học tập và kỹ năng học
math-measurement|Toán học và đo lường
science-experiments|Khoa học và thí nghiệm
history-geography|Lịch sử và địa lý
arts-crafts|Mỹ thuật và thủ công
music-performance|Âm nhạc và biểu diễn
reading-writing-language|Đọc, viết và ngôn ngữ
sports-fitness|Thể thao và rèn luyện
hobbies-games|Sở thích và trò chơi
travel-tourism|Du lịch và trải nghiệm
transport-road|Giao thông và đường sá
city-public-places|Đô thị và địa điểm công cộng
shopping-services|Mua sắm và dịch vụ
money-personal-finance|Tiền bạc và tài chính cá nhân
occupations-workplaces|Nghề nghiệp và nơi làm việc
office-teamwork|Văn phòng và làm việc nhóm
digital-devices|Thiết bị số
internet-communication|Internet và liên lạc
media-entertainment|Truyền thông và giải trí
time-planning|Thời gian và lập kế hoạch
daily-routines-actions|Sinh hoạt và hành động hằng ngày
movement-position|Chuyển động và vị trí
quantities-comparison|Số lượng và so sánh
describing-properties|Mô tả hình dạng và đặc tính
communication-politeness|Giao tiếp và phép lịch sự
social-community|Xã hội và cộng đồng
university-academic-life|Đại học và đời sống học thuật
reasoning-discussion|Lập luận và thảo luận
business-everyday-economy|Kinh doanh và kinh tế đời thường'''
VARIANTS = dict(pair.split(':') for pair in '''colour:color colours:colors favourite:favorite
favourites:favorites neighbour:neighbor neighbours:neighbors centre:center centres:centers
theatre:theater theatres:theaters grey:gray travelling:traveling travelled:traveled
traveller:traveler cancelled:canceled cancelling:canceling programme:program programmes:programs
catalogue:catalog catalogues:catalogs cheque:check cheques:checks tyre:tire tyres:tires
licence:license licences:licenses practise:practice practising:practicing defence:defense
offence:offense organise:organize organising:organizing organisation:organization
recognise:recognize realise:realize analyse:analyze apologise:apologize behaviour:behavior
labour:labor metre:meter metres:meters litre:liter litres:liters jewellery:jewelry
pyjamas:pajamas aeroplane:airplane mum:mom moustache:mustache yoghurt:yogurt
résumé:resume resumé:resume café:cafe naïve:naive fiancé:fiance fiancée:fiancee
façade:facade cliché:cliche protégé:protege mâché:mache'''.split())


def dump(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def sha(data):
    return hashlib.sha256(data).hexdigest()


def norm(text):
    text = unicodedata.normalize('NFKC', text).casefold()
    for old in ['’', '‘']:
        text = text.replace(old, "'")
    for old in ['‐', '‑', '–', '—', '-']:
        text = text.replace(old, ' ')
    return ' '.join(text.split())


def variant(text):
    return ' '.join(VARIANTS.get(w, w) for w in norm(text).split())


def uuid7():
    value = (int(time.time() * 1000) << 80) | (7 << 76) | (secrets.randbits(12) << 64)
    return str(uuid.UUID(int=value | (2 << 62) | secrets.randbits(62)))


def main():
    existing_plan = PACK / 'production-plan.json'
    if existing_plan.exists():
        state = json.loads(existing_plan.read_text(encoding='utf-8'))['state']
        assert state == 'PREPARATION_ONLY_TEXT_NOT_AUTHORED', 'REFUSE_TO_OVERWRITE_FROZEN_HANDOFF'
    raw = SOURCE.read_bytes()
    assert sha(raw) == SOURCE_SHA, 'BASELINE_PIN_CHANGED'
    current = json.loads(raw)
    assert len(current['items']) == 1547
    topics = [{'code': line.split('|')[0], 'labelVi': line.split('|')[1],
               'targetItems': 100, 'targetIsFlexible': True}
              for line in TOPICS.splitlines()]
    assert len(topics) == 50
    baseline = {'artifactType': 'SELECTED_1547_EXCLUSION_BASELINE', 'catalogId': current['catalogId'],
                'sourceSha256': SOURCE_SHA, 'accountDataIncluded': False, 'mediaIncluded': False,
                'items': [{'itemId': i['itemId'], 'word': i['content']['word'],
                           'partOfSpeech': i['content']['partOfSpeech'],
                           'meaningVi': i['content']['meaningVi'],
                           'definitionEn': i['content']['definitionEn'],
                           'examples': [{'en': e['en'], 'vi': e['vi']} for e in i['content']['examples']],
                           'cefr': i['content']['cefr'], 'tags': i['content']['tags'],
                           'topicCodes': i['topicCodes'], 'normalizedWord': norm(i['content']['word']),
                           'variantKey': variant(i['content']['word'])} for i in current['items']]}
    PACK.mkdir(parents=True, exist_ok=True)
    registry_path = PACK / 'id-registry.json'
    if registry_path.exists():
        registry = json.loads(registry_path.read_text(encoding='utf-8'))
        assert registry['campaignId'] == CAMPAIGN and len(registry['slots']) == 5000
    else:
        registry = {'artifactType': 'AUTHORING_PROPOSAL_SLOT_REGISTRY', 'campaignId': CAMPAIGN,
                    'identityMeaning': 'Reserved unbound authoring proposals; not authored words or canonical Master IDs.',
                    'slots': []}
        for index in range(5000):
            registry['slots'].append({'slot': index + 1, 'batchId': f'batch-{index // 50 + 1:03d}',
                                      'suggestedTopicCode': topics[index // 100]['code'],
                                      'itemId': uuid7(), 'exampleId': uuid7(),
                                      'pronunciationId': uuid7(),
                                      'imageJobId': uuid7(), 'wordAudioJobId': uuid7(),
                                      'exampleAudioJobId': uuid7()})
    ids = [s[k] for s in registry['slots'] for k in ['itemId', 'exampleId', 'pronunciationId',
                                                   'imageJobId', 'wordAudioJobId', 'exampleAudioJobId']]
    assert len(ids) == len(set(ids)) == 30000
    assert all(uuid.UUID(x).version == 7 for x in ids)
    assert not set(ids).intersection(i['itemId'] for i in current['items'])
    targets = {'FIRST_WORDS': 400, 'A1': 1000, 'A2': 1300, 'B1': 1200, 'B2': 800, 'C1': 250, 'C2': 50}
    assert sum(targets.values()) == 5000
    plan = {'artifactType': 'VOCABFLOW_EXPANSION_5000_PRODUCTION_PLAN', 'schemaVersion': '1.0.0',
            'campaignId': CAMPAIGN, 'state': 'PREPARATION_ONLY_TEXT_NOT_AUTHORED',
            'textAuthoringMode': 'CODEX_AUTHORS_MUSE_MEDIA_ONLY', 'ownerConfirmed': '2026-10-31',
            'targetAdditionalItems': 5000, 'existingKeptItems': 1547, 'targetCombinedItems': 6547,
            'authoredItems': 0, 'executableMediaJobs': 0, 'plannedMediaJobs': 15000,
            'newMediaGenerated': 0, 'batches': 100, 'itemsPerBatch': 50,
            'levelTargets': targets, 'levelTargetsAreEditorialPlanningNotCertification': True,
            'baselineLevels': current['levels'], 'topics': topics,
            'normalization': {'algorithm': 'NFKC-casefold-apostrophe-dash-whitespace-v1',
                              'englishVariantTokens': VARIANTS,
                              'manualChecksRequired': ['inflections', 'semantic duplicates', 'sense alignment',
                                                       'natural examples', 'level suitability']},
            'roles': {'codex': ['select', 'deduplicate', 'author all text', 'review and freeze',
                                'issue exact media jobs', 'validate received ZIP', 'later integration'],
                      'muse': ['produce only frozen IMAGE, WORD_AUDIO, EXAMPLE_AUDIO jobs',
                               'record actual files and receipts', 'deliver one final ZIP']},
            'media': {'image': {'mimeType': 'image/png', 'width': 768, 'height': 768},
                      'tts': {'locale': 'en-US', 'requestedVoice': 'avocado_v2:MAI_01',
                              'requestedSpeed': 90, 'actualVoiceMustBeObserved': True},
                      'paths': {'IMAGE': 'media/images/{jobId}.png',
                                'WORD_AUDIO': 'media/audio/words/{jobId}.mp3',
                                'EXAMPLE_AUDIO': 'media/audio/examples/{jobId}.mp3'}},
            'delivery': {'finalArchive': 'vocabflow-expansion-5000-r0001-complete.zip',
                         'archiveCount': 1, 'allowZip64': True, 'nestedZipAllowed': False,
                         'sharing': 'SIGNED_IN_OWNER_DOWNLOAD', 'publicLinkApprovalGranted': False,
                         'onSingleZipLimit': 'BLOCKED_SINGLE_ZIP_DELIVERY_KEEP_CHECKPOINT',
                         'historicalMediaBytesFor1547Items': 3009529461,
                         'sameSizeEstimateFor5000Bytes': round(3009529461 / 1547 * 5000),
                         'estimateIsNotAnUploadLimitOrCompressionPromise': True},
            'producerPolling': 'OWNER_REPORTS_COMPLETION_TO_COORDINATOR',
            'museSubmissionPerformed': False, 'dbWrites': 0, 'cloudinaryWrites': 0,
            'runtimeEligible': False, 'foundation08And09Included': False}
    dump(PACK / 'baseline-1547.json', baseline)
    dump(registry_path, registry)
    dump(PACK / 'production-plan.json', plan)
    for name in ['contract.md', 'muse-prompt.txt', 'dataset.schema.json', 'validate-handoff.py']:
        shutil.copyfile(DOC / name, PACK / name)
    start = '''# Gói chuẩn bị ticket 14 — khoảng 5.000 mục mới

ĐÂY LÀ GÓI CHUẨN BỊ, CHƯA PHẢI LỆNH TẠO MEDIA.
Hiện có 0/5.000 mục đã biên soạn và 0/15.000 job có thể thực thi.
30.000 UUID là slot dành trước, không phải 5.000 từ đã tạo.

Codex soạn nghĩa, định nghĩa, ví dụ song ngữ, cấp độ và brief ảnh. Muse chỉ tạo
ảnh/TTS từ JSON đã đóng băng. Đọc contract.md để biết điều kiện chuyển thành
READY_FOR_MUSE_MEDIA. Chạy `python validate-handoff.py .` để kiểm tra readiness.
Gói này phải trả TEXT_NOT_READY cho tới khi đủ phần chữ và job đã kiểm tra.

Khi có gói READY: đính kèm ZIP đầu vào và dán muse-prompt.txt. Muse làm nội bộ
100 lô × 50 mục, giữ checkpoint; cuối cùng trả đúng một ZIP chứa media thực.
Người dùng báo lại điều phối khi Muse xong; không cần điều phối mở trình duyệt
hay hỏi tiến độ từng lô. Không gửi mật khẩu, .env, tài khoản hoặc DB dump.
'''
    (PACK / 'START-HERE.md').write_text(start, encoding='utf-8')
    inputs = [{'path': p.name, 'byteLength': p.stat().st_size, 'sha256': sha(p.read_bytes())}
              for p in sorted(PACK.iterdir()) if p.is_file() and p.name != 'input-manifest.json']
    dump(PACK / 'input-manifest.json', {'artifactType': 'INPUT_BYTE_MANIFEST', 'campaignId': CAMPAIGN,
                                      'files': inputs, 'selfHashIsExternal': True})
    archive = OUT / 'vocabflow-expansion-5000-r0001-preparation.zip'
    with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED, allowZip64=True) as z:
        for p in sorted(PACK.iterdir()):
            if p.is_file():
                z.write(p, p.name)
    with zipfile.ZipFile(archive) as z:
        assert z.testzip() is None
        assert len(z.namelist()) == len([p for p in PACK.iterdir() if p.is_file()])
        for member in z.namelist():
            assert z.read(member) == (PACK / member).read_bytes()
    summary = {'status': 'PREPARATION_VERIFIED_TEXT_NOT_READY', 'targetAdditionalItems': 5000,
               'authoredItems': 0, 'reservedItemSlots': 5000, 'reservedUUIDv7': len(ids),
               'baselineItems': len(baseline['items']), 'baselineSourceSha256': SOURCE_SHA,
               'plannedMediaJobs': 15000, 'executableMediaJobs': 0,
               'archive': str(archive.relative_to(ROOT)).replace('\\', '/'),
               'archiveByteLength': archive.stat().st_size, 'archiveSha256': sha(archive.read_bytes()),
               'allArchiveMembersCrcAndBytesVerified': True, 'providerCalls': 0, 'dbWrites': 0}
    dump(OUT / 'preparation-report.current.json', summary)
    print(json.dumps(summary))


if __name__ == '__main__':
    main()
