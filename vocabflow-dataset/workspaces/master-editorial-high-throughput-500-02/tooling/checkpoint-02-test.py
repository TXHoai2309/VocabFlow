"""No-write CP02 integrity and adversarial mutation tests."""
import copy
import importlib.util
import json
import subprocess
import unittest
from pathlib import Path
from unittest.mock import patch

spec=importlib.util.spec_from_file_location("checkpoint02_test_target",Path(__file__).with_name("checkpoint-02.py"))
C=importlib.util.module_from_spec(spec);spec.loader.exec_module(C)

def snapshot():
    return ({p.relative_to(C.WS).as_posix():C.M.sha(p.read_bytes()) for p in C.WS.rglob("*") if p.is_file()},subprocess.check_output(["git","status","--short","--untracked-files=all"],cwd=C.ROOT))

class Integrity(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.before=snapshot();cls.groups,cls.parent,cls.frozen=C.selection()
        cls.files,cls.manifest=C.build()
        cls.rows=json.loads(cls.files["new-sense-proposals.json"])["records"]
        cls.changes=json.loads(cls.files["revision-evidence.json"])["records"]
        cls.original=[r for n in range(1,6) for r in C.micro(n)[0]]

    @classmethod
    def tearDownClass(cls):
        assert snapshot()==cls.before,"Tests wrote files or changed Git state"

    def test_published_cp01_exact_pins_and_replay(self):
        report,_,_=C.P.verify()
        self.assertEqual((report["artifactPins"],report["rawInputPins"],report["acceptedWorkspaceBytePins"]),(8,60,79))
        self.assertEqual(report["status"],"PASS");self.assertTrue(report["zeroWrites"])
        self.assertEqual(report["parentFingerprint"],C.PARENT_FP)

    def test_global_and_checkpoint_local_selection(self):
        self.assertEqual([g["cohortOrder"] for g in self.groups],list(range(101,201)))
        self.assertEqual([g["authoringOrder"] for g in self.groups],list(range(1,101)))
        self.assertEqual(len({g["candidateGroupKey"] for g in self.groups}),100)
        for n in range(1,6):self.assertEqual([g["microBatchWithinCheckpoint"] for g in self.groups[(n-1)*20:n*20]],[n]*20)

    def test_reject_wrong_checkpoint_local_order(self):
        frozen=copy.deepcopy(self.frozen)
        frozen["groups"][100]["authoringOrder"]=101
        with patch.object(C.P,"verify",return_value=({},self.parent,frozen)):
            with self.assertRaisesRegex(ValueError,"global/local order"):C.selection.__wrapped__()

    def test_actual_plan_manuscript_and_seal_accounting(self):
        plans=[p for n in range(1,6) for p in C.plan(n)["entries"]]
        self.assertEqual(len(plans),100)
        self.assertEqual(sum(p["proposedNumberOfSenses"] for p in plans),len(self.rows))
        self.assertEqual({r["candidateGroupKey"] for r in self.rows},{g["candidateGroupKey"] for g in self.groups})
        self.assertTrue(all(r["proposalKey"].startswith("EDITORIAL_2H2L:") for r in self.rows))
        for n in range(1,6):
            r,_,seal=C.micro(n);self.assertEqual(C.V.load(C.CP/f"micro-{n:02d}-seal.json"),seal);C.M.validate_handoff(n,r,seal)

    def test_duplicate_and_unsupported_pos_rejected(self):
        data=(C.CP/"authored/micro-01.psv").read_bytes();line=data.splitlines()[0]
        with self.assertRaisesRegex(ValueError,"Duplicate"):C.parse(data+line+b"\n",self.groups[:20])
        invalid=data.replace(b"overuse|use-excessively|VERB",b"overuse|use-excessively|NOUN",1)
        with self.assertRaisesRegex(ValueError,"Unsupported source POS"):C.parse(invalid,self.groups[:20])

    def test_new_example_and_content_hash_identity(self):
        C.P.content(self.rows)
        examples=[e["exampleKey"] for r in self.rows for e in r["content"]["examples"]]
        self.assertEqual(len(examples),len(set(examples)))
        bad=copy.deepcopy(self.rows);bad[0]["content"]["meaningVi"]+=" altered"
        with self.assertRaisesRegex(ValueError,"Effective content hash drift"):C.P.content(bad)

    def test_all_inherited_records_preserved(self):
        projection=json.loads(self.files["cumulative-effective-draft-projection.json"])
        self.assertEqual(len(self.parent["records"]),2226)
        self.assertEqual(projection["records"][:2226],self.parent["records"])
        self.assertEqual(len(projection["records"]),2226+len(self.rows))
        counts=self.manifest["counts"]
        self.assertEqual(counts["cumulativeAuthoredGroups"],1720)
        self.assertEqual(counts["remainingUnauthoredGroups"],4423)

    def test_revision_chain_is_forward_and_does_not_mutate_original(self):
        before=copy.deepcopy(self.original)
        self.assertEqual(C.apply_changes(self.original,self.changes),self.rows)
        self.assertEqual(self.original,before)
        C.review_integrity(self.original,self.rows,self.changes)

    def test_reject_revision_before_hash_drift(self):
        bad=copy.deepcopy(self.changes);bad[0]["beforeContentHash"]="0"*64
        with self.assertRaisesRegex(ValueError,"parent hash"):C.apply_changes(self.original,bad)

    def test_reject_revision_before_value_drift(self):
        bad=copy.deepcopy(self.changes);bad[0]["before"]+=" altered"
        with self.assertRaisesRegex(ValueError,"BEFORE"):C.apply_changes(self.original,bad)

    def test_reject_revision_field_and_after_hash_drift(self):
        bad=copy.deepcopy(self.changes);bad[0]["afterFieldHash"]="0"*64
        with self.assertRaisesRegex(ValueError,"field hash"):C.apply_changes(self.original,bad)
        bad=copy.deepcopy(self.changes);bad[0]["afterContentHash"]="0"*64
        with self.assertRaisesRegex(ValueError,"AFTER hash"):C.apply_changes(self.original,bad)

    def test_current_hash_independent_review_and_nonblocking_state(self):
        review=json.loads(self.files["independent-review.json"])
        effective={r["proposalKey"]:r["effectiveContentHash"] for r in self.rows}
        self.assertEqual(review["status"],"COMPLETE");self.assertTrue(review["publicationReady"])
        self.assertEqual({q["proposalKey"] for q in review["records"]},set(effective))
        self.assertTrue(all(q["effectiveContentHash"]==effective[q["proposalKey"]] for q in review["records"]))
        self.assertFalse(any(q["assessment"]=="FAIL" or q["blocksPublication"] for q in review["records"]))
        self.assertTrue(any(q["blocksPublication"] for q in review["firstPassRecords"]))

    def test_reject_stale_recheck_effective_record(self):
        bad=copy.deepcopy(self.rows)
        key=self.changes[0]["proposalKey"]
        next(r for r in bad if r["proposalKey"]==key)["effectiveContentHash"]="0"*64
        with self.assertRaisesRegex(ValueError,"Recheck effective record drift"):C.review_integrity(self.original,bad,self.changes)

    def test_reject_unexplained_unchanged_review_disposition(self):
        original_load=C.V.load
        def altered(path):
            value=original_load(path)
            if path==C.CP/"handoff/recheck-micro-03.json":
                value=copy.deepcopy(value);value["reviewDispositionOnly"]=False
            return value
        with patch.object(C.V,"load",side_effect=altered):
            with self.assertRaisesRegex(ValueError,"Unrelated recheck handoff"):C.review_integrity(self.original,self.rows,self.changes)

    def test_copying_screen_and_unapproved_draft_flags(self):
        summary=json.loads(self.files["validation-summary.json"])
        self.assertEqual(summary["crossSourceCopyingScreen"]["sourceRecordsScanned"],9677)
        self.assertEqual(summary["crossSourceCopyingScreen"]["eightWordOverlaps"],[])
        self.assertEqual(summary["crossSourceCopyingScreen"]["authoredSenseRecordsScanned"],len(self.rows))
        self.assertTrue(all(r["contentStatus"]=="DRAFT" and r["rights"]=="UNKNOWN_REVIEW_REQUIRED" and not r["formalApproval"] and r["canonicalIdsAllocated"]==0 for r in self.rows))

if __name__=="__main__":unittest.main(verbosity=2)
