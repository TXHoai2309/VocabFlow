"""Content-bound checkpoint 03, immutable lineage and zero-write regressions."""
import copy
import importlib.util
import subprocess
import sys
import unittest
from pathlib import Path

spec=importlib.util.spec_from_file_location('cp03',Path(__file__).with_name('phase-2h2i-aggregate-qa-checkpoint-03.py'))
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)


class Contracts(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.index=m.a.unique(m.load(m.a.WS/'effective-sense-index.json')['records'],'proposalKey')
        cls.receipt=m.load(m.WS/'resume-selection-receipt.json')
        cls.data=[m.load(m.WS/'authored'/n) for n in m.NAMES]

    def validate(self,data=None,receipt=None):
        return m.validate_decisions(self.index,receipt or self.receipt,*(data or self.data))

    def rejected(self,change):
        data=copy.deepcopy(self.data);change(data)
        with self.assertRaises((ValueError,KeyError)):self.validate(data)

    def test_actual_scope(self):
        r,c,g,b=self.validate();self.assertEqual((len(r),len(c),len(g),len(b)),(40,75,126,4))

    def test_review_original_order(self):
        self.assertEqual([r['inventoryOrdinal'] for r in self.receipt['reviews']],list(range(65,105)))

    def test_previous_review_not_repeated(self):
        old=m.load(m.PARENT/'review-triage-cumulative.json')['records']
        self.assertFalse(set(r['proposalKey'] for r in old if r['status']=='TRIAGED')&set(r['proposalKey'] for r in self.data[0]['records']))

    def test_previous_coverage_not_repeated(self):
        old=m.load(m.PARENT/'coverage-audit-cumulative.json')['groups']
        self.assertFalse(set(r['candidateGroupKey'] for r in old if r['status']=='ASSESSED')&set(r['candidateGroupKey'] for r in self.data[1]['records']))

    def test_all_remaining_warnings_prioritized(self):
        self.assertEqual(sum(bool(r['originalWarnings']) for r in self.receipt['coverage']),34)
        self.assertTrue(all(r['originalWarnings'] for r in self.receipt['coverage'][:34]))

    def test_review_missing(self):self.rejected(lambda d:d[0]['records'].pop())
    def test_review_duplicate(self):self.rejected(lambda d:d[0]['records'].append(d[0]['records'][0]))
    def test_review_stale(self):self.rejected(lambda d:d[0]['records'][0].update(effectiveContentHash='0'*64))
    def test_review_approval(self):self.rejected(lambda d:d[0]['records'][0].update(humanApproval=True))
    def test_review_overlay_evidence(self):self.rejected(lambda d:d[0]['records'][0].update(earlierOverlayEvidence=[{'invented':True}]))
    def test_coverage_missing_sense(self):self.rejected(lambda d:d[1]['records'][0]['inspectedProposalKeys'].clear())
    def test_coverage_stale(self):self.rejected(lambda d:d[1]['records'][0]['effectiveContentHashes'].clear())
    def test_coverage_source(self):self.rejected(lambda d:d[1]['records'][0].update(sourceEvidence=[]))
    def test_coverage_exhaustive(self):self.rejected(lambda d:d[1]['records'][0].update(exhaustiveLexicalCoverage=True))
    def test_coverage_rights(self):self.rejected(lambda d:d[1]['records'][0].update(rights='CLEARED'))
    def test_grammar_full_batch(self):self.rejected(lambda d:d[2]['records'].pop())
    def test_grammar_stale_note(self):self.rejected(lambda d:d[2]['records'][0].update(grammarNoteSha256='0'*64))
    def test_grammar_source(self):self.rejected(lambda d:d[2]['records'][0].update(sourceEvidence=[]))
    def test_grammar_history(self):self.rejected(lambda d:d[2]['records'][0].update(priorProposalId='invented'))
    def test_proposal_before(self):self.rejected(lambda d:d[3]['records'][0].update(before='invented'))
    def test_proposal_after_hash(self):self.rejected(lambda d:d[3]['records'][0].update(after='tampered'))
    def test_proposal_application(self):self.rejected(lambda d:d[3]['records'][0].update(applied=True))
    def test_proposal_duplicate(self):self.rejected(lambda d:d[3]['records'].append(d[3]['records'][0]))
    def test_proposal_confirmed_only(self):
        def change(d):
            key=d[3]['records'][0]['proposalKey']
            next(r for r in d[2]['records'] if r['proposalKey']==key)['classification']='VALID_LEARNER_GRAMMAR_NOTE'
        self.rejected(change)

    def test_uncertain_boundary_not_allocated(self):self.rejected(lambda d:d[3]['additionalBoundaryProposals'].append({'canonicalId':'fake'}))

    def test_old_proposals_not_duplicated(self):
        old,boundaries=m.previous_proposals()
        self.assertEqual((len(old),len(boundaries)),(30,7))
        self.assertFalse({r['proposalKey'] for r in old}&{r['proposalKey'] for r in self.data[3]['records']})

    def test_new_candidate_count_not_batch_member_count(self):
        self.assertEqual((len(self.receipt['grammarCandidateKeys']),len(self.data[2]['records'])),(26,126))
        old=m.load(m.PARENT/'grammar-commentary-audit.json')
        self.assertTrue(set(self.receipt['grammarCandidateKeys'])<=set(old['pendingDedicatedInspectionKeys']))

    def test_missing_metadata_not_automatic_gap(self):
        rows={r['candidateGroupKey']:r for r in self.data[1]['records']}
        self.assertEqual(rows['NORMALIZED_HEADWORD:foresee']['classification'],'NO_IDENTIFIED_SOURCE_SUPPORTED_GAP')
        self.assertEqual(rows['NORMALIZED_HEADWORD:stricken']['classification'],'SOURCE_METADATA_CONFLICT')
        self.assertEqual(rows['NORMALIZED_HEADWORD:last']['classification'],'SOURCE_METADATA_CONFLICT')
        self.assertEqual(rows['NORMALIZED_HEADWORD:mist']['classification'],'POSSIBLE_GAP')

    def test_parent_lineage_retained(self):
        rows=m.load(m.WS/'review-triage-cumulative.json')['records']
        previous=m.load(m.PARENT/'review-triage-cumulative.json')['records']
        for old,new in zip(previous,rows):
            if old['status']=='TRIAGED':self.assertEqual(old['newDecision'],new['newDecision'])
            self.assertEqual(new['historicalReviewStatus'],'REVIEW')

    def test_mutation_cli_rejected(self):
        for arg in ['--apply','--production','--database','--checkpoint=4']:
            result=subprocess.run([sys.executable,'-B',str(Path(m.__file__)),arg],capture_output=True)
            self.assertNotEqual(result.returncode,0)

    def test_zero_write_replay(self):
        before={p:m.sha(p) for p in m.WS.rglob('*') if p.is_file()}
        self.assertTrue(m.run(True)['zeroWrites'])
        self.assertEqual(before,{p:m.sha(p) for p in m.WS.rglob('*') if p.is_file()})


if __name__=='__main__':unittest.main()
