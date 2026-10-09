#!/usr/bin/env python3
"""Focused offline integrity tests for Phase 2H.2I checkpoint 05."""
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import unittest

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('checkpoint05',Path(__file__).with_name('phase-2h2i-aggregate-qa-checkpoint-05.py'))
m=importlib.util.module_from_spec(spec);sys.modules[spec.name]=m;spec.loader.exec_module(m)

class Checkpoint05Tests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.index,cls.parent_reviews,cls.parent_coverage,cls.parent_grammar=m.parents()
  cls.receipt=m.load(m.WS/'resume-selection-receipt.json')
  cls.reviews=m.load(m.WS/'authored/review-decisions-batch-005.json')['records']
  cls.coverage=m.load(m.WS/'authored/coverage-decisions-batch-005.json')['records']
  cls.grammar=m.load(m.WS/'authored/grammar-inspection-batch-005.json')
  cls.proposals=m.load(m.WS/'authored/new-correction-proposals.json')

 def test_01_remote_parent_and_checkpoint04_are_pinned(self):
  self.assertEqual(m.BASELINE,'9cac61f60b1c3dcff64fc66d3b3adf215aa0e29f');self.assertEqual(m.PIN,'524b064666d9538cb9774bd50f4a2bd63e82505e8f2a82232a4b59f4baf6724b')
 def test_02_complete_corpus_and_frozen_cohort_counts(self):
  self.assertEqual(len(self.index),1563);self.assertEqual(len(self.parent_coverage),500);self.assertEqual(sum(x['cohort'] for x in self.index.values()),750)
 def test_03_current_senses_remain_draft(self):
  self.assertTrue(all(x.get('status','DRAFT')=='DRAFT' for x in self.index.values()))
 def test_04_exact_42_remaining_review_records_and_order(self):
  self.assertEqual([x['proposalKey'] for x in self.reviews],[x['proposalKey'] for x in self.receipt['reviews']]);self.assertEqual([x['inventoryOrdinal'] for x in self.reviews],list(range(145,187)))
 def test_05_review_hashes_and_overlay_lineage_bind_to_effective_senses(self):
  for x in self.reviews:
   m.a.check_bound(x,self.index);q=self.index[x['proposalKey']]
   self.assertEqual(x['earlierOverlayEvidence'],[{'path':y['path'],'sha256':y['sha256'],'jsonPointer':y['jsonPointer']} for y in q['pinnedCorrectionLineage']])
 def test_06_review_is_triage_not_owner_or_human_approval(self):
  self.assertTrue(all(x['status']=='TRIAGED' and x['ownerApproval'] is False and x['humanApproval'] is False and x['rights']=='UNKNOWN_REVIEW_REQUIRED' for x in self.reviews))
 def test_07_current_review_fields_are_not_rewritten(self):
  self.assertTrue(all(x['currentLearnerFieldNeedsChange'] is False for x in self.reviews))
 def test_08_pound_overlay_is_preserved_as_exact_prior_evidence(self):
  x=next(x for x in self.reviews if x['proposalKey']=='EDITORIAL_2H2H:pound:weight-unit')
  self.assertEqual(len(x['earlierOverlayEvidence']),1);self.assertEqual(x['earlierOverlayEvidence'][0]['jsonPointer'],'/corrections/2')
 def test_09_exact_next_75_coverage_groups_and_order(self):
  self.assertEqual([x['candidateGroupKey'] for x in self.coverage],[x['candidateGroupKey'] for x in self.receipt['coverage']]);self.assertEqual(len(self.coverage),75)
 def test_10_every_selected_coverage_sense_is_hash_and_source_bound(self):
  for row in self.coverage:
   self.assertEqual(row['inspectedProposalKeys'],list(row['effectiveContentHashes']))
   senses=[x for x in self.index.values() if x['candidateGroupKey']==row['candidateGroupKey']]
   self.assertEqual(row['sourceEvidence'],[x['sourceEvidence'] for x in senses])
   for key,h in row['effectiveContentHashes'].items():self.assertEqual(self.index[key]['effectiveContentHash'],h)
 def test_11_original_warning_identities_are_preserved(self):
  original=m.load(m.a.WS/'sense-coverage-audit.json')['groups'];self.assertEqual(sum(bool(x.get('originalWarningRecord',{}).get('warnings')) for x in original),126)
  for row in self.coverage:self.assertEqual(row['originalWarnings'],original[row['originalGroupOrdinal']]['originalWarningRecord']['warnings'])
 def test_12_coverage_never_claims_exhaustiveness_or_approval(self):
  self.assertTrue(all(x['exhaustiveLexicalCoverage'] is False and x['ownerApproval'] is False and x['rights']=='UNKNOWN_REVIEW_REQUIRED' for x in self.coverage))
 def test_13_any_boundary_is_marked_unknown_not_overclaimed(self):
  row=next(x for x in self.coverage if x['candidateGroupKey']=='NORMALIZED_HEADWORD:any')
  self.assertEqual(row['classification'],'COVERAGE_UNKNOWN');self.assertIn('free-choice',row['explanationVi']);self.assertFalse(row['exhaustiveLexicalCoverage'])
 def test_14_exact_24_pending_dedicated_candidates_selected(self):
  self.assertEqual(len(self.receipt['grammarCandidateKeys']),24);self.assertEqual(set(self.receipt['grammarCandidateKeys']),set(self.parent_grammar['pendingDedicatedInspectionKeys']))
 def test_15_every_member_of_each_selected_original_batch_is_inspected(self):
  self.assertEqual([x['proposalKey'] for x in self.grammar['records']],self.receipt['grammarInspectionKeys']);self.assertEqual(len(self.grammar['records']),197)
  self.assertEqual(self.grammar['completeBatches'],self.receipt['grammarBatches'])
  for batch in self.receipt['grammarBatches']:self.assertEqual(m.sha(ROOT/batch['path']),batch['sha256'])
 def test_16_grammar_content_source_and_history_are_bound(self):
  fields,_=m.previous_proposals();ids={x['proposalKey']:x['correctionProposalId'] for x in fields}
  for row in self.grammar['records']:
   q=self.index[row['proposalKey']]
   self.assertEqual(row['effectiveContentHash'],self.receipt['grammarHashes'][row['proposalKey']])
   self.assertEqual(row['grammarNoteSha256'],m.a.text_sha(q['content']['grammarNotesEn']))
   self.assertEqual(set(row['inspectedFields']),set(q['content']))
   self.assertEqual(row['sourceEvidence'],q['sourceEvidence'])
   self.assertEqual(row['priorCorrectionEvidence'],[{'path':y['path'],'sha256':y['sha256'],'jsonPointer':y['jsonPointer']} for y in q['pinnedCorrectionLineage']])
   self.assertEqual(row['priorProposalId'],ids.get(row['proposalKey']))
 def test_17_full_batch_classifications_have_specific_nonempty_rationales(self):
  self.assertTrue(all(x['classification'] in m.GRAMMAR_CLASSES and x['explanationVi'] and x['ownerApproval'] is False for x in self.grammar['records']))
  self.assertEqual(sum(x['classification']=='CONFIRMED_PROCESS_COMMENTARY' for x in self.grammar['records']),25)
  self.assertEqual(sum(x['classification']=='VALID_LEARNER_GRAMMAR_NOTE' for x in self.grammar['records']),172)
 def test_18_candidate_outcomes_are_content_reviewed(self):
  rows=[x for x in self.grammar['records'] if x['proposalKey'] in self.receipt['grammarCandidateKeys']]
  self.assertEqual(len(rows),24);self.assertEqual(sum(x['classification']=='CONFIRMED_PROCESS_COMMENTARY' for x in rows),16)
  self.assertEqual(sum(x['classification']=='VALID_LEARNER_GRAMMAR_NOTE' for x in rows),8)
 def test_19_new_proposals_are_exact_additive_unapplied_field_changes(self):
  self.assertEqual(len(self.proposals['records']),23);self.assertEqual(self.proposals['additionalBoundaryProposals'],[])
  old,_=m.previous_proposals();old_ids={x['correctionProposalId'] for x in old};old_fields={(x['proposalKey'],x['field']) for x in old}
  for x in self.proposals['records']:
   q=self.index[x['proposalKey']]
   self.assertEqual(x['field'],'/content/grammarNotesEn');self.assertEqual(x['before'],q['content']['grammarNotesEn'])
   self.assertEqual(x['originalEffectiveContentHash'],q['effectiveContentHash'])
   self.assertEqual(x['beforeSha256'],m.a.text_sha(x['before']));self.assertEqual(x['afterSha256'],m.a.text_sha(x['after']))
   self.assertNotIn(x['correctionProposalId'],old_ids);self.assertNotIn((x['proposalKey'],x['field']),old_fields)
   self.assertFalse(x['applied']);self.assertFalse(x['ownerApproval']);self.assertTrue(x['fullBatchReReviewRequired'])
 def test_20_existing_warming_and_last_proposals_are_not_duplicated(self):
  new={x['proposalKey'] for x in self.proposals['records']};self.assertNotIn('EDITORIAL_2H2C:warming (n):becoming-warmer',new);self.assertNotIn('EDITORIAL_2H2H:last:final-in-order',new)
  old,_=m.previous_proposals();self.assertTrue(any(x['correctionProposalId']=='2H2I-P016' for x in old));self.assertTrue(any(x['correctionProposalId']=='2H2I-P001' for x in old))
 def test_21_no_rights_or_identity_approval_is_invented(self):
  self.assertTrue(all(x['rights']=='UNKNOWN_REVIEW_REQUIRED' for x in self.reviews))
  self.assertTrue(all(x['rights']=='UNKNOWN_REVIEW_REQUIRED' for x in self.coverage))
  self.assertTrue(all(x['rights']=='UNKNOWN_REVIEW_REQUIRED' for x in self.grammar['records']))
  self.assertTrue(all(x['ownerApproval'] is False for x in self.proposals['records']))
 def test_22_hypothetical_and_mutation_cli_arguments_are_rejected(self):
  for arg in ['--production','--apply-corrections','--database-write','--delete','--execute-migration-sql']:
   p=subprocess.run([sys.executable,'-B',str(Path(__file__).with_name('phase-2h2i-aggregate-qa-checkpoint-05.py')),arg],cwd=ROOT,capture_output=True,text=True,encoding='utf-8')
   self.assertNotEqual(p.returncode,0,arg)
 def test_23_scope_and_authorization_are_offline_only(self):
  self.assertEqual(m.a.AUTH['correctionProposalsApplied'],0);self.assertEqual(m.a.AUTH['ownerApprovalsAdded'],0);self.assertEqual(m.a.AUTH['databaseAccess'],'NONE');self.assertEqual(m.a.AUTH['databaseWrites'],'NONE');self.assertEqual(m.a.AUTH['production'],'UNTOUCHED')
 def test_24_historical_proposal_totals_are_additive(self):
  fields,bounds=m.previous_proposals();self.assertEqual((len(fields),len(bounds)),(117,7));self.assertEqual(len(fields)+len(self.proposals['records']),140)
 def test_25_selection_receipt_is_deterministic_and_parent_pinned(self):
  self.assertEqual(self.receipt,m.selection(self.index,self.parent_reviews,self.parent_coverage,self.parent_grammar));self.assertEqual(self.receipt['parentFingerprint'],m.PIN)
 def test_26_checkpoint05_replay_is_zero_write(self):
  result=m.run(True);self.assertTrue(result['zeroWrites']);self.assertEqual(result['fingerprint'],m.load(m.WS/'manifest.json')['fingerprint'])

if __name__=='__main__':unittest.main(verbosity=2)
