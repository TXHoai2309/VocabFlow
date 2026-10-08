#!/usr/bin/env python3
"""Offline additive DRAFT V2 overlay. No approval, identity or DB capability."""
import argparse
import copy
import hashlib
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('owner_session', ROOT/'scripts/phase-2h2f-owner-session.py')
f = importlib.util.module_from_spec(spec)
spec.loader.exec_module(f)
e = f.e
load, encode, digest, require = e.load, e.encode, e.digest, e.require
WS = ROOT/'vocabflow-dataset/workspaces/master-editorial-draft-v2-session-01'
REPORT = ROOT/'vocabflow-dataset/reports/master-editorial-draft-v2-session-01.md'
F_PIN = 'e99b806bf48de54eec3f9f468b2cbf73f72d52e47709be187990a718fbd260f9'
STATUS = 'DRAFT_V2_OWNER_AUTHORIZED_CORRECTION'
# Exact owner instruction; no alternative prose or inferred approval evidence.
AUTHORIZED = [
    ('relatively', 'comparatively', '2H2D', 'fd113711d3ca42f7a65cb73725629a18ad1627e3df7f30cbd81da23135210498',
     'meaningVi', 'tương đối; so với', 'tương đối (khi so sánh với những điều tương tự)'),
    ('successfully', 'achieve-result', '2H2C', '99646043ac45074b48e9337b63e0c67fc738c9e4952b589c10957fb2d399ba6a',
     'grammarNotesEn', 'Adverb modifies completed action; does not require perfection.',
     'Modifies an action to indicate that it achieves the intended result; success does not imply perfection.'),
    ('fully', 'completely', '2H2C', 'a5be2171ca0f8cf79b3591823016f9560b79bb662711a370844679943981209e',
     'meaningVi', 'đầy đủ hoặc hoàn toàn đến mức cần thiết', 'hoàn toàn; một cách đầy đủ'),
    ('fully', 'completely', '2H2C', 'a5be2171ca0f8cf79b3591823016f9560b79bb662711a370844679943981209e',
     'grammarNotesEn', 'Degree modifier; no promise that understood is objectively verified outside the example.',
     'Degree adverb used with verbs, adjectives, or participles to express completeness or the full relevant extent.'),
]
KEEP = ['formerly', 'hence', 'accidentally', 'why', 'openly', 'always', 'furthermore']
AUTH = {'scope': 'OWNER_INSTRUCTION_IN_CURRENT_CONVERSATION_CREATE_DRAFT_V2_ONLY',
        'exactCorrectionRefs': ['2H2F_SESSION01:relatively:1', '2H2F_SESSION01:successfully:1',
                                '2H2F_SESSION01:fully:1', '2H2F_SESSION01:fully:2'],
        'formalHumanContentApprovalsAdded': 0, 'identityApprovalsAdded': 0, 'rightsClearancesAdded': 0,
        'canonicalIdsAllocated': 0, 'publicationAuthorized': False, 'canonicalAuthorized': False,
        'databaseAccess': 'NONE', 'databaseWrites': 'NONE', 'production': 'UNTOUCHED'}


def apply(records, corrections):
    """Validate the entire batch before cloning, so stale/duplicate input fails closed."""
    require(len(corrections) == 4, 'Exactly four authorized corrections required')
    require([c['correctionRef'] for c in corrections] == AUTH['exactCorrectionRefs'], 'Correction ref/order drift or duplicate application')
    for c, (word, sense, phase, hash_, field, before, after) in zip(corrections, AUTHORIZED):
        key = f'EDITORIAL_{phase}:{word}:{sense}'
        require(c['proposalKey'] == key and c['originalContentHash'] == hash_, 'Original proposal/hash drift')
        require(c['field'] == '/content/'+field and c['before'] == before and c['after'] == after, 'Unauthorized field or BEFORE/AFTER')
        require(key in records and e.revision(records[key]) == hash_, 'Stale original content hash')
        require(e.fields(records[key])[c['field']] == before, 'BEFORE field mismatch')
        require(c['beforeSha256'] == hashlib.sha256(before.encode()).hexdigest() and
                c['afterSha256'] == hashlib.sha256(after.encode()).hexdigest(), 'Field hash drift')
    revised = {}
    for c in corrections:
        key = c['proposalKey']
        r = revised.setdefault(key, copy.deepcopy(records[key]))
        r['content'][c['field'].split('/')[-1]] = c['after']
    for key, r in revised.items():
        prior = records[key]
        old_provenance = {x['field']: x for x in prior.get('reviewFieldProvenance', [])}
        r['reviewFieldProvenance'] = []
        for field, value in e.fields(r).items():
            c = next((x for x in corrections if x['proposalKey'] == key and x['field'] == field), None)
            if not c and field in old_provenance:
                evidence = copy.deepcopy(old_provenance[field])
            else:
                evidence = {'field': field, 'sourceType': 'GENERATED',
                            'sha256Utf8': hashlib.sha256(value.encode()).hexdigest(),
                            'acceptedFieldSha256': hashlib.sha256(e.fields(prior)[field].encode()).hexdigest(),
                            'correctionRef': c['correctionRef'] if c else None, 'humanApproval': 'UNRESOLVED'}
            r['reviewFieldProvenance'].append(evidence)
        require(e.valid_provenance(r), 'Revised field provenance mismatch')
        require({k: v for k, v in r.items() if k not in ['content', 'reviewFieldProvenance']} ==
                {k: v for k, v in prior.items() if k not in ['content', 'reviewFieldProvenance']}, 'Non-content source/identity drift')
    require(len(revised) == 3, 'Exactly three Sense revisions required')
    return revised


