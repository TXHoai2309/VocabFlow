from __future__ import annotations

import hashlib
import html
import json
import re
import shutil
import sqlite3
import subprocess
import sys
import tempfile
import unicodedata
import zipfile
import traceback
from collections import Counter, defaultdict
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE_APKG = Path("D:/hoctienganh/4600 English Vocab.apkg")
INVENTORY_ROOT = ROOT / "vocabflow-dataset/workspaces/full-source-inventory-dedupe"
INVENTORY_PATH = INVENTORY_ROOT / "vocab4600-normalized-inventory.json"
GROUPS_PATH = INVENTORY_ROOT / "lexical-candidate-groups.json"
STAGE_INPUT_PATH = ROOT / "local-data/generated/english-vocabulary-4600-stage-input-v1.json"
OUTPUT_ROOT = ROOT / "vocabflow-dataset/workspaces/english-vocabulary-4600-media-v2"
MANIFEST_VERSION = "english-vocabulary-4600-media-v2.0.0"
REQUESTED_DRAFT_COUNT = 3646
EXPECTED_APKG_BYTES = 584090331
EXPECTED_APKG_SHA256 = "495077028ede6f4de9ff166c605673da379ac4ce32113e49099f6d8e28ffbd6b"
RIGHTS_STATUS = "UNKNOWN_REVIEW_REQUIRED"
RIGHTS_URL = "https://ankivn.com/decks/4600-english-vocab-anki-vietnam/"
CC_BY_NC_URL = "https://creativecommons.org/licenses/by-nc/4.0/"

ROLE_BY_FIELD = {
    "Image": "ILLUSTRATION_IMAGE",
    "Sound": "WORD_PRONUNCIATION_AUDIO",
    "Sound_Example": "EXAMPLE_SENTENCE_AUDIO",
}


