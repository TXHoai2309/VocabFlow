#!/usr/bin/env python3
"""Freeze selection, seal persisted manuscripts, and replay offline DRAFT only."""
import argparse
import copy
import hashlib
import json
import re
import subprocess
from collections import Counter
from functools import lru_cache
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WS = ROOT / 'vocabflow-dataset/workspaces/master-editorial-high-throughput-500'
CP = WS / 'checkpoints/checkpoint-01'
SOURCE = ROOT / 'vocabflow-dataset/workspaces/full-source-inventory-dedupe'
PLAN = ROOT / 'vocabflow-dataset/workspaces/full-master-expansion-candidate-preparation'
PARENT = ROOT / 'vocabflow-dataset/workspaces/master-editorial-draft-remediation/checkpoints/batch-04'
BASELINE = '5dd90548057a977236bb819045e6c2d94c266f48'
PARENT_FP = 'bb669bee71f2dfc6c53b8b9ec3511caae9dc31b13be342044829d674a22ddb82'
SEED = 'PHASE_2H2K_500_V1'
RIGHTS = 'UNKNOWN_REVIEW_REQUIRED'
POS = {'NOUN','VERB','ADJECTIVE','ADVERB','PRONOUN','PREPOSITION','DETERMINER','CONJUNCTION','INTERJECTION','OTHER','NUMBER'}


def require(value, message):
    if not value:
        raise ValueError(message)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def digest(value):
    return sha(json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode())


def encode(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2)+'\n').encode()


def load(path):
    return json.loads(path.read_bytes().decode('utf-8'))


def write_new(path, data):
    require(not path.exists(), 'Refusing to overwrite sealed/existing artifact: '+str(path))
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)


@lru_cache(maxsize=1)
def inputs():
    require(subprocess.check_output(['git','branch','--show-current'],cwd=ROOT).decode().strip()=='TXH', 'Expected TXH')
    require(subprocess.run(['git','merge-base','--is-ancestor',BASELINE,'HEAD'],cwd=ROOT,capture_output=True).returncode==0,
            'Accepted baseline not on current history')
    pm = load(PLAN/'manifest.json')
    artifacts = {n:load(PLAN/n) for n in pm['files']}
    require(digest(artifacts) == pm['fingerprint'] == '5b754405d9072e79b603e6b008bd8788a7dae7aed4f2eedde3087482fc0bc7ff', 'Planning fingerprint drift')
    groups = artifacts['full-master-expansion-candidate-ledger.json']['groups']
    old = load(PARENT/'cumulative-remediated-effective-draft-projection.json')
    authored = {r['candidateGroupKey'] for r in old['records']}
    keys = {g['candidateGroupKey'] for g in groups}
    require(len(groups)==len(keys)==6143 and len(authored)==1020 and len(old['records'])==1563
            and authored.issubset(keys) and len(keys-authored)==5123, 'Source/authored group accounting drift')
    require(len({g['normalizedHeadword'] for g in groups})==6143
            and all(g['candidateGroupKey']=='NORMALIZED_HEADWORD:'+g['normalizedHeadword'] for g in groups),
            'Duplicate or inconsistent normalized group identity')
    historical=[]
    for folder,name,count in [('full-master-expansion-candidate-preparation','pilot-cohort.json',100),
                              ('master-editorial-stratified-120','selected-cohort.json',120),
                              ('master-editorial-bulk-300','selected-cohort.json',300),
                              ('master-editorial-bulk-500','selected-cohort.json',500)]:
        cohort=load(ROOT/'vocabflow-dataset/workspaces'/folder/name)['groups']
        require(len(cohort)==count,'Historical cohort count mismatch')
        historical.extend(g['candidateGroupKey'] for g in cohort)
    require(len(historical)==len(set(historical))==1020 and set(historical)==authored,
            'Historical cohorts differ from accepted authored exclusion')
    require(load(PARENT/'manifest.json')['fingerprint']==PARENT_FP, 'Parent fingerprint drift')
    sources = {c:load(SOURCE/n)['records'] for c,n in [('OXFORD_5000','oxford-normalized-inventory.json'),('ENGLISH_VOCAB_4600','vocab4600-normalized-inventory.json')]}
    require(sum(len(v) for v in sources.values())==9677, 'Imported source count mismatch')
    for records in sources.values():
        for record in records:
            validate_source_record(record)
    used = Counter()
    for g in groups:
        for ref in g['sourceEvidence']:
            r=sources[ref['corpus']][ref['recordIndex']]
            validate_source_ref(g,ref,r)
            used[ref['corpus'],ref['recordIndex']]+=1
    require(len(used)==9677 and set(used.values())=={1}, 'Source records not accounted exactly once')
    return groups, authored, old, sources


