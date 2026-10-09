#!/usr/bin/env python3
"""Checkpoint-04 ordered continuation, content lineage and QA regression."""
import copy
import importlib.util
import subprocess
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

spec=importlib.util.spec_from_file_location('handoff',Path(__file__).with_name('phase-2h2h-checkpoint-04-handoff.py'))
h=importlib.util.module_from_spec(spec);spec.loader.exec_module(h)
r=h.r


class Checkpoint04Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.objects,cls.report=h.assemble();cls.history=cls.objects['qa-history.json']
        cls.parent=r.parent_state(4);cls.receipt=r.load(h.CP/'resume-selection-receipt.json')
        cls.rows=r.load(h.CP/'sense-proposals.json')['senses']
        cls.originals=r.load(h.CP/'sense-proposals.json')['originals']
        cls.qa=r.load(h.CP/'quality-audit.json')['senses']
        cls.projection=r.load(h.CP/'effective-draft-projection.json')
        cls.overlay=r.load(h.CP/'content-correction-overlays.json')

    def test_exact_next_prefix(self):
        self.assertEqual(self.receipt['candidateGroupKeys'],self.parent['pending'][:100])
        self.assertEqual(self.receipt['candidateGroupKeys'][:5],['NORMALIZED_HEADWORD:'+w for w in ['criminal','homework','mouse','register','seventy']])
    def test_no_old_group_overlap(self):
        self.assertFalse(set(self.receipt['candidateGroupKeys'])&set(self.parent['completed']))
    def test_reordered_groups_fail_closed(self):
        changed=copy.deepcopy(self.receipt);changed['candidateGroupKeys'].reverse()
        with self.assertRaises(ValueError):r.validate_receipt(changed,self.parent)
    def test_duplicate_key_fail_closed(self):
        with self.assertRaises(ValueError):r.extend(self.parent,[*self.rows,self.rows[0]],self.receipt['candidateGroupKeys'])
    def test_actual_counts(self):
        c=r.load(h.CP/'validation-summary.json')['counts']
        self.assertEqual((c['newGroups'],c['newSenses'],c['multiSenseGroups']),(100,142,27))
        self.assertEqual((c['cumulativeCohortAuthored'],c['cohortPending'],c['totalCorpusGroups'],c['remainingCorpusGroups'],c['totalSenses']),(400,100,920,5223,1390))
    def test_previous_1248_exact(self):
        effective={x['proposalKey']:x for x in self.projection['records']}
        self.assertEqual({k:effective[k] for k in self.parent['records']},self.parent['records'])
    def test_cumulative_hashes(self):
        self.assertEqual(self.projection['contentHashes'],{x['proposalKey']:r.h.g.e.revision(x) for x in self.projection['records']})
    def test_prior_review_objects_exact(self):
        self.assertEqual([len(x['exactReviewObjects']) for x in self.history['previousQaHistory']],[16,27,57])
        for item in self.history['previousQaHistory']:
            old=r.load(r.ROOT/item['path'])['senses']
            self.assertEqual(item['exactReviewObjects'],[q for q in old if q['aiAssessment']=='REVIEW'])
            self.assertEqual(item['allAssessments'],{q['proposalKey']:q['aiAssessment'] for q in old})
    def test_new_qa_separate_and_honest(self):
        self.assertEqual(self.history['newQaCounts'],{'PASS':112,'REVIEW':30})
        self.assertEqual(len(self.history['newAllAssessments']),142)
        self.assertFalse({q['proposalKey'] for q in self.qa}&{k for p in self.history['previousQaHistory'] for k in p['allAssessments']})
    def test_reasons_not_inferred_from_old_prose(self):
        self.assertIn('POLARITY_CONTEXT_SIGNAL',self.history['newReviewReasonBreakdown'])
        self.assertTrue(all('categories' not in p for p in self.history['previousQaHistory']))
    def test_all_twenty_receipts(self):
        receipts=[r.load(h.CP/f'authored/batch-{n:03d}.json') for n in range(61,81)]
        self.assertEqual([k for b in receipts for k in b['groupKeys']],self.receipt['candidateGroupKeys'])
        self.assertEqual(sum(b['senseCount'] for b in receipts),142)
        self.assertTrue(all(b['fullBatchReview'] and len(b['groupKeys'])<=5 for b in receipts))
    def test_supported_pos_and_ordinals(self):
        groups={g['candidateGroupKey']:g for g in r.load(r.h.WS/'selected-cohort.json')['groups']}
        for row in self.rows:
            g=groups[row['candidateGroupKey']]
            self.assertIn(row['partOfSpeechProposal'],g['normalizedPosCandidates'])
            self.assertTrue(set(row['oxfordGroupOrdinalsConsidered'])<={n for e in g['sourceEvidence'] for n in e['structuredOxfordSenseGroupOrdinals']})
    def test_bilingual_structure(self):
        with r.manuscript_workspace(h.CP):self.assertTrue(all(not r.h.c.structural_errors(x) for x in self.rows))
    def test_effective_reviews_hash_bound(self):
        bykey={x['proposalKey']:x for x in self.rows}
        for q in self.qa:
            review=q['review'];self.assertEqual(review['reviewedContentHash'],r.h.g.e.revision(bykey[q['proposalKey']]))
            self.assertEqual(set(review['dimensions']),set(r.h.REVIEW_DIMENSIONS));self.assertIsNone(review['humanReviewer'])
    def test_generated_utf8_field_hashes(self):
        for row in self.rows:
            for item in row['generatedProvenance']['fields']:
                value=row
                for part in item['field'].strip('/').split('/'):
                    value=value[int(part)] if isinstance(value,list) else value[part]
                self.assertEqual(item['sha256Utf8'],r.h.sha_text(value))
    def test_originals_replay_overlays(self):
        with r.manuscript_workspace(h.CP):changed=r.h.apply_corrections(self.originals,self.overlay['corrections'])
        self.assertEqual({x['proposalKey']:x['content'] for x in changed},{x['proposalKey']:x['content'] for x in self.rows})
    def test_stale_correction_parent_rejected(self):
        overlay=copy.deepcopy(self.overlay['corrections']);overlay[0]['parentContentHash']='0'*64
        with self.assertRaises(ValueError):r.h.apply_corrections(self.originals,overlay)
    def test_corrected_after_hash_rejected(self):
        overlay=copy.deepcopy(self.overlay['corrections']);overlay[0]['reviewedAfterContentHash']='0'*64
        with self.assertRaises(ValueError):r.h.apply_corrections(self.originals,overlay)
    def test_nine_full_batches_rereviewed(self):
        self.assertEqual(len(self.overlay['corrections']),12)
        self.assertEqual({b['batch'] for b in self.overlay['reReviewedBatches']},{62,67,69,70,71,74,75,79,80})
        self.assertTrue(all(b['scope']=='ALL_SENSES_IN_BATCH' and b['reviewedContentHashes'] for b in self.overlay['reReviewedBatches']))
    def test_youth_evidence_supersedes_initial_recommendation(self):
        row=next(x for x in self.rows if x['proposalKey']=='EDITORIAL_2H2H:youth:young-person')
        self.assertEqual(row['content']['definitionEn'],'A boy or a young man.')
        finding=next(x for x in self.history['newFindings'] if x['proposalKey']==row['proposalKey'])
        self.assertTrue(finding['initialRecommendationSupersededByLexicalEvidence']);self.assertEqual(len(finding['correctionRefs']),3)
        self.assertIn('người trẻ tuổi',finding['exactFinding']['review']['note'])
    def test_countable_and_collective_youth_distinct(self):
        youth=[x for x in self.rows if x['headword']=='youth'];self.assertEqual(len(youth),3)
        self.assertEqual(len({x['content']['definitionEn'] for x in youth}),3)
    def test_number_scope_restored(self):
        before=r.h.c.pilot.POS
        with r.manuscript_workspace(h.CP):self.assertIn('NUMBER',r.h.c.pilot.POS)
        self.assertEqual(before,r.h.c.pilot.POS)
        self.assertEqual({x['headword'] for x in self.rows if x['partOfSpeechProposal']=='NUMBER'},{'seventy','thirty'})
    def test_bible_display_only(self):
        row=next(x for x in self.rows if x['headword']=='bible')
        self.assertEqual(row['displayFormProposal'],'Bible');self.assertEqual(row['candidateGroupKey'],'NORMALIZED_HEADWORD:bible')
    def test_all_rights_and_identity_unresolved(self):
        self.assertTrue(all(x['canonicalId'] is None and x['runtimeMapping'] is None and not x['publicationEligible'] and x['identityClaim']=='NONE' and x['sourceRights']=='UNKNOWN_REVIEW_REQUIRED' for x in self.rows))
        self.assertFalse(self.history['formalHumanApproval'])
    def test_parent_byte_pins_and_source_exception(self):
        pins=r.load(h.CP/'accepted-parent-byte-pins.json');self.assertEqual(len(pins['files']),6696)
        r.validate_pins(pins['files']);e=pins['toolingSourceException'];self.assertEqual(r.sha(r.ROOT/e['path']),e['afterSha256'])
    def test_read_only_handoff_snapshot_check(self):
        outputs={h.CP/n:r.encode(v) for n,v in self.objects.items()};outputs[h.CP/'editorial-handoff.md']=self.report
        with patch.object(Path,'write_text',side_effect=AssertionError('Unexpected write')):r.h.write_snapshot(outputs,True)
    def test_next_parent_read_does_not_write(self):
        paths=[p for base in ('scripts','vocabflow-dataset') for p in (r.ROOT/base).rglob('*') if p.is_file()]
        before={p:r.sha(p) for p in paths}
        parent=r.parent_state(5);receipt=r.resume_receipt(parent,5)
        self.assertEqual(len(parent['records']),1390)
        self.assertEqual((receipt['firstBatch'],receipt['lastBatch']),(81,100))
        self.assertEqual(len(receipt['candidateGroupKeys']),100)
        self.assertEqual(before,{p:r.sha(p) for p in paths})
    def test_mutation_cli_arguments_rejected(self):
        for flag in ['--production','--database-url','--apply','--delete']:
            result=subprocess.run([sys.executable,'-B',str(Path(__file__).with_name('phase-2h2h-checkpoint-04-handoff.py')),flag],capture_output=True)
            self.assertEqual(result.returncode,2)


if __name__=='__main__':unittest.main()
