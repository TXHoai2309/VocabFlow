#!/usr/bin/env python3
"""Additive Reviewer B integration; never overwrite checkpoint 01 or approve rechecks."""
import argparse
import copy
import csv
import importlib.util
import io
import json
import re
from collections import Counter

spec = importlib.util.spec_from_file_location('authoring', __file__.replace('review-integration.py', 'high-throughput-authoring.py'))
V = importlib.util.module_from_spec(spec)
spec.loader.exec_module(V)
R1 = V.CP / 'revisions/reviewer-b-r1'
INTAKE = V.WS / 'review-intake/checkpoint-01/reviewer-b'
ORIGINAL_FP = '3b970929ff32949443e3773dcd123367057bd38c38e1f7aa62d282b440f897c1'
COHORT_FP = 'f20e8c59d7b47cdf80f026d16acda8dbb283f948c8d5cb61cfef9c60cb7652c8'
REPORT_SHA = 'c4a22c67d33402a18032f8d8014a69ea6251a2e1e754ccae240a0ae52b80a925'
EXPECTED_MATRIX = {'PASS/PASS': 82, 'PASS/REVIEW': 8, 'REVIEW/PASS': 10, 'REVIEW/REVIEW': 3}
FIELDS = {
    'F01': ('EDITORIAL_2H2K:large:big-in-size', '/content/examples/0/vi'),
    'F02': ('EDITORIAL_2H2K:also:in-addition', '/content/examples/0/vi'),
    'F03': ('EDITORIAL_2H2K:purse:handbag', '/content/examples/0/vi'),
    'F04': ('EDITORIAL_2H2K:rainforest:high-rainfall-forest', '/content/grammarNotesEn'),
}
CANDIDATES = dict(zip(['M01','M02','M03','M04','M05','M06'], ['forget','together','chemist','history','perfect','possible']))


def content_hash(row):
    return V.digest({'proposalKey': row['proposalKey'], 'candidateGroupKey': row['candidateGroupKey'],
                     'headword': row['headword'], 'partOfSpeechProposal': row['partOfSpeech'], 'content': row['content']})


def source_aliases(row):
    return {('O' if ref['corpus'] == 'OXFORD_5000' else 'V') + str(ref['recordIndex']) for ref in row['sourceEvidence']}


def expected_review_references(row):
    refs = source_aliases(row)
    if row['proposalKey'] == 'EDITORIAL_2H2K:neighbor:person-living-nearby':
        # This is cross-corpus similarity evidence, not neighbor lexical evidence.
        source = V.inputs()[3]['OXFORD_5000'][1681]
        V.validate_source_record(source)
        prior = V.load(V.CP/'authored/post-qa-revisions.json')['records'][0]
        V.require(source['sourceRecordId'] == '1788223607720' and source['normalizedHeadword'] == 'lend'
                  and prior['proposalKey'] == row['proposalKey']
                  and source['sourceRecordId'] in prior['reason']
                  and any(V.ngrams(prior['before']) & V.ngrams(text)
                          for text in source['sourceFields'].values() if isinstance(text,str)),
                  'Neighbor cross-corpus similarity reference not verified')
        refs.add('O1681')
    return refs


