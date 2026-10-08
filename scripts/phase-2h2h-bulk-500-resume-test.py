#!/usr/bin/env python3
"""Fail-closed continuation, exact lineage, reviews and immutable replay tests."""
import copy
import importlib.util
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

spec=importlib.util.spec_from_file_location('resume',Path(__file__).with_name('phase-2h2h-bulk-500-resume.py'))
r=importlib.util.module_from_spec(spec);spec.loader.exec_module(r)

class ResumeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.objects,cls.report=r.build(2)
        cls.parent=r.parent_state(2)
        cls.path=r.location(2)
        cls.receipt=r.load(cls.path/'resume-selection-receipt.json')
        cls.rows=cls.objects['sense-proposals.json']['senses']
        cls.originals=cls.objects['sense-proposals.json']['originals']
        cls.counts=cls.objects['validation-summary.json']['counts']
        cls.projection={x['proposalKey']:x for x in cls.objects['effective-draft-projection.json']['records']}

    def test_exact_prefix_not_reselection(self):
        self.assertEqual(self.receipt['candidateGroupKeys'],self.parent['pending'][:100])
        self.assertEqual(self.receipt['expectedRemainingKeys'],self.parent['pending'][100:])
    def test_reordered_prefix_rejected(self):
        keys=self.receipt['candidateGroupKeys'][:];keys.reverse()
        with self.assertRaises(ValueError):r.extend(self.parent,self.rows,keys)
    def test_duplicate_group_rejected(self):
        keys=self.receipt['candidateGroupKeys'][:];keys[-1]=keys[0]
        with self.assertRaises(ValueError):r.extend(self.parent,self.rows,keys)
    def test_foreign_group_rejected(self):
        rows=copy.deepcopy(self.rows);rows[0]['candidateGroupKey']='GROUP:foreign'
        with self.assertRaises(ValueError):r.extend(self.parent,rows,self.receipt['candidateGroupKeys'])
    def test_missing_group_rejected(self):
        rows=[x for x in self.rows if x['candidateGroupKey']!=self.rows[0]['candidateGroupKey']]
        with self.assertRaises(ValueError):r.extend(self.parent,rows,self.receipt['candidateGroupKeys'])
    def test_duplicate_sense_rejected(self):
        with self.assertRaises(ValueError):r.extend(self.parent,self.rows+[self.rows[0]],self.receipt['candidateGroupKeys'])
    def test_receipt_source_corruption_rejected(self):
        receipt=copy.deepcopy(self.receipt);receipt['sourceEvidence'][receipt['candidateGroupKeys'][0]]=[]
        with self.assertRaises(ValueError):r.validate_receipt(receipt,self.parent)
    def test_receipt_parent_corruption_rejected(self):
        receipt=copy.deepcopy(self.receipt);receipt['parentCheckpointFingerprint']='bad'
        with self.assertRaises(ValueError):r.validate_receipt(receipt,self.parent)
    def test_exhaustive_frozen_partition(self):
        cp=self.objects['checkpoint.json'];completed=set(cp['completedGroupKeys']);pending=set(cp['pendingGroupKeys'])
        frozen={x['candidateGroupKey'] for x in r.load(r.h.WS/'selected-cohort.json')['groups']}
        self.assertFalse(completed&pending);self.assertEqual(completed|pending,frozen)
        self.assertEqual((len(completed),len(pending)),(200,300))
    def test_actual_corpus_counts(self):
        self.assertEqual((self.counts['totalCorpusGroups'],self.counts['remainingCorpusGroups']),(720,5423))
        self.assertEqual((self.counts['previousTotalSenses'],self.counts['newSenses'],self.counts['totalSenses']),(960,148,1108))
    def test_parent_records_exact_not_just_text(self):
        self.assertEqual({k:self.projection[k] for k in self.parent['records']},self.parent['records'])
    def test_parent_content_hashes_preserved(self):
        hashes=self.objects['effective-draft-projection.json']['contentHashes']
        self.assertTrue(all(hashes[k]==r.h.g.e.revision(v) for k,v in self.parent['records'].items()))
    def test_all_accepted_bytes_preserved(self):
        pins=r.load(r.WS/'accepted-input-pins.json');self.assertEqual(len(pins),6520);r.validate_pins(pins)
    def test_byte_pin_corruption_rejected(self):
        with self.assertRaises(ValueError):r.validate_pins({'scripts/phase-2h2h-bulk-500.py':'bad'})
    def test_complete_bounded_batch_sequence(self):
        batches=self.objects['quality-audit.json']['batches']
        self.assertEqual([b['batch'] for b in batches],list(range(21,41)))
        self.assertTrue(all(len(b['groupKeys'])==5 for b in batches))
    def test_source_pointers_resolve(self):
        groups={g['candidateGroupKey']:g for g in r.load(r.h.WS/'selected-cohort.json')['groups']}
        for key in self.receipt['candidateGroupKeys']:
            for ref in groups[key]['sourceEvidence']:r.h.check_pointer(ref,self.parent['sources'])
    def test_unsupported_ordinals_rejected(self):
        row=copy.deepcopy(self.originals[0]);row['oxfordGroupOrdinalsConsidered']=[999]
        groups={g['candidateGroupKey']:g for g in r.load(r.h.WS/'selected-cohort.json')['groups']}
        with self.assertRaises(ValueError):r.h.enrich(row,groups[row['candidateGroupKey']],self.parent['sources'])
    def test_number_enum_is_scoped_and_restored_on_error(self):
        original=r.h.c.pilot.POS;workspace=r.h.WS
        with self.assertRaises(RuntimeError):
            with r.manuscript_workspace(self.path):
                self.assertIn('NUMBER',r.h.c.pilot.POS);raise RuntimeError('fixture')
        self.assertIs(r.h.c.pilot.POS,original);self.assertEqual(r.h.WS,workspace)
        self.assertNotIn('NUMBER',original)
    def test_number_source_supported(self):
        numbers=[x for x in self.rows if x['partOfSpeechProposal']=='NUMBER']
        self.assertEqual({x['headword'] for x in numbers},{'zero','thirteen'})
        self.assertTrue(all('NUMBER' in x['posEvidence'] for x in numbers))
    def test_fourteen_exact_effective_reviews(self):
        for q in self.objects['quality-audit.json']['senses']:
            review=q['review'];self.assertEqual(set(review['dimensions']),set(r.h.REVIEW_DIMENSIONS))
            self.assertEqual(review['reviewedContentHash'],r.h.g.e.revision(self.projection[q['proposalKey']]))
            self.assertFalse(q['formalHumanReview']);self.assertIsNone(review['humanReviewer'])
    def test_multisense_is_real_and_distinct(self):
        rows=[x for x in self.rows if x['headword']=='trace'];self.assertEqual(len(rows),4)
        self.assertEqual(len({x['content']['definitionEn'] for x in rows}),4)
        self.assertEqual(self.counts['multiSenseGroups'],40)
    def test_bilingual_fields_and_provenance(self):
        with r.manuscript_workspace(self.path):
            self.assertTrue(all(not r.h.c.structural_errors(x) for x in self.rows))
        for row in self.rows:
            fields={x['field'] for x in row['generatedProvenance']['fields']}
            self.assertTrue({'/displayFormProposal','/lexicalUnitTypeProposal','/partOfSpeechProposal'}<=fields)
    def test_review_findings_never_silently_promoted(self):
        qa=self.objects['quality-audit.json']['senses']
        self.assertTrue(all(q['aiAssessment']!='PASS' for q in qa if q['review']['assessment']=='REVIEW'))
        self.assertEqual((self.counts['aiQa']['PASS'],self.counts['aiQa']['REVIEW']),(121,27))
    def test_original_manuscripts_and_four_additive_corrections(self):
        self.assertEqual(len(self.originals),148)
        overlay=r.load(self.path/'content-correction-overlays.json')
        self.assertEqual(len(overlay['corrections']),4)
        corrected=[x for x in self.rows if x['headword']=='liquid']
        self.assertTrue(all('volume' in x['content']['definitionEn'] for x in corrected))
        self.assertEqual(next(x for x in self.rows if x['headword']=='september')['displayFormProposal'],'September')
    def test_stale_correction_rejected(self):
        corrections=copy.deepcopy(r.load(self.path/'content-correction-overlays.json')['corrections'])
        corrections[0]['parentContentHash']='bad'
        with r.manuscript_workspace(self.path):
            with self.assertRaises(ValueError):r.h.apply_corrections(self.originals,corrections)
    def test_no_approvals_ids_or_release_promotion(self):
        auth=self.objects['validation-summary.json']['authorization']
        self.assertEqual((auth['ownerApprovalsAdded'],auth['canonicalIdsAllocated']),(0,0))
        self.assertFalse(auth['releaseEligible']);self.assertEqual(auth['databaseAccess'],'NONE')
        self.assertTrue(all(x['rights']=='UNKNOWN_REVIEW_REQUIRED' for x in self.objects['provenance-rights-audit.json']['senses']))
    def test_future_parent_validation_without_starting_next_checkpoint(self):
        before={p.relative_to(r.WS).as_posix():r.sha(p) for p in r.WS.rglob('*') if p.is_file()}
        future=r.parent_state(3);receipt=r.resume_receipt(future,3)
        self.assertEqual(receipt['candidateGroupKeys'],self.parent['pending'][100:200])
        self.assertEqual((receipt['firstBatch'],receipt['lastBatch']),(41,60))
        self.assertEqual(len(future['records']),1108)
        self.assertEqual(before,{p.relative_to(r.WS).as_posix():r.sha(p) for p in r.WS.rglob('*') if p.is_file()})
    def test_saved_snapshot_and_fingerprint_valid(self):
        manifest,objects,records=r.validate_snapshot(self.path)
        self.assertEqual(manifest['fingerprint'],self.objects['manifest.json']['fingerprint'])
        self.assertEqual(records,self.projection)
    def test_check_is_zero_write(self):
        outputs={self.path/n:r.encode(v) for n,v in self.objects.items()};outputs[self.path/'report.md']=self.report
        with patch.object(Path,'write_text',side_effect=AssertionError('Unexpected write')):r.h.write_snapshot(outputs,True)
    def test_immutable_guard_rejects_before_any_partial_write(self):
        with tempfile.TemporaryDirectory() as directory:
            new=Path(directory)/'new';old=Path(directory)/'old';old.write_text('accepted')
            with self.assertRaises(ValueError):r.h.write_snapshot({new:'new',old:'overwritten'},False)
            self.assertFalse(new.exists());self.assertEqual(old.read_text(),'accepted')
    def test_sealed_batch_idempotent_no_write(self):
        with patch.object(Path,'write_text',side_effect=AssertionError('Unexpected write')):
            result=r.seal_batch(2,21)
        self.assertEqual((result['groupCount'],result['senseCount']),(5,7))
    def test_unreviewed_batch_cannot_seal(self):
        with tempfile.TemporaryDirectory() as directory,patch.object(r,'WS',Path(directory)),patch.object(r,'parent_state',return_value=self.parent):
            cp=r.location(2);(cp/'authored').mkdir(parents=True)
            (cp/'resume-selection-receipt.json').write_text(r.encode(self.receipt))
            for suffix in ['.psv','.review.psv']:
                target=cp/'authored'/('batch-021'+suffix)
                target.write_bytes((self.path/'authored'/target.name).read_bytes())
            with self.assertRaises(FileNotFoundError):r.seal_batch(2,21)
            self.assertFalse((cp/'authored/batch-021.json').exists())
    def test_seal_respects_declared_review_and_binds_decisions(self):
        with tempfile.TemporaryDirectory() as directory,patch.object(r,'WS',Path(directory)),patch.object(r,'parent_state',return_value=self.parent):
            cp=r.location(2);(cp/'authored').mkdir(parents=True)
            (cp/'resume-selection-receipt.json').write_text(r.encode(self.receipt))
            for suffix in ['.psv','.review.psv']:
                target=cp/'authored'/('batch-021'+suffix);target.write_bytes((self.path/'authored'/target.name).read_bytes())
            accepted=r.load(self.path/'authored/batch-021.json')
            decisions={'reviewerKind':'AI_SELF_REVIEW','assessments':{x['proposalKey']:'REVIEW' for x in accepted['reviews']},'fullBatchReview':True,'substantiveDefectsFound':1,'criticalDefectsFound':0}
            (cp/'authored/batch-021.review-decisions.json').write_text(r.encode(decisions))
            r.seal_batch(2,21)
            sealed=r.load(cp/'authored/batch-021.json')
            self.assertTrue(all(x['assessment']=='REVIEW' for x in sealed['reviews']))
    def test_database_and_mutation_cli_rejected(self):
        for flag in ['--database-url','--production','--apply','--delete','--import']:
            result=subprocess.run([sys.executable,'-B',str(Path(__file__).with_name('phase-2h2h-bulk-500-resume.py')),flag],capture_output=True)
            self.assertEqual(result.returncode,2)
    def test_checkpoint_bounds(self):
        for number in [0,1,6]:
            with self.assertRaises(ValueError):r.location(number)

if __name__=='__main__':unittest.main()
