"""Authoring-only expansion build. No UI, provider, database write or import."""
from pathlib import Path
import csv
import hashlib
import html
import json
import re
import shutil
import unicodedata

ROOT = Path.cwd().resolve()
DATA = Path('vocabflow-dataset/workspaces/editorial-refresh-20261028/expansion-550-r0001')
MEDIA = Path('.vocabflow-local/editorial-refresh-20261028/expansion-550-media-r0001')
BASELINE = Path('vocabflow-dataset/workspaces/editorial-refresh-20261028/baseline-v2')
SOURCE = Path('vocabflow-dataset/workspaces/master-editorial-high-throughput-500-03/provisional-bulk-continuation/phase-e-t18-open-wordnet-20261014-v1/source')

def read(p): return json.loads(p.read_text(encoding='utf-8'))
def sha(b): return hashlib.sha256(b).hexdigest()
def pin(p): return {'path':p.as_posix(),'sha256':sha(p.read_bytes()),'byteLength':p.stat().st_size}
def encoded(v): return (json.dumps(v,ensure_ascii=False,indent=2)+'\n').encode()
def stable(v): return sha(json.dumps(v,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode())
def save(p,v):
    p.parent.mkdir(parents=True,exist_ok=True)
    b=encoded(v)
    if p.exists(): assert p.read_bytes()==b, f'IMMUTABLE_OUTPUT_CHANGED:{p}'
    else: p.write_bytes(b)
    return pin(p)
def norm(s): return re.sub(r'[^\w]+',' ',unicodedata.normalize('NFKC',s).casefold()).strip()
def psv(p,columns):
    rows={}
    for line in p.read_text(encoding='utf-8').splitlines():
        if not line.strip(): continue
        fields=line.split('|'); assert len(fields)==columns,(p,fields)
        assert fields[0] not in rows, f'DUPLICATE_AUTHOR_ROW:{fields[0]}'
        rows[fields[0]]=fields[1:]
    return rows

def build():
    selection=read(DATA/'candidate-selection.json')
    assert len(selection['items'])==550
    identities=read(DATA/'authoring-identities.json'); ids={i['headword']:i for i in identities['items']}
    examples=psv(DATA/'authored-examples.psv',3); authored=psv(DATA/'authored-definitions.psv',2)
    decisions=read(DATA/'sense-decisions.json'); dictionary={i['headword']:i for i in read(DATA/'dictionary-candidates.json')}
    overrides=read(DATA/'editorial-overrides.json')
    baseline=read(BASELINE/'corpus.json')['rows']; current=read(DATA/'current-local-lexical-snapshot.json')['rows']
    assert len(baseline)==len(current)==7341
    current_forms={norm(r[k]) for r in current for k in ['word','headword'] if r.get(k)}
    baseline_forms={norm(r[k]) for r in baseline for k in ['runtimeDisplay','headword'] if r.get(k)}
    assert current_forms==baseline_forms,'LOCAL_LEXICAL_FORM_DRIFT'
    topics={t['code']:t for t in selection['topics']}
    inputs=[DATA/n for n in ['candidate-seeds.psv','candidate-selection.json','authoring-identities.json','authored-examples.psv','authored-definitions.psv','sense-decisions.json','editorial-overrides.json','dictionary-candidates.json','current-local-lexical-snapshot.json']]
    inputs += [BASELINE/'baseline-manifest.json',BASELINE/'corpus.json',BASELINE/'source-index.json',SOURCE/'english-wordnet-2025-json.zip',SOURCE/'LICENSE.md']
    input_pins=[pin(p) for p in inputs]
    items=[]
    for index,seed in enumerate(selection['items']):
        word=seed['headword']; identity=ids[word]; topic=topics[seed['topicCode']]; candidates=dictionary[word]['options']
        assert norm(word) not in current_forms, f'EXISTING_WORD:{word}'
        assert word in examples and (word in authored or candidates), f'COPY_MISSING:{word}'
        if len(candidates)>1: assert word in decisions or word in authored, f'AMBIGUOUS_SENSE_UNREVIEWED:{word}'
        chosen=candidates[decisions.get(word,0)] if candidates else None
        definition=authored[word][0] if word in authored else chosen['definition'][0]
        assert '\ufffd' not in definition, f'SOURCE_ENCODING_REVIEW:{word}'
        en,vi=examples[word]; assert word.casefold() in en.casefold(), f'EXAMPLE_TARGET_MISSING:{word}'
        assert len(en.split())<=24 and len(vi.split())<=45
        level=topic['proposedLearningLevel'] if topic['proposedLearningLevel']!='A1' else 'A1'
        if level not in ['FIRST_WORDS','A1','A2','B1','B2','C1','C2']: level=topic['proposedCefr']
        for code,words in overrides['learningLevelOverrides'].items():
            if word in words: level=code
        meaning=overrides['glossOverrides'].get(word,seed['meaningVi'])
        pos='VERB' if seed['topicCode'] in ['everyday-phrases','social-phrases'] else 'NOUN'
        sense_note=overrides['senseNotes'].get(word,definition)
        scene=f'Vocabulary learning illustration for the English lexical item "{word}". Intended sense: {definition}. Vietnamese editorial gloss for disambiguation only: {meaning}. '
        scene+='Show one clear focal subject or one simple scene illustrating that exact sense. Friendly clean educational illustration, natural proportions, uncluttered light background, consistent soft colors. No printed letters, words, numbers, logos, trademarks, watermark, collage or multi-panel sheet. Produce a separate square PNG.'
        if seed['topicCode']=='body-care': scene+=' For a body part show a neutral simplified anatomical crop of an age-appropriate clothed person where relevant, no injury or graphic details.'
        if seed['topicCode'] in ['digital-life','study-skills','money-shopping','university-work','office-teamwork']: scene+=' Use a clear concrete scene or visual metaphor when the term is abstract; do not add fake readable interface labels or financial/personal details.'
        item={'itemId':identity['itemId'],'authoringRevision':1,'masterLexemeId':None,'masterSenseId':None,'runtimeVocabularyId':None,
              'identityStatus':'AUTHORING_UUID_ASSIGNED_CANONICAL_RECONCILIATION_PENDING','headword':word,'displayForm':word,'language':'en','partOfSpeech':pos,
              'meaningVi':meaning,'shortMeaningVi':meaning,'definitionEn':definition,'senseNote':sense_note,
              'examples':[{'exampleId':identity['exampleId'],'exampleKey':'expansion-example:'+identity['exampleId'],'en':en,'vi':vi,'authorship':'CODEX_EDITOR_AUTHORED','audioJobId':identity['exampleAudioJobId']}],
              'classification':{'learningLevel':level,'cefr':None if level=='FIRST_WORDS' else level,'status':'EDITORIAL_ESTIMATE_NOT_OFFICIAL_CEFR_ASSESSMENT','schoolGrades':[],
                                'agePolicy':'No CEFR-to-grade mapping; word/context selected for general learners, foundational concrete sets prioritized.'},
              'topicCodes':[seed['topicCode']],'collectionCodes':[seed['topicCode']],'wordPronunciation':{'pronunciationRef':identity['wordPronunciationRef'],'locale':'en-US','ipa':None,'ipaStatus':'NOT_INVENTED_OR_INFERRED_FROM_TTS','audioJobId':identity['wordAudioJobId']},
              'imageBrief':scene,'media':{'image':{'jobId':identity['imageJobId'],'status':'PLANNED_NOT_GENERATED','assetPath':None,'sha256':None},'wordAudio':{'jobId':identity['wordAudioJobId'],'status':'PLANNED_NOT_GENERATED','assetPath':None,'sha256':None},'exampleAudio':[{'jobId':identity['exampleAudioJobId'],'exampleId':identity['exampleId'],'status':'PLANNED_NOT_GENERATED','assetPath':None,'sha256':None}]},
              'dedup':{'baselineRowCount':7341,'currentLocalRowCount':7341,'exactNormalizedHeadwordAbsent':True,'editorialQueueChecked':True,'variantAndExactVietnameseMeaningHoldsExcluded':True,'status':'CANDIDATE_LEXICAL_ADDITION_SELF_REVIEWED_NOT_CANONICALLY_IMPORTED'},
              'provenance':{'meaningVi':'CODEX_EDITOR_AUTHORED','examples':'CODEX_EDITOR_AUTHORED','definitionEn':'CODEX_EDITOR_AUTHORED' if word in authored else 'OPEN_ENGLISH_WORDNET_2025_EXACT_DEFINITION',
                            'dictionarySense':chosen,'sourceArchiveSha256':sha((SOURCE/'english-wordnet-2025-json.zip').read_bytes()) if chosen else None,'dictionaryAttribution':'Princeton WordNet and the Open English Wordnet team; WordNet License and CC BY 4.0. See SOURCES-AND-LICENSE.txt.'},
              'editorialReview':{'status':'AUTHOR_SELF_REVIEWED','independentReview':False,'officialCefrCertification':False,'mediaListeningAndVisualReview':'PENDING_ACTUAL_OUTPUTS'},'runtimeEligible':False,'batchNumber':index//25+1}
        item['contentSha256']=stable({k:item[k] for k in ['itemId','headword','partOfSpeech','meaningVi','definitionEn','senseNote','examples','classification','topicCodes']})
        items.append(item)
    assert len({i['itemId'] for i in items})==len({norm(i['headword']) for i in items})==550
    levels={x:sum(i['classification']['learningLevel']==x for i in items) for x in ['FIRST_WORDS','A1','A2','B1','B2','C1','C2']}
    dataset={'artifactType':'EDITOR_AUTHORED_VOCABULARY_EXPANSION','schemaVersion':'vocabflow-expansion-authoring/1.0.0','datasetId':identities['datasetId'],'revision':1,'campaignId':'editorial-refresh-20261028','target':'550vocabulary entries; Muse produces media only','state':'TEXT_DRAFT_MEDIA_PENDING','runtimeEligible':False,
             'inputPins':input_pins,'hashAlgorithm':'sha256-utf8-json-sortkeys-compact-expansion-v1','counts':{'authoredItems':550,'topics':33,'examples':550,'imageJobs':550,'wordAudioJobs':550,'exampleAudioJobs':550,'actualMediaOutputs':0,'canonicalNewSensesImported':0},
             'learningLevelCounts':levels,'topics':[{'code':t['code'],'labelVi':t['labelVi'],'itemCount':sum(t['code'] in i['topicCodes'] for i in items)} for t in selection['topics']],'items':items,
             'compatibility':{'existingApplicationUiChanged':False,'newLetterOrUtteranceModuleRequired':False,'runtimeIdsAssigned':False,'importExecuted':False,'purpose':'Complete authoring text and exact media plan; runtime release/import validation and actual media are still pending.'}}
    draft_pin=save(DATA/'dataset-text-r0001.json',dataset)
    # Flat projection exposes familiar existing vocabulary fields without inventing runtime IDs/URLs.
    projection={'schemaVersion':'vocabflow-vocabulary-import-candidate/1.0.0','source':draft_pin,'status':'NOT_IMPORTED_MEDIA_PENDING','vocabulary':[{'authoringItemId':i['itemId'],'id':None,'word':i['headword'],'displayForm':i['displayForm'],'ipa':None,'vietnamese':i['meaningVi'],'shortMeaningVi':i['shortMeaningVi'],'definitionEn':i['definitionEn'],'exampleEn':i['examples'][0]['en'],'examples':i['examples'],'topicCodes':i['topicCodes'],'cefr':i['classification']['cefr'],'learningLevel':i['classification']['learningLevel'],'classificationStatus':i['classification']['status'],'level':None,'imageUrl':None,'audioUrl':None,'mediaBindings':i['media'],'sourceContentSha256':i['contentSha256']} for i in items]}
    save(DATA/'app-import-candidate-r0001.json',projection)
    rows=[]
    for item in items:
        ex=item['examples'][0]
        configs=[('IMAGE',item['media']['image']['jobId'],{'prompt':item['imageBrief'],'outputMime':'image/png','widthRequested':1024,'heightRequested':1024}),
                 ('WORD_AUDIO',item['wordPronunciation']['audioJobId'],{'text':item['headword'],'locale':'en-US','requestedVoice':'female American English; Aria MAI_01 if available, consistent across batch','speedRequested':90,'outputMime':'audio/mpeg','instruction':'Read only the exact lexical item in the intended sense; no explanations, translation, numbering or background music.'}),
                 ('EXAMPLE_AUDIO',ex['audioJobId'],{'text':ex['en'],'locale':'en-US','requestedVoice':'female American English; Aria MAI_01 if available, consistent across batch','speedRequested':90,'outputMime':'audio/mpeg','instruction':'Read only the exact English example; no explanation, translation or numbering.'})]
        for kind,jobid,payload in configs:
            ext='png' if kind=='IMAGE' else 'mp3';name=jobid+'.'+ext
            rows.append({'jobId':jobid,'itemId':item['itemId'],'kind':kind,'headword':item['headword'],'targetContentSha256':item['contentSha256'],'exampleId':ex['exampleId'] if kind=='EXAMPLE_AUDIO' else None,'requestedFilename':name,'requestSpec':payload,'requestSpecSha256':stable(payload),
                         'requestHashScope':'Exact editorial request specification, not an unobserved provider API payload. Full submitted Muse prompt hash is recorded separately.','provider':'MUSE_LOGGED_IN_UI','providerModel':'NOT_EXPOSED_NOT_INVENTED','state':'WAITING_BROWSER_CONNECTION','output':None,'receipt':None,'sourceDraft':draft_pin})
    save(MEDIA/'work-orders.json',{'schemaVersion':'expansion-media-work-orders/1.0.0','sourceDraft':draft_pin,'ownerAuthorized':True,'ownerStatement':'tổng hợp cho tôi 5-600 từ theo các chủ đề, cấp độ rồi cho muse tạo ảnh vs tts luôn','jobs':rows,'providerCallsStarted':0,'outputsProduced':0,'databaseWrites':0})
    (MEDIA/'work-orders.sha256').write_text(sha((MEDIA/'work-orders.json').read_bytes())+'\n',encoding='utf-8')
    prompts=[]
    for family,selected,size in [('audio',[j for j in rows if j['kind']!='IMAGE'],50),('images',[j for j in rows if j['kind']=='IMAGE'],4)]:
        for offset in range(0,len(selected),size):
            chunk=selected[offset:offset+size];number=offset//size+1
            intro='You are a media production worker. Generate ONLY the requested media. Do not author vocabulary, translate, change wording, classify levels, add items or alter IDs. One independent file per job. Use the supplied exact filename. Do not make a contact sheet or combine audio clips. If a job cannot be completed, report it honestly as missing. '
            intro+='Return a downloadable ZIP with all produced files and mapping.json: an array of {jobId,itemId,kind,headword,filename,exactText,actualVoice,actualModel}. Never claim an unproduced file exists. '
            if family=='audio':intro+='All audio: consistent female American English, clear natural speech, Aria MAI_01 at90% if available. Read only exactText. No spoken labels, numbers, meanings or instructions. '
            else:intro+='All images: coherent friendly educational illustration, one clear focal subject, square PNG. No text, brand, watermark, collage or composite sheet. '
            small=[{'jobId':j['jobId'],'itemId':j['itemId'],'kind':j['kind'],'headword':j['headword'],'filename':j['requestedFilename'],'exactText':j['requestSpec'].get('text'),'prompt':j['requestSpec'].get('prompt')} for j in chunk]
            text=intro+'\n'+json.dumps(small,ensure_ascii=False,indent=2)
            p=MEDIA/f'prompts/{family}-{number:04d}.txt';p.parent.mkdir(parents=True,exist_ok=True);p.write_text(text+'\n',encoding='utf-8')
            prompts.append({'path':p.as_posix(),'sha256':sha(p.read_bytes()),'family':family,'jobIds':[j['jobId'] for j in chunk],'state':'NOT_SUBMITTED'})
    save(MEDIA/'prompt-index.json',{'sourceWorkOrders':pin(MEDIA/'work-orders.json'),'prompts':prompts,'counts':{'audioPrompts':22,'imagePrompts':138,'totalJobs':1650},'note':'Prompt chunks are an operational choice, not a claim about Muse current limits. Only produced/downloaded/validated files count.'})
    with (DATA/'review.csv').open('w',encoding='utf-8-sig',newline='') as f:
        writer=csv.writer(f);writer.writerow(['itemId','headword','meaningVi','topic','levelEstimate','definitionEn','exampleEn','exampleVi','mediaStatus'])
        for i in items:writer.writerow([i['itemId'],i['headword'],i['meaningVi'],topics[i['topicCodes'][0]]['labelVi'],i['classification']['learningLevel'],i['definitionEn'],i['examples'][0]['en'],i['examples'][0]['vi'],'NOT_GENERATED'])
    page='<!doctype html><html lang="vi"><meta charset="utf-8"><title>550 mục từ — bản biên tập</title><style>body{font:16px/1.5 system-ui;margin:24px;max-width:1300px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:10px;text-align:left}th{background:#eee}small{color:#555}</style><h1>550 mục từ · 33 chủ đề</h1><p>Bản biên tập: ảnh và TTS chưa được tạo. Cấp độ là ước lượng biên tập, không phải chứng nhận CEFR. Chưa nhập app.</p>'
    for t in selection['topics']:
        page+='<h2>'+html.escape(t['labelVi'])+'</h2><table><tr><th>Từ</th><th>Nghĩa</th><th>Mức đề xuất</th><th>Ví dụ</th></tr>'
        for i in items:
            if t['code'] not in i['topicCodes']:continue
            page+='<tr><td>'+html.escape(i['headword'])+'</td><td>'+html.escape(i['meaningVi'])+'</td><td>'+i['classification']['learningLevel']+'</td><td>'+html.escape(i['examples'][0]['en'])+'<br><small>'+html.escape(i['examples'][0]['vi'])+'</small></td></tr>'
        page+='</table>'
    (DATA/'review.html').write_text(page+'</html>',encoding='utf-8')
    shutil.copyfile(SOURCE/'LICENSE.md',DATA/'OPEN-ENGLISH-WORDNET-LICENSE.txt')
    (DATA/'SOURCES-AND-LICENSE.txt').write_text('Definitions labeled OPEN_ENGLISH_WORDNET_2025_EXACT_DEFINITION incorporate English Wordnet2025 entries. Attribution: Princeton WordNet and the Open English Wordnet team. License: WordNet License and Creative Commons Attribution4.0, see OPEN-ENGLISH-WORDNET-LICENSE.txt and the pinned source archive.\nVietnamese glosses and550bilingual examples are newly authored by the Codex editor for this dataset; Muse is only commissioned for images/audio. Dictionary evidence and exact source sense choices are kept separately. Level estimates are editorial judgments, not certified CEFR labels. No ungenerated media is licensed or represented as delivered.\n',encoding='utf-8')
    save(DATA/'build-summary.json',{'source':draft_pin,'counts':dataset['counts'],'levels':levels,'outputProjection':pin(DATA/'app-import-candidate-r0001.json'),'workOrders':pin(MEDIA/'work-orders.json'),'promptIndex':pin(MEDIA/'prompt-index.json'),'state':'TEXT_DRAFT_MEDIA_PENDING','dictionaryDefinitions':sum(i['provenance']['definitionEn'].startswith('OPEN') for i in items),'editorAuthoredDefinitions':sum(i['provenance']['definitionEn']=='CODEX_EDITOR_AUTHORED' for i in items),'individuallyAuthoredBilingualExamples':550,'browserBlock':'Local browser use is disabled in Work settings','featureCodeChanges':0,'databaseWrites':0})
    print(json.dumps({'status':dataset['state'],'items':550,'topics':33,'levels':levels,'plannedMedia':1650,'actualMedia':0}))

if __name__=='__main__': build()
