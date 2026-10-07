"""Focused tests for the offline Phase 2H.1 corpus inventory."""
import importlib.util
import json
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/phase-2h1-source-inventory.py"
WORKSPACE = ROOT / "vocabflow-dataset/workspaces/full-source-inventory-dedupe"
spec = importlib.util.spec_from_file_location("phase_2h1_source_inventory", SCRIPT)
inventory = importlib.util.module_from_spec(spec)
assert spec and spec.loader
sys.modules[spec.name] = inventory
spec.loader.exec_module(inventory)


def read_artifact(name):
    return json.loads((WORKSPACE / name).read_text(encoding="utf-8"))


class NormalizationTests(unittest.TestCase):
    def test_unicode_case_whitespace_markup_and_preservation_policy(self):
        self.assertEqual(inventory.normalize_headword("  E\u0301COLE\t  primaire "), "école primaire")
        self.assertEqual(inventory.normalize_headword("<i>Ice</i>\n Cream"), "ice cream")
        self.assertEqual(inventory.normalize_headword("Straße"), "strasse")
        self.assertEqual(inventory.normalize_headword("Can't"), "can't")
        self.assertEqual(inventory.normalize_headword("can’t"), "can’t")
        self.assertNotEqual(inventory.normalize_headword("can't"), inventory.normalize_headword("cant"))
        self.assertNotEqual(inventory.normalize_headword("ice-cream"), inventory.normalize_headword("ice cream"))
        self.assertEqual(inventory.normalize_headword("take off"), "take off")
        self.assertEqual(inventory.normalize_headword("take offs"), "take offs")
        self.assertNotEqual(inventory.normalize_headword("take off"), inventory.normalize_headword("take offs"))
        self.assertNotEqual(inventory.normalize_headword("light (adj.)"), inventory.normalize_headword("light"))

    def test_punctuation_key_is_only_a_review_signal(self):
        self.assertNotEqual(inventory.normalize_headword("ice-cream"), inventory.normalize_headword("ice cream"))
        self.assertEqual(inventory.punctuation_comparison_key(inventory.normalize_headword("ice-cream")),
                         inventory.punctuation_comparison_key(inventory.normalize_headword("ice cream")))
        collision = inventory.normalization_collision_groups([
            {"sourceId": "fixture", "sourceRecordId": "1", "normalizedHeadword": "ice-cream"},
            {"sourceId": "fixture", "sourceRecordId": "2", "normalizedHeadword": "ice cream"},
        ])
        self.assertEqual(len(collision), 1)
        self.assertFalse(collision[0]["comparisonIsIdentity"])

    def test_safe_pos_aliases_do_not_create_false_conflicts(self):
        self.assertEqual(inventory.pos_classes(["n."]), ["NOUN"])
        self.assertEqual(inventory.pos_classes(["noun"]), ["NOUN"])
        self.assertEqual(inventory.pos_classes(["adj"]), ["ADJECTIVE"])
        self.assertEqual(inventory.pos_classes(["adjective"]), ["ADJECTIVE"])
        self.assertEqual(inventory.pos_classes(["infinitive marker"]), [])


class FullCorpusTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = read_artifact("source-inventory.json")
        cls.oxford = read_artifact("oxford-normalized-inventory.json")
        cls.vocab = read_artifact("vocab4600-normalized-inventory.json")
        cls.cross = read_artifact("cross-source-overlap.json")
        cls.candidates = read_artifact("lexical-candidate-groups.json")
        cls.queue = read_artifact("sense-review-queue.json")
        cls.duplicates = read_artifact("duplicate-headword-groups.json")
        cls.master = read_artifact("master-coverage-readonly.json")
        cls.legacy = read_artifact("legacy-source-coverage-readonly.json")
        cls.validation = read_artifact("validation-summary.json")
        cls.manifest = read_artifact("manifest.json")

    def test_source_counts_duplicates_and_overlap_are_exact_and_exhaustive(self):
        ox = self.oxford["statistics"]
        vocab = self.vocab["statistics"]
        cross = self.cross["summary"]
        self.assertEqual((ox["rawNoteRecords"], ox["uniqueNormalizedHeadwords"], ox["duplicateNormalizedHeadwordGroups"]), (5004, 5001, 3))
        self.assertEqual((vocab["rawNoteRecords"], vocab["uniqueNormalizedHeadwords"], vocab["duplicateNormalizedHeadwordGroups"]), (4673, 4654, 19))
        self.assertEqual(cross["exactNormalizedHeadwordOverlap"], 3512)
        self.assertEqual(cross["oxfordOnlyNormalizedHeadwords"], 1489)
        self.assertEqual(cross["vocab4600OnlyNormalizedHeadwords"], 1142)
        self.assertEqual(cross["unionUniqueNormalizedHeadwords"], 6143)
        self.assertEqual(cross["exactNormalizedHeadwordOverlap"] + cross["oxfordOnlyNormalizedHeadwords"], 5001)
        self.assertEqual(cross["exactNormalizedHeadwordOverlap"] + cross["vocab4600OnlyNormalizedHeadwords"], 4654)
        self.assertEqual(len(set(self.cross["normalizedHeadwordOverlap"])), 3512)
        self.assertEqual(cross["posConflictHeadwordGroups"], 61)
        self.assertEqual(cross["cefrConflictHeadwordGroups"], 96)
        self.assertGreater(cross["possiblePolysemyGroupCount"], 0)
        self.assertGreater(cross["definitionContentConflictGroupCount"], 0)

    def test_no_source_record_or_field_loses_its_provenance(self):
        for corpus in (self.oxford, self.vocab):
            records = corpus["records"]
            self.assertEqual(len(records), corpus["statistics"]["rawNoteRecords"])
            self.assertEqual(len({row["sourceRecordId"] for row in records}), len(records))
            self.assertTrue(all(row["sourceNoteGuid"] and row["sourceModelId"] and row["sourceFields"] for row in records))
            self.assertTrue(all(row["rawHeadword"] == row["sourceFields"].get("Word", "") for row in records))
            for row in records:
                self.assertEqual(row["normalizedHeadword"], inventory.normalize_headword(row["rawHeadword"]))
                self.assertEqual(row["recordEvidenceSha256"], inventory.sha256_bytes(inventory.canonical_bytes({k: v for k, v in row.items() if k != "recordEvidenceSha256"})))
        self.assertEqual(self.source["sources"]["OXFORD_5000"]["recordsWithUnmappedRawFields"], 0)
        self.assertEqual(self.source["sources"]["ENGLISH_VOCAB_4600"]["recordsWithUnmappedRawFields"], 0)
        for dataset in (self.oxford, self.vocab):
            cards = [card["sourceCardId"] for row in dataset["records"] for card in row["sourceCards"]]
            self.assertEqual(len(cards), len(set(cards)))

    def test_source_sense_structures_and_ambiguity_remain_review_only(self):
        self.assertEqual(self.oxford["statistics"]["structuredSenseGroupCount"], 8092)
        self.assertEqual(self.vocab["statistics"]["structuredSenseGroupCount"], 0)
        self.assertEqual(sum(len(row["candidateSourceSenseGroups"]) for row in self.oxford["records"]), 8092)
        self.assertTrue(all(group["vocabFlowSenseId"] is None and group["identityStatus"] == "SOURCE_GROUP_ONLY_SENSE_IDENTITY_UNRESOLVED"
                            for row in self.oxford["records"] for group in row["candidateSourceSenseGroups"]))
        self.assertEqual(self.oxford["statistics"]["recordsWithExplicitEnglishDefinitionField"], 0)
        self.assertEqual(self.vocab["statistics"]["recordsWithHeuristicEnglishDefinitionSegments"], 4664)
        groups = self.candidates["groups"]
        light = next(row for row in groups if row["normalizedHeadword"] == "light")
        self.assertTrue(light["normalizedHeadwordMatch"])
        self.assertTrue(light["oxfordSourceRecordIds"] and light["vocab4600SourceRecordIds"])
        self.assertEqual(light["candidateSenseMatchStatus"], "UNRESOLVED_REQUIRES_HUMAN_REVIEW")
        self.assertFalse(light["masterOrRuntimeIdentityAsserted"])
        reasons = {reason for row in self.queue["groups"] for reason in row["reviewReasons"]}
        for category in ("MULTIPLE_RECORDS_SAME_SOURCE", "POS_CONFLICT", "POSSIBLE_POLYSEMY", "MULTIWORD_OR_PHRASAL_VERB",
                         "NORMALIZATION_COLLISION", "DEFINITION_CONTENT_CONFLICT_REVIEW", "SOURCE_ONLY_CONTENT", "HUMAN_SENSE_REVIEW_REQUIRED"):
            self.assertTrue(category in reasons or (category == "NORMALIZATION_COLLISION" and
                self.oxford["statistics"]["normalizationCollisionGroupCount"] == self.vocab["statistics"]["normalizationCollisionGroupCount"] == 0))
        self.assertEqual(self.duplicates["perSource"]["OXFORD_5000"], self.oxford["statistics"]["repeatHeadwordGroups"])

    def test_master_and_legacy_comparison_are_read_only(self):
        self.assertEqual(self.master["release"]["releaseHash"], "44874b11d1fdef76a515f6285d04c9a417318daa6969e112608a59e7c232613c")
        self.assertEqual(self.master["coverageCategoryCounts"]["APPROVED_MASTER_LEXEME_SAME_NORMALIZED_LEMMA_SENSE_UNCERTAIN"], 87)
        self.assertTrue(all(row["senseIdentity"].startswith("UNCERTAIN") for row in self.master["sourceNormalizedHeadwordGroups"] if row["masterLexemeIdCandidate"]))
        self.assertTrue(self.master["noMasterIdAllocated"])
        self.assertTrue(self.master["noRuntimeMappingCreated"])
        self.assertEqual(self.legacy["legacyRows"], 2018)
        self.assertEqual(sum(self.legacy["coverageCategoryCounts"].values()), 2018)
        self.assertTrue(all(not row["candidateSenseMatch"] and not row["runtimeMappingCreated"] for row in self.legacy["rows"]))

    def test_rights_are_unknown_and_media_are_only_referenced(self):
        rights = read_artifact("provenance-rights-inventory.json")
        self.assertEqual(rights["status"], "UNKNOWN_REVIEW_REQUIRED")
        self.assertTrue(all(row["textRights"] == row["mediaRights"] == "UNKNOWN_REVIEW_REQUIRED" for row in rights["perSource"].values()))
        self.assertTrue(all(row["mediaHandling"].startswith("References") for row in rights["perSource"].values()))
        self.assertEqual(self.source["sources"]["ENGLISH_VOCAB_4600"]["mediaIndexRecordCount"], 13986)
        self.assertEqual(self.source["sources"]["ENGLISH_VOCAB_4600"]["mediaIndexMissingArchiveEntries"], 0)

    def test_safety_checks_and_accepted_fingerprints(self):
        checks = self.validation["checks"]
        self.assertEqual(self.validation["status"], "PASS")
        self.assertEqual(checks["phase2g3cAcceptedPlanningFingerprint"], "d60ea07432633de6ab4bb0516ce9401252c6d03982c77710f0b2a71c0968ac09")
        self.assertEqual(checks["phase2g3cSemanticFingerprint"], "5115d7021d7a66466fe87ded8ae49f24ceb399edf1e1c9981b990f3443acdfea")
        self.assertEqual(checks["phase2g3cRetirementFingerprint"], "04feaa380fa441633ef8a4c84b8d0e5a5aee48d03a7a5ff020866c789eb8cdd1")
        self.assertEqual(self.manifest["acceptedHybrid100"]["releaseHash"], checks["masterReleaseApprovedAndHashPinned"] and "44874b11d1fdef76a515f6285d04c9a417318daa6969e112608a59e7c232613c")
        self.assertFalse(any(self.manifest["authorization"].values()))
        self.assertEqual(checks["databaseAccess"], checks["databaseMutation"], "NONE")
        self.assertEqual(checks["production"], "UNTOUCHED")

    def test_fingerprint_is_deterministic_and_sensitive_to_source_evidence(self):
        blank = {name: {} for name in inventory.ARTIFACT_NAMES}
        blank["oxford-normalized-inventory.json"] = {"records": [{"rawHeadword": "water"}]}
        original = inventory.inventory_fingerprint(blank)
        replay = inventory.inventory_fingerprint(json.loads(json.dumps(blank)))
        self.assertEqual(original, replay)
        changed = json.loads(json.dumps(blank))
        changed["oxford-normalized-inventory.json"]["records"][0]["rawHeadword"] = "Water!"
        self.assertNotEqual(original, inventory.inventory_fingerprint(changed))
        self.assertNotIn("timestamp", inventory.canonical_bytes(blank).decode("utf-8").casefold())

    def test_cli_rejects_mutation_arguments_and_offline_replay_matches(self):
        for flag in ("--apply", "--delete", "--disable", "--migrate", "--production"):
            rejected = subprocess.run([sys.executable, str(SCRIPT), flag], cwd=ROOT, text=True, capture_output=True, check=False)
            self.assertEqual(rejected.returncode, 2)
            self.assertIn('"databaseAccess": "NONE"', rejected.stdout)
        replay = subprocess.run([sys.executable, str(SCRIPT), "--check"], cwd=ROOT, text=True, capture_output=True, check=False)
        self.assertEqual(replay.returncode, 0, replay.stdout + replay.stderr)
        result = json.loads(replay.stdout)
        self.assertEqual(result["status"], "PASS")
        self.assertEqual(result["fingerprint"], self.manifest["acceptedInventoryFingerprint"])
        self.assertEqual(result["databaseAccess"], "NONE")
        self.assertEqual(result["production"], "UNTOUCHED")


if __name__ == "__main__":
    unittest.main(verbosity=2)
