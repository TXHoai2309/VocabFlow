#!/usr/bin/env python3
"""Offline selection and assembly of persisted proposals. Never generates prose."""
from __future__ import annotations
import argparse
import hashlib
import importlib.util
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WS = ROOT / 'vocabflow-dataset/workspaces/master-editorial-stratified-120'
REPORT = ROOT / 'vocabflow-dataset/reports/master-editorial-stratified-120.md'
SEED = 'QA1_STRATIFIED_EXTENSION_120'
BASELINE = '6c06e99ae8f40020d826c7aa140b4da1a107a6c2'
BUCKETS = {'b-d': 'bcd', 'e-h': 'efgh', 'i-m': 'ijklm', 'n-r': 'nopqr', 's-v': 'stuv', 'w-z': 'wxyz'}
PINS = {'phase2h1': '58928e98845e326f8d9a268aa160c867443e8497436d9c58fa2b9a5647f10a53',
        'phase2h2a': '5b754405d9072e79b603e6b008bd8788a7dae7aed4f2eedde3087482fc0bc7ff',
        'phase2h2b': 'a42e4c25cebdf98cdd24f9e9231be81fff36bbdd571496eeff2886b4d1f1bdad',
        'qa1': 'b75b0522e64db5d61cff4adbccd2fb553c72f5d475d6e4370b2075e656b6a40d'}
spec = importlib.util.spec_from_file_location('pilot2b', ROOT/'scripts/phase-2h2b-editorial-draft.py')
pilot = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pilot)
digest, require, load = pilot.digest, pilot.require, pilot.load
RIGHTS = pilot.RIGHTS
AUTH = dict(pilot.AUTH)
QUOTAS = {'OXFORD_ONLY': 20, 'VOCAB4600_ONLY': 20, 'BOTH': 40,
          **{pos: 15 for pos in ['NOUN', 'VERB', 'ADJECTIVE', 'ADVERB']},
          'POSSIBLE_POLYSEMY': 20, 'MULTIWORD_PHRASAL': 10, 'POS_CONFLICT': 10,
          'CEFR_CONFLICT': 10, 'EXISTING_MASTER_LEMMA': 10, 'LEGACY_HISTORY': 10,
          **{f'CEFR_{x}': 1 for x in ['A1', 'A2', 'B1', 'B2', 'C1', 'MISSING']}}


