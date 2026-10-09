#!/usr/bin/env python3
"""Focused read-only regression tests for Phase 2H.2I checkpoint 07."""
import copy
import importlib.util
import json
from collections import Counter
from pathlib import Path
import subprocess
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("checkpoint07", Path(__file__).with_name("phase-2h2i-aggregate-qa-checkpoint-07.py"))
m = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = m
SPEC.loader.exec_module(m)


class Checkpoint07Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.index = m.a.unique(m.load(m.a.WS / "effective-sense-index.json")["records"], "proposalKey")
        cls.parent_coverage = m.load(m.CP06 / "coverage-audit-cumulative.json")["groups"]
        cls.receipt = m.load(m.WS / "resume-selection-receipt.json")
        cls.decisions = m.load(m.WS / m.DECISIONS)
        cls.notes = m.load(m.WS / m.NOTES)
        cls.boundaries = m.load(m.WS / m.BOUNDARIES)
        cls.field_proposals = m.load(m.WS / m.FIELD_PROPOSALS)
        cls.selected = [x["candidateGroupKey"] for x in cls.receipt["coverage"]]
        cls.new_by_key = m.validate_decisions(cls.index, cls.receipt, cls.decisions, cls.notes,
                                              cls.boundaries, cls.field_proposals, m.source_data())
        decision_indices = {row["candidateGroupKey"]: i for i, row in enumerate(cls.decisions["records"])}
        cls.cumulative = []
        for i, row in enumerate(cls.parent_coverage):
            key = row["candidateGroupKey"]
            if key in cls.new_by_key:
                cls.cumulative.append({**row, "status": "ASSESSED",
                    "parentRecord": m.ref(m.CP06 / "coverage-audit-cumulative.json", f"/groups/{i}"),
                    "newDecision": m.ref(m.WS / m.DECISIONS, f"/records/{decision_indices[key]}")})
            else:
                cls.cumulative.append(row)
        cls.findings = m.cumulative_findings(cls.cumulative, cls.new_by_key)

    def test_01_expected_remote_parent_and_checkpoint_fingerprint_are_pinned(self):
        self.assertEqual(m.PIN, "5c80c010f6c83fee24614f07831a3016185471d8953e6a6aefa471e5f73e2766")
        self.assertEqual(m.BASELINE, "c4f45c5265f73780a51ecfb7aacea76b7f53b965")
        self.assertEqual(self.receipt["parentFingerprint"], m.PIN)
        self.assertEqual(self.receipt["remoteBaseline"], m.BASELINE)
        self.assertEqual(self.receipt["frozenAuthoringCohortFingerprint"], m.FROZEN)

    def test_02_parent_replay_is_zero_write(self):
        result = m.c6.run(True)
        self.assertEqual(result["fingerprint"], m.PIN)
        self.assertTrue(result["zeroWrites"])

    def test_03_all_83_pending_groups_selected_in_original_order(self):
        expected = [x["candidateGroupKey"] for x in self.parent_coverage if x["status"] == "PENDING"]
        self.assertEqual(self.selected, expected)
        self.assertEqual(len(self.selected), 83)
        self.assertEqual(self.selected[0], "NORMALIZED_HEADWORD:loan")
        self.assertEqual(self.selected[-1], "NORMALIZED_HEADWORD:want")

    def test_04_selection_is_unique_and_disjoint_from_417_parent_assessments(self):
        prior = {x["candidateGroupKey"] for x in self.parent_coverage if x["status"] == "ASSESSED"}
        self.assertEqual(len(self.selected), len(set(self.selected)))
        self.assertEqual(len(prior), 417)
        self.assertFalse(prior.intersection(self.selected))
        self.assertEqual(self.receipt["selectedPreviouslyAssessedGroupCount"], 0)

    def test_05_selection_records_original_ordinals_hashes_warnings_and_source_refs(self):
        original = m.load(m.ORIGINAL_COVERAGE)["groups"]
        for item in self.receipt["coverage"]:
            self.assertEqual(original[item["originalGroupOrdinal"]]["candidateGroupKey"], item["candidateGroupKey"])
            self.assertEqual(item["originalWarnings"], original[item["originalGroupOrdinal"]]["originalWarningRecord"]["warnings"])
            self.assertTrue(item["effectiveProposalKeys"])
            self.assertEqual(set(item["effectiveProposalKeys"]), set(item["effectiveContentHashes"]))
            self.assertEqual(len(item["sourceEvidenceReferences"]), len(item["effectiveProposalKeys"]))

    def test_06_effective_hashes_and_all_content_fields_and_pos_are_inspected(self):
        self.assertEqual(len(self.decisions["records"]), 83)
        for decision in self.decisions["records"]:
            self.assertEqual(set(decision["inspectedProposalKeys"]), set(decision["effectiveContentHashes"]))
            self.assertEqual(set(decision["inspectedProposalKeys"]), set(decision["inspectedFields"]))
            self.assertEqual(set(decision["inspectedProposalKeys"]), set(decision["inspectedPartOfSpeech"]))
            for key in decision["inspectedProposalKeys"]:
                self.assertEqual(decision["effectiveContentHashes"][key], self.index[key]["effectiveContentHash"])
                self.assertEqual(decision["inspectedFields"][key], sorted(self.index[key]["content"]))
                self.assertEqual(decision["inspectedPartOfSpeech"][key], self.index[key]["partOfSpeech"])
                self.assertTrue({"definitionEn", "meaningVi", "examples", "grammarNotesEn"}.issubset(self.index[key]["content"]))

    def test_07_source_record_hashes_and_structured_source_scopes_are_valid(self):
        sources = m.source_data()
        m.validate_source_evidence(self.index, self.receipt["coverage"], sources)
        for row in self.decisions["records"]:
            self.assertEqual(row["sourceEvidence"], row["actualSourceEvidence"])
            self.assertTrue(row["sourceScopeReviewed"])
            self.assertEqual(row["correctionAndOverlayLineage"].keys(), row["effectiveContentHashes"].keys())

    def test_08_source_hash_mismatch_fails_closed(self):
        selected = copy.deepcopy(self.receipt["coverage"])
        selected[0]["sourceEvidenceReferences"][0]["sourceEvidence"][0]["recordEvidenceSha256"] = "0" * 64
        with self.assertRaises(ValueError):
            m.validate_source_evidence(self.index, selected, m.source_data())

    def test_09_assessment_explanations_are_specific_and_nonempty(self):
        explanations = [x["explanationVi"] for x in self.decisions["records"]]
        self.assertEqual(len(explanations), len(set(explanations)))
        for row in self.decisions["records"]:
            self.assertTrue(row["explanationVi"].strip())
            self.assertTrue(row["limitationsVi"].strip())
            self.assertTrue(row["nextActionVi"].strip())
            self.assertIn(row["candidateGroupKey"].split(":", 1)[1], row["limitationsVi"])

    def test_10_youth_extra_count_sense_is_evidence_scope_unknown(self):
        row = next(x for x in self.decisions["records"] if x["candidateGroupKey"] == "NORMALIZED_HEADWORD:youth")
        self.assertEqual(row["classification"], "COVERAGE_UNKNOWN")
        self.assertIn("ordinal", row["explanationVi"])
        self.assertIn("young-person", str(row["inspectedProposalKeys"]))
        self.assertTrue(row["unresolvedEvidence"])

    def test_11_stall_extra_delay_sense_is_unknown_not_manufactured_as_gap(self):
        row = next(x for x in self.decisions["records"] if x["candidateGroupKey"] == "NORMALIZED_HEADWORD:stall")
        self.assertEqual(row["classification"], "COVERAGE_UNKNOWN")
        self.assertIn("delay progress", row["explanationVi"])
        self.assertEqual(self.boundaries["records"], [])

    def test_12_noble_source_pos_example_mismatch_remains_flagged(self):
        row = next(x for x in self.decisions["records"] if x["candidateGroupKey"] == "NORMALIZED_HEADWORD:noble")
        self.assertEqual(row["classification"], "SOURCE_METADATA_CONFLICT")
        self.assertIn("noun", row["explanationVi"])
        self.assertIn("adjective", row["explanationVi"])

    def test_13_lot_example_defect_is_an_unapplied_hash_bound_proposal(self):
        proposal = self.field_proposals["records"][0]
        current = self.index[proposal["proposalKey"]]["content"]["examples"][0]["en"]
        self.assertEqual(current, "A lot of leaves collected beside the garden gate overnight.")
        self.assertEqual(proposal["before"], current)
        self.assertIn("were collected", proposal["after"])
        self.assertFalse(proposal["applied"])
        self.assertFalse(proposal["ownerApproval"])
        self.assertEqual(proposal["originalEffectiveContentHash"], self.index[proposal["proposalKey"]]["effectiveContentHash"])

    def test_14_no_new_boundary_without_a_confirmed_gap_and_all_8_parents_are_referenced(self):
        self.assertEqual(self.boundaries["records"], [])
        self.assertEqual(self.boundaries["previousBoundaryProposalCount"], 8)
        self.assertEqual(len(self.boundaries["previousBoundaryReferences"]), 2)
        self.assertFalse(self.boundaries["ownerApproval"])
        self.assertEqual(self.boundaries["canonicalIdsAllocated"], 0)

    def test_15_cumulative_classification_counts_total_500_and_distinguish_unique_findings(self):
        counts = Counter(x["classification"] for x in self.findings["records"])
        self.assertEqual(counts, {
            "CONFIRMED_GAP": 8, "POSSIBLE_GAP": 8, "SOURCE_METADATA_CONFLICT": 18,
            "COVERAGE_UNKNOWN": 5, "NO_IDENTIFIED_SOURCE_SUPPORTED_GAP": 461,
        })
        self.assertEqual(self.findings["uniqueGroupCount"], 500)
        self.assertEqual(self.findings["findingRecordCount"], 500)
        self.assertEqual(self.findings["repeatedFindingsBeyondOnePerGroup"], 0)

    def test_16_417_parent_coverage_records_are_unchanged(self):
        assessed_before = [x for x in self.parent_coverage if x["status"] == "ASSESSED"]
        assessed_after = [x for x in self.cumulative if x["candidateGroupKey"] not in self.selected]
        self.assertEqual(assessed_before, assessed_after)

    def test_17_all_original_warning_identities_and_review_grammar_closures_survive(self):
        original = m.load(m.ORIGINAL_COVERAGE)["groups"]
        warning_keys = {x["candidateGroupKey"] for x in original if x["originalWarningRecord"]["warnings"]}
        self.assertEqual(len(warning_keys), 126)
        for row in self.cumulative:
            if row["candidateGroupKey"] in warning_keys:
                self.assertTrue(row["originalWarnings"])
        _, _, summary, reviews, grammar = m.parent_state()
        self.assertEqual((len(reviews), sum(x["status"] == "TRIAGED" for x in reviews)), (187, 187))
        self.assertEqual((grammar["dedicatedCandidateCount"], len(grammar["pendingDedicatedInspectionKeys"])), (107, 0))

    def test_18_previous_field_and_boundary_proposals_have_no_stale_hashes(self):
        fields, boundaries = m.history_records(self.index)
        self.assertEqual((len(fields), len(boundaries)), (140, 8))
        self.assertTrue(all(x["originalEffectiveContentHash"] == self.index[x["proposalKey"]]["effectiveContentHash"] for x in fields))

    def test_19_no_owner_approval_canonical_identity_rights_or_correction_is_inferred(self):
        for row in self.decisions["records"]:
            self.assertFalse(row["ownerApproval"])
            self.assertFalse(row["exhaustiveLexicalCoverage"])
            self.assertEqual(row["rights"], "UNKNOWN_REVIEW_REQUIRED")
        self.assertEqual(m.AUTH["correctionsApplied"], 0)
        self.assertEqual(m.AUTH["ownerApprovalsAdded"], 0)
        self.assertEqual(m.AUTH["canonicalIdsAllocated"], 0)
        self.assertEqual(m.AUTH["databaseAccess"], "NONE")
        self.assertEqual(m.AUTH["databaseWrites"], "NONE")

    def test_20_production_and_mutation_cli_arguments_are_rejected(self):
        script = Path(__file__).with_name("phase-2h2i-aggregate-qa-checkpoint-07.py")
        for arg in ("--production", "--database-write", "--apply-corrections", "--delete", "--materialize"):
            result = subprocess.run([sys.executable, "-B", str(script), arg], cwd=ROOT,
                                    capture_output=True, text=True, encoding="utf-8")
            self.assertNotEqual(result.returncode, 0, arg)

    def test_21_replay_serialization_is_stable_under_mapping_order(self):
        left = {"phase": "2H.2I-R6", "count": 83, "labels": ["DRAFT", "UNKNOWN_REVIEW_REQUIRED"]}
        right = {"labels": ["DRAFT", "UNKNOWN_REVIEW_REQUIRED"], "count": 83, "phase": "2H.2I-R6"}
        self.assertEqual(m.encode(left), m.encode(right))
        self.assertEqual(m.digest(left), m.digest(right))

    def test_22_accepted_parent_files_remain_pinned(self):
        pins = m.load(m.WS / "accepted-parent-pins.json")
        m.validate_pins(pins)
        self.assertEqual(pins["parentFingerprint"], m.PIN)
        self.assertEqual(pins["remoteBaseline"], m.BASELINE)

    def test_23_only_sanitized_source_references_are_serialized(self):
        payload = m.encode(self.decisions)
        self.assertNotIn('"sourceFields"', payload)
        self.assertNotIn('"email"', payload.lower())
        self.assertNotIn('"phone"', payload.lower())
        self.assertNotIn('"fullName"', payload)

    def test_24_new_assessments_remain_draft_and_do_not_mutate_effective_projection(self):
        for row in self.decisions["records"]:
            self.assertEqual(row["status"], "ASSESSED")
            for key in row["inspectedProposalKeys"]:
                self.assertEqual(row["effectiveContentHashes"][key], self.index[key]["effectiveContentHash"])
        self.assertEqual(sum(x["status"] == "ASSESSED" for x in self.cumulative), 500)
        self.assertEqual(sum(x["status"] == "PENDING" for x in self.cumulative), 0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
