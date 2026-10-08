#!/usr/bin/env python3
"""Checkpoint-03 lineage, original review retention and correction regression."""
import copy
import importlib.util
import subprocess
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

spec=importlib.util.spec_from_file_location('handoff',Path(__file__).with_name('phase-2h2h-checkpoint-03-handoff.py'))
h=importlib.util.module_from_spec(spec);spec.loader.exec_module(h)
r=h.r


class Checkpoint03Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.objects,cls.report=h.assemble()
        cls.history=cls.objects['qa-history.json']
        cls.core=r.load(h.CP/'manifest.json')
        cls.summary=r.load(h.CP/'validation-summary.json')
        cls.rows=r.load(h.CP/'sense-proposals.json')['senses']
        cls.originals=r.load(h.CP/'sense-proposals.json')['originals']
        cls.parent=r.parent_state(3)
        cls.receipt=r.load(h.CP/'resume-selection-receipt.json')
        cls.projection=r.load(h.CP/'effective-draft-projection.json')
        cls.overlay=r.load(h.CP/'content-correction-overlays.json')

    def test_exact_receipt_prefix_and_orientation(self):
        self.assertEqual(self.receipt['candidateGroupKeys'],self.parent['pending'][:100])
        self.assertEqual([k.split(':',1)[1] for k in self.receipt['candidateGroupKeys'][:5]],['intense','privilege','submit','workout','creative'])
    def test_no_previous_completed_overlap(self):
        self.assertFalse(set(self.receipt['candidateGroupKeys'])&set(self.parent['completed']))
    def test_parent_pin(self):
        self.assertEqual(self.core['parentCheckpointFingerprint'],h.PARENT_PIN)
    def test_actual_coverage_counts(self):
        c=self.summary['counts']
        self.assertEqual((c['newGroups'],c['newSenses'],c['multiSenseGroups']),(100,140,32))
        self.assertEqual((c['cumulativeCohortAuthored'],c['cohortPending']),(300,200))
        self.assertEqual((c['totalCorpusGroups'],c['remainingCorpusGroups'],c['totalSenses']),(820,5323,1248))
    def test_exact_1108_parent_records(self):
        records={x['proposalKey']:x for x in self.projection['records']}
        self.assertEqual({k:records[k] for k in self.parent['records']},self.parent['records'])
    def test_all_1248_keys_and_hashes(self):
        records=self.projection['records'];self.assertEqual(len(records),len({x['proposalKey'] for x in records}))
        self.assertEqual(self.projection['contentHashes'],{x['proposalKey']:r.h.g.e.revision(x) for x in records})
    def test_previous_27_flags_exact_not_count_only(self):
        previous=r.load(r.location(2)/'quality-audit.json')['senses']
        flags=[x for x in previous if x['aiAssessment']=='REVIEW']
        self.assertEqual(len(flags),27)
        self.assertEqual(self.history['previousCheckpoint02ReviewFlags'],flags)
    def test_previous_all_assessments_preserved(self):
        previous=r.load(r.location(2)/'quality-audit.json')['senses']
        self.assertEqual(self.history['previousCheckpoint02AllAssessments'],{x['proposalKey']:x['aiAssessment'] for x in previous})
        self.assertFalse(self.history['previousFindingsReassessed'])
    def test_new_findings_separate_and_complete(self):
        new=self.history['newCheckpoint03ReviewFindings'];old=self.history['previousCheckpoint02ReviewFlags']
        self.assertEqual(len(new),57)
        self.assertFalse({x['proposalKey'] for x in new}&{x['proposalKey'] for x in old})
        qa=r.load(h.CP/'quality-audit.json')['senses']
        self.assertEqual(new,[x for x in qa if x['aiAssessment']=='REVIEW'])
    def test_prior_qa_history_evidence_hashes(self):
        self.assertEqual(len(self.history['priorQaEvidence']),7)
        self.assertTrue(all(r.sha(r.ROOT/x['path'])==x['sha256'] for x in self.history['priorQaEvidence']))
    def test_source_supported_pos_and_ordinals(self):
        groups={x['candidateGroupKey']:x for x in r.load(r.h.WS/'selected-cohort.json')['groups']}
        for row in self.rows:
            g=groups[row['candidateGroupKey']]
            self.assertIn(row['partOfSpeechProposal'],g['normalizedPosCandidates'])
            self.assertTrue(set(row['oxfordGroupOrdinalsConsidered'])<={n for ref in g['sourceEvidence'] for n in ref['structuredOxfordSenseGroupOrdinals']})
    def test_batch_sequence_41_through_60(self):
        batches=r.load(h.CP/'quality-audit.json')['batches']
        self.assertEqual([x['batch'] for x in batches],list(range(41,61)))
        self.assertTrue(all(len(x['groupKeys'])==5 for x in batches))
        self.assertEqual([k for x in batches for k in x['groupKeys']],self.receipt['candidateGroupKeys'])
    def test_explicit_decisions_and_manuscript_hashes(self):
        for batch in range(41,61):
            p=h.CP/f'authored/batch-{batch:03d}.psv';receipt=r.load(p.with_suffix('.json'))
            decisions=r.load(p.with_suffix('.review-decisions.json'))
            self.assertEqual(receipt['sha256'],r.sha(p))
            self.assertEqual({x['proposalKey']:x['assessment'] for x in receipt['reviews']},decisions['assessments'])
    def test_all_fourteen_effective_reviews_exact(self):
        bykey={x['proposalKey']:x for x in self.rows}
        for review in r.load(h.CP/'authored/effective-sense-review.json')['records']:
            self.assertEqual(set(review['dimensions']),set(r.h.REVIEW_DIMENSIONS))
            self.assertEqual(review['reviewedContentHash'],r.h.g.e.revision(bykey[review['proposalKey']]))
            self.assertEqual(review['reviewerKind'],'AI_SELF_REVIEW');self.assertIsNone(review['humanReviewer'])
    def test_fuse_is_only_supplied_cord_noun(self):
        fuse=[x for x in self.rows if x['headword']=='fuse'];self.assertEqual(len(fuse),1)
        self.assertEqual(fuse[0]['partOfSpeechProposal'],'NOUN');self.assertEqual(fuse[0]['oxfordGroupOrdinalsConsidered'],[])
    def test_ring_has_four_real_boundaries(self):
        ring=[x for x in self.rows if x['headword']=='ring'];self.assertEqual(len(ring),4)
        self.assertEqual({x['partOfSpeechProposal'] for x in ring},{'VERB','NOUN'})
        self.assertEqual(len({x['content']['definitionEn'] for x in ring}),4)
    def test_craft_represents_all_five_source_ordinals(self):
        craft=[x for x in self.rows if x['headword']=='craft'];self.assertEqual(len(craft),5)
        self.assertEqual({n for x in craft for n in x['oxfordGroupOrdinalsConsidered']},set(range(5)))
    def test_fourteen_overlays_and_exact_original_replay(self):
        self.assertEqual(len(self.overlay['corrections']),14)
        with r.manuscript_workspace(h.CP):corrected=r.h.apply_corrections(self.originals,self.overlay['corrections'])
        bykey={x['proposalKey']:x for x in corrected}
        self.assertTrue(all(x['content']==bykey[x['proposalKey']]['content'] for x in self.rows))
    def test_eight_full_batches_rereviewed(self):
        self.assertEqual({x['batch'] for x in self.overlay['reReviewedBatches']},{44,46,47,50,52,56,58,59})
        self.assertTrue(all(x['scope']=='ALL_SENSES_IN_BATCH' and len(x['note'])>100 for x in self.overlay['reReviewedBatches']))
    def test_foster_translation_no_added_gender(self):
        row=next(x for x in self.rows if x['proposalKey']=='EDITORIAL_2H2H:foster:temporary-child-care')
        self.assertIn('anh chị em của nhau',row['content']['examples'][0]['vi'])
    def test_competence_not_inflated_mastery(self):
        row=next(x for x in self.rows if x['headword']=='competence')
        self.assertNotIn('thành thạo',row['content']['meaningVi'])
        self.assertIn('câu hỏi',row['content']['examples'][0]['vi'])
    def test_october_display_keeps_original_identity(self):
        row=next(x for x in self.rows if x['headword']=='october')
        self.assertEqual(row['displayFormProposal'],'October')
        self.assertEqual(row['candidateGroupKey'],'NORMALIZED_HEADWORD:october')
    def test_deforestation_boundary_correction(self):
        row=next(x for x in self.rows if x['headword']=='deforestation')
        self.assertIn('non-forest use',row['content']['definitionEn'])
        self.assertIn('temporary harvesting',row['content']['grammarNotesEn'])
    def test_coupled_aisle_examples_same_location(self):
        row=next(x for x in self.rows if x['headword']=='aisle')
        self.assertIn('at the end',row['content']['examples'][0]['en'])
        self.assertIn('ở cuối',row['content']['examples'][0]['vi'])
    def test_no_structural_failures(self):
        with r.manuscript_workspace(h.CP):self.assertTrue(all(not r.h.c.structural_errors(x) for x in self.rows))
        self.assertEqual(self.summary['counts']['aiQa'],{'PASS':83,'REVIEW':57})
    def test_broken_parent_content_rejected(self):
        changed=copy.deepcopy(self.parent);key=next(iter(changed['records']));changed['records'][key]['content']['definitionEn']='Tampered parent'
        with patch.object(r,'parent_state',return_value=changed),patch.object(r,'run',return_value={'fingerprint':self.core['fingerprint']}):
            with self.assertRaises(ValueError):h.assemble()
    def test_old_review_flag_promotion_rejected(self):
        original_load=r.load
        def tampered(path):
            obj=copy.deepcopy(original_load(path))
            if path==r.location(2)/'quality-audit.json':
                next(x for x in obj['senses'] if x['aiAssessment']=='REVIEW')['aiAssessment']='PASS'
            return obj
        with patch.object(r,'load',side_effect=tampered),patch.object(r,'run',return_value={'fingerprint':self.core['fingerprint']}):
            with self.assertRaises(ValueError):h.assemble()
    def test_no_canonical_ids_or_approvals(self):
        self.assertTrue(all(x['canonicalId'] is None and x['runtimeMapping'] is None and not x['publicationEligible'] for x in self.rows))
        self.assertTrue(all(x['ownerDecision']=='UNRESOLVED' and x['identityClaim']=='NONE' for x in self.rows))
    def test_source_rights_still_unknown(self):
        self.assertTrue(all(x['sourceRights']=='UNKNOWN_REVIEW_REQUIRED' for x in self.rows))
        self.assertFalse(self.history['formalHumanApproval'])
    def test_all_parent_byte_pins_verified(self):
        pins=r.load(h.CP/'accepted-parent-byte-pins.json');self.assertEqual(len(pins['files']),6597);r.validate_pins(pins['files'])
    def test_next_prepare_is_not_executed(self):
        before={p.as_posix():r.sha(p) for p in r.WS.rglob('*') if p.is_file()}
        parent=r.parent_state(4);receipt=r.resume_receipt(parent,4)
        self.assertEqual((receipt['firstBatch'],receipt['lastBatch']),(61,80))
        self.assertEqual(len(parent['records']),1248)
        self.assertEqual(receipt['candidateGroupKeys'],self.parent['pending'][100:200])
        self.assertFalse(r.location(4).exists())
        self.assertEqual(before,{p.as_posix():r.sha(p) for p in r.WS.rglob('*') if p.is_file()})
    def test_sidecar_no_write_check(self):
        outputs={h.CP/n:r.encode(v) for n,v in self.objects.items()};outputs[h.CP/'editorial-handoff.md']=self.report
        with patch.object(Path,'write_text',side_effect=AssertionError('Unexpected write')):r.h.write_snapshot(outputs,True)
    def test_database_or_mutation_cli_rejected(self):
        for flag in ['--production','--database-url','--apply','--delete']:
            result=subprocess.run([sys.executable,'-B',str(Path(__file__).with_name('phase-2h2h-checkpoint-03-handoff.py')),flag],capture_output=True)
            self.assertEqual(result.returncode,2)


if __name__=='__main__':unittest.main()
