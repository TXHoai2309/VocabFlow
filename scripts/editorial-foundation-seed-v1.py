"""Prepare private local foundation seed and review gallery from frozen sources."""
import hashlib
import html
import json
import os
from pathlib import Path

DATA = Path('vocabflow-dataset/workspaces/editorial-refresh-20261030/foundation08-09-r0001')
LOCAL = Path('.vocabflow-local/editorial-refresh-20261030/foundation08-09-media-r0001')
def sha(blob): return hashlib.sha256(blob).hexdigest()
def read(path): return json.loads(path.read_bytes())

def main():
    manifest_raw = (DATA/'execution-manifest-r0001.json').read_bytes()
    assert sha(manifest_raw) == (DATA/'execution-manifest-r0001.sha256').read_text().strip()
    manifest = json.loads(manifest_raw)
    receipts = {r['jobId']: r for p in sorted((LOCAL/'receipts').glob('*.json')) for r in [read(p)]}
    assert len(receipts) == 18
    collections = [
        {'code':'letter-names','title':'Tên chữ A, I, M, S, F, T','module':'letters','order':0},
        {'code':'letter-sounds','title':'Âm cơ bản của sáu chữ','module':'letters','order':1},
        {'code':'letters-all','title':'Tất cả hoạt động chữ và âm','module':'letters','order':2},
        {'code':'utterances-all','title':'Tất cả câu đầu tiên','module':'utterances','order':3},
    ]
    for code,title in [('greetings','Chào hỏi và làm quen'),('thanks','Cảm ơn và đáp lời'),('help','Mở lời và nhờ giúp đỡ'),('repair','Khi chưa nghe hoặc chưa hiểu')]:
        collections.append({'code':'utterances-'+code,'title':title,'module':'utterances','order':len(collections)})
    targets=[];memberships=[];cards=[]
    for order,t in enumerate(manifest['targets']):
        job=t['media'];a=t['authorityContent'];letter=t['itemType']=='LETTER_ACTIVITY'
        r=receipts.get(job['jobId']);audio=None
        if r:
            blob=Path(r['assetPath']).read_bytes();assert sha(blob)==r['sha256'] and len(blob)==r['byteLength']
            audio={'path':r['assetPath'],'sha256':r['sha256'],'byteLength':r['byteLength'],'review':'PENDING'}
        if letter:
            activity=a['activity'];glyph=activity['draftItemRef'].rsplit(':',1)[1].upper()
            kind=activity['targetKind'];teaching=activity['teaching'];group='letter-names' if kind=='LETTER_NAME' else 'letter-sounds'
            body={'glyph':glyph+' '+glyph.lower(),'optionGlyphs':[ref.rsplit(':',1)[1].upper()+' '+ref.rsplit(':',1)[1].lower() for ref in activity['optionLetterRefs']], 'instruction':activity['assessment']['instructionVi'],'context':None,'title':('Tên chữ ' if kind=='LETTER_NAME' else 'Âm của chữ ')+glyph,'textEn':glyph+' '+glyph.lower(),'translationVi':a['pronunciationBinding']['ipa'],'explanation':teaching['coachingVi'],'audio':audio}
            memberships.extend([{'collection':group,'targetId':t['targetId'],'order':order},{'collection':'letters-all','targetId':t['targetId'],'order':order}])
        else:
            kind='UTTERANCE';group='utterances-'+t['placements'][0]['groupRef']
            body={'glyph':None,'optionGlyphs':[],'instruction':'Dựa vào tình huống, thử nhớ một câu tiếng Anh phù hợp.','context':a['context'],'title':a['communicativeGoal'],'textEn':a['englishExactText'],'translationVi':a['translationVi'],'explanation':a['beginnerRationale'],'audio':audio}
            memberships.extend([{'collection':group,'targetId':t['targetId'],'order':order},{'collection':'utterances-all','targetId':t['targetId'],'order':order}])
        body_hash=sha(json.dumps(body,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode())
        targets.append({'id':t['targetId'],'itemType':t['itemType'],'parentLetterId':t['parentLetterId'],'kind':kind,'pins':t['revisionPins'],'content':body,'contentSha256':body_hash})
        clip='<p>Chưa có audio âm riêng — Muse không hỗ trợ; chưa bật bài nghe có chấm điểm.</p>'
        if audio:
            rel=os.path.relpath(audio['path'],LOCAL).replace('\\','/')
            clip='<audio controls preload="none" src="'+html.escape(rel,quote=True)+'"></audio><p>Audio mới, chờ chủ sản phẩm nghe duyệt.</p>'
        cards.append('<article><h2>'+html.escape(body['title'])+'</h2><p>'+html.escape(body['context'] or body['explanation'])+'</p><strong>'+html.escape(body['textEn'])+'</strong><p>'+html.escape(body['translationVi'])+'</p>'+clip+'<small>'+html.escape(t['draftRef'])+'</small></article>')
    seed={'artifactType':'PRIVATE_FOUNDATION_LOCAL_SEED','sourceManifestSha256':sha(manifest_raw),'targets':targets,'collections':collections,'memberships':memberships,'counts':{'targets':24,'audio':18,'isolatedSoundMissing':6,'newLexicalSenses':0},'containsPrivateAnswerContent':True,'serveAsPublicFile':False}
    blob=(json.dumps(seed,ensure_ascii=False,indent=2)+'\n').encode()
    out=DATA/'runtime-seed-r0001.json'
    if out.exists():assert out.read_bytes()==blob
    else:out.write_bytes(blob)
    (DATA/'runtime-seed-r0001.sha256').write_text(sha(blob)+'\n',encoding='ascii')
    (LOCAL/'review-gallery-r0001.html').write_text('<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>08–09 ·18audio và24mục</title><style>body{font:16px/1.6 system-ui;max-width:820px;margin:24px auto;padding:16px;color:#172033;background:#f4f6fb}article{background:white;padding:24px;margin:20px 0;border:1px solid #dce3ed;border-radius:12px}audio{display:block;width:100%;max-width:420px}small{color:#53637b}</style><h1>08–09 · Chữ và câu đầu tiên</h1><p>6chữ ·12hoạt động chữ/âm ·12câu ·18audio thật.6âm riêng chưa có file. Audio mới chưa được chủ sản phẩm duyệt nghe.</p>'+''.join(cards)+'</html>',encoding='utf8')
    print(json.dumps({'status':'PASS','seedSha256':sha(blob),'targets':24,'audio':18,'memberships':len(memberships),'collections':len(collections),'privateSeed':True}))

if __name__=='__main__':main()
