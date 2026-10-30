"""Build a data-only preview and image sheets for the additional500 collection."""
from collections import Counter
import argparse
import hashlib
import html
import json
import os
from pathlib import Path

ROOT=Path('.vocabflow-local/editorial-refresh-20261029/basic-plus-500-media-r0001')

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source',type=Path,default=ROOT/'dataset-with-media.current.json')
    args=parser.parse_args()
    assert args.source.resolve().parent==ROOT.resolve(),'GALLERY_SOURCE_OUTSIDE_BATCH'
    data=json.loads(args.source.read_bytes());counts=Counter();cards=[];pictures=[]
    memberships=json.loads(Path('vocabflow-dataset/workspaces/editorial-refresh-20261029/basic-plus-500-r0001/collection-memberships-r0001.json').read_bytes())
    placement={row['itemId']:row for row in memberships['assignments']}
    assert len(placement)==500
    def relative(binding):
        raw=binding.get('assetPath')
        if not raw:return None
        p=Path(raw);assert p.is_file() and hashlib.sha256(p.read_bytes()).hexdigest()==binding['sha256']
        return os.path.relpath(p,ROOT).replace('\\','/')
    for i in data['items']:
        membership=placement[i['itemId']]
        assert membership['sourceContentSha256']==i['contentSha256']
        displayTopic=membership['displayTopicCodes'][0]
        image=relative(i['media']['image']);word=relative(i['media']['wordAudio']);example=relative(i['media']['exampleAudio'][0]);e=i['examples'][0]
        counts.update({'IMAGE':bool(image),'WORD_AUDIO':bool(word),'EXAMPLE_AUDIO':bool(example)})
        if image:pictures.append((i,ROOT/image))
        visual='<img loading="lazy" src="'+html.escape(image,quote=True)+'" alt="'+html.escape(i['headword'],quote=True)+'">' if image else '<div class="missing">Ảnh đang nhận</div>'
        def audio(path,label):return '<label>'+label+'<audio controls preload="none" src="'+html.escape(path,quote=True)+'"></audio></label>' if path else '<p>'+label+': đang nhận</p>'
        cards.append('<article id="'+i['entryCode']+'">'+visual+'<div><small>'+html.escape(i['entryCode']+' · '+displayTopic)+'</small><h2>'+html.escape(i['headword'])+' <span>'+i['partOfSpeech']+'</span></h2><b>'+html.escape(i['meaningVi'])+'</b><p>'+html.escape(i['definitionEn'])+'</p>'+audio(word,'Nghe từ')+'<p>'+html.escape(e['en'])+'<br>'+html.escape(e['vi'])+'</p>'+audio(example,'Nghe câu')+'<small>'+i['classification']['cefr']+' · tham chiếu nghĩa cũ '+str(i['runtimeVocabularyId'])+'</small></div></article>')
    complete=all(counts[k]==500 for k in ['IMAGE','WORD_AUDIO','EXAMPLE_AUDIO'])
    page='<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Thêm500 từ thông dụng · BASIC-PLUS</title><style>body{font:16px/1.6 system-ui;max-width:1160px;margin:24px auto;padding:16px;background:#f4f6fb;color:#172033}article{background:white;border:1px solid #dce3ed;border-radius:14px;padding:20px;display:grid;grid-template-columns:260px 1fr;gap:24px;margin:18px 0}img,.missing{width:260px;height:260px;object-fit:contain;background:#f8fafc}.missing{display:grid;place-items:center}p,h2{margin:8px 0}small,span{font-size:13px;color:#53637b}audio{display:block;width:100%;max-width:520px;height:42px}label{display:block;margin:12px 0}@media(max-width:680px){article{grid-template-columns:1fr}}</style><h1>Thêm500 mục thông dụng ·20chủ đề</h1><p>'+str(counts['IMAGE'])+'/500 ảnh ·'+str(counts['WORD_AUDIO']+counts['EXAMPLE_AUDIO'])+'/1.000 audio. '+('Đủ media, chờ kiểm tra nội dung.' if complete else 'Đang nhận media.')+'</p><p>Dùng lại500 nghĩa từ kho local, không trùng dạng từ với hai bộ trước. Giữ207A1/293A2 theo nguồn. Chưa nhập DB.</p>'+''.join(cards)+'</html>'
    triage_path=ROOT/'audio-qa/asr-triage.current.json'
    if triage_path.exists():
        triage=json.loads(triage_path.read_bytes());by_word={i['headword']:i for i in data['items']}
        flags=[r for r in triage['notes'] if r['triage'].startswith('LISTENING')]
        links=[]
        for flag in flags:
            item=by_word[flag['headword']]
            links.append('<li><a href="#'+html.escape(item['entryCode'],quote=True)+'">'+html.escape(flag['headword'])+' · '+('nghe từ' if flag['kind']=='WORD_AUDIO' else 'nghe câu')+'</a></li>')
        panel='<aside><h2>Clip để nghe đối chiếu</h2><p>Nhận dạng thử có khác biệt ở các clip dưới đây; kết quả nhận dạng chưa đủ để kết luận audio sai. Đã giữ nguyên file để kiểm tra.</p><ul>'+''.join(links)+'</ul></aside>'
        page=page.replace('</h1>','</h1>'+panel,1)
    (ROOT/'review-gallery.current.html').write_text(page,encoding='utf8')
    from PIL import Image,ImageDraw,ImageFont
    font=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',17);sheets=ROOT/'review-sheets';sheets.mkdir(exist_ok=True);index=[]
    for start in range(0,len(pictures),20):
        sheet=Image.new('RGB',(1280,1180),'white');draw=ImageDraw.Draw(sheet);draw.text((12,8),'BASIC-PLUS-500 · received images · page '+str(start//20+1),font=font,fill='black');entries=[]
        for offset,(i,p) in enumerate(pictures[start:start+20]):
            x=(offset%5)*256;y=40+(offset//5)*280
            with Image.open(p) as im:
                im.load();assert im.width==im.height and im.width>=1024
                im=im.convert('RGB');im.thumbnail((244,232));sheet.paste(im,(x+(256-im.width)//2,y))
            draw.text((x+8,y+232),i['entryCode']+' · '+i['headword'],font=font,fill='black');entries.append({'itemId':i['itemId'],'headword':i['headword'],'imageSha256':i['media']['image']['sha256']})
        target=sheets/f'page-{start//20+1:03d}.jpg';sheet.save(target,quality=92);index.append({'path':target.as_posix(),'items':entries})
    report={'items':500,'receivedMedia':dict(counts),'completeMedia':complete,'gallery':(ROOT/'review-gallery.current.html').as_posix(),'sheets':index,'ownerAccepted':False};(ROOT/'review-index.current.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8');print(json.dumps({k:v for k,v in report.items() if k!='sheets'}))

if __name__=='__main__':main()
