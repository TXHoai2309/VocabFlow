"""Create an additional nonoverlapping 500-entry curated basic collection offline.

Reuses exact reviewed local senses/examples and runtime references. Does not
claim 500 new lexical records, modify previous campaigns, or write any database.
"""
from collections import Counter, defaultdict
import csv
import hashlib
import html
import json
from pathlib import Path
import re
import secrets
import time
import unicodedata
import uuid

DATA = Path('vocabflow-dataset/workspaces/editorial-refresh-20261029/basic-plus-500-r0001')
MEDIA = Path('.vocabflow-local/editorial-refresh-20261029/basic-plus-500-media-r0001')
BASELINE = Path('vocabflow-dataset/workspaces/editorial-refresh-20261028/baseline-v2/corpus.json')
PRIOR = [Path('.vocabflow-local/editorial-refresh-20261028/expansion-550-media-r0001/dataset-547-r0004.json'), Path('.vocabflow-local/editorial-refresh-20261029/basic-500-media-r0002/dataset-complete-r0003.json')]

def read(path):
    return json.loads(path.read_bytes())

def encode(value):
    return (json.dumps(value, ensure_ascii=False, indent=2)+'\n').encode('utf8')

def sha(blob):
    return hashlib.sha256(blob).hexdigest()

def stable(value):
    return sha(json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode('utf8'))

def pin(path):
    blob = path.read_bytes()
    return {'path': path.as_posix(), 'sha256': sha(blob), 'byteLength': len(blob)}

def save(path, value):
    blob = value if isinstance(value, bytes) else encode(value)
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        assert path.read_bytes() == blob, 'IMMUTABLE_CONFLICT: '+str(path)
    else:
        path.write_bytes(blob)

def norm(text):
    return re.sub(r'[^\w]+', ' ', unicodedata.normalize('NFKC', text).casefold()).strip()

def new_id():
    return str(uuid.UUID(int=(int(time.time()*1000)<<80)|(7<<76)|(secrets.randbits(12)<<64)|(2<<62)|secrets.randbits(62)))