def verify_intake(rows, author_reviews):
    metadata = V.load(INTAKE / 'handoff-metadata.json')
    report = (INTAKE / 'reviewer-b-original-report.md').read_bytes()
    V.require(V.sha(report) == metadata['sourceReportSha256'] == REPORT_SHA, 'Reviewer report SHA256 mismatch')
    V.require(metadata['checkpointFingerprintAsReviewed'] == ORIGINAL_FP
              and metadata['frozenCohortFingerprint'] == COHORT_FP, 'Reviewer checkpoint identity mismatch')
    package = V.load(INTAKE / 'reviewer-b-103-senses.json')
    V.require(package['metadata'] == metadata, 'JSON/metadata mismatch')
    reviewed = package['records']
    tsv_bytes = (INTAKE / 'reviewer-b-103-senses.tsv').read_bytes()
    V.require(tsv_bytes in report, 'TSV not a byte-exact section of original report')
    table = list(csv.DictReader(io.StringIO(tsv_bytes.decode('utf-8')), delimiter='\t'))
    for row in table:
        for name in ['affectedFields', 'sourceEvidenceReferences']:
            row[name] = json.loads(row[name])
        if row['suggestedCorrection'] == 'null':
            row['suggestedCorrection'] = None
    V.require(table == reviewed, 'TSV/JSON review mismatch')
    bykey = {r['proposalKey']: r for r in rows}
    V.require(len(reviewed) == len({r['proposalKey'] for r in reviewed}) == 103
              and {r['proposalKey'] for r in reviewed} == set(bykey), '103-row review identity mismatch')
    V.require(Counter(r['reviewStatus'] for r in reviewed) == {'PASS':92,'REVIEW':11}, 'Reviewer status counts mismatch')
    V.require(metadata['records'] == metadata['uniqueProposalKeys'] == 103
              and metadata['statusCounts'] == {'PASS':92,'REVIEW':11}, 'Metadata counts mismatch')
    original_a = {r['proposalKey']: r for r in author_reviews}
    for review in reviewed:
        row = bykey[review['proposalKey']]
        V.require(review['effectiveContentHash'] == row['effectiveContentHash'] == content_hash(row),
                  'Reviewer content hash mismatch: ' + row['proposalKey'])
        V.require(review['reviewerKind'] == 'INDEPENDENT_AI_SESSION'
                  and set(review['sourceEvidenceReferences']) == expected_review_references(row), 'Reviewer provenance/source reference mismatch')
        V.require(original_a[row['proposalKey']]['reviewedContentHash'] == row['effectiveContentHash'], 'Author A hash mismatch')
    matrix = Counter(original_a[r['proposalKey']]['assessment'] + '/' + r['reviewStatus'] for r in reviewed)
    V.require(dict(matrix) == EXPECTED_MATRIX, 'Cross-review reconciliation mismatch')
    return reviewed, original_a, dict(matrix)


def apply_overlay(rows, reviewer_rows, revisions):
    effective = copy.deepcopy(rows)
    bykey = {r['proposalKey']: r for r in effective}
    reviewer = {r['proposalKey']: r for r in reviewer_rows}
    V.require(len(revisions) == 4 and {r['sourceFindingId'] for r in revisions} == set(FIELDS), 'Four correction scope mismatch')
    evidence = []
    for revision in revisions:
        key, pointer = FIELDS[revision['sourceFindingId']]
        V.require((revision['proposalKey'], revision['fieldPointer']) == (key, pointer), 'Unauthorized revision field/key')
        row = bykey[key]
        V.require(revision['originalEffectiveContentHash'] == row['effectiveContentHash'] == reviewer[key]['effectiveContentHash'],
                  'Revision original hash mismatch')
        V.require(reviewer[key]['reviewStatus'] == 'REVIEW' and revision['sourceFindingId'] in reviewer[key]['reviewExplanationVi'],
                  'Revision finding is not bound to Reviewer B')
        V.require(revision['revisionProvenance'] == 'AUTHOR_A_AI_GENERATED_FORWARD_REVISION_NOT_REVIEWER_B_APPROVAL'
                  and revision['independentRecheck'] == 'PENDING' and len(revision['reasonVi']) >= 70, 'False/insufficient revision provenance')
        parent = row['content']['examples'][0] if pointer.endswith('/vi') else row['content']
        field = 'vi' if pointer.endswith('/vi') else 'grammarNotesEn'
        V.require(parent[field] == revision['before'], 'Revision BEFORE mismatch')
        V.require(revision['after'].strip() and revision['after'] != revision['before']
                  and not re.search(r'\b(TODO|TBD|placeholder)\b', revision['after'], re.I), 'Invalid AFTER')
        old_record = V.digest(row)
        parent[field] = revision['after']
        row['fieldHashes'] = {k: V.digest(v) for k,v in row['content'].items()}
        row['effectiveContentHash'] = content_hash(row)
        evidence.append({**revision, 'beforeFieldSha256': V.sha(revision['before'].encode()),
                         'afterFieldSha256': V.sha(revision['after'].encode()),
                         'parentRecordSha256': old_record, 'revisedRecordSha256': V.digest(row),
                         'revisedEffectiveContentHash': row['effectiveContentHash'], 'sourceEvidence': row['sourceEvidence']})
    return effective, evidence


