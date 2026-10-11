"""CP04 no-write contract, isolation and adversarial integrity tests."""
import copy
import importlib.util
import json
import subprocess
import unittest
from pathlib import Path
from unittest.mock import patch

spec=importlib.util.spec_from_file_location('cp04_test',Path(__file__).with_name('checkpoint-04.py'))
C=importlib.util.module_from_spec(spec);spec.loader.exec_module(C)

def snapshot():
    paths=list(C.WS.rglob('*'))+list((C.ROOT/'scripts/__pycache__').glob('*'))
    return ({str(p):C.M.sha(p.read_bytes()) for p in paths if p.is_file()},subprocess.check_output(['git','status','--short','--untracked-files=all'],cwd=C.ROOT))

class Integrity(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.before=snapshot();cls.groups,cls.parent,cls.frozen=C.selection()
        cls.files,cls.manifest=C.build();cls.rows=json.loads(cls.files['new-sense-proposals.json'])['records']
        cls.original=[r for n in range(1,6) for r in C.micro(n)[0]]
        cls.changes=json.loads(cls.files['revision-evidence.json'])['records']
        cls.adversarial=copy.deepcopy(cls.changes)
        if not cls.adversarial:
            row=copy.deepcopy(cls.original[0]);before=row['content']['meaningVi'];after=before+' (bản kiểm thử)';old=row['effectiveContentHash'];row['content']['meaningVi']=after
            new=C.M.digest({'proposalKey':row['proposalKey'],'candidateGroupKey':row['candidateGroupKey'],'headword':row['headword'],'partOfSpeechProposal':row['partOfSpeech'],'content':row['content']})
            cls.adversarial=[{'proposalKey':row['proposalKey'],'field':'meaningVi','before':before,'after':after,'beforeContentHash':old,'afterContentHash':new,'beforeFieldHash':C.M.digest(before),'afterFieldHash':C.M.digest(after)}]

    @classmethod
    def tearDownClass(cls):
        assert snapshot()==cls.before,'Tests wrote files or changed Git state'

    def test_parent_replay_and_byte_pins(self):
        report,_,_=C.P.verify()
        self.assertEqual(report['parentFingerprint'],C.PARENT_FP)
        self.assertEqual((report['acceptedWorkspaceBytePins'],report['artifactPins'],report['rawInputPins']),(199,8,46))
        self.assertEqual(report['status'],'PASS');self.assertTrue(report['zeroWrites'])

    def test_module_adapters_are_isolated(self):
        self.assertIsNot(C.M,C.B.M);self.assertIsNot(C.M.C,C.B.M.C)
        self.assertIsNot(C.V,C.B.V)
        self.assertEqual(C.B.M.CP,C.B.CP);self.assertEqual(C.B.M.C.CP,C.B.CP)
        self.assertEqual(C.M.CP,C.CP);self.assertEqual(C.M.C.CP,C.CP)
        self.assertEqual(C.B.build()[1]['fingerprint'],C.PARENT_FP)

    def test_exact_frozen_membership(self):
        self.assertEqual([g['cohortOrder'] for g in self.groups],list(range(301,401)))
        self.assertEqual([g['authoringOrder'] for g in self.groups],list(range(1,101)))
        self.assertEqual(len({g['candidateGroupKey'] for g in self.groups}),100)
        for n in range(1,6):self.assertEqual([g['microBatchWithinCheckpoint'] for g in self.groups[(n-1)*20:n*20]],[n]*20)

    def test_reject_local_order_drift(self):
        frozen=copy.deepcopy(self.frozen);frozen['groups'][300]['authoringOrder']=201
        with patch.object(C.P,'verify',return_value=({},self.parent,frozen)):
            with self.assertRaisesRegex(ValueError,'global/local order'):C.selection.__wrapped__()

    def test_data_derived_plan_counts_and_seals(self):
        plans=[p for n in range(1,6) for p in C.plan(n)['entries']]
        self.assertEqual(len(plans),100)
        self.assertEqual(sum(p['proposedNumberOfSenses'] for p in plans),len(self.rows))
        self.assertEqual(len(self.rows),self.manifest['counts']['newSenses'])
        for n in range(1,6):
            r,q,z=C.micro(n);self.assertEqual(C.V.load(C.CP/f'micro-{n:02d}-seal.json'),z);C.M.validate_handoff(n,r,z)

    def test_reject_duplicate_and_wrong_pos(self):
        data=(C.CP/'authored/micro-01.psv').read_bytes();line=data.splitlines()[0]
        with self.assertRaisesRegex(ValueError,'Duplicate'):C.parse(data+line+b'\n',self.groups[:20])
        parts=line.split(b'|'); parts[2]=b'NUMBER' if parts[2]!=b'NUMBER' else b'VERB'; wrong=b'|'.join(parts)+b'\n'+b'\n'.join(data.splitlines()[1:])+b'\n'
        with self.assertRaisesRegex(ValueError,'Unsupported source POS'):C.parse(wrong,self.groups[:20])

    def test_content_and_example_keys(self):
        C.P.content(self.rows)
        examples=[e['exampleKey'] for r in self.rows for e in r['content']['examples']]
        self.assertEqual(len(examples),len(set(examples)))
        bad=copy.deepcopy(self.rows);bad[0]['content']['meaningVi']+=' changed'
        with self.assertRaisesRegex(ValueError,'Effective content hash drift'):C.P.content(bad)

    def test_all_inherited_objects_equal(self):
        projection=json.loads(self.files['cumulative-effective-draft-projection.json'])
        self.assertEqual(len(self.parent['records']),2547)
        self.assertEqual(projection['records'][:2547],self.parent['records'])
        self.assertEqual(len(projection['records']),2547+len(self.rows))
        self.assertEqual(self.manifest['counts']['cumulativeAuthoredGroups'],1920)
        self.assertEqual(self.manifest['counts']['remainingUnauthoredGroups'],4223)
        self.assertTrue({r['candidateGroupKey'] for r in self.rows}.isdisjoint(r['candidateGroupKey'] for r in self.parent['records']))

    def test_forward_revision_is_pure(self):
        before=copy.deepcopy(self.original)
        self.assertEqual(C.apply_changes(self.original,self.changes),self.rows)
        self.assertEqual(before,self.original);C.review_integrity(self.original,self.rows,self.changes)

    def test_reject_revision_before_hash(self):
        bad=copy.deepcopy(self.adversarial);bad[0]['beforeContentHash']='0'*64
        with self.assertRaisesRegex(ValueError,'parent hash'):C.apply_changes(self.original,bad)

    def test_reject_revision_before_text(self):
        bad=copy.deepcopy(self.adversarial);bad[0]['before']+=' changed'
        with self.assertRaisesRegex(ValueError,'BEFORE'):C.apply_changes(self.original,bad)

    def test_reject_revision_field_or_after_hash(self):
        bad=copy.deepcopy(self.adversarial);bad[0]['afterFieldHash']='0'*64
        with self.assertRaisesRegex(ValueError,'field hash'):C.apply_changes(self.original,bad)
        bad=copy.deepcopy(self.adversarial);bad[0]['afterContentHash']='0'*64
        with self.assertRaisesRegex(ValueError,'AFTER hash'):C.apply_changes(self.original,bad)

    def test_current_hash_review_completeness(self):
        review=json.loads(self.files['independent-review.json']);effective={r['proposalKey']:r['effectiveContentHash'] for r in self.rows}
        self.assertEqual(review['status'],'COMPLETE');self.assertTrue(review['publicationReady'])
        self.assertEqual({q['proposalKey'] for q in review['records']},set(effective))
        self.assertTrue(all(q['effectiveContentHash']==effective[q['proposalKey']] for q in review['records']))
        self.assertFalse(any(q['assessment']=='FAIL' or q['blocksPublication'] for q in review['records']))

    def test_reject_wrong_flat_review_count(self):
        original_load=C.V.load
        def altered(path):
            value=original_load(path)
            if path==C.CP/'independent-review/micro-01.json':
                value=copy.deepcopy(value);value.pop('counts',None);value['passCount']=sum(q['assessment']=='PASS' for q in value['records'])+1;value['reviewCount']=sum(q['assessment']=='REVIEW' for q in value['records']);value['failCount']=sum(q['assessment']=='FAIL' for q in value['records'])
            return value
        with patch.object(C.V,'load',side_effect=altered):
            with self.assertRaisesRegex(ValueError,'receipt count drift'):C.review_integrity(self.original,self.rows,self.changes)

    def test_reject_wrong_nested_review_count(self):
        original_load=C.V.load
        def altered(path):
            value=original_load(path)
            if path==C.CP/'independent-review/micro-02.json':
                value=copy.deepcopy(value);value['counts']={state:sum(q['assessment']==state for q in value['records']) for state in ('PASS','REVIEW','FAIL')};value['counts']['PASS']+=1
            return value
        with patch.object(C.V,'load',side_effect=altered):
            with self.assertRaisesRegex(ValueError,'nested receipt count drift'):C.review_integrity(self.original,self.rows,self.changes)

    def test_reject_stale_recheck_record(self):
        if not self.changes: self.skipTest('No forward corrections in this checkpoint; pure revision negative tests still executed')
        bad=copy.deepcopy(self.rows);key=self.changes[0]['proposalKey']
        next(r for r in bad if r['proposalKey']==key)['effectiveContentHash']='0'*64
        with self.assertRaisesRegex(ValueError,'Recheck effective record drift'):C.review_integrity(self.original,bad,self.changes)

    def test_review_before_seal_gate_rejects_incomplete_review(self):
        with patch.object(C.M.C,'independent',return_value={'publicationReady':False}):
            with self.assertRaisesRegex(ValueError,'Cannot seal before complete'):C.reviewed_effective()

    def test_effective_copying_gate_runs_after_verified_additive_revisions(self):
        self.assertEqual(C.reviewed_effective(),self.rows)
        self.assertEqual([r for n in range(1,6) for r in C.micro(n)[0]],self.original)

    def test_copying_and_unapproved_status(self):
        summary=json.loads(self.files['validation-summary.json'])
        self.assertEqual(summary['crossSourceCopyingScreen']['sourceRecordsScanned'],9677)
        self.assertEqual(summary['crossSourceCopyingScreen']['eightWordOverlaps'],[])
        self.assertEqual(summary['crossSourceCopyingScreen']['authoredSenseRecordsScanned'],len(self.rows))
        self.assertTrue(all(r['contentStatus']=='DRAFT' and r['rights']=='UNKNOWN_REVIEW_REQUIRED' and not r['formalApproval'] and r['canonicalIdsAllocated']==0 for r in self.rows))

if __name__=='__main__':unittest.main(verbosity=2)
