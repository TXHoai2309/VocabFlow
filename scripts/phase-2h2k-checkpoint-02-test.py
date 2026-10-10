"""Negative integrity regressions for checkpoint 02; no filesystem writes."""
import copy
import importlib.util
import unittest
from pathlib import Path
from unittest.mock import patch

spec=importlib.util.spec_from_file_location('checkpoint',Path(__file__).with_name('phase-2h2k-checkpoint-02.py'))
C=importlib.util.module_from_spec(spec);spec.loader.exec_module(C)


class Integrity(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.groups,cls.parent=C.selection()
        cls.original=[]
        for n in range(1,6):
            r,q,s=C.micro(n);cls.original+=r
            C.V.require((C.CP/f'micro-{n:02d}-seal.json').read_bytes()==C.V.encode(s),'Seal drift')
        cls.effective,cls.changes=C.revisions(copy.deepcopy(cls.original))

    def test_membership(self):
        self.assertEqual(list(range(101,201)),[g['authoringOrder'] for g in self.groups])
        self.assertEqual(100,len({g['candidateGroupKey'] for g in self.groups}))
        self.assertTrue({g['candidateGroupKey'] for g in self.groups}.isdisjoint(r['candidateGroupKey'] for r in self.parent['records']))

    def test_all_source_pointers_and_planned_boundaries(self):
        total=0
        for n in range(1,6):
            plan=C.plan(n)
            self.assertEqual(20,len(plan['entries']))
            for entry in plan['entries']:
                self.assertEqual(len(entry['sourceReferences']),len(entry['sourceEvidence']))
                for source in entry['sourceEvidence']:
                    ref=source['reference'];record=C.V.inputs()[3][ref['corpus']][ref['recordIndex']]
                    self.assertEqual(record['sourceFields'],source['sourceFields'])
                    self.assertEqual(record['candidateSourceSenseGroups'],source['candidateSourceSenseGroups'])
                total+=entry['proposedNumberOfSenses']
        self.assertEqual(len(self.original),total)

    def test_parent_exact_and_unique(self):
        self.assertEqual(1666,len(self.parent['records']))
        self.assertEqual(len(self.effective),len({r['proposalKey'] for r in self.effective}))
        self.assertTrue({r['proposalKey'] for r in self.effective}.isdisjoint(r['proposalKey'] for r in self.parent['records']))

    def test_manuscript_crlf_rejected(self):
        data=(C.CP/'authored/micro-01.psv').read_bytes().replace(b'\n',b'\r\n')
        with self.assertRaisesRegex(ValueError,'UTF-8 LF'):C.V.parse_manuscript(data,self.groups[:20])

    def test_duplicate_proposal_rejected(self):
        data=(C.CP/'authored/micro-01.psv').read_bytes();data+=data.splitlines()[0]+b'\n'
        with self.assertRaisesRegex(ValueError,'Duplicate'):C.V.parse_manuscript(data,self.groups[:20])

    def test_unplanned_missing_group_rejected(self):
        data=(C.CP/'authored/micro-01.psv').read_bytes();data=b'\n'.join(data.splitlines()[1:])+b'\n'
        with self.assertRaisesRegex(ValueError,'Missing frozen'):C.V.parse_manuscript(data,self.groups[:20])

    def test_before_hash_tamper_rejected(self):
        bad=copy.deepcopy(self.original);bad[5]['effectiveContentHash']='0'*64
        with self.assertRaisesRegex(ValueError,'parent hash'):C.revisions(bad)

    def test_before_text_tamper_rejected(self):
        bad=copy.deepcopy(self.original);bad[5]['content']['definitionEn']='wrong'
        with self.assertRaisesRegex(ValueError,'BEFORE'):C.revisions(bad)

    def test_revision_scope(self):
        revised={r['proposalKey']:r for r in self.effective}
        changed={c['proposalKey'] for c in self.changes}
        for old in self.original:
            new=revised[old['proposalKey']]
            for field in ['candidateGroupKey','partOfSpeech','sourceEvidence','canonicalIdsAllocated','formalApproval','contentStatus','rights']:
                self.assertEqual(old[field],new[field])
            if old['proposalKey'] not in changed:self.assertEqual(old,new)

    def test_stale_independent_hash_rejected(self):
        bad=copy.deepcopy(self.original);bad[0]['effectiveContentHash']='0'*64
        with self.assertRaisesRegex(ValueError,'content hash'):C.independent(self.effective,bad)

    def test_missing_or_duplicate_review_fails(self):
        actual=C.V.load
        def altered(path):
            value=actual(path)
            if path.name=='micro-01.json' and path.parent.name=='independent-review':
                value['records'].append(copy.deepcopy(value['records'][0]))
            return value
        with patch.object(C.V,'load',side_effect=altered):
            with self.assertRaisesRegex(ValueError,'Duplicate independent'):C.independent(self.effective,self.original)

    def test_recheck_hash_tamper_rejected(self):
        actual=C.V.load
        def altered(path):
            value=actual(path)
            if path.name=='recheck.json':value['records'][0]['effectiveContentHash']='0'*64
            return value
        if not (C.CP/'independent-review/recheck.json').exists():self.skipTest('Independent recheck pending')
        with patch.object(C.V,'load',side_effect=altered):
            with self.assertRaisesRegex(ValueError,'Recheck hash'):C.independent(self.effective,self.original)


if __name__=='__main__':unittest.main()