def canonical(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha256_file(path: Path) -> tuple[str, int]:
    digest = hashlib.sha256()
    size = 0
    with path.open("rb") as stream:
        while True:
            block = stream.read(8 * 1024 * 1024)
            if not block:
                break
            digest.update(block)
            size += len(block)
    return digest.hexdigest(), size


def write_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def normalize_pos(values: list[object]) -> set[str]:
    result: set[str] = set()
    aliases = {
        "noun": "NOUN", "n": "NOUN",
        "verb": "VERB", "v": "VERB",
        "adjective": "ADJECTIVE", "adj": "ADJECTIVE",
        "adverb": "ADVERB", "adv": "ADVERB",
        "pronoun": "PRONOUN", "pron": "PRONOUN",
        "preposition": "PREPOSITION", "prep": "PREPOSITION",
        "conjunction": "CONJUNCTION", "conj": "CONJUNCTION",
        "interjection": "INTERJECTION", "interj": "INTERJECTION",
        "determiner": "DETERMINER", "det": "DETERMINER",
        "article": "ARTICLE",
        "phrase": "PHRASE",
    }
    for value in values:
        text = str(value).strip().casefold()
        if text:
            result.add(aliases.get(text, text.upper()))
    return result


def build_note_reference_inventory(records: list[dict], media_index: dict[str, str]) -> tuple[dict[str, list[dict]], list[dict]]:
    by_filename: dict[str, list[dict]] = defaultdict(list)
    references: list[dict] = []
    filename_to_indices: dict[str, list[str]] = defaultdict(list)
    for index, filename in media_index.items():
        filename_to_indices[str(filename)].append(str(index))
    for record in records:
        source_id = str(record["sourceRecordId"])
        note_identity = {
            "sourceRecordId": source_id,
            "sourceNoteGuid": str(record["sourceNoteGuid"]),
            "recordEvidenceSha256": str(record["recordEvidenceSha256"]),
        }
        fields = record.get("sourceFields", {})
        source_references: list[tuple[str, str, int]] = []
        image_field = str(fields.get("Image", ""))
        image_pattern = re.compile(r"<img\b[^>]*\bsrc\s*=\s*(?:\"([^\"]*)\"|'([^']*)'|([^\s>]+))", re.IGNORECASE)
        for occurrence, match in enumerate(image_pattern.finditer(image_field), start=1):
            filename = next((value for value in match.groups() if value is not None), "")
            if filename:
                source_references.append(("Image", html.unescape(filename), occurrence))
        for field in ("Sound", "Sound_Example"):
            audio_field = str(fields.get(field, ""))
            for occurrence, match in enumerate(re.finditer(r"\[sound:([^\]]+)\]", audio_field, re.IGNORECASE), start=1):
                filename = html.unescape(match.group(1).strip())
                if filename:
                    source_references.append((field, filename, occurrence))
        for field, filename, occurrence in source_references:
            role = ROLE_BY_FIELD[field]
            index_matches = filename_to_indices.get(filename, [])
            if len(index_matches) != 1:
                references.append({
                    "sourceNoteIdentity": note_identity,
                    "sourceField": field,
                    "sourceFieldOccurrence": occurrence,
                    "sourceFilename": filename,
                    "mediaRole": role,
                    "status": "UNRESOLVED_SOURCE_FILENAME_INDEX_AMBIGUOUS" if index_matches else "UNRESOLVED_SOURCE_FILENAME_NOT_IN_MEDIA_INDEX",
                    "sourceMediaIndices": sorted(index_matches, key=lambda item: int(item)),
                })
                continue
            reference = {
                "sourceNoteIdentity": note_identity,
                "sourceRecordId": source_id,
                "sourceNoteGuid": str(record["sourceNoteGuid"]),
                "sourceRecordEvidenceSha256": str(record["recordEvidenceSha256"]),
                "sourceField": field,
                "sourceFieldOccurrence": occurrence,
                "sourceFilename": filename,
                "sourceMediaIndex": index_matches[0],
                "mediaRole": role,
                "sourceLemma": str(record.get("normalizedHeadword", "")),
                "sourcePosValues": record.get("sourcePosClassesCandidate", []),
                "sourceSemanticEvidenceSha256": sha256_bytes(canonical({
                    "meaning": record.get("sourceFields", {}).get("Meaning", ""),
                    "example": record.get("sourceFields", {}).get("Example", ""),
                }).encode("utf-8")),
            }
            by_filename[filename].append(reference)
            references.append(reference)
    return by_filename, references


def verify_collection_notes(apkg: zipfile.ZipFile, collection_member: str, records: list[dict]) -> dict:
    if collection_member not in apkg.namelist():
        raise RuntimeError("APKG_COLLECTION_MEMBER_MISSING")
    with tempfile.TemporaryDirectory(prefix="vocabflow-4600-collection-") as temp_root:
        database_path = Path(temp_root) / "collection.sqlite"
        database_path.write_bytes(apkg.read(collection_member))
        connection = sqlite3.connect(str(database_path))
        try:
            models_value = connection.execute("SELECT models FROM col LIMIT 1").fetchone()[0]
            models = json.loads(models_value)
            model_fields = {
                str(model_id): [
                    item["name"] for item in sorted(model.get("flds", []), key=lambda field: int(field.get("ord", 0)))
                ]
                for model_id, model in models.items()
            }
            rows = connection.execute("SELECT id, guid, mid, flds FROM notes ORDER BY id").fetchall()
            actual = {str(note_id): (str(guid), str(model_id), str(fields)) for note_id, guid, model_id, fields in rows}
            if len(actual) != len(records):
                raise RuntimeError("APKG_NOTE_ROW_COUNT_MISMATCH")
            identity_mismatches = 0
            raw_field_mismatches = 0
            missing_source_notes = 0
            compared_fields = 0
            for record in records:
                note_id = str(record["sourceRecordId"])
                found = actual.get(note_id)
                if not found:
                    missing_source_notes += 1
                    continue
                guid, model_id, raw_fields = found
                if guid != str(record["sourceNoteGuid"]) or model_id != str(record["sourceModelId"]):
                    identity_mismatches += 1
                    continue
                names = model_fields.get(model_id, [])
                values = raw_fields.split("\x1f")
                actual_fields = dict(zip(names, values, strict=False))
                source_fields = record.get("sourceFields", {})
                for field in ("Word", "IPA", "Sound", "PoS", "Meaning", "Example", "Sound_Example", "Image"):
                    if field not in names or field not in source_fields:
                        continue
                    compared_fields += 1
                    if actual_fields.get(field) != source_fields[field]:
                        raw_field_mismatches += 1
            if missing_source_notes or identity_mismatches or raw_field_mismatches:
                raise RuntimeError("APKG_NOTE_IDENTITY_OR_FIELD_MISMATCH")
            return {
                "sourceDatabaseNoteRows": len(actual),
                "normalizedInventoryRecords": len(records),
                "noteIdGuidModelExactMatches": len(records),
                "rawMediaAndSemanticFieldsCompared": compared_fields,
                "rawFieldMismatches": raw_field_mismatches,
                "missingNoteIdentities": missing_source_notes,
                "collectionMember": collection_member,
            }
        finally:
            connection.close()


def image_facts(data: bytes) -> tuple[str, str]:
    with Image.open(BytesIO(data)) as image:
        image.verify()
    with Image.open(BytesIO(data)) as image:
        image.load()
        media_format = (image.format or "").upper()
        mime = Image.MIME.get(media_format)
    if not mime or not media_format:
        raise ValueError("IMAGE_FORMAT_UNDETECTED")
    extension = {"JPEG": "jpg", "JPG": "jpg", "PNG": "png", "GIF": "gif", "WEBP": "webp", "BMP": "bmp"}.get(media_format)
    if not extension:
        extension = media_format.casefold()
    return mime, extension


def pos_compatible(source_values: list[object], target_values: set[str]) -> bool:
    source = normalize_pos(source_values)
    return bool(source and target_values and source.intersection(target_values))


def build() -> dict:
    if not SOURCE_APKG.is_file():
        raise RuntimeError("SOURCE_APKG_NOT_FOUND")
    if not INVENTORY_PATH.is_file() or not GROUPS_PATH.is_file() or not STAGE_INPUT_PATH.is_file():
        raise RuntimeError("SOURCE_OR_TARGET_INVENTORY_NOT_FOUND")

    apkg_sha256, apkg_bytes = sha256_file(SOURCE_APKG)
    if apkg_bytes != EXPECTED_APKG_BYTES or apkg_sha256 != EXPECTED_APKG_SHA256:
        raise RuntimeError("APKG_SIZE_OR_SHA256_PIN_MISMATCH")

    inventory = json.loads(INVENTORY_PATH.read_text(encoding="utf-8"))
    source = inventory["source"]
    records = inventory["records"]
    groups_document = json.loads(GROUPS_PATH.read_text(encoding="utf-8"))
    candidate_groups = groups_document["groups"]
    stage = json.loads(STAGE_INPUT_PATH.read_text(encoding="utf-8"))
    stage_summary = stage["summary"]
    if stage["target"]["projectId"] != "shy-hill-72364426" or stage["target"]["branchId"] != "br-square-grass-b3af0nte":
        raise RuntimeError("STAGE_INPUT_TARGET_MISMATCH")
    if stage_summary["authoredGroups"] != 5937 or stage_summary["effectiveDraftSenseRows"] != 5616:
        raise RuntimeError("STAGE_INPUT_SNAPSHOT_CHANGED")
    target_baseline_matches_request = stage_summary["effectiveDraftSenseRows"] == REQUESTED_DRAFT_COUNT

    note_verification: dict
    physical_by_index: dict[str, dict] = {}
    filename_by_index: dict[str, str] = {}
    hash_to_indices: dict[str, list[str]] = defaultdict(list)
    validation_errors: list[dict] = []
    audio_sources: list[dict] = []
    media_index: dict[str, str]
    with zipfile.ZipFile(SOURCE_APKG) as apkg:
        names = apkg.namelist()
        if len(names) != int(source["containerEntryCount"]):
            raise RuntimeError("APKG_ENTRY_COUNT_MISMATCH")
        media_raw = apkg.read("media")
        media_index = json.loads(media_raw.decode("utf-8"))
        actual_numeric_entries = {name for name in names if name.isdigit()}
        mapped_entries = set(media_index.keys())
        if actual_numeric_entries != mapped_entries:
            raise RuntimeError("APKG_MEDIA_INDEX_ENTRY_SET_MISMATCH")
        if any(media_index[index] is None for index in media_index):
            raise RuntimeError("APKG_MEDIA_INDEX_NULL_FILENAME")
        filename_to_indices: dict[str, list[str]] = defaultdict(list)
        for index, filename in media_index.items():
            filename_to_indices[str(filename)].append(str(index))
        if len(filename_to_indices) != len(media_index):
            raise RuntimeError("APKG_MEDIA_FILENAME_COLLISION")

        note_verification = verify_collection_notes(apkg, str(source["collectionMember"]), records)
        refs_by_filename, references = build_note_reference_inventory(records, media_index)
        reference_occurrences = Counter(
            row["sourceField"] for row in references if row.get("mediaRole")
        )
        index_refs: dict[str, list[dict]] = defaultdict(list)
        for ref in references:
            if ref.get("sourceMediaIndex"):
                index_refs[str(ref["sourceMediaIndex"])].append(ref)

        with tempfile.TemporaryDirectory(prefix="vocabflow-4600-audio-") as audio_temp:
            audio_temp_root = Path(audio_temp)
            for index in sorted(media_index.keys(), key=lambda value: int(value)):
                info = apkg.getinfo(index)
                filename = str(media_index[index])
                suffix = Path(filename).suffix.casefold()
                data = apkg.read(index)
                digest = sha256_bytes(data)
                if len(data) != info.file_size:
                    validation_errors.append({"sourceMediaIndex": index, "sourceFilename": filename, "reason": "UNCOMPRESSED_LENGTH_MISMATCH"})
                mime = ""
                extension = suffix.lstrip(".")
                try:
                    mime, extension = image_facts(data)
                    media_kind = "IMAGE"
                    validation = "VALID_IMAGE_DECODED_PILLOW"
                except Exception:
                    if suffix == ".mp3":
                        media_kind = "AUDIO"
                    else:
                        media_kind = "UNKNOWN"
                if media_kind == "AUDIO":
                    if not (data.startswith(b"ID3") or (len(data) > 1 and data[0] == 0xFF and (data[1] & 0xE0) == 0xE0)):
                        validation = "INVALID_AUDIO_HEADER"
                        validation_errors.append({"sourceMediaIndex": index, "sourceFilename": filename, "reason": "MP3_HEADER_INVALID"})
                    else:
                        validation = "PENDING_FULL_AUDIO_DECODE"
                        mime = "audio/mpeg"
                        extension = "mp3"
                        temp_audio_path = audio_temp_root / (index + ".mp3")
                        temp_audio_path.write_bytes(data)
                        audio_sources.append({
                            "sourceMediaIndex": index,
                            "sourceFilename": filename,
                            "sha256": digest,
                            "temporaryPath": str(temp_audio_path),
                        })
                elif media_kind == "UNKNOWN":
                    validation = "INVALID_UNSUPPORTED_OR_UNDECODABLE_MEDIA"
                    validation_errors.append({"sourceMediaIndex": index, "sourceFilename": filename, "reason": "UNSUPPORTED_OR_UNDECODABLE_MEDIA"})
                else:
                    validation_errors.append({"sourceMediaIndex": index, "sourceFilename": filename, "reason": "UNSUPPORTED_MEDIA_EXTENSION"})
                physical = {
                    "sourceMediaIndex": index,
                    "sourceFilename": filename,
                    "archiveEntry": index,
                    "byteLength": len(data),
                    "sha256": digest,
                    "mediaKind": media_kind,
                    "detectedMimeType": mime or "application/octet-stream",
                    "normalizedExtension": extension or "bin",
                    "validationStatus": validation,
                    "sourceNoteReferences": index_refs.get(index, []),
                }
                physical_by_index[index] = physical
                filename_by_index[index] = filename
                hash_to_indices[digest].append(index)

            audio_input = audio_temp_root / "audio-input.json"
            audio_output = audio_temp_root / "audio-validation.json"
            cached_audio_path = OUTPUT_ROOT / "audio-decode-validation-v2.json"
            audio_validation = None
            if cached_audio_path.is_file():
                cached = json.loads(cached_audio_path.read_text(encoding="utf-8"))
                cached_by_index = {str(item["sourceMediaIndex"]): item for item in cached.get("results", [])}
                same_audio_inventory = len(cached_by_index) == len(audio_sources) and all(
                    str(cached_by_index.get(item["sourceMediaIndex"], {}).get("sourceFilename")) == item["sourceFilename"]
                    and str(cached_by_index.get(item["sourceMediaIndex"], {}).get("sha256")) == item["sha256"]
                    for item in audio_sources
                )
                if same_audio_inventory:
                    audio_validation = cached
            if audio_validation is None:
                write_json(audio_input, audio_sources)
                decoder_path = ROOT / "scripts/decode-english-vocabulary-4600-audio-v2.mjs"
                decoder_result = subprocess.run(
                    ["node", str(decoder_path), str(audio_input), str(audio_output)],
                    cwd=str(ROOT),
                    capture_output=True,
                    text=True,
                    encoding="utf-8",
                    check=False,
                )
                if decoder_result.returncode == 0 and audio_output.is_file():
                    audio_validation = json.loads(audio_output.read_text(encoding="utf-8"))
                else:
                    audio_validation = {
                        "validator": "Chromium AudioContext.decodeAudioData",
                        "audioFileCount": len(audio_sources),
                        "validFileCount": 0,
                        "invalidFileCount": len(audio_sources),
                        "decoderUnavailable": True,
                        "decoderExitCode": decoder_result.returncode,
                        "results": [
                            {
                                "sourceMediaIndex": item["sourceMediaIndex"],
                                "sourceFilename": item["sourceFilename"],
                                "sha256": item["sha256"],
                                "valid": False,
                                "reason": "FULL_AUDIO_DECODER_FAILED_TO_RUN",
                            }
                            for item in audio_sources
                        ],
                    }
            audio_by_index = {str(item["sourceMediaIndex"]): item for item in audio_validation["results"]}
            for index, physical in physical_by_index.items():
                if physical["mediaKind"] != "AUDIO":
                    continue
                checked = audio_by_index.get(index)
                if checked and checked.get("valid") and checked.get("sha256") == physical["sha256"]:
                    physical["validationStatus"] = "VALID_AUDIO_DECODED_CHROMIUM_AUDIOCONTEXT"
                    physical["decodedAudio"] = {
                        "durationSeconds": checked.get("durationSeconds"),
                        "sampleRate": checked.get("sampleRate"),
                        "channels": checked.get("channels"),
                    }
                else:
                    physical["validationStatus"] = "INVALID_AUDIO"
                    validation_errors.append({"sourceMediaIndex": index, "sourceFilename": physical["sourceFilename"], "reason": "FULL_AUDIO_DECODE_FAILED"})

            # Retain validation facts only; no extracted source bytes leave this temporary directory.
            audio_validation_path = OUTPUT_ROOT / "audio-decode-validation-v2.json"
            sanitized_audio_validation = {
                "schemaVersion": 1,
                "validator": audio_validation.get("validator"),
                "audioFileCount": audio_validation.get("audioFileCount"),
                "validFileCount": audio_validation.get("validFileCount"),
                "invalidFileCount": audio_validation.get("invalidFileCount"),
                "results": [
                    {key: value for key, value in result.items() if key in {
                        "sourceMediaIndex", "sourceFilename", "sha256", "valid", "durationSeconds", "sampleRate", "channels"
                    }}
                    for result in audio_validation.get("results", [])
                ],
            }
            write_json(audio_validation_path, sanitized_audio_validation)

    # The APKG contains no unreferenced or missing files; note references are exact source-note facts.
    referenced_indices = {str(row["sourceMediaIndex"]) for row in references if row.get("sourceMediaIndex")}
    all_indices = set(physical_by_index)
    orphan_indices = sorted(all_indices - referenced_indices, key=lambda item: int(item))
    missing_ref_rows = [row for row in references if row.get("status", "").startswith("UNRESOLVED_")]

    record_by_id = {str(record["sourceRecordId"]): record for record in records}
    candidate_groups_by_record: dict[str, list[str]] = defaultdict(list)
    for group in candidate_groups:
        group_key = str(group["candidateGroupKey"])
        for record_id in group.get("vocab4600SourceRecordIds", []):
            candidate_groups_by_record[str(record_id)].append(group_key)

    target_identity_rows = stage.get("identities", [])
    target_group_keys = {str(row["source_group_key"]) for row in target_identity_rows}
    target_identity_resolution_statuses = Counter(str(row["resolution_status"]) for row in target_identity_rows)
    target_pos_by_group: dict[str, set[str]] = defaultdict(set)
    for row in stage.get("effectivePosByGroup", []):
        target_pos_by_group[str(row["candidate_group_key"])].add(str(row["part_of_speech"]).upper())

    image_files: set[str] = set()
    word_audio_files: set[str] = set()
    example_audio_files: set[str] = set()
    mappings: list[dict] = []
    mapping_statuses: Counter[str] = Counter()
    matched_lexeme_groups: set[str] = set()
    unresolved_by_role: Counter[str] = Counter()
    example_candidate_count = 0

    valid_audio_decode = audio_validation.get("invalidFileCount") == 0 and audio_validation.get("validFileCount") == len(audio_sources)
    for ref in references:
        if not ref.get("mediaRole"):
            continue
        field = ref["sourceField"]
        filename = ref["sourceFilename"]
        index = str(ref["sourceMediaIndex"])
        physical = physical_by_index[index]
        role = str(ref["mediaRole"])
        if role == "ILLUSTRATION_IMAGE":
            image_files.add(filename)
        elif role == "WORD_PRONUNCIATION_AUDIO":
            word_audio_files.add(filename)
        elif role == "EXAMPLE_SENTENCE_AUDIO":
            example_audio_files.add(filename)

        source_id = str(ref["sourceRecordId"])
        source_record = record_by_id[source_id]
        candidate_keys = sorted(set(candidate_groups_by_record.get(source_id, [])))
        source_pos = list(ref.get("sourcePosValues") or [])
        source_lemma = str(ref.get("sourceLemma", ""))
        proposed_group = None
        status = "UNRESOLVED"
        confidence = 0.0
        reason = "REQUESTED_EFFECTIVE_DRAFT_TARGET_NOT_PRESENT_IN_VERIFIED_ARTIFACT"
        if role == "WORD_PRONUNCIATION_AUDIO":
            if len(candidate_keys) != 1:
                reason = "SOURCE_NOTE_HAS_NO_UNIQUE_CANDIDATE_GROUP"
            else:
                candidate = candidate_keys[0]
                exact_group_lemma = candidate.startswith("NORMALIZED_HEADWORD:") and candidate.split(":", 1)[1] == source_lemma
                group_exists = candidate in target_group_keys
                compatible_pos = pos_compatible(source_pos, target_pos_by_group.get(candidate, set()))
                if not exact_group_lemma:
                    reason = "CANDIDATE_GROUP_LEMMA_MISMATCH"
                elif not group_exists:
                    reason = "CANDIDATE_GROUP_NOT_IN_AUTHORED_IDENTITY_REGISTRY"
                elif not compatible_pos:
                    reason = "TARGET_GROUP_HAS_NO_COMPATIBLE_POS_EVIDENCE"
                else:
                    proposed_group = candidate
                    status = "PROPOSED_REVIEW_REQUIRED"
                    confidence = 0.940
                    reason = "EXACT_NOTE_ID_GUID_HASH_LEMMA_POS_AND_AUTHORED_GROUP"
                    matched_lexeme_groups.add(candidate)
        elif role == "EXAMPLE_SENTENCE_AUDIO":
            # The correct 3,646-Sense artifact was not present in the verified target snapshot.
            # Do not copy a proposal key from the mismatching 5,616-row Development snapshot.
            reason = "SENSE_MAPPING_HELD_TARGET_HAS_5616_DRAFTS_EXPECTS_3646"
        elif role == "ILLUSTRATION_IMAGE":
            reason = "SENSE_MAPPING_HELD_TARGET_HAS_5616_DRAFTS_EXPECTS_3646"
        evidence = {
            "sourceNoteIdentityVerifiedAgainstApkg": True,
            "sourceRecordEvidenceSha256": ref["sourceRecordEvidenceSha256"],
            "sourceNoteGuid": ref["sourceNoteGuid"],
            "sourceLemma": source_lemma,
            "sourcePosValues": source_pos,
            "sourceSemanticEvidenceSha256": ref["sourceSemanticEvidenceSha256"],
            "candidateGroupKeysFromSourceRecordIdentity": candidate_keys,
            "targetAuthoredGroupExists": proposed_group is not None,
            "targetPosIntersection": sorted(target_pos_by_group.get(proposed_group, set()).intersection(normalize_pos(source_pos))) if proposed_group else [],
            "targetDraftCountMismatch": {
                "requestedEffectiveDraftSenses": REQUESTED_DRAFT_COUNT,
                "observedDevelopmentEffectiveDraftSenses": stage_summary["effectiveDraftSenseRows"],
                "senseMappingAllowed": False,
            },
            "unresolvedReason": None if status == "PROPOSED_REVIEW_REQUIRED" else reason,
            "imageVisualReview": "NOT_PERFORMED" if role == "ILLUSTRATION_IMAGE" else None,
            "exampleExactTextComparison": "BLOCKED_TARGET_ARTIFACT_MISMATCH" if role == "EXAMPLE_SENTENCE_AUDIO" else None,
            "fullAudioDecodePassed": bool(valid_audio_decode) if physical["mediaKind"] == "AUDIO" else None,
        }
        mapping_core = {
            "manifest_version": MANIFEST_VERSION,
            "media_sha256": physical["sha256"],
            "media_kind": role,
            "source_note_id": source_id,
            "source_note_guid": str(ref["sourceNoteGuid"]),
            "source_record_evidence_sha256": str(ref["sourceRecordEvidenceSha256"]),
            "source_field": field,
            "source_reference_ordinal": int(ref["sourceFieldOccurrence"]),
            "source_filename": filename,
            "target_group_key": proposed_group,
            "target_proposal_key": None,
            "target_example_index": None,
            "mapping_status": status,
            "mapping_confidence": confidence,
            "mapping_evidence": evidence,
            "rights_status": RIGHTS_STATUS,
        }
        mapping_key = sha256_bytes(canonical(mapping_core).encode("utf-8"))
        mappings.append({"mapping_key": mapping_key, **mapping_core})
        mapping_statuses[status] += 1
        if status == "UNRESOLVED":
            unresolved_by_role[role] += 1

    # Hash-deduplicated asset rows carry every source file and note identity but never source bytes.
    assets: list[dict] = []
    physical_duplicate_files = 0
    duplicate_hash_groups = 0
    reused_assets = 0
    invalid_physical_files = 0
    for digest, indices in sorted(hash_to_indices.items()):
        sorted_indices = sorted(indices, key=lambda item: int(item))
        physicals = [physical_by_index[index] for index in sorted_indices]
        kinds = {row["mediaKind"] for row in physicals}
        if len(kinds) != 1:
            validation_errors.append({"sha256": digest, "reason": "CROSS_KIND_CONTENT_HASH_COLLISION"})
        kind = physicals[0]["mediaKind"]
        if any(row["validationStatus"].startswith("INVALID") for row in physicals):
            invalid_physical_files += sum(1 for row in physicals if row["validationStatus"].startswith("INVALID"))
        roles = sorted({str(ref["mediaRole"]) for row in physicals for ref in row["sourceNoteReferences"]})
        source_notes = {
            (str(ref["sourceNoteIdentity"]["sourceRecordId"]), str(ref["sourceNoteIdentity"]["sourceNoteGuid"]), str(ref["sourceNoteIdentity"]["recordEvidenceSha256"]))
            for row in physicals for ref in row["sourceNoteReferences"]
        }
        note_identities = [
            {"sourceRecordId": source_id, "sourceNoteGuid": guid, "recordEvidenceSha256": record_hash}
            for source_id, guid, record_hash in sorted(source_notes)
        ]
        file_identities = [
            {"sourceMediaIndex": row["sourceMediaIndex"], "archiveEntry": row["archiveEntry"], "sourceFilename": row["sourceFilename"]}
            for row in physicals
        ]
        if len(physicals) > 1:
            duplicate_hash_groups += 1
            physical_duplicate_files += len(physicals) - 1
        if len(physicals) > 1 or len(source_notes) > 1:
            reused_assets += 1
        first = physicals[0]
        if kind == "IMAGE":
            key = "media/v2/english-vocabulary-4600/images/" + digest + "." + first["normalizedExtension"]
        elif kind == "AUDIO":
            key = "media/v2/english-vocabulary-4600/audio/" + digest + ".mp3"
        else:
            key = "media/v2/english-vocabulary-4600/unknown/" + digest + ".bin"
        validation_values = {row["validationStatus"] for row in physicals}
        validation_status = sorted(validation_values)[0] if len(validation_values) == 1 else "INVALID_DUPLICATE_BYTES_VALIDATION_DISAGREEMENT"
        assets.append({
            "manifest_version": MANIFEST_VERSION,
            "media_sha256": digest,
            "media_kind": kind,
            "media_roles": roles,
            "detected_mime_type": first["detectedMimeType"],
            "normalized_extension": first["normalizedExtension"],
            "byte_length": first["byteLength"],
            "provider_neutral_storage_key": key,
            "source_file_identities": file_identities,
            "source_note_identities": note_identities,
            "validation_status": validation_status,
            "rights_status": RIGHTS_STATUS,
            "upload_eligible": False,
            "source_apkg_sha256": apkg_sha256,
        })

    source_file_counts = {
        "images": len({row["sourceFilename"] for row in physical_by_index.values() if row["mediaKind"] == "IMAGE"}),
        "audio": len({row["sourceFilename"] for row in physical_by_index.values() if row["mediaKind"] == "AUDIO"}),
        "wordAudio": len(word_audio_files),
        "exampleAudio": len(example_audio_files),
    }
    matched_senses = 0
    expected_groups = 5937
    matched_word_groups = len(matched_lexeme_groups)
    missing_word_audio = max(0, expected_groups - matched_word_groups)
    unresolved_mapping_count = sum(1 for mapping in mappings if mapping["mapping_status"] == "UNRESOLVED")
    all_audio_valid = audio_validation.get("invalidFileCount") == 0 and audio_validation.get("validFileCount") == len(audio_sources)
    valid_physical = len(physical_by_index) - invalid_physical_files
    rights_cleared = 0
    rights_blocked = len(assets)

    report = {
        "schemaVersion": 2,
        "manifestVersion": MANIFEST_VERSION,
        "sourceIdentity": "ENGLISH_VOCAB_4600",
        "sourceApkg": {
            "path": str(SOURCE_APKG),
            "byteLength": apkg_bytes,
            "sha256": apkg_sha256,
            "zipEntryCount": len(zipfile.ZipFile(SOURCE_APKG).namelist()),
            "noteVerification": note_verification,
        },
        "sourcePhysicalFiles": {
            "imageFiles": source_file_counts["images"],
            "wordAudioFiles": source_file_counts["wordAudio"],
            "exampleSentenceAudioFiles": source_file_counts["exampleAudio"],
            "audioFilesTotal": source_file_counts["audio"],
            "mediaReferenceOccurrences": len([row for row in references if row.get("mediaRole")]),
            "validPhysicalFiles": valid_physical,
            "invalidPhysicalFiles": invalid_physical_files,
            "duplicatePhysicalFilesBeyondUniqueHashes": physical_duplicate_files,
            "duplicateHashGroups": duplicate_hash_groups,
            "uniqueContentHashes": len(assets),
            "uniqueImageContentHashes": sum(1 for asset in assets if asset["media_kind"] == "IMAGE"),
            "uniqueAudioContentHashes": sum(1 for asset in assets if asset["media_kind"] == "AUDIO"),
            "reusedContentAssets": reused_assets,
            "unreferencedPhysicalFiles": len(orphan_indices),
            "referenceRowsUnresolvedAtSourceInventory": len(missing_ref_rows),
            "decoder": audio_validation.get("validator"),
            "audioDecoderPassed": all_audio_valid,
        },
        "targetSnapshot": {
            "projectId": stage["target"]["projectId"],
            "branchId": stage["target"]["branchId"],
            "databaseName": stage["target"]["databaseName"],
            "authoredGroupsRequested": 5937,
            "authoredGroupsObserved": stage_summary["authoredGroups"],
            "senseIdentitiesObserved": stage_summary["identityRegistryRows"],
            "identityResolutionStatusCounts": dict(sorted(target_identity_resolution_statuses.items())),
            "effectiveDraftSensesRequested": REQUESTED_DRAFT_COUNT,
            "effectiveDraftSensesObserved": stage_summary["effectiveDraftSenseRows"],
            "targetBaselineMatchesRequest": target_baseline_matches_request,
            "senseMediaMappingAllowed": target_baseline_matches_request,
        },
        "mapping": {
            "referenceMappingRows": len(mappings),
            "proposedLexemeWordPronunciationMappings": sum(1 for row in mappings if row["media_kind"] == "WORD_PRONUNCIATION_AUDIO" and row["mapping_status"] == "PROPOSED_REVIEW_REQUIRED"),
            "matchedLexemeGroups": matched_word_groups,
            "matchedSenseIdentities": matched_senses,
            "matchedExampleAudio": 0,
            "unresolvedMediaMappingRows": unresolved_mapping_count,
            "unresolvedByRole": dict(sorted(unresolved_by_role.items())),
            "missingWordAudioLexemeGroups": missing_word_audio,
            "missingImageSenseCount": "UNCOMPUTABLE_TARGET_ARTIFACT_MISMATCH",
            "missingExampleAudioCount": "UNCOMPUTABLE_TARGET_ARTIFACT_MISMATCH",
            "exampleExactTextCandidatesAgainstCorrectTarget": 0,
            "polysemousAndAmbiguousTargets": "UNRESOLVED",
        },
        "rights": {
            "status": RIGHTS_STATUS,
            "clearedAssets": rights_cleared,
            "blockedAssets": rights_blocked,
            "assetLevelProof": False,
            "evidence": [
                {"url": RIGHTS_URL, "finding": "Page-level CC BY-NC notice; individual third-party media rights are not established."},
                {"url": CC_BY_NC_URL, "finding": "CC BY-NC allows only noncommercial use and may not grant every necessary permission."},
            ],
        },
        "cloudinary": {
            "mode": "OFFLINE_PLAN_ONLY",
            "provider": "cloudinary",
            "configSource": "VocabFlow repository .env only",
            "requestMade": False,
            "eligibleAssets": 0,
            "canary": "BLOCKED_RIGHTS_UNKNOWN",
            "bulkUpload": "BLOCKED_RIGHTS_UNKNOWN",
            "credentialValuesPrinted": False,
        },
        "database": {
            "schema": "vocabflow_editorial_staging",
            "metadataWrites": 0,
            "mappingWrites": 0,
            "integrationStatus": "HELD_TARGET_BASELINE_MISMATCH",
            "databaseIntegrationEligible": False,
            "runtimePreserved": "YES_NO_RUNTIME_MUTATION_OR_MEDIA_SCHEMA_WRITE",
        },
        "sourceBytesPreserved": True,
        "old2000ManifestTouched": False,
        "invalidAssets": validation_errors,
    }

    source_file_identities_by_hash: dict[str, list[dict]] = defaultdict(list)
    for asset in assets:
        for file_identity in asset["source_file_identities"]:
            source_file_identities_by_hash[asset["media_sha256"]].append(file_identity)
    mapping_by_hash: dict[str, list[dict]] = defaultdict(list)
    for mapping in mappings:
        mapping_by_hash[mapping["media_sha256"]].append(mapping)
    manifest = {
        "schemaVersion": 2,
        "manifestVersion": MANIFEST_VERSION,
        "providerNeutralKeyConvention": {
            "image": "media/v2/english-vocabulary-4600/images/<sha256>.<normalized-extension>",
            "audio": "media/v2/english-vocabulary-4600/audio/<sha256>.mp3",
        },
        "source": {
            "sourceId": "ENGLISH_VOCAB_4600",
            "apkgPath": str(SOURCE_APKG),
            "apkgByteLength": apkg_bytes,
            "apkgSha256": apkg_sha256,
            "collectionMember": source["collectionMember"],
            "rightsStatus": RIGHTS_STATUS,
            "sourceInventoryPath": str(INVENTORY_PATH.relative_to(ROOT)),
            "sourceInventoryRecordCount": len(records),
            "sourceMediaIndexCount": len(media_index),
        },
        "assets": assets,
        "mappings": mappings,
        "report": report,
    }
    write_json(OUTPUT_ROOT / "media-manifest-v2.json", manifest)
    write_json(OUTPUT_ROOT / "source-audit-report-v2.json", report)
    cloudinary_plan = {
        "schemaVersion": 2,
        "manifestVersion": MANIFEST_VERSION,
        "mode": "OFFLINE_PLAN_ONLY",
        "source": "ENGLISH_VOCAB_4600",
        "vocabflowCloudinaryConfig": {
            "configSource": "VocabFlow repository .env",
            "cloudNameConfigured": False,
            "apiKeyConfigured": False,
            "apiSecretConfigured": False,
            "mediaProviderCloudinaryConfigured": False,
            "imageFolderConfigured": False,
            "audioFolderConfigured": False,
            "valuesPrinted": False,
        },
        "rightsClearedAssets": rights_cleared,
        "rightsBlockedAssets": rights_blocked,
        "eligibleAssets": 0,
        "plannedUploads": [],
        "canary": {"status": "BLOCKED_RIGHTS_UNKNOWN", "image": None, "wordAudio": None, "exampleAudio": None},
        "networkRequestsMade": 0,
    }
    env_file = ROOT / ".env"
    if env_file.is_file():
        env = {}
        for line in env_file.read_text(encoding="utf-8", errors="replace").splitlines():
            match = re.match(r"^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$", line)
            if match and not match.group(1).startswith("#"):
                env[match.group(1)] = match.group(2).strip().strip("'\"")
        cloudinary_plan["vocabflowCloudinaryConfig"].update({
            "cloudNameConfigured": bool(env.get("CLOUDINARY_CLOUD_NAME")),
            "apiKeyConfigured": bool(env.get("CLOUDINARY_API_KEY")),
            "apiSecretConfigured": bool(env.get("CLOUDINARY_API_SECRET")),
            "mediaProviderCloudinaryConfigured": env.get("MEDIA_PROVIDER", "").casefold() == "cloudinary",
            "imageFolderConfigured": bool(env.get("CLOUDINARY_VOCAB_IMAGE_FOLDER")),
            "audioFolderConfigured": bool(env.get("CLOUDINARY_VOCAB_AUDIO_FOLDER")),
        })
    write_json(OUTPUT_ROOT / "cloudinary-offline-plan-v2.json", cloudinary_plan)

    summary = {
        "SOURCE_IMAGE_FILES": source_file_counts["images"],
        "SOURCE_WORD_AUDIO_FILES": source_file_counts["wordAudio"],
        "SOURCE_EXAMPLE_AUDIO_FILES": source_file_counts["exampleAudio"],
        "SOURCE_AUDIO_FILES_TOTAL": source_file_counts["audio"],
        "SOURCE_MEDIA_FILES_TOTAL": len(physical_by_index),
        "MEDIA_REFERENCE_OCCURRENCES": len([row for row in references if row.get("mediaRole")]),
        "VALID_MEDIA_PHYSICAL_FILES": valid_physical,
        "UNIQUE_CONTENT_HASHES": len(assets),
        "DUPLICATE_MEDIA_PHYSICAL_FILES": physical_duplicate_files,
        "DUPLICATE_MEDIA_HASH_GROUPS": duplicate_hash_groups,
        "INVALID_MEDIA_PHYSICAL_FILES": invalid_physical_files,
        "SOURCE_UNREFERENCED_FILES": len(orphan_indices),
        "SOURCE_REFERENCE_ERRORS": len(missing_ref_rows),
        "MATCHED_LEXEMES": matched_word_groups,
        "MATCHED_SENSES": matched_senses,
        "MATCHED_EXAMPLE_AUDIO": 0,
        "UNRESOLVED_MEDIA_MAPPING": unresolved_mapping_count,
        "MISSING_IMAGE": "UNCOMPUTABLE_TARGET_ARTIFACT_MISMATCH",
        "MISSING_WORD_AUDIO": missing_word_audio,
        "MISSING_EXAMPLE_AUDIO": "UNCOMPUTABLE_TARGET_ARTIFACT_MISMATCH",
        "RIGHTS_CLEARED_ASSETS": rights_cleared,
        "RIGHTS_BLOCKED_ASSETS": rights_blocked,
        "CLOUDINARY_PLAN": "OFFLINE_ONLY; 0 eligible; rights blocked",
        "CLOUDINARY_CANARY": "BLOCKED_RIGHTS_UNKNOWN",
        "CLOUDINARY_UPLOADED": 0,
        "NEON_MEDIA_MAPPINGS": 0,
        "RUNTIME_PRESERVED": "YES (no runtime mutation)",
        "NEXT_ACTION": "Locate/restore the requested 3,646-Sense validated authoring artifact; reconcile the live Neon 5,616 effective DRAFT snapshot; then rerun Sense mapping, exact-example checks, and staging-only idempotent apply after rights clearance.",
    }
    write_json(OUTPUT_ROOT / "phase-media-validation-summary-v2.json", summary)
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return manifest


if __name__ == "__main__":
    try:
        build()
    except Exception as error:
        print("MEDIA_V2_BUILD=FAIL")
        print("ERROR_CODE=" + (str(error) if re.fullmatch(r"[A-Z0-9_]{3,100}", str(error)) else "MEDIA_V2_BUILD_FAILED"))
        traceback.print_exc()
        sys.exit(1)
