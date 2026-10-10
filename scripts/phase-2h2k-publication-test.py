#!/usr/bin/env python3
"""Reject stale/misbound verdicts and concealed changes before DRAFT publication."""
import copy
import importlib.util
import unittest

spec=importlib.util.spec_from_file_location('publication',__file__.replace('publication-test.py','publication.py'))
P=importlib.util.module_from_spec(spec)
spec.loader.exec_module(P)
V=P.V


class PublicationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.receipt=V.load(P.INTAKE)
        cls.original=V.load(V.CP/'assembled/new-sense-proposals.json')['records']
        cls.revised=V.load(P.R.R1/'assembled/revised-new-sense-proposals.json')['records']
        cls.corrections=V.load(P.R.R1/'assembled/field-correction-evidence.json')['records']
        cls.b=V.load(P.R.INTAKE/'reviewer-b-103-senses.json')['records']
        cls.a=V.load(V.CP/'assembled/editorial-reviews.json')['records']

    def bind(self,receipt=None,revised=None):
        return P.verify_recheck(receipt or self.receipt,self.original,revised or self.revised,self.corrections)

    def test_four_real_verdicts_and_99_unaffected_records(self):
        bindings,unchanged=self.bind()
        self.assertEqual(len(bindings),4)
        self.assertEqual(len(unchanged),99)
        self.assertTrue(all(x['reviewStatus']=='PASS' and x['humanApproval'] is False for x in bindings))

    def test_hash_matched_103_final_reviews_and_seven_concerns(self):
        bindings,_=self.bind()
        records,counts,matrix,remaining=P.integrate_reviews(self.b,self.a,self.revised,bindings,self.receipt)
        self.assertEqual(len(records),103)
        self.assertEqual(counts,{'PASS':96,'REVIEW':7,'FAIL':0})
        self.assertEqual(len(remaining),7)
        self.assertEqual(sum(r['authorAOriginalReviewConcernRetained'] for r in records),13)
        self.assertEqual(sum(matrix.values()),103)

    def test_wrong_original_review_hash_is_rejected(self):
        receipt=copy.deepcopy(self.receipt);receipt['records'][0]['originalReviewedContentHash']='0'*64
        with self.assertRaisesRegex(ValueError,'original hash mismatch'):self.bind(receipt)

    def test_wrong_revised_hash_is_rejected(self):
        receipt=copy.deepcopy(self.receipt);receipt['records'][0]['revisedEffectiveContentHash']='0'*64
        with self.assertRaisesRegex(ValueError,'revised hash mismatch'):self.bind(receipt)

    def test_wrong_field_and_before_after_are_rejected(self):
        for name,value,message in [('exactChangedFields',['/content/definitionEn'],'field/key mismatch'),
                                   ('before','invented original text','BEFORE/AFTER lineage mismatch'),
                                   ('after','invented revised text','BEFORE/AFTER lineage mismatch')]:
            receipt=copy.deepcopy(self.receipt);receipt['records'][0][name]=value
            with self.assertRaisesRegex(ValueError,message):self.bind(receipt)

    def test_pending_or_blocking_verdict_is_not_publication_ready(self):
        for field,value in [('reviewStatus','REVIEW'),('blocksDraftCheckpointPublication',True),('remainingIssue','unresolved')]:
            receipt=copy.deepcopy(self.receipt);receipt['records'][0][field]=value
            with self.assertRaisesRegex(ValueError,'does not resolve publication gate'):self.bind(receipt)

    def test_duplicate_or_missing_recheck_is_rejected(self):
        for records in [self.receipt['records'][:3],self.receipt['records'][:3]+[self.receipt['records'][0]]]:
            receipt=copy.deepcopy(self.receipt);receipt['records']=records
            with self.assertRaisesRegex(ValueError,'Four recheck identities mismatch'):self.bind(receipt)

    def test_unrelated_metadata_change_is_rejected(self):
        revised=copy.deepcopy(self.revised)
        next(r for r in revised if ':large:' in r['proposalKey'])['displayFormProposal']='different display'
        with self.assertRaisesRegex(ValueError,'Unrelated revised Sense fields changed'):self.bind(revised=revised)

    def test_changed_unaffected_sense_is_rejected(self):
        revised=copy.deepcopy(self.revised);revised[0]['displayFormProposal']='changed'
        with self.assertRaisesRegex(ValueError,'99 unaffected Senses changed'):self.bind(revised=revised)

    def test_bad_source_reference_is_rejected(self):
        receipt=copy.deepcopy(self.receipt);receipt['records'][0]['sourceEvidenceReferences'][0]='unrelated.json#/records/1'
        with self.assertRaisesRegex(ValueError,'local source reference mismatch'):self.bind(receipt)

    def test_forged_summary_cannot_override_actual_verdicts(self):
        bindings,_=self.bind();receipt=copy.deepcopy(self.receipt);receipt['reviewCountsAfterIntegration']={'PASS':103,'REVIEW':0,'FAIL':0}
        with self.assertRaisesRegex(ValueError,'Final effective QA counts mismatch'):
            P.integrate_reviews(self.b,self.a,self.revised,bindings,receipt)

    def test_coverage_risk_cannot_disappear_from_summary(self):
        bindings,_=self.bind();receipt=copy.deepcopy(self.receipt);receipt['remainingOldReviewItems']=receipt['remainingOldReviewItems'][:-1]
        with self.assertRaisesRegex(ValueError,'Seven remaining REVIEW identities mismatch'):
            P.integrate_reviews(self.b,self.a,self.revised,bindings,receipt)

    def test_original_review_cannot_be_rebound_to_new_content(self):
        bindings,_=self.bind();original=copy.deepcopy(self.b);original[0]['effectiveContentHash']='0'*64
        with self.assertRaisesRegex(ValueError,'Stale original review binding'):
            P.integrate_reviews(original,self.a,self.revised,bindings,self.receipt)


if __name__=='__main__':
    unittest.main(verbosity=2)
