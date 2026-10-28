import importlib.util
import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/map-english-vocabulary-4600-media-v2.py"
spec = importlib.util.spec_from_file_location("media4600", SCRIPT)
media4600 = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(media4600)


class Media4600MappingTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.bundle, cls.rights, cls.plan = media4600.map_bundle()

    def test_current_5616_target_and_snapshot_integrity(self):
        self.assertEqual(self.bundle["target"]["effectiveSenseCount"], 5616)
        self.assertEqual(self.bundle["target"]["currentEffectiveProjectionCount"], 5616)
        self.assertEqual(self.bundle["target"]["identityCount"], 7451)
        self.assertEqual(self.bundle["target"]["projectId"], "shy-hill-72364426")
        self.assertEqual(self.bundle["target"]["branchId"], "br-square-grass-b3af0nte")
        self.assertEqual(self.bundle["target"]["candidateVersionHistoryRowsMissing"], 573)
        self.assertEqual(self.bundle["source"]["sourceId"], "ENGLISH_VOCAB_4600")
        self.assertNotIn("2000", json.dumps(self.bundle["source"]))

    def test_source_manifest_and_media_hash_preservation(self):
        manifest = media4600.read_json(media4600.MANIFEST_PATH)
        asset_hashes = {row["media_sha256"] for row in manifest["assets"]}
        mapping_hashes = {row["mediaSha256"] for row in self.bundle["mappings"]}
        self.assertEqual(len(asset_hashes), 13977)
        self.assertTrue(mapping_hashes.issubset(asset_hashes))
        self.assertEqual(len({row["mappingKey"] for row in self.bundle["mappings"]}), 14012)
        self.assertEqual(self.bundle["counts"]["sourcePhysicalAssets"], 13977)
        self.assertEqual(self.bundle["counts"]["sourceReferenceMappings"], 14012)

    def test_lexeme_and_semantic_sense_mapping_require_evidence(self):
        rows = self.bundle["mappings"]
        word = [row for row in rows if row["mediaKind"] == "WORD_PRONUNCIATION_AUDIO"]
        images = [row for row in rows if row["mediaKind"] == "ILLUSTRATION_IMAGE"]
        matched_words = [row for row in word if row["targetLexemeIdentity"]]
        proposed_images = [row for row in images if row["targetSenseProposalKey"]]
        self.assertGreater(len(matched_words), 0)
        self.assertTrue(all(row["mappingEvidence"]["sourceNoteIdentityVerified"] for row in matched_words))
        self.assertTrue(all(row["mappingEvidence"]["pronunciationEvidence"] == "SOURCE_NOTE_FIELD_SOUND_AND_IPA" for row in matched_words))
        self.assertTrue(all(row["mappingStatus"] == "PROPOSED_SENSE_SOURCE_MEANING_MATCH_REQUIRES_VISUAL_REVIEW" for row in proposed_images))
        self.assertTrue(all(row["targetContentFingerprint"] for row in proposed_images))
        self.assertTrue(all(row["mappingEvidence"]["semanticComparison"]["visualReview"] == "NOT_PERFORMED" for row in proposed_images))

    def test_example_audio_requires_exact_text(self):
        source = {"sourceFields": {"Example": "<b>They agree.</b>"}}
        target_sense = {
            "proposalKey": "p1",
            "content": {"examples": [{"en": "They agree.", "exampleKey": "p1:example-1"}]},
            "contentHash": "a" * 64,
        }
        matched, reason = media4600.exact_candidate([source], [target_sense])
        self.assertEqual(reason, "EXACT_TEXT_MATCH")
        self.assertEqual(matched["sense"]["proposalKey"], "p1")
        mismatch, reason = media4600.exact_candidate(
            [{"sourceFields": {"Example": "They agree."}}],
            [{"proposalKey": "p2", "content": {"examples": [{"en": "They agreed."}]}}],
        )
        self.assertIsNone(mismatch)
        self.assertEqual(reason, "EXAMPLE_TEXT_MISMATCH")
        self.assertEqual(self.bundle["counts"]["matchedExampleAudioRowsExactText"], 0)

    def test_rights_gate_and_cloudinary_offline_plan(self):
        self.assertEqual(self.rights["counts"]["UNKNOWN_REVIEW_REQUIRED"], 13977)
        self.assertEqual(self.rights["counts"]["CLEARED_FOR_INTENDED_USE"], 0)
        self.assertTrue(all(row["rightsStatus"] == "UNKNOWN_REVIEW_REQUIRED" for row in self.rights["assets"]))
        self.assertTrue(all(row["uploadEligible"] is False for row in self.rights["assets"]))
        self.assertEqual(self.plan["mode"], "OFFLINE_PLAN_ONLY")
        self.assertEqual(self.plan["eligibleAssets"], 0)
        self.assertEqual(self.plan["networkRequestsMade"], 0)

    def test_sense_links_only_reference_effective_proposals(self):
        snapshot = media4600.read_json(media4600.SNAPSHOT_PATH)
        effective = {row["proposalKey"] for row in snapshot["effectiveSenses"]}
        pending = {row["proposalKey"] for row in snapshot["nonEffectiveIdentities"]}
        for row in self.bundle["mappings"]:
            proposal = row["targetSenseProposalKey"]
            if proposal is not None:
                self.assertIn(proposal, effective)
                self.assertNotIn(proposal, pending)
            if row["mappingStatus"] == "SOURCE_CANDIDATE_PENDING_TARGET_SELECTION":
                self.assertIsNone(proposal)
            if row["mappingStatus"].startswith("UNRESOLVED_EXAMPLE"):
                self.assertIsNone(proposal)

    def test_deterministic_rebuild(self):
        again_bundle, again_rights, again_plan = media4600.map_bundle()
        self.assertEqual(media4600.pretty_json(self.bundle), media4600.pretty_json(again_bundle))
        self.assertEqual(media4600.pretty_json(self.rights), media4600.pretty_json(again_rights))
        self.assertEqual(media4600.pretty_json(self.plan), media4600.pretty_json(again_plan))


if __name__ == "__main__":
    unittest.main(verbosity=2)
