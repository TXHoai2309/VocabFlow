#!/usr/bin/env python3
"""Focused selection, immutable originals, queue and fail-closed regressions."""
import copy
import hashlib
import importlib.util
import os
import socket
import subprocess
import unittest
from collections import Counter
from pathlib import Path
from unittest.mock import patch

spec=importlib.util.spec_from_file_location('bulk',Path(__file__).with_name('phase-2h2d-bulk-editorial.py'))
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)

class BulkTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.out,cls.queue,cls.exports,cls.report=m.build()
        cls.rows=cls.out['sense-proposals.json']['senses'];cls.originals=cls.out['sense-proposals.json']['originals']
        cls.groups=m.load(m.WS/'selected-cohort.json')['groups'];cls.inventory=cls.queue['review-inventory.json']['records']
        cls.ledger,_,_,cls.prior=m.inputs();cls.overlays=m.load(m.WS/'content-correction-overlays.json')['corrections']

    def test_exact_300(self):self.assertEqual(len({g['candidateGroupKey'] for g in self.groups}),300)
    def test_prior_220_no_overlap(self):self.assertFalse({g['candidateGroupKey'] for g in self.groups}&{g['candidateGroupKey'] for g in self.prior})
    def test_bucket_50(self):self.assertEqual(Counter(m.bucket(g) for g in self.groups),dict.fromkeys(m.BUCKETS,50))
    def test_hash_rank(self):self.assertTrue(all(g['sha256Rank']==m.rank(g)[0] for g in self.groups))
    def test_selection_replay(self):self.assertEqual(m.select(self.ledger,self.prior)['selected-cohort.json']['groups'],self.groups)
    def test_annotations_excluded(self):self.assertFalse(any(m.annotation(g) for g in self.groups))
    def test_priors_pinned(self):self.assertEqual(len(m.inputs()[3]),220)
    def test_all_groups_authored(self):self.assertEqual({r['candidateGroupKey'] for r in self.rows},{g['candidateGroupKey'] for g in self.groups})
    def test_every_field(self):self.assertFalse(any(m.previous.structural_errors(r) for r in self.rows))
    def test_paired_examples(self):self.assertTrue(all(len(r['content']['examples'])==1 and all(r['content']['examples'][0].values()) for r in self.rows))
    def test_unique_sense_keys(self):self.assertEqual(len({r['proposalKey'] for r in self.rows}),len(self.rows))
    def test_no_ids(self):self.assertTrue(all(r['canonicalId'] is None and r['runtimeMapping'] is None for r in self.rows))
    def test_no_approval(self):self.assertTrue(all(r['ownerDecision']=='UNRESOLVED' and not r['publicationEligible'] for r in self.rows))
    def test_truthful_rights(self):self.assertTrue(all(r['sourceRights']==m.previous.RIGHTS for r in self.rows))
    def test_field_hashes(self):
        for r in self.rows:
            fields=dict(m.previous.pilot.content_fields(r),**{'/'+f:r[f] for f in ['displayFormProposal','lexicalUnitTypeProposal','partOfSpeechProposal']})
            for f in r['generatedProvenance']['fields']:self.assertEqual(f['sha256Utf8'],hashlib.sha256(fields[f['field']].encode()).hexdigest())
    def test_ordinal_coverage(self):self.assertFalse(any(r['unrepresentedOrdinals'] for r in self.out['quality-audit.json']['boundaryCoverage']))
    def test_all_ai_reviewed(self):self.assertEqual({r['proposalKey'] for r in self.out['editorial-review.json']['senses']},{r['proposalKey'] for r in self.rows})
    def test_review_is_not_human(self):self.assertTrue(all(r['humanReviewer'] is None for r in self.out['editorial-review.json']['senses']))
    def test_batches_bounded_and_hashed(self):
        for b in self.out['editorial-review.json']['batches']:
            self.assertLessEqual(b['groupCount'],5);self.assertEqual(m.sha(m.WS/b['path']),b['sha256'])
    def test_originals_preserved(self):
        r,_,_=m.read_batches(self.groups);self.assertEqual(r,self.originals)
        before=copy.deepcopy(r);m.apply_overlays(r,self.overlays);self.assertEqual(r,before)
    def test_overlays_different(self):self.assertTrue(all(c['before']!=c['after'] for c in self.overlays))
    def test_noop_rejected(self):
        bad=copy.deepcopy(self.overlays);bad[0]['after']=bad[0]['before']
        with self.assertRaises(ValueError):m.apply_overlays(self.originals,bad)
    def test_bad_before_rejected(self):
        bad=copy.deepcopy(self.overlays);bad[0]['before']='untrue before'
        with self.assertRaises(ValueError):m.apply_overlays(self.originals,bad)
    def test_duplicate_overlay_rejected(self):
        with self.assertRaises(ValueError):m.apply_overlays(self.originals,self.overlays+[self.overlays[0]])
    def test_owner_approval_overlay_rejected(self):
        bad=copy.deepcopy(self.overlays);bad[0]['ownerDecision']='OWNER_APPROVED'
        with self.assertRaises(ValueError):m.apply_overlays(self.originals,bad)
    def test_queue_exhaustive(self):self.assertEqual(len(self.inventory),342+len(self.rows))
    def test_queue_unique(self):self.assertEqual(len({r['proposalKey'] for r in self.inventory}),len(self.inventory))
    def test_prior_corrected_content_exact(self):
        older=m.load(m.ROOT/'vocabflow-dataset/workspaces/master-editorial-quality-corrections/corrected-pilot-preview.json')['senseProposals']+m.load(m.previous.WS/'sense-proposals.json')['senses']
        by={r['proposalKey']:r for r in self.inventory}
        for r in older:self.assertEqual(by[r['proposalKey']]['content'],r['content'])
    def test_queue_readiness_axes(self):self.assertTrue(all(r['readiness']['humanContentReview'] and r['readiness']['blockedByRights'] and not r['readiness']['fullyApproved'] for r in self.inventory))
    def test_priority_order(self):self.assertEqual([r['priority'] for r in self.inventory],sorted(r['priority'] for r in self.inventory))
    def test_exports_manageable(self):
        for n,t in self.exports.items():
            if n.endswith('.md'):self.assertLessEqual(t.count('\n## '),20);self.assertIn('KEEP / REVISE / MERGE / SPLIT / DEFER / REJECT',t)
    def test_release_ready_zero(self):self.assertEqual(self.queue['release-blockers.json']['releaseReadySenses'],0)
    def test_no_db_or_network(self):
        with patch.object(socket,'socket',side_effect=AssertionError('network forbidden')):
            result=m.build();self.assertEqual(result[0]['validation-summary.json']['databaseWrites'],'NONE')
    def test_offline_replay(self):m.run(True)
    def test_hashseed_replay(self):
        env=dict(os.environ,PYTHONHASHSEED='117',PYTHONDONTWRITEBYTECODE='1',PYTHONUTF8='1')
        p=subprocess.run(['python','-B',str(m.ROOT/'scripts/phase-2h2d-bulk-editorial.py'),'--check'],env=env,capture_output=True,text=True)
        self.assertEqual(p.returncode,0,p.stderr)
    def test_mutation_cli_rejected(self):
        p=subprocess.run(['python','-B',str(m.ROOT/'scripts/phase-2h2d-bulk-editorial.py'),'--apply','--production'],capture_output=True,text=True)
        self.assertEqual(p.returncode,2)
    def test_copy_examples_corrected(self):self.assertFalse(any('/examples/' in s['field'] for q in self.out['quality-audit.json']['senses'] for s in q['sourceSimilarity']))
    def test_escalation_recorded(self):self.assertIn('SOURCE_SIMILARITY',self.out['editorial-review.json']['escalation']['fullReviewStrata'])
    def test_specialist_priority(self):self.assertTrue(all(r['priority']==6 for r in self.inventory if r['candidateGroupKey']=='NORMALIZED_HEADWORD:indictment'))
    def test_empty_master_envelope_is_not_collision(self):
        dancer=next(r for r in self.inventory if r['candidateGroupKey']=='NORMALIZED_HEADWORD:dancer')
        self.assertIsNone(dancer['existingMasterCandidates']['lexemeIdReference']);self.assertEqual(dancer['priority'],1)
    def test_protected_snapshot(self):
        p=self.out['validation-summary.json']['protectedState'];self.assertTrue(p)
        self.assertFalse(any(m.previous.AUTH.values()))

if __name__=='__main__':unittest.main(verbosity=2)
