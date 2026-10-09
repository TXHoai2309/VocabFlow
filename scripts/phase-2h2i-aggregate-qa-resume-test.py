"""Focused additive lineage and fail-closed inspection-contract regressions."""
import copy
import importlib.util
import subprocess
import sys
import unittest
from pathlib import Path

spec=importlib.util.spec_from_file_location('resume',Path(__file__).with_name('phase-2h2i-aggregate-qa-resume.py'))
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class Contracts(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.index=m.a.unique(m.load(m.PARENT/'effective-sense-index.json')['records'],'proposalKey')
        cls.receipt=m.load(m.WS/'resume-selection-receipt.json')
        cls.data=[m.load(m.WS/'authored'/name) for name in ['review-decisions-batch-002.json','coverage-decisions-batch-002.json','expanded-grammar-inspections.json','new-correction-proposals.json']]

    def validate(self,data=None):
        return m.validate_decisions(self.index,self.receipt,*(data or self.data))

    def rejected(self,change):
        data=copy.deepcopy(self.data);change(data)
        with self.assertRaises((ValueError,KeyError)):self.validate(data)

    def test_actual_scope(self):
        r,c,g,b=self.validate();self.assertEqual((len(r),len(c),len(g),len(b)),(40,75,38,5))

    def test_next_review_order(self):
        self.assertEqual([r['inventoryOrdinal'] for r in self.receipt['reviews']],list(range(25,65)))

    def test_no_missing_review(self):self.rejected(lambda d:d[0]['records'].pop())
    def test_no_duplicate_review(self):self.rejected(lambda d:d[0]['records'].append(d[0]['records'][0]))
    def test_stale_review_hash(self):self.rejected(lambda d:d[0]['records'][0].update(effectiveContentHash='0'*64))
    def test_coverage_missing_sense(self):self.rejected(lambda d:d[1]['records'][0]['inspectedProposalKeys'].clear())
    def test_coverage_stale_hash(self):self.rejected(lambda d:d[1]['records'][0]['effectiveContentHashes'].clear())
    def test_no_exhaustive_claim(self):self.rejected(lambda d:d[1]['records'][0].update(exhaustiveLexicalCoverage=True))
    def test_no_fake_approval(self):self.rejected(lambda d:d[1]['records'][0].update(ownerApproval=True))
    def test_full_batch_required(self):self.rejected(lambda d:d[2]['records'].pop())
    def test_grammar_hash(self):self.rejected(lambda d:d[2]['records'][0].update(grammarNoteSha256='0'*64))
    def test_before_exact(self):self.rejected(lambda d:d[3]['records'][0].update(before='invented'))
    def test_after_hash(self):self.rejected(lambda d:d[3]['records'][0].update(after='tampered'))
    def test_no_application(self):self.rejected(lambda d:d[3]['records'][0].update(applied=True))
    def test_proposal_requires_confirmed_inspection(self):
        def mutate(d):
            key=d[3]['records'][0]['proposalKey'];next(r for r in d[2]['records'] if r['proposalKey']==key)['classification']='VALID_LEARNER_GRAMMAR_NOTE'
        self.rejected(mutate)
    def test_duplicate_proposal_id(self):self.rejected(lambda d:d[3]['records'][1].update(correctionProposalId=d[3]['records'][0]['correctionProposalId']))
    def test_no_canonical_allocation(self):self.rejected(lambda d:d[3]['additionalBoundaryProposals'][0].update(canonicalId='fake'))
    def test_no_invented_ordinal(self):self.rejected(lambda d:d[3]['additionalBoundaryProposals'][0].update(sourceOrdinalAllocated=True))
    def test_confirmed_gap_has_source(self):
        groups={r['candidateGroupKey']:r for r in self.data[1]['records']}
        for p in self.data[3]['additionalBoundaryProposals']:
            self.assertEqual(groups[p['candidateGroupKey']]['classification'],'CONFIRMED_GAP');self.assertTrue(p['sourceEvidence'])
    def test_source_conflict_not_new_physics_boundary(self):
        row=next(r for r in self.data[1]['records'] if r['candidateGroupKey']=='NORMALIZED_HEADWORD:dynamics')
        self.assertEqual(row['classification'],'SOURCE_METADATA_CONFLICT')
        self.assertNotIn(row['candidateGroupKey'],[p['candidateGroupKey'] for p in self.data[3]['additionalBoundaryProposals']])
    def test_keyword_is_not_defect(self):
        candidates=m.scan(self.index);self.assertTrue(candidates)
        self.assertTrue(all(r['status']=='CANDIDATE_ONLY_NOT_CONFIRMED' for r in candidates))
    def test_regex_false_positive_valid_boundary_note(self):
        row=next(r for r in self.data[2]['records'] if r['proposalKey']=='EDITORIAL_2H2C:zone:defined-area')
        self.assertEqual(row['classification'],'VALID_LEARNER_GRAMMAR_NOTE')
    def test_parent_proposals_and_history_remain_unapplied(self):
        p=m.load(m.PARENT/'correction-proposals.json');self.assertEqual((len(p['records']),len(p['additionalBoundaryProposals'])),(20,5))
        self.assertTrue(all(r['applied'] is False for r in p['records']))
    def test_mutation_cli_rejected(self):
        for arg in ['--apply','--production','--target=development']:
            p=subprocess.run([sys.executable,'-B',str(Path(m.__file__)),arg],capture_output=True)
            self.assertEqual(p.returncode,2)
    def test_unsupported_checkpoint_rejected(self):
        p=subprocess.run([sys.executable,'-B',str(Path(m.__file__)),'--checkpoint','3'],capture_output=True)
        self.assertEqual(p.returncode,2)


if __name__=='__main__':unittest.main()