def sha_bytes(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def inputs():
    _, sources, master, previous, protected = pilot.inputs()
    for folder, expected in [('master-editorial-draft-pilot', PINS['phase2h2b']),
                             ('master-editorial-quality-corrections', PINS['qa1'])]:
        path = ROOT/'vocabflow-dataset/workspaces'/folder
        manifest = load(path/'manifest.json')
        artifacts = {n: load(path/n) for n in manifest['files']}
        require(manifest['fingerprint'] == digest(artifacts) == expected, 'Accepted editorial fingerprint drift')
    pins = load(ROOT/'vocabflow-dataset/workspaces/master-editorial-quality-corrections/review-intake/original-file-pins.json')
    require(all(sha_bytes(ROOT/r['path']) == r['sha256'] for r in pins), 'Original 16 byte pins drift')
    return previous['full-master-expansion-candidate-ledger.json']['groups'], sources, master, protected, previous['pilot-cohort.json']['groups']


def bucket(group):
    return next((b for b, letters in BUCKETS.items() if group['normalizedHeadword'][0] in letters), None)


def signals(group):
    flags = {k for k, v in group['priorityDimensions'].items() if v}
    flags.update(set(group['normalizedPosCandidates']) & set(pilot.POS))
    if len(group['sourceMembership']) == 2:
        flags.add('BOTH')
    bands = {e['value'] for ref in group['sourceEvidence'] for e in ref['cefrEvidence']}
    flags.update('CEFR_'+v for v in bands)
    if not bands:
        flags.add('CEFR_MISSING')
    return flags


def rank(group):
    key = group['candidateGroupKey']
    return hashlib.sha256((SEED+'\n'+key).encode()).hexdigest(), key


def quotas(groups):
    return Counter(v for g in groups for v in signals(g))


def select(ledger, prior):
    excluded = {g['candidateGroupKey'] for g in prior}
    pool = sorted([g for g in ledger if bucket(g) and g['candidateGroupKey'] not in excluded], key=rank)
    capacity = quotas(pool)
    require(all(sum(bucket(g) == b for g in pool) >= 20 for b in BUCKETS), 'Alphabet bucket capacity insufficient')
    chosen, reasons = [], {}
    # Rotate quota-first admissions, scarce strata first. All admission choices
    # are hash-ranked with key tie-break, never alphabetical first-N.
    order = sorted(QUOTAS, key=lambda q: (capacity[q]/QUOTAS[q], q))
    while True:
        changed = False
        achieved = quotas(chosen)
        used = Counter(bucket(g) for g in chosen)
        for q in order:
            if achieved[q] >= min(QUOTAS[q], capacity[q]):
                continue
            eligible = [g for g in pool if g['candidateGroupKey'] not in reasons and used[bucket(g)] < 20 and q in signals(g)]
            if not eligible:
                continue
            g = eligible[0]
            chosen.append(g)
            reasons[g['candidateGroupKey']] = 'QUOTA_ROTATION:'+q
            used[bucket(g)] += 1
            achieved.update(signals(g))
            changed = True
        if not changed:
            break
    for b in BUCKETS:
        for g in pool:
            if bucket(g) == b and g['candidateGroupKey'] not in reasons and sum(bucket(x) == b for x in chosen) < 20:
                chosen.append(g)
                reasons[g['candidateGroupKey']] = 'HASH_RANKED_BUCKET_FILL'
    # Deterministic within-bucket swaps can improve unmet quotas without
    # reducing another quota below its current satisfied floor.
    for _ in range(120):
        achieved = quotas(chosen)
        deficits = [q for q in order if achieved[q] < min(QUOTAS[q], capacity[q])]
        swapped = False
        for q in deficits:
            for add in pool:
                if add['candidateGroupKey'] in reasons or q not in signals(add):
                    continue
                for remove in sorted(chosen, key=rank, reverse=True):
                    if bucket(add) != bucket(remove):
                        continue
                    new_counts = achieved.copy()
                    new_counts.subtract(signals(remove)); new_counts.update(signals(add))
                    if all(new_counts[x] >= min(achieved[x], QUOTAS[x]) for x in QUOTAS) and new_counts[q] > achieved[q]:
                        chosen.remove(remove); del reasons[remove['candidateGroupKey']]
                        chosen.append(add); reasons[add['candidateGroupKey']] = 'QUOTA_REPAIR:'+q
                        swapped = True
                        break
                if swapped:
                    break
            if swapped:
                break
        if not swapped:
            break
    chosen.sort(key=lambda g: (list(BUCKETS).index(bucket(g)), rank(g)))
    achieved = quotas(chosen)
    audit = {'quotaTargets': QUOTAS, 'availableCapacity': {q: capacity[q] for q in QUOTAS},
             'capacityByAlphabetBucket': {b: {q: quotas([g for g in pool if bucket(g) == b])[q] for q in QUOTAS} for b in BUCKETS},
             'pairwiseAvailableIntersections': {a+' & '+b: sum(a in signals(g) and b in signals(g) for g in pool)
                                               for i, a in enumerate(QUOTAS) for b in list(QUOTAS)[i+1:]},
             'achieved': {q: achieved[q] for q in QUOTAS},
             'shortages': [{'quota': q, 'target': QUOTAS[q], 'available': capacity[q], 'achieved': achieved[q],
                            'shortage': QUOTAS[q]-achieved[q], 'reason': 'INSUFFICIENT_ELIGIBLE_CAPACITY' if capacity[q] < QUOTAS[q] else 'DETERMINISTIC_BEST_EFFORT_JOINT_SHORTFALL_NOT_PROVEN_INFEASIBLE'} for q in QUOTAS if achieved[q] < QUOTAS[q]],
             'dimensionsOverlap': True, 'posCountMeaning': 'SOURCE_POS_EVIDENCE_MEMBERSHIP; NOT_APPROVED_PRIMARY_POS',
             'alphabetBuckets': {b: {'target': 20, 'available': sum(bucket(g) == b for g in pool), 'selected': sum(bucket(g) == b for g in chosen)} for b in BUCKETS}}
    cohort = {'seed': SEED, 'algorithmVersion': 'QUOTA_ROTATION_HASH_RANK_V1', 'rankEncoding': 'SHA256_UTF8(seed + LF + exactCandidateGroupKey), then key',
              'inputFingerprints': PINS, 'selectionBaseline': BASELINE,
              'groups': [dict(g, alphabeticalBucket=bucket(g), selectionSignals=sorted(signals(g)), sha256Rank=rank(g)[0], selectionRationale=reasons[g['candidateGroupKey']]) for g in chosen]}
    return cohort, audit


def persist_selection():
    ledger, _, _, _, prior = inputs()
    cohort, audit = select(ledger, prior)
    require(len(cohort['groups']) == 120, 'Selection count')
    objects = {'selected-cohort.json': cohort, 'selection-quota-audit.json': audit}
    objects['selection-manifest.json'] = {'fingerprint': digest(objects), 'selectedKeyFingerprint': digest([g['candidateGroupKey'] for g in cohort['groups']]),
                                          'files': list(objects), 'artifactHashes': {k: digest(v) for k,v in objects.items()}, 'frozenBeforeDrafting': True}
    for name, data in objects.items():
        path = WS/name
        text = json.dumps(data, ensure_ascii=False, indent=2)+'\n'
        require(not path.exists() or path.read_text(encoding='utf8') == text, 'Refuse to overwrite frozen selection')
        path.parent.mkdir(parents=True, exist_ok=True); path.write_text(text, encoding='utf8', newline='\n')
    return objects['selection-manifest.json']['fingerprint']


REVIEW_DIMENSIONS = ['SEMANTICS', 'BOUNDARIES', 'POS_CONSTRUCTION', 'EN_DEFINITION', 'EN_NATURALNESS',
                     'VI_MEANING', 'VI_EXAMPLE', 'GRAMMAR', 'CEFR_UNCERTAINTY', 'REDUNDANCY',
                     'PROVENANCE_COPYING', 'MASTER_LEGACY', 'RIGHTS']
SPECIALIST = {'bail', 'disease', 'capitalist', 'fluid', 'monkey', 'mandarin', 'immune system', 'physician',
              'premium', 'terminal', 'subject', 'weapon', 'wound', 'shareholder', 'junk food'}
RISK_SIGNALS = {'EXISTING_MASTER_LEMMA', 'LEGACY_HISTORY', 'POSSIBLE_POLYSEMY', 'POS_CONFLICT',
                'CEFR_CONFLICT', 'MULTIWORD_PHRASAL', 'SOURCE_DUPLICATES'}


def frozen_selection(ledger, prior):
    manifest = load(WS/'selection-manifest.json')
    stored = {n: load(WS/n) for n in manifest['files']}
    require(digest(stored) == manifest['fingerprint'], 'Frozen selection artifact drift')
    cohort, audit = select(ledger, prior)
    require(cohort == stored['selected-cohort.json'] and audit == stored['selection-quota-audit.json'], 'Selection replay drift')
    require(digest([g['candidateGroupKey'] for g in cohort['groups']]) == manifest['selectedKeyFingerprint'], 'Frozen keys drift')
    return cohort['groups'], manifest, audit


def read_authored(groups):
    rows, batches, hashes = [], [], {}
    notes = {}
    for line in (WS/'authored/linguistic-review.psv').read_text(encoding='utf8').splitlines():
        key, note = line.split('|')
        require(key not in notes and len(note) >= 50, 'Duplicate/inadequate review note')
        notes[key] = note
    decisions = load(WS/'authored/lexical-decisions.json')
    require(set(notes) == {g['normalizedHeadword'] for g in groups}, 'Review coverage incomplete')
    require(set(decisions) <= set(notes), 'Unexpected lexical decision')
    for i in range(0, 120, 5):
        path = WS/f'authored/batch-{i//5+1:02d}.psv'
        expected = {g['normalizedHeadword'] for g in groups[i:i+5]}
        seen = set()
        for n, line in enumerate(path.read_text(encoding='utf8').splitlines(), 1):
            fields = line.split('|')
            require(len(fields) == 10, 'PSV_V1 requires exactly ten fields; delimiter not escapable')
            word, slug, pos, label, definition, vi, en, ev, grammar, ordinals = fields
            require(word in expected and pos in pilot.POS, 'Wrong batch group/POS')
            require(re.fullmatch(r'[a-z0-9-]+', slug), 'Invalid draft slug')
            seen.add(word)
            d = decisions.get(word, {})
            row = {'candidateGroupKey': 'NORMALIZED_HEADWORD:'+word, 'proposalKey': 'EDITORIAL_2H2C:'+word+':'+slug,
                   'headwordEvidence': word, 'displayFormProposal': d.get('displayForm', word),
                   'lexicalUnitTypeProposal': d.get('lexicalUnitType', 'MULTIWORD_EXPRESSION' if ' ' in word else 'WORD'),
                   'partOfSpeechProposal': pos, 'content': {'senseLabelEn': label, 'definitionEn': definition,
                     'meaningVi': vi, 'examples': [{'en': en, 'vi': ev}], 'grammarNotesEn': grammar},
                   'oxfordGroupOrdinalsConsidered': [] if ordinals == '-' else [int(v) for v in ordinals.split(',')],
                   'authoredSource': {'path': path.relative_to(WS).as_posix(), 'line': n, 'format': 'PSV_V1_TEN_FIELDS'},
                   'linguisticReviewNote': notes[word], 'lexicalDecisionRationale': d.get('rationale', 'Lexical form and unit remain proposals requiring owner review'),
                   'ownerDecision': 'UNRESOLVED', 'identityDecision': 'UNRESOLVED', 'sourceRights': RIGHTS,
                   'canonicalId': None, 'runtimeMapping': None, 'publicationEligible': False}
            rows.append(row)
        require(seen == expected, 'Selected group has no authored draft or documented blocker')
        batches.append({'batch': i//5+1, 'groupKeys': [g['candidateGroupKey'] for g in groups[i:i+5]],
                        'groupCount': 5, 'sizeLimit': 5, 'policy': 'CONSERVATIVE_FULL_AI_REVIEW_ALL_FIVE_GROUPS'})
        hashes[path.relative_to(WS).as_posix()] = sha_bytes(path)
    require(len({r['proposalKey'] for r in rows}) == len(rows), 'Duplicate Sense key')
    for path in [WS/'authored/linguistic-review.psv', WS/'authored/lexical-decisions.json', WS/'authored/qa-corrections.json', WS/'authored/fact-verification.json']:
        hashes[path.relative_to(WS).as_posix()] = sha_bytes(path)
    return rows, batches, hashes


def structural_errors(row):
    errors = []
    content = row.get('content', {})
    for f in ['senseLabelEn', 'definitionEn', 'meaningVi', 'grammarNotesEn']:
        if not isinstance(content.get(f), str) or not content[f].strip():
            errors.append('MISSING_'+f)
    examples = content.get('examples', [])
    if not examples or any(not x.get('en') or not x.get('vi') for x in examples):
        errors.append('UNPAIRED_EXAMPLE')
    if any(x.get('en') == x.get('vi') for x in examples):
        errors.append('IDENTICAL_LANGUAGE_EXAMPLE')
    if content.get('definitionEn') == content.get('meaningVi'):
        errors.append('IDENTICAL_LANGUAGE_MEANING')
    if row.get('partOfSpeechProposal') not in pilot.POS:
        errors.append('INVALID_POS')
    if row.get('lexicalUnitTypeProposal') not in {'WORD', 'MULTIWORD_EXPRESSION', 'PHRASAL_VERB', 'IDIOM'}:
        errors.append('INVALID_LEXICAL_UNIT')
    if row.get('ownerDecision') != 'UNRESOLVED' or row.get('identityDecision') != 'UNRESOLVED':
        errors.append('UNAUTHORIZED_DECISION')
    if row.get('canonicalId') is not None or row.get('runtimeMapping') is not None or row.get('publicationEligible'):
        errors.append('UNAUTHORIZED_PROMOTION')
    if row.get('sourceRights') != RIGHTS:
        errors.append('UNSUPPORTED_RIGHTS')
    head = row.get('displayFormProposal', '').casefold()
    definition = content.get('definitionEn', '').strip(' .').casefold()
    if definition in {head, 'a '+head, 'the '+head}:
        errors.append('TAUTOLOGICAL_DEFINITION')
    return errors


def language_signals(row):
    """Conservative review signals, never a semantic or translation approval."""
    c = row['content']; word = row['headwordEvidence']; findings = []
    for x in c['examples']:
        if re.findall(r'\d+', x['en']) != re.findall(r'\d+', x['vi']):
            findings.append('NUMBER_PAIR_REVIEW')
        # Lexical negative adjectives count; QA1 attorney showed why merely
        # spotting Vietnamese chưa is insufficient to conclude mistranslation.
        negative_en = bool(re.search(r'\b(no|not|cannot|never|neither|without|unclear|unknown)\b|n.t\b', x['en'], re.I))
        negative_vi = bool(re.search(r'\b(không|chưa|chẳng)\b', x['vi'], re.I))
        if negative_en != negative_vi:
            findings.append('POLARITY_SIGNAL_REQUIRES_CONTEXT_REVIEW')
        if word == 'listen' and not re.search(r'\blisten(?:ed|ing|s)?\s+to\b', x['en'], re.I):
            findings.append('LISTEN_TO_VALENCY_REVIEW')
        if word == 'deprive' and ' of ' not in x['en'].lower():
            findings.append('DEPRIVE_OF_VALENCY_REVIEW')
    if word in {'about', 'act', 'bread', 'block', 'acute', 'arm', 'arms', 'carbon dioxide', 'run', 'attorney'}:
        findings.append('QA1_KNOWN_MEANING_POS_BOUNDARY_CASE_REQUIRES_EXPLICIT_REVIEW')
    if row['partOfSpeechProposal'] == 'OTHER':
        findings.append('CONSTRUCTION_OR_NUMERAL_POLICY_PENDING')
    return sorted(set(findings))


def escalation(findings):
    strata, batches = set(), set()
    grammar = Counter()
    for f in findings:
        if f['severity'] == 'CRITICAL' and f['type'] in {'MEANING', 'IDENTITY', 'RIGHTS'}:
            strata.add(f['stratum'])
        if f['severity'] in {'SUBSTANTIVE', 'CRITICAL'} and f['type'] in {'GRAMMAR', 'TRANSLATION'}:
            grammar[f['batch']] += 1
    batches.update(b for b, n in grammar.items() if n >= 2)
    return {'fullReviewStrata': sorted(strata), 'fullReviewBatches': sorted(batches), 'promotionBlocked': bool(findings)}


def build():
    ledger, sources, master, protected, prior = inputs()
    groups, selection, quota_audit = frozen_selection(ledger, prior)
    rows, batches, authored_hashes = read_authored(groups)
    group_by_key = {g['candidateGroupKey']: g for g in groups}
    exact, grams = pilot.source_passages(groups, sources)
    examples = Counter(' '.join(pilot.words(x['en'])) for r in rows for x in r['content']['examples'])
    definitions = Counter(' '.join(pilot.words(r['content']['definitionEn'])) for r in rows)
    audit, lexemes, reviews, rights = [], [], [], []
    copies = {}
    for row in rows:
        g = group_by_key[row['candidateGroupKey']]
        for ref in g['sourceEvidence']:
            source = sources[ref['corpus']][ref['recordIndex']]
            require(all(ref[f] == source[f] for f in ['sourceRecordId', 'sourceNoteGuid', 'recordEvidenceSha256']), 'Source identity pointer drift')
            require(source['normalizedHeadword'] == g['normalizedHeadword'], 'Source group mismatch')
        supported = {n for ref in g['sourceEvidence'] for n in ref['structuredOxfordSenseGroupOrdinals']}
        require(set(row['oxfordGroupOrdinalsConsidered']) <= supported, 'Invalid Oxford ordinal')
        require(row['partOfSpeechProposal'] in g['normalizedPosCandidates'] or
                (row['headwordEvidence'] == 'per cent' and row['partOfSpeechProposal'] == 'OTHER'), 'POS proposal lacks evidence/rationale')
        errors = structural_errors(row)
        require(not errors, 'Draft structural failure '+row['proposalKey']+': '+str(errors))
        fields = pilot.content_fields(row)
        evidence = []
        for field, value in fields.items():
            tokens = pilot.words(value)
            ng = pilot.ngrams(value)
            if (' '.join(tokens) in exact and len(tokens) >= 5) or (ng & grams):
                evidence.append({'field': field, 'exactAtLeastFiveTokens': ' '.join(tokens) in exact,
                                 'sharedEightTokenWindows': len(ng & grams),
                                 'disposition': 'REVIEW_SIGNAL_NOT_LICENSE_OR_AUTOMATIC_COPYING_FINDING'})
        copies[row['proposalKey']] = evidence
        row['sourceEvidence'] = g['sourceEvidence']
        row['posEvidence'] = g['normalizedPosCandidates']
        row['cefrEvidence'] = [{'ref': ref['artifact']+'#/records/'+str(ref['recordIndex']), 'values': ref['cefrEvidence']} for ref in g['sourceEvidence']]
        row['cefrClassification'] = None
        row['otherClassifications'] = []
        row['existingMasterCandidates'] = g['masterLemmaCandidates']
        row['legacyDependencies'] = g['legacyCoverageEvidence']
        row['identityClaim'] = 'NONE'
        row['generatedProvenance'] = {'sourceType': 'GENERATED', 'actor': 'AI_ASSISTANT', 'humanReviewer': None,
              'license': None, 'process': 'Persisted bilingual drafting then AI linguistic self-review; no human approval',
              'fields': [{'field': f, 'sha256Utf8': hashlib.sha256(v.encode()).hexdigest()} for f,v in fields.items()]}
        row['meaningBoundaryProposal'] = row['content']['definitionEn']+' '+row['content']['grammarNotesEn']
        row['constructionValencyProposal'] = row['content']['grammarNotesEn']
        row['generatedProvenance']['structuralFields'] = [{'field': f, 'sha256Utf8': hashlib.sha256(row[f].encode()).hexdigest()}
                   for f in ['displayFormProposal', 'lexicalUnitTypeProposal', 'partOfSpeechProposal', 'meaningBoundaryProposal', 'constructionValencyProposal']]
        risks = sorted(signals(g) & RISK_SIGNALS)
        if row['headwordEvidence'] in SPECIALIST:
            risks.append('SPECIALIST_OR_SENSITIVE')
        if evidence:
            risks.append('SOURCE_SIMILARITY')
        warnings = ['HUMAN_CONTENT_REVIEW', 'SENSE_IDENTITY_UNRESOLVED', 'SENSE_CEFR_UNVERIFIED', 'RIGHTS_UNRESOLVED']
        warnings.extend(language_signals(row))
        if examples[' '.join(pilot.words(row['content']['examples'][0]['en']))] > 1:
            warnings.append('EXACT_DUPLICATE_EXAMPLE')
        if definitions[' '.join(pilot.words(row['content']['definitionEn']))] > 1:
            warnings.append('EXACT_DUPLICATE_DEFINITION')
        if evidence:
            warnings.append('SOURCE_SIMILARITY_REQUIRES_HUMAN_REVIEW')
        audit.append({'proposalKey': row['proposalKey'], 'structuralErrors': errors, 'status': 'REVIEW', 'risks': risks,
                      'warnings': warnings, 'sourceSimilarity': evidence,
                      'automatedMeaningVerification': 'NOT_POSSIBLE; AI_SELF_REVIEW_NOT_INDEPENDENT_HUMAN_VERIFICATION'})
        rights.append({'proposalKey': row['proposalKey'], 'rights': RIGHTS, 'sourceType': 'GENERATED',
                       'sourceEvidenceRefs': g['sourceEvidence'], 'fieldProvenance': row['generatedProvenance']['fields'],
                       'copyingSignals': evidence, 'rightsClearanceEvidence': [], 'ownerDecision': 'UNRESOLVED'})
    for g in groups:
        senses = [r for r in rows if r['candidateGroupKey'] == g['candidateGroupKey']]
        group_risks = sorted({risk for a in audit if a['proposalKey'] in {r['proposalKey'] for r in senses} for risk in a['risks']})
        supported = {n for ref in g['sourceEvidence'] for n in ref['structuredOxfordSenseGroupOrdinals']}
        represented = {n for r in senses for n in r['oxfordGroupOrdinalsConsidered']}
        lexemes.append({'candidateGroupKey': g['candidateGroupKey'], 'displayFormProposal': senses[0]['displayFormProposal'],
                        'lexicalUnitTypeProposal': senses[0]['lexicalUnitTypeProposal'], 'displaySpellingsEvidence': g['displaySpellings'],
                        'rationale': senses[0]['lexicalDecisionRationale'], 'canonicalId': None, 'identityDecision': 'UNRESOLVED',
                        'existingMasterCandidates': g['masterLemmaCandidates'], 'identityClaim': 'NONE', 'sourceRights': RIGHTS})
        reviews.append({'candidateGroupKey': g['candidateGroupKey'], 'senseKeys': [r['proposalKey'] for r in senses],
                        'reviewerKind': 'AI_SELF_REVIEW', 'humanReviewer': None, 'scope': REVIEW_DIMENSIONS,
                        'actualReviewNote': senses[0]['linguisticReviewNote'], 'highRiskFlags': group_risks,
                        'fullGroupReviewPerformed': True, 'humanLinguisticReview': 'PENDING', 'ownerDecision': 'UNRESOLVED',
                        'identityDecision': 'UNRESOLVED', 'sourceRights': RIGHTS,
                        'unrepresentedOxfordOrdinals': sorted(supported-represented),
                        'coverageCaution': 'Draft set is not an exhaustive approved source-to-Sense mapping; unrepresented uses need later evidence and boundary review'})
    corrections = load(WS/'authored/qa-corrections.json')
    by_key = {r['proposalKey']: r for r in rows}
    for c in corrections:
        require(c['proposalKey'] in by_key, 'Correction target absent')
        content = by_key[c['proposalKey']]['content']
        value = content['examples'][0]['en' if c['field'] == 'exampleEn' else 'vi'] if c['field'] in {'exampleEn', 'exampleVi'} else content[c['field']]
        require(value == c['after'], 'Correction not reflected in persisted draft')
        require(c['before'] != c['after'], 'Fictitious no-op correction')
    counts = {'sourceGroupsTotal': 6143, 'previousPilotGroups': 100, 'newGroupsSelected': 120, 'overlapWithPilot': 0,
              'groupsWithDrafts': len(reviews), 'groupsBlocked': 0, 'senseDrafts': len(rows),
              'multiSenseGroups': sum(len(r['senseKeys']) > 1 for r in reviews),
              'englishDefinitions': len(rows), 'englishExamples': sum(len(r['content']['examples']) for r in rows),
              'vietnameseMeanings': len(rows), 'vietnameseExampleTranslations': sum(len(r['content']['examples']) for r in rows),
              'qa': dict(Counter(a['status'] for a in audit)), 'highRiskGroups': sum(bool(r['highRiskFlags']) for r in reviews),
              'fullAiReviewedGroups': len(reviews), 'humanReviewedGroups': 0, 'identityPending': len(rows),
              'ownerApproved': 0, 'canonicalIdsAllocated': 0, 'runtimeMappings': 0,
              'sourceSimilaritySenses': sum(bool(v) for v in copies.values()), 'originalWordingCorrections': len(corrections),
              'correctedSenseDrafts': len({c['proposalKey'] for c in corrections}),
              'actualMultiwordUnits': sum(' ' in r['displayFormProposal'] for r in lexemes),
              'sourceMultiwordFlags': quota_audit['achieved']['MULTIWORD_PHRASAL'],
              'sourceStrataGroups': {q: quota_audit['achieved'][q] for q in ['OXFORD_ONLY', 'VOCAB4600_ONLY', 'BOTH']},
              'draftPosGroupCoverage': dict(Counter(p for g in groups for p in {r['partOfSpeechProposal'] for r in rows if r['candidateGroupKey'] == g['candidateGroupKey']})),
              'cefrEvidenceGroupCoverage': dict(Counter(v for g in groups for v in {e['value'] for ref in g['sourceEvidence'] for e in ref['cefrEvidence']}))}
    full_findings = [{'batch': next(b['batch'] for b in batches if by_key[c['proposalKey']]['candidateGroupKey'] in b['groupKeys']),
                      'stratum': c['stratum'], 'severity': c['severity'], 'type': c['type']} for c in corrections]
    policy = escalation(full_findings)
    for b in batches:
        b.update({'requestedLowRiskSample': max(10, (b['groupCount']+4)//5), 'availableGroups': b['groupCount'],
                  'sampledKeys': sorted(b['groupKeys'], key=lambda k: hashlib.sha256((SEED+'\nAUDIT\n'+k).encode()).hexdigest()),
                  'coverage': 'FULL_BATCH_AI_REVIEW; SAMPLE_TARGET_EXCEEDS_FIVE_GROUP_BATCH_CAPACITY',
                  'sourceCoverage': dict(Counter(x for g in groups if g['candidateGroupKey'] in b['groupKeys'] for x in g['sourceMembership'])),
                  'posCoverage': dict(Counter(r['partOfSpeechProposal'] for r in rows if r['candidateGroupKey'] in b['groupKeys'])),
                  'cefrEvidenceCoverage': dict(Counter(v for g in groups if g['candidateGroupKey'] in b['groupKeys'] for v in {e['value'] for ref in g['sourceEvidence'] for e in ref['cefrEvidence']})),
                  'escalationAlreadyCovered': True})
    common = {'phase': '2H.2C', 'artifactType': 'NONCANONICAL_EDITORIAL_DRAFT', 'inputFingerprints': PINS,
              'selectionFingerprint': selection['fingerprint'], 'authorization': AUTH}
    def wrap(**kw):
        return dict(common, **kw)
    output = {'lexeme-proposals.json': wrap(groups=lexemes), 'sense-proposals.json': wrap(senses=rows),
              'editorial-review.json': wrap(groups=reviews, batches=batches, dimensions=REVIEW_DIMENSIONS,
                   reviewLimitation='AI_AUTHOR_SELF_REVIEW; NO_INDEPENDENT_HUMAN_EDITORIAL_ACCEPTANCE', escalation=policy,
                   findingsAndCorrections=corrections, externalFactChecks=load(WS/'authored/fact-verification.json')),
              'quality-audit.json': wrap(senses=audit, quotaAudit=quota_audit,
                   actualMultiwordShortfall={'target': 10, 'actual': counts['actualMultiwordUnits'], 'sourceFlagCount': 10,
                     'cause': 'visible (adj) and warming (n) are metadata annotations, not multiword lexical units; frozen selection retained'},
                   qa1Lessons=['POS_AND_CONSTRUCTION', 'LABEL_EXAMPLE_ALIGNMENT', 'DEFINITION_SCOPE', 'COLLOCATIONS',
                     'SINGULAR_PLURAL_IDENTITY', 'SPECIALIST_FACT_CHECKS', 'VALENCY', 'COALESCENCE', 'HEURISTIC_FALSE_POSITIVES']),
              'rights-provenance-audit.json': wrap(senses=rights, rights=RIGHTS, fullSourceScan='ALL_9677_ACCEPTED_SOURCE_NOTES',
                   policy='Similarity is a review signal, not evidence of license; no raw APKG/media promotion'),
              'validation-summary.json': wrap(status='PASS_STRUCTURAL_REPLAY_ONLY; EDITORIAL_REVIEW_PENDING', counts=counts,
                   deterministicChecks=['FROZEN_SELECTION_REPLAY', 'SOURCE_POINTERS', 'BATCH_MAPPING', 'PAIRED_FIELDS',
                     'ALLOWED_POS', 'NO_IDS_APPROVALS_MAPPINGS', 'FULL_SOURCE_SIMILARITY_SIGNALS', 'GENERATED_FIELD_HASHES'],
                   externalVerification='NOT_RUN_BY_GENERATOR; ACTUAL_COMMAND_RESULTS_RECORDED_IN_HANDOFF',
                   rights=RIGHTS, semanticBlockers='Human boundary/grammar/translation/specialist review pending for all drafts',
                   databaseAccess='NONE', databaseWrites='NONE', production='UNTOUCHED', protectedState=protected)}
    fingerprint = digest({'authoredByteHashes': authored_hashes, 'artifacts': output})
    output['manifest.json'] = wrap(fingerprint=fingerprint, fingerprintMethod='SHA256_SORTED_COMPACT_UTF8_JSON(authoredByteHashes, artifacts excluding manifest)',
                                 files=list(output), authoredByteHashes=authored_hashes, artifactHashes={n: digest(v) for n,v in output.items()},
                                 selectedKeyFingerprint=selection['selectedKeyFingerprint'])
    report = render_report(output, selection, quota_audit, corrections)
    return output, report


def render_report(output, selection, quota_audit, corrections):
    counts = output['validation-summary.json']['counts']
    lines = ['# Phase 2H.2C — Stratified 120-group editorial drafts', '', 'AUTHORED DRAFTS / AI SELF-REVIEW COMPLETE; HUMAN CONTENT, IDENTITY AND RIGHTS REVIEW PENDING.', '',
             'Source/pipeline input pins are historical and immutable. Publication began on TXH at '+BASELINE+'. No canonical Master, DB or runtime operation.', '',
             'Selection fingerprint: `'+selection['fingerprint']+'`.', 'Editorial fingerprint: `'+output['manifest.json']['fingerprint']+'`.', '',
             '## Accounting', '', '```json', json.dumps(counts, ensure_ascii=False, indent=2, sort_keys=True), '```', '',
             '## Selection and quota limitations', '',
             'Fixed seed '+SEED+'; exact-key SHA-256 rank, scarce-quota rotation, stable bucket fill and deterministic repair. Cohort frozen before drafting, never changed to avoid a difficult word. Each of six buckets contains 20 groups. Source POS membership is an overlapping evidence signal, not an approved primary POS count.', '',
             '```json', json.dumps({'achieved': quota_audit['achieved'], 'shortages': quota_audit['shortages']}, indent=2), '```', '',
             'Missing CEFR evidence has zero eligible capacity in this accepted pool. C2 evidence is also retained. Source multiword flags reach 10, but linguistic review identifies only eight actual multiword units: visible (adj) and warming (n) contain metadata. The actual-unit target is short by two; do not claim all linguistic quotas met. Freeze is preserved and annotation/form identity remains unresolved.', '',
             '## QA process and limitations', '',
             '24 batches of five groups, below every ordinary/identity/sensitive size cap. All 120 groups and all persisted Senses were read and self-reviewed by the AI author across 13 dimensions; linguistic-review.psv contains group-specific actual judgments. This is not an independent human review. Requested low-risk sample minimum 10 exceeds each five-group batch, so full batch review replaces sampling. Source/POS/CEFR coverage is explicitly recorded; no nonexistent sample groups are invented.', '',
             'A critical meaning/identity/rights finding escalates its entire stratum; two substantive grammar/translation findings escalate the batch. All batches and strata already receive full AI review; human review is still pending. Similarity warnings remain visible and never confer permission. No rights clearance, owner approval or Master promotion.', '',
             '## Actual BEFORE/AFTER corrections', '']
    for c in corrections:
        lines += ['### '+c['proposalKey'], '', 'BEFORE: '+c['before'], '', 'AFTER (DRAFT): '+c['after'], '', c['rationale'], '']
    lines += ['## External fact checks — concept evidence, no text reuse license', '']
    for f in output['editorial-review.json']['externalFactChecks']:
        lines += ['- ['+f['title']+']('+f['url']+'): '+f['scope']]
    lines += ['', '## Complete bilingual draft preview', '']
    for r in output['sense-proposals.json']['senses']:
        c = r['content']
        lines += ['### '+r['proposalKey'], '', r['displayFormProposal']+' / '+r['partOfSpeechProposal']+' / '+r['lexicalUnitTypeProposal']+' (all proposals)', '',
                  'Label: '+c['senseLabelEn'], '', 'Definition EN: '+c['definitionEn'], '', 'Meaning VI: '+c['meaningVi'], '',
                  'Example EN: '+c['examples'][0]['en'], '', 'Example VI: '+c['examples'][0]['vi'], '', 'Grammar/boundary: '+c['grammarNotesEn'], '',
                  'AI review: '+r['linguisticReviewNote'], '', 'Source pointers: '+', '.join(ref['artifact']+'#/records/'+str(ref['recordIndex']) for ref in r['sourceEvidence'])+'.', '',
                  'Oxford ordinals considered: '+str(r['oxfordGroupOrdinalsConsidered'])+'; not approved mappings. Master identityClaim NONE; history/exclusions preserved.', '',
                  'Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.', '']
    lines += ['## Verification and next batch', '',
              'Replay reads frozen keys and persisted authoring, never calls AI or writes with --check. External suite/typecheck/lint/frozen-command results are in docs/ai-progress.md; generator does not assert their PASS.', '',
              'Next recommendation: keep risk-aware small batches, separate annotation/multiword signals before selection, preserve bilingual coupled review and obtain independent human decisions on boundary/valency/specialist/rights issues. Scale toward remaining 6143-group corpus only with separate authorization; do not repeat inventory or auto-start another batch.', '',
              'Hybrid 2.2.1 / 87 Lexemes / 100 Senses, release 44874b11d1fdef76a515f6285d04c9a417318daa6969e112608a59e7c232613c, tree 51ab4c5ce31bd38b51742d1aea16602150522da27ad26c123cc17b332f9a406e unchanged. Legacy 2018/history 75/#11/#284/#295/#849/exclusions are pinned offline, no live verification claimed. Database access/writes NONE; Production UNTOUCHED.', '']
    return '\n'.join(lines)


def run(check=False):
    output, report = build()
    expected = {WS/n: json.dumps(v, ensure_ascii=False, indent=2, sort_keys=True)+'\n' for n,v in output.items()}
    expected[REPORT] = report
    if check:
        require(all(p.is_file() and p.read_text(encoding='utf8') == text for p,text in expected.items()), 'Editorial artifact replay drift')
    else:
        for path, text in expected.items():
            path.parent.mkdir(parents=True, exist_ok=True)
            if not path.exists() or path.read_text(encoding='utf8') != text:
                path.write_text(text, encoding='utf8', newline='\n')
    return {'selectionFingerprint': output['manifest.json']['selectionFingerprint'], 'editorialFingerprint': output['manifest.json']['fingerprint'],
            'counts': output['validation-summary.json']['counts'], 'offlineReplay': 'PASS' if check else 'NOT_EXECUTED', 'databaseAccess': 'NONE', 'databaseWrites': 'NONE'}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--freeze-selection', action='store_true')
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    require(not (args.freeze_selection and args.check), 'Conflicting arguments')
    print(json.dumps(persist_selection() if args.freeze_selection else run(args.check), ensure_ascii=False, indent=2))