def image_request(source, topic):
    word = source['headword']
    prompt = 'Friendly watercolor educational illustration consistent with the preceding VocabFlow batch. One clear coherent scene, uncluttered neutral background, square PNG1600x1600. Depict ONLY the selected sense of '+word+': '+source['definitionEn']+' Context to guide the illustration: '+source['examples'][0]['en']+' Do not depict a different homograph, grammatical category or sense. Target meaning is essential; example background details are secondary. Accurate normal objects and anatomy, intact ordinary objects unless the selected meaning requires damage. No anatomical cross-sections, see-through bodies or exposed organs. No readable words, letters, numbers, captions, product labels, watermarks or logos. No contact sheets or multiple unrelated panels. No unsafe child handling of knives, electricity or fire. Abstract meanings may use a simple coherent visual metaphor with plain shapes and arrows, no printed word labels. '
    constraints = {
        'football':'Round soccer ball and two teams using feet, no American football or helmets.',
        'soccer':'Round soccer ball and goalposts, no American football.',
        'hockey':'Field hockey on grass with curved sticks and a small ball; no mixed ice and grass equipment.',
        'square':'A single flat geometric square with exactly four equal straight sides and four right angles, not a town plaza.',
        'glass':'Transparent glass material shown in an unlabelled jar, not a drinking glass sense.',
        'can':'A sealed plain food tin/can without printed text, not a modal verb or toilet.',
        'bath':'An empty bathtub fixture, not a person bathing.',
        'shower':'A shower fixture, not rain or a whole bathing scene.',
        'track':'Railway rails with sleepers, not a running track or music waveform.',
        'ring':'A doorbell making sound, not jewelry or a phone call.',
        'rise':'Bubbles rising upward through water, not a price chart.',
        'sound':'An old bell with gentle sound-wave arcs, not a linking-verb opinion scene.',
        'wild':'Rabbits in natural habitat with no enclosure or caretaker, not cultivated plants.',
        'clear':'One person explaining a simple visual diagram to another who understands; not transparent water or clear weather.',
        'foreign':'Clearly suggest travel between two different countries with two map silhouettes and an imported unlabelled newspaper; no national stereotypes or invented flag text.',
        'competition':'Two teams competing in one sporting event; this is competition between participants, not an award-only portrait.',
        'link':'A visible connection between two related ideas shown as simple sleep and memory pictograms joined by a line; not a clickable browser URL.',
        'profile':'A structured collection of plain pictorial information about customers, not a side-view face portrait.',
        'code':'A simple coded symbol pattern on boxes, not computer source code or readable cipher letters.',
        'mark':'Commemoration of an anniversary, not a written score.',
        'since':'A single timeline with an unlabelled start marker in the past and an ongoing action reaching a present marker. Do not print dates or words.',
        'by':'An artist painting a mural with the visible mural clearly created by that artist. This is passive-agent by, not beside.',
        'above':'A clock fixed directly above a door, with a clear vertical gap. No clock numerals.',
        'over':'A hanging lamp directly over a reading table, no crossing over a bridge.',
        'against':'A bicycle leaning with its frame touching a garden wall, not an argument or fight.',
        'among':'One blue umbrella unmistakably surrounded by several black umbrellas in a rack.',
        'before':'Arrival at a concert hall while the stage is still being prepared before the concert begins, no temporal labels.',
        'during':'One coherent lecture scene with the lights going out while the speaker is midway through presenting, not before or after the lecture.',
        'once':'One single completed visit indicated by one plain visit token beside an island scene; no numerals.',
        'twice':'Exactly two matching visit/check tokens beside a person checking a parcel; no numerals.',
        'never':'A plain recurring routine strip with the target activity absent at every occasion; no readable symbols or words.',
        'always':'Seven plain recurring day tokens all showing the same door-lock-check pictogram, no dates or text.',
        'daily':'A simple weekly strip of seven blank day cells, each with a cleaning pictogram; no letters or numbers.',
        'sometimes':'A recurring strip where only some day cells show a neighbor bringing herbs, the other cells neutral; no words or numbers.',
        'often':'A recurring strip where most but not every cell shows hearing an owl; no words or numbers.',
        'usually':'A recurring strip where most but not every cell shows packing lunch, one cell neutral; no words or numbers.',
        'sick':'A person resting at home with a blanket and thermometer without readable numbers, general illness, no vomiting.',
        'ill':'A person resting comfortably at home after feeling unwell, no exposed organs or frightening procedures.',
        'medicine':'Sealed unlabelled medicine container and a responsible adult pharmacist; no dosage advice, readable labels or unsupervised child taking pills.',
        'disease':'A gentle healthcare consultation showing illness, no identifiable diagnosis, graphic injury or treatment instructions.',
        'blood':'A tiny red droplet on a covered minor finger scrape with a clean bandage nearby; non-graphic, no large wounds.',
        'injury':'A minor bandaged ankle supported on a cushion, no wounds or graphic damage.',
        'accident':'A gently tipped empty bicycle and spilled groceries on a path with adults helping, no injured bodies or graphic collision.'
    }
    if word in constraints:
        prompt += 'Critical disambiguation: '+constraints[word]
    return {'prompt': prompt, 'outputMime': 'image/png', 'minWidth': 1024, 'minHeight': 1024, 'allowedReadableText': []}

