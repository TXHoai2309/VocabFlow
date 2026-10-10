#!/usr/bin/env python3
"""Focused integrity checks for the offline Phase 2H.2J-R4 overlay."""

import importlib.util
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/phase-2h2j-draft-remediation-batch-04.py"
SPEC = importlib.util.spec_from_file_location("batch04", SCRIPT)
R4 = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(R4)


def parent_projection():
    return R4.read(R4.PROJECTION_PATH)


def outputs():
    return R4.build()[0]


def artifact(name):
    return json.loads(outputs()[name])


def content_hash(row):
    return R4.digest({
        "proposalKey": row["proposalKey"],
        "candidateGroupKey": row["candidateGroupKey"],
        "headword": row["headword"],
        "partOfSpeechProposal": row["partOfSpeech"],
        "content": row["content"],
    })


class Batch04IntegrityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.built, cls.manifest = R4.build()
        cls.selection = json.loads(cls.built["batch-selection-receipt.json"])
        cls.inventory = json.loads(cls.built["candidate-inventory.json"])
        cls.eligibility = json.loads(cls.built["authored/eligibility-assessments.json"])
        cls.application = json.loads(cls.built["authored/application-decisions.json"])
        cls.revisions = json.loads(cls.built["draft-revisions.json"])
        cls.projection = json.loads(cls.built["cumulative-remediated-effective-draft-projection.json"])
        cls.mapping = json.loads(cls.built["cumulative-content-hash-mapping.json"])
        cls.review = json.loads(cls.built["full-batch-re-review.json"])
        cls.deferred = json.loads(cls.built["deferred-and-rejected-proposals.json"])
        cls.summary = json.loads(cls.built["validation-summary.json"])

    def test_selection_uses_actual_parent_density_and_practical_complete_batch_scope(self):
        self.assertEqual(self.selection["parentBatch03Fingerprint"], R4.PARENT_FINGERPRINT)
        self.assertEqual(self.selection["candidateCountsByOriginalBatch"]["master-editorial-draft-pilot:4"], 17)
        self.assertEqual(self.selection["candidateCountsByOriginalBatch"]["master-editorial-draft-pilot:1"], 12)
        self.assertEqual(self.selection["selectedCandidateCount"], 29)
        self.assertEqual(self.selection["selectedBatchCount"], 2)
        self.assertEqual(self.selection["fullBatchSenseInspectionEstimate"], 55)
        self.assertLessEqual(self.selection["selectedCandidateCount"], R4.MAX_CANDIDATES)
        self.assertLessEqual(self.selection["selectedBatchCount"], R4.MAX_BATCHES)
        self.assertLessEqual(self.selection["fullBatchSenseInspectionEstimate"], 100)
        self.assertEqual(
            self.selection["startingStateCounts"],
            {"ALREADY_APPLIED": 18, "PREVIOUSLY_DEFERRED": 12,
             "PREVIOUSLY_REJECTED": 1, "REQUIRES_IDENTITY_OR_BOUNDARY": 4,
             "UNREVIEWED_CANDIDATE": 106},
        )

    def test_all_141_proposals_are_reconciled_without_duplicate_ids(self):
        records = self.inventory["records"]
        self.assertEqual(len(records), 141)
        self.assertEqual(len({row["correctionProposalId"] for row in records}), 141)
        self.assertEqual(
            self.inventory["postBatch04StateCounts"],
            {"ALREADY_APPLIED": 40, "PREVIOUSLY_DEFERRED": 19,
             "PREVIOUSLY_REJECTED": 1, "REQUIRES_IDENTITY_OR_BOUNDARY": 4,
             "UNREVIEWED_CANDIDATE": 77},
        )
        self.assertTrue(all(row["historicalProposalAppliedFlagRemainsFalse"] for row in records))

    def test_all_selected_candidates_have_one_independent_decision_and_exact_parent(self):
        selected = {row["correctionProposalId"]: row for row in self.selection["candidates"]}
        assessed = {row["correctionProposalId"]: row for row in self.eligibility["records"]}
        self.assertEqual(set(selected), set(assessed))
        self.assertEqual(len(assessed), 29)
        for proposal_id, row in assessed.items():
            parent = next(item for item in parent_projection()["records"]
                          if item["proposalKey"] == row["proposalKey"])
            self.assertEqual(row["currentParentEffectiveContentHash"], parent["effectiveContentHash"])
            self.assertEqual(row["before"], parent["content"]["grammarNotesEn"])
            self.assertEqual(row["fieldPointer"], "/content/grammarNotesEn")
            self.assertTrue(row["reviewExplanationVi"].strip())
            self.assertEqual(row["reviewedSenseContext"]["effectiveContentHash"],
                             row["currentParentEffectiveContentHash"])
        self.assertEqual(
            self.eligibility["decisionCounts"],
            {"APPLY_ELIGIBLE": 22, "DEFER_POS_OR_IDENTITY": 6, "DEFER_SEMANTIC_RISK": 1},
        )

    def test_exactly_22_safe_fields_are_applied_and_seven_risky_items_stay_deferred(self):
        decisions = {row["correctionProposalId"]: row for row in self.application["records"]}
        self.assertEqual(len(decisions), 29)
        self.assertEqual(sum(row["decision"] == "APPLY_TO_CUMULATIVE_DRAFT_LAYER"
                             for row in decisions.values()), 22)
        self.assertEqual(sum(row["decision"] == "DEFER_NO_REVISION"
                             for row in decisions.values()), 7)
        self.assertTrue(all(row["ownerApproval"] is False
                            and row["canonicalIdAllocated"] is False
                            and row["rightsClearanceAdded"] is False
                            for row in decisions.values()))
        self.assertIn("2H2I-R2-P023", decisions)
        self.assertEqual(decisions["2H2I-R2-P023"]["decision"], "DEFER_NO_REVISION")
        self.assertEqual(decisions["2H2I-R2-P046"]["decision"], "DEFER_NO_REVISION")
        self.assertTrue(all(row["eligibilityStatus"] == "APPLY_ELIGIBLE"
                            for row in self.eligibility["records"]
                            if decisions[row["correctionProposalId"]]["decision"]
                            == "APPLY_TO_CUMULATIVE_DRAFT_LAYER"))

    def test_revisions_bind_before_after_parent_and_exact_content_hashes(self):
        parent = {row["proposalKey"]: row for row in parent_projection()["records"]}
        revised = {row["proposalKey"]: row for row in self.projection["records"]}
        self.assertEqual(len(self.revisions["records"]), 22)
        self.assertEqual(len({row["proposalKey"] for row in self.revisions["records"]}), 22)
        self.assertEqual(len(self.revisions["records"]), len({
            row["correctionProposalId"] for revision in self.revisions["records"]
            for row in revision["fieldRevisions"]}))
        for revision in self.revisions["records"]:
            old = parent[revision["proposalKey"]]
            new = revised[revision["proposalKey"]]
            self.assertEqual(revision["previousEffectiveContentHash"], old["effectiveContentHash"])
            self.assertEqual(revision["revisedContentHash"], content_hash(new))
            self.assertEqual(new["effectiveContentHash"], revision["revisedContentHash"])
            self.assertEqual(len(revision["fieldRevisions"]), 1)
            change = revision["fieldRevisions"][0]
            self.assertEqual(change["before"], old["content"]["grammarNotesEn"])
            self.assertEqual(change["after"], new["content"]["grammarNotesEn"])
            self.assertEqual(change["parentEffectiveContentHash"], old["effectiveContentHash"])
            self.assertEqual(change["currentParentRevision"],
                             "DRAFT_REMEDIATION_BATCH_03_EFFECTIVE_PROJECTION")
            for key, value in old.items():
                if key not in {"content", "effectiveContentHash"}:
                    self.assertEqual(new[key], value)

    def test_cumulative_projection_preserves_prior_18_and_changes_only_22_new_senses(self):
        parent = {row["proposalKey"]: row for row in parent_projection()["records"]}
        current = {row["proposalKey"]: row for row in self.projection["records"]}
        changed = {key for key in parent if parent[key] != current[key]}
        applied = {row["proposalKey"] for row in self.revisions["records"]}
        self.assertEqual(changed, applied)
        self.assertEqual(len(changed), 22)
        self.assertEqual(self.projection["count"], 1563)
        self.assertEqual(self.projection["authoredGroupCount"], 1020)
        self.assertEqual(self.mapping["cumulativeChangedSenseCount"], 40)
        self.assertEqual(self.mapping["changedInBatch04SenseCount"], 22)
        self.assertEqual(self.mapping["unchangedFromBatch03SenseCount"], 1541)
        prior = R4.read(R4.MAPPING_PATH)
        prior_changed = {row["proposalKey"] for row in prior["records"]
                         if row["originalEffectiveContentHash"] != row["cumulativeEffectiveContentHash"]}
        self.assertEqual(len(prior_changed), 18)
        self.assertTrue(prior_changed.isdisjoint(changed))
        for key in prior_changed:
            self.assertEqual(current[key]["effectiveContentHash"],
                             {row["proposalKey"]: row for row in self.mapping["records"]}[key]
                             ["cumulativeEffectiveContentHash"])

    def test_full_batch_re_review_covers_all_55_senses_and_keeps_history_review(self):
        reviews = self.review["reviews"]
        self.assertEqual(self.review["reviewedSenseCount"], 55)
        self.assertEqual(len(reviews), 55)
        self.assertEqual(len({row["proposalKey"] for row in reviews}), 55)
        self.assertEqual((self.review["pass"], self.review["review"], self.review["fail"]),
                         (39, 16, 0))
        current = {row["proposalKey"]: row for row in self.projection["records"]}
        for row in reviews:
            self.assertEqual(row["historicalAuditStatus"], "REVIEW")
            self.assertTrue(row["historicalReviewRetained"])
            self.assertEqual(row["reviewedContentHash"], current[row["proposalKey"]]["effectiveContentHash"])
            self.assertEqual(row["reviewedContentSnapshot"], current[row["proposalKey"]]["content"])
            self.assertTrue(row["reviewExplanationVi"].strip())
            self.assertTrue(row["historicalQaReferences"])
        self.assertFalse(self.review["historicalReviewConvertedToPass"])

    def test_boundary_and_deferred_or_rejected_decisions_are_preserved(self):
        prior_queue = R4.read(R4.PARENT_WS / "remaining-remediation-queue.json")
        prior_deferred = R4.read(R4.PARENT_WS / "deferred-and-rejected-proposals.json")
        self.assertEqual(self.inventory["boundaryProposals"], prior_queue["boundaryProposals"])
        self.assertEqual(self.deferred["boundaryProposalsPreserved"], prior_queue["boundaryProposals"])
        self.assertEqual(len(self.deferred["batch03DeferredPreserved"]), 9)
        self.assertEqual(len(self.deferred["batch04Deferred"]), 7)
        self.assertEqual(len(self.deferred["previouslyRejectedPreserved"]), 1)
        self.assertEqual(self.deferred["batch04Rejected"], [])
        self.assertEqual(self.deferred["protectedDeferredGroups"], ["lot", "waste", "aggregate"])
        self.assertEqual(self.deferred["previouslyRejectedPreserved"][0]["proposalKey"],
                         "EDITORIAL_2H2B:greenhouse gas:heat-trapping-gas")
        self.assertEqual(len(prior_deferred["previouslyDeferredPreserved"]), 3)

    def test_original_projection_historical_sources_and_parent_checkpoints_are_unchanged(self):
        self.assertTrue(self.summary["originalProjectionUnchanged"])
        pin = R4.read(R4.PARENT_WS / "accepted-parent-pins.json")["frozenOriginalProjection"]
        self.assertEqual(R4.sha_file(R4.ORIGINAL_PROJECTION), pin["sha256"])
        source_inventory = R4.read(R4.INVENTORY_PATH)
        self.assertEqual(len(source_inventory["records"]), 141)
        for source in source_inventory["originalSourceProposalFiles"]:
            self.assertEqual(R4.sha_file(R4.ROOT / source["path"]), source["sha256"])
        self.assertEqual(self.manifest["parentBatch03Fingerprint"], R4.PARENT_FINGERPRINT)
        self.assertEqual(self.manifest["production"], "UNTOUCHED")
        self.assertEqual(self.manifest["databaseAccess"], "NONE")
        self.assertEqual(self.manifest["databaseWrites"], "NONE")
        self.assertEqual(self.manifest["rights"], "UNKNOWN_REVIEW_REQUIRED")

    def test_zero_write_build_is_deterministic_and_cache_baseline_is_preserved(self):
        cache_paths = [
            R4.ROOT / "scripts/__pycache__/phase-2h2j-draft-remediation-batch-03.cpython-313.pyc",
            R4.ROOT / "scripts/__pycache__/phase-2h2j-draft-remediation-batch-03-test.cpython-313.pyc",
        ]
        before = [R4.sha_file(path) for path in cache_paths]
        first, first_manifest = R4.build()
        second, second_manifest = R4.build()
        self.assertEqual(first_manifest["fingerprint"], second_manifest["fingerprint"])
        self.assertEqual(first, second)
        self.assertEqual(before, [R4.sha_file(path) for path in cache_paths])

    def test_all_outputs_and_manifest_artifact_hashes_are_self_consistent(self):
        self.assertEqual(self.manifest["fingerprint"],
                         R4.digest({key: value for key, value in self.manifest.items()
                                    if key != "fingerprint"}))
        for name, expected_hash in self.manifest["artifactHashes"].items():
            self.assertEqual(R4.sha_bytes(self.built[name].encode("utf-8")), expected_hash)
        self.assertEqual(self.manifest["selectedCandidateCount"], 29)
        self.assertEqual(self.manifest["appliedCorrectionCount"], 22)
        self.assertEqual(self.manifest["cumulativeAppliedCorrectionCount"], 40)
        self.assertEqual(self.manifest["fullBatchSenseCount"], 55)


if __name__ == "__main__":
    unittest.main(verbosity=2)