def validate_source_record(record):
    require(digest({k:v for k,v in record.items() if k!='recordEvidenceSha256'})==record['recordEvidenceSha256'],
            'Independent source record evidence hash mismatch')


def validate_source_ref(group,ref,record):
    require(record['sourceRecordId']==ref['sourceRecordId'] and record['recordEvidenceSha256']==ref['recordEvidenceSha256']
            and record['normalizedHeadword']==group['normalizedHeadword'], 'Source reference mismatch')


def category(g):
    return 'BOTH' if len(g['sourceMembership'])==2 else 'OXFORD' if g['sourceMembership']==['OXFORD_5000'] else 'VOCAB'


def rank(g):
    p=g['priorityDimensions']
    risk=sum(p[k] for k in ['POS_CONFLICT','POSSIBLE_POLYSEMY','EXISTING_MASTER_LEMMA','LEGACY_HISTORY'])+int(len(g['normalizedPosCandidates'])!=1)
    levels=['A1','A2','B1','B2','C1','C2']
    evidence=[x['value'] for r in g['sourceEvidence'] for x in r['cefrEvidence']]
    level=min([levels.index(x) for x in evidence if x in levels] or [6])
    return risk,level,sha((SEED+'\n'+g['candidateGroupKey']).encode()),g['candidateGroupKey']


