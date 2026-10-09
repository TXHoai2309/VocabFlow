#!/usr/bin/env python3
"""Terminal cohort, source coverage, preserved history and content-bound QA tests."""
import copy
import importlib.util
import subprocess
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

spec=importlib.util.spec_from_file_location('handoff',Path(__file__).with_name('phase-2h2h-checkpoint-05-handoff.py'))
h=importlib.util.module_from_spec(spec);spec.loader.exec_module(h);r=h.r


class Checkpoint05Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.objects,cls.report=h.assemble();cls.integrity=cls.objects['cohort-integrity.json'];cls.history=cls.objects['cumulative-qa-history.json']
        cls.parent=r.parent_state(5);cls.receipt=r.load(h.CP/'resume-selection-receipt.json')
        proposals=r.load(h.CP/'sense-proposals.json');cls.rows=proposals['senses'];cls.originals=proposals['originals']
        cls.qa=r.load(h.CP/'quality-audit.json')['senses'];cls.overlay=r.load(h.CP/'content-correction-overlays.json')
    def test_final_exact_prefix(self):self.assertEqual(self.receipt['candidateGroupKeys'],self.parent['pending'])
    def test_no_previous_group_overlap(self):self.assertFalse(set(self.receipt['candidateGroupKeys'])&set(self.parent['completed']))
    def test_no_rerank(self):
        bad=copy.deepcopy(self.receipt);bad['candidateGroupKeys'].reverse()
        with self.assertRaises(Exception):r.validate_receipt(bad,self.parent)
    def test_duplicate_group_rejected(self):
        bad=copy.deepcopy(self.receipt);bad['candidateGroupKeys'][0]=bad['candidateGroupKeys'][1]
        with self.assertRaises(Exception):r.validate_receipt(bad,self.parent)
    def test_all500_frozen_groups(self):
        c=r.load(h.CP/'checkpoint.json');frozen={g['candidateGroupKey'] for g in r.load(r.h.WS/'selected-cohort.json')['groups']}
        self.assertEqual(len(c['completedGroupKeys']),500);self.assertEqual(set(c['completedGroupKeys']),frozen)
    def test_terminal_no_pending(self):
        c=r.load(h.CP/'checkpoint.json');self.assertEqual(c['pendingGroupKeys'],[]);self.assertIsNone(c['nextCheckpointNumber']);self.assertEqual(c['lastBatch'],100)
    def test_no_checkpoint06(self):
        with self.assertRaises(Exception):r.location(6)
    def test_actual_corpus_counts(self):
        c=self.integrity['counts'];self.assertEqual((c['totalCorpusGroups'],c['remainingCorpusGroups'],c['previousTotalSenses'],c['newSenses'],c['totalSenses']),(1020,5123,1390,173,1563))
    def test_1390_exact_records(self):
        records={x['proposalKey']:x for x in r.load(h.CP/'effective-draft-projection.json')['records']}
        self.assertTrue(all(records[k]==v for k,v in self.parent['records'].items()))
    def test_cumulative_hashes(self):
        p=r.load(h.CP/'effective-draft-projection.json');self.assertEqual(p['contentHashes'],{x['proposalKey']:r.h.g.e.revision(x) for x in p['records']})
    def test_all_previous_review_objects_exact(self):
        for entry in self.history['checkpoints']:
            qa=r.load(r.ROOT/entry['sourcePath'])['senses'];self.assertEqual(entry['exactUnresolvedReviewRecords'],[x for x in qa if x['aiAssessment']=='REVIEW']);self.assertEqual(entry['allAssessments'],{q['proposalKey']:q['aiAssessment'] for q in qa});self.assertFalse(entry['reassessed'])
    def test_exhaustive_unresolved_review_index(self):
        expected=[{'checkpoint':x['checkpoint'],'record':q} for x in self.history['checkpoints'] for q in x['exactUnresolvedReviewRecords']]
        self.assertEqual(self.history['allUnresolvedReviewRecords'],expected)
    def test_cohort_750_unique_senses(self):self.assertEqual(self.integrity['cohortSenseCount'],750)
    def test_500_coverage_rows(self):self.assertEqual(len(self.integrity['coverage']),500)
    def test_no_exhaustive_sense_claim(self):self.assertTrue(all(not c['senseCoverageApproved'] for c in self.integrity['coverage']))
    def test_explicit_source_gaps(self):
        coverage={c['candidateGroupKey']:c for c in self.integrity['coverage']}
        for word in ['fiery','harness']:self.assertIn('EXPLICIT_UNREPRESENTED_MEANING',coverage['NORMALIZED_HEADWORD:'+word]['warnings'])
    def test_source_conflict_not_fabricated(self):
        for word,pos in [('fond','VERB'),('guilty','NOUN'),('forward','PREPOSITION'),('including','ADJECTIVE'),('therefore','CONJUNCTION')]:self.assertFalse(any(x['headword']==word and x['partOfSpeechProposal']==pos for x in self.rows))
    def test_supported_pos_and_ordinals(self):
        groups={g['candidateGroupKey']:g for g in r.load(r.h.WS/'selected-cohort.json')['groups']}
        for x in self.rows:
            g=groups[x['candidateGroupKey']];self.assertIn(x['partOfSpeechProposal'],g['normalizedPosCandidates']);self.assertTrue(set(x['oxfordGroupOrdinalsConsidered'])<={n for s in g['sourceEvidence'] for n in s['structuredOxfordSenseGroupOrdinals']})
    def test_twenty_cli_sealed_receipts(self):
        batches=r.load(h.CP/'quality-audit.json')['batches'];self.assertEqual([b['batch'] for b in batches],list(range(81,101)));self.assertEqual([k for b in batches for k in b['groupKeys']],self.receipt['candidateGroupKeys'])
    def test_effective_14_dimension_review_hashes(self):
        rows={x['proposalKey']:x for x in self.rows}
        for q in self.qa:
            self.assertEqual(set(q['review']['dimensions']),set(r.h.REVIEW_DIMENSIONS));self.assertEqual(q['review']['reviewedContentHash'],r.h.g.e.revision(rows[q['proposalKey']]));self.assertIsNone(q['review']['humanReviewer'])
    def test_bilingual_content_nonblank(self):
        with r.manuscript_workspace(h.CP):self.assertTrue(all(not r.h.c.structural_errors(x) for x in self.rows))
    def test_generated_field_hashes(self):
        for row in self.rows:
            for f in row['generatedProvenance']['fields']:
                obj=row
                for part in f['field'].strip('/').split('/'):obj=obj[int(part)] if isinstance(obj,list) else obj[part]
                self.assertEqual(f['sha256Utf8'],r.h.sha_text(obj))
    def test_overlay_replay_matches_effective_content(self):
        before=copy.deepcopy(self.originals);replayed=r.h.apply_corrections(self.originals,self.overlay['corrections'])
        effective={x['proposalKey']:x for x in self.rows}
        self.assertEqual(self.originals,before)
        for row in replayed:self.assertEqual(row['content'],effective[row['proposalKey']]['content'])
    def test_exact_parent_correction_rejected_on_drift(self):
        bad=copy.deepcopy(self.overlay['corrections']);bad[0]['parentContentHash']='0'*64
        with self.assertRaises(Exception):r.h.apply_corrections(self.originals,bad)
    def test_stale_reviewed_after_hash_rejected(self):
        bad=copy.deepcopy(self.overlay['corrections']);bad[0]['reviewedAfterContentHash']='0'*64
        with self.assertRaises(Exception):r.h.apply_corrections(self.originals,bad)
    def test_full_affected_batch_review(self):
        self.assertEqual([x['batch'] for x in self.overlay['reReviewedBatches']],[82,99]);self.assertEqual([len(x['reviewedContentHashes']) for x in self.overlay['reReviewedBatches']],[9,12])
    def test_all_original_bytes_still_bound(self):
        m=r.load(h.CP/'manifest.json');self.assertTrue(all(r.sha(h.CP/n)==sha for n,sha in m['authoredByteHashes'].items()))
    def test_parent_pins_and_exception(self):
        p=r.load(h.CP/'accepted-parent-byte-pins.json');self.assertEqual(len(p['files']),6795);r.validate_pins(p['files']);self.assertEqual(r.sha(r.ROOT/p['toolingSourceException']['path']),p['toolingSourceException']['afterSha256'])
    def test_rights_identity_approval_still_unresolved(self):
        self.assertFalse(self.integrity['releaseEligible']);self.assertEqual(self.integrity['rights'],'UNKNOWN_REVIEW_REQUIRED');self.assertEqual(self.integrity['humanApprovalsAdded'],0);self.assertEqual(self.integrity['canonicalIdsAllocated'],0)
    def test_frozen_hybrid_protected(self):
        state=r.load(h.CP/'validation-summary.json')['protectedState'];self.assertEqual(state,self.parent['protected'])
    def test_terminal_handoff_readonly(self):
        outputs={h.CP/n:r.encode(v) for n,v in self.objects.items()};outputs[h.CP/'final-cohort-handoff.md']=self.report
        with patch.object(Path,'write_text',side_effect=AssertionError('Unexpected write')):r.h.write_snapshot(outputs,True)
    def test_mutation_cli_rejected(self):
        for flag in ['--production','--database-url','--apply','--delete']:
            p=subprocess.run([sys.executable,'-B',str(Path(__file__).with_name('phase-2h2h-checkpoint-05-handoff.py')),flag],capture_output=True);self.assertEqual(p.returncode,2)


if __name__=='__main__':unittest.main()
