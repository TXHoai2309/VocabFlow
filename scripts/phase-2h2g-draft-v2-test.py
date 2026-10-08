#!/usr/bin/env python3
"""Offline regression of exact draft correction scope and preservation."""
import copy
import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('draft_v2', Path(__file__).with_name('phase-2h2g-draft-v2.py'))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class DraftV2Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.objects, cls.report = m.build()
        cls.revisions = cls.objects['draft-revisions.json']['records']
        cls.corrections = cls.objects['applied-corrections.json']['corrections']
        cls.base = {r['proposalKey']: r['proposedOverlayContent'] for r in m.load(m.e.WS/'release-candidate-preview.json')['records']}

    def reject(self, mutate):
        cs = copy.deepcopy(self.corrections)
        mutate(cs)
        with self.assertRaises(ValueError):
            m.apply(self.base, cs)

    def test_exact_four_refs(self):
        self.assertEqual([c['correctionRef'] for c in self.corrections], m.AUTH['exactCorrectionRefs'])

    def test_exact_three_keys(self):
        self.assertEqual({r['proposalKey'] for r in self.revisions}, {f'EDITORIAL_{a[2]}:{a[0]}:{a[1]}' for a in m.AUTHORIZED})

    def test_original_hashes(self):
        for r in self.revisions:
            self.assertEqual(r['originalContentHash'], m.e.revision(self.base[r['proposalKey']]))

    def test_before_fields(self):
        for c in self.corrections:
            self.assertEqual(m.e.fields(self.base[c['proposalKey']])[c['field']], c['before'])

    def test_after_fields(self):
        revised = {r['proposalKey']: r['record'] for r in self.revisions}
        for c in self.corrections:
            self.assertEqual(m.e.fields(revised[c['proposalKey']])[c['field']], c['after'])

    def test_duplicate_ref_rejected(self):
        self.reject(lambda cs: cs.__setitem__(1, cs[0]))

    def test_duplicate_application_rejected(self):
        base = dict(self.base)
        base.update({r['proposalKey']: r['record'] for r in self.revisions})
        with self.assertRaises(ValueError):
            m.apply(base, self.corrections)

    def test_stable_apply(self):
        self.assertEqual(m.apply(self.base, self.corrections), m.apply(self.base, self.corrections))

    def test_original_not_mutated(self):
        base = copy.deepcopy(self.base)
        cs = copy.deepcopy(self.corrections)
        m.apply(base, cs)
        self.assertEqual(base, self.base)
        self.assertEqual(cs, self.corrections)

    def test_effective_813(self):
        self.assertEqual(len(self.objects['effective-draft-preview.json']['records']), 813)

    def test_lookup_layers_exact(self):
        rows = self.objects['effective-draft-preview.json']['records']
        self.assertEqual(sum(r['lookupLayer'] == 'DRAFT_V2' for r in rows), 3)
        self.assertEqual(sum(r['lookupLayer'] == '2H2E_PREVIEW' for r in rows), 37)
        self.assertEqual(sum(r['lookupLayer'] == 'ACCEPTED_INVENTORY' for r in rows), 773)

    def test_unchanged_810(self):
        rows = self.objects['content-hash-mapping.json']['records']
        self.assertEqual(sum(r['originalContentHash'] == r['effectiveContentHash'] for r in rows), 810)

    def test_keep_seven_equivalent(self):
        for word in m.KEEP:
            key = next(k for k, r in self.base.items() if r['headword'] == word)
            self.assertEqual(m.resolve(key, self.base, self.revisions), self.base[key])
            self.assertNotIn(key, {r['proposalKey'] for r in self.revisions})

    def test_lineage_and_hash(self):
        for r in self.revisions:
            self.assertEqual(r['draftVersion'], 2)
            self.assertEqual(r['parentLayer'], 'ACCEPTED_2H2E_EFFECTIVE_PREVIEW')
            self.assertEqual(m.e.revision(r['record']), r['revisedContentHash'])
            self.assertNotEqual(r['originalContentHash'], r['revisedContentHash'])

    def test_stale_hash_rejected(self):
        self.reject(lambda cs: cs[0].update(originalContentHash='0'*64))

    def test_before_mismatch_rejected(self):
        self.reject(lambda cs: cs[0].update(before='stale'))

    def test_alternative_after_rejected(self):
        self.reject(lambda cs: cs[0].update(after='unapproved alternative'))

    def test_wrong_path_rejected(self):
        self.reject(lambda cs: cs[0].update(field='/content/definitionEn'))

    def test_field_hash_drift_rejected(self):
        self.reject(lambda cs: cs[0].update(afterSha256='0'*64))

    def test_missing_extra_rejected(self):
        self.reject(lambda cs: cs.pop())
        self.reject(lambda cs: cs.append(cs[0]))

    def test_fingerprints_preserved(self):
        self.assertEqual(m.load(m.e.WS/'manifest.json')['fingerprint'], m.f.PIN)
        self.assertEqual(m.load(m.f.WS/'manifest.json')['fingerprint'], m.F_PIN)

    def test_no_false_approval(self):
        auth = self.objects['applied-corrections.json']['authorization']
        for name in ['formalHumanContentApprovalsAdded', 'identityApprovalsAdded', 'rightsClearancesAdded']:
            self.assertEqual(auth[name], 0)
        self.assertEqual(m.load(m.e.WS/'owner-decision-ledger.json')['decisions'], [])
        for r in self.revisions:
            self.assertEqual(r['contentStatus'], 'DRAFT')
            self.assertEqual(r['humanContentApproval'], 'UNRESOLVED')
            self.assertFalse(r['publicationEligible'])

    def test_no_canonical_id(self):
        self.assertEqual(m.AUTH['canonicalIdsAllocated'], 0)
        for r in self.revisions:
            self.assertEqual(r['record'].get('masterSenseId'), self.base[r['proposalKey']].get('masterSenseId'))

    def test_no_database_legacy_release(self):
        summary = self.objects['validation-summary.json']
        self.assertEqual(summary['authorization']['databaseAccess'], 'NONE')
        self.assertEqual(summary['authorization']['databaseWrites'], 'NONE')
        self.assertFalse(summary['legacyModified'])
        self.assertFalse(summary['masterReleaseChanged'])
        self.assertEqual(summary['authorization']['production'], 'UNTOUCHED')

    def test_provenance_and_source_preserved(self):
        for r in self.revisions:
            self.assertTrue(m.e.valid_provenance(r['record']))
            for field in ['sourceEvidence', 'editorialProvenance', 'partOfSpeechProposal', 'candidateGroupKey']:
                self.assertEqual(r['record'][field], self.base[r['proposalKey']][field])

    def test_prior_overlays_not_reverted(self):
        for key, base in self.base.items():
            if key not in {r['proposalKey'] for r in self.revisions}:
                self.assertEqual(m.resolve(key, self.base, self.revisions), base)

    def test_unknown_lookup_rejected(self):
        with self.assertRaises(ValueError):
            m.resolve('unknown', self.base, self.revisions)

    def test_stale_lookup_rejected(self):
        rev = copy.deepcopy(self.revisions)
        rev[0]['originalContentHash'] = '0'*64
        with self.assertRaises(ValueError):
            m.resolve(rev[0]['proposalKey'], self.base, rev)

    def test_all_ten_report_and_four_changes(self):
        self.assertEqual(len(self.objects['quality-audit.json']['records']), 10)
        self.assertEqual(sum(len(r['changedFields']) for r in self.revisions), 4)
        for word in m.f.WORDS:
            self.assertIn('### '+word+'\n', self.report)
        self.assertEqual(self.report.count('BEFORE: '), 4)
        self.assertEqual(self.report.count('AFTER: '), 4)


if __name__ == '__main__':
    unittest.main()