def resolve(key, base, revisions):
    """Resolve current draft by exact proposalKey. Never by lemma or canonical ID."""
    require(key in base, 'Unknown proposal key')
    item = next((r for r in revisions if r['proposalKey'] == key), None)
    if item:
        require(e.revision(base[key]) == item['originalContentHash'], 'Stale revision lineage')
        require(e.revision(item['record']) == item['revisedContentHash'], 'Revised hash mismatch')
    return copy.deepcopy(item['record'] if item else base[key])


def accepted_inputs():
    require(f.run(True)['fingerprint'] == F_PIN, 'Accepted Phase 2H.2F fingerprint drift')
    records, _, _, protected = e.inputs()  # QA1 + 2H.2C + 2H.2D effective inventory
    base = {r['proposalKey']: r for r in records}
    preview = load(e.WS/'release-candidate-preview.json')['records']
    require(len(preview) == 40 and all(r['proposalKey'] in base for r in preview), '2H.2E preview scope drift')
    # Preserve 2H.2E preview overlays, including corrections beyond this session.
    for item in preview:
        require(e.revision(item['proposedOverlayContent']) == item['reviewContentHash'], '2H.2E preview hash drift')
        base[item['proposalKey']] = item['proposedOverlayContent']
    return base, protected


def render(base, revised, corrections):
    lines = ['# Phase 2H.2G — DRAFT V2 session 01', '',
             'Owner instruction authorizes exactly four draft edits. No formal human content, identity or rights approval is created.',
             'All records remain DRAFT. Rights: UNKNOWN_REVIEW_REQUIRED. No canonical release or database operation.', '',
             '## Latest content — all 10 reviewed Senses', '']
    for word in f.WORDS:
        key = next(k for k, r in base.items() if r['headword'] == word and k in {x['proposalKey'] for x in load(f.WS/'linguistic-recommendations.json')['records']})
        r = revised.get(key, base[key]); c = r['content']
        lines += ['### '+word, '', 'Proposal: `'+key+'`', '',
                  'Status: '+(STATUS if key in revised else 'DRAFT_UNCHANGED_KEEP_NO_HUMAN_APPROVAL'), '',
                  'POS: '+r['partOfSpeechProposal'], '', 'English definition: '+c['definitionEn'], '',
                  'Vietnamese meaning: '+c['meaningVi'], '', 'Grammar notes: '+c['grammarNotesEn'], '']
        for example in c['examples']:
            lines += ['English example: '+example['en'], '', 'Vietnamese example: '+example['vi'], '']
        lines += ['Original content hash: `'+e.revision(base[key])+'`', '', 'Latest draft hash: `'+e.revision(r)+'`', '']
    lines += ['## Exactly four field changes', '']
    for c in corrections:
        lines += ['### '+c['correctionRef'], '', 'Field: `'+c['field']+'`', '',
                  'BEFORE: '+c['before'], '', 'AFTER: '+c['after'], '']
    lines += ['## Lookup and inheritance', '',
              '813 entries; 810 unchanged; 3 revised. No new Sense/proposal key/ID. The compact preview indexes every effective hash and exact lookup layer.',
              'Load the accepted review-inventory.json (QA1 → 2H.2C → 2H.2D), then replace the 40 keys from 2H.2E release-candidate-preview.json proposedOverlayContent, then apply draft-revisions.json.',
              '`python -B scripts/phase-2h2g-draft-v2.py --lookup EXACT_PROPOSAL_KEY` verifies accepted inputs and resolves a record without writing.',
              '`python -B scripts/phase-2h2g-draft-v2.py --check` replays all generated artifacts offline.', '',
              '## QA and limits', '',
              'The accepted AI assessments were checked against the exact corrected text, definitions and examples. POS and meaning boundaries remain unchanged. Revised provenance hashes are computed for every field.',
              'The existing 2H.2F offline replay recomputes the full pinned two-corpus eight-token scan; proposed hashes and scan results must match these exact revisions. This is not an exhaustive web originality or rights determination.',
              'Human approval pipeline/ledger, source PSV/JSON, original manuscripts and Hybrid 2.2.1 (87 Lexemes / 100 Senses) are untouched. External command results are separate in verification-results.json; generator never claims to run typecheck/lint/tests.',
              'Legacy 2018/history75/exclusions/references are protected by offline pins; no live verification. Production untouched.', '',
              'Next: scale the improved editorial pipeline to the remaining 5,623 headword groups with risk-based QA and separate publication gates. No next approval cycle or canonical/Development materialization begins in this phase.', '']
    return '\n'.join(lines)


