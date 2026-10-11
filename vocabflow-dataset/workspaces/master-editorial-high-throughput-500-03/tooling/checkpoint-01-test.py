"""Read-only regression checks for Cohort 500-03 CP01."""
import copy
import hashlib
import importlib.util
import json
import unittest
from pathlib import Path

ROOT = next(p for p in Path(__file__).resolve().parents if (p / "AGENTS.md").is_file())
WS = ROOT / "vocabflow-dataset/workspaces/master-editorial-high-throughput-500-03"
CP = WS / "checkpoints/checkpoint-01"
SPEC = importlib.util.spec_from_file_location("cp01_adapter_tested", WS / "tooling/checkpoint-01.py")
M = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(M)


class Checkpoint01RegressionTests(unittest.TestCase):
    def test_frozen_selection_and_parent_are_unchanged(self):
        groups, parent, frozen = M.selection()
        self.assertEqual(frozen["fingerprint"], "ac9cedb8a0f54295eb6eee6630fe141c2477b7a25a368c3c8efbee79feca600e")
        self.assertEqual(M.PARENT_FP, "23cb5e4fc6786375cfe07581c7c91fcb097621dfe01ba3608cec6db70804e61e")
        self.assertEqual(len(groups), 100)
        self.assertEqual((len(parent["records"]), len({r["candidateGroupKey"] for r in parent["records"]})), (2871, 2020))

    def test_micro01_historical_seal_and_handoff_remain_byte_pinned(self):
        rows, _, receipt = M.micro(1)
        seal_path = CP / "micro-01-seal.json"
        self.assertEqual(seal_path.read_bytes(), M.encode(receipt))
        self.assertTrue(all("supplementalSourceEvidence" not in row for row in rows))
        self.assertIsNone(M.validate_handoff(1, rows, receipt))

    def test_manifest_pins_checkpoint_tooling_and_lf_checkout_contract(self):
        _, manifest = M.build()
        for name in ("checkpoint-01.py", "checkpoint-01-test.py", "freeze-cohort.py"):
            self.assertEqual(manifest["rawInputSha256"][f"tooling/{name}"], M.sha((WS / "tooling" / name).read_bytes()))
        self.assertEqual(manifest["rawInputSha256"]["workspace/.gitattributes"], M.sha((WS / ".gitattributes").read_bytes()))
        self.assertEqual((WS / ".gitattributes").read_text(encoding="utf-8"), "* text eol=lf\n")

    def test_external_evidence_is_allowlisted_and_hash_pinned(self):
        records = M.supplemental_evidence()
        identities = {(r["candidateGroupKey"], r["originalSenseSlug"], r["effectiveSenseSlug"], r["targetPOS"]) for r in records}
        self.assertEqual(identities, {
            ("NORMALIZED_HEADWORD:cowboy", "cowboy-source-label", "cowboy-source-label", "NOUN"),
            ("NORMALIZED_HEADWORD:beat", "strike-forcefully", "hit-repeatedly", "VERB"),
        })
        for record in records:
            payload = {k: v for k, v in record.items() if k != "evidenceArtifactHash"}
            self.assertEqual(record["evidenceArtifactHash"], hashlib.sha256(M.encode(payload)).hexdigest())
            self.assertEqual(record["rightsStatus"], "UNKNOWN_REVIEW_REQUIRED")
            self.assertTrue(record["dictionaryEntryUrl"].startswith("https://dictionary.cambridge.org/dictionary/english/"))

    def test_beat_boundary_is_forward_corrected_without_freeze_drift(self):
        correction = M.V.load(CP / "planning/forward-semantic-boundary-correction-micro-03.json")
        prior = (CP / "planning/micro-03-plan-pre-correction.json").read_bytes()
        self.assertEqual(M.sha(prior), correction["beforePlanSha256"])
        self.assertEqual(json.loads(prior.decode("utf-8"))["fingerprint"], correction["beforePlanFingerprint"])
        self.assertEqual(correction["originalSenseSlug"], "strike-forcefully")
        self.assertEqual(correction["correctedSenseSlug"], "hit-repeatedly")
        self.assertEqual(correction["beforeDecision"]["senseSlug"], "strike-forcefully")
        self.assertEqual(correction["afterDecision"]["senseSlug"], "hit-repeatedly")
        current = M.plan(3)
        beat = next(e for e in current["entries"] if e["candidateGroupKey"] == "NORMALIZED_HEADWORD:beat")
        self.assertIn("hit-repeatedly", beat["proposedSenseBoundaries"])
        self.assertNotIn("strike-forcefully", beat["proposedSenseBoundaries"])
        self.assertEqual(current["fingerprint"], correction["correctedPlanFingerprint"])
        self.assertEqual(len(beat["proposedSenseBoundaries"]), 4)

    def test_revision_aliasing_keeps_first_pass_and_recheck_hashes_distinct(self):
        raw = []
        for number in (1, 2, 3, 4, 5):
            rows, _, _ = M.micro(number)
            raw.extend(rows)
        immutable_original = copy.deepcopy(raw)
        mutable_working_copy = copy.deepcopy(raw)
        effective, changes = M.C.revisions(mutable_working_copy)
        self.assertIs(effective, mutable_working_copy)
        self.assertEqual(M.digest(raw), M.digest(immutable_original))
        self.assertNotEqual(M.digest(effective), M.digest(immutable_original))
        self.assertEqual(len(changes), 23)
        original_by_key = {r["proposalKey"]: r for r in immutable_original}
        effective_by_key = {r["proposalKey"]: r for r in effective}
        for number, expected_counts, sense_count in (
            (1, (26, 2, 2), 30),
            (2, (26, 1, 1), 28),
            (3, (35, 4, 0), 39),
            (4, (31, 3, 1), 35),
            (5, (29, 5, 0), 34),
        ):
            first = M.V.load(CP / f"independent-review/micro-{number:02d}.json")["records"]
            self.assertEqual(len(first), sense_count)
            self.assertEqual([sum(q["assessment"] == state for q in first) for state in ("PASS", "REVIEW", "FAIL")], list(expected_counts))
            self.assertTrue(all(q["effectiveContentHash"] == original_by_key[q["proposalKey"]]["effectiveContentHash"] for q in first))
        rechecks = {
            1: M.V.load(CP / "independent-review/recheck-micro-01.json")["records"],
            2: M.V.load(CP / "independent-review/recheck-micro-02.json")["records"],
            3: M.V.load(CP / "independent-review/recheck-micro-03.json")["records"],
            4: M.V.load(CP / "independent-review/recheck-micro-04.json")["records"],
            5: M.V.load(CP / "independent-review/recheck-micro-05.json")["records"],
        }
        self.assertEqual(len(rechecks[1]), 4)
        self.assertEqual(len(rechecks[2]), 1)
        self.assertEqual(len(rechecks[3]), 3)
        self.assertEqual(len(rechecks[4]), 3)
        self.assertEqual(len(rechecks[5]), 5)
        for recheck in rechecks.values():
            self.assertTrue(all(q["assessment"] == "PASS" and not q["blocksPublication"] for q in recheck))
            self.assertTrue(all(q["effectiveContentHash"] == effective_by_key[q["proposalKey"]]["effectiveContentHash"] for q in recheck))

    def test_micro02_and_micro03_manuscripts_and_author_qa(self):
        expected = {2: 28, 3: 39}
        for number, senses in expected.items():
            rows, qa, receipt = M.micro(number)
            self.assertEqual(len({r["candidateGroupKey"] for r in rows}), 20)
            self.assertEqual(len(rows), senses)
            self.assertEqual(receipt["qaCounts"], {"PASS": senses})
            self.assertTrue(all(q["assessment"] == "PASS" for q in qa))
            self.assertEqual(len({r["proposalKey"] for r in rows}), senses)
            self.assertTrue(all(r["rights"] == "UNKNOWN_REVIEW_REQUIRED" for r in rows))
            self.assertEqual(sum(bool(r["supplementalSourceEvidence"]) for r in rows), 1)


if __name__ == "__main__":
    unittest.main(verbosity=2)
