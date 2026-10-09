#!/usr/bin/env python3
"""Assemble persisted, content-bound aggregate QA; offline, proposal-only.

--check compares bytes without writing or generating linguistic judgments.
This bounded handoff is PARTIAL. Missing manual decisions remain PENDING.
"""
import argparse
import hashlib
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WS = ROOT / 'vocabflow-dataset/workspaces/master-editorial-aggregate-qa'
REPORT = ROOT / 'vocabflow-dataset/reports/master-editorial-aggregate-qa.md'
CP = ROOT / 'vocabflow-dataset/workspaces/master-editorial-bulk-500-resume/checkpoints/checkpoint-05'
BASELINE = 'a8015440d41ca4c33c43dbc723fd400e4fc6e8f0'
CP_PIN = '2007c5a1e67d4dab6228378b5b00b22ab4736cb16d3f5a3e3d03735e2a290e44'
AUTH = {'contentStatus': 'DRAFT', 'rights': 'UNKNOWN_REVIEW_REQUIRED',
        'correctionProposalsApplied': 0, 'ownerApprovalsAdded': 0,
        'canonicalIdsAllocated': 0, 'rightsClearanceAdded': 0,
        'databaseAccess': 'NONE', 'databaseWrites': 'NONE',
        'production': 'UNTOUCHED', 'masterReleaseChanged': False,
        'legacyModified': False, 'scopedGitPublicationAuthorized': True}


def load(path):
    return json.loads(path.read_text(encoding='utf8'))


def encode(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n'


def digest(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True,
                                     separators=(',', ':')).encode('utf8')).hexdigest()


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def text_sha(text):
    return hashlib.sha256(text.encode('utf8')).hexdigest()


def require(condition, message):
    if not condition:
        raise ValueError(message)


def unique(rows, key):
    result = {x[key]: x for x in rows}
    require(len(result) == len(rows), 'Duplicate ' + key)
    return result


def revision(row):
    return digest({k: row[k] for k in ['proposalKey', 'candidateGroupKey', 'headword',
                                      'partOfSpeechProposal', 'content']})


def validate_pins(pins):
    for name, expected in pins.items():
        path = ROOT / name
        require(path.resolve().is_relative_to(ROOT.resolve()), 'Unsafe parent pin')
        require(path.is_file() and sha(path) == expected, 'Accepted input drift: ' + name)


def check_bound(row, index):
    key = row['proposalKey']
    require(key in index and row['effectiveContentHash'] == index[key]['effectiveContentHash'],
            'Stale or foreign content-bound decision: ' + key)


def validate_proposal(p, index):
    require(p['proposalKey'] in index, 'Foreign correction proposal')
    row = index[p['proposalKey']]
    require(p['originalEffectiveContentHash'] == row['effectiveContentHash'], 'Stale correction parent')
    require(p['field'] == '/content/grammarNotesEn', 'Unexpected correction scope')
    require(p['before'] == row['content']['grammarNotesEn'], 'Correction BEFORE drift')
    require(p['beforeSha256'] == text_sha(p['before']) and
            p['afterSha256'] == text_sha(p['after']), 'Correction field hash drift')
    require(p['after'] and p['before'] != p['after'], 'Empty or no-op proposal')
    require(p['applied'] is False and p['ownerApproval'] is False, 'Unauthorized correction or approval')
    require(p['fullBatchReReviewRequired'] is True, 'Batch re-review omitted')


def lineage(pins, keys):
    """Preserve exact historical records and pointers; do not infer AI/human approval."""
    history = {k: {'qa': [], 'corrections': [], 'authorReviews': []} for k in keys}
    for name, expected in sorted(pins.items()):
        filename = Path(name).name
        if not name.startswith('vocabflow-dataset/workspaces/'):
            continue
        kind = ('authorReviews' if filename == 'sense-review.json' else
                'qa' if filename in ['quality-audit.json', 'pilot-quality-audit.json',
                                    'correction-quality-audit.json'] else
                'corrections' if filename in ['content-correction-overlays.json',
                                             'applied-corrections.json'] else None)
        if kind is None:
            continue

        def walk(value, pointer):
            if isinstance(value, dict):
                key = value.get('proposalKey')
                if key in history:
                    history[key][kind].append({'path': name, 'sha256': expected,
                                              'jsonPointer': pointer, 'exactRecord': value})
                    return
                for k, child in value.items():
                    walk(child, pointer + '/' + k.replace('~', '~0').replace('/', '~1'))
            elif isinstance(value, list):
                for i, child in enumerate(value):
                    walk(child, pointer + '/' + str(i))
        walk(load(ROOT / name), '')
    return history


