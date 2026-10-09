#!/usr/bin/env python3
"""Focused tests for truthful partial audit, preservation and proposal gates."""
import copy
import importlib.util
import subprocess
import sys
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('aggregate_qa', Path(__file__).with_name('phase-2h2i-aggregate-qa.py'))
a = importlib.util.module_from_spec(spec)
spec.loader.exec_module(a)


class AggregateQaTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.outputs, cls.report = a.assemble()
        cls.index = {x['proposalKey']: x for x in cls.outputs['effective-sense-index.json']['records']}
        cls.counts = cls.outputs['validation-summary.json']['counts']
        cls.proposals = cls.outputs['correction-proposals.json']['records']

    def test_complete_effective_inventory(self):
        self.assertEqual(len(self.index), 1563)
        self.assertEqual(len({x['candidateGroupKey'] for x in self.index.values()}), 1020)

    def test_exact_current_content_and_hashes(self):
        current = a.load(a.CP/'effective-draft-projection.json')['records']
        self.assertTrue(all(self.index[x['proposalKey']]['content']==x['content'] and
                            self.index[x['proposalKey']]['effectiveContentHash']==a.revision(x) for x in current))

    def test_all_original_reviews_preserved(self):
        actual = [x['originalReview'] for x in self.outputs['review-triage.json']['records']]
        self.assertEqual(actual, a.load(a.CP/'cumulative-qa-history.json')['allUnresolvedReviewRecords'])
        self.assertEqual(len(actual), 187)

    def test_pending_is_not_triaged(self):
        rows = self.outputs['review-triage.json']['records']
        self.assertEqual(sum(x['status']=='TRIAGED' for x in rows), 25)
        self.assertEqual(sum(x['status']=='PENDING' and x['decision'] is None for x in rows), 162)
        self.assertFalse(any(x['priorFindingCleared'] for x in rows))

    def test_content_bound_decision_stale_hash_rejected(self):
        d = copy.deepcopy(self.outputs['pass-calibration-sample.json']['assessments']['records'][0])
        d['effectiveContentHash'] = '0'*64
        with self.assertRaisesRegex(ValueError, 'Stale'):
            a.check_bound(d, self.index)

    def test_full_coverage_warning_inventory(self):
        rows = self.outputs['sense-coverage-audit.json']['groups']
        self.assertEqual(len(rows), 500)
        self.assertEqual(sum(bool(x['originalWarningRecord']['warnings']) for x in rows), 126)

    def test_unassessed_coverage_remains_pending(self):
        self.assertEqual(self.counts['coverageGroupsAssessed'], 17)
        self.assertEqual(self.counts['coverageGroupsPending'], 483)
        self.assertEqual(self.counts['coverageWarningGroupsPending'], 109)

    def test_metadata_warning_not_manufactured_gap(self):
        rows = {x['candidateGroupKey']: x for x in self.outputs['sense-coverage-audit.json']['groups']}
        self.assertEqual(rows['NORMALIZED_HEADWORD:fond']['decision']['category'], 'SOURCE_METADATA_CONFLICT')
        self.assertEqual(rows['NORMALIZED_HEADWORD:further']['decision']['category'], 'SOURCE_METADATA_CONFLICT')
        self.assertEqual(rows['NORMALIZED_HEADWORD:unlike']['decision']['category'], 'POSSIBLE_GAP')

    def test_confirmed_gap_evidence_scope(self):
        rows = self.outputs['sense-coverage-audit.json']['groups']
        confirmed = [x['candidateGroupKey'] for x in rows if x['decision'] and x['decision']['category']=='CONFIRMED_GAP']
        self.assertEqual(set(confirmed), {'NORMALIZED_HEADWORD:'+x for x in ['hail','harness','fiery','instrumental','to']})

    def test_unknown_metadata_not_approved_exhaustiveness(self):
        self.assertEqual(self.counts['noStructuredOrdinalMetadataGroups'], 111)
        self.assertEqual(self.counts['coverageUnknownGroupsAssessed'], 0)
        self.assertFalse(any(x['senseCoverageApproved'] for x in self.outputs['sense-coverage-audit.json']['groups']))

    def test_sample_has_sixty_real_passes(self):
        sample = self.outputs['pass-calibration-sample.json']
        keys = sample['receipt']['cohortPassKeys']
        self.assertEqual(len(set(keys)), 60)
        self.assertTrue(all(self.index[k]['effectiveQaAssessment']=='PASS' and self.index[k]['cohort'] for k in keys))
        self.assertEqual(len(sample['assessments']['records']), 80)

    def test_sample_covers_available_strata(self):
        strata = self.outputs['pass-calibration-sample.json']['receipt']['coveredStrata']
        self.assertTrue(all('CEFR:'+x in strata for x in ['A1','A2','B1','B2','C1','C2']))
        self.assertEqual(sum(x.startswith('CHECKPOINT:') for x in strata), 5)
        self.assertEqual(sum(x.startswith('SOURCE:') for x in strata), 3)
        self.assertIn('TRANSLATION_COMPLEXITY', strata)
        self.assertIn('POLYSEMY', strata)
        self.assertIn('No final cohort PASS', self.outputs['pass-calibration-sample.json']['assessments']['sourceSimilarityPassStratum'])

    def test_prior_sample_uses_latest_corrected_successfully(self):
        key = 'EDITORIAL_2H2C:successfully:achieve-result'
        row = self.index[key]
        self.assertEqual(row['content']['grammarNotesEn'],
                         'Modifies an action to indicate that it achieves the intended result; success does not imply perfection.')
        self.assertTrue(any('draft-v2-session-01/applied-corrections.json' in x['path'] for x in row['pinnedCorrectionLineage']))
        self.assertIn(key, self.outputs['pass-calibration-sample.json']['receipt']['priorKeys'])

    def test_prior_approval_gate_corrections_in_lineage(self):
        row = self.index['EDITORIAL_2H2B:abundant:plentiful']
        self.assertTrue(any('master-editorial-approval-gate/' in x['path'] for x in row['pinnedCorrectionLineage']))

    def test_prior_pilot_and_qa1_findings_not_lost(self):
        refs = self.index['EDITORIAL_2H2B:a, an:indefinite']['pinnedHistoricalQaReferences']
        self.assertTrue(any('pilot-quality-audit.json' in x['path'] for x in refs))
        self.assertTrue(any('correction-quality-audit.json' in x['path'] for x in refs))

    def test_prior_automatic_flags_not_labelled_ai_review(self):
        row = self.index['EDITORIAL_2H2B:a, an:indefinite']
        self.assertIsNone(row['effectiveAiReview'])
        self.assertIsNotNone(row['rawEffectiveQaFindings'])
        self.assertIsNotNone(row['editorialFieldProvenance'])

    def test_original_prior_author_notes_separate_from_approval(self):
        row = self.index['EDITORIAL_2H2C:successfully:achieve-result']
        self.assertTrue(row['originalAuthorReview'])
        self.assertTrue(row['originalReviewIsNotCurrentContentApproval'])
        notes = self.index['EDITORIAL_2H2D:component:part']['originalAuthorReview']
        self.assertEqual(notes[0]['exactRecord']['reviewerKind'], 'AI_SELF_REVIEW')

    def test_before_after_exact_hashes(self):
        self.assertEqual(len(self.proposals), 20)
        for p in self.proposals:
            a.validate_proposal(p, self.index)

    def test_stale_proposal_parent_rejected(self):
        p = copy.deepcopy(self.proposals[0]); p['originalEffectiveContentHash'] = '0'*64
        with self.assertRaisesRegex(ValueError, 'Stale correction parent'):
            a.validate_proposal(p, self.index)

    def test_before_mismatch_rejected(self):
        p = copy.deepcopy(self.proposals[0]); p['before'] += ' edited'
        with self.assertRaisesRegex(ValueError, 'BEFORE drift'):
            a.validate_proposal(p, self.index)

    def test_after_hash_mismatch_rejected(self):
        p = copy.deepcopy(self.proposals[0]); p['afterSha256'] = '0'*64
        with self.assertRaisesRegex(ValueError, 'field hash drift'):
            a.validate_proposal(p, self.index)

    def test_applied_or_approved_proposal_rejected(self):
        for field in ['applied','ownerApproval']:
            p = copy.deepcopy(self.proposals[0]); p[field] = True
            with self.assertRaisesRegex(ValueError, 'Unauthorized'):
                a.validate_proposal(p, self.index)

    def test_additional_boundary_proposals_no_ids(self):
        proposals = self.outputs['correction-proposals.json']['additionalBoundaryProposals']
        self.assertEqual(len(proposals), 5)
        self.assertTrue(all(x['canonicalId'] is None and not x['proposalKeyAllocated'] and
                            not x['approved'] and not x['applied'] for x in proposals))

    def test_minor_hygiene_not_mistranslation(self):
        self.assertEqual(self.counts['confirmedContentDefects'], 20)
        self.assertEqual(self.counts['confirmedTranslationDefects'], 0)
        self.assertEqual(self.counts['confirmedGrammarSyntaxDefects'], 0)
        self.assertEqual(self.counts['passCalibrationDefectsFound'], 2)
        self.assertEqual(self.counts['priorSampleDefectsFound'], 16)

    def test_escalation_remains_pending(self):
        self.assertEqual(self.outputs['authoring-qa-lessons.json']['escalation']['status'], 'PENDING')
        self.assertEqual(self.outputs['manifest.json']['status'], 'PARTIAL')
        self.assertIn('483', self.report)

    def test_queue_counts_without_inferred_critical_failures(self):
        queue = self.outputs['prioritized-remediation-queue.json']
        self.assertEqual(queue['counts']['P0'], 0)
        self.assertEqual(queue['counts']['P1'], 5)
        self.assertEqual(len(queue['pendingReviewKeys']), 162)
        self.assertEqual(len(queue['pendingCoverageKeys']), 483)

    def test_every_queue_item_is_actionable_and_rights_separate(self):
        for item in self.outputs['prioritized-remediation-queue.json']['items']:
            for key in ['recordIdentity','severity','action','evidence','dependency','rightsGate']:
                self.assertTrue(item[key])
            self.assertIsInstance(item['canUseFutureVersionedDraftOverlay'], bool)

    def test_no_human_or_rights_approval_added(self):
        self.assertTrue(all(x['humanReviewEvidence'] is None and x['rights']=='UNKNOWN_REVIEW_REQUIRED'
                            for x in self.index.values()))
        self.assertEqual(a.AUTH['ownerApprovalsAdded'], 0)
        self.assertEqual(a.AUTH['databaseAccess'], 'NONE')
        self.assertFalse(a.AUTH['masterReleaseChanged'])

    def test_duplicate_key_rejected(self):
        with self.assertRaisesRegex(ValueError, 'Duplicate'):
            a.unique([{'key':1},{'key':1}], 'key')

    def test_mutation_cli_rejected(self):
        for arg in ['--apply','--production','--import','--approve','--delete']:
            result = subprocess.run([sys.executable,'-B',str(Path(a.__file__)),arg],
                                    capture_output=True, text=True)
            self.assertEqual(result.returncode, 2)

    def test_deterministic_fingerprint_and_zero_write_replay(self):
        before = {p: a.sha(p) for base in [a.WS, a.CP] for p in base.rglob('*') if p.is_file()}
        first = a.run(True)
        second = a.run(True)
        self.assertEqual(first, second)
        self.assertEqual(before, {p: a.sha(p) for p in before})
        self.assertEqual(first, self.outputs['manifest.json'])


if __name__ == '__main__':
    unittest.main(verbosity=2)
