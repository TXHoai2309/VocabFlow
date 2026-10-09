#!/usr/bin/env python3
"""Focused integrity tests for the offline Phase 2H.2I checkpoint 06."""
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("checkpoint06", Path(__file__).with_name("phase-2h2i-aggregate-qa-checkpoint-06.py"))
m = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = m
spec.loader.exec_module(m)


class Checkpoint06Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.index, cls.reviews, cls.coverage, cls.grammar = m.parents()
        cls.receipt = m.load(m.WS / "resume-selection-receipt.json")
        cls.decisions = m.load(m.WS / m.DECISIONS)
        cls.notes = m.load(m.WS / m.ASSESSMENT_NOTES)
        cls.boundaries = m.load(m.WS / m.BOUNDARIES)

    def test_01_parent_and_predecessor_fingerprints_are_fixed(self):
        self.assertEqual(m.PIN, "4a3a5d0f48a07dcdd7e5e2f1d7ca2aa2af58709bae174a02f77d84814bbd078f")
        self.assertEqual(m.BASELINE, "7072cf62c310ab9c724745502d446111c14b9943")
        self.assertEqual(self.receipt["checkpoint04Fingerprint"], m.c5.PIN)
        self.assertEqual(self.receipt["parentFingerprint"], m.PIN)

    def test_02_parent_inventory_and_closed_audits_remain_unchanged(self):
        self.assertEqual(len(self.index), 1563)
        self.assertEqual(len(self.coverage), 500)
        self.assertEqual(sum(x["status"] == "ASSESSED" for x in self.coverage), 317)
        self.assertEqual(sum(x["status"] == "PENDING" for x in self.coverage), 183)
        self.assertEqual(len(self.reviews), 187)
        self.assertEqual(sum(x["status"] == "TRIAGED" for x in self.reviews), 187)
        self.assertEqual(self.grammar["dedicatedCandidateCount"], 107)
        self.assertEqual(self.grammar["pendingDedicatedInspectionKeys"], [])

    def test_03_selection_is_exact_first_100_pending_in_original_order(self):
        self.assertEqual(self.receipt, m.selection(self.index, self.coverage))
        self.assertEqual(len(self.receipt["coverage"]), 100)
        self.assertEqual(self.receipt["coverage"][0]["candidateGroupKey"], "NORMALIZED_HEADWORD:maths")
        self.assertEqual(self.receipt["coverage"][-1]["candidateGroupKey"], "NORMALIZED_HEADWORD:grocery")
        ordinals = [x["originalGroupOrdinal"] for x in self.receipt["coverage"]]
        self.assertEqual(ordinals, sorted(ordinals))

    def test_04_selection_has_no_previous_assessment_overlap_or_duplicates(self):
        selected = [x["candidateGroupKey"] for x in self.receipt["coverage"]]
        old = {x["candidateGroupKey"] for x in self.coverage if x["status"] == "ASSESSED"}
        self.assertEqual(len(selected), len(set(selected)))
        self.assertFalse(set(selected) & old)
        self.assertTrue(all(x["selectedPreviouslyAssessedGroupCount"] == 0 for x in [self.receipt]))

    def test_05_all_153_effective_senses_are_bound_and_have_all_content_fields_inspected(self):
        rows = self.decisions["records"]
        self.assertEqual(len(rows), 100)
        self.assertEqual(sum(len(x["inspectedProposalKeys"]) for x in rows), 153)
        for row in rows:
            senses = [x for x in self.index.values() if x["candidateGroupKey"] == row["candidateGroupKey"]]
            expected_hashes = {x["proposalKey"]: x["effectiveContentHash"] for x in senses}
            self.assertEqual(row["effectiveContentHashes"], expected_hashes)
            self.assertEqual(row["inspectedProposalKeys"], list(expected_hashes))
            self.assertEqual(set(row["inspectedFields"]), set(expected_hashes))
            for sense in senses:
                self.assertEqual(set(row["inspectedFields"][sense["proposalKey"]]), set(sense["content"]))
                self.assertEqual(row["inspectedFields"][sense["proposalKey"]], sorted(sense["content"]))

    def test_06_source_evidence_references_match_exact_effective_sense_records(self):
        for row in self.decisions["records"]:
            senses = [self.index[k] for k in row["inspectedProposalKeys"]]
            evidence = [x["sourceEvidence"] for x in senses]
            self.assertEqual(row["sourceEvidence"], evidence)
            self.assertEqual(row["actualSourceEvidence"], evidence)
            self.assertEqual(row["sourceScopeReviewed"], [
                f"{e['corpus']} record {e['recordIndex']} POS={','.join(e['normalizedPosCandidates'])} ordinals={e.get('structuredOxfordSenseGroupOrdinals',[])}"
                for group in evidence for e in group
            ])

    def test_07_decisions_are_specific_assessed_and_non_exhaustive(self):
        rows = self.decisions["records"]
        self.assertEqual(len({x["explanationVi"] for x in rows}), 100)
        for row in rows:
            self.assertTrue(row["explanationVi"].strip())
            self.assertTrue(row["limitationsVi"].strip())
            self.assertTrue(row["nextActionVi"].strip())
            self.assertEqual(row["status"], "ASSESSED")
            self.assertFalse(row["ownerApproval"])
            self.assertEqual(row["rights"], "UNKNOWN_REVIEW_REQUIRED")
            self.assertFalse(row["exhaustiveLexicalCoverage"])
            self.assertEqual(row["parentCheckpointFingerprint"], m.PIN)

    def test_08_classification_counts_are_content_authored(self):
        from collections import Counter
        counts = Counter(x["classification"] for x in self.decisions["records"])
        self.assertEqual(counts, {
            "NO_IDENTIFIED_SOURCE_SUPPORTED_GAP": 95,
            "POSSIBLE_GAP": 2,
            "SOURCE_METADATA_CONFLICT": 2,
            "CONFIRMED_GAP": 1,
        })
        self.assertEqual(self.notes["records"], [
            {"candidateGroupKey": x["candidateGroupKey"], "classification": x["classification"], "explanationVi": x["explanationVi"]}
            for x in self.decisions["records"]
        ])

    def test_09_high_has_a_source_bound_adjective_gap_and_only_a_proposal(self):
        high = next(x for x in self.decisions["records"] if x["candidateGroupKey"] == "NORMALIZED_HEADWORD:high")
        proposal = self.boundaries["records"][0]
        self.assertEqual(high["classification"], "CONFIRMED_GAP")
        self.assertEqual(proposal["candidateGroupKey"], high["candidateGroupKey"])
        self.assertEqual(proposal["proposedPos"], "ADJECTIVE")
        self.assertIn("greater than usual", proposal["content"]["definitionEn"].lower())
        self.assertIn("vocab4600-normalized-inventory.json", proposal["lexicalCorroboration"])
        self.assertFalse(proposal["applied"])
        self.assertFalse(proposal["approved"])
        self.assertFalse(proposal["ownerApproval"])
        self.assertFalse(proposal["proposalKeyAllocated"])
        self.assertFalse(proposal["sourceOrdinalAllocated"])
        self.assertIsNone(proposal["canonicalId"])
        self.assertEqual(proposal["supportingExistingContentHashes"]["EDITORIAL_2H2H:high:far-above-ground"],
                         high["effectiveContentHashes"]["EDITORIAL_2H2H:high:far-above-ground"])
        self.assertIn("ENGLISH_VOCAB_4600", str(proposal["sourceEvidence"]))

    def test_10_possible_gaps_and_source_metadata_conflicts_stay_unapproved(self):
        by_key = {x["candidateGroupKey"]: x for x in self.decisions["records"]}
        self.assertEqual(by_key["NORMALIZED_HEADWORD:share"]["classification"], "POSSIBLE_GAP")
        self.assertEqual(by_key["NORMALIZED_HEADWORD:slip"]["classification"], "POSSIBLE_GAP")
        self.assertEqual(by_key["NORMALIZED_HEADWORD:totally"]["classification"], "SOURCE_METADATA_CONFLICT")
        self.assertEqual(by_key["NORMALIZED_HEADWORD:competence"]["classification"], "SOURCE_METADATA_CONFLICT")
        self.assertEqual(len(self.boundaries["records"]), 1)

    def test_11_all_original_warning_identities_and_prior_coverage_records_survive(self):
        original = m.load(m.ORIGINAL_COVERAGE)["groups"]
        original_warned = {x["candidateGroupKey"] for x in original if x["originalWarningRecord"]["warnings"]}
        previous = {x["candidateGroupKey"]: x for x in self.coverage}
        self.assertEqual(len(original_warned), 126)
        for key in original_warned:
            self.assertTrue(previous[key]["originalWarnings"])
        for selected in self.receipt["coverage"]:
            self.assertEqual(selected["originalWarnings"], original[selected["originalGroupOrdinal"]]["originalWarningRecord"]["warnings"])
            self.assertEqual(previous[selected["candidateGroupKey"]]["status"], "PENDING")

    def test_12_prior_proposals_and_corrections_remain_unchanged(self):
        old_fields, old_boundaries = m.c5.previous_proposals()
        cp05 = m.load(m.CP05 / "authored/new-correction-proposals.json")
        self.assertEqual(len(old_fields) + len(cp05["records"]), 140)
        self.assertEqual(len(old_boundaries) + len(cp05["additionalBoundaryProposals"]), 7)
        self.assertTrue(all(x["applied"] is False for x in cp05["records"]))

    def test_13_no_database_production_owner_or_canonical_mutation_is_authorized(self):
        self.assertEqual(m.AUTH["databaseAccess"], "NONE")
        self.assertEqual(m.AUTH["databaseWrites"], "NONE")
        self.assertEqual(m.AUTH["production"], "UNTOUCHED")
        self.assertEqual(m.AUTH["canonicalIdsAllocated"], 0)
        self.assertEqual(m.AUTH["ownerApprovalsAdded"], 0)
        self.assertEqual(m.AUTH["correctionsApplied"], 0)
        self.assertFalse(self.decisions["linguisticDecisionsGeneratedDuringAssembly"])

    def test_14_mutating_cli_arguments_are_rejected(self):
        for arg in ("--production", "--database-write", "--apply-corrections", "--delete", "--materialize"):
            result = subprocess.run([sys.executable, "-B", str(Path(__file__).with_name("phase-2h2i-aggregate-qa-checkpoint-06.py")), arg],
                                    cwd=ROOT, capture_output=True, text=True, encoding="utf-8")
            self.assertNotEqual(result.returncode, 0, arg)

    def test_15_assembled_checkpoint_is_deterministic_and_matches_saved_bytes(self):
        outputs = m.assemble()
        for name, data in outputs.items():
            path = m.WS / name
            self.assertTrue(path.is_file(), name)
            self.assertEqual(m.normalize_text_bytes(path.read_bytes()), m.normalize_text_bytes(data), name)
        cumulative = json.loads(outputs["coverage-audit-cumulative.json"])
        summary = json.loads(outputs["validation-summary.json"])
        self.assertEqual(len(cumulative["groups"]), 500)
        self.assertEqual(sum(x["status"] == "ASSESSED" for x in cumulative["groups"]), 417)
        self.assertEqual(sum(x["status"] == "PENDING" for x in cumulative["groups"]), 83)
        self.assertEqual(summary["newBoundaryProposals"], 1)
        self.assertEqual(summary["totalBoundaryProposals"], 8)
        self.assertEqual(summary["totalFieldProposals"], 140)
        self.assertEqual(summary["appliedCorrections"], 0)
        self.assertEqual(summary["legacyV2_2_0TestStatus"], "LEGACY_V2_2_0_RELEASE_TREE_DIAGNOSTIC_UNRESOLVED")

    def test_16_new_checkpoint_text_hashes_are_line_ending_stable(self):
        self.assertEqual(m.normalize_text_bytes(b"alpha\r\nbeta\r\n"), b"alpha\nbeta\n")
        manifest = m.load(m.WS / "manifest.json")
        for name, expected in manifest["sourceHashes"].items():
            self.assertEqual(m.stable_sha(ROOT / "scripts" / name), expected)
        self.assertEqual(m.stable_sha(m.WS / "verification-results.json"), manifest["verificationSha256"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
