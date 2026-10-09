#!/usr/bin/env python3
"""Focused, offline tests for additive Phase 2H.2I checkpoint 04."""
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import unittest

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('checkpoint04',Path(__file__).with_name('phase-2h2i-aggregate-qa-checkpoint-04.py'))
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)

class Checkpoint04Tests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.index,cls.parent_reviews,cls.parent_coverage,cls.parent_grammar=m.parents()
  cls.receipt=m.load(m.WS/'resume-selection-receipt.json')
  cls.reviews=m.load(m.WS/'authored/review-decisions-batch-004.json')['records']
  cls.coverage=m.load(m.WS/'authored/coverage-decisions-batch-004.json')['records']
  cls.grammar=m.load(m.WS/'authored/grammar-inspection-batch-004.json')
  cls.proposals=m.load(m.WS/'authored/new-correction-proposals.json')

 def test_01_pinned_remote_parent(self): self.assertEqual(m.BASELINE,'09e0c4b684f2f81028680d5a78ad5bd680224a7b')
 def test_02_pinned_checkpoint03(self): self.assertEqual(m.PIN,'d5e87509822821b74b0588a5d99f2168a5db47c59299192d540ace84315b0b71')
 def test_03_corpus_1563(self): self.assertEqual(len(self.index),1563)
 def test_04_all_current_senses_draft(self): self.assertTrue(all(x.get('status','DRAFT')=='DRAFT' for x in self.index.values()))
 def test_05_original_review_inventory_preserved(self): self.assertEqual(len(self.parent_reviews),187)
 def test_06_previous_review_triage_count(self): self.assertEqual(sum(x['status']=='TRIAGED' for x in self.parent_reviews),105)
 def test_07_exact_next_40_review_selection(self): self.assertEqual([x['proposalKey'] for x in self.reviews],[x['proposalKey'] for x in self.receipt['reviews']]);self.assertEqual(len(self.reviews),40)
 def test_08_review_identities_unique(self): self.assertEqual(len({x['proposalKey'] for x in self.reviews}),40)
 def test_09_review_hashes_current(self):
  for x in self.reviews:m.a.check_bound(x,self.index)
 def test_10_review_overlay_history_bound(self):
  for x in self.reviews:
   expected=[{'path':q['path'],'sha256':q['sha256'],'jsonPointer':q['jsonPointer']} for q in self.index[x['proposalKey']]['pinnedCorrectionLineage']]
   self.assertEqual(x['earlierOverlayEvidence'],expected)
 def test_11_review_remains_ai_triage_not_human_approval(self):
  self.assertTrue(all(x['status']=='TRIAGED' and x['humanApproval'] is False and x['ownerApproval'] is False and x['rights']=='UNKNOWN_REVIEW_REQUIRED' for x in self.reviews))
 def test_12_review_history_not_marked_pass(self): self.assertTrue(all(x['currentLearnerFieldNeedsChange'] is False for x in self.reviews))
 def test_13_original_coverage_inventory_preserved(self): self.assertEqual(len(self.parent_coverage),500)
 def test_14_previous_coverage_count(self): self.assertEqual(sum(x['status']=='ASSESSED' for x in self.parent_coverage),167)
 def test_15_original_warning_identities_preserved(self):
  original=m.load(m.a.WS/'sense-coverage-audit.json')['groups'];self.assertEqual(sum(bool(x.get('originalWarningRecord',{}).get('warnings')) for x in original),126)
 def test_16_exact_next_75_selection(self): self.assertEqual([x['candidateGroupKey'] for x in self.coverage],[x['candidateGroupKey'] for x in self.receipt['coverage']]);self.assertEqual(len(self.coverage),75)
 def test_17_coverage_identities_unique(self): self.assertEqual(len({x['candidateGroupKey'] for x in self.coverage}),75)
 def test_18_every_selected_coverage_sense_bound(self):
  for row in self.coverage:
   for key,h in row['effectiveContentHashes'].items():self.assertEqual(self.index[key]['effectiveContentHash'],h)
 def test_19_coverage_has_source_and_sense_evidence(self):
  for row in self.coverage:self.assertEqual(row['inspectedProposalKeys'],list(row['effectiveContentHashes']));self.assertEqual(row['sourceEvidence'],[x['sourceEvidence'] for x in self.index.values() if x['candidateGroupKey']==row['candidateGroupKey']])
 def test_20_coverage_never_claims_exhaustive(self): self.assertTrue(all(x['exhaustiveLexicalCoverage'] is False for x in self.coverage))
 def test_21_coverage_categories_are_allowed(self): self.assertTrue(all(x['classification'] in m.COVERAGE_CLASSES for x in self.coverage))
 def test_22_waste_translation_finding_is_exact_and_unapplied(self):
  row=next(x for x in self.coverage if x['candidateGroupKey']=='NORMALIZED_HEADWORD:waste');finding=row['confirmedContentFindings'][0];self.assertEqual(finding['before'],self.index[finding['proposalKey']]['content']['examples'][0]['vi']);self.assertNotEqual(finding['before'],finding['after'])
 def test_23_at_least_25_distinct_new_candidates(self): self.assertGreaterEqual(len(set(self.grammar['newCandidateKeys'])),25)
 def test_24_new_candidates_were_pending(self): self.assertTrue(set(self.grammar['newCandidateKeys'])<=set(self.parent_grammar['pendingDedicatedInspectionKeys']))
 def test_25_all_full_batch_members_inspected(self): self.assertEqual([x['proposalKey'] for x in self.grammar['records']],self.receipt['grammarInspectionKeys']);self.assertEqual(len(self.grammar['records']),126)
 def test_26_original_batch_hashes_match(self):
  for b in self.receipt['grammarBatches']:self.assertEqual(m.sha(m.ROOT/b['path']),b['sha256'])
 def test_27_grammar_records_bind_notes_and_source(self):
  for x in self.grammar['records']:
   q=self.index[x['proposalKey']];self.assertEqual(x['grammarNoteSha256'],m.a.text_sha(q['content']['grammarNotesEn']));self.assertEqual(x['sourceEvidence'],q['sourceEvidence']);self.assertEqual(set(x['inspectedFields']),set(q['content']))
 def test_28_grammar_classification_allowlist(self): self.assertTrue(all(x['classification'] in m.GRAMMAR_CLASSES for x in self.grammar['records']))
 def test_29_prior_field_proposal_history_82_and_boundary_7(self):
  fields,bounds=m.previous_proposals();self.assertEqual((len(fields),len(bounds)),(82,7))
 def test_30_new_proposal_ids_unique_and_additive(self):
  rows=self.proposals['records'];self.assertEqual(len({x['correctionProposalId'] for x in rows}),len(rows));self.assertEqual(len({x['proposalKey'] for x in rows}),len(rows));self.assertTrue(all(x['correctionProposalId'].startswith('2H2I-R3-P') for x in rows))
 def test_31_corrections_are_unapplied_and_unapproved(self): self.assertTrue(all(x['applied'] is False and x['ownerApproval'] is False for x in self.proposals['records']))
 def test_32_no_boundary_or_canonical_approval_added(self): self.assertEqual(self.proposals['additionalBoundaryProposals'],[]);self.assertTrue(all(x['ownerApproval'] is False for x in self.grammar['records']))
 def test_33_only_supported_correction_fields(self): self.assertTrue(all(x['field']=='/content/grammarNotesEn' or x['field']=='/content/examples/0/vi' for x in self.proposals['records']))
 def test_34_parent_content_staleness_fails_closed(self):
  row=dict(self.reviews[0]);row['effectiveContentHash']='0'*64
  with self.assertRaises(ValueError):m.a.check_bound(row,self.index)
 def test_35_production_and_mutation_cli_args_rejected(self):
  for arg in ['--production','--apply-corrections','--database-write','--execute-migration-sql']:
   x=subprocess.run([sys.executable,'-B',str(Path(__file__).with_name('phase-2h2i-aggregate-qa-checkpoint-04.py')),arg],cwd=ROOT,capture_output=True,text=True,encoding='utf-8')
   self.assertNotEqual(x.returncode,0,arg)
 def test_36_thirteen_complete_batches_are_reported(self):
  self.assertEqual(len(self.receipt['grammarBatches']),13);self.assertTrue(all(len(x['inspectionKeys'])>0 for x in self.receipt['grammarBatches']))
 def test_37_zero_write_deterministic_replay(self):
  result=m.run(True);self.assertTrue(result['zeroWrites']);self.assertEqual(result['fingerprint'],m.load(m.WS/'manifest.json')['fingerprint'])

if __name__=='__main__':unittest.main(verbosity=2)
