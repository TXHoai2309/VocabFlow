#!/usr/bin/env python3
"""Negative checks for stale review binding, scoped overlays and deferred coverage."""
import copy
import importlib.util
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('integration', __file__.replace('review-integration-test.py', 'review-integration.py'))
R = importlib.util.module_from_spec(spec)
spec.loader.exec_module(R)
V = R.V


class IntegrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.rows = V.load(V.CP/'assembled/new-sense-proposals.json')['records']
        cls.a = V.load(V.CP/'assembled/editorial-reviews.json')['records']
        cls.b = V.load(R.INTAKE/'reviewer-b-103-senses.json')['records']
        cls.corrections = V.load(R.R1/'authored/field-corrections.json')['records']
        cls.queue = V.load(R.R1/'authored/deferred-coverage-queue.json')['records']
        cls.sources = V.inputs()[3]

    def test_full_review_binding_and_actual_matrix(self):
        b, a, matrix = R.verify_intake(self.rows, self.a)
        self.assertEqual(sum(matrix.values()), 103)
        self.assertEqual(matrix, {'PASS/PASS':82, 'PASS/REVIEW':8, 'REVIEW/PASS':10, 'REVIEW/REVIEW':3})
        self.assertEqual(sum(x['assessment']=='REVIEW' for x in a.values()), 13)

    def test_changed_local_content_cannot_inherit_old_reviewer_judgment(self):
        rows = copy.deepcopy(self.rows)
        rows[0]['content']['meaningVi'] = 'altered semantic scope'
        rows[0]['effectiveContentHash'] = R.content_hash(rows[0])
        with self.assertRaisesRegex(ValueError, 'Reviewer content hash mismatch'):
            R.verify_intake(rows, self.a)

    def test_duplicate_review_and_inconsistent_transport_rejected(self):
        original = V.load
        def drift(path):
            value = original(path)
            if path.name == 'reviewer-b-103-senses.json':
                value['records'][1] = value['records'][0]
            return value
        with patch.object(V, 'load', side_effect=drift):
            with self.assertRaisesRegex(ValueError, 'TSV/JSON review mismatch'):
                R.verify_intake(self.rows, self.a)

    def test_unverified_checkpoint_metadata_rejected(self):
        original = V.load
        def drift(path):
            value = original(path)
            if path.name == 'handoff-metadata.json':
                value['checkpointFingerprintAsReviewed'] = '0'*64
            return value
        with patch.object(V, 'load', side_effect=drift):
            with self.assertRaisesRegex(ValueError, 'checkpoint identity mismatch'):
                R.verify_intake(self.rows, self.a)

    def test_overlay_preserves_every_unmodified_record_and_identity(self):
        before = copy.deepcopy(self.rows)
        effective, evidence = R.apply_overlay(self.rows, self.b, self.corrections)
        self.assertEqual(self.rows, before)
        self.assertEqual(len(evidence), 4)
        changed = {x['proposalKey'] for x in evidence}
        for original, revised in zip(self.rows, effective):
            self.assertEqual(original['proposalKey'], revised['proposalKey'])
            self.assertEqual(original['sourceEvidence'], revised['sourceEvidence'])
            if original['proposalKey'] not in changed:
                self.assertEqual(original, revised)
        self.assertTrue(all(x['independentRecheck']=='PENDING' for x in evidence))
        self.assertEqual(self.b, V.load(R.INTAKE/'reviewer-b-103-senses.json')['records'])

    def test_before_text_drift_rejected(self):
        corrections = copy.deepcopy(self.corrections)
        corrections[0]['before'] = 'incorrect before text'
        with self.assertRaisesRegex(ValueError, 'BEFORE mismatch'):
            R.apply_overlay(self.rows, self.b, corrections)

    def test_old_hash_rebinding_rejected(self):
        corrections = copy.deepcopy(self.corrections)
        corrections[0]['originalEffectiveContentHash'] = '0'*64
        with self.assertRaisesRegex(ValueError, 'original hash mismatch'):
            R.apply_overlay(self.rows, self.b, corrections)

    def test_unapproved_definition_and_pos_changes_rejected(self):
        for pointer in ['/content/definitionEn', '/partOfSpeech']:
            corrections = copy.deepcopy(self.corrections)
            corrections[0]['fieldPointer'] = pointer
            with self.assertRaisesRegex(ValueError, 'Unauthorized revision field/key'):
                R.apply_overlay(self.rows, self.b, corrections)

    def test_forged_independent_recheck_rejected(self):
        corrections = copy.deepcopy(self.corrections)
        corrections[0]['independentRecheck'] = 'PASS'
        with self.assertRaisesRegex(ValueError, 'revision provenance'):
            R.apply_overlay(self.rows, self.b, corrections)

    def test_missing_or_duplicate_correction_rejected(self):
        for records in [self.corrections[:3], self.corrections[:3]+[self.corrections[0]]]:
            with self.assertRaisesRegex(ValueError, 'Four correction scope mismatch'):
                R.apply_overlay(self.rows, self.b, records)

    def test_six_candidates_trace_source_and_stay_deferred(self):
        queue = R.verify_coverage(self.queue, self.rows, self.sources)
        self.assertEqual(len(queue), 6)
        self.assertEqual(sum(x['classification']=='STRONG_CANDIDATE' for x in queue), 5)
        self.assertEqual(queue[2]['classification'], 'NEEDS_MORE_EVIDENCE')
        self.assertEqual(queue[5]['existingSenseAssessment'], 'BOUNDARY_REVIEW_REQUIRED')

    def test_coverage_cannot_insert_sense_or_claim_owner_approval(self):
        for field in ['newSenseInserted','ownerApproval']:
            queue = copy.deepcopy(self.queue)
            queue[0][field] = True
            with self.assertRaisesRegex(ValueError, 'Unsafe/incomplete coverage'):
                R.verify_coverage(queue, self.rows, self.sources)

    def test_source_quote_tampering_rejected(self):
        queue = copy.deepcopy(self.queue)
        queue[0]['sourceQuotes'][0]['exactSourceText'] = 'invented source quotation'
        with self.assertRaisesRegex(ValueError, 'source quote mismatch'):
            R.verify_coverage(queue, self.rows, self.sources)

    def test_missing_candidate_rejected(self):
        with self.assertRaisesRegex(ValueError, 'Six coverage candidates mismatch'):
            R.verify_coverage(self.queue[:5], self.rows, self.sources)


if __name__ == '__main__':
    unittest.main(verbosity=2)
