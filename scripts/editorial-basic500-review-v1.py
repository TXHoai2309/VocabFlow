"""Build a local inspection gallery and labeled contact sheets; no app/runtime UI."""
from collections import Counter
import argparse
import hashlib
import html
import json
import os
from pathlib import Path

ROOT = Path('.vocabflow-local/editorial-refresh-20261029/basic-500-media-r0002')

def main(source=None):
    source = source or ROOT / 'dataset-with-media.current.json'
    data = json.loads(source.read_bytes())
    counts = Counter()
    images = []
    def media_path(binding):
        path = binding.get('assetPath')
        if not path:
            return None
        asset = Path(path)
        assert asset.is_file() and hashlib.sha256(asset.read_bytes()).hexdigest() == binding['sha256']
        return os.path.relpath(asset, ROOT).replace('\\', '/')
    cards = []
    for item in data['items']:
        picture = media_path(item['media']['image'])
        word = media_path(item['media']['wordAudio'])
        example = media_path(item['media']['exampleAudio'][0])
        counts.update({'IMAGE': bool(picture), 'WORD_AUDIO': bool(word), 'EXAMPLE_AUDIO': bool(example)})
        if picture:
            images.append((item, ROOT / picture))
        e = item['examples'][0]
        visual = '<img loading="lazy" src="' + html.escape(picture, quote=True) + '" alt="' + html.escape(item['headword'], quote=True) + '">' if picture else '<div class="missing">Ảnh đang nhận</div>'
        def player(path, label):
            return '<label>' + label + '<audio controls preload="none" src="' + html.escape(path, quote=True) + '"></audio></label>' if path else '<p>' + label + ': đang nhận</p>'
        cards.append('<article id="' + item['entryCode'] + '">' + visual + '<div><small>' + html.escape(item['entryCode'] + ' · ' + item['topicCodes'][0]) + '</small><h2>' + html.escape(item['headword']) + ' <span>' + html.escape(item['partOfSpeech']) + '</span></h2><b>' + html.escape(item['meaningVi']) + '</b><p>' + html.escape(item['definitionEn']) + '</p>' + player(word, 'Nghe từ') + '<p>' + html.escape(e['en']) + '<br>' + html.escape(e['vi']) + '</p>' + player(example, 'Nghe câu') + '<small>Mức đề xuất: ' + item['classification']['learningLevel'] + '; tham chiếu nghĩa cũ: ' + str(item['runtimeVocabularyId']) + '</small></div></article>')
    asr_path = ROOT / 'audio-qa/asr-sample.current.json'
    review = ''
    if asr_path.exists():
        asr = json.loads(asr_path.read_bytes())
        lookup = {i['headword']: i['entryCode'] for i in data['items']}
        review = '<details><summary>Các clip trong mẫu nhận dạng cần nghe kiểm tra</summary><p>Chênh lệch nhận dạng không khẳng định audio sai. Mẫu nhận dạng chỉ gồm ' + str(asr['screened']) + ' clip.</p><ul>' + ''.join('<li><a href="#' + lookup[r['headword']] + '">' + html.escape(r['headword'] + ' · ' + r['kind']) + '</a>: mong đợi “' + html.escape(r['expectedText']) + '”; nhận dạng “' + html.escape(r['recognizedText']) + '”.</li>' for r in asr['results'] if not r['normalizedExactMatch']) + '</ul></details>'
    complete = all(counts[k] == 500 for k in ['IMAGE', 'WORD_AUDIO', 'EXAMPLE_AUDIO'])
    heading = 'Đã đủ media, chờ kiểm tra nội dung' if complete else 'Đang nhận media'
    text = '<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>500 từ cơ bản · bản xem trước</title><style>body{font:16px/1.6 system-ui;background:#f4f6fb;color:#172033;max-width:1160px;margin:24px auto;padding:16px}article{background:white;border:1px solid #dce3ed;border-radius:14px;padding:20px;display:grid;grid-template-columns:260px 1fr;gap:24px;margin:18px 0}img,.missing{width:260px;height:260px;object-fit:contain;background:#f8fafc;border-radius:10px}.missing{display:grid;place-items:center;color:#53637b}h2{margin:4px 0}span,small{font-size:13px;color:#53637b}audio{display:block;width:100%;max-width:520px;height:42px}label{display:block;margin:12px 0}details{padding:16px;background:white;border-radius:12px}p{margin:8px 0}@media(max-width:680px){article{grid-template-columns:1fr}img,.missing{width:100%;height:260px}}</style><h1>500 từ cơ bản · 20 chủ đề</h1><p><b>' + heading + '</b> · ' + str(counts['IMAGE']) + '/500 ảnh · ' + str(counts['WORD_AUDIO'] + counts['EXAMPLE_AUDIO']) + '/1.000 audio.</p><p>405 mục tham chiếu nghĩa có sẵn; 95 mục cần đối soát bổ sung. Các mức A1/A2 là đề xuất biên tập. Chưa nhập DB; đây là trang kiểm tra dữ liệu local.</p>' + review + ''.join(cards) + '</html>'
    (ROOT / 'review-gallery.current.html').write_text(text, encoding='utf8')
    from PIL import Image, ImageDraw, ImageFont
    font = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 17)
    sheets = ROOT / 'review-sheets'
    sheets.mkdir(exist_ok=True)
    index = []
    for start in range(0, len(images), 20):
        page = Image.new('RGB', (1280, 1180), 'white')
        draw = ImageDraw.Draw(page)
        draw.text((12, 8), 'BASIC-500 · received images · page ' + str(start // 20 + 1), font=font, fill='black')
        entries = []
        for offset, (item, path) in enumerate(images[start:start+20]):
            x = (offset % 5) * 256
            y = 40 + (offset // 5) * 280
            with Image.open(path) as picture:
                assert picture.width >= 1024 and picture.height >= 1024, 'IMAGE_TOO_SMALL'
                picture = picture.convert('RGB')
                picture.thumbnail((244, 232))
                page.paste(picture, (x + (256-picture.width)//2, y))
            draw.text((x + 8, y + 232), item['entryCode'] + ' · ' + item['headword'], font=font, fill='black')
            entries.append({'itemId': item['itemId'], 'entryCode': item['entryCode'], 'headword': item['headword'], 'imageSha256': item['media']['image']['sha256']})
        target = sheets / ('page-' + str(start//20+1).zfill(3) + '.jpg')
        page.save(target, quality=91)
        index.append({'path': target.as_posix(), 'items': entries})
    report = {'items': len(data['items']), 'sourceDataset': source.as_posix(), 'receivedMedia': dict(counts), 'completeMedia': complete, 'gallery': (ROOT / 'review-gallery.current.html').as_posix(), 'sheets': index, 'automaticallyAccepted': False}
    (ROOT / 'review-index.current.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n', encoding='utf8')
    print(json.dumps({k: report[k] for k in ['items', 'receivedMedia', 'completeMedia', 'gallery']}))

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path)
    args = parser.parse_args()
    main(args.source)