def selection_data():
    groups,authored,old,sources=inputs()
    remaining=sorted((g for g in groups if g['candidateGroupKey'] not in authored),key=lambda g:g['candidateGroupKey'])
    selected=[];used=set()
    pattern=['BOTH','OXFORD','VOCAB','BOTH','OXFORD','VOCAB','BOTH','OXFORD','VOCAB','BOTH']
    poses=['NOUN','VERB','ADJECTIVE','ADVERB']
    for i in range(500):
        avail=sorted((g for g in remaining if category(g)==pattern[i%10] and g['candidateGroupKey'] not in used),key=rank)
        require(avail,'Source balancing pool exhausted')
        best=rank(avail[0])[:2]
        preferred=[g for g in avail if rank(g)[:2]==best and poses[(i//10+i)%4] in g['normalizedPosCandidates']]
        if i>=100 and i%20==19:
            phrases=[g for g in avail if ' ' in g['normalizedHeadword'] and re.fullmatch(r"[a-z]+(?: [a-z]+)+",g['normalizedHeadword'])]
            if phrases:
                preferred=phrases
        g=copy.deepcopy((preferred or avail)[0]);g['authoringOrder']=i+1;g['checkpoint']=i//100+1;g['microBatchWithinCheckpoint']=(i%100)//20+1
        g['selectionRiskScore']=rank(g)[0];g['selectionRiskFlags']=g['reviewFlags']
        selected.append(g);used.add(g['candidateGroupKey'])
    pins={p.relative_to(ROOT).as_posix():sha(p.read_bytes()) for p in [PLAN/'full-master-expansion-candidate-ledger.json',SOURCE/'oxford-normalized-inventory.json',SOURCE/'vocab4600-normalized-inventory.json',PARENT/'cumulative-remediated-effective-draft-projection.json']}
    cohort={'seed':SEED,'algorithm':'source round-robin 200 BOTH/150 OXFORD/150 VOCAB; rank risk then minimum evidenced CEFR then seeded SHA256; POS preference within equal risk/CEFR; twenty multiword slots after first 100 when available','parentFingerprint':PARENT_FP,'remoteBaseline':BASELINE,'inputWorkingSha256':pins,'groups':selected,'coverage':dict(Counter(category(g) for g in selected)),'sourceCefrEvidenceIsNotApprovedClassification':True}
    cohort['fingerprint']=digest(cohort)
    return {'source-group-inventory.json':{'groupCount':len(groups),'groups':groups},'authored-exclusion.json':{'groupCount':len(authored),'candidateGroupKeys':sorted(authored),'parentProjectionSha256':pins[(PARENT/'cumulative-remediated-effective-draft-projection.json').relative_to(ROOT).as_posix()]},'remaining-group-inventory.json':{'groupCount':len(remaining),'groups':remaining},'frozen-cohort.json':cohort}


def frozen():
    expected=selection_data()
    for name,value in expected.items():
        require((WS/'selection'/name).read_bytes()==encode(value),'Frozen selection drift: '+name)
    return expected['frozen-cohort.json']


def ngrams(text,n=8):
    tokens=re.findall(r"[^\W\d_]+",re.sub('<[^>]*>',' ',text).casefold())
    return {tuple(tokens[i:i+n]) for i in range(len(tokens)-n+1)}


def parse_manuscript(data, groups):
    require(b'\r' not in data,'Manuscript must be raw UTF-8 LF')
    rows=[];seen=set();examples=set();byword={g['normalizedHeadword']:g for g in groups}
    for line in data.decode('utf-8').splitlines():
        if not line.strip():continue
        fields=line.split('|');require(len(fields)==10,'PSV requires ten fields')
        word,slug,pos,label,definition,vi,en,ev,grammar,display=fields
        require(word in byword and re.fullmatch('[a-z0-9-]+',slug) and pos in POS,'Unknown group, slug or POS')
        require(pos in byword[word]['normalizedPosCandidates'],'Unsupported source POS')
        require(all(x.strip() for x in fields) and all(not re.search(r'\b(TODO|TBD|placeholder|lorem ipsum)\b',x,re.I) for x in fields),'Empty/placeholder field')
        key='EDITORIAL_2H2K:'+word+':'+slug;example=key+':example-1'
        require(key not in seen and example not in examples,'Duplicate proposal/example key');seen.add(key);examples.add(example)
        content={'senseLabelEn':label,'definitionEn':definition,'meaningVi':vi,'examples':[{'exampleKey':example,'en':en,'vi':ev}],'grammarNotesEn':grammar}
        row={'proposalKey':key,'candidateGroupKey':byword[word]['candidateGroupKey'],'headword':word,'displayFormProposal':display,'partOfSpeech':pos,'content':content,'sourceEvidence':byword[word]['sourceEvidence'],'contentStatus':'DRAFT','rights':RIGHTS,'formalApproval':False,'canonicalIdsAllocated':0,'sourceSenseCoverage':'Selected supported meanings only; no claim of exhaustive dictionary coverage','editorialAuthorship':{'kind':'AI_GENERATED_EDITORIAL_DRAFT','humanAuthor':None,'humanReviewer':None,'process':'Original manuscript composed from source-supported lexical meaning; assembler only reads persisted text'},'riskFlags':byword[word]['reviewFlags']}
        row['fieldHashes']={k:digest(v) for k,v in content.items()};row['effectiveContentHash']=digest({'proposalKey':key,'candidateGroupKey':row['candidateGroupKey'],'headword':word,'partOfSpeechProposal':pos,'content':content});rows.append(row)
    require({r['candidateGroupKey'] for r in rows}=={g['candidateGroupKey'] for g in groups},'Missing frozen group; blocked groups require separate explicit handling')
    return rows


def validate_reviews(rows, data):
    notes={};reviews=[]
    for line in data.decode('utf-8').splitlines():
        if not line.strip():continue
        fields=line.split('|');require(len(fields)==4,'Review requires word, slug, state, substantive rationale')
        word,slug,state,note=fields;key='EDITORIAL_2H2K:'+word+':'+slug
        require(key not in notes and state in {'PASS','REVIEW','FAIL'} and len(note)>=70,'Invalid/duplicate/insubstantial review')
        notes[key]=(state,note)
    require(set(notes)=={r['proposalKey'] for r in rows},'Every Sense needs a content-bound editorial review')
    for r in rows:
        state,note=notes[r['proposalKey']];require(state!='FAIL','FAIL Sense cannot seal')
        reviews.append({'proposalKey':r['proposalKey'],'reviewedContentHash':r['effectiveContentHash'],'reviewedRecordSha256':digest(r),'assessment':state,'reviewExplanationVi':note,'reviewerKind':'AI_SECOND_PASS_EDITORIAL_REVIEW_SAME_ASSISTANT_NOT_HUMAN_OR_SEPARATE_MODEL','dimensions':['MEANING','EN_DEFINITION','VI_SCOPE','EXAMPLE_AGENCY_TENSE_NUMBER_POLARITY','POS_CONSTRUCTION','GRAMMAR','SENSE_BOUNDARY','SOURCE_AGREEMENT','SPECIALIST_SENSITIVITY'],'humanApproval':False})
    return reviews


def copying_checks(rows, sources):
    findings=[]
    for r in rows:
        fields={k:v for k,v in r['content'].items() if isinstance(v,str)}
        fields.update({'exampleEn':r['content']['examples'][0]['en'],'exampleVi':r['content']['examples'][0]['vi']})
        for ref in r['sourceEvidence']:
            source=sources[ref['corpus']][ref['recordIndex']]
            texts=[v for v in source['sourceFields'].values() if isinstance(v,str)]
            for field,text in fields.items():
                for source_text in texts:
                    overlaps=ngrams(text)&ngrams(source_text)
                    require(not overlaps,'Long source copying overlap: '+r['proposalKey']+'/'+field)
                    if text.casefold().strip() in re.sub('<[^>]*>',' ',source_text).casefold() and len(text.split())>=2:
                        findings.append({'proposalKey':r['proposalKey'],'field':field,'kind':'SHORT_CONVENTIONAL_OVERLAP_REQUIRES_RIGHTS_REVIEW','text':text,'sourceRecordId':ref['sourceRecordId']})
    return findings


def cross_source_copying(rows, sources):
    queries={};example_queries={}
    for row in rows:
        content=row['content']
        texts=[v for v in content.values() if isinstance(v,str)]
        texts += [value for example in content['examples'] for k,value in example.items() if k in {'en','vi'}]
        for example in content['examples']:
            normalized=' '.join(re.findall(r"[^\W\d_]+",example['en'].casefold()))
            if len(normalized.split())>=4:example_queries.setdefault(normalized,set()).add(row['proposalKey'])
        for text in texts:
            for gram in ngrams(text):
                queries.setdefault(gram,set()).add(row['proposalKey'])
    hits=[];checked=0
    for corpus,records in sources.items():
        for record in records:
            checked+=1
            for field,value in record['sourceFields'].items():
                if not isinstance(value,str):continue
                # Stream across all source records, not just each group's linked source.
                for gram in ngrams(value).intersection(queries):
                    hits.append({'corpus':corpus,'sourceRecordId':record['sourceRecordId'],'field':field,
                                 'proposalKeys':sorted(queries[gram]),'eightWordOverlap':' '.join(gram)})
            # Short exact English examples are also forbidden, even below eight words.
            values=[v for k,v in record['sourceFields'].items() if isinstance(v,str) and k in {'Example',*[f'Example EN {n}' for n in range(1,8)]}]
            for source_group in record.get('candidateSourceSenseGroups',[]):
                values.extend(example.get('example_en','') for example in source_group.get('sourceExamples',[]))
            for text in values:
                normalized=' '.join(re.findall(r"[^\W\d_]+",re.sub('<[^>]*>',' ',text).casefold()))
                if normalized in example_queries:
                    hits.append({'corpus':corpus,'sourceRecordId':record['sourceRecordId'],
                                 'proposalKeys':sorted(example_queries[normalized]),'exactEnglishExample':normalized})
    require(not hits,'Cross-corpus eight-word copying overlap: '+json.dumps(hits[:3],ensure_ascii=False))
    return {'sourceRecordsScanned':checked,'authoredSenseRecordsScanned':len(rows),'eightWordOverlaps':hits,
            'scope':'All string sourceFields in both complete corpora; heuristic text screen, not rights clearance'}


def apply_post_qa(rows,reviews):
    path=CP/'authored/post-qa-revisions.json'
    if not path.exists():return rows,reviews,[]
    records=copy.deepcopy(rows);bykey={r['proposalKey']:r for r in records};qa=copy.deepcopy(reviews)
    reviewed={r['proposalKey']:r for r in qa};evidence=[];seen=set()
    for revision in load(path)['records']:
        key=revision['proposalKey'];require(key in bykey and key not in seen,'Unknown/duplicate post-QA revision')
        seen.add(key);row=bykey[key]
        require(revision['fieldPointer']=='/content/examples/0/vi' and revision['contentStatus']=='DRAFT'
                and revision['rights']==RIGHTS and revision['reviewState'] in {'PASS','REVIEW'},'Unsupported post-QA revision scope')
        require(row['content']['examples'][0]['vi']==revision['before'],'Post-QA BEFORE mismatch')
        before_hash=row['effectiveContentHash'];before_record=digest(row)
        row['content']['examples'][0]['vi']=revision['after'];require(revision['after'].strip() and len(revision['reviewExplanationVi'])>=70,'Invalid post-QA manuscript/review')
        row['fieldHashes']={k:digest(v) for k,v in row['content'].items()}
        row['effectiveContentHash']=digest({'proposalKey':key,'candidateGroupKey':row['candidateGroupKey'],'headword':row['headword'],'partOfSpeechProposal':row['partOfSpeech'],'content':row['content']})
        reviewed[key].update(reviewedContentHash=row['effectiveContentHash'],reviewedRecordSha256=digest(row),assessment=revision['reviewState'],reviewExplanationVi=revision['reviewExplanationVi'],reviewerKind=revision['reviewerKind'])
        evidence.append({**revision,'parentEffectiveContentHash':before_hash,'parentRecordSha256':before_record,
                         'revisedEffectiveContentHash':row['effectiveContentHash'],'revisedRecordSha256':digest(row),
                         'revisionManuscriptSha256':sha(path.read_bytes()),'beforeFieldSha256':sha(revision['before'].encode()),'afterFieldSha256':sha(revision['after'].encode())})
    return records,qa,evidence


def micro_data(number,cohort):
    groups=cohort['groups'][(number-1)*20:number*20]
    mp=CP/f'authored/micro-{number:02d}.psv';rp=CP/f'reviews/micro-{number:02d}.psv'
    rows=parse_manuscript(mp.read_bytes(),groups);reviews=validate_reviews(rows,rp.read_bytes())
    sources=inputs()[3];findings=copying_checks(rows,sources)
    receipt={'microBatch':number,'selectionFingerprint':cohort['fingerprint'],'parentFingerprint':PARENT_FP,'sourceHash':digest([g['sourceEvidence'] for g in groups]),'manuscriptSha256':sha(mp.read_bytes()),'reviewManuscriptSha256':sha(rp.read_bytes()),'recordHash':digest(rows),'reviewHash':digest(reviews),'groupKeys':[g['candidateGroupKey'] for g in groups],'senseCount':len(rows),'qaCounts':dict(Counter(r['assessment'] for r in reviews)),'sourceSimilarityFindings':findings,'reviewerKind':'AI_SECOND_PASS_EDITORIAL_REVIEW_SAME_ASSISTANT_NOT_HUMAN_OR_SEPARATE_MODEL','status':'SEALED_DRAFT_NOT_APPROVED'}
    receipt['fingerprint']=digest(receipt)
    return rows,reviews,receipt


def build():
    cohort=frozen();old=inputs()[2];new=[];reviews=[];receipts=[]
    for number in range(1,6):
        path=CP/f'micro-{number:02d}-seal.json'
        if not path.exists():
            require(not any((CP/f'micro-{n:02d}-seal.json').exists() for n in range(number+1,6)),'Noncontiguous sealed progress')
            break
        rows,qa,receipt=micro_data(number,cohort);require(path.read_bytes()==encode(receipt),'Sealed manuscript/review drift')
        new+=rows;reviews+=qa;receipts.append(receipt)
    new,reviews,post_qa=apply_post_qa(new,reviews)
    oldkeys={r['proposalKey'] for r in old['records']};newkeys={r['proposalKey'] for r in new}
    require(len(newkeys)==len(new) and oldkeys.isdisjoint(newkeys),'Proposal collision')
    newgroups={r['candidateGroupKey'] for r in new}
    require(newgroups.isdisjoint({r['candidateGroupKey'] for r in old['records']}),'Previously authored overlap')
    counts={'sourceGroups':6143,'previousAuthoredGroups':1020,'previousEffectiveSenses':1563,'selectedCohortGroups':500,'microBatchesCompleted':len(receipts),'newAuthoredGroups':len(newgroups),'newSenses':len(new),'newBlockedGroups':0,'checkpoint01PendingGroups':100-len(newgroups),'cumulativeAuthoredGroups':1020+len(newgroups),'cumulativeEffectiveSenses':1563+len(new),'remainingUnauthoredGroups':5123-len(newgroups),'qaCounts':dict(Counter(r['assessment'] for r in reviews))}
    cross_source=cross_source_copying(new,inputs()[3])
    projection={'contentStatus':'DRAFT','rights':RIGHTS,'parentFingerprint':PARENT_FP,'parentRawSha256':sha((PARENT/'cumulative-remediated-effective-draft-projection.json').read_bytes()),'priorCorrectionsPreserved':40,'inheritedRecordCount':1563,'newRecordCount':len(new),'records':old['records']+new}
    artifacts={'cumulative-effective-draft-projection.json':projection,'new-sense-proposals.json':{'records':new},'editorial-reviews.json':{'records':reviews},'validation-summary.json':{'status':'PASS' if len(receipts)==5 else 'PARTIAL','counts':counts,'sourceSimilarityFindings':[f for r in receipts for f in r['sourceSimilarityFindings']],'crossSourceCopyingScreen':cross_source,'resume':'python -B scripts/phase-2h2k-high-throughput-authoring.py --resume-status','contentStatus':'DRAFT','rights':RIGHTS,'canonicalIdsAllocated':0,'humanApprovals':0,'releaseEligible':False,'databaseAccess':'NONE','databaseWrites':'NONE'}}
    files={n:encode(v) for n,v in artifacts.items()}
    files['post-qa-revision-evidence.json']=encode({'records':post_qa,'sealedManuscriptsUnchanged':True})
    report='# Phase 2H.2K checkpoint 01\n\n'+json.dumps(counts,ensure_ascii=False,sort_keys=True,indent=2)+'\n\nJSON projection is downstream DRAFT; authoritative authored/review PSV manuscripts are immutable once sealed.\nAI review is a separate second pass by the same assistant, not a separate model or human approval.\nSource-supported limited sense coverage, not an exhaustive dictionary. CEFR is source evidence only.\nThe 5,123-group pool contains no remaining meaningful multiword expressions: the only whitespace headword is the source annotation whip (v), not an eligible phrase. The cohort retains zero multiword slots rather than inventing groups or replacing frozen selection.\nCross-corpus eight-word copying screen covers all 9,677 source records. Short conventional gloss overlaps remain explicit rights-review findings, not clearance.\nHistorical diagnostics not rerun: bulk-500 UTF-8 35/35, Windows default two errors; Hybrid v2.2.0 4/5 and v2.2.1 8/8.\nNo database, canonical IDs, owner approvals or release publication. Checkpoint 02 has not started.\n'
    files['report.md']=report.encode()
    manifest={'phase':'2H.2K','checkpoint':1,'selectionFingerprint':cohort['fingerprint'],'parentFingerprint':PARENT_FP,'microBatchFingerprints':[r['fingerprint'] for r in receipts],'counts':counts,'artifactHashes':{n:sha(v) for n,v in sorted(files.items())},'contentStatus':'DRAFT','rights':RIGHTS,'releaseEligible':False}
    manifest['fingerprint']=digest(manifest);files['manifest.json']=encode(manifest)
    return files,manifest


def main():
    p=argparse.ArgumentParser(description=__doc__);mode=p.add_mutually_exclusive_group(required=True)
    mode.add_argument('--freeze',action='store_true');mode.add_argument('--seal',type=int,choices=range(1,6));mode.add_argument('--assemble',action='store_true');mode.add_argument('--check',action='store_true');mode.add_argument('--resume-status',action='store_true');a=p.parse_args()
    if a.freeze:
        require(subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT).decode().strip()==BASELINE,'Freeze baseline drift')
        for name,value in selection_data().items():write_new(WS/'selection'/name,encode(value))
        print('FROZEN',load(WS/'selection/frozen-cohort.json')['fingerprint']);return
    if a.seal:
        cohort=frozen();require(a.seal==1 or (CP/f'micro-{a.seal-1:02d}-seal.json').exists(),'Previous micro-batch not sealed')
        _,_,receipt=micro_data(a.seal,cohort);write_new(CP/f'micro-{a.seal:02d}-seal.json',encode(receipt));print(json.dumps(receipt['qaCounts']));return
    files,m=build()
    if a.resume_status:
        completed=m['counts']['microBatchesCompleted']
        print(json.dumps({'completed':m['counts'],'nextMicroBatch':completed+1 if completed<5 else None,'instruction':'STOP: checkpoint 01 complete; await separate checkpoint 02 authorization' if completed==5 else 'Author and review the next exact frozen 20-group slice, then --seal N; never begin checkpoint 02 automatically'}));return
    target=CP/'assembled'
    if a.check:
        require(target.is_dir() and {p.name for p in target.iterdir()}==set(files),'Unexpected/missing assembled artifact scope')
    for n,b in files.items():
        if a.check:require((target/n).read_bytes()==b,'Deterministic replay drift: '+n)
        else:write_new(target/n,b)
    print(json.dumps({'fingerprint':m['fingerprint'],'counts':m['counts'],'zeroWrites':a.check}))


if __name__=='__main__':main()
