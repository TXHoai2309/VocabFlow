#!/usr/bin/env python3
"""Focused integrity and fail-closed tests for Phase 2H.2J-R1."""
import copy
import importlib.util
import json
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/phase-2h2j-draft-remediation-pilot-01.py"
SPEC = importlib.util.spec_from_file_location("phase_2h2j_pilot", SCRIPT)
PILOT = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(PILOT)


class PilotIntegrityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.context = PILOT.load_context()
        cls.base_snapshot = PILOT.digest(cls.context["baseRecords"])
        cls.authored = PILOT.load_authored(cls.context)
        cls.revisions, cls.revised_rows = PILOT.apply_selected(cls.context, cls.authored)
        cls.batches, cls.batch_pins, cls.reviews = PILOT.verify_full_batch_review(
            cls.context, cls.authored, cls.revised_rows)
        cls.review_by_key = {row["proposalKey"]: row for row in cls.reviews}
        cls.base_by_key = cls.context["rows"]
        cls.revision_by_key = {row["proposalKey"]: row for row in cls.revisions}

    def test_accepted_audit_and_handoff_pins(self):
        self.assertEqual(PILOT.PARENT_CHECKPOINT_FINGERPRINT,
                         self.context["auditManifest"]["fingerprint"])
        self.assertEqual(PILOT.PARENT_HANDOFF_FINGERPRINT,
                         PILOT.read(PILOT.CP07 / "final-handoff-manifest.json")["fingerprint"])

    def test_original_projection_has_1563_senses(self):
        self.assertEqual(1563, len(self.context["baseRecords"]))
        self.assertEqual(1563, len(self.base_by_key))

    def test_original_projection_has_1020_authored_groups(self):
        self.assertEqual(1020, len({row["candidateGroupKey"] for row in self.context["baseRecords"]}))

    def test_final_audit_has_141_unique_field_proposals(self):
        ids = [row["correctionProposalId"] for row in self.context["proposals"]]
        self.assertEqual(141, len(ids))
        self.assertEqual(141, len(set(ids)))

    def test_historical_proposals_are_content_bound_and_unapplied(self):
        for proposal in self.context["proposals"]:
            PILOT.validate_proposal(proposal, self.base_by_key)
            self.assertFalse(proposal["applied"])
            self.assertFalse(proposal["ownerApproval"])

    def test_all_eight_boundary_proposals_are_preserved(self):
        self.assertEqual(8, len(self.context["boundaries"]))
        self.assertEqual({"condensed", "hail", "to", "elastic", "high", "harness", "fiery", "instrumental"},
                         {row.get("candidateGroupKey", "").split(":")[-1]
                          for row in self.context["boundaries"]})

    def test_historical_priority_accounting_has_both_scopes(self):
        queue = PILOT.read(PILOT.CP07 / "prioritized-remediation-queue.json")
        self.assertEqual({"P0": 0, "P1": 10, "P2": 103, "P3": 164},
                         queue["cumulativePriorityCounts"])
        self.assertEqual({"P0": 0, "P1": 17, "P2": 31, "P3": 140},
                         queue["deduplicatedInventoryPriorityCounts"])

    def test_exact_four_candidate_scope_and_order(self):
        ids = [row["correctionProposalId"] for row in self.authored["selection"]["candidates"]]
        self.assertEqual(PILOT.EXPECTED_SELECTION, ids)
        self.assertEqual(4, len(set(ids)))

    def test_mandatory_lot_candidate_is_first_and_exact(self):
        candidate = self.authored["selection"]["candidates"][0]
        self.assertEqual("2H2I-R6-P001", candidate["correctionProposalId"])
        self.assertEqual("/content/examples/0/en", candidate["field"])
        self.assertEqual("A lot of leaves collected beside the garden gate overnight.", candidate["before"])
        self.assertEqual("A lot of leaves were collected beside the garden gate overnight.", candidate["after"])

    def test_lot_candidate_is_bound_to_current_parent_hash(self):
        candidate = self.authored["selection"]["candidates"][0]
        self.assertEqual("63b75424e7513161c67ef47e4139a54303e938f2342a09e34806573de8aa5fa1",
                         candidate["parentContentHash"])
        self.assertEqual(self.base_by_key[candidate["proposalKey"]]["effectiveContentHash"],
                         candidate["parentContentHash"])

    def test_lot_passive_revision_is_deferred_for_meaning_risk(self):
        assessment = self.authored["eligibility"]["records"][0]
        decision = self.authored["application"]["records"][0]
        self.assertEqual("DEFER_SEMANTIC_RISK", assessment["eligibilityStatus"])
        self.assertEqual("DEFER", decision["decision"])
        self.assertIn("tụ lại", assessment["reviewExplanationVi"])

    def test_three_grammar_note_candidates_are_eligible(self):
        self.assertEqual({"2H2I-R1-P008", "2H2I-R1-P009", "2H2I-R1-P010"},
                         {row["correctionProposalId"] for row in self.authored["eligibility"]["records"]
                          if row["eligibilityStatus"] == "APPLY_ELIGIBLE"})

    def test_each_candidate_includes_source_evidence_and_history(self):
        for candidate, assessment in zip(self.authored["selection"]["candidates"],
                                         self.authored["eligibility"]["records"]):
            row = self.base_by_key[candidate["proposalKey"]]
            self.assertEqual(row["sourceEvidence"], candidate["sourceEvidence"])
            self.assertEqual(row["sourceEvidence"], assessment["sourceEvidence"])
            self.assertTrue(candidate["historicalFindingReferences"])
            self.assertTrue(assessment["reviewExplanationVi"].strip())

    def test_no_selected_proposal_has_an_existing_overlay_lineage(self):
        for proposal_id in PILOT.APPLY_IDS:
            row = self.base_by_key[self.authored["byId"][proposal_id]["proposalKey"]]
            self.assertFalse(row["pinnedCorrectionLineage"])
            self.assertFalse(row["appliedCorrectionReferences"])

    def test_application_decisions_add_no_owner_approval_or_canonical_id(self):
        for decision in self.authored["application"]["records"]:
            self.assertFalse(decision["ownerApproval"])
            self.assertFalse(decision["canonicalIdAllocated"])
            self.assertEqual("DRAFT", decision["contentStatus"])
            self.assertEqual("UNKNOWN_REVIEW_REQUIRED", decision["rights"])

    def test_exactly_three_distinct_senses_receive_revisions(self):
        self.assertEqual(3, len(self.revisions))
        self.assertEqual(3, len(self.revised_rows))
        self.assertEqual(3, len({row["revisionId"] for row in self.revisions}))

    def test_only_grammar_note_fields_change_in_the_new_layer(self):
        for key, revised in self.revised_rows.items():
            original = self.base_by_key[key]
            self.assertEqual({**original, "effectiveContentHash": revised["effectiveContentHash"]}
                             | {"content": revised["content"]}, revised)
            changed = [field for field in original["content"]
                       if original["content"][field] != revised["content"][field]]
            self.assertEqual(["grammarNotesEn"], changed)

    def test_source_projection_was_not_mutated_by_cloning(self):
        self.assertEqual(self.base_snapshot, PILOT.digest(self.context["baseRecords"]))

    def test_revisions_retain_exact_parent_and_field_hashes(self):
        for revision in self.revisions:
            self.assertEqual(self.base_by_key[revision["proposalKey"]]["effectiveContentHash"],
                             revision["previousEffectiveContentHash"])
            self.assertEqual(PILOT.text_sha(revision["before"]), revision["beforeFieldSha256"])
            self.assertEqual(PILOT.text_sha(revision["after"]), revision["afterFieldSha256"])
            self.assertEqual(PILOT.current_hash(revision["record"]), revision["revisedContentHash"])
            self.assertEqual(revision["revisedContentHash"], revision["record"]["effectiveContentHash"])
            self.assertEqual("DRAFT_REMEDIATION_PILOT_01", revision["revisionLayer"])
            self.assertEqual("UNKNOWN_REVIEW_REQUIRED", revision["rights"])

    def test_duplicate_field_applications_fail_closed(self):
        fields = {}
        for proposal in self.context["proposals"]:
            fields.setdefault((proposal["proposalKey"], proposal["field"]), []).append(proposal)
        for proposal_id in PILOT.APPLY_IDS:
            proposal = self.authored["byId"][proposal_id]
            self.assertEqual(1, len(fields[(proposal["proposalKey"], proposal["field"])]))

    def test_repeated_overlay_computation_is_identical_without_appending(self):
        revisions_again, rows_again = PILOT.apply_selected(self.context, self.authored)
        self.assertEqual(self.revisions, revisions_again)
        self.assertEqual(self.revised_rows, rows_again)

    def test_replay_does_not_mutate_original_aggregate_projection(self):
        self.assertEqual(self.base_snapshot, PILOT.digest(self.context["baseRecords"]))

    def test_all_24_current_senses_in_affected_batches_are_reviewed_once(self):
        expected = set()
        for batch in self.batches:
            expected.update(row["proposalKey"] for row in self.context["baseRecords"]
                            if row["candidateGroupKey"] in set(batch["groupKeys"]))
        self.assertEqual(24, len(expected))
        self.assertEqual(expected, set(self.review_by_key))
        self.assertEqual(24, len(self.reviews))

    def test_review_covers_all_required_linguistic_dimensions(self):
        required = {"definition", "vietnameseMeaning", "allBilingualExamples", "posAndConstruction",
                    "grammarNotes", "siblingSenseConsistency", "sourceAndProvenance",
                    "sourceOriginalitySignalsChecked", "historicalFindingsRechecked", "meaningAndTranslationDriftChecked",
                    "fieldCompleteness", "duplicateContentChecked"}
        for review in self.reviews:
            self.assertTrue(review["explanationVi"].strip())
            self.assertTrue(required.issubset(review["checks"]))
            self.assertTrue(all(review["checks"][key] is True for key in required))

    def test_reviewed_hash_tracks_exact_effective_content(self):
        for key, review in self.review_by_key.items():
            expected = self.revised_rows.get(key, self.base_by_key[key])
            self.assertEqual(expected["effectiveContentHash"], review["reviewedEffectiveContentHash"])

    def test_full_batch_review_preserves_twenty_pass_and_four_review_items(self):
        self.assertEqual(20, sum(row["reviewStatus"] == "PASS" for row in self.reviews))
        self.assertEqual(4, sum(row["reviewStatus"] == "REVIEW" for row in self.reviews))
        self.assertEqual(0, sum(row["reviewStatus"] == "FAIL" for row in self.reviews))
        self.assertEqual({"REVIEW"}, {self.review_by_key[key]["reviewStatus"] for key, row in self.base_by_key.items()
                                       if row["effectiveQaAssessment"] == "REVIEW" and key in self.review_by_key})

    def test_batch_reviews_pin_all_original_manuscripts_and_accepted_audits(self):
        self.assertEqual(3, len(self.batches))
        self.assertEqual({68, 72, 81}, {row["batch"] for row in self.batches})
        self.assertEqual(15, len(self.batch_pins))
        for review in self.batches:
            self.assertTrue(review["reviewedAllCurrentSenses"])
            self.assertTrue(review["originalAuthoredBatch"]["sha256"])
            self.assertTrue(review["acceptedQualityAudit"]["sha256"])

    def test_unselected_senses_keep_their_original_hashes(self):
        effective = {key: self.revised_rows.get(key, original)
                     for key, original in self.base_by_key.items()}
        self.assertEqual(1563, len(effective))
        self.assertEqual(3, sum(effective[key]["effectiveContentHash"] != original["effectiveContentHash"]
                                for key, original in self.base_by_key.items()))
        for key, original in self.base_by_key.items():
            if key not in self.revised_rows:
                self.assertEqual(original["effectiveContentHash"], effective[key]["effectiveContentHash"])

    def test_selected_corrections_keep_all_unedited_record_provenance(self):
        for key, revised in self.revised_rows.items():
            original = self.base_by_key[key]
            for field in original:
                if field not in {"content", "effectiveContentHash"}:
                    self.assertEqual(original[field], revised[field], field)

    def test_no_owner_approval_rights_clearance_or_canonical_id_is_added(self):
        self.assertEqual(0, PILOT.AUTH["ownerApprovalsAdded"])
        self.assertEqual(0, PILOT.AUTH["canonicalIdsAllocated"])
        self.assertEqual(0, PILOT.AUTH["rightsClearanceAdded"])
        self.assertEqual("UNKNOWN_REVIEW_REQUIRED", PILOT.AUTH["rights"])
        self.assertFalse(PILOT.AUTH["publicationEligible"])

    def test_mutation_and_production_cli_flags_are_rejected(self):
        for args in [["--apply"], ["--delete"], ["--target", "production"], ["--sql", "DELETE FROM senses"]]:
            result = subprocess.run([sys.executable, "-B", str(SCRIPT), *args], cwd=ROOT,
                                    capture_output=True, text=True, check=False)
            self.assertEqual(2, result.returncode, args)
            self.assertIn("unrecognized arguments", result.stderr)

    def test_detached_replay_receipt_binds_two_zero_write_hash_seed_replays(self):
        receipt = {"pilotFingerprint": "pilot-fp", "postAssemblyReplay": [
            {"pythonHashSeed": "1", "exitCode": 0, "fingerprint": "pilot-fp", "zeroWrites": True},
            {"pythonHashSeed": "8675309", "exitCode": 0, "fingerprint": "pilot-fp", "zeroWrites": True},
        ]}
        PILOT.validate_detached_replay(receipt, "pilot-fp")

    def test_detached_replay_receipt_rejects_stale_or_single_seed_results(self):
        with self.assertRaises(ValueError):
            PILOT.validate_detached_replay({"pilotFingerprint": "wrong"}, "pilot-fp")
        one_seed = {"postAssemblyReplay": [
            {"pythonHashSeed": "1", "exitCode": 0, "fingerprint": "pilot-fp", "zeroWrites": True},
        ]}
        with self.assertRaises(ValueError):
            PILOT.validate_detached_replay(one_seed, "pilot-fp")


if __name__ == "__main__":
    unittest.main(verbosity=2)
