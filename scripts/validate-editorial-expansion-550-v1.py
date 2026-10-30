"""Independent structural/binding checks for the authoring data and media plan."""
from pathlib import Path
import hashlib
import json
import re
import uuid
import unicodedata

ROOT=Path.cwd().resolve()
DATA=Path('vocabflow-dataset/workspaces/editorial-refresh-20261028/expansion-550-r0001')
MEDIA=Path('.vocabflow-local/editorial-refresh-20261028/expansion-550-media-r0001')
read=lambda p:json.loads(p.read_text(encoding='utf-8'))
sha=lambda b:hashlib.sha256(b).hexdigest()
stable=lambda x:sha(json.dumps(x,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode())
norm=lambda s:re.sub(r'[^\w]+',' ',unicodedata.normalize('NFKC',s).casefold()).strip()
checks=[]
def check(name,condition):
    assert condition,name
    checks.append(name)
def uuid7(value):
    try:return str(uuid.UUID(value))==value and uuid.UUID(value).version==7
    except (ValueError,TypeError):return False

dataset=read(DATA/'dataset-text-r0001.json');orders=read(MEDIA/'work-orders.json');prompts=read(MEDIA/'prompt-index.json')
selection=read(DATA/'candidate-selection.json');items=dataset['items'];current=read(DATA/'current-local-lexical-snapshot.json')['rows']
forms={norm(r[k]) for r in current for k in ['word','headword'] if r.get(k)}
check('550entries33topics',len(items)==550 and len(dataset['topics'])==33)
check('no duplicate lexical item or authoring UUID',len({norm(i['headword']) for i in items})==len({i['itemId'] for i in items})==550)
check('550distinct bilingual examples',len({(i['examples'][0]['en'],i['examples'][0]['vi']) for i in items})==550)
check('no imported IDs or invented media',all(i['runtimeVocabularyId'] is None and i['masterSenseId'] is None and i['masterLexemeId'] is None and not i['runtimeEligible'] for i in items))
for p in dataset['inputPins']:
    path=(ROOT/p['path']).resolve();check('input pin:'+p['path'],path.is_relative_to(ROOT) and sha(path.read_bytes())==p['sha256'] and path.stat().st_size==p['byteLength'])
source=read(Path('vocabflow-dataset/workspaces/editorial-refresh-20261028/baseline-v2/source-index.json'))
queue_source=next(x for x in source['sources'] if x['declaredPath'].endswith('/independent-content-review-queue-v1.json'))
queue_path=Path('vocabflow-dataset/workspaces/editorial-refresh-20261028/baseline-v2')/queue_source['packagePath']
check('original queue bytes pinned',sha(queue_path.read_bytes())==queue_source['byteSha256'])
queue=read(queue_path)['entries'];queue_forms={norm(e[k]) for e in queue for k in ['headword','displayForm'] if e.get(k)}
for i in items:
    word=i['headword'];ex=i['examples'][0]
    check(word+':stable authoring identity and no exact existing form',uuid7(i['itemId']) and uuid7(ex['exampleId']) and norm(word) not in forms|queue_forms)
    check(word+':complete bilingual text',all(isinstance(s,str) and s.strip() and '\ufffd' not in s for s in [word,i['meaningVi'],i['definitionEn'],ex['en'],ex['vi']]) and word.casefold() in ex['en'].casefold())
    check(word+':content hash',i['contentSha256']==stable({k:i[k] for k in ['itemId','headword','partOfSpeech','meaningVi','definitionEn','senseNote','examples','classification','topicCodes']}))
    check(word+':classification provenance',i['classification']['status']=='EDITORIAL_ESTIMATE_NOT_OFFICIAL_CEFR_ASSESSMENT' and i['classification']['schoolGrades']==[] and i['classification']['learningLevel'] in dataset['learningLevelCounts'])
    check(word+':media not fabricated',all(i['media'][k]['assetPath'] is None and i['media'][k]['sha256'] is None for k in ['image','wordAudio']) and i['media']['exampleAudio'][0]['assetPath'] is None)
check('classification counts reconcile',sum(dataset['learningLevelCounts'].values())==550 and all(sum(i['classification']['learningLevel']==k for i in items)==v for k,v in dataset['learningLevelCounts'].items()))
check('topic counts reconcile',sum(t['itemCount'] for t in dataset['topics'])==550 and all(sum(t['code'] in i['topicCodes'] for i in items)==t['itemCount'] for t in dataset['topics']))
check('source draft pinned in orders',orders['sourceDraft']['sha256']==sha((DATA/'dataset-text-r0001.json').read_bytes()))
jobs=orders['jobs'];by_id={i['itemId']:i for i in items}
check('1650unique planned jobs',len(jobs)==len({j['jobId'] for j in jobs})==1650)
for kind in ['IMAGE','WORD_AUDIO','EXAMPLE_AUDIO']:check(kind+':550jobs',sum(j['kind']==kind for j in jobs)==550)
for j in jobs:
    i=by_id[j['itemId']];word=i['headword']
    check(j['jobId']+':exact target and request pin',j['headword']==word and j['targetContentSha256']==i['contentSha256'] and j['requestSpecSha256']==stable(j['requestSpec']) and j['output'] is None)
    if j['kind']=='WORD_AUDIO':check(j['jobId']+':word text exact',j['requestSpec']['text']==word and j['exampleId'] is None)
    elif j['kind']=='EXAMPLE_AUDIO':check(j['jobId']+':example text and ID exact',j['exampleId']==i['examples'][0]['exampleId'] and j['requestSpec']['text']==i['examples'][0]['en'])
    else:check(j['jobId']+':image sense brief exact',j['requestSpec']['prompt']==i['imageBrief'])
    check(j['jobId']+':safe UUID filename',uuid7(j['jobId']) and j['requestedFilename']==j['jobId']+('.png' if j['kind']=='IMAGE' else '.mp3'))
declared=[]
for p in prompts['prompts']:
    path=ROOT/p['path'];check('prompt:'+p['path'],sha(path.read_bytes())==p['sha256'] and p['state']=='NOT_SUBMITTED');declared+=p['jobIds']
check('all jobs assigned once to exact prompts',len(declared)==len(set(declared))==1650 and set(declared)=={j['jobId'] for j in jobs})
projection=read(DATA/'app-import-candidate-r0001.json')['vocabulary']
check('runtime-shaped projection matches550authoring targets',len(projection)==550 and {i['authoringItemId'] for i in projection}==set(by_id))
check('no false ready-state',dataset['state']=='TEXT_DRAFT_MEDIA_PENDING' and dataset['counts']['actualMediaOutputs']==orders['outputsProduced']==0)
report={'status':'PASS','checksPassed':len(checks),'scope':'Authoring schema, exact source/request/media bindings and counts; not independent semantic review, official CEFR certification, media production or runtime import.','counts':dataset['counts'],'levelCounts':dataset['learningLevelCounts'],'queuePin':{'path':queue_path.as_posix(),'sha256':sha(queue_path.read_bytes())},'checks':checks}
(DATA/'validation-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({k:v for k,v in report.items() if k not in ['checks','queuePin']}))
