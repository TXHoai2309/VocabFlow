from __future__ import annotations

import importlib.util
import json
import sqlite3
import tempfile
import unittest
import zipfile
from pathlib import Path


SCRIPT = Path(__file__).with_name("master-vocabulary-v2-hybrid-source-proof.py")
SPEC = importlib.util.spec_from_file_location("hybrid_source_proof", SCRIPT)
assert SPEC and SPEC.loader
proof = importlib.util.module_from_spec(SPEC)
import sys
sys.modules[SPEC.name] = proof
SPEC.loader.exec_module(proof)


def make_apkg(
    root: Path,
    fields: list[str],
    notes: list[dict[str, str]],
    media: dict[str, tuple[str, bytes]] | None = None,
    name: str = "fixture.apkg",
) -> Path:
    media = media or {}
    database = sqlite3.connect(":memory:")
    database.execute("CREATE TABLE col (id INTEGER PRIMARY KEY, models TEXT)")
    database.execute("CREATE TABLE notes (id INTEGER PRIMARY KEY, guid TEXT, mid INTEGER, flds TEXT)")
    database.execute("CREATE TABLE cards (id INTEGER PRIMARY KEY, nid INTEGER)")
    model = {"1": {"id": 1, "name": "Synthetic English", "flds": [{"name": field} for field in fields]}}
    database.execute("INSERT INTO col (id, models) VALUES (1, ?)", (json.dumps(model),))
    for index, note in enumerate(notes, start=1):
        values = [note.get(field, "") for field in fields]
        database.execute("INSERT INTO notes VALUES (?, ?, 1, ?)", (index, f"guid-{index}", "\x1f".join(values)))
        database.execute("INSERT INTO cards VALUES (?, ?)", (index, index))
    database_bytes = database.serialize()
    database.close()

    path = root / name
    with zipfile.ZipFile(path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("collection.anki21", database_bytes)
        archive.writestr("media", json.dumps({key: filename for key, (filename, _) in media.items()}))
        for key, (_, content) in media.items():
            archive.writestr(key, content)
    return path


class HybridSourceProofTests(unittest.TestCase):
    def test_synthetic_apkg_parses_notes_models_cards_media_map_and_signatures(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            path = make_apkg(
                root,
                ["Word", "PoS", "Image"],
                [
                    {"Word": "<b>Bank</b>", "PoS": "noun", "Image": '<img src="[sound:pic.png]">'},
                    {"Word": "bank", "PoS": "noun"},
                ],
                {"0": ("pic.png", b"\x89PNG\r\n\x1a\nfixture")},
            )
            result = proof.extract_apkg(path, "fixture")
            summary = result["summary"]
            self.assertEqual(summary["collectionDatabaseFilename"], "collection.anki21")
            self.assertEqual(summary["noteCount"], 2)
            self.assertEqual(summary["cardCount"], 2)
            self.assertEqual(summary["modelNames"], ["Synthetic English"])
            self.assertEqual(summary["normalizedUniqueHeadwordCount"], 1)
            self.assertEqual(summary["duplicateNormalizedHeadwordGroups"], 1)
            self.assertEqual(result["mediaMap"], {"0": "pic.png"})
            self.assertEqual(summary["mediaMapResolvedMemberCount"], 1)
            self.assertEqual(summary["mediaMapMissingMemberCount"], 0)
            self.assertEqual(summary["actualImageMemberCount"], 1)
            self.assertEqual(result["records"][0]["fields"]["PoS"], "noun")

    def test_normalization_and_html_cleanup_preserve_lemma_punctuation(self) -> None:
        self.assertEqual(proof.normalize_lemma("  Ｃan’t <b>STOP</b> &amp; go  "), "can’t stop & go")
        self.assertEqual(proof.html_to_text("<p>one&nbsp;two</p><script>secret</script>"), "one two")

    def test_oxford_structured_senses_remain_separate(self) -> None:
        record = {
            "fields": {
                "Word": "bank",
                "Example Data": json.dumps([
                    {"meaning_vi": "ngân hàng", "pos": "noun", "examples": ["She went to the bank."]},
                    {"meaning_vi": "bờ sông", "pos": "noun", "examples": ["They sat on the bank."]},
                ]),
            }
        }
        groups = proof._sense_groups(record)
        self.assertEqual(len(groups), 2)
        self.assertNotEqual(groups[0]["groupKey"], groups[1]["groupKey"])
        self.assertTrue(all(group["structured"] for group in groups))

    def test_one_4600_note_is_not_broadcast_across_polysemous_senses(self) -> None:
        candidates = [
            {"candidateId": "C1", "lexemeCandidateId": "L1", "normalizedLemma": "bank", "sourcePosCodes": ["NOUN"], "_meaningRaw": "ngân hàng", "_examplesRaw": [], "qaFlags": []},
            {"candidateId": "C2", "lexemeCandidateId": "L1", "normalizedLemma": "bank", "sourcePosCodes": ["NOUN"], "_meaningRaw": "bờ sông", "_examplesRaw": [], "qaFlags": []},
        ]
        note = {
            "sourceNoteReference": "N1", "normalizedLemma": "bank", "posCodes": ["NOUN"],
            "meaning": "a financial institution or land beside a river", "example": "",
            "fieldHashes": {}, "_package": {"summary": {"source": {"sha256": "a" * 64}}},
        }
        result = proof._align_4600(candidates, [note])
        self.assertEqual(sum(candidate.get("_alignedNote") is not None for candidate in candidates), 0)
        self.assertTrue(all(candidate["alignmentStatus"] == "AMBIGUOUS" for candidate in candidates))
        self.assertEqual(result["crosswalkNotes"][0]["alignmentStatus"], "AMBIGUOUS")

    def test_pos_mismatch_is_ambiguous_and_flagged(self) -> None:
        candidate = {
            "candidateId": "C1", "lexemeCandidateId": "L1", "normalizedLemma": "record",
            "sourcePosCodes": ["NOUN"], "_meaningRaw": "a written account", "_examplesRaw": [], "qaFlags": [],
        }
        note = {
            "sourceNoteReference": "N1", "normalizedLemma": "record", "posCodes": ["VERB"],
            "meaning": "to capture sound", "example": "", "fieldHashes": {},
            "_package": {"summary": {"source": {"sha256": "b" * 64}}},
        }
        proof._align_4600([candidate], [note])
        self.assertEqual(candidate["alignmentStatus"], "AMBIGUOUS")
        self.assertIn("POS_CONFLICT", candidate["qaFlags"])

    def test_master_lemma_match_alone_does_not_claim_existing_sense(self) -> None:
        candidate = {
            "normalizedLemma": "bank", "lexicalUnitType": "WORD", "partOfSpeechCode": "NOUN",
            "_meaningRaw": "bờ sông", "qaFlags": [],
        }
        master = [{
            "masterSenseId": "SENSE-1", "masterLexemeId": "LEXEME-1", "partOfSpeechCode": "NOUN",
            "_lexeme": {"lexicalUnitType": "WORD"},
            "translations": [{"language": "vi", "text": "tổ chức tài chính"}],
            "senseLabel": [],
        }]
        proof._master_audit(candidate, {"bank": master})
        self.assertEqual(candidate["existingMasterStatus"], "EXISTING_LEXEME_NEW_SENSE_CANDIDATE")
        self.assertNotIn("existingMasterSenseId", candidate)

    def test_existing_sense_requires_semantic_and_pos_compatibility(self) -> None:
        master = [{
            "masterSenseId": "SENSE-1", "masterLexemeId": "LEXEME-1", "partOfSpeechCode": "NOUN",
            "_lexeme": {"lexicalUnitType": "WORD"},
            "translations": [],
            "senseLabel": [{"language": "vi", "text": "ngân hàng"}],
        }]
        compatible = {
            "normalizedLemma": "bank", "lexicalUnitType": "WORD", "partOfSpeechCode": "NOUN",
            "_meaningRaw": "ngân hàng", "qaFlags": [],
        }
        proof._master_audit(compatible, {"bank": master})
        self.assertEqual(compatible["existingMasterStatus"], "EXISTING_SENSE_CANDIDATE")
        self.assertEqual(compatible["existingMasterSenseId"], "SENSE-1")

        pos_mismatch = compatible | {"partOfSpeechCode": "VERB", "qaFlags": []}
        pos_mismatch.pop("existingMasterStatus", None)
        pos_mismatch.pop("existingMasterSenseId", None)
        proof._master_audit(pos_mismatch, {"bank": master})
        self.assertEqual(pos_mismatch["existingMasterStatus"], "EXISTING_LEXEME_NEW_SENSE_CANDIDATE")
        self.assertNotIn("existingMasterSenseId", pos_mismatch)

    def test_segmentation_status_requires_structured_group_evidence(self) -> None:
        structured = {
            "sourceCoverage": "OXFORD_ONLY", "_structuredGroup": True,
            "oxfordReference": {"sourceSenseGroupReference": "SAFE-REFERENCE"},
        }
        fallback = {
            "sourceCoverage": "OXFORD_ONLY", "_structuredGroup": False,
            "oxfordReference": {"sourceSenseGroupReference": "GENERATED-REFERENCE"},
        }
        reference_only = {
            "sourceCoverage": "OXFORD_ONLY",
            "oxfordReference": {"sourceSenseGroupReference": "GENERATED-REFERENCE"},
        }
        self.assertEqual(proof._sense_segmentation_status(structured), "STRUCTURED")
        self.assertEqual(proof._sense_segmentation_status(fallback), "NOTE_LEVEL_FALLBACK")
        self.assertEqual(proof._sense_segmentation_status(reference_only), "NOTE_LEVEL_FALLBACK")
        self.assertEqual(proof._sanitize_candidate(structured)["senseSegmentationStatus"], "STRUCTURED")
        self.assertEqual(proof._sanitize_candidate(fallback)["senseSegmentationStatus"], "NOTE_LEVEL_FALLBACK")

    def test_fallback_replacement_is_deterministic_and_preserves_selection_cell(self) -> None:
        fallback = {
            "candidateId": "FALLBACK", "lexemeCandidateId": "LF", "sourceBucket": "OXFORD_PLUS_4600",
            "selectedCefr": "A1", "partOfSpeechCode": "PRONOUN", "existingMasterStatus": "NO_EXISTING_LEXEME",
            "lexicalUnitType": "WORD", "_structuredGroup": False,
        }
        replacement = {
            "candidateId": "STRUCTURED", "lexemeCandidateId": "LS", "sourceBucket": "OXFORD_PLUS_4600",
            "selectedCefr": "A1", "partOfSpeechCode": "PREPOSITION", "existingMasterStatus": "NO_EXISTING_LEXEME",
            "lexicalUnitType": "WORD", "_structuredGroup": True,
        }
        wrong_cell = replacement | {"candidateId": "WRONG-CELL", "lexemeCandidateId": "LW", "sourceBucket": "OXFORD_ONLY"}
        first, audit = proof._replace_note_level_fallbacks([fallback], [fallback, replacement, wrong_cell], "test-seed")
        second, second_audit = proof._replace_note_level_fallbacks([fallback], [fallback, replacement, wrong_cell], "test-seed")
        self.assertEqual([row["candidateId"] for row in first], ["STRUCTURED"])
        self.assertEqual(first, second)
        self.assertEqual(audit, second_audit)
        self.assertEqual(audit[0]["sourceBucket"], "OXFORD_PLUS_4600")
        self.assertEqual(audit[0]["selectedCefr"], "A1")
        self.assertTrue(audit[0]["posDistributionPreserved"])
        self.assertTrue(audit[0]["polysemyMembershipPreserved"])

    def test_editorial_readiness_requires_every_non_rights_gate(self) -> None:
        ready = {
            "sourceFilesVerified": True, "apkgParsingVerified": True, "sampleExactly100Senses": True,
            "senseSegmentationVerified": True, "polysemyGuardVerified": True, "mediaTargetGuardVerified": True,
            "existingMasterDedupAudited": True, "selectionCoverageVerified": True, "proofDeterministic": True,
            "rawSourceContentCommitted": False, "masterIdsAllocated": 0, "canonicalMasterMutated": False,
            "databaseWrites": 0, "sourceRightsVerified": False, "mediaReuseEligible": False,
        }
        proof._refresh_readiness_flags(ready)
        self.assertTrue(ready["editorialAuthoringReady"])
        self.assertTrue(ready["phase2f1aReady"])
        self.assertFalse(ready["sourceReuseEligible"])

        for gate in ("senseSegmentationVerified", "polysemyGuardVerified", "mediaTargetGuardVerified", "existingMasterDedupAudited"):
            with self.subTest(gate=gate):
                failed = ready | {gate: False}
                proof._refresh_readiness_flags(failed)
                self.assertFalse(failed["editorialAuthoringReady"])
                self.assertFalse(failed["phase2f1aReady"])

    def test_source_reuse_requires_verified_rights(self) -> None:
        unknown = {"sourceRightsVerified": False, "mediaReuseEligible": False}
        self.assertFalse(proof._source_reuse_eligible(unknown))
        unknown["sourceRightsVerified"] = True
        self.assertFalse(proof._source_reuse_eligible(unknown))
        unknown["mediaReuseEligible"] = True
        self.assertTrue(proof._source_reuse_eligible(unknown))

    def test_media_targets_are_typed_and_image_is_not_broadcast(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            media = {
                "0": ("sense.png", b"\x89PNG\r\n\x1a\nimage"),
                "1": ("word.mp3", b"ID3word"),
                "2": ("example.mp3", b"ID3example"),
            }
            path = make_apkg(root, ["Word"], [{"Word": "record"}], media)
            note = {
                "sourceNoteReference": "NOTE-A", "imageRefs": ["sense.png"],
                "wordAudioRefs": ["word.mp3"], "exampleAudioRefs": ["example.mp3"],
                "fieldHashes": {"Example": "d" * 64}, "example": "An example line.",
            }
            first = {
                "candidateId": "S1", "lexemeCandidateId": "L1", "normalizedLemma": "record",
                "alignmentStatus": "ALIGNED", "sourceCoverage": "OXFORD_PLUS_4600",
                "vocab4600Reference": {"sourceNoteReference": "NOTE-A"}, "_alignedNote": note,
                "imageCandidateStatus": "NOT_PRESENT", "wordAudioCandidateStatus": "NOT_PRESENT",
                "exampleAudioCandidateStatus": "NOT_PRESENT", "partOfSpeechCode": "NOUN",
                "sourcePosCodes": ["NOUN"], "cefrEvidence": ["B1"], "rightsStatus": "UNKNOWN_UNVERIFIED",
                "shipEligible": False, "qaFlags": [], "lexicalUnitType": "WORD",
            }
            second = {
                "candidateId": "S2", "lexemeCandidateId": "L1", "normalizedLemma": "record",
                "alignmentStatus": "AMBIGUOUS", "sourceCoverage": "OXFORD_PLUS_4600",
                "vocab4600Reference": None, "_alignedNote": None,
                "imageCandidateStatus": "NOT_PRESENT", "wordAudioCandidateStatus": "NOT_PRESENT",
                "exampleAudioCandidateStatus": "NOT_PRESENT", "partOfSpeechCode": "VERB",
                "sourcePosCodes": ["VERB"], "cefrEvidence": ["B1"], "rightsStatus": "UNKNOWN_UNVERIFIED",
                "shipEligible": False, "qaFlags": [], "lexicalUnitType": "WORD",
            }
            package = {
                "path": path, "mediaMap": {key: filename for key, (filename, _) in media.items()},
                "summary": {"source": {"sha256": "c" * 64}},
            }
            selected, report = proof._attach_selected_media([first, second], {}, package)
            image = next(item for item in report["mediaCandidates"] if item["roles"][0]["kind"] == "IMAGE")
            self.assertEqual([role["targetCandidateId"] for role in image["roles"]], ["S1"])
            self.assertEqual(image["rightsStatus"], "UNKNOWN_UNVERIFIED")
            self.assertFalse(image["shipEligible"])
            self.assertEqual(image["sizeBytes"], len(media["0"][1]))
            self.assertEqual(image["declaredType"], ".png")
            self.assertEqual(image["detectedType"], "image/png")
            self.assertEqual(len(image["sha256"]), 64)
            word_audio = next(item for item in report["mediaCandidates"] if any(role["kind"] == "WORD_AUDIO" for role in item["roles"]))
            self.assertEqual(word_audio["roles"][0]["targetType"], "UNRESOLVED")
            self.assertIsNone(word_audio["roles"][0]["targetCandidateId"])
            example_audio = next(item for item in report["mediaCandidates"] if any(role["kind"] == "EXAMPLE_AUDIO" for role in item["roles"]))
            self.assertTrue(all(role["targetType"] == "EXAMPLE" for role in example_audio["roles"]))
            self.assertTrue(all(role["targetCandidateId"].startswith("EXAMPLE-CANDIDATE-") for role in example_audio["roles"]))
            self.assertIn("EXAMPLE_AUDIO_NOT_PRONUNCIATION", selected[0]["qaFlags"])
            self.assertIn("HETERONYM_AUDIO_RISK", selected[0]["qaFlags"])
            self.assertEqual(report["assignedNoteBroadcastCount"], 0)

            safe = dict(first)
            safe.update({
                "candidateId": "S3", "lexemeCandidateId": "L3", "partOfSpeechCode": "NOUN",
                "vocab4600Reference": {"sourceNoteReference": "NOTE-SAFE"}, "_alignedNote": note,
                "qaFlags": [], "technicalMediaCandidates": [],
            })
            _, safe_report = proof._attach_selected_media([safe], {}, package)
            safe_word_audio = next(item for item in safe_report["mediaCandidates"] if any(role["kind"] == "WORD_AUDIO" for role in item["roles"]))
            self.assertEqual(safe_word_audio["roles"][0]["targetType"], "LEXEME")
            self.assertEqual(safe_word_audio["roles"][0]["targetCandidateId"], "L3")

            no_example_note = note | {"sourceNoteReference": "NOTE-NO-EXAMPLE", "example": ""}
            unresolved = dict(first)
            unresolved.update({
                "candidateId": "S4", "lexemeCandidateId": "L4",
                "vocab4600Reference": {"sourceNoteReference": "NOTE-NO-EXAMPLE"}, "_alignedNote": no_example_note,
                "qaFlags": [], "exampleAudioCandidateStatus": "NOT_PRESENT", "technicalMediaCandidates": [],
            })
            _, unresolved_report = proof._attach_selected_media([unresolved], {}, package)
            unresolved_example_audio = next(item for item in unresolved_report["mediaCandidates"] if any(role["kind"] == "EXAMPLE_AUDIO" for role in item["roles"]))
            self.assertEqual(unresolved_example_audio["roles"][0]["targetType"], "UNRESOLVED")

    def test_stratified_quota_selection_is_exact_and_deterministic(self) -> None:
        candidates = []
        serial = 0
        pos_cycle = ["NOUN", "VERB", "ADJECTIVE", "ADVERB"]
        for level in proof.CEFR_ORDER:
            for bucket, count in (("OXFORD_PLUS_4600", 24), ("OXFORD_ONLY", 12)):
                for index in range(count):
                    serial += 1
                    paired = index < 4
                    lexeme = f"{bucket}-{level}-poly-{index // 2}" if paired else f"{bucket}-{level}-lex-{index}"
                    candidates.append({
                        "candidateId": f"C{serial:03d}", "lexemeCandidateId": lexeme,
                        "sourceBucket": bucket, "selectedCefr": level,
                        "existingMasterStatus": "NO_EXISTING_LEXEME",
                        "partOfSpeechCode": pos_cycle[index % len(pos_cycle)],
                        "lexicalUnitType": "MULTIWORD_EXPRESSION" if index in {8, 9, 10, 11} else "WORD",
                    })
        plan = proof._solve_level_bucket_quotas(candidates)
        self.assertTrue(plan)
        self.assertEqual(sum(plan[level]["OXFORD_PLUS_4600"] for level in proof.CEFR_ORDER), 70)
        self.assertTrue(all(sum(plan[level].values()) == 18 for level in proof.CEFR_ORDER))
        selected_a, report_a = proof._select_oxford(candidates, plan, "test-seed")
        selected_b, report_b = proof._select_oxford(candidates, plan, "test-seed")
        self.assertEqual([item["candidateId"] for item in selected_a], [item["candidateId"] for item in selected_b])
        self.assertEqual(len(selected_a), 90)
        self.assertEqual(report_a["selectedByBucket"], report_b["selectedByBucket"])
        self.assertEqual(sum(item["sourceBucket"] == "OXFORD_PLUS_4600" for item in selected_a), 70)
        self.assertEqual(sum(item["sourceBucket"] == "OXFORD_ONLY" for item in selected_a), 20)
        capped, _ = proof._select_oxford(candidates, plan, "test-seed", multiword_limit=3)
        self.assertLessEqual(sum(item["lexicalUnitType"] != "WORD" for item in capped), 3)

    def test_source_sha_change_changes_fingerprint_and_sanitized_output_has_no_path(self) -> None:
        one = {"source": {"basename": "fixture.apkg", "sizeBytes": 10, "sha256": "1" * 64}, "candidates": []}
        two = {"source": {"basename": "fixture.apkg", "sizeBytes": 10, "sha256": "2" * 64}, "candidates": []}
        self.assertNotEqual(proof.canonical_sha256(one), proof.canonical_sha256(two))
        with tempfile.TemporaryDirectory() as temp:
            candidate = {
                "candidateId": "SOURCE-CANDIDATE-X", "lexemeCandidateId": "LEXEME-CANDIDATE-X",
                "normalizedLemma": "bank", "displayLemma": "bank", "lexicalUnitType": "WORD",
                "partOfSpeechCode": "NOUN", "semanticLabel": "editorial authoring required",
                "sourceCoverage": "OXFORD_ONLY", "rightsStatus": "UNKNOWN_UNVERIFIED", "shipEligible": False,
                "qaFlags": [], "recommendedNextAction": "AUTHOR_AND_REVIEW_MASTER_SENSE",
            }
            serialized = proof.canonical_json(proof._sanitize_candidate(candidate))
            self.assertNotIn(temp, serialized)
            self.assertNotIn("masterSenseId", serialized)

    def test_synthetic_proof_rerun_has_identical_fingerprint_and_no_absolute_path(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            dataset = root / "dataset"
            dataset.mkdir()
            (dataset / "dataset.json").write_text(json.dumps({"includedLexemes": [], "includedSenses": []}), encoding="utf-8")
            oxford_path = make_apkg(
                root,
                ["Word", "Vietnamese", "Part of Speech", "Example", "Example Data", "CEFR", "Phonetic", "Pronunciation Data", "Sound_uk", "Sound_us"],
                [{
                    "Word": "alpha", "Vietnamese": "mẫu", "Part of Speech": "noun", "Example": "An alpha item.",
                    "Example Data": json.dumps([{"meaning_vi": "mẫu", "pos": "noun", "examples": ["An alpha item."]}]),
                    "CEFR": "A1", "Phonetic": "/ˈælfə/",
                }],
                name=proof.EXPECTED_FILES["oxford"],
            )
            vocab_path = make_apkg(
                root,
                ["Word", "PoS", "Meaning", "Example", "IPA", "Sound", "Sound_Example", "Image"],
                [
                    {"Word": "alpha", "PoS": "noun", "Meaning": "a first item", "Example": "An alpha item."},
                    {"Word": "beta", "PoS": "noun", "Meaning": "a second item", "Example": "A beta item."},
                ],
                name=proof.EXPECTED_FILES["vocab4600"],
            )
            first = proof.build_proof(oxford_path, vocab_path, dataset, None)
            second = proof.build_proof(oxford_path, vocab_path, dataset, None)
            self.assertEqual(first["proofFingerprint"], second["proofFingerprint"])
            self.assertNotEqual(first["manifest"]["parserContractVersion"], "APKG-SOURCE-PROOF-2")
            self.assertEqual(first["coverage"]["selectedOxfordSegmentation"]["candidateCount"], 1)
            self.assertEqual(first["coverage"]["selectedOxfordSegmentation"]["structured"], 1)
            self.assertEqual(first["coverage"]["selectedOxfordSegmentation"]["fallback"], 0)
            candidate_statuses = {row["candidateId"]: row["senseSegmentationStatus"] for row in first["candidates"]["candidates"]}
            oxford_statuses = [row["senseSegmentationStatus"] for row in first["candidates"]["candidates"] if row["sourceCoverage"] != "4600_ONLY"]
            self.assertEqual(oxford_statuses, ["STRUCTURED"])
            self.assertEqual(sum(status == "STRUCTURED" for status in candidate_statuses.values()), first["coverage"]["selectedOxfordSegmentation"]["structured"])
            self.assertEqual(sum(status == "NOTE_LEVEL_FALLBACK" for status in candidate_statuses.values()), first["coverage"]["selectedOxfordSegmentation"]["fallback"])
            self.assertIn(
                "Selected Oxford-backed candidates: **1**; structured: **1**; note-level fallback: **0**.",
                proof._render_report(first),
            )
            self.assertNotIn("All selected Oxford candidates use structured groups.", proof._render_report(first))
            payload = proof.canonical_json(first["proofFingerprintInput"])
            self.assertNotIn(str(root), payload)
            self.assertNotIn("masterLexemeId", payload)


if __name__ == "__main__":
    unittest.main(verbosity=2)
