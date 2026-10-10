"""Focused integrity tests for Phase 2H.2L Cohort 500-02 Checkpoint 01."""
import copy
import importlib.util
import json
import unittest
from pathlib import Path

ROOT = next(p for p in Path(__file__).resolve().parents if (p / "AGENTS.md").is_file())
ADAPTER = ROOT / "vocabflow-dataset/workspaces/master-editorial-high-throughput-500-02/tooling/checkpoint-01.py"
spec = importlib.util.spec_from_file_location("phase_2h2l_cp01", ADAPTER)
M = importlib.util.module_from_spec(spec)
spec.loader.exec_module(M)


class Checkpoint01IntegrityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.groups, cls.parent, cls.frozen = M.selection()
        cls.micros = {}
        for number in range(1, 6):
            cls.micros[number] = M.micro(number)
        cls.all_rows = [row for number in range(1, 6) for row in cls.micros[number][0]]
        cls.original_rows = copy.deepcopy(cls.all_rows)
        cls.effective_rows, cls.revisions = M.C.revisions(copy.deepcopy(cls.all_rows))
        cls.independent = M.C.independent(cls.effective_rows, cls.original_rows)
        cls.artifacts, cls.manifest = M.build()

    def test_frozen_cohort_and_authoritative_parent(self):
        self.assertEqual(self.frozen["fingerprint"], "9710a47fda875f70412c7440b2969c031dc6eb3c076140a42007aed4f83cf59c")
        self.assertEqual(len(self.frozen["groups"]), 500)
        self.assertEqual(len(self.groups), 100)
        self.assertEqual(len(self.parent["records"]), 2081)
        parent_groups = {row["candidateGroupKey"] for row in self.parent["records"]}
        self.assertEqual(len(parent_groups), 1520)
        self.assertEqual(len({row["proposalKey"] for row in self.parent["records"]}), 2081)
        selected = {group["candidateGroupKey"] for group in self.frozen["groups"]}
        self.assertEqual(len(selected), 500)
        self.assertTrue(parent_groups.isdisjoint(selected))
        self.assertEqual([group["authoringOrder"] for group in self.groups], list(range(1, 101)))

    def test_five_sealed_micro_batches_cover_exactly_100_groups(self):
        rows = []
        for number, (batch, qa, seal) in self.micros.items():
            self.assertEqual(len({row["candidateGroupKey"] for row in batch}), 20)
            self.assertEqual((M.CP / f"micro-{number:02d}-seal.json").read_bytes(), M.encode(seal))
            M.validate_handoff(number, batch, seal)
            rows.extend(batch)
        self.assertEqual(len({row["candidateGroupKey"] for row in rows}), 100)
        self.assertEqual(len(rows), 145)
        self.assertEqual(len({row["proposalKey"] for row in rows}), 145)

    def test_review_and_forward_correction_lineage(self):
        self.assertEqual(len(self.revisions), 23)
        self.assertEqual(
            sum(change["reviewFindingSource"] == "independent-review/micro-05.json" for change in self.revisions),
            4,
        )
        self.assertEqual(self.independent["status"], "COMPLETE")
        self.assertTrue(self.independent["publicationReady"])
        self.assertFalse(any(row["assessment"] == "FAIL" or row["blocksPublication"] for row in self.independent["records"]))
        first_pass = M.V.load(M.CP / "independent-review/micro-05.json")
        self.assertEqual((first_pass["passCount"], first_pass["reviewCount"], first_pass["failCount"]), (27, 2, 0))
        recheck = M.V.load(M.CP / "independent-review/recheck-micro-05.json")
        self.assertEqual(len(recheck["records"]), 2)
        self.assertTrue(all(row["assessment"] == "PASS" and not row["blocksPublication"] for row in recheck["records"]))
        effective = {row["proposalKey"]: row["effectiveContentHash"] for row in self.effective_rows}
        self.assertTrue(all(row["effectiveContentHash"] == effective[row["proposalKey"]] for row in recheck["records"]))

    def test_parser_rejects_duplicate_proposal_identity(self):
        groups = self.groups[80:100]
        source = (M.CP / "authored/micro-05.psv").read_bytes()
        last_line = source.rstrip(b"\n").split(b"\n")[-1]
        with self.assertRaises(ValueError):
            M.parse(source + b"\n" + last_line + b"\n", groups)

    def test_projection_preserves_parent_and_source_screen_scope(self):
        projection = json.loads(self.artifacts["cumulative-effective-draft-projection.json"].decode("utf-8"))
        self.assertEqual(projection["records"][:2081], self.parent["records"])
        self.assertEqual(len(projection["records"]), 2226)
        counts = self.manifest["counts"]
        self.assertEqual(counts["cumulativeAuthoredGroups"], 1620)
        self.assertEqual(counts["cumulativeDraftSenses"], 2226)
        self.assertEqual(counts["remainingUnauthoredGroups"], 4523)
        summary = json.loads(self.artifacts["validation-summary.json"].decode("utf-8"))
        copying = summary["crossSourceCopyingScreen"]
        self.assertEqual(copying["sourceRecordsScanned"], 9677)
        self.assertEqual(copying["authoredSenseRecordsScanned"], 145)
        self.assertEqual(copying["eightWordOverlaps"], [])
        self.assertTrue(summary["publicationReady"])


if __name__ == "__main__":
    unittest.main(verbosity=2)