#!/usr/bin/env python3
"""Focused integrity tests for the Phase 2H.2J-R3 DRAFT overlay."""

import importlib.util
import json
import subprocess
import sys
import unittest
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/phase-2h2j-draft-remediation-batch-03.py"
SPEC = importlib.util.spec_from_file_location("phase_2h2j_batch_03", SCRIPT)
r3 = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(r3)


def load_json(name):
    return json.loads((r3.WS / name).read_text(encoding="utf-8"))


class Batch03IntegrityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.before = {str(path.relative_to(r3.WS)): r3.sha_file(path)
                      for path in r3.WS.rglob("*") if path.is_file()}
        cls.outputs, cls.manifest = r3.build()
        for name, expected in cls.outputs.items():
            path = r3.WS / name
            if not path.is_file():
                raise AssertionError("Prepared Batch 03 artifact is missing: " + name)
            if path.read_bytes().replace(b"\r\n", b"\n") != expected.encode("utf-8"):
                raise AssertionError("Offline deterministic replay differs: " + name)
        cls.after = {str(path.relative_to(r3.WS)): r3.sha_file(path)
                     for path in r3.WS.rglob("*") if path.is_file()}
        cls.inventory = load_json("candidate-inventory.json")
        cls.selection = load_json("batch-selection-receipt.json")
        cls.eligibility = load_json("authored/eligibility-assessments.json")
        cls.decisions = load_json("authored/application-decisions.json")
        cls.projection = load_json("cumulative-remediated-effective-draft-projection.json")
        cls.mapping = load_json("cumulative-content-hash-mapping.json")
        cls.revisions = load_json("draft-revisions.json")["records"]
        cls.applied = load_json("applied-draft-corrections.json")["corrections"]
        cls.batch_review = load_json("full-batch-re-review.json")
        cls.queue = load_json("remaining-remediation-queue.json")
        cls.decode = load_json("regression-decode-diagnostic.json")
        cls.parent = load_json("../batch-02/cumulative-remediated-effective-draft-projection.json")

    def test_build_is_zero_write_and_parent_fingerprints_are_pinned(self):
        self.assertEqual(self.before, self.after)
        self.assertEqual(self.manifest["fingerprint"], load_json("manifest.json")["fingerprint"])
        self.assertEqual(self.manifest["parentBatch02Fingerprint"], r3.PARENT_B2_FINGERPRINT)
        self.assertEqual(self.manifest["parentPilot01Fingerprint"], r3.PARENT_PILOT_FINGERPRINT)
        self.assertEqual(self.manifest["parentAggregateAuditFingerprint"], r3.PARENT_AUDIT_FINGERPRINT)
        self.assertEqual(self.manifest["parentFinalHandoffFingerprint"], r3.PARENT_HANDOFF_FINGERPRINT)

    def test_historical_proposal_inventory_is_exhaustive_and_unique(self):
        rows = self.inventory["records"]
        self.assertEqual(len(rows), 141)
        self.assertEqual(len({row["correctionProposalId"] for row in rows}), 141)
        self.assertTrue(all(row["sourceProposalSha256"] and row["originalAuthoredBatch"] for row in rows))
        self.assertTrue(all(row["historicalProposalStillUnappliedInSource"] for row in rows))

    def test_reconciliation_categories_cover_all_required_states(self):
        self.assertEqual(self.inventory["categoryCounts"], {
            "ALREADY_APPLIED": 6,
            "CONFLICTING_FIELD_PROPOSALS": 0,
            "PREVIOUSLY_DEFERRED": 3,
            "POTENTIALLY_SAFE_FOR_DRAFT": 12,
            "REQUIRES_IDENTITY_OR_BOUNDARY": 12,
            "STALE_PARENT_REVISION": 0,
            "UNREVIEWED_CANDIDATE": 106,
            "UNSUPPORTED_AFTER_TEXT": 2,
        })
        self.assertEqual(sum(self.inventory["categoryCounts"].values()), 141)

    def test_selection_uses_highest_density_original_batch_and_cap(self):
        self.assertEqual(self.selection["candidateIdsInStableOrder"], r3.SELECTED_IDS)
        self.assertEqual(self.selection["selectedCandidateCount"], 22)
        self.assertEqual(self.selection["selectedBatchCount"], 1)
        self.assertEqual(self.selection["fullBatchSenseInspectionEstimate"], 37)
        self.assertLessEqual(self.selection["selectedCandidateCount"], r3.MAX_CANDIDATES)
        self.assertLessEqual(self.selection["selectedBatchCount"], r3.MAX_BATCHES)
        self.assertEqual(self.selection["candidateCountsByOriginalBatch"]["master-editorial-draft-pilot:5"], 22)
        self.assertFalse(self.selection["selectionAlgorithmUnderutilization"])

    def test_six_applied_and_three_deferred_candidates_are_not_selected(self):
        selected = set(self.selection["candidateIdsInStableOrder"])
        self.assertTrue(r3.APPLIED_BEFORE.isdisjoint(selected))
        self.assertTrue(r3.PREVIOUSLY_DEFERRED.isdisjoint(selected))
        index = {row["correctionProposalId"]: row for row in self.inventory["records"]}
        for proposal_id in r3.APPLIED_BEFORE:
            self.assertEqual(index[proposal_id]["inventoryCategory"], "ALREADY_APPLIED")
        for proposal_id in r3.PREVIOUSLY_DEFERRED:
            self.assertEqual(index[proposal_id]["inventoryCategory"], "PREVIOUSLY_DEFERRED")
            self.assertEqual(index[proposal_id]["batch03Disposition"], "PREVIOUSLY_DEFERRED_PRESERVED")

    def test_boundary_proposals_are_preserved_and_unselected(self):
        self.assertEqual(self.inventory["boundaryProposalCount"], 8)
        self.assertEqual(self.queue["boundaryProposalCount"], 8)
        self.assertEqual(self.selection["boundaryProposalCountExcluded"], 8)
        parent_boundaries = load_json("../batch-02/remaining-remediation-queue.json")["boundaryProposals"]
        self.assertEqual(self.inventory["boundaryProposals"], parent_boundaries)

    def test_selection_parent_hash_and_before_are_exact(self):
        rows = {row["proposalKey"]: row for row in self.parent["records"]}
        for candidate in self.selection["candidates"]:
            current = rows[candidate["proposalKey"]]
            self.assertEqual(candidate["parentEffectiveContentHash"], current["effectiveContentHash"])
            self.assertEqual(r3.proposal_pointer_get(current, candidate["field"]), candidate["before"])
            self.assertEqual(candidate["beforeFieldSha256"], r3.text_sha(candidate["before"]))
            self.assertEqual(candidate["afterFieldSha256"], r3.text_sha(candidate["after"]))

    def test_independent_assessments_cover_all_selected_with_context(self):
        records = self.eligibility["records"]
        self.assertEqual(len(records), 22)
        self.assertEqual({row["correctionProposalId"] for row in records}, set(r3.SELECTED_IDS))
        for row in records:
            self.assertGreater(len(row["reviewExplanationVi"]), 80)
            self.assertEqual(set(row["reviewedSenseContext"]["content"]),
                             {"definitionEn", "meaningVi", "examples", "grammarNotesEn", "senseLabelEn"})
            self.assertTrue(row["reviewedSenseContext"]["sourceEvidence"])
            self.assertEqual(row["currentParentEffectiveContentHash"],
                             next(x["parentEffectiveContentHash"] for x in self.selection["candidates"]
                                  if x["correctionProposalId"] == row["correctionProposalId"]))
            self.assertTrue(row["historicalProposalStillUnapplied"])

    def test_decisions_are_exhaustive_and_only_12_are_apply_eligible(self):
        records = {row["correctionProposalId"]: row for row in self.eligibility["records"]}
        counts = Counter(row["eligibilityStatus"] for row in records.values())
        self.assertEqual(counts, Counter({
            "APPLY_ELIGIBLE": 12, "DEFER_SEMANTIC_RISK": 3,
            "DEFER_POS_OR_IDENTITY": 5, "DEFER_INSUFFICIENT_EVIDENCE": 1,
            "REJECT_INCORRECT_AFTER": 1,
        }))
        decision_by_id = {row["correctionProposalId"]: row for row in self.decisions["records"]}
        self.assertEqual(set(decision_by_id), set(records))
        self.assertEqual({i for i, row in records.items() if row["eligibilityStatus"] == "APPLY_ELIGIBLE"},
                         r3.APPLY_IDS)
        for proposal_id, row in records.items():
            self.assertEqual(decision_by_id[proposal_id]["decision"],
                             "APPLY_TO_CUMULATIVE_DRAFT_LAYER" if row["eligibilityStatus"] == "APPLY_ELIGIBLE"
                             else "REJECT_NO_REVISION" if row["eligibilityStatus"] == "REJECT_INCORRECT_AFTER"
                             else "DEFER_NO_REVISION")

    def test_greenhouse_after_is_rejected_for_actual_grammar_error(self):
        item = next(row for row in self.eligibility["records"]
                    if row["correctionProposalId"] == "2H2I-R2-P011")
        self.assertEqual(item["eligibilityStatus"], "REJECT_INCORRECT_AFTER")
        self.assertIn("sai hòa hợp chủ-vị", item["reviewExplanationVi"])
        self.assertNotIn(item["correctionProposalId"],
                         {row["correctionProposalId"] for row in self.applied})

    def test_identity_boundary_and_evidence_risks_remain_deferred(self):
        records = {x["correctionProposalId"]: x for x in self.eligibility["records"]}
        for proposal_id in r3.DEFER_IDENTITY:
            self.assertEqual(records[proposal_id]["eligibilityStatus"], "DEFER_POS_OR_IDENTITY")
        for proposal_id in r3.DEFER_SEMANTIC:
            self.assertEqual(records[proposal_id]["eligibilityStatus"], "DEFER_SEMANTIC_RISK")
        for proposal_id in r3.DEFER_EVIDENCE:
            self.assertEqual(records[proposal_id]["eligibilityStatus"], "DEFER_INSUFFICIENT_EVIDENCE")

    def test_only_exact_authorized_grammar_fields_are_revised(self):
        self.assertEqual(len(self.revisions), 12)
        self.assertEqual({row["correctionProposalId"] for row in self.applied}, r3.APPLY_IDS)
        for revision in self.revisions:
            self.assertEqual(revision["revisionLayer"], "DRAFT_REMEDIATION_BATCH_03")
            self.assertEqual(revision["contentStatus"], "DRAFT")
            self.assertFalse(revision["publicationEligible"])
            self.assertEqual(len(revision["fieldRevisions"]), 1)
            self.assertEqual(revision["fieldRevisions"][0]["fieldPointer"], "/content/grammarNotesEn")

    def test_all_applied_values_and_hashes_bind_to_batch02_parent(self):
        parent_rows = {row["proposalKey"]: row for row in self.parent["records"]}
        revised_rows = {row["proposalKey"]: row for row in self.projection["records"]}
        for revision in self.revisions:
            parent = parent_rows[revision["proposalKey"]]
            revised = revised_rows[revision["proposalKey"]]
            self.assertEqual(revision["previousEffectiveContentHash"], parent["effectiveContentHash"])
            self.assertEqual(revision["revisedContentHash"], revised["effectiveContentHash"])
            for field in revision["fieldRevisions"]:
                self.assertEqual(r3.proposal_pointer_get(parent, field["fieldPointer"]), field["before"])
                self.assertEqual(r3.proposal_pointer_get(revised, field["fieldPointer"]), field["after"])
                self.assertEqual(field["beforeFieldSha256"], r3.text_sha(field["before"]))
                self.assertEqual(field["afterFieldSha256"], r3.text_sha(field["after"]))

    def test_projection_preserves_all_identities_and_sense_counts(self):
        rows = self.projection["records"]
        self.assertEqual(self.projection["count"], 1563)
        self.assertEqual(self.projection["authoredGroupCount"], 1020)
        self.assertEqual(len(rows), 1563)
        self.assertEqual(len({row["proposalKey"] for row in rows}), 1563)
        self.assertEqual(len({row["candidateGroupKey"] for row in rows}), 1020)
        self.assertEqual({row["proposalKey"] for row in rows}, {row["proposalKey"] for row in self.parent["records"]})

    def test_exactly_12_new_hashes_and_1551_parent_rows_unchanged(self):
        self.assertEqual(self.mapping["count"], 1563)
        self.assertEqual(self.mapping["changedInBatch03SenseCount"], 12)
        self.assertEqual(self.mapping["unchangedFromBatch02SenseCount"], 1551)
        self.assertEqual(self.mapping["cumulativeChangedSenseCount"], 18)
        self.assertEqual(sum(row["batch02EffectiveContentHash"] != row["cumulativeEffectiveContentHash"]
                             for row in self.mapping["records"]), 12)

    def test_revision_does_not_change_noncontent_provenance_or_identity(self):
        parent_rows = {row["proposalKey"]: row for row in self.parent["records"]}
        current = {row["proposalKey"]: row for row in self.projection["records"]}
        for revision in self.revisions:
            before, after = parent_rows[revision["proposalKey"]], current[revision["proposalKey"]]
            self.assertEqual({k: v for k, v in before.items() if k not in {"content", "effectiveContentHash"}},
                             {k: v for k, v in after.items() if k not in {"content", "effectiveContentHash"}})
            self.assertEqual(before["sourceEvidence"], after["sourceEvidence"])
            self.assertEqual(before["legacyIdentityDependencies"], after["legacyIdentityDependencies"])
            self.assertEqual(before["rawEffectiveQaFindings"], after["rawEffectiveQaFindings"])

    def test_original_authored_batch_is_fully_re_reviewed(self):
        self.assertEqual(self.batch_review["reviewedSenseCount"], 37)
        self.assertEqual(len(self.batch_review["batches"]), 1)
        self.assertEqual(len(self.batch_review["reviews"]), 37)
        self.assertEqual(len({row["proposalKey"] for row in self.batch_review["reviews"]}), 37)
        self.assertEqual(self.batch_review["fail"], 0)
        self.assertEqual(self.batch_review["pass"] + self.batch_review["review"], 37)
        for review in self.batch_review["reviews"]:
            self.assertGreater(len(review["reviewExplanationVi"]), 60)
            self.assertEqual(set(review["reviewDimensions"]), set(r3.REVIEW_DIMENSIONS))
            self.assertEqual(review["reviewedContentHash"], review["reviewedContentSnapshot"]["content"] and
                             next(row["effectiveContentHash"] for row in self.projection["records"]
                                  if row["proposalKey"] == review["proposalKey"]))

    def test_newly_revised_fields_pass_separate_field_review(self):
        applied_keys = {row["proposalKey"] for row in self.applied}
        reviews = {row["proposalKey"]: row for row in self.batch_review["reviews"]}
        self.assertEqual(len(applied_keys), 12)
        for revision in self.revisions:
            review = reviews[revision["proposalKey"]]
            self.assertEqual(review["newFieldReview"], "PASS")
            field = revision["fieldRevisions"][0]
            self.assertEqual(field["postApplicationFieldReviewStatus"], "PASS")
            self.assertGreater(len(field["postApplicationReviewExplanationVi"]), 80)
        self.assertTrue(applied_keys.issubset(set(reviews)))

    def test_unresolved_full_sense_review_items_remain_review(self):
        self.assertGreater(self.batch_review["review"], 0)
        reviews = {row["proposalKey"]: row for row in self.batch_review["reviews"]}
        for key in ["EDITORIAL_2H2B:block:street-section",
                    "EDITORIAL_2H2B:broadly:widely",
                    "EDITORIAL_2H2B:cosmopolitan city:diverse-city",
                     "EDITORIAL_2H2B:greenhouse gas:heat-trapping-gas",
                     "EDITORIAL_2H2B:run:operate"]:
            self.assertEqual(reviews[key]["reviewStatus"], "REVIEW")
        self.assertFalse(self.batch_review["historicalReviewConvertedToPass"])

    def test_billion_field_pass_preserves_unresolved_sense_pos_review(self):
        key = "EDITORIAL_2H2B:billion:large-number"
        review = next(row for row in self.batch_review["reviews"]
                      if row["proposalKey"] == key)
        parent = next(row for row in self.parent["records"] if row["proposalKey"] == key)
        revised = next(row for row in self.projection["records"] if row["proposalKey"] == key)
        self.assertEqual(review["reviewStatus"], "REVIEW")
        self.assertFalse(review["reviewDimensions"]["posAndConstruction"])
        self.assertEqual(review["newFieldReview"], "PASS")
        self.assertEqual(parent["partOfSpeech"], revised["partOfSpeech"])

    def test_prior_review_and_rights_metadata_are_retained_in_snapshots(self):
        parent_rows = {row["proposalKey"]: row for row in self.parent["records"]}
        for review in self.batch_review["reviews"]:
            parent = parent_rows[review["proposalKey"]]
            snapshot = review["reviewedContentSnapshot"]
            self.assertEqual(snapshot["sourceEvidence"], parent["sourceEvidence"])
            self.assertEqual(snapshot["historicalQaFindings"], parent["historicalQaFindings"])
            self.assertEqual(snapshot["pinnedHistoricalQaReferences"], parent["pinnedHistoricalQaReferences"])
            self.assertEqual(review["historicalReviewStatePreserved"], parent["rawEffectiveQaFindings"])

    def test_original_141_proposals_and_8_boundaries_are_not_rewritten(self):
        self.assertEqual(self.queue["fieldProposalCount"], 141)
        self.assertEqual(self.queue["boundaryProposalCount"], 8)
        self.assertEqual(len(self.queue["fieldProposals"]), 141)
        self.assertEqual(len(self.queue["boundaryProposals"]), 8)
        self.assertEqual(self.queue["cumulativeCorrectionsApplied"], 18)
        self.assertEqual(self.queue["unreviewedCandidateCount"], 106)

    def test_all_six_parent_corrections_remain_and_new_ledger_is_additive(self):
        parent_ledger = load_json("../batch-02/applied-draft-corrections.json")["corrections"]
        self.assertEqual({x["correctionProposalId"] for x in parent_ledger}, r3.APPLIED_BEFORE - {
            "2H2I-R1-P008", "2H2I-R1-P009", "2H2I-R1-P010"
        })
        self.assertEqual({x["correctionProposalId"] for x in self.applied}, r3.APPLY_IDS)
        self.assertEqual(len(parent_ledger), 3)
        self.assertEqual(len(self.applied), 12)

    def test_three_named_prior_deferrals_keep_their_status(self):
        indexed = {row["correctionProposalId"]: row for row in self.queue["fieldProposals"]}
        self.assertEqual(r3.PREVIOUSLY_DEFERRED, {"2H2I-R6-P001", "2H2I-P003", "2H2I-R3-P001"})
        for proposal_id in r3.PREVIOUSLY_DEFERRED:
            self.assertEqual(indexed[proposal_id]["batch03Disposition"], "PREVIOUSLY_DEFERRED_PRESERVED")

    def test_gate_a_confirms_tracked_receipt_is_valid_utf8_and_unchanged(self):
        self.assertEqual(self.decode["outcome"], "ENVIRONMENT_SPECIFIC_DECODING_DEFECT_CONFIRMED")
        fixture = self.decode["trackedFixture"]
        self.assertTrue(fixture["strictUtf8Valid"])
        self.assertEqual(fixture["invalidUtf8ByteOffsets"], [])
        self.assertTrue(fixture["workingTreeEqualsIndexHeadAndParent"])
        self.assertEqual(fixture["sha256"], "058ef42939a079e21f05976fb421bea949269f5c4c38d4ef65821d67c031d4f0")
        self.assertEqual(fixture["gitBlobAtBatch02Parent"], "a89cb71ff03fd85a5ad5555b4bc86a6bcf07a5e5")

    def test_gate_a_reproduces_cp1258_default_write_not_bad_source_data(self):
        reproduction = self.decode["temporaryDefaultEncodingReproduction"]
        self.assertEqual(reproduction["localePreferredEncoding"].casefold(), "cp1258")
        self.assertEqual(reproduction["temporaryFileStrictUtf8InvalidOffsets"], [12585])
        self.assertEqual(reproduction["strictReaderError"]["byte"], 0x92)
        self.assertEqual(reproduction["diagnosticWindows1252InterpretationOf0x92"], "\u2019")
        self.assertTrue(self.decode["parentRegressionComparison"]["sameParentInputsAndCodeReproduceFailure"])

    def test_checkpoint_auth_preserves_draft_and_no_external_side_effects(self):
        validation = load_json("validation-summary.json")
        self.assertEqual(validation["rights"], "UNKNOWN_REVIEW_REQUIRED")
        self.assertEqual(validation["contentApprovalStatus"], "PENDING")
        self.assertEqual(validation["ownerApprovalsAdded"], 0)
        self.assertEqual(validation["canonicalIdsAllocated"], 0)
        self.assertEqual(validation["databaseAccess"], "NONE")
        self.assertEqual(validation["databaseWrites"], "NONE")
        self.assertEqual(validation["production"], "UNTOUCHED")
        self.assertFalse(validation["releaseEligible"])

    def test_overlay_api_rejects_mutation_and_database_cli_arguments(self):
        for flag in ["--apply", "--delete", "--database-url", "--production", "--import"]:
            result = subprocess.run([sys.executable, "-B", str(SCRIPT), flag],
                                    capture_output=True, cwd=ROOT)
            self.assertEqual(result.returncode, 2, flag)


if __name__ == "__main__":
    unittest.main(verbosity=2)