def build():
    base, protected = accepted_inputs()
    corrections = load(f.WS/'content-correction-proposals.json')['corrections']
    revised = apply(base, corrections)
    recommendations = load(f.WS/'linguistic-recommendations.json')['records']
    rights = {r['proposalKey']: r for r in load(f.WS/'rights-evidence-assessment.json')['records']}
    revisions = []
    qa = []
    for rec in recommendations:
        key = rec['proposalKey']; r = revised.get(key, base[key])
        require(e.revision(base[key]) == rec['frozenContentHash'], 'Reviewed original hash drift')
        require(e.revision(r) == rec['proposedContentHash'], 'Exact AI corrected revision mismatch')
        changed = [field for field, value in e.fields(r).items() if value != e.fields(base[key])[field]]
        if key in revised:
            revisions.append({'proposalKey': key, 'draftVersion': 2, 'status': STATUS, 'contentStatus': 'DRAFT',
                              'parentLayer': 'ACCEPTED_2H2E_EFFECTIVE_PREVIEW', 'originalContentHash': e.revision(base[key]),
                              'revisedContentHash': e.revision(r), 'correctionRefs': rec['correctionRefs'],
                              'changedFields': changed, 'record': r, 'authorizationScope': AUTH['scope'],
                              'humanContentApproval': 'UNRESOLVED', 'identityApproval': 'UNRESOLVED',
                              'rightsStatus': 'UNKNOWN_REVIEW_REQUIRED', 'publicationEligible': False})
        else:
            require(r['headword'] in KEEP and r == base[key], 'KEEP content changed')
        qa.append({'proposalKey': key, 'headword': r['headword'], 'status': 'AI_QA_PASS_NOT_HUMAN_APPROVAL',
                   'checks': {'exactAuthorizedText': True, 'posPreserved': True, 'sourceEvidencePreserved': True,
                              'definitionsExamplesUnchanged': True, 'provenanceVerified': e.valid_provenance(r)},
                   'meaningAssessmentVi': rec['meaningAssessmentVi'], 'grammarAssessmentVi': rec['grammarAssessmentVi'],
                   'exampleAssessmentVi': rec['exampleAssessmentVi'], 'boundaryAssessmentVi': rec['boundaryAssessmentVi'],
                   'sourceEightTokenFields': rights[key]['proposedEightTokenFields'],
                   'similarityScope': 'RECOMPUTED_ACCEPTED_2H2F_FULL_TWO_CORPUS_SCAN_FOR_EXACT_PROPOSED_HASH',
                   'rightsStatus': 'UNKNOWN_REVIEW_REQUIRED', 'changedFields': changed})
    effective = {key: resolve(key, base, revisions) for key in base}
    require(len(effective) == 813 and sum(e.revision(effective[k]) != e.revision(base[k]) for k in base) == 3, 'Effective coverage drift')
    require(sum(len(x['changedFields']) for x in revisions) == 4, 'Content change scope drift')
    prior_keys = {r['proposalKey'] for r in load(e.WS/'release-candidate-preview.json')['records']}
    mapping = [{'proposalKey': k, 'originalContentHash': e.revision(base[k]), 'effectiveContentHash': e.revision(effective[k]),
                'status': STATUS if k in revised else 'DRAFT_UNCHANGED',
                'lookupLayer': 'DRAFT_V2' if k in revised else '2H2E_PREVIEW' if k in prior_keys else 'ACCEPTED_INVENTORY'} for k in sorted(base)]
    counts = {'effectiveSenses': 813, 'unchangedSenses': 810, 'revisedSenses': 3, 'changedContentFields': 4, 'reviewedKeepUnchanged': 7}
    objects = {'draft-revisions.json': {'schemaVersion': 'OFFLINE_DRAFT_V2_OVERLAY_V1', 'records': revisions},
               'applied-corrections.json': {'authorization': AUTH, 'corrections': corrections, 'applicationStatus': STATUS,
                                          'originalProposalOwnerDecisionUnchanged': 'UNRESOLVED'},
               'effective-draft-preview.json': {'contentStatus': 'DRAFT', 'count': 813, 'records': mapping,
                   'lookupAlgorithm': 'resolve(proposalKey, accepted 813 inventory + 40 2H2E preview replacements, draft-revisions records)',
                   'baseInventory': e.bulk.QUEUE.relative_to(ROOT).as_posix()+'/review-inventory.json',
                   'priorOverlay': e.WS.relative_to(ROOT).as_posix()+'/release-candidate-preview.json',
                   'latestOverlay': 'draft-revisions.json', 'publicationEligible': False},
               'content-hash-mapping.json': {'method': load(e.WS/'owner-decision-schema.json')['contentHashMethod'], 'records': mapping},
               'quality-audit.json': {'records': qa, 'formalHumanReview': False},
               'validation-summary.json': {'status': 'PASS_DRAFT_ONLY', 'counts': counts, 'authorization': AUTH,
                   'originalInputsModified': False, 'masterReleaseChanged': False, 'legacyModified': False,
                   'protectedState': protected, 'accepted2H2EFingerprint': f.PIN, 'accepted2H2FFingerprint': F_PIN,
                   'sourceRightsStatus': 'UNKNOWN_REVIEW_REQUIRED', 'externalChecks': 'Separate verification-results.json; not performed by generator'}}
    report = render(base, revised, corrections)
    objects['manifest.json'] = {'phase': 'PHASE_2H2G_DRAFT_V2_SESSION_01', 'contentStatus': 'DRAFT',
        'accepted2H2EFingerprint': f.PIN, 'accepted2H2FFingerprint': F_PIN,
        'acceptedInputPins': {str(p.relative_to(ROOT)).replace('\\', '/'): f.sha(p) for p in sorted(f.WS.iterdir()) if p.is_file()},
        'fingerprint': digest({'artifacts': objects, 'report': report}), 'files': list(objects), 'report': REPORT.relative_to(ROOT).as_posix()}
    return objects, report