def build():
    topics = []
    seeds = []
    for number, line in enumerate((DATA/'selection-seeds.psv').read_text(encoding='utf8').splitlines(), 1):
        if line.startswith('# '):
            topic, label, pos = line[2:].split('|')
            topics.append({'code': topic, 'labelVi': label, 'partOfSpeech': pos, 'selectedCount': 25})
        elif line.strip():
            seeds.append({'headword': line.strip(), 'topicCode': topic, 'partOfSpeech': pos, 'sourceLine': number})
    assert len(seeds) == 500 and len(topics) == 20
    assert len({norm(s['headword']) for s in seeds}) == 500, 'DUPLICATE_WORDS'
    assert set(Counter(s['topicCode'] for s in seeds).values()) == {25}
    excluded = {'eyelash', 'muffin tin', 'wake up', 'practise', 'grey', 'yoghurt'}
    for p in PRIOR:
        excluded.update(norm(i['headword']) for i in read(p)['items'])
    assert not any(norm(s['headword']) in excluded for s in seeds), 'PREVIOUS_COLLECTION_OVERLAP'
    corpus = read(BASELINE)['rows']
    index = defaultdict(list)
    for row in corpus:
        index[norm(row['headword'])].append(row)
    decisions = read(DATA/'sense-selection.json')['selectedRuntimeIds']
    ids_path = DATA/'authoring-identities.json'
    if ids_path.exists():
        ids = read(ids_path)
    else:
        ids = {'datasetId': new_id(), 'items': {norm(s['headword']): {k: new_id() for k in ['itemId','exampleId','pronunciationRef','imageJobId','wordAudioJobId','exampleAudioJobId']} for s in seeds}}
        save(ids_path, ids)
    items = []
    source_rows = []
    for offset, seed in enumerate(seeds):
        word = seed['headword']
        candidates = [c for c in index[norm(word)] if c['partOfSpeech'] == seed['partOfSpeech'] and c['definitionEn'] and c['examples']]
        if word in decisions:
            candidates = [c for c in candidates if c['runtimeVocabularyId'] == decisions[word]]
        assert len(candidates) == 1, 'EXPLICIT_SENSE_DECISION_REQUIRED: '+word
        source = candidates[0]
        assert source['currentCefr'] in ['A1','A2'], 'UNSUPPORTED_BASIC_LEVEL: '+word
        assert source.get('historicalContentReview', {}).get('decision') == 'PASS', 'MISSING_HISTORICAL_CONTENT_REVIEW: '+word
        example = source['examples'][0]
        assert example.get('en') and example.get('vi'), 'BILINGUAL_SOURCE_EXAMPLE_REQUIRED'
        assert len(example['en'].split()) <= 26, 'SOURCE_EXAMPLE_TOO_LONG: '+word
        identity = ids['items'][norm(word)]
        image_spec = image_request(source, seed['topicCode'])
        item = {'itemId': identity['itemId'], 'entryCode': f'BP500-{offset+1:04d}', 'authoringRevision': 1, 'headword': word, 'displayForm': word, 'language': 'en', 'partOfSpeech': source['partOfSpeech'], 'meaningVi': source['meaningVi'], 'shortMeaningVi': source['meaningVi'], 'definitionEn': source['definitionEn'], 'senseNote': 'Exact selected existing sense: '+source['definitionEn'],
                'masterLexemeId': None, 'masterSenseId': None, 'runtimeVocabularyId': source['runtimeVocabularyId'], 'identityStatus': 'EXISTING_RUNTIME_SENSE_REFERENCE_CANONICAL_RECONCILIATION_PENDING',
                'examples': [{'exampleId': identity['exampleId'], 'exampleKey': example.get('exampleKey'), 'en': example['en'], 'vi': example['vi'], 'authorship': 'REUSED_EXACT_PINNED_LOCAL_EDITORIAL_EXAMPLE', 'audioJobId': identity['exampleAudioJobId']}],
                'classification': {'learningLevel': source['currentCefr'], 'cefr': source['currentCefr'], 'sourceRuntimeCefr': source['currentCefr'], 'status': 'PRESERVED_PINNED_RUNTIME_LEVEL_NOT_NEW_OFFICIAL_ASSESSMENT', 'schoolGrades': [], 'sourceCefrEvidence': source.get('proposedCefrEvidence')},
                'topicCodes': [seed['topicCode']], 'collectionCodes': ['basic-plus-500-r0001','basic-plus-500-'+seed['topicCode']],
                'wordPronunciation': {'pronunciationRef': identity['pronunciationRef'], 'locale': 'en-US', 'ipa': None, 'ipaStatus': 'NOT_INVENTED', 'audioJobId': identity['wordAudioJobId']},
                'imageBrief': image_spec,
                'media': {'image': {'jobId': identity['imageJobId'], 'status': 'PLANNED', 'assetPath': None, 'sha256': None}, 'wordAudio': {'jobId': identity['wordAudioJobId'], 'status': 'PLANNED', 'assetPath': None, 'sha256': None}, 'exampleAudio': [{'jobId': identity['exampleAudioJobId'], 'exampleId': identity['exampleId'], 'status': 'PLANNED', 'assetPath': None, 'sha256': None}]},
                'dedup': {'status': 'REUSE_EXACT_EXISTING_RUNTIME_SENSE', 'selectedRuntimeVocabularyId': source['runtimeVocabularyId'], 'previousCollectionsNormalizedHeadwordOverlap': False, 'sameFormRuntimeIds': [c['runtimeVocabularyId'] for c in index[norm(word)]], 'selectionMethod': 'EXPLICIT_HOMOGRAPH_DECISION' if word in decisions else 'ONLY_COMPATIBLE_SOURCE_SENSE', 'netNewCanonicalWords': 0},
                'provenance': {'baselineRowId': source['baselineRowId'], 'sourceContentSha256': source['sourceContentSha256'], 'sourceDataset': source.get('sourceDataset'), 'sourceProposalKey': source.get('proposalKey'), 'sourceRowSha256': stable(source), 'historicalContentReview': source['historicalContentReview'], 'textPolicy': 'Reuse local exact existing editorial text; not freshly authored or externally sourced dictionary quotation', 'seedLine': seed['sourceLine']},
                'editorialReview': {'selection': 'CURATED_AND_DISAMBIGUATED_SELF_REVIEW', 'sourceText': 'REUSED_PRIOR_LOCAL_REVIEWED_CONTENT', 'ownerAccepted': False}, 'runtimeEligible': False}
        item['contentSha256'] = stable({k:item[k] for k in ['itemId','headword','partOfSpeech','meaningVi','definitionEn','senseNote','examples','classification','topicCodes']})
        items.append(item)
        source_rows.append(source)
    source_pin_path = DATA/'selected-source-rows.json'
    save(source_pin_path, {'artifactType':'EXACT_SELECTED_LOCAL_SOURCE_ROWS','rows':source_rows})
    inputs = [pin(p) for p in [DATA/'selection-seeds.psv',DATA/'sense-selection.json',ids_path,BASELINE,source_pin_path,*PRIOR]]
    dataset = {'artifactType':'BASIC_PLUS_500_CURATED_DATASET','datasetId':ids['datasetId'],'revision':'r0001','state':'TEXT_FROZEN_MEDIA_PENDING','scope':'500 additional distinct-headword curated learning entries relative to prior547+500; all500 reuse existing local senses, zero net new canonical records','runtimeEligible':False,'counts':{'items':500,'topics':20,'examples':500,'reusedRuntimeSenses':500,'netNewCanonicalWords':0,'plannedImages':500,'plannedWordAudio':500,'plannedExampleAudio':500,'actualMediaOutputs':0},'inputPins':inputs,'learningLevelCounts':dict(Counter(i['classification']['learningLevel'] for i in items)),'topics':topics,'items':items}
    target=DATA/'dataset-text-r0001.json';save(target,dataset);source_pin=pin(target)
    jobs=[]
    for item in items:
        identity=ids['items'][norm(item['headword'])]
        for kind,key in [('IMAGE','imageJobId'),('WORD_AUDIO','wordAudioJobId'),('EXAMPLE_AUDIO','exampleAudioJobId')]:
            if kind=='IMAGE':
                spec=item['imageBrief']
            else:
                spec={'text':item['headword'] if kind=='WORD_AUDIO' else item['examples'][0]['en'],'locale':'en-US','voice':'avocado_v2:MAI_01','speed':90,'outputMime':'audio/mpeg','instruction':'Speak only exact text. No labels, translation, spelling, extra text or music.','pronunciationGuidanceNotSpoken':item['partOfSpeech']+'; '+item['definitionEn']}
            jobs.append({'jobId':identity[key],'itemId':item['itemId'],'kind':kind,'headword':item['headword'],'exampleId':identity['exampleId'] if kind=='EXAMPLE_AUDIO' else None,'entryCode':item['entryCode'],'targetContentSha256':item['contentSha256'],'requestedFilename':identity[key]+('.png' if kind=='IMAGE' else '.mp3'),'requestSpec':spec,'requestSpecSha256':stable(spec),'sourceDraft':source_pin,'provider':'MUSE_LOGGED_IN_UI','providerModel':None,'state':'NOT_SUBMITTED','output':None,'receipt':None})
    orders={'artifactType':'BASIC_PLUS_500_MUSE_WORK_ORDERS','sourceDraft':source_pin,'counts':{'items':500,'images':500,'wordAudio':500,'exampleAudio':500,'jobs':1500},'jobs':jobs}
    save(MEDIA/'work-orders.json',orders);save(MEDIA/'work-orders.sha256',(sha(encode(orders))+'\n').encode())
    request={'artifactType':'MUSE_BASIC_PLUS_500_EXACT_MEDIA_REQUEST','campaignCode':'basic-plus-500-r0001','sourceDraft':source_pin,'jobCount':1500,'instructions':'Media only. Do not author or change vocabulary, definitions, examples or IDs. Produce exactly one real file per job with exact requested UUID filename. Voice avocado_v2:MAI_01 en-US speed90. Audio exactText equals requestSpec.text, do not speak pronunciation guidance. Images watercolor, selected sense and prompt exact; no readable text, no organs/cutaways. Always keep artifact IDs isolated from prior basic-500 and expansion-550. MP3 ZIPs <=100 clips, attach progressively. Images first deliver a private small pilotZIP of first4 job images+mapping; prepare all500 images into13 ZIPs of<=40 images with prefix basic-plus-500-r0001-images40-01.zip through13.zip. Before publishing public48h links for the NEW ZIPs report exact names/sizes and request approval; no earlier sharing approval extends to this campaign. mapping.json ARRAY each ZIP: jobId,itemId,kind,headword,filename,exactText(null for image),actualVoice,actualModel(null if unexposed). Do not return empty/placeholder files; report exact missing jobIds. Do not regenerate prior campaigns.','jobs':jobs}
    save(MEDIA/'muse-basic-plus-500-request-r0001.json',request)
    summary={'state':dataset['state'],'counts':dataset['counts'],'learningLevelCounts':dataset['learningLevelCounts'],'dataset':source_pin,'workOrders':pin(MEDIA/'work-orders.json'),'providerRequest':pin(MEDIA/'muse-basic-plus-500-request-r0001.json'),'mediaRoot':MEDIA.as_posix(),'canonicalImportPerformed':False};save(DATA/'build-summary.json',summary)
    with (DATA/'review.csv').open('w',encoding='utf-8-sig',newline='') as stream:
        writer=csv.writer(stream);writer.writerow(['entryCode','topic','headword','partOfSpeech','meaningVi','definitionEn','exampleEn','exampleVi','sourceCefr','reuseRuntimeId'])
        for i in items:writer.writerow([i['entryCode'],i['topicCodes'][0],i['headword'],i['partOfSpeech'],i['meaningVi'],i['definitionEn'],i['examples'][0]['en'],i['examples'][0]['vi'],i['classification']['cefr'],i['runtimeVocabularyId']])
    cards=''.join('<article><small>'+html.escape(i['entryCode']+' · '+i['topicCodes'][0])+'</small><h2>'+html.escape(i['headword'])+'</h2><b>'+html.escape(i['meaningVi'])+'</b><p>'+html.escape(i['definitionEn'])+'</p><p>'+html.escape(i['examples'][0]['en'])+'<br>'+html.escape(i['examples'][0]['vi'])+'</p><small>'+i['classification']['cefr']+' · runtime '+str(i['runtimeVocabularyId'])+'</small></article>' for i in items)
    save(DATA/'review.html',('<!doctype html><html lang="vi"><meta charset="utf-8"><title>Thêm500 từ thông dụng</title><style>body{font:17px/1.6 system-ui;max-width:1000px;margin:32px auto;padding:16px;background:#f4f6fb;color:#172033}article{padding:20px;margin:12px 0;background:white;border:1px solid #dce3ed;border-radius:12px}h2,p{margin:6px 0}small{color:#53637b}</style><h1>Thêm500 mục thông dụng ·20chủ đề</h1><p>Dùng lại500nghĩa có sẵn, không lặp dạng từ với hai bộ trước. Media đang tạo; chưa nhập DB.</p>'+cards+'</html>').encode('utf8'))
    print(json.dumps({'items':len(items),'jobs':len(jobs),'levels':dataset['learningLevelCounts'],'existingSensesReused':500,'netNewCanonicalWords':0}))

if __name__=='__main__':
    build()
