#!/usr/bin/env python3
"""Focused regressions for evidence, identity and permission boundaries."""
import copy
import importlib.util
import subprocess
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

SCRIPT = Path(__file__).with_name("phase-2h2a-master-expansion.py")
spec = importlib.util.spec_from_file_location("expansion", SCRIPT)
expansion = importlib.util.module_from_spec(spec)
spec.loader.exec_module(expansion)


class CandidatePreparationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.artifacts, cls.report, cls.fingerprint = expansion.build()
        cls.groups = cls.artifacts["full-master-expansion-candidate-ledger.json"]["groups"]
        cls.by_word = {g["normalizedHeadword"]: g for g in cls.groups}
        cls.pilot = cls.artifacts["pilot-cohort.json"]

    def test_union_exhaustive_no_missing_or_duplicate_groups(self):
        source = expansion.load(expansion.INPUT / "lexical-candidate-groups.json")["groups"]
        self.assertEqual(len(self.groups), 6143)
        self.assertEqual({g["normalizedHeadword"] for g in self.groups}, {g["normalizedHeadword"] for g in source})
        self.assertEqual(len({g["candidateGroupKey"] for g in self.groups}), 6143)

    def test_source_records_guids_hashes_and_structured_groups_traceable(self):
        for corpus, filename, count in [("OXFORD_5000", "oxford-normalized-inventory.json", 5004), ("ENGLISH_VOCAB_4600", "vocab4600-normalized-inventory.json", 4673)]:
            source = expansion.load(expansion.INPUT / filename)["records"]
            refs = [r for g in self.groups for r in g["sourceEvidence"] if r["corpus"] == corpus]
            self.assertEqual(len(refs), count)
            self.assertEqual(len({r["sourceRecordId"] for r in refs}), count)
            for ref in refs:
                row = source[ref["recordIndex"]]
                self.assertEqual(ref["sourceRecordId"], row["sourceRecordId"])
                self.assertEqual(ref["sourceNoteGuid"], row["sourceNoteGuid"])
                self.assertEqual(ref["recordEvidenceSha256"], row["recordEvidenceSha256"])
                self.assertEqual(ref["structuredOxfordSenseGroupOrdinals"], [g["sourceGroupOrdinal"] for g in row["candidateSourceSenseGroups"]])
        self.assertEqual(sum(len(r["structuredOxfordSenseGroupOrdinals"]) for g in self.groups for r in g["sourceEvidence"]), 8092)

    def test_overlap_partition_and_all_review_queue_members(self):
        dims = self.artifacts["candidate-classification-summary.json"]["overlappingDimensions"]
        self.assertEqual(sum(len(g["sourceMembership"]) == 2 for g in self.groups), 3512)
        self.assertEqual(dims["OXFORD_ONLY"], 1489)
        self.assertEqual(dims["VOCAB4600_ONLY"], 1142)
        self.assertEqual(dims["POS_CONFLICT"], 61)
        self.assertEqual(dims["CEFR_CONFLICT"], 96)
        self.assertEqual(dims["POSSIBLE_POLYSEMY"], 2191)
        queue = expansion.load(expansion.INPUT / "sense-review-queue.json")["groups"]
        actual = {g["candidateGroupKey"] for g in self.groups if g["phase2h1ReviewQueueMember"]}
        self.assertEqual(actual, {g["candidateGroupKey"] for g in queue})
        self.assertEqual(len(actual), 4170)

    def test_bank_record_light_run_water_keep_polysemy_unresolved(self):
        for word in ["bank", "record", "light", "run", "water"]:
            group = self.by_word[word]
            self.assertIn("POSSIBLE_POLYSEMY", group["reviewFlags"])
            self.assertIn("SENSE_SPLIT_REVIEW_REQUIRED", group["readinessStates"])
            self.assertEqual(group["senseIdentity"], "UNRESOLVED")
            self.assertGreater(sum(len(r["structuredOxfordSenseGroupOrdinals"]) for r in group["sourceEvidence"]), 1)
            self.assertIn(group["candidateGroupKey"], {g["candidateGroupKey"] for g in self.pilot["groups"]})

    def test_multiword_phrasal_is_retained_without_token_split(self):
        rows = [g for g in self.groups if g["priorityDimensions"]["MULTIWORD_PHRASAL"]]
        self.assertEqual(len(rows), 27)
        self.assertTrue(any(g["normalizedHeadword"] == "a, an" for g in rows))
        self.assertTrue(all(g["candidateGroupKey"] == "NORMALIZED_HEADWORD:" + g["normalizedHeadword"] for g in rows))
        self.assertGreater(self.pilot["overlappingStrataCounts"]["MULTIWORD_PHRASAL"], 0)

    def test_pos_conflict_stays_review_and_has_source_evidence(self):
        rows = [g for g in self.groups if g["priorityDimensions"]["POS_CONFLICT"]]
        self.assertEqual(len(rows), 61)
        self.assertTrue(all("POS_REVIEW_REQUIRED" in g["readinessStates"] for g in rows))
        self.assertTrue(all(r["rawPosEvidencePointer"] for g in rows for r in g["sourceEvidence"]))

    def test_cefr_conflicts_keep_both_sources_no_classification_default(self):
        rows = [g for g in self.groups if g["priorityDimensions"]["CEFR_CONFLICT"]]
        self.assertEqual(len(rows), 96)
        self.assertTrue(all(len(g["sourceMembership"]) == 2 for g in rows))
        for g in rows:
            self.assertIn("CEFR_REVIEW_REQUIRED", g["readinessStates"])
            self.assertGreater(len({v["value"] for r in g["sourceEvidence"] for v in r["cefrEvidence"]}), 1)
            self.assertNotIn("classification", g)

    def test_duplicate_notes_remain_distinct(self):
        it = self.by_word["it"]
        ox = [r for r in it["sourceEvidence"] if r["corpus"] == "OXFORD_5000"]
        self.assertEqual(len(ox), 2)
        self.assertNotEqual(ox[0]["sourceRecordId"], ox[1]["sourceRecordId"])
        self.assertNotEqual(ox[0]["sourceNoteGuid"], ox[1]["sourceNoteGuid"])
        self.assertTrue(it["priorityDimensions"]["SOURCE_DUPLICATES"])

    def test_approved_master_overlap_never_proves_sense_identity(self):
        overlaps = [g for g in self.groups if g["priorityDimensions"]["EXISTING_MASTER_LEMMA"]]
        self.assertEqual(len(overlaps), 87)
        for group in overlaps:
            self.assertEqual(group["masterLemmaCandidates"]["identityClaim"], "NONE")
            self.assertEqual(group["senseIdentity"], "UNRESOLVED")
            self.assertIn("EXISTING_MASTER_IDENTITY_REVIEW", group["readinessStates"])

    def test_all_history_ids_preserved_including_unmatched(self):
        summary = self.artifacts["candidate-classification-summary.json"]["legacyDependencies"]
        self.assertEqual(len(summary["historyProtectedRuntimeIds"]), 75)
        self.assertIn(11, summary["historyProtectedRuntimeIds"])
        self.assertEqual(summary["historyProtectedLinkedRows"] + summary["historyProtectedUnmatchedRows"], 75)
        self.assertEqual(summary["linkedRuntimeRows"] + summary["unmatchedRuntimeRows"], 2018)
        self.assertEqual(summary["linkedRuntimeRows"], 734)
        self.assertEqual(summary["unmatchedRuntimeRows"], 1284)
        self.assertFalse(summary["unmatchedIsInvalid"])
        coverage = expansion.load(expansion.INPUT / "legacy-source-coverage-readonly.json")["rows"]
        for g in self.groups:
            for ref in g["legacyCoverageEvidence"]:
                index = int(ref["phase2h1CoveragePointer"].rsplit("/", 1)[1])
                self.assertEqual(coverage[index]["runtimeVocabularyId"], ref["runtimeVocabularyId"])
                self.assertEqual(coverage[index]["coverageCategory"], ref["phase2h1CoverageCategory"])
        self.assertEqual(sorted(summary["phase2h1CoverageCategoryCounts"].values()), [294, 440, 1284])

    def test_excluded_pairs_and_special_runtime_cases_not_mapped(self):
        review = self.artifacts["lexeme-sense-identity-review.json"]
        by_id = {r["runtimeVocabularyId"]: r for r in review["protectedLegacyCases"]}
        self.assertEqual(by_id[11]["semanticReviewDisposition"], "OWNER_REVIEWED_NOT_SAME_IDENTITY")
        self.assertEqual(by_id[295]["semanticReviewDisposition"], "EXISTING_MASTER_RUNTIME_DUPLICATE")
        self.assertEqual(by_id[849]["semanticReviewDisposition"], "MULTIPLE_MASTER_CANDIDATES")
        self.assertTrue(by_id[11]["ownerReviewedExcludedSenseIds"])
        self.assertTrue(all(r["identityClaim"] == "NONE" for r in by_id.values()))
        self.assertEqual(review["runtime284"]["operation"], "NONE")

    def test_pilot_unique_valid_unresolved_and_representative(self):
        pilot_keys = [g["candidateGroupKey"] for g in self.pilot["groups"]]
        self.assertEqual(len(pilot_keys), len(set(pilot_keys)))
        self.assertEqual(len(pilot_keys), 100)
        self.assertTrue(set(pilot_keys) <= {g["candidateGroupKey"] for g in self.groups})
        owner = self.artifacts["pilot-owner-review.json"]["groups"]
        self.assertEqual({g["candidateGroupKey"] for g in owner}, set(pilot_keys))
        self.assertTrue(all(g["ownerDecision"] == "UNRESOLVED" and not g["materializationEligible"] for g in owner))
        for dimension in ["EXISTING_MASTER_LEMMA", "LEGACY_HISTORY", "OXFORD_ONLY", "VOCAB4600_ONLY", "POS_CONFLICT", "CEFR_CONFLICT", "POSSIBLE_POLYSEMY", "MULTIWORD_PHRASAL"]:
            self.assertGreater(self.pilot["overlappingStrataCounts"][dimension], 0)
        self.assertGreater(next(q["selected"] for q in self.pilot["quotaResults"] if q["stratum"] == "STRAIGHTFORWARD_BOTH_SOURCE"), 0)

    def test_disjoint_processing_and_overlapping_intersections(self):
        summary = self.artifacts["candidate-classification-summary.json"]
        self.assertEqual(sum(summary["disjointProcessingPartition"].values()), 6143)
        self.assertEqual(summary["pairwiseIntersections"]["RIGHTS_GAP + CONTENT_GAP"], 6143)
        self.assertGreater(summary["pairwiseIntersections"]["EXISTING_MASTER_LEMMA + POSSIBLE_POLYSEMY"], 0)

    def test_review_and_authorization_gates_cannot_be_bypassed_by_decision(self):
        blockers = expansion.materialization_blockers(None, "PROPOSE_NEW_LEXEME", identity_proof=True, rights_cleared=True, content_verified=True)
        self.assertEqual(blockers, ["SEPARATE_AUTHORING_AUTHORIZATION_REQUIRED"])
        self.assertIn("OWNER_IDENTITY_DECISION_REQUIRED", expansion.materialization_blockers(None, "APPROVED", authorized=True))
        self.assertTrue(all(not any(a["authorization"].values()) for a in self.artifacts.values()))
        readiness = self.artifacts["authoring-readiness.json"]
        self.assertEqual(readiness["currentlyMaterializableGroups"], 0)
        self.assertEqual(readiness["unresolvedIdentityGroups"], 6143)

    def test_rights_and_original_content_gate(self):
        self.assertIn("RIGHTS_DISPOSITION_REQUIRED", expansion.materialization_blockers(None, "REUSE_EXISTING_IDENTITY_WITH_PROOF", identity_proof=True, content_verified=True, authorized=True))
        self.assertIn("ORIGINAL_CONTENT_AND_PROVENANCE_VERIFICATION_REQUIRED", expansion.materialization_blockers(None, "PROPOSE_NEW_LEXEME", identity_proof=True, rights_cleared=True, authorized=True))
        for g in self.groups:
            self.assertEqual(g["sourceRights"], {"text": "UNKNOWN_REVIEW_REQUIRED", "media": "UNKNOWN_REVIEW_REQUIRED"})
            self.assertEqual(g["masterIdsAllocated"], 0)
            self.assertNotIn("definitions", g)
            self.assertNotIn("examples", g)

    def test_generated_metadata_never_claims_external_pass(self):
        validation = self.artifacts["validation-summary.json"]
        self.assertEqual(validation["statusScope"], "COMPUTED_OFFLINE_PLANNING_CHECKS_ONLY")
        self.assertEqual(validation["externalVerification"]["status"], "NOT_EXECUTED_BY_GENERATOR")
        self.assertNotIn("exitCode", validation["externalVerification"])

    def test_input_drift_rejected(self):
        original = expansion.load
        def drift(path):
            value = original(path)
            if path.name == "lexical-candidate-groups.json":
                value["groups"][0]["normalizedHeadword"] = "unreviewed-drift"
            return value
        with patch.object(expansion, "load", side_effect=drift):
            with self.assertRaisesRegex(ValueError, "input drift"):
                expansion.build()

    def test_approved_sense_mutation_rejected(self):
        original = expansion.load
        def drift(path):
            value = original(path)
            if path.is_relative_to(expansion.RELEASE / "master/senses"):
                value["senseOrder"] += 1
            return value
        with patch.object(expansion, "load", side_effect=drift):
            with self.assertRaisesRegex(ValueError, "Release record hash drift"):
                expansion.build()

    def test_historical_checkpoint_pin_rejected_if_booking_changes(self):
        original = expansion.load
        def drift(path):
            value = original(path)
            if path.name == "content-snapshot.json":
                value["hybridCheckpoint"]["runtime284MappingSenseId"] = "unapproved"
            return value
        with patch.object(expansion, "load", side_effect=drift):
            with self.assertRaisesRegex(ValueError, "Legacy snapshot drift"):
                expansion.build()

    def test_fingerprint_and_offline_replay_without_commands_or_writes(self):
        with patch("subprocess.run", side_effect=AssertionError("external execution")), patch.object(Path, "write_text", side_effect=AssertionError("unexpected write")):
            result = expansion.run(check=True)
        self.assertEqual(result["fingerprint"], self.fingerprint)
        self.assertEqual(result["artifactComparison"], "PASS")
        self.assertEqual(self.fingerprint, expansion.load(expansion.WORKSPACE / "manifest.json")["fingerprint"])
        changed = copy.deepcopy(self.artifacts)
        changed.pop("manifest.json")
        before = expansion.digest(changed)
        changed["pilot-owner-review.json"]["groups"][0]["ownerDecision"] = "PROPOSE_NEW_LEXEME"
        self.assertNotEqual(before, expansion.digest(changed))

    def test_mutation_cli_arguments_rejected(self):
        for flag in ["--apply", "--production", "--delete", "--approve", "--author"]:
            result = subprocess.run([sys.executable, "-B", str(SCRIPT), flag], capture_output=True)
            self.assertEqual(result.returncode, 2)


if __name__ == "__main__":
    unittest.main(verbosity=2)
