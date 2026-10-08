#!/usr/bin/env python3
"""Deterministic noncanonical overlay assembly; no original writer, AI call or DB."""
import argparse
import copy
import hashlib
import importlib.util
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORKSPACE = ROOT / 'vocabflow-dataset/workspaces/master-editorial-quality-corrections'
ORIGINAL = ROOT / 'vocabflow-dataset/workspaces/master-editorial-draft-pilot'
REPORT = ROOT / 'vocabflow-dataset/reports/master-editorial-quality-corrections.md'
BASELINE = '8eca81e84d896fd0449aed04ce646465d4dd4b9b'
INPUT_FP = 'a42e4c25cebdf98cdd24f9e9231be81fff36bbdd571496eeff2886b4d1f1bdad'
SPEC = importlib.util.spec_from_file_location('draft2b', ROOT/'scripts/phase-2h2b-editorial-draft.py')
draft = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(draft)
digest, require = draft.digest, draft.require


def load(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))


def byte_hash(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def get_field(record, pointer):
    value = record
    for part in pointer.strip('/').split('/'):
        value = value[int(part)] if isinstance(value, list) else value[part]
    return value


def set_field(record, pointer, value):
    allowed = set(draft.content_fields(record)) | {'/partOfSpeechProposal'}
    require(pointer in allowed, 'Unauthorized overlay field: '+pointer)
    require(isinstance(value, str) and value.strip(), 'Empty/nontext overlay')
    parts = pointer.strip('/').split('/')
    parent = record
    for part in parts[:-1]:
        parent = parent[int(part)] if isinstance(parent, list) else parent[part]
    parent[int(parts[-1]) if isinstance(parent, list) else parts[-1]] = value


def inputs():
    pins = load(WORKSPACE/'review-intake/original-file-pins.json')
    require(len(pins) == 16, 'Original byte-pin inventory incomplete')
    for pin in pins:
        require(byte_hash(ROOT/pin['path']) == pin['sha256'], 'Original byte drift: '+pin['path'])
    manifest = load(ORIGINAL/'manifest.json')
    artifacts = {name: load(ORIGINAL/name) for name in manifest['files']}
    require(manifest['fingerprint'] == digest(artifacts) == INPUT_FP, 'Original fingerprint drift')
    require(all(digest(artifacts[n]) == h for n, h in manifest['artifactHashes'].items()), 'Original artifact drift')
    require(manifest['inputPins']['phase2h2aFingerprint'] == draft.PHASE2A, 'Phase 2H.2A pin drift')
    require(manifest['inputPins']['phase2h1Fingerprint'] == '58928e98845e326f8d9a268aa160c867443e8497436d9c58fa2b9a5647f10a53', 'Phase 2H.1 pin drift')
    groups, sources, _, _, _ = draft.inputs()  # Read-only accepted upstream safety checks.
    authored = load(WORKSPACE/'authored-correction-proposals.json')
    require(authored['sourceType'] == 'GENERATED' and authored['ownerDecision'] == 'UNRESOLVED', 'Correction approval/provenance drift')
    require(not any(authored.get(k) for k in ['humanAuthor', 'humanReviewer', 'license']), 'Invented authorship/rights')
    request = (WORKSPACE/'review-intake/qa1-request.txt').read_text(encoding='utf-8-sig')
    findings = authored['findings']
    require(len(findings) == len({f['proposalKey'] for f in findings}) == 22, 'Finding accounting failure')
    require([f['number'] for f in findings] == list(range(1, 23)), 'Finding order drift')
    require(Counter(f['triage'] for f in findings) == {'REVISE': 17, 'REVIEW_IDENTITY': 4, 'KEEP': 1}, 'Triage drift')
    by_key = {s['proposalKey']: s for s in artifacts['pilot-sense-proposals.json']['senseProposals']}
    require(len(by_key) == 155, 'Original Sense count drift')
    for f in findings:
        require(f['proposalKey'] in by_key and f['proposalKey'] in request, 'Finding not grounded in prompt/original')
        require(bool(f['changes']) == (f['triage'] == 'REVISE'), 'Incorrect overlay/identity handling')
    return artifacts, authored, groups, sources, pins


def scaling_plan():
    return {
        'readiness': 'CONDITIONAL', 'fullCorpusAuthoringStarted': False,
        'populationGroups': 6143, 'pilotBias': '73/100 pilot groups start with a; convenience pilot is not a statistically representative sample',
        'automatable': ['Unique keys and traceable hashes/refs', 'Paired field presence and provenance', 'POS enum and valency-pattern signals', 'Exact/near duplicate and full-source ngram screens', 'Numbers/participants/negation review signals', 'CEFR evidence conflicts; no default A1', 'Immutable identity/release and exclusion guards'],
        'editorialJudgment': ['Meaning boundaries and lexicalization', 'Sense/example POS and valency', 'Natural English and faithful Vietnamese', 'Specialized scientific/medical wording', 'Rights and identity decisions'],
        'mandatoryExplicitIdentityReview': ['Any Master overlap or owner-excluded pair', 'Any history-linked runtime identity', 'Polysemy, merge/split/coalescence', 'Plural-only forms, aliases, constructions, phrasal/semi-modal units', 'POS ambiguity or unsupported NUMBER mapping'],
        'nextBatch': {'proposedGroups': 120, 'status': 'PLAN_ONLY_REQUIRES_SEPARATE_AUTHORIZATION',
            'selection': 'Exclude current pilot; select 20 each from b-d, e-h, i-m, n-r, s-v, w-z. Within source/POS/CEFR/risk strata rank by SHA256 of the fixed seed QA1_STRATIFIED_EXTENSION_120 plus candidateGroupKey; rotate quota-first selections with stable deduplication, key tie-break and hash-ranked fill. Never select first-n alphabetically within a bucket.',
            'quotas': 'Within 120: at least 20 Oxford-only, 20 4600-only, 40 overlap; each primary POS at least 15 noun/verb/adjective/adverb; at least 20 polysemy, 10 multiword, 10 POS conflicts, 10 CEFR conflicts, 10 Master overlaps and 10 history dependencies where remaining inventory supports quotas. CEFR A1-C1 and unclassified/conflict all represented. Quotas overlap; infeasible quotas reported, not fabricated.',
            'sizePolicy': 'At most 20 groups per batch; at most 10 for identity-heavy groups, at most 5 for subject-sensitive or highly polysemous groups; no cap on supported Sense count',
            'sampling': 'All high-risk content/identities receive explicit editorial review. For evidence-complete low-risk drafts, audit at least 10 per batch and 20 percent, whichever is larger; deterministic hash-rank selection including each POS/source/CEFR stratum. Sampling controls draft QA effort only, never grants rights, identity or content approval.',
            'escalation': 'Any critical wrong-meaning, identity or rights defect triggers 100 percent review of the affected stratum; two substantive translation/grammar defects in a batch trigger full batch review. Stop promotion until root cause corrected and owner reviews evidence.'},
        'goNoGoGates': ['Owner dispositions on these 22 findings and sensitive/identity cases', 'Rights basis and original/generated provenance per field', 'Approved POS/lexical-unit convention and correction contract', 'Stratified extension selection validated before drafting', 'Separate full-corpus drafting and later canonical/release permissions'],
        'rightsProvenance': 'Source decks remain UNKNOWN_REVIEW_REQUIRED; record GENERATED drafting and immutable field hashes, external verification URLs separately, actual human review only when performed. Sampling cannot clear source rights. No APKG/media promotion.'
    }


def build():
    original, authored, groups, sources, byte_pins = inputs()
    original_senses = original['pilot-sense-proposals.json']['senseProposals']
    by_key = {s['proposalKey']: s for s in original_senses}
    by_group = {g['candidateGroupKey']: g for g in groups}
    require(sum(g['normalizedHeadword'].startswith('a') for g in groups) == 73, 'Pilot alphabetic-bias count drift')
    finding_by_key = {f['proposalKey']: f for f in authored['findings']}
    dispositions, overlays, identities, preview, audits = [], [], [], [], []
    for f in authored['findings']:
        s = by_key[f['proposalKey']]
        before = {p: get_field(s, p) for p in f['changes']}
        after = copy.deepcopy(s)
        for p, value in f['changes'].items():
            require(get_field(s, p) != value, 'No-op correction field')
            set_field(after, p, value)
        disposition = {**copy.deepcopy(f), 'findingRef': 'QA1_PROMPT_SECTION_5:'+str(f['number']),
            'reviewEvidenceType': 'AI_REVIEW_RECOMMENDATION_FROM_USER_PROMPT; NOT_HUMAN_APPROVAL',
            'originalValues': before, 'proposedValues': f['changes'], 'ownerDecision': 'UNRESOLVED',
            'translationExampleImpact': 'All six POS/label/definition/meaning/example-pair fields re-evaluated together by AI; changed pairs listed in overlay; human equivalence/naturalness verification pending',
            'otherSensesImpact': 'Sibling keys/content untouched; boundary effects remain explicit blockers',
            'remainingUnresolvedFields': ['Human linguistic verification', 'Lexeme/Sense identity', 'Sense-specific CEFR', 'Rights and publication permission']}
        dispositions.append(disposition)
        if f['changes']:
            overlays.append({'proposalKey': f['proposalKey'], 'findingRef': disposition['findingRef'],
                'originalDraftCanonicalHash': digest(s), 'originalValues': before, 'proposedValues': f['changes'],
                'changeReasons': {p: f['semanticRationale']+' '+f['grammaticalRationale'] for p in f['changes']},
                'coupledReview': {p: {'before': get_field(s, p), 'after': get_field(after, p), 'review': 'AI_REEVALUATED_HUMAN_PENDING'} for p in ['/partOfSpeechProposal', '/content/senseLabelEn', '/content/definitionEn', '/content/meaningVi', '/content/examples/0/en', '/content/examples/0/vi']},
                'authorship': {'sourceType': 'GENERATED', 'process': authored['process'], 'humanAuthor': None, 'humanReviewer': None, 'license': None, 'reviewDate': None},
                'ownerDecision': 'UNRESOLVED'})
        if f['identityBlockers']:
            identities.append({'proposalKey': f['proposalKey'], 'findingRef': disposition['findingRef'],
                'representationProposal': f.get('representationProposal', {'partOfSpeechProposal': after['partOfSpeechProposal'], 'lexicalUnitType': 'USE_ORIGINAL_LOCAL_GROUP_PROPOSAL_PENDING_OWNER'}),
                'blockers': f['identityBlockers'], 'rationale': f['grammaticalRationale'], 'identityClaim': 'NONE',
                'structureChangeExecuted': False, 'ownerDecision': 'UNRESOLVED'})
    for s in original_senses:
        p = copy.deepcopy(s)
        f = finding_by_key.get(s['proposalKey'])
        changes = f['changes'] if f else {}
        for path, value in changes.items():
            set_field(p, path, value)
            if path in draft.content_fields(p):
                p['fieldAuthorship'][path] = {'sourceType': 'GENERATED', 'process': authored['process'],
                    'textHash': hashlib.sha256(value.encode('utf8')).hexdigest(), 'humanAuthor': None,
                    'humanReviewer': None, 'reviewDate': None, 'license': None, 'rightsDecision': 'PENDING'}
        p['originalProposalReference'] = {'artifact': 'master-editorial-draft-pilot/pilot-sense-proposals.json', 'proposalKey': s['proposalKey'], 'canonicalHash': digest(s)}
        p['correctionAppliedInPreview'] = 'YES' if changes else 'NO'
        p['correctionHistory'] = [{'findingRef': 'QA1_PROMPT_SECTION_5:'+str(f['number']), 'disposition': f['disposition'], 'changedFields': sorted(changes)}] if f else []
        p['identityBlockers'] = (f['identityBlockers'] if f else []) + ['LEXEME_AND_SENSE_IDENTITY_OWNER_REVIEW']
        p['issueFlags'] = ['HUMAN_CONTENT_QA_PENDING', 'SOURCE_RIGHTS_UNKNOWN', 'CEFR_NOT_VERIFIED']
        p['classificationReassessment'] = {'required': bool(changes), 'status': 'UNRESOLVED', 'evidenceUnchanged': True, 'rationale': 'Changed wording/POS is not permission to verify or retag the original headword-level CEFR candidate'}
        p['masterComparisonScope'] = 'PINNED_ORIGINAL_COMPARISON_ONLY; revised meaning requires fresh owner comparison; no reuse claim'
        p['qualityReviewStatus'] = 'REVIEW'
        preview.append(p)
    exact, grams = draft.source_passages(groups, sources)
    example_counts = Counter(' '.join(draft.words(e['en'])) for p in preview for e in p['content']['examples'])
    for p in preview:
        siblings = [' '.join(draft.words(q['content']['definitionEn'])) for q in preview if q['candidateGroupKey'] == p['candidateGroupKey']]
        raw = draft.qa(p, by_group[p['candidateGroupKey']], exact, grams, siblings, example_counts)
        resolutions = []
        if p['proposalKey'] == 'EDITORIAL_2H2B:attorney:lawyer':
            f = finding_by_key[p['proposalKey']]
            require(p['content'] == by_key[p['proposalKey']]['content'], 'False-positive exemption cannot cover changed text')
            resolutions = [{'code': f['rejectedQaCode'], 'disposition': f['disposition'], 'rationale': f['semanticRationale']+' '+f['grammaticalRationale'],
                'scope': 'EXACT_ORIGINAL_PAIR_ONLY', 'reviewType': 'AI_EDITORIAL; HUMAN_PENDING', 'ownerDecision': 'UNRESOLVED'}]
        effective = [flag for flag in raw['findings'] if not any(flag['code'] == r['code'] for r in resolutions)]
        audits.append({**raw, 'rawFindings': raw['findings'], 'findings': effective, 'scopedResolutions': resolutions,
            'status': 'FAIL' if any(f['severity']=='FAIL' for f in effective) else 'REVIEW', 'ownerDecision': 'UNRESOLVED'})
    require({p['proposalKey'] for p in preview} == set(by_key) and len(preview) == 155, 'Preview identity accounting failure')
    require(len({p['candidateGroupKey'] for p in preview}) == 100, 'Group accounting failure')
    field_counts = {name: sum(path in f['changes'] for f in authored['findings']) for name, path in [
        ('englishDefinitionsUpdated','/content/definitionEn'), ('englishExamplesUpdated','/content/examples/0/en'),
        ('vietnameseMeaningsUpdated','/content/meaningVi'), ('vietnameseExampleTranslationsUpdated','/content/examples/0/vi'), ('posProposalsUpdated','/partOfSpeechProposal')]}
    counts = {'totalFindings': 22, 'reviseFindingsResolvedAsProposals': len(overlays), 'identityFindingsReviewed': 4,
        'falsePositivesRejected': 1, 'dispositions': dict(Counter(d['disposition'] for d in dispositions)),
        'senseKeysPreserved': len(preview), 'pilotGroupsPreserved': 100, 'multiSenseGroups': sum(n>1 for n in Counter(p['candidateGroupKey'] for p in preview).values()),
        'correctedPreviewCount': len(preview), 'textRevisedDrafts': len(overlays), 'textUnchangedDrafts': len(preview)-len(overlays),
        'triageRetainedWithoutRevision': 134, 'identityCaseDraftsRetained': 4, **field_counts,
        'identityDecisionsPending': 155, 'explicitIdentityIssueRecords': len(identities), 'ownerApproved': 0, 'canonicalIdsAllocated': 0,
        'qualityCounts': dict(Counter(a['status'] for a in audits)), 'sourceSimilaritySignals': sum(f['code']=='SOURCE_TEXT_SIMILARITY' for a in audits for f in a['findings'])}
    for p in preview:
        require(p['ownerDecision'] == p['identityDecision'] == 'UNRESOLVED' and not p['publicationEligible'] and p['canonicalIdsAllocated'] == 0, 'Unauthorized preview approval')
        require(p['sourceRights'] == draft.RIGHTS and p['existingMasterComparison'] == by_key[p['proposalKey']]['existingMasterComparison'], 'Rights/Master drift')
        require(p['sourceEvidenceReferences'] == by_key[p['proposalKey']]['sourceEvidenceReferences'] and p['classificationProposal'] == by_key[p['proposalKey']]['classificationProposal'], 'Evidence/classification drift')
    pins = {'gitReconciliationParent': BASELINE, 'acceptedSourceBaseline': draft.BASELINE, 'phase2h2bFingerprint': INPUT_FP,
        'upstreamPins': original['pilot-sense-proposals.json']['inputPins'], 'originalBytePins': byte_pins,
        'authoredCorrectionByteHash': byte_hash(WORKSPACE/'authored-correction-proposals.json'),
        'promptByteHash': byte_hash(WORKSPACE/'review-intake/qa1-request.txt'), 'originalPinInventoryByteHash': byte_hash(WORKSPACE/'review-intake/original-file-pins.json')}
    def wrap(payload):
        return {'phase': '2H.2B-QA1', 'artifactType': 'NONCANONICAL_EDITORIAL_CORRECTION_PROPOSAL', 'inputPins': pins, 'authorization': draft.AUTH, **payload}
    output = {
        'independent-review-intake.json': wrap({'sourceMode': 'PROMPT_SECTION_5_FALLBACK', 'reviewFilesLoaded': [], 'unavailableFiles': ['vocabflow-2h2b-review-findings.json','vocabflow-2h2b-review-155-senses.md'], 'searchScope': 'D:/hoctienganh and task attachments including hidden/ignored paths', 'promptReference': 'review-intake/qa1-request.txt#section-5', 'evidenceType': 'AI_REVIEW_FINDINGS_RELAYED_IN_USER_REQUEST; NOT_OWNER_APPROVAL', 'findings': [{'findingRef': 'QA1_PROMPT_SECTION_5:'+str(f['number']), 'proposalKey': f['proposalKey'], 'triage': f['triage']} for f in authored['findings']]}),
        'finding-dispositions.json': wrap({'findings': dispositions}), 'content-correction-overlays.json': wrap({'overlays': overlays}),
        'sense-identity-review.json': wrap({'cases': identities, 'fourMandatoryIdentityKeys': [f['proposalKey'] for f in authored['findings'] if f['triage']=='REVIEW_IDENTITY'], 'structureChangesExecuted': 0}),
        'corrected-pilot-preview.json': wrap({'senseProposals': preview}),
        'correction-quality-audit.json': wrap({'summary': counts, 'scope': 'Structural and heuristic signals plus AI correction screening; never human editorial approval', 'senseAudits': audits}),
        'full-corpus-scaling-readiness.json': wrap(scaling_plan()),
        'validation-summary.json': wrap({'status': 'PASS' if not counts['qualityCounts'].get('FAIL',0) else 'FAIL', 'statusScope': 'ASSEMBLY_AND_STRUCTURAL_CHECKS_ONLY', 'counts': counts, 'databaseAccess': 'NONE', 'databaseWrites': 'NONE', 'production': 'UNTOUCHED', 'externalVerification': {'status': 'NOT_EXECUTED_BY_GENERATOR', 'evidenceLocation': 'docs/ai-progress.md#phase-2h2b-qa1-editorial-corrections-2026-10-08'}})}
    fingerprint = digest(output)
    output['manifest.json'] = wrap({'fingerprint': fingerprint, 'fingerprintMethod': 'SHA256_SORTED_COMPACT_UTF8_JSON_OUTPUTS_EXCLUDING_MANIFEST; PERSISTED_CORRECTION_AND_INTAKE_HASHES_INCLUDED', 'files': sorted(output), 'artifactHashes': {k:digest(v) for k,v in sorted(output.items())}, 'replay': 'Read persisted original and corrections, never regenerate prose or write original files'})
    return output, report_text(dispositions, by_key, preview, counts, fingerprint), fingerprint


def report_text(dispositions, originals, preview, counts, fingerprint):
    by_key = {p['proposalKey']: p for p in preview}
    lines = ['# Phase 2H.2B-QA1 - editorial corrections', '', 'EDITORIAL CORRECTIONS PROPOSED - OWNER REVIEW PENDING. No human approval, canonical identity, rights clearance or materialization.', '',
        'Remote parent: `'+BASELINE+'`. Original input: `'+INPUT_FP+'`. Correction fingerprint: `'+fingerprint+'`.', '',
        'The two independent review files were not located in the workspace/task attachments. Intake uses the complete 22 findings in the preserved user request, Section 5; no unavailable review file or full independent review was claimed as loaded. AI assistant examined exact original keys and sibling context, persisted proposals once, and assembled a read-only original + overlay preview. Five original PSV files, original artifacts and fingerprint are unchanged.', '',
        '## Accounting and limitations', '', '```json', json.dumps(counts, ensure_ascii=False, indent=2), '```', '',
        '17 drafts change in preview, 4 identity-case drafts retain text, and 134 other drafts are retained, including attorney. All 155 are REVIEW, not approved. No Sense key, group or permanent identity changes. CEFR evidence is unchanged and re-evaluation pending for corrected meanings/POS. Existing Master comparisons are pinned original evidence, not revalidated identity proof. No raw APKG prose/media is copied into this correction report.', '',
        '## Side-by-side content proposals - 17 findings', '']
    fields = [('POS','/partOfSpeechProposal'),('Sense label','/content/senseLabelEn'),('Definition EN','/content/definitionEn'),('Meaning VI','/content/meaningVi'),('Example EN','/content/examples/0/en'),('Example VI','/content/examples/0/vi')]
    for f in dispositions:
        if f['triage'] != 'REVISE': continue
        key=f['proposalKey']; before=originals[key]; after=by_key[key]
        lines += ['### Finding '+str(f['number'])+' - '+key, '', 'Disposition: '+f['disposition']+'. Owner decision: UNRESOLVED.', '', '**BEFORE**', '']
        for label,path in fields: lines += ['- '+label+': '+get_field(before,path)]
        lines += ['', '**AFTER (PROPOSED)**', '']
        for label,path in fields: lines += ['- '+label+': '+get_field(after,path)]
        lines += ['', 'Changed fields: '+', '.join('`'+p+'`' for p in f['changes'])+'.', '', 'Semantic reason: '+f['semanticRationale'], '', 'Grammar / representation: '+f['grammaticalRationale'], '', 'Translation/example impact: '+f['translationExampleImpact'], '', 'Other Senses: '+f['otherSensesImpact'], '', 'Remaining risks: '+', '.join(f['identityBlockers']+f['remainingUnresolvedFields'])+'. AI reviewer confidence: '+f['confidence']+'.', '']
        if '/content/grammarNotesEn' in f['changes']: lines += ['Proposed usage note: '+after['content']['grammarNotesEn'], '']
        for source in f.get('verificationSources',[]): lines += ['Verification: ['+source['evidence']+']('+source['url']+'). No text-reuse license inferred.', '']
    lines += ['## Four mandatory identity reviews - no permanent change', '']
    for f in dispositions:
        if f['triage'] != 'REVIEW_IDENTITY': continue
        s=originals[f['proposalKey']]; c=s['content']
        lines += ['### '+f['proposalKey'], '', 'Disposition: DEFER_IDENTITY_DECISION. Owner UNRESOLVED. Text retained.', '',
            'Current '+s['partOfSpeechProposal']+': '+c['definitionEn']+' / '+c['meaningVi'], '',
            'Example: '+c['examples'][0]['en']+' / '+c['examples'][0]['vi'], '',
            'Proposed representation: `'+json.dumps(f['representationProposal'],ensure_ascii=False,sort_keys=True)+'`.', '',
            f['semanticRationale'], '', f['grammaticalRationale'], '', 'Open decisions: '+', '.join(f['identityBlockers'])+'.', '']
    keep=next(f for f in dispositions if f['triage']=='KEEP'); c=originals[keep['proposalKey']]['content']
    lines += ['## Attorney - scoped false-positive rejection', '', keep['disposition']+'. Original English: '+c['examples'][0]['en'], '', 'Original Vietnamese: '+c['examples'][0]['vi'], '', keep['semanticRationale'], '', keep['grammaticalRationale'], '',
        'Raw warning is retained in audit history; effective review excludes this one warning for this unchanged pair. All other QA/rights/CEFR findings remain. This AI review disposition is not human acceptance.', '',
        '## Assessment of all 155 drafts', '',
        'Content: paired original/new values and field hashes make the 17 corrections auditable; naturalness and semantic precision still need owner evaluation. The preview retains all 155 keys, 100 groups, 37 multi-Sense groups and complete bilingual content. Automated duplicate/copy/format signals cover every preview entry.', '',
        'Identity: all 155 decisions remain unresolved, with four mandatory reviewed representation cases plus article/forms, plural arms, construction and meaning-boundary blockers. No split/merge/reuse was executed; #11/history exclusions cannot be reversed by new wording.', '',
        'Classification: no automatic verified CEFR, no default A1 and no inferred school/age/exam classification. Source disagreements remain visible. Rights/provenance: GENERATED correction authorship, no human author/reviewer/license fabricated; source rights UNKNOWN_REVIEW_REQUIRED. Source verification: prompt findings substitute for unavailable AI files; pinned deck evidence and limited external fact/POS checks do not establish permissions or final linguistic truth.', '',
        '## Scaling readiness - CONDITIONAL, plan only', '']
    plan=scaling_plan()
    lines += [plan['pilotBias']+'.', '', 'Next: propose 120 new groups, 20 from each b-d/e-h/i-m/n-r/s-v/w-z bucket. Use source/POS/CEFR and polysemy/conflict/Master/history strata, SHA256 ranking with fixed seed QA1_STRATIFIED_EXTENSION_120 plus candidateGroupKey, stable key tie-breaks and deduplication. Do not choose first-n alphabetically within buckets. Report unmet quotas instead of inventing examples or identities.', '',
        'Automate traceability, completeness, copy/duplicate signals, allowed POS, paired-field quantities/negation signals and immutable identity/rights guards. Human judgment is required for meaning/valency, constructions, bilingual naturalness, specialist terminology, identity and rights.', '',
        plan['nextBatch']['sizePolicy']+'.', '', plan['nextBatch']['sampling'], '', plan['nextBatch']['escalation'], '',
        'Explicit identity review always covers '+', '.join(plan['mandatoryExplicitIdentityReview'])+'.', '',
        'Gates: '+', '.join(plan['goNoGoGates'])+'. No full-corpus authoring has begun.', '',
        '## Verification and protected state', '',
        'Generator validates deterministic assembly only. External commands/exits: [handoff](../../docs/ai-progress.md#phase-2h2b-qa1-editorial-corrections-2026-10-08). Replay: `python -B scripts/phase-2h2b-qa1-corrections.py --check`.', '',
        'Hybrid 2.2.1, 87 Lexemes/100 Senses, exact accepted release hash/tree remain unchanged. Legacy 2018, history 75, #11/#284/#295/#849 and owner exclusions remain pinned, without live DB checks. Database access/writes NONE/NONE; Production UNTOUCHED. No staging, commit/push, canonical Master authoring, Development import or legacy cleanup.', '']
    return '\n'.join(lines)


def run(check=False):
    output, report, fingerprint = build()
    expected = {WORKSPACE/name: json.dumps(value,ensure_ascii=False,indent=2)+'\n' for name,value in output.items()}
    expected[REPORT] = report
    if check:
        require(all(p.is_file() and p.read_text(encoding='utf8')==text for p,text in expected.items()), 'Correction replay drift')
    else:
        for path,text in expected.items():
            path.parent.mkdir(parents=True,exist_ok=True)
            if not path.is_file() or path.read_text(encoding='utf8')!=text: path.write_text(text,encoding='utf8',newline='\n')
    return {'status':output['validation-summary.json']['status'],'fingerprint':fingerprint,'counts':output['validation-summary.json']['counts'],'artifactComparison':'PASS' if check else 'NOT_EXECUTED','databaseAccess':'NONE','databaseWrites':'NONE','production':'UNTOUCHED'}


if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check',action='store_true')
    result=run(parser.parse_args().check)
    print(json.dumps(result,indent=2))
    raise SystemExit(0 if result['status']=='PASS' else 1)