def assemble():
    pins = load(WS / 'accepted-input-pins.json')
    require(pins['remoteParent'] == BASELINE and pins['checkpoint05Fingerprint'] == CP_PIN,
            'Baseline or checkpoint pin drift')
    validate_pins(pins['files'])
    require(load(CP / 'manifest.json')['fingerprint'] == CP_PIN, 'Checkpoint-05 fingerprint drift')
    authored = WS / 'authored'
    source = load(authored / 'effective-sense-index-input.json')['records']
    index = unique(source, 'proposalKey')
    current = unique(load(CP / 'effective-draft-projection.json')['records'], 'proposalKey')
    require(len(index) == 1563 and set(index) == set(current), '1563 Sense inventory drift')
    require(len({x['candidateGroupKey'] for x in source}) == 1020, '1020 group inventory drift')
    for i, row in enumerate(source):
        actual = current[row['proposalKey']]
        require(row['effectiveContentHash'] == revision(actual) and row['content'] == actual['content'],
                'Effective projection/hash drift: ' + row['proposalKey'])
        require(row['jsonPointer'] == '/records/' + str(i) + '/content', 'Effective content pointer drift')
        require(row['rights'] == AUTH['rights'] and row['humanReviewEvidence'] is None and
                row['formalApproval'] == 'UNRESOLVED', 'Fabricated approval or rights')
    history = lineage(pins['files'], index)
    group_review_path = 'vocabflow-dataset/workspaces/master-editorial-stratified-120/authored/linguistic-review.psv'
    group_reviews = {}
    for line_number, line in enumerate((ROOT/group_review_path).read_text(encoding='utf8').splitlines(), 1):
        if line:
            word, note = line.split('|', 1)
            group_reviews['NORMALIZED_HEADWORD:'+word] = {'path': group_review_path,
                'sha256': pins['files'][group_review_path], 'line': line_number,
                'reviewerKind': 'AI_SELF_REVIEW', 'scope': 'ORIGINAL_GROUP; NOT_CURRENT_EFFECTIVE_HASH_BOUND',
                'actualReviewNote': note, 'humanReviewer': None}
    enriched = []
    for x in source:
        actual = current[x['proposalKey']]
        original_review = x['originalAuthorReview']
        if not x['cohort']:
            original_review = (history[x['proposalKey']]['authorReviews'] or
                               ([group_reviews[x['candidateGroupKey']]] if x['origin']=='EDITORIAL_2H2C' and
                                x['candidateGroupKey'] in group_reviews else None))
        enriched.append({**x, 'originalAuthorReview': original_review,
            'effectiveAiReview': x['effectiveAiReview'] if x['cohort'] else None,
            'rawEffectiveQaFindings': actual.get('qaFindings'),
            'editorialFieldProvenance': actual.get('editorialProvenance'),
            'reviewFieldProvenance': actual.get('reviewFieldProvenance'),
            'masterIdentityEvidence': actual.get('existingMasterCandidates'),
            'legacyIdentityDependencies': actual.get('legacyDependencies'),
            'classificationEvidence': actual.get('cefrEvidence'),
            'pinnedHistoricalQaReferences': history[x['proposalKey']]['qa'],
            'pinnedCorrectionLineage': history[x['proposalKey']]['corrections'],
            'assessmentProvenance': 'EXACT_PINNED_HISTORY; NULL_IS_UNKNOWN_NOT_PASS; PRIOR_RAW_QA_FLAGS_ARE_NOT_AI_REVIEWS',
            'originalReviewIsNotCurrentContentApproval': True, 'classificationApproved': False})
    cohort = {k for k, v in index.items() if v['cohort']}
    require(len(cohort) == 750 and len({index[k]['candidateGroupKey'] for k in cohort}) == 500,
            'Cohort inventory drift')
    inventory = load(authored / 'review-inventory-input.json')['records']
    require(inventory == load(CP / 'cumulative-qa-history.json')['allUnresolvedReviewRecords'],
            'Original REVIEW history changed')
    require(len(inventory) == 187, '187 REVIEW inventory drift')
    unique([x['record'] for x in inventory], 'proposalKey')
    decisions = load(authored / 'review-decisions-batch-001.json')['records']
    decisions_by_ordinal = unique(decisions, 'reviewInventoryOrdinal')
    triage = []
    for i, original in enumerate(inventory):
        key = original['record']['proposalKey']
        decision = decisions_by_ordinal.get(i)
        if decision:
            check_bound(decision, index)
            require(decision['proposalKey'] == key and decision['status'] == 'TRIAGED' and
                    decision['explanationVi'] and decision['humanApproval'] is False,
                    'Triage scope or approval drift')
        triage.append({'inventoryOrdinal': i, 'originalReview': original,
                       'status': 'TRIAGED' if decision else 'PENDING', 'decision': decision,
                       'effectiveContentHash': index[key]['effectiveContentHash'],
                       'priorFindingCleared': False})
    require(set(decisions_by_ordinal) <= set(range(187)), 'Foreign REVIEW ordinal')
    raw_coverage = load(authored / 'coverage-inventory-input.json')
    require(raw_coverage == load(CP / 'cohort-integrity.json'), 'Coverage inventory changed')
    coverage_decisions = load(authored / 'coverage-decisions-batch-001.json')['records']
    coverage_map = unique(coverage_decisions, 'candidateGroupKey')
    original_coverage = unique(raw_coverage['coverage'], 'candidateGroupKey')
    require(len(original_coverage) == 500 and sum(bool(x['warnings']) for x in original_coverage.values()) == 126,
            '500/126 coverage scope drift')
    require(set(coverage_map) <= set(original_coverage), 'Foreign coverage group')
    coverage = []
    for key, original in original_coverage.items():
        decision = coverage_map.get(key)
        if decision:
            actual_hashes = {k: index[k]['effectiveContentHash'] for k in cohort
                             if index[k]['candidateGroupKey'] == key}
            require(decision['reviewedContentHashes'] == actual_hashes, 'Coverage content scope drift')
            require(decision['category'] in ['CONFIRMED_GAP', 'POSSIBLE_GAP', 'SOURCE_METADATA_CONFLICT',
                                            'COVERAGE_UNKNOWN', 'NO_IDENTIFIED_SOURCE_SUPPORTED_GAP'],
                    'Unknown coverage category')
            require(decision['explanationVi'] and decision['exhaustiveLexicalCoverage'] is False,
                    'Unsupported coverage approval')
        coverage.append({'candidateGroupKey': key, 'originalWarningRecord': original,
                         'status': 'ASSESSED' if decision else 'PENDING', 'decision': decision,
                         'senseCoverageApproved': False})
    receipt = load(authored / 'sampling-receipt.json')
    sample = load(authored / 'calibration-decisions.json')
    samples = unique(sample['records'], 'proposalKey')
    require(set(samples) == set(receipt['cohortPassKeys'] + receipt['priorKeys']), 'Sample receipt mismatch')
    require(len(receipt['cohortPassKeys']) >= 60 and len(receipt['priorKeys']) == 20, 'Sample shortfall')
    for key, decision in samples.items():
        check_bound(decision, index)
        require(decision['status'] == 'REVIEWED' and decision['humanReview'] is False and
                decision['explanationVi'], 'Unreviewed or fabricated sample')
        require(decision['result'] in ['MINOR_CONTENT_HYGIENE_DEFECT',
                                      'NO_SUBSTANTIVE_DEFECT_IDENTIFIED_IN_THIS_INSPECTION'],
                'Unknown calibration result')
        if key in receipt['cohortPassKeys']:
            require(key in cohort and index[key]['effectiveQaAssessment'] == 'PASS', 'PASS sample scope drift')
        else:
            require(key not in cohort, 'Previous-corpus sample scope drift')
    proposals = load(authored / 'correction-proposals-input.json')
    unique(proposals['records'], 'correctionProposalId')
    require(len({(p['proposalKey'], p['field']) for p in proposals['records']}) == len(proposals['records']),
            'Duplicate field proposal')
    inspected = set(samples) | {x['proposalKey'] for x in decisions}
    for d in coverage_decisions:
        inspected.update(d['reviewedContentHashes'])
    for p in proposals['records']:
        validate_proposal(p, index)
        require(p['proposalKey'] in inspected, 'Proposal without persisted content inspection')
    for gap in proposals['additionalBoundaryProposals']:
        key = gap['candidateGroupKey']
        require(coverage_map[key]['category'] == 'CONFIRMED_GAP', 'New Sense based only on warning')
        require(gap['supportingExistingContentHashes'] == coverage_map[key]['reviewedContentHashes'],
                'Gap proposal parent drift')
        require(gap['canonicalId'] is None and gap['proposalKeyAllocated'] is False and
                gap['applied'] is False and gap['approved'] is False, 'Unauthorized new identity or approval')
    require(len({g['candidateGroupKey'] for g in proposals['additionalBoundaryProposals']}) ==
            len(proposals['additionalBoundaryProposals']), 'Duplicate new boundary proposal')
    queue = []
    for p in proposals['records']:
        queue.append({'queueId': 'FIELD:' + p['correctionProposalId'], 'priority': p['priority'],
                      'kind': 'CONFIRMED_MINOR_CONTENT_HYGIENE', 'proposalKey': p['proposalKey'],
                      'proposalRef': p['correctionProposalId'], 'action': 'PROPOSE_ONLY; FULL_BATCH_RE_REVIEW_BEFORE_APPLY'})
    for d in coverage_decisions:
        priority = 'P1' if d['category'] == 'CONFIRMED_GAP' else 'P2'
        queue.append({'queueId': 'COVERAGE:' + d['candidateGroupKey'], 'priority': priority,
                      'kind': d['category'], 'candidateGroupKey': d['candidateGroupKey'],
                      'action': 'REVIEW_SOURCE_FUNCTION_AND_TAXONOMY; NO_AUTOMATIC_APPLY'})
    for d in decisions:
        if d['categories'][0] in ['SENSE_BOUNDARY_UNCERTAIN', 'LEXICAL_IDENTITY_UNRESOLVED']:
            queue.append({'queueId': 'IDENTITY:' + d['proposalKey'], 'priority': 'P2',
                          'kind': d['categories'][0], 'proposalKey': d['proposalKey'],
                          'action': 'RESOLVE_LOCAL_TAXONOMY_BEFORE_ANY_CANONICAL_CLAIM'})
    queue.append({'queueId': 'ESCALATION:PROCESS_COMMENTS', 'priority': 'P2',
                  'kind': 'REPEATED_PATTERN_REQUIRES_EXPANDED_AUDIT',
                  'action': 'PENDING; REVIEW_AFFECTED_PRIOR_BATCHES_AND_REMAINING_PROCESS_NOTES'})
    for d in decisions:
        if d['categories'][0] in ['HEURISTIC_SIGNAL_ONLY', 'NO_SUBSTANTIVE_CONTENT_DEFECT_FOUND_BY_AI']:
            queue.append({'queueId': 'SIGNAL:' + d['proposalKey'], 'priority': 'P3',
                          'kind': d['categories'][0], 'proposalKey': d['proposalKey'],
                          'action': 'PRESERVE_ORIGINAL_REVIEW; REVIEW_SIGNAL_OR_REMAINING_RIGHTS_SCOPE_WITHOUT_CONTENT_REWRITE'})
    proposal_map = {p['correctionProposalId']: p for p in proposals['records']}
    for item in queue:
        key = item.get('proposalKey')
        group = item.get('candidateGroupKey')
        proposal = proposal_map.get(item.get('proposalRef'))
        item['recordIdentity'] = ({'proposalKey': key, 'effectiveContentHash': index[key]['effectiveContentHash']}
                                  if key else {'candidateGroupKey': group,
                                              'effectiveContentHashes': coverage_map[group]['reviewedContentHashes']}
                                  if group else {'scope': 'PROCESS_COMMENT_PATTERN',
                                                 'proposalKeys': [p['proposalKey'] for p in proposals['records']]})
        item['severity'] = ('MINOR_CONTENT_HYGIENE' if proposal else
                            'CONFIRMED_MISSING_FUNCTION' if item['priority']=='P1' else
                            'UNRESOLVED' if item['priority']=='P2' else 'INFORMATIONAL')
        item['evidence'] = ({'artifact': 'correction-proposals.json', 'correctionProposalId': proposal['correctionProposalId'],
                             'beforeSha256': proposal['beforeSha256'], 'rationaleVi': proposal['rationaleVi']}
                            if proposal else {'artifact': 'sense-coverage-audit.json',
                                              'decisionDigest': digest(coverage_map[group]),
                                              'explanationVi': coverage_map[group]['explanationVi']}
                            if group else {'artifact': 'review-triage.json', 'proposalKey': key,
                                           'explanationVi': next(d['explanationVi'] for d in decisions if d['proposalKey']==key)}
                            if key else {'artifact': 'authoring-qa-lessons.json', 'field': '/escalation'})
        item['canUseFutureVersionedDraftOverlay'] = bool(proposal or item['priority']=='P1')
        item['dependency'] = ('Full original batch re-review; separate content/identity/rights decisions before apply.'
                              if proposal else 'Source-function and taxonomy review; no canonical identity or exhaustive coverage approval.')
        item['rightsGate'] = 'UNKNOWN_REVIEW_REQUIRED; SEPARATE_FROM_P0_P1_P2_P3'
    unique(queue, 'queueId')
    categories = Counter(x['category'] for x in coverage_decisions)
    triage_categories = Counter(c for d in decisions for c in d['categories'])
    audited_cohort = inspected & cohort
    counts = {'corpusGroupsIndexed': 1020, 'corpusSensesIndexed': 1563,
              'cohortGroupsIndexed': 500, 'cohortSensesIndexed': 750,
              'cohortGroupsContentInspected': len({index[k]['candidateGroupKey'] for k in audited_cohort}),
              'cohortSensesContentInspected': len(audited_cohort),
              'coverageGroupsAssessed': len(coverage_decisions), 'coverageGroupsPending': 500-len(coverage_decisions),
              'originalReviewRecords': 187, 'reviewRecordsTriaged': len(decisions),
              'reviewRecordsPending': 187-len(decisions), 'confirmedContentDefects': len(proposals['records']),
              'confirmedTranslationDefects': 0, 'confirmedGrammarSyntaxDefects': 0,
              'heuristicOnlyFindings': triage_categories['HEURISTIC_SIGNAL_ONLY'],
              'identityPosUncertaintiesInTriagedReviews': sum(triage_categories[k] for k in
                  ['SOURCE_POS_CONFLICT','LEXICAL_IDENTITY_UNRESOLVED','SENSE_BOUNDARY_UNCERTAIN']),
              'rightsPendingCorpusRecords': 1563, 'rightsClearanceViolationsConfirmed': 0,
              'coverageWarningGroups': 126,
              'coverageWarningGroupsPending': sum(bool(x['originalWarningRecord']['warnings']) and
                                                    x['status']=='PENDING' for x in coverage),
              'confirmedMissingMeaningGroups': categories['CONFIRMED_GAP'],
              'possibleMissingMeaningGroups': categories['POSSIBLE_GAP'],
              'coverageUnknownGroupsAssessed': categories['COVERAGE_UNKNOWN'],
              'sourcePosConflictGroups': categories['SOURCE_METADATA_CONFLICT'],
              'noStructuredOrdinalMetadataGroups': sum(not x['supportedOrdinals'] for x in original_coverage.values()),
              'passCalibrationSampleSize': len(receipt['cohortPassKeys']),
              'passCalibrationDefectsFound': sum(samples[k]['result']=='MINOR_CONTENT_HYGIENE_DEFECT' for k in receipt['cohortPassKeys']),
              'priorCorpusSampleSize': len(receipt['priorKeys']),
              'priorSampleDefectsFound': sum(samples[k]['result']=='MINOR_CONTENT_HYGIENE_DEFECT' for k in receipt['priorKeys']),
              'correctionProposalsCreated': len(proposals['records']),
              'additionalBoundaryProposals': len(proposals['additionalBoundaryProposals']),
              'queueCounts': {k: sum(x['priority']==k for x in queue) for k in ['P0','P1','P2','P3']}}
    summary = {'phase': '2H.2I', 'status': 'PARTIAL', 'counts': counts, 'authorization': AUTH,
               'previous1563SensesPreserved': True, 'previousCheckpointsUnchanged': True,
               'allPriorQaHistoryPreserved': True, 'acceptedPinnedFiles': len(pins['files']),
               'deterministicChecks': ['Parent raw-byte pins', 'Effective content and revisions',
                   'Exact 187 REVIEW and 500 coverage inventory', 'Persisted decision scope and hashes',
                   'Sample receipt and actual assessments', 'Unapplied BEFORE/AFTER proposals'],
               'externalVerification': 'See verification-results.json; generator does not run tests, Git, typecheck or lint.',
               'limitations': ['162 REVIEW decisions pending; 483 coverage groups pending.',
                   'Repeated process-comment pattern requires expanded batch inspection before full audit closure.',
                   '60 PASS and 20 prior records are purposive samples, not a prevalence estimate.',
                   'No independent human review, rights clearance, canonical identity or exhaustive coverage approval.']}
    defects = [{**p, 'defectClass': 'MINOR_CONTENT_HYGIENE', 'learnerGrammarFieldContainsProcessMetadata': True}
               for p in proposals['records']]
    objects = {'effective-sense-index.json': {'records': enriched, 'counts': counts, 'authorization': AUTH},
               'review-triage.json': {'records': triage, 'counts': counts},
               'sense-coverage-audit.json': {'groups': coverage, 'counts': counts},
               'confirmed-content-defects.json': {'records': defects, 'classificationNote':
                   'Process commentary in learner grammar is a minor content defect, not a confirmed mistranslation or syntax defect.'},
               'correction-proposals.json': proposals,
               'pass-calibration-sample.json': {'receipt': receipt, 'assessments': sample, 'counts': counts},
               'prioritized-remediation-queue.json': {'items': queue, 'counts': counts['queueCounts'],
                   'publicationEligibility': 'BLOCKED_BY_SEPARATE_CONTENT_IDENTITY_RIGHTS_GATES',
                   'pendingReviewKeys': [x['originalReview']['record']['proposalKey'] for x in triage if x['status']=='PENDING'],
                   'pendingCoverageKeys': [x['candidateGroupKey'] for x in coverage if x['status']=='PENDING'],
                   'approvalShortlist': [{'candidateGroupKey': 'NORMALIZED_HEADWORD:to',
                     'questionVi': 'Quy ước đề xuất infinitive marker trước base verb khác preposition chỉ đích đến?',
                     'decision': 'UNRESOLVED', 'approvalCycleStarted': False}]},
               'authoring-qa-lessons.json': load(authored/'authoring-qa-lessons-input.json'),
               'validation-summary.json': summary}
    report = render_report(summary, proposals, decisions, coverage_decisions, sample)
    manifest = {'phase': '2H.2I', 'status': 'PARTIAL', 'remoteParent': BASELINE,
                'checkpoint05Fingerprint': CP_PIN, 'acceptedInputPinsSha256': sha(WS/'accepted-input-pins.json'),
                'authoredInputSha256': {p.name: sha(p) for p in sorted(authored.glob('*.json'))},
                'toolingSha256': {name: sha(ROOT/'scripts'/name) for name in
                                 ['phase-2h2i-aggregate-qa.py', 'phase-2h2i-aggregate-qa-test.py']},
                'artifactHashes': {k: text_sha(encode(v)) for k, v in objects.items()},
                'reportSha256': text_sha(report), 'authorization': AUTH,
                'fingerprintScope': 'Persisted content-bound audit inputs, deterministic assembled artifacts and report; external command results excluded.'}
    manifest['fingerprint'] = digest(manifest)
    objects['manifest.json'] = manifest
    return objects, report


