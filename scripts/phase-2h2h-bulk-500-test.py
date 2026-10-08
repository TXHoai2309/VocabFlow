#!/usr/bin/env python3
"""Adversarial offline assembly, content lineage and checkpoint regression."""
import copy
import importlib.util
import subprocess
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

spec=importlib.util.spec_from_file_location('h',Path(__file__).with_name('phase-2h2h-bulk-500.py'))
h=importlib.util.module_from_spec(spec)
spec.loader.exec_module(h)


class BulkCheckpointTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.objects,cls.report=h.build()
        cls.groups=h.load(h.WS/'selected-cohort.json')['groups']
        cls.rows=cls.objects['sense-proposals.json']['senses']
        cls.originals=cls.objects['sense-proposals.json']['originals']
        cls.summary=cls.objects['validation-summary.json']
        cls.corrections=h.load(h.WS/'content-correction-overlays.json')['corrections']
        cls.ledger,cls.sources,_,cls.prior,cls.effective=h.inputs()

    def test_500_unique_frozen_keys(self):
        self.assertEqual(len({x['candidateGroupKey'] for x in self.groups}),500)

    def test_seed_replay(self):
        replay=h.select(self.ledger,self.prior)
        self.assertEqual(replay['selected-cohort.json']['groups'],self.groups)

    def test_no_previous_520(self):
        self.assertFalse({x['candidateGroupKey'] for x in self.groups}&{x['candidateGroupKey'] for x in self.prior})

    def test_annotation_exclusion(self):
        self.assertFalse(any(h.d.annotation(x) for x in self.groups))

    def test_alphabet_capacities(self):
        audit=h.load(h.WS/'selection-quota-audit.json')['alphabet']
        self.assertEqual(sum(x['frozenTarget'] for x in audit.values()),500)
        self.assertTrue(all(x['frozenTarget']<=x['available'] for x in audit.values()))

    def test_honest_infeasibility(self):
        for item in h.load(h.WS/'selection-quota-audit.json')['shortfalls']:
            if item['reason']=='INSUFFICIENT_CAPACITY':self.assertLess(item['available'],item['target'])

    def test_pending_not_blocked(self):
        self.assertEqual(self.summary['status'],'PARTIAL')
        self.assertEqual(self.summary['counts']['pendingGroups'],400)
        self.assertEqual(self.summary['counts']['blockedGroups'],0)

    def test_exhaustive_checkpoint_partition(self):
        cp=self.summary['checkpoint']; authored={r['candidateGroupKey'] for r in self.rows}
        pending=set(cp['pendingGroupKeys']);blocked={x['candidateGroupKey'] for x in cp['blockedGroups']}
        self.assertFalse(authored&pending or authored&blocked or pending&blocked)
        self.assertEqual(authored|pending|blocked,{x['candidateGroupKey'] for x in self.groups})

    def test_sense_keys_unique(self):
        self.assertEqual(len(self.rows),len({r['proposalKey'] for r in self.rows}))

    def test_real_multisense_boundaries(self):
        exercise=[r for r in self.rows if r['headword']=='exercise']
        self.assertEqual(len(exercise),4)
        self.assertEqual({r['partOfSpeechProposal'] for r in exercise},{'VERB','NOUN'})
        self.assertEqual(len({r['content']['definitionEn'] for r in exercise}),4)

    def test_bilingual_complete(self):
        self.assertTrue(all(not h.c.structural_errors(r) for r in self.rows))

    def test_unpaired_translation_rejected(self):
        row=copy.deepcopy(self.rows[0]);row['content']['examples'][0]['vi']=''
        self.assertIn('UNPAIRED_EXAMPLE',h.c.structural_errors(row))

    def test_pos_matches_evidence(self):
        self.assertTrue(all(r['partOfSpeechProposal'] in r['posEvidence'] for r in self.rows))

    def test_wrong_pos_rejected(self):
        row=copy.deepcopy(self.originals[0]);row['partOfSpeechProposal']='VERB'
        with self.assertRaises(ValueError):h.enrich(row,self.groups[0],self.sources)

    def test_source_pointer_corruption_rejected(self):
        ref=copy.deepcopy(self.groups[0]['sourceEvidence'][0]);ref['sourceNoteGuid']='fabricated'
        with self.assertRaises(ValueError):h.check_pointer(ref,self.sources)

    def test_source_index_corruption_rejected(self):
        ref=copy.deepcopy(self.groups[0]['sourceEvidence'][0]);ref['recordIndex']=1000000
        with self.assertRaises(IndexError):h.check_pointer(ref,self.sources)

    def test_cefr_not_guessed_verified(self):
        self.assertTrue(all(r['cefrClassification'] is None and r['topicClassification'] is None for r in self.rows))

    def test_unsupported_ordinal_rejected(self):
        row=copy.deepcopy(self.originals[0]);row['oxfordGroupOrdinalsConsidered']=[999]
        with self.assertRaises(ValueError):h.enrich(row,self.groups[0],self.sources)

    def test_14_content_bound_reviews(self):
        self.assertEqual(len(h.REVIEW_DIMENSIONS),14)
        for q in self.objects['quality-audit.json']['senses']:
            row=next(r for r in self.rows if r['proposalKey']==q['proposalKey'])
            self.assertEqual(q['review']['reviewedContentHash'],h.g.e.revision(row))
            self.assertEqual(set(q['review']['dimensions']),set(h.REVIEW_DIMENSIONS))

    def test_high_risk_review_coverage(self):
        self.assertTrue(all(q['review']['reviewerKind']=='AI_SELF_REVIEW' for q in self.objects['quality-audit.json']['senses'] if q['riskSignals']))

    def test_bounded_persisted_batches(self):
        batches=self.objects['quality-audit.json']['batches']
        self.assertEqual(len(batches),20)
        self.assertTrue(all(0<len(b['groupKeys'])<=5 for b in batches))
        keys=[k for b in batches for k in b['groupKeys']]
        self.assertEqual(len(keys),len(set(keys)))

    def test_polarity_signal_not_semantic_truth(self):
        row=copy.deepcopy(self.originals[0])
        row['content']['examples']=[{'en':'The claim is unconfirmed.','vi':'Tuyên bố chưa được xác nhận.'}]
        self.assertIn('POLARITY_SIGNAL_REQUIRES_CONTEXT_REVIEW',h.c.language_signals(row))

    def test_source_similarity_signal_present(self):
        audits=self.objects['quality-audit.json']['senses']
        self.assertTrue(any(q['sourceSimilarity'] for q in audits))
        self.assertTrue(all(q['aiAssessment']=='REVIEW' for q in audits if q['sourceSimilarity']))

    def test_duplicate_example_audit(self):
        self.assertEqual(self.objects['quality-audit.json']['duplicateExamples'],[])

    def test_near_duplicate_prior_detected(self):
        row=copy.deepcopy(self.originals[0]);other=copy.deepcopy(row);other['proposalKey']='PRIOR_SYNTHETIC'
        text='A careful worker checks every rope before the long journey begins.'
        row['content']['examples'][0]['en']=text;other['content']['examples'][0]['en']=text
        result=h.near_duplicates([row],{other['proposalKey']:other})
        self.assertTrue(any(x['otherProposalKey']=='PRIOR_SYNTHETIC' and x['tokenSetJaccard']==1 for x in result[row['proposalKey']]))

    def test_short_gloss_not_near_duplicate_evidence(self):
        row=copy.deepcopy(self.originals[0]);other=copy.deepcopy(row);other['proposalKey']='PRIOR_SYNTHETIC'
        for record in [row,other]:record['content'].update(definitionEn='a useful item',examples=[{'en':'This works.','vi':'Có ích.'}])
        self.assertEqual(h.near_duplicates([row],{other['proposalKey']:other})[row['proposalKey']],[])

    def test_generated_field_hashes(self):
        for row in self.rows:
            actual=h.c.pilot.content_fields(row)
            self.assertEqual({p['field']:p['sha256Utf8'] for p in row['generatedProvenance']['fields']},
                             {k:h.sha_text(v) for k,v in actual.items()})

    def test_no_rights_clearance(self):
        self.assertTrue(all(r['sourceRights']=='UNKNOWN_REVIEW_REQUIRED' for r in self.rows))
        self.assertTrue(all(not x['clearanceEvidence'] for x in self.objects['provenance-rights-audit.json']['senses']))

    def test_false_rights_rejected(self):
        row=copy.deepcopy(self.originals[0]);row['sourceRights']='CLEARED'
        self.assertIn('UNSUPPORTED_RIGHTS',h.c.structural_errors(row))

    def test_no_owner_or_identity_approval(self):
        self.assertTrue(all(r['ownerDecision']==r['identityDecision']=='UNRESOLVED' and r['identityClaim']=='NONE' for r in self.rows))

    def test_false_owner_approval_rejected(self):
        row=copy.deepcopy(self.originals[0]);row['ownerDecision']='APPROVED'
        self.assertIn('UNAUTHORIZED_DECISION',h.c.structural_errors(row))

    def test_no_canonical_or_runtime_promotion(self):
        self.assertTrue(all(r['canonicalId'] is None and r['runtimeMapping'] is None and not r['publicationEligible'] for r in self.rows))

    def test_all_813_prior_effective_hashes(self):
        records=self.objects['effective-draft-index.json']['records']
        prior={r['proposalKey']:r for r in records if r['proposalKey'] in self.effective}
        self.assertEqual(len(prior),813)
        for key,row in self.effective.items():self.assertEqual(prior[key]['effectiveContentHash'],h.g.e.revision(row))

    def test_draft_v2_corrections_preserved(self):
        records=self.objects['effective-draft-index.json']['records']
        self.assertEqual(sum(r.get('lookupLayer')=='DRAFT_V2' for r in records),3)
        self.assertEqual(self.objects['effective-draft-index.json']['priorFingerprint'],h.G_PIN)

    def test_prior_byte_pins(self):
        pins=h.load(h.WS/'accepted-input-pins.json')
        self.assertGreater(len(pins),6400)
        self.assertTrue(all(h.sha(h.ROOT/p)==v for p,v in pins.items()))

    def test_overlay_retains_originals(self):
        before=copy.deepcopy(self.originals);h.apply_corrections(self.originals,self.corrections)
        self.assertEqual(before,self.originals)
        old=next(r for r in before if r['headword']=='legislative')
        new=next(r for r in self.rows if r['headword']=='legislative')
        self.assertIn('committee',old['content']['examples'][0]['en'])
        self.assertIn('students',new['content']['examples'][0]['en'])

    def reject_correction(self,change):
        cs=copy.deepcopy(self.corrections);change(cs)
        with self.assertRaises(ValueError):h.apply_corrections(self.originals,cs)

    def test_stale_overlay_rejected(self):self.reject_correction(lambda cs:cs[0].update(parentContentHash='wrong'))
    def test_wrong_before_rejected(self):self.reject_correction(lambda cs:cs[0].update(before='fabricated'))
    def test_wrong_after_hash_rejected(self):self.reject_correction(lambda cs:cs[0].update(afterSha256='wrong'))
    def test_duplicate_overlay_field_rejected(self):self.reject_correction(lambda cs:cs.append(cs[0]))
    def test_false_overlay_approval_rejected(self):self.reject_correction(lambda cs:cs[0].update(ownerDecision='APPROVED'))

    def test_full_batch_re_review_after_correction(self):
        review=self.objects['quality-audit.json']['escalation']['reReviewedBatches']
        self.assertEqual(review[0]['batch'],18)
        self.assertEqual(review[0]['scope'],'ALL_SEVEN_SENSES')

    def test_frozen_hybrid_pins(self):
        text=h.encode(self.summary['protectedState'])
        self.assertIn('44874b11d1fdef76a515f6285d04c9a417318daa6969e112608a59e7c232613c',text)
        self.assertIn('51ab4c5ce31bd38b51742d1aea16602150522da27ad26c123cc17b332f9a406e',text)

    def test_no_database_capability(self):
        self.assertEqual(h.AUTH['databaseAccess'],'NONE')
        self.assertEqual(h.AUTH['databaseWrites'],'NONE')
        source=Path(h.__file__).read_text(encoding='utf8')
        self.assertNotIn('psycopg',source);self.assertNotIn('requests.',source)

    def test_mutation_cli_rejected(self):
        result=subprocess.run([sys.executable,'-B',str(Path(h.__file__)),'--apply'],capture_output=True)
        self.assertEqual(result.returncode,2)

    def test_zero_write_replay(self):
        paths=[p for p in h.WS.rglob('*') if p.is_file()]+[h.REPORT]
        before={str(p):h.sha(p) for p in paths}
        with patch.object(h,'build',return_value=(self.objects,self.report)):
            with patch.object(Path,'write_text',side_effect=AssertionError('write attempted')):h.run(True)
        self.assertEqual(before,{str(p):h.sha(p) for p in paths})

    def test_failed_snapshot_no_partial_write(self):
        missing=h.WS/'unwritten-test-sentinel.json';existing=h.WS/'manifest.json'
        with patch.object(Path,'write_text',side_effect=AssertionError('write attempted')):
            with self.assertRaises(ValueError):h.write_snapshot({missing:'new',existing:'corrupt'},False)
        self.assertFalse(missing.exists())

    def test_manifest_replay(self):
        manifest=self.objects['manifest.json']
        for name in manifest['files']:self.assertEqual(h.load(h.WS/name),self.objects[name])
        self.assertEqual(h.load(h.WS/'manifest.json'),manifest)


if __name__=='__main__':unittest.main(verbosity=2)
