"""Validate additional500 exact existing-sense references and pinned media jobs."""
from collections import Counter
import importlib.util
from pathlib import Path
import uuid

spec=importlib.util.spec_from_file_location('plus500',Path(__file__).with_name('editorial-basic-plus500-v1.py'))
b=importlib.util.module_from_spec(spec);spec.loader.exec_module(b)

def main():
    checks=0
    def require(condition,label):
        nonlocal checks
        checks+=1
        if not condition:raise ValueError(label)
    d=b.read(b.DATA/'dataset-text-r0001.json');orders=b.read(b.MEDIA/'work-orders.json');request=b.read(b.MEDIA/'muse-basic-plus-500-request-r0001.json')
    require(len(d['items'])==500 and len(d['topics'])==20,'500_ITEMS_20_TOPICS')
    require(set(Counter(i['topicCodes'][0] for i in d['items']).values())=={25},'25_PER_TOPIC')
    require(len({b.norm(i['headword']) for i in d['items']})==500,'DISTINCT_HEADWORDS')
    require(len({i['runtimeVocabularyId'] for i in d['items']})==500,'DISTINCT_RUNTIME_REFERENCES')
    require(d['counts']['netNewCanonicalWords']==0 and d['counts']['reusedRuntimeSenses']==500,'HONEST_REUSE_COUNTS')
    for p in d['inputPins']:require(b.pin(Path(p['path']))==p,'PINNED_SOURCE_BYTES')
    require(b.sha((b.MEDIA/'work-orders.json').read_bytes())==(b.MEDIA/'work-orders.sha256').read_text().strip(),'WORK_ORDERS_PIN')
    require(orders['sourceDraft']==b.pin(b.DATA/'dataset-text-r0001.json'),'EXACT_SOURCE_DRAFT')
    require(orders['jobs']==request['jobs'] and len(orders['jobs'])==request['jobCount']==1500,'PROVIDER_EXACT_JOBS')
    jobs={j['jobId']:j for j in orders['jobs']};require(len(jobs)==1500,'UNIQUE_JOBS')
    require(Counter(j['kind'] for j in jobs.values())=={'IMAGE':500,'WORD_AUDIO':500,'EXAMPLE_AUDIO':500},'MEDIA_KIND_COUNTS')
    previous=set()
    for p in b.PRIOR:previous.update(b.norm(i['headword']) for i in b.read(p)['items'])
    sources={c['runtimeVocabularyId']:c for c in b.read(b.BASELINE)['rows']}
    for i in d['items']:
        c=sources[i['runtimeVocabularyId']];e=i['examples'][0];original=c['examples'][0]
        require(b.norm(i['headword']) not in previous,'NO_PREVIOUS_COLLECTION_OVERLAP')
        require(i['partOfSpeech']==c['partOfSpeech'] and b.norm(i['headword'])==b.norm(c['headword']),'EXACT_SENSE_REFERENCE')
        require(i['meaningVi']==c['meaningVi'] and i['definitionEn']==c['definitionEn'],'EXACT_REUSED_DEFINITION')
        require(e['en']==original['en'] and e['vi']==original['vi'],'EXACT_REUSED_BILINGUAL_EXAMPLE')
        require(i['provenance']['sourceRowSha256']==b.stable(c),'EXACT_SOURCE_ROW_PIN')
        require(c['historicalContentReview']['decision']=='PASS','SOURCE_REVIEW_EXISTS')
        require(i['classification']['cefr']==c['currentCefr'] and c['currentCefr'] in ['A1','A2'],'PRESERVED_BASIC_CEFR')
        require(not i['classification']['schoolGrades'],'NO_CEFR_GRADE_INFERENCE')
        require(i['masterSenseId'] is None and i['masterLexemeId'] is None and not i['runtimeEligible'],'NO_CANONICAL_PUBLICATION')
        require(uuid.UUID(i['itemId']).version==7,'UUID7_AUTHORING_ID')
        require(i['contentSha256']==b.stable({k:i[k] for k in ['itemId','headword','partOfSpeech','meaningVi','definitionEn','senseNote','examples','classification','topicCodes']}),'ITEM_CONTENT_PIN')
        for binding,kind in [(i['media']['image'],'IMAGE'),(i['media']['wordAudio'],'WORD_AUDIO'),(i['media']['exampleAudio'][0],'EXAMPLE_AUDIO')]:
            j=jobs[binding['jobId']]
            require(j['itemId']==i['itemId'] and j['kind']==kind and j['headword']==i['headword'],'JOB_IDENTITY_BINDING')
            require(j['exampleId']==(e['exampleId'] if kind=='EXAMPLE_AUDIO' else None),'JOB_EXAMPLE_BINDING')
            require(j['targetContentSha256']==i['contentSha256'] and j['sourceDraft']==orders['sourceDraft'],'JOB_TEXT_SOURCE_PINS')
            require(j['requestedFilename']==j['jobId']+('.png' if kind=='IMAGE' else '.mp3'),'EXACT_FILENAME')
            require(j['requestSpecSha256']==b.stable(j['requestSpec']),'REQUEST_PIN')
            if kind!='IMAGE':
                require(j['requestSpec']['text']==(i['headword'] if kind=='WORD_AUDIO' else e['en']),'EXACT_TTS_TEXT')
                require(j['requestSpec']['voice']=='avocado_v2:MAI_01' and j['requestSpec']['locale']=='en-US' and j['requestSpec']['speed']==90,'CONSISTENT_TTS')
    report={'state':'PASS','checks':checks,'items':500,'topics':20,'jobs':1500,'existingSensesReused':500,'netNewCanonicalWords':0,'dataset':b.pin(b.DATA/'dataset-text-r0001.json'),'limits':'Structural/source/binding checks and preserved historical reviews. Not proof of independent current semantic review, media quality, owner approval or DB import.'}
    b.save(b.DATA/'validation-report.json',report)
    print(b.encode({k:report[k] for k in ['state','checks','items','topics','jobs','existingSensesReused','netNewCanonicalWords']}).decode('utf8'))

if __name__=='__main__':main()