def run(check=False):
    objects, report = build()
    outputs = {**{WS/n: encode(v) for n, v in objects.items()}, REPORT: report}
    # Check the whole existing snapshot before any additive write.
    for path, text in outputs.items():
        if path.exists():
            require(path.read_text(encoding='utf8') == text, 'Refusing overwrite of differing DRAFT V2 artifact '+str(path))
    for path, text in outputs.items():
        if check:
            require(path.exists() and path.read_text(encoding='utf8') == text, 'DRAFT V2 replay drift '+str(path))
        else:
            if path.exists():
                require(path.read_text(encoding='utf8') == text, 'Refusing overwrite of differing DRAFT V2 artifact '+str(path))
            else:
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(text, encoding='utf8', newline='\n')
    return {'fingerprint': objects['manifest.json']['fingerprint'], **objects['validation-summary.json']['counts']}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--lookup')
    args = parser.parse_args()
    if args.lookup:
        run(True)
        base = {r['proposalKey']: r for r in load(e.bulk.QUEUE/'review-inventory.json')['records']}
        for item in load(e.WS/'release-candidate-preview.json')['records']:
            base[item['proposalKey']] = item['proposedOverlayContent']
        print(encode(resolve(args.lookup, base, load(WS/'draft-revisions.json')['records'])))
    else:
        print(encode(run(args.check)))
