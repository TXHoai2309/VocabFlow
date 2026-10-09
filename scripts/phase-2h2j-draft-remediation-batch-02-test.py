#!/usr/bin/env python3
"""Focused integrity and regression suite for Phase 2H.2J-R2."""

import copy
import importlib.util
import json
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/phase-2h2j-draft-remediation-batch-02.py"
spec = importlib.util.spec_from_file_location("phase_2h2j_batch_02", SCRIPT)
batch = importlib.util.module_from_spec(spec)
spec.loader.exec_module(batch)


def load_json(name):
    return json.loads((batch.WS / name).read_text(encoding="utf-8"))


class Batch02IntegrityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.before = {
            path.name: batch.sha_file(path)
            for path in batch.WS.iterdir() if path.is_file()
        }
        cls.expected_outputs, cls.manifest = batch.build()
        for name, expected in cls.expected_outputs.items():
            path = batch.WS / name
            if path.is_file():
                if path.read_bytes().replace(b"\r\n", b"\n") != expected.encode("utf-8"):
                    raise AssertionError("Offline zero-write replay differs: " + name)
            else:
                raise AssertionError("Assembled Batch 02 artifact is missing: " + name)
        cls.after = {
            path.name: batch.sha_file(path)
            for path in batch.WS.iterdir() if path.is_file()
        }
        cls.replay = {
            "fingerprint": cls.manifest["fingerprint"],
            "zeroWrites": cls.before == cls.after,
        }
        cls.manifest = load_json("manifest.json")
        cls.inventory = load_json("candidate-inventory.json")
        cls.selection = load_json("batch-selection-receipt.json")
        cls.eligibility = load_json("authored/eligibility-assessments.json")
        cls.application = load_json("authored/application-decisions.json")
        cls.reviews = load_json("full-batch-re-review.json")
        cls.queue = load_json("remaining-remediation-queue.json")
        cls.projection = load_json("cumulative-remediated-effective-draft-projection.json")
        cls.mapping = load_json("cumulative-content-hash-mapping.json")

    def test_parent_replay_is_zero_write_and_fingerprinted(self):
        self.assertTrue(self.replay["zeroWrites"])
        self.assertEqual(self.replay["fingerprint"], self.manifest["fingerprint"])
        self.assertEqual(self.manifest["parentPilotFingerprint"],
                         batch.PARENT_PILOT_FINGERPRINT)
        self.assertEqual(self.manifest["parentFinalAuditFingerprint"],
                         batch.PARENT_AUDIT_FINGERPRINT)
        self.assertEqual(self.manifest["parentFinalAuditHandoffFingerprint"],
                         batch.PARENT_HANDOFF_FINGERPRINT)

    def test_complete_historical_proposal_inventory_is_unique(self):
        rows = self.inventory["records"]
        self.assertEqual(len(rows), 141)
        self.assertEqual(len({row["correctionProposalId"] for row in rows}), 141)
        self.assertTrue(all(row["sourceProposalSha256"] for row in rows))
        self.assertTrue(all(row["historicalParentContentHash"]
                            and row["currentEffectiveContentHash"] for row in rows))

    def test_pilot_applied_and_lot_deferred_states_are_excluded(self):
        indexed = {row["correctionProposalId"]: row
                   for row in self.inventory["records"]}
        for proposal_id in batch.PILOT_APPLIED:
            self.assertEqual(indexed[proposal_id]["inventoryStatus"],
                             "ALREADY_APPLIED_IN_PILOT_01")
            self.assertNotIn(proposal_id,
                             self.selection["candidateIdsInStableOrder"])
        self.assertEqual(indexed[batch.PILOT_DEFERRED]["inventoryStatus"],
                         "PREVIOUSLY_DEFERRED")
        self.assertNotIn(batch.PILOT_DEFERRED,
                         self.selection["candidateIdsInStableOrder"])

    def test_exact_bounded_selection_respects_candidate_and_batch_caps(self):
        self.assertEqual(self.selection["candidateIdsInStableOrder"],
                         batch.SELECTED_IDS)
        self.assertEqual(self.selection["selectedCandidateCount"], 5)
        self.assertEqual(self.selection["selectedBatchCount"], 4)
        self.assertLessEqual(self.selection["selectedCandidateCount"],
                             batch.MAX_CANDIDATES)
        self.assertLessEqual(self.selection["selectedBatchCount"], batch.MAX_BATCHES)
        self.assertEqual(len({(c["proposalKey"], c["field"])
                              for c in self.selection["candidates"]}), 5)

    def test_no_candidate_is_applied_without_independent_eligibility(self):
        records = {row["correctionProposalId"]: row
                   for row in self.eligibility["records"]}
        decisions = {row["correctionProposalId"]: row
                     for row in self.application["records"]}
        self.assertEqual(len(records), 5)
        for proposal_id in batch.SELECTED_IDS:
            status = records[proposal_id]["eligibilityStatus"]
            if status == "APPLY_ELIGIBLE":
                self.assertEqual(decisions[proposal_id]["decision"],
                                 "APPLY_TO_CUMULATIVE_DRAFT_LAYER")
            else:
                self.assertEqual(decisions[proposal_id]["decision"],
                                 "DEFER_NO_REVISION")
        self.assertEqual(records["2H2I-R3-P001"]["eligibilityStatus"],
                         "DEFER_INSUFFICIENT_EVIDENCE")
        self.assertEqual(records["2H2I-P003"]["eligibilityStatus"],
                         "DEFER_INSUFFICIENT_EVIDENCE")

    def test_pilot_01_revision_hashes_are_retained(self):
        pilot = load_json("accepted-parent-pins.json")
        self.assertEqual(pilot["parentPilotFingerprint"],
                         batch.PARENT_PILOT_FINGERPRINT)
        parent_projection = load_json(
            "../pilot-01/remediated-effective-draft-projection.json"
        )["records"]
        parent = {row["proposalKey"]: row for row in parent_projection}
        rows = {row["proposalKey"]: row for row in self.projection["records"]}
        parent_changed = {
            key for key in parent
            if parent[key]["effectiveContentHash"]
            != rows[key]["effectiveContentHash"]
            and rows[key]["effectiveContentHash"]
            == parent[key]["effectiveContentHash"]
        }
        self.assertEqual(len(parent), 1563)
        self.assertEqual(rows.keys(), parent.keys())
        # The exact three parent records are checked from their accepted R1 revisions.
        revision_ids = {
            row["correctionProposalId"]
            for row in load_json("../pilot-01/applied-draft-corrections.json")["corrections"]
        }
        self.assertEqual(revision_ids, batch.PILOT_APPLIED)
        self.assertEqual(len(self.manifest["artifactHashes"]), 16)

    def test_effective_projection_and_cumulative_correction_counts(self):
        self.assertEqual(self.projection["count"], 1563)
        self.assertEqual(self.projection["authoredGroupCount"], 1020)
        self.assertEqual(len(self.projection["records"]), 1563)
        self.assertEqual(self.mapping["count"], 1563)
        self.assertEqual(self.mapping["changedInBatch02SenseCount"], 3)
        self.assertEqual(self.mapping["retainedPilot01RevisionCount"], 3)
        self.assertEqual(self.mapping["unchangedFromPilot01SenseCount"], 1560)
        self.assertEqual(self.manifest["appliedCorrectionCount"], 3)
        self.assertEqual(self.manifest["cumulativeAppliedCorrectionCount"], 6)
        self.assertEqual(self.manifest["distinctNewlyRevisedSenseCount"], 3)

    def test_all_applied_fields_are_current_hash_bound(self):
        parent = {
            row["proposalKey"]: row
            for row in load_json("../pilot-01/remediated-effective-draft-projection.json")["records"]
        }
        current = {row["proposalKey"]: row for row in self.projection["records"]}
        revisions = load_json("draft-revisions.json")["records"]
        self.assertEqual(len(revisions), 3)
        for revision in revisions:
            before = parent[revision["proposalKey"]]
            after = current[revision["proposalKey"]]
            self.assertEqual(revision["previousEffectiveContentHash"],
                             before["effectiveContentHash"])
            self.assertEqual(revision["revisedContentHash"],
                             after["effectiveContentHash"])
            for field in revision["fieldRevisions"]:
                self.assertEqual(field["previousEffectiveContentHash"],
                                 before["effectiveContentHash"])
                self.assertEqual(batch.pointer_get(after, field["fieldPointer"]),
                                 field["after"])
                self.assertEqual(field["beforeFieldSha256"],
                                 batch.text_sha(field["before"]))
                self.assertEqual(field["afterFieldSha256"],
                                 batch.text_sha(field["after"]))
        self.assertEqual({
            row["correctionProposalId"]
            for revision in revisions for row in revision["fieldRevisions"]
        }, {"2H2I-R1-P005", "2H2I-R1-P006", "2H2I-R1-P007"})

    def test_complete_affected_batches_are_re_reviewed(self):
        self.assertEqual(len(self.reviews["batches"]), 4)
        self.assertEqual(self.reviews["reviewedSenseCount"], 29)
        self.assertEqual(self.reviews["pass"], 25)
        self.assertEqual(self.reviews["review"], 4)
        self.assertEqual(self.reviews["fail"], 0)
        self.assertEqual(len(self.reviews["reviews"]), 29)
        self.assertEqual(len({row["proposalKey"]
                              for row in self.reviews["reviews"]}), 29)

    def test_each_newly_revised_sense_passes_post_application_review(self):
        review_by_key = {
            row["proposalKey"]: row for row in self.reviews["reviews"]
        }
        for revision in load_json("draft-revisions.json")["records"]:
            review = review_by_key[revision["proposalKey"]]
            self.assertEqual(review["reviewStatus"], "PASS")
            self.assertTrue(all(review["reviewDimensions"][name] for name in [
                "grammar", "meaningPreservation", "englishNaturalness",
                "vietnameseFaithfulness", "posAndConstruction",
            ]))

    def test_all_eight_boundary_proposals_and_141_field_proposals_remain(self):
        self.assertEqual(self.queue["fieldProposalCount"], 141)
        self.assertEqual(self.queue["boundaryProposalCount"], 8)
        self.assertEqual(len(self.queue["fieldProposals"]), 141)
        self.assertEqual(len(self.queue["boundaryProposals"]), 8)
        self.assertTrue(all(row["batch02Disposition"]
                            == "PRESERVED_OUT_OF_SCOPE_NO_NEW_SENSE_BOUNDARY"
                            for row in self.queue["boundaryProposals"]))

    def test_no_owner_approval_canonical_id_rights_or_database_claims(self):
        self.assertEqual(self.manifest["ownerApprovalsAdded"], 0)
        self.assertEqual(self.manifest["canonicalIdsAllocated"], 0)
        self.assertEqual(self.manifest["rights"], "UNKNOWN_REVIEW_REQUIRED")
        validation = load_json("validation-summary.json")
        self.assertEqual(validation["contentApprovalStatus"], "PENDING")
        self.assertEqual(validation["databaseAccess"], "NONE")
        self.assertEqual(validation["databaseWrites"], "NONE")
        self.assertEqual(validation["production"], "UNTOUCHED")
        self.assertFalse(validation["releaseEligible"])

    def test_duplicate_target_fails_closed(self):
        context, test_input = self._minimal_application_context()
        proposal_key = test_input["proposalsById"]["2H2I-R1-P006"]["proposalKey"]
        test_input["proposalsById"]["2H2I-R1-P007"]["proposalKey"] = proposal_key
        test_input["selection"]["candidates"][3]["parentEffectiveContentHash"] = (
            context["parentRows"][proposal_key]["effectiveContentHash"]
        )
        with self.assertRaisesRegex(ValueError, "Duplicate field application"):
            batch.apply_eligible(context, test_input)

    def test_stale_parent_hash_fails_closed(self):
        context, test_input = self._minimal_application_context()
        test_input["selection"]["candidates"][2]["parentEffectiveContentHash"] = "0" * 64
        with self.assertRaisesRegex(ValueError, "Stale cumulative parent hash"):
            batch.apply_eligible(context, test_input)

    @staticmethod
    def _minimal_application_context():
        parent = load_json("../pilot-01/remediated-effective-draft-projection.json")["records"]
        inventory = {
            row["correctionProposalId"]: row
            for row in load_json("candidate-inventory.json")["records"]
        }
        proposals = {}
        for proposal_id in batch.SELECTED_IDS:
            row = inventory[proposal_id]
            proposals[proposal_id] = {
                "correctionProposalId": proposal_id,
                "proposalKey": row["proposalKey"],
                "field": row["field"],
                "before": row["before"],
                "after": row["after"],
            }
        context = {
            "parentRows": {row["proposalKey"]: row for row in parent},
            "pilot": batch.pilot_module(),
            "pilotRevisions": load_json("../pilot-01/draft-revisions.json")["records"],
            "proposals": list(proposals.values()),
            "inventory": load_json("candidate-inventory.json"),
        }
        authored = {
            "selection": load_json("batch-selection-receipt.json"),
            "eligibility": load_json("authored/eligibility-assessments.json"),
            "application": load_json("authored/application-decisions.json"),
            "proposalsById": proposals,
        }
        return context, copy.deepcopy(authored)

    def test_mutation_cli_flags_are_rejected(self):
        result = subprocess.run(
            [sys.executable, "-B", str(SCRIPT), "--production"],
            cwd=ROOT, capture_output=True, text=True, check=False,
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("error:", result.stderr)
        self.assertEqual(result.stdout, "")

    def test_zero_write_replay_does_not_modify_protected_parent(self):
        before = {
            name: batch.sha_file(batch.ROOT / name)
            for name in [
                "vocabflow-dataset/workspaces/master-editorial-aggregate-qa/effective-sense-index.json",
                "vocabflow-dataset/workspaces/master-editorial-draft-remediation/checkpoints/pilot-01/manifest.json",
                "vocabflow-dataset/workspaces/master-editorial-draft-remediation/checkpoints/pilot-01/remediated-effective-draft-projection.json",
            ]
        }
        replay_outputs, replay_manifest = batch.build()
        after = {name: batch.sha_file(batch.ROOT / name) for name in before}
        self.assertEqual(replay_manifest["fingerprint"], self.manifest["fingerprint"])
        self.assertTrue(self.replay["zeroWrites"])
        self.assertEqual(set(replay_outputs), set(self.expected_outputs))
        self.assertEqual(before, after)


if __name__ == "__main__":
    unittest.main(verbosity=2)