def verify_coverage(queue, original_rows, sources):
    V.require(len(queue) == 6 and {r['candidateId'] for r in queue} == set(CANDIDATES), 'Six coverage candidates mismatch')
    byword = {r['headword']: r for r in original_rows}
    for candidate in queue:
        word = CANDIDATES[candidate['candidateId']]
        row = byword[word]
        V.require(candidate['headword'] == word and candidate['existingProposalKey'] == row['proposalKey']
                  and candidate['originalEffectiveContentHash'] == row['effectiveContentHash'], 'Coverage candidate binding mismatch')
        V.require(candidate['classification'] in {'STRONG_CANDIDATE','NEEDS_MORE_EVIDENCE','COVERED_BY_EXISTING_SENSE','NOT_SUPPORTED'}
                  and candidate['disposition'] == 'DEFERRED_OWNER_DECISION' and candidate['newSenseInserted'] is False
                  and candidate['ownerApproval'] is False and len(candidate['reasonVi']) >= 100, 'Unsafe/incomplete coverage disposition')
        V.require(candidate['sourceEvidence'] == row['sourceEvidence'] and candidate['sourceQuotes'], 'Coverage source reference mismatch')
        for quote in candidate['sourceQuotes']:
            refs = [r for r in row['sourceEvidence'] if r['corpus'] == quote['corpus'] and r['recordIndex'] == quote['recordIndex']]
            V.require(len(refs) == 1, 'Unlinked coverage evidence')
            raw = sources[quote['corpus']][quote['recordIndex']]
            V.validate_source_record(raw)
            V.require(quote['exactSourceText'] == raw['sourceFields'][quote['sourceField']], 'Coverage source quote mismatch')
    return queue


