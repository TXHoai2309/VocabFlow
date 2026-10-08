#!/usr/bin/env python3
"""Adversarial checks for selection, source pointers, replay and approval gates."""
import copy
import hashlib
import importlib.util
import json
import os
import shutil
import socket
import subprocess
import tempfile
import unittest
from collections import Counter
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('extension2c', Path(__file__).with_name('phase-2h2c-stratified-editorial.py'))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class StratifiedTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.output, cls.report = m.build()
        cls.rows = cls.output['sense-proposals.json']['senses']
        cls.groups = m.load(m.WS/'selected-cohort.json')['groups']
        cls.selection = m.load(m.WS/'selection-manifest.json')
        cls.quota = m.load(m.WS/'selection-quota-audit.json')
        cls.prior = m.load(m.ROOT/'vocabflow-dataset/workspaces/full-master-expansion-candidate-preparation/pilot-cohort.json')['groups']

    def test_120_unique_frozen_groups(self):
        keys = [g['candidateGroupKey'] for g in self.groups]
        self.assertEqual(len(keys), 120)
        self.assertEqual(len(set(keys)), 120)
        self.assertEqual(m.digest(keys), self.selection['selectedKeyFingerprint'])

    def test_no_pilot_overlap(self):
        self.assertFalse({g['candidateGroupKey'] for g in self.groups} & {g['candidateGroupKey'] for g in self.prior})

    def test_six_alphabet_buckets(self):
        self.assertEqual(Counter(m.bucket(g) for g in self.groups), dict.fromkeys(m.BUCKETS, 20))

    def test_quota_counts_not_added_as_disjoint(self):
        actual = m.quotas(self.groups)
        for q, value in self.quota['achieved'].items():
            self.assertEqual(value, actual[q])
        self.assertGreater(sum(self.quota['achieved'].values()), 120)
        self.assertTrue(self.quota['dimensionsOverlap'])

    def test_feasibility_shortages_truthful(self):
        self.assertEqual(self.quota['availableCapacity']['CEFR_MISSING'], 0)
        self.assertEqual(self.quota['shortages'][0]['quota'], 'CEFR_MISSING')
        for q, target in m.QUOTAS.items():
            if self.quota['availableCapacity'][q] >= target:
                self.assertGreaterEqual(self.quota['achieved'][q], target)

    def test_pairwise_capacity_intersections(self):
        ledger = m.load(m.ROOT/'vocabflow-dataset/workspaces/full-master-expansion-candidate-preparation/full-master-expansion-candidate-ledger.json')['groups']
        prior = {g['candidateGroupKey'] for g in self.prior}
        pool = [g for g in ledger if m.bucket(g) and g['candidateGroupKey'] not in prior]
        self.assertEqual(self.quota['pairwiseAvailableIntersections']['EXISTING_MASTER_LEMMA & LEGACY_HISTORY'],
                         sum({'EXISTING_MASTER_LEMMA', 'LEGACY_HISTORY'} <= m.signals(g) for g in pool))

    def test_rank_uses_exact_key_seed_and_stable_tie(self):
        for g in self.groups:
            self.assertEqual(g['sha256Rank'], hashlib.sha256((m.SEED+'\n'+g['candidateGroupKey']).encode()).hexdigest())

    def test_selection_replay_after_shuffling_inventory(self):
        ledger = m.load(m.ROOT/'vocabflow-dataset/workspaces/full-master-expansion-candidate-preparation/full-master-expansion-candidate-ledger.json')['groups']
        replay, audit = m.select(list(reversed(ledger)), self.prior)
        self.assertEqual(replay, m.load(m.WS/'selected-cohort.json'))
        self.assertEqual(audit, self.quota)

    def test_source_id_guid_hash_and_ordinals_complete(self):
        inventories = {c: m.load(m.ROOT/'vocabflow-dataset/workspaces/full-source-inventory-dedupe'/f)['records']
                       for c,f in [('OXFORD_5000','oxford-normalized-inventory.json'), ('ENGLISH_VOCAB_4600','vocab4600-normalized-inventory.json')]}
        for g in self.groups:
            for ref in g['sourceEvidence']:
                source = inventories[ref['corpus']][ref['recordIndex']]
                for field in ['sourceRecordId', 'sourceNoteGuid', 'recordEvidenceSha256']:
                    self.assertEqual(ref[field], source[field])
                self.assertEqual(g['normalizedHeadword'], source['normalizedHeadword'])

    def test_group_draft_mapping_and_batch_caps(self):
        self.assertEqual({r['candidateGroupKey'] for r in self.rows}, {g['candidateGroupKey'] for g in self.groups})
        batches = self.output['editorial-review.json']['batches']
        self.assertEqual(len(batches), 24)
        self.assertEqual(sum(b['groupCount'] for b in batches), 120)
        self.assertTrue(all(b['groupCount'] <= 5 for b in batches))

    def test_no_forced_sense_count_or_source_group_split(self):
        by_group = Counter(r['candidateGroupKey'] for r in self.rows)
        self.assertGreater(max(by_group.values()), 1)
        self.assertGreater(len(set(by_group.values())), 1)
        fluid = [r for r in self.rows if r['headwordEvidence'] == 'fluid' and r['partOfSpeechProposal'] == 'NOUN'][0]
        self.assertEqual(fluid['oxfordGroupOrdinalsConsidered'], [0, 1])
        self.assertTrue(any(r['unrepresentedOxfordOrdinals'] for r in self.output['editorial-review.json']['groups']))

    def test_valid_proposal_fields_and_language_pairs(self):
        for row in self.rows:
            self.assertEqual(m.structural_errors(row), [])
            self.assertNotEqual(row['content']['definitionEn'], row['content']['meaningVi'])
            self.assertTrue(all(x['en'] != x['vi'] for x in row['content']['examples']))

    def test_missing_and_identical_pair_rejected(self):
        row = copy.deepcopy(self.rows[0]); row['content']['examples'][0]['vi'] = ''
        self.assertIn('UNPAIRED_EXAMPLE', m.structural_errors(row))
        row['content']['examples'][0]['vi'] = row['content']['examples'][0]['en']
        self.assertIn('IDENTICAL_LANGUAGE_EXAMPLE', m.structural_errors(row))

    def test_invalid_pos_and_lexical_unit_rejected(self):
        row = copy.deepcopy(self.rows[0]); row['partOfSpeechProposal'] = 'NUMBER'; row['lexicalUnitTypeProposal'] = 'AUTO_APPROVED_PHRASE'
        self.assertIn('INVALID_POS', m.structural_errors(row))
        self.assertIn('INVALID_LEXICAL_UNIT', m.structural_errors(row))

    def test_no_invented_classifications(self):
        self.assertTrue(all(r['cefrClassification'] is None and r['otherClassifications'] == [] for r in self.rows))

    def test_all_high_risk_groups_fully_reviewed(self):
        review = {r['candidateGroupKey']: r for r in self.output['editorial-review.json']['groups']}
        for g in self.groups:
            r = review[g['candidateGroupKey']]
            if m.signals(g) & m.RISK_SIGNALS:
                self.assertTrue(r['highRiskFlags'])
                self.assertTrue(r['fullGroupReviewPerformed'])
            self.assertEqual(r['scope'], m.REVIEW_DIMENSIONS)
            self.assertGreater(len(r['actualReviewNote']), 50)

    def test_full_small_batch_audit_covers_every_stratum(self):
        for batch in self.output['editorial-review.json']['batches']:
            self.assertEqual(set(batch['sampledKeys']), set(batch['groupKeys']))
            self.assertEqual(batch['requestedLowRiskSample'], 10)
            self.assertTrue(batch['sourceCoverage'])
            self.assertTrue(batch['posCoverage'])
            self.assertTrue(batch['cefrEvidenceCoverage'])

    def test_critical_escalation_and_two_translation_errors(self):
        findings = [{'severity':'CRITICAL','type':'IDENTITY','stratum':'MASTER','batch':1},
                    {'severity':'SUBSTANTIVE','type':'TRANSLATION','stratum':'VI','batch':3},
                    {'severity':'SUBSTANTIVE','type':'GRAMMAR','stratum':'VERB','batch':3}]
        self.assertEqual(m.escalation(findings)['fullReviewStrata'], ['MASTER'])
        self.assertEqual(m.escalation(findings)['fullReviewBatches'], [3])
        self.assertFalse(m.escalation([])['promotionBlocked'])

    def test_real_corrections_and_copy_escalation_recorded(self):
        review = self.output['editorial-review.json']
        self.assertTrue(all(c['before'] != c['after'] for c in review['findingsAndCorrections']))
        self.assertIn('SOURCE_SIMILARITY', review['escalation']['fullReviewStrata'])
        self.assertEqual(self.output['validation-summary.json']['counts']['sourceSimilaritySenses'], 0)

    def test_generated_provenance_field_hashes(self):
        for row in self.rows:
            fields = m.pilot.content_fields(row)
            p = row['generatedProvenance']
            self.assertEqual(p['sourceType'], 'GENERATED')
            self.assertIsNone(p['humanReviewer']); self.assertIsNone(p['license'])
            self.assertEqual({x['field']: x['sha256Utf8'] for x in p['fields']},
                             {f: hashlib.sha256(v.encode()).hexdigest() for f,v in fields.items()})
            self.assertTrue(all(x['sha256Utf8'] == hashlib.sha256(row[x['field']].encode()).hexdigest() for x in p['structuralFields']))

    def test_approval_ids_mapping_and_rights_fail_closed(self):
        for field,value,error in [('ownerDecision','APPROVED','UNAUTHORIZED_DECISION'), ('identityDecision','SAME_IDENTITY','UNAUTHORIZED_DECISION'),
                                  ('canonicalId','allocated-id','UNAUTHORIZED_PROMOTION'), ('runtimeMapping',284,'UNAUTHORIZED_PROMOTION'),
                                  ('publicationEligible',True,'UNAUTHORIZED_PROMOTION'), ('sourceRights','CLEARED','UNSUPPORTED_RIGHTS')]:
            row=copy.deepcopy(self.rows[0]); row[field]=value
            self.assertIn(error, m.structural_errors(row))

    def test_master_history_exclusion_evidence_is_non_identity(self):
        for row in self.rows:
            self.assertEqual(row['identityClaim'], 'NONE')
            self.assertTrue(all(d['identityClaim'] == 'NONE' for d in row['legacyDependencies']))
            self.assertIsNone(row['canonicalId']); self.assertIsNone(row['runtimeMapping'])
        self.assertGreaterEqual(sum(g['priorityDimensions']['LEGACY_HISTORY'] for g in self.groups), 10)

    def test_old_fingerprints_unchanged(self):
        for artifact in self.output.values():
            self.assertEqual(artifact['inputFingerprints'], m.PINS)
        # build has independently validated upstream canonical hashes and all original byte pins.
        self.assertEqual(self.output['manifest.json']['inputFingerprints']['qa1'], 'b75b0522e64db5d61cff4adbccd2fb553c72f5d475d6e4370b2075e656b6a40d')

    def test_frozen_release_and_legacy_pins(self):
        protected = self.output['validation-summary.json']['protectedState']
        serialized = json.dumps(protected)
        self.assertIn('44874b11d1fdef76a515f6285d04c9a417318daa6969e112608a59e7c232613c', serialized)
        self.assertIn('51ab4c5ce31bd38b51742d1aea16602150522da27ad26c123cc17b332f9a406e', serialized)
        self.assertFalse(any(m.AUTH.values()))

    def test_replay_read_only_no_network_or_prose_generation(self):
        before = {p: p.read_bytes() for p in m.WS.rglob('*') if p.is_file()}
        with patch.object(Path, 'write_text', side_effect=AssertionError('Unexpected write')), patch.object(socket, 'socket', side_effect=AssertionError('Unexpected network')):
            result = m.run(check=True)
        self.assertEqual(result['offlineReplay'], 'PASS')
        self.assertEqual(before, {p: p.read_bytes() for p in before})

    def test_fingerprint_rejects_artifact_drift(self):
        expected = self.output['manifest.json']['fingerprint']
        altered = copy.deepcopy({n:v for n,v in self.output.items() if n != 'manifest.json'})
        altered['sense-proposals.json']['senses'][0]['content']['meaningVi'] += ' drift'
        self.assertNotEqual(expected, m.digest({'authoredByteHashes': self.output['manifest.json']['authoredByteHashes'], 'artifacts': altered}))

    def test_replay_across_distinct_python_hash_seed(self):
        result = subprocess.run(['python', '-B', str(Path(m.__file__)), '--check'],
                                env=dict(os.environ, PYTHONHASHSEED='117'), capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_frozen_selection_rejects_key_tampering(self):
        with tempfile.TemporaryDirectory(prefix='vocabflow-2h2c-selection-') as temp:
            dest = Path(temp)
            for f in ['selected-cohort.json','selection-manifest.json','selection-quota-audit.json']:
                shutil.copyfile(m.WS/f, dest/f)
            data=m.load(dest/'selected-cohort.json'); data['groups'][0]['candidateGroupKey']='NORMALIZED_HEADWORD:tampered'
            (dest/'selected-cohort.json').write_text(json.dumps(data), encoding='utf8')
            with patch.object(m, 'WS', dest), self.assertRaisesRegex(ValueError, 'selection artifact drift'):
                m.frozen_selection([], [])

    def test_annotation_not_counted_as_multiword_lexeme(self):
        lexemes=self.output['lexeme-proposals.json']['groups']
        for key in ['NORMALIZED_HEADWORD:visible (adj)', 'NORMALIZED_HEADWORD:warming (n)']:
            row=next(x for x in lexemes if x['candidateGroupKey']==key)
            self.assertEqual(row['lexicalUnitTypeProposal'], 'WORD')
        self.assertEqual(self.output['validation-summary.json']['counts']['actualMultiwordUnits'], 8)

    def test_mutation_cli_arguments_rejected(self):
        result=subprocess.run(['python','-B',str(Path(m.__file__)), '--apply'], capture_output=True)
        self.assertEqual(result.returncode, 2)
        self.assertIn(b'unrecognized arguments', result.stderr)

    def test_qa1_regressions_are_review_cases_not_owner_rules(self):
        cases=m.load(m.ROOT/'vocabflow-dataset/workspaces/master-editorial-quality-corrections/finding-dispositions.json')['findings']
        self.assertEqual(len(cases), 22)
        self.assertTrue(all(c['ownerDecision']=='UNRESOLVED' for c in cases))
        for word in ['about','act','bread','block','acute','arm','carbon dioxide','run','attorney']:
            row=copy.deepcopy(self.rows[0]);row['headwordEvidence']=word
            self.assertIn('QA1_KNOWN_MEANING_POS_BOUNDARY_CASE_REQUIRES_EXPLICIT_REVIEW', m.language_signals(row))
        retained=next(c for c in cases if c['proposalKey']=='EDITORIAL_2H2B:attorney:lawyer')
        self.assertEqual(retained['disposition'], 'REJECT_FINDING_WITH_REASON')

    def test_qa1_lexical_negation_false_positive(self):
        row=copy.deepcopy(self.rows[0]);row['headwordEvidence']='attorney'
        row['content']['examples']=[{'en':"The attorney explained the contract's unclear wording.", 'vi':'Luật sư giải thích cách diễn đạt chưa rõ trong hợp đồng.'}]
        self.assertNotIn('POLARITY_SIGNAL_REQUIRES_CONTEXT_REVIEW', m.language_signals(row))

    def test_qa1_concrete_pos_scope_valency_and_coalescence_regressions(self):
        preview = m.load(m.ROOT/'vocabflow-dataset/workspaces/master-editorial-quality-corrections/corrected-pilot-preview.json')
        records = preview['senseProposals']
        by_key = {r['proposalKey']:r for r in records}
        self.assertEqual(by_key['EDITORIAL_2H2B:about:approximately']['partOfSpeechProposal'], 'ADVERB')
        self.assertEqual(by_key['EDITORIAL_2H2B:act:behave']['content']['senseLabelEn'], 'take action')
        self.assertIn('other ingredients', by_key['EDITORIAL_2H2B:bread:baked-food']['content']['definitionEn'])
        self.assertIn('distance', by_key['EDITORIAL_2H2B:block:street-section']['content']['definitionEn'])
        self.assertIn('acute sense of smell', by_key['EDITORIAL_2H2B:acute:perceptive']['content']['examples'][0]['en'])
        self.assertIn('plural arms', by_key['EDITORIAL_2H2B:arm:weapons']['content']['senseLabelEn'])
        self.assertIn('two oxygen atoms', by_key['EDITORIAL_2H2B:carbon dioxide:gas']['content']['definitionEn'])
        identity = m.load(m.ROOT/'vocabflow-dataset/workspaces/master-editorial-quality-corrections/sense-identity-review.json')
        run = next(c for c in identity['cases'] if c['proposalKey']=='EDITORIAL_2H2B:run:operate')
        self.assertEqual(run['representationProposal']['valency'], 'INTRANSITIVE_FUNCTION')
        self.assertFalse(identity['structureChangesExecuted'])
        self.assertTrue(all(r['ownerDecision']=='UNRESOLVED' for r in records))

    def test_valency_and_number_mutations_produce_review_signals(self):
        row=copy.deepcopy(self.rows[0]);row['headwordEvidence']='listen'
        row['content']['examples']=[{'en':'Listen the 2 announcements.', 'vi':'Nghe 3 thông báo.'}]
        signals=m.language_signals(row)
        self.assertIn('LISTEN_TO_VALENCY_REVIEW',signals);self.assertIn('NUMBER_PAIR_REVIEW',signals)

    def test_report_contains_real_bilingual_content_and_corrections(self):
        self.assertIn(self.rows[0]['content']['examples'][0]['vi'], self.report)
        self.assertIn('BEFORE:', self.report);self.assertIn('AFTER (DRAFT):', self.report)
        self.assertIn('no classification assigned',self.report)


if __name__ == '__main__':
    unittest.main(verbosity=2)