def render_report(summary, proposals, decisions, coverage, sample):
    lines = ['# Phase 2H.2I — Aggregate editorial QA / coverage: PARTIAL', '',
             'Bàn giao một checkpoint audit có giới hạn do ngân sách thực thi. Không tuyên bố hoàn tất toàn bộ 187 REVIEW hay 500 nhóm coverage. Dữ liệu gốc và mọi lịch sử QA/correction được giữ nguyên; đề xuất chưa áp dụng.', '',
             'Remote parent: `' + BASELINE + '`. Checkpoint 05: `' + CP_PIN + '`.', '',
             '## Inventory and actual inspection', '', '```json', encode(summary['counts']).rstrip(), '```', '',
             'Indexed không đồng nghĩa audited. cohortGroupsContentInspected/cohortSensesContentInspected là hợp các khóa có đánh giá nội dung thực sự, gồm triage, sample và coverage; chỉ 17 nhóm đã có quyết định coverage. Các danh sách PENDING đầy đủ nằm trong queue và các artifact audit.', '',
             '## REVIEW triage — preserved original findings', '']
    for d in decisions:
        lines.append('- `' + d['proposalKey'] + '` — ' + ', '.join(d['categories']) + ': ' + d['explanationVi'])
    lines += ['', 'Similarity/polarity là tín hiệu, không tự chứng minh lỗi. Indifferent cần nghĩa không quan tâm; exclude cần phủ định. September đã được overlay sửa viết hoa, nhưng REVIEW lịch sử không bị xóa. Nhãn last determiner có [bằng chứng Cambridge](https://dictionary.cambridge.org/dictionary/learner-english/last?q=last_2); không tự coi đây là lỗi POS.', '',
              '## Source-supported coverage assessment', '']
    for d in coverage:
        lines.append('- `' + d['candidateGroupKey'] + '` — ' + d['category'] + ': ' + d['explanationVi'])
    lines += ['', 'Hail noun có [Cambridge](https://dictionary.cambridge.org/us/dictionary/english/hail); harness động từ thắng ngựa có [Oxford](https://www.oxfordlearnersdictionaries.com/definition/english/harness_2); fiery literal có [Cambridge](https://dictionary.cambridge.org/dictionary/english/fiery); instrumental noun có [Cambridge](https://dictionary.cambridge.org/us/dictionary/english/instrumental?topic=types-of-music). Chỉ nội dung search thực tế và nguồn local được ghim đã được dùng; không tuyên bố full-page verification hoặc quyền tái sử dụng. To dùng chỉ mục đích có local Oxford ordinal 1, cần quyết định taxonomy riêng.', '',
              '111 nhóm thiếu structured ordinal là thiếu metadata; không tự gán CONFIRMED_GAP hay tuyên bố đã kiểm tra exhaustive. 0 COVERAGE_UNKNOWN đã kết luận trong 17 nhóm không có nghĩa 483 nhóm còn lại đã đầy đủ. Unlike vẫn POSSIBLE_GAP: khác phân tích adjective/preposition chưa đủ chứng minh phải có Sense riêng.', '',
              '## Content-bound correction proposals: BEFORE / AFTER', '',
              '20 lỗi nhỏ: bình luận về quy trình nằm trong grammar cho người học. Không xác nhận lỗi dịch hay lỗi ngữ pháp cú pháp. Mỗi đề xuất giữ parent hash, field hashes, rationale VI và yêu cầu full-batch re-review; chưa áp dụng.', '']
    for p in proposals['records']:
        lines += ['### ' + p['correctionProposalId'] + ' — ' + p['proposalKey'], '',
                  'Parent: `' + p['originalEffectiveContentHash'] + '`; field `' + p['field'] + '`.', '',
                  '**BEFORE:** ' + p['before'], '', '**AFTER (proposal only):** ' + p['after'], '',
                  p['rationaleVi'], '']
    lines += ['## Additional boundary proposals — not new canonical Senses', '']
    for p in proposals['additionalBoundaryProposals']:
        c = p['content']
        lines += ['- `' + p['candidateGroupKey'] + '` / ' + p['proposedPos'] + ': ' + c['definitionEn'] +
                  ' — ' + c['meaningVi'] + ' Example: ' + c['examples'][0]['en'] + ' / ' + c['examples'][0]['vi']]
    lines += ['', '## PASS calibration and escalation', '',
              '60 cohort PASS từ 5 checkpoint, A1–C2, 10 POS và 3 source-membership strata; chọn có chủ đích theo receipt đã ghim, không ngẫu nhiên. Đã đọc definition, nghĩa VI, example EN/VI và grammar của từng Sense. Có 2 minor content-hygiene findings (aggregate / weekly). 20 Sense trước đó dùng bản effective mới nhất; 16 có process commentary, 4 chưa thấy lỗi nội dung trong phạm vi đọc. Thành công của successfully sau 2H.2G được giữ nguyên. Acute có điểm cần kiểm tra phạm vi nghĩa lâm sàng, chưa đủ bằng chứng kết luận lỗi semantic.', '',
              sample['sourceSimilarityPassStratum'], '',
              'Lặp lại process commentary kích hoạt mở rộng review batch gốc và các ghi chú tương tự. Việc mở rộng vẫn PENDING, do đó PARTIAL và không suy rộng tỷ lệ lỗi cho corpus. Assessment này là AI content inspection, không phải independent human calibration.', '',
              '## Pending work and handoff', '',
              '162 REVIEW chưa triage; 483 nhóm chưa kết luận coverage, gồm 109 nhóm warning. Hoàn tất các phần này và expanded batch review trước khi đóng full aggregate audit. Sau đó đề xuất targeted DRAFT remediation cho 20 field proposals / 5 source-supported boundaries, với owner review khi cần. Chưa áp dụng correction và chưa bắt đầu mở rộng 5,123 nhóm còn lại.', '',
              'All 1,563 effective Senses and checkpoints 01–05 remain byte-identical through accepted-input-pins.json. All original QA findings / correction histories remain pinned and referenced. Hybrid-100 v2.2.1 stays 87 Lexemes / 100 Senses; no Master release, legacy, mapping or runtime modifications.', '',
              'DRAFT; rights UNKNOWN_REVIEW_REQUIRED. Owner approvals / canonical IDs / applied corrections: 0. Database access/writes: NONE/NONE. Production: UNTOUCHED. External tests/typecheck/lint/replay evidence appears only in verification-results.json after actual execution; the deterministic generator does not claim to run them.', '',
              'STOP after this verified PARTIAL publication. No new cohort, formal approval cycle or database import.', '']
    return '\n'.join(lines)


def run(check=False):
    objects, report = assemble()
    outputs = {WS/name: encode(value) for name, value in objects.items()}
    outputs[REPORT] = report
    for path, expected in outputs.items():
        if check:
            require(path.is_file() and path.read_bytes() == expected.encode('utf8'),
                    'Offline replay byte drift: ' + str(path))
        else:
            path.write_text(expected, encoding='utf8', newline='\n')
    return objects['manifest.json']


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    manifest = run(args.check)
    print('PARTIAL', manifest['fingerprint'], 'READ_ONLY_REPLAY' if args.check else 'AUDIT_ASSEMBLED')


if __name__ == '__main__':
    main()