def build():
    original_files, original_manifest = V.build()
    V.require(original_manifest['fingerprint'] == ORIGINAL_FP
              and original_manifest['selectionFingerprint'] == COHORT_FP, 'Original checkpoint fingerprint drift')
    for name, data in original_files.items():
        V.require((V.CP / 'assembled' / name).read_bytes() == data, 'Original immutable artifact drift: ' + name)
    pins = V.load(R1 / 'authored/input-pins.json')
    for path, value in pins['workingSha256'].items():
        V.require(V.sha((V.ROOT / path).read_bytes()) == value, 'R1 input byte drift: ' + path)
    original = json.loads(original_files['new-sense-proposals.json'])['records']
    a_reviews = json.loads(original_files['editorial-reviews.json'])['records']
    b_reviews, a, matrix = verify_intake(original, a_reviews)
    effective, corrections = apply_overlay(original, b_reviews, V.load(R1 / 'authored/field-corrections.json')['records'])
    sources = V.inputs()[3]
    queue = verify_coverage(V.load(R1 / 'authored/deferred-coverage-queue.json')['records'], original, sources)
    V.require(len(effective) == 103 and {r['proposalKey'] for r in effective} == {r['proposalKey'] for r in original}
              and len({r['candidateGroupKey'] for r in effective}) == 100, 'Sense/group identity changed')
    for row in effective:
        V.require(row['partOfSpeech'] in V.POS and row['canonicalIdsAllocated'] == 0 and not row['formalApproval']
                  and row['rights'] == V.RIGHTS and row['contentStatus'] == 'DRAFT', 'Protected proposal state changed')
    old = V.inputs()[2]['records']
    original_projection = json.loads(original_files['cumulative-effective-draft-projection.json'])
    V.require(original_projection['records'][:1563] == old, 'Inherited records changed')
    projection = {**original_projection, 'revisionParentCheckpointFingerprint': ORIGINAL_FP, 'records': old + effective}
    V.require(len(projection['records']) == len({r['proposalKey'] for r in projection['records']}) == 1666
              and len({r['candidateGroupKey'] for r in projection['records']}) == 1120, 'Cumulative identity mismatch')
    copying = V.cross_source_copying(effective, sources)
    short = V.copying_checks(effective, sources)
    old_short = json.loads(original_files['validation-summary.json'])['sourceSimilarityFindings']
    V.require(short == old_short and len(short) == 4, 'Short-match history changed')
    bykey = {r['proposalKey']: r for r in effective}
    associations = []
    for review in b_reviews:
        key = review['proposalKey']; changed = bykey[key]['effectiveContentHash'] != review['effectiveContentHash']
        associations.append({'proposalKey': key, 'originalAuthorAReview': a[key], 'originalReviewerBReview': review,
                             'currentEffectiveContentHash': bykey[key]['effectiveContentHash'],
                             'reviewerBApplicability': 'ORIGINAL_CONTENT_ONLY_AWAITING_RECHECK' if changed else 'HASH_MATCHED_UNCHANGED_CONTENT',
                             'authorAOriginalReviewConcernRetained': a[key]['assessment'] == 'REVIEW',
                             'nonLexicalSimilarityEvidenceReferences': sorted(set(review['sourceEvidenceReferences']) - source_aliases(bykey[key])),
                             'independentRecheck': 'PENDING' if changed else 'NOT_REQUIRED_FOR_UNCHANGED_CONTENT'})
    sixty = bykey['EDITORIAL_2H2K:sixty:number-60']
    V.require(sixty['partOfSpeech'] == 'NUMBER', 'Sixty taxonomy changed')
    summary = {'phase': '2H.2K-R1', 'status': 'PENDING_INDEPENDENT_RECHECK', 'publicationReady': False,
               'independentRecheck': 'PENDING', 'blockingFindingIds': ['F01','F02'],
               'fieldCorrectionsApplied': 4, 'modifiedSensesAwaitingRecheck': 4,
               'reviewerBOriginalCounts': {'PASS':92,'REVIEW':11,'FAIL':0}, 'crossReviewCounts': matrix,
               'disagreements': sum(v for k,v in matrix.items() if k.split('/')[0] != k.split('/')[1]),
               'previousSensesPreserved': 1563, 'newSensesPreserved': 103, 'totalGroups':1120, 'totalDraftSenses':1666,
               'coverageCandidatesDeferred':6, 'coverageClassifications':dict(Counter(r['classification'] for r in queue)),
               'sixtyTaxonomyReview':'DRAFT_NUMBER_CANONICAL_MAPPING_UNRESOLVED', 'sourceSimilarityFindings':short,
               'copyingScreen':copying, 'historicalNeighborOverlap':'RETAINED_IN_SEALED_MANUSCRIPT_ABSENT_IN_EFFECTIVE_CONTENT',
               'reviewerProvenance':'OWNER_SUPPLIED_INDEPENDENT_AI_SESSION_DECLARATION_HASH_BOUND_NOT_CRYPTOGRAPHIC_AUTHENTICATION',
               'humanApprovals':0, 'canonicalIdsAllocated':0, 'rights':V.RIGHTS, 'contentStatus':'DRAFT',
               'releaseEligible':False, 'databaseAccess':'NONE', 'databaseWrites':'NONE'}
    objects = {'reconciliation.json':{'records':associations, 'counts':matrix},
               'field-correction-evidence.json':{'records':corrections}, 'deferred-coverage-queue.json':{'records':queue},
               'revised-new-sense-proposals.json':{'records':effective}, 'cumulative-effective-draft-projection.json':projection,
               'validation-summary.json':summary,
               'reviewer-b-recheck-handoff.json':{'independentRecheck':'PENDING', 'originalReportSha256':REPORT_SHA,
                    'changedSenses':[{'correction':r, 'originalReviewedSense':next(x for x in original if x['proposalKey']==r['proposalKey']),
                                     'revisedSense':bykey[r['proposalKey']]} for r in corrections],
                    'remainingReviewerBConcerns':[r for r in b_reviews if r['reviewStatus']=='REVIEW'],
                    'retainedAuthorAConcerns':[r for r in a_reviews if r['assessment']=='REVIEW'],
                    'deferredCoverageQueue':queue, 'sourceSimilarityFindings':short,
                    'instruction':'Independent Reviewer B must examine changed fields and surrounding Sense context; do not rebind original judgments or add Senses.'}}
    files = {n:V.encode(value) for n,value in objects.items()}
    handoff = '# Reviewer B recheck request — Phase 2H.2K-R1\n\nINDEPENDENT_RECHECK: PENDING\nPUBLICATION: BLOCKED_PENDING_RECHECK\n\n'
    for correction in corrections:
        handoff += '## '+correction['sourceFindingId']+' — '+correction['proposalKey']+'\n\n'
        handoff += 'Original reviewed hash: '+correction['originalEffectiveContentHash']+'\n\nRevised hash: '+correction['revisedEffectiveContentHash']+'\n\n'
        handoff += 'Field: '+correction['fieldPointer']+'\n\nBEFORE: '+correction['before']+'\n\nAFTER: '+correction['after']+'\n\nAuthor A: '+correction['reasonVi']+'\n\n'
    handoff += 'Read reviewer-b-recheck-handoff.json for complete original/revised Sense context, exact linked source references, all 11 original Reviewer B concerns, all 13 retained Author A concerns, six deferred coverage candidates and four short-match observations. Source quotes in the coverage queue are evidence only, not learner prose. No new Sense has been inserted. Sixty remains DRAFT NUMBER. The sealed neighbor overlap remains historical; effective content retains the prior forward revision.\n\nProvide an independent content-hash-bound recheck of each changed Sense. This request is not an independent approval. F01/F02 remain publication gates until recheck evidence is received. Do not start checkpoint 02 or remediation Batch 05.\n'
    files['reviewer-b-recheck-request.md'] = handoff.encode()
    manifest = {'phase':'2H.2K-R1', 'parentCheckpointFingerprint':ORIGINAL_FP, 'selectionFingerprint':COHORT_FP,
                'reviewerBOriginalReportSha256':REPORT_SHA, 'inputPinsSha256':V.sha((R1/'authored/input-pins.json').read_bytes()),
                'authoredOverlaySha256':V.sha((R1/'authored/field-corrections.json').read_bytes()),
                'coverageQueueSha256':V.sha((R1/'authored/deferred-coverage-queue.json').read_bytes()),
                'artifactHashes':{n:V.sha(b) for n,b in sorted(files.items())}, 'independentRecheck':'PENDING',
                'publicationReady':False, 'contentStatus':'DRAFT', 'rights':V.RIGHTS}
    manifest['fingerprint'] = V.digest(manifest)
    files['manifest.json'] = V.encode(manifest)
    return files, manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--assemble', action='store_true')
    mode.add_argument('--check', action='store_true')
    args = parser.parse_args()
    files, manifest = build()
    target = R1 / 'assembled'
    if args.check:
        V.require(target.is_dir() and {p.name for p in target.iterdir()} == set(files), 'R1 assembled scope drift')
        for name,data in files.items():
            V.require((target/name).read_bytes() == data, 'R1 replay byte drift: '+name)
    else:
        V.require(not target.exists(), 'Refusing to overwrite existing R1 snapshot')
        for name,data in files.items():
            V.write_new(target/name,data)
    print(json.dumps({'fingerprint':manifest['fingerprint'], 'independentRecheck':'PENDING', 'publicationReady':False,
                      'corrections':4, 'reviewRows':103, 'zeroWrites':args.check}))


if __name__ == '__main__':
    main()
