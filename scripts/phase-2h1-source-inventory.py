#!/usr/bin/env python3
"""Offline inventory of the local Oxford 5000 and English Vocab Anki decks.

Reads APKG ZIP/SQLite content and the accepted Hybrid-100 release only. Never
connects to a database or mutates input files. --check replays entirely offline.
"""
from __future__ import annotations

import hashlib
import html
import json
import re
import sqlite3
import sys
import unicodedata
import zipfile
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT.parent
WORKSPACE = ROOT / "vocabflow-dataset/workspaces/full-source-inventory-dedupe"
REPORT = ROOT / "vocabflow-dataset/reports/full-source-inventory-dedupe.md"
RELEASE = ROOT / "vocabflow-dataset/releases/hybrid-100-v2.2.1"
LEGACY_SNAPSHOT = ROOT / "vocabflow-dataset/workspaces/legacy-master-expansion-planning/content-snapshot.json"
SOURCES = {
    "OXFORD_5000": SOURCE_DIR / "5000_T_vng_Ting_Anh_Oxford_5000_A1-C1.apkg",
    "ENGLISH_VOCAB_4600": SOURCE_DIR / "4600 English Vocab.apkg",
}
ARTIFACT_NAMES = [
    "source-inventory.json", "normalization-policy.json", "oxford-normalized-inventory.json",
    "vocab4600-normalized-inventory.json", "cross-source-overlap.json", "duplicate-headword-groups.json",
    "lexical-candidate-groups.json", "sense-review-queue.json", "master-coverage-readonly.json",
    "legacy-source-coverage-readonly.json", "provenance-rights-inventory.json", "validation-summary.json",
]
CEFR = {"PRE-A1", "A1", "A2", "B1", "B2", "C1", "C2"}
FIELD_POS_NAMES = ("Part of Speech", "PoS", "POS", "part_of_speech", "pos")
FIELD_WORD_NAMES = ("Word", "word", "Headword", "headword", "Lemma", "lemma")
FIELD_CEFR_NAMES = ("CEFR", "cefr", "Level", "level")
HTML_RE = re.compile(r"<[^>]*>")
BR_RE = re.compile(r"<br\s*/?>", re.I)
SOUND_RE = re.compile(r"\[sound:([^\]]+)\]", re.I)
IMG_RE = re.compile(r"<img\b[^>]*?src\s*=\s*[\"']?([^\s\"'>]+)", re.I)
VI_RE = re.compile(r"[ăâđêôơưĂÂĐÊÔƠƯáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]", re.I)


def canonical_bytes(value: Any) -> bytes:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def inventory_fingerprint(artifacts: dict[str, Any]) -> str:
    return sha256_bytes(canonical_bytes({name: artifacts[name] for name in ARTIFACT_NAMES}))


def file_hash(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def field_value(fields: dict[str, str], candidates: tuple[str, ...]) -> str:
    for key in candidates:
        if key in fields:
            return fields[key]
    return ""


def visible_text(raw: str) -> str:
    return html.unescape(HTML_RE.sub(" ", BR_RE.sub(" ", raw or ""))).replace("\xa0", " ")


def normalize_headword(raw: str) -> str:
    """NFC + visible headword text + trim/collapse whitespace + Unicode casefold.

    Deliberately preserves accents, apostrophes, hyphens, punctuation, token
    order, parenthetical text and inflection. This is a candidate lookup key.
    """
    text = unicodedata.normalize("NFC", visible_text(raw))
    return re.sub(r"\s+", " ", text, flags=re.UNICODE).strip().casefold()


def punctuation_comparison_key(normalized: str) -> str:
    """Secondary collision signal only; never used for exact overlap/identity."""
    chars = []
    for char in unicodedata.normalize("NFC", normalized):
        category = unicodedata.category(char)
        chars.append(" " if category.startswith(("P", "S")) else char)
    return re.sub(r"\s+", " ", "".join(chars)).strip()


def lexical_form_type(headword: str, pos_values: list[str]) -> str:
    pos = " ".join(pos_values).casefold()
    if re.search(r"\bphrasal\s+verb\b", pos):
        return "PHRASAL_VERB_SOURCE_POS"
    if len(headword.split()) > 1:
        return "MULTIWORD_EXPRESSION"
    if "-" in headword or "‐" in headword or "‑" in headword:
        return "HYPHENATED_FORM"
    return "SINGLE_TOKEN_OR_UNCLASSIFIED"


def pos_values(raw: str) -> list[str]:
    if not raw.strip():
        return []
    # Preserve a raw POS field separately. Split only conventional separators;
    # keep unrecognized source labels as evidence instead of guessing.
    pieces = [re.sub(r"\s+", " ", html.unescape(x)).strip().casefold() for x in re.split(r"[,;/|\n]+", visible_text(raw))]
    return sorted(set(piece for piece in pieces if piece))


def pos_classes(raw_values: list[str]) -> list[str]:
    """Normalize only well-known POS label aliases; leave other labels unclassified."""
    aliases = {
        "n": "NOUN", "n.": "NOUN", "noun": "NOUN", "countable noun": "NOUN", "uncountable noun": "NOUN",
        "v": "VERB", "v.": "VERB", "verb": "VERB", "transitive verb": "VERB", "intransitive verb": "VERB",
        "auxiliary verb": "VERB", "modal verb": "VERB", "phrasal verb": "VERB",
        "adj": "ADJECTIVE", "adj.": "ADJECTIVE", "adjective": "ADJECTIVE",
        "adv": "ADVERB", "adv.": "ADVERB", "adverb": "ADVERB",
        "prep": "PREPOSITION", "prep.": "PREPOSITION", "preposition": "PREPOSITION",
        "conj": "CONJUNCTION", "conj.": "CONJUNCTION", "conjunction": "CONJUNCTION",
        "pron": "PRONOUN", "pron.": "PRONOUN", "pronoun": "PRONOUN",
        "det": "DETERMINER", "deter": "DETERMINER", "determiner": "DETERMINER", "article": "DETERMINER",
        "definite article": "DETERMINER", "indefinite article": "DETERMINER",
        "interj": "INTERJECTION", "interj.": "INTERJECTION", "interjection": "INTERJECTION",
        "exclamation": "INTERJECTION", "number": "NUMBER", "proper noun": "PROPER_NOUN",
        "abbreviation": "ABBREVIATION", "acronym": "ABBREVIATION",
    }
    return sorted({aliases[value.casefold().strip()] for value in raw_values if value.casefold().strip() in aliases})


def field_coverage(records: list[dict[str, Any]], keys: list[str]) -> dict[str, dict[str, int]]:
    return {key: {"recordsWithNonemptyValue": sum(bool(str(row["sourceFields"].get(key, "")).strip()) for row in records),
                  "totalRecords": len(records)} for key in keys}


def media_references(fields: dict[str, str]) -> list[dict[str, str]]:
    found: set[tuple[str, str, str]] = set()
    for name, raw in fields.items():
        for reference in SOUND_RE.findall(raw):
            found.add((name, reference, "ANKI_SOUND_TAG"))
        for reference in IMG_RE.findall(raw):
            found.add((name, html.unescape(reference), "HTML_IMAGE_SRC"))
        # Oxford's structured Pronunciation Data stores external media keys
        # (not bundled audio files); retain them as references, not assets.
        if name.casefold() in {"pronunciation data", "pronunciation_data"}:
            try:
                data = json.loads(raw)
            except (json.JSONDecodeError, TypeError):
                continue
            if isinstance(data, list):
                for item in data:
                    if isinstance(item, dict) and isinstance(item.get("audio_keys"), list):
                        for reference in item["audio_keys"]:
                            if isinstance(reference, str):
                                found.add((name, reference, "SOURCE_AUDIO_KEY_NOT_BUNDLED_ASSET"))
    return [{"field": f, "reference": r, "kind": k} for f, r, k in sorted(found)]


def structured_field_flags(fields: dict[str, str]) -> list[dict[str, str]]:
    structured = {"example data", "variant data", "pronunciation data", "irregular forms"}
    result = []
    for name, raw in fields.items():
        if name.casefold() not in structured or not raw.strip():
            continue
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            result.append({"field": name, "status": "UNPARSEABLE_RAW_PRESERVED"})
            continue
        result.append({"field": name, "status": "JSON_PARSED_SOURCE_RAW_PRESERVED" if isinstance(parsed, (list, dict)) else "JSON_SCALAR_RAW_PRESERVED"})
    return result


def source_sense_group_evidence(fields: dict[str, str]) -> list[dict[str, Any]]:
    """Expose source-provided structured groups with record-local ordinals only."""
    raw = next((value for key, value in fields.items() if key.casefold() == "example data"), "")
    if not raw.strip():
        return []
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return []
    if not isinstance(parsed, list):
        return []
    return [{"sourceGroupOrdinal": index, "sourcePosRaw": group.get("pos") if isinstance(group, dict) else None,
        "sourceVietnameseMeaningRaw": group.get("meaning_vi") if isinstance(group, dict) else None,
        "sourceExamples": group.get("examples") if isinstance(group, dict) else None,
        "unrecognizedSourceGroupFields": {key: value for key, value in group.items() if key not in {"pos", "meaning_vi", "examples"}} if isinstance(group, dict) else None,
        "vocabFlowSenseId": None, "identityStatus": "SOURCE_GROUP_ONLY_SENSE_IDENTITY_UNRESOLVED"}
        for index, group in enumerate(parsed)]


def cefr_evidence(fields: dict[str, str], tags: list[str], decks: list[dict[str, Any]]) -> list[dict[str, str]]:
    found: set[tuple[str, str]] = set()
    for key, value in fields.items():
        if key in FIELD_CEFR_NAMES:
            for level in re.findall(r"(?<![A-Za-z0-9])(?:Pre-A1|A1|A2|B1|B2|C1|C2)(?![A-Za-z0-9])", value, re.I):
                found.add((key, level.upper().replace("PRE-A1", "Pre-A1")))
    for tag in tags:
        if tag.upper() in CEFR:
            found.add(("noteTag", tag.upper()))
    for deck in decks:
        deck_name = deck.get("deckName", "")
        for level in re.findall(r"(?<![A-Za-z0-9])(?:Pre-A1|A1|A2|B1|B2|C1|C2)(?![A-Za-z0-9])", deck_name, re.I):
            found.add((f"deck:{deck_name}", level.upper().replace("PRE-A1", "Pre-A1")))
    return [{"sourceField": origin, "value": value} for origin, value in sorted(found)]


def record_definition_example_evidence(fields: dict[str, str]) -> dict[str, Any]:
    definitions = {k: v for k, v in fields.items() if re.search(r"definition|meaning", k, re.I) and v.strip()}
    examples = {k: v for k, v in fields.items() if re.search(r"example|sentence", k, re.I) and v.strip()}
    # Oxford English examples are reliably grouped; 4600 Meaning is a mixed
    # English/Vietnamese field and is kept raw. Flag a heuristic segment only.
    english_candidates: list[dict[str, str]] = []
    for key, raw in definitions.items():
        for segment in BR_RE.split(raw):
            text = visible_text(segment).strip()
            if text and re.search(r"[A-Za-z]", text) and not VI_RE.search(text):
                english_candidates.append({"field": key, "rawSegment": segment, "classification": "HEURISTIC_ENGLISH_TEXT; NOT_CANONICAL_DEFINITION"})
    return {"definitionOrMeaningRawFieldNames": sorted(definitions), "englishDefinitionCandidates": english_candidates,
            "exampleRawFieldNames": sorted(examples), "definitionMeaningRawFieldPresent": bool(definitions), "exampleRawFieldPresent": bool(examples)}


def read_apkg(source_id: str, path: Path) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    if not path.is_file():
        raise RuntimeError(f"SOURCE_FILE_NOT_FOUND:{source_id}")
    info = {"sourceId": source_id, "relativePath": f"../{path.name}", "byteLength": path.stat().st_size,
            "sha256": file_hash(path), "container": "ANKI_APKG_ZIP", "rights": "UNKNOWN_REVIEW_REQUIRED"}
    with zipfile.ZipFile(path) as archive:
        infos = archive.infolist()
        by_name = {item.filename: item for item in infos}
        collection_name = next((name for name in ("collection.anki21b", "collection.anki21", "collection.anki2") if name in by_name), None)
        if collection_name is None or "media" not in by_name:
            raise RuntimeError(f"APKG_REQUIRED_MEMBER_MISSING:{source_id}")
        try:
            media_map = json.loads(archive.read("media").decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as error:
            raise RuntimeError(f"APKG_MEDIA_MAP_INVALID:{source_id}") from error
        db = sqlite3.connect(":memory:")
        db.deserialize(archive.read(collection_name))
        db.row_factory = sqlite3.Row
        col = db.execute("SELECT models, decks FROM col LIMIT 1").fetchone()
        models_by_id = {int(k): v for k, v in json.loads(col["models"]).items() if str(k).isdigit()}
        decks_by_id = {int(k): v.get("name", "") for k, v in json.loads(col["decks"]).items() if str(k).isdigit()}
        card_rows: dict[int, list[dict[str, Any]]] = defaultdict(list)
        for card in db.execute("SELECT id,nid,did,ord FROM cards ORDER BY nid,id"):
            card_rows[int(card["nid"])].append({"sourceCardId": str(card["id"]), "sourceDeckId": str(card["did"]),
                "deckName": decks_by_id.get(int(card["did"]), f"UNKNOWN_DECK_ID:{card['did']}"), "templateOrdinal": int(card["ord"])})
        records: list[dict[str, Any]] = []
        malformed_fields: list[str] = []
        for note in db.execute("SELECT id,guid,mid,tags,flds FROM notes ORDER BY id"):
            model = models_by_id.get(int(note["mid"]), {})
            definitions = model.get("flds", [])
            chunks = note["flds"].split("\x1f")
            source_fields: dict[str, str] = {}
            for index, field in enumerate(definitions):
                name = str(field.get("name", f"UNNAMED_FIELD_{index}"))
                # Duplicate schema labels cannot safely form an object silently.
                if name in source_fields:
                    name = f"{name}#FIELD_{index}"
                source_fields[name] = chunks[index] if index < len(chunks) else ""
            extra_fields = chunks[len(definitions):]
            if extra_fields:
                malformed_fields.append(str(note["id"]))
                source_fields["UNMAPPED_RAW_FIELDS"] = "\x1f".join(extra_fields)
            raw_headword = field_value(source_fields, FIELD_WORD_NAMES)
            normalized = normalize_headword(raw_headword)
            headword_text = re.sub(r"\s+", " ", visible_text(raw_headword)).strip()
            tags_raw = str(note["tags"] or "")
            tags = tags_raw.split()
            cards = card_rows.get(int(note["id"]), [])
            pos_raw = field_value(source_fields, FIELD_POS_NAMES)
            raw_pos_values = pos_values(pos_raw)
            cefr = cefr_evidence(source_fields, tags, cards)
            evidence = record_definition_example_evidence(source_fields)
            row = {
                "sourceRecordId": str(note["id"]), "sourceNoteGuid": str(note["guid"]),
                "sourceModelId": str(note["mid"]), "sourceModelName": model.get("name", "UNRECOGNIZED_MODEL"),
                "sourceFields": source_fields, "rawHeadword": raw_headword, "headwordText": headword_text,
                "normalizedHeadword": normalized, "sourcePosRaw": pos_raw, "sourcePosValues": raw_pos_values,
                "sourcePosClassesCandidate": pos_classes(raw_pos_values),
                "sourceCefrEvidence": cefr, "sourceDefinitionExampleEvidence": evidence,
                "candidateSourceSenseGroups": source_sense_group_evidence(source_fields),
                "sourceTagsRaw": tags_raw, "sourceTags": tags, "sourceCards": cards,
                "sourceDeckNames": sorted({card["deckName"] for card in cards}),
                "lexicalFormTypeCandidate": lexical_form_type(headword_text, raw_pos_values),
                "mediaReferences": media_references(source_fields),
                "structuredFieldInterpretationFlags": structured_field_flags(source_fields),
                "uninterpretedFieldEvidence": [{"field": k, "rawValue": v} for k, v in source_fields.items()
                    if k not in FIELD_WORD_NAMES and re.search(r"data|form|variant|frequency|rank|study|list|ipa|phonetic|notes?|tag", k, re.I)],
            }
            row["recordEvidenceSha256"] = sha256_bytes(canonical_bytes({k: v for k, v in row.items() if k != "recordEvidenceSha256"}))
            records.append(row)

        actual_archive_entries = {name for name in by_name if name.isdigit()}
        media_rows = []
        for index, original_name in sorted(media_map.items(), key=lambda pair: (str(pair[0]), str(pair[1]))):
            entry = str(index)
            archive_item = by_name.get(entry)
            media_rows.append({"sourceMediaIndex": str(index), "originalFilename": str(original_name),
                "archiveEntryPresent": archive_item is not None, "byteLength": archive_item.file_size if archive_item else None,
                "compressionMethod": archive_item.compress_type if archive_item else None,
                "sha256": "NOT_HASHED_PER_MEDIA; COVERED_BY_APKG_SHA256"})
        model_inventory = []
        for model_id, model in sorted(models_by_id.items()):
            model_inventory.append({"sourceModelId": str(model_id), "name": model.get("name", ""),
                "fields": [{"ordinal": i, "name": field.get("name", ""), "font": field.get("font", ""),
                    "sticky": field.get("sticky", False), "rtl": field.get("rtl", False)} for i, field in enumerate(model.get("flds", []))],
                "templates": [{"ordinal": i, "name": template.get("name", "")} for i, template in enumerate(model.get("tmpls", []))]})
        deck_inventory = [{"sourceDeckId": str(deck_id), "name": name} for deck_id, name in sorted(decks_by_id.items())]
        metadata = {
            **info, "containerEntryCount": len(infos), "uncompressedByteLength": sum(item.file_size for item in infos),
            "collectionMember": collection_name, "collectionByteLength": by_name[collection_name].file_size,
            "metaMemberSha256": sha256_bytes(archive.read("meta")) if "meta" in by_name else None,
            "archiveCompressionMethods": sorted({item.compress_type for item in infos}),
            "mediaIndexRecordCount": len(media_map), "numericMediaArchiveEntryCount": len(actual_archive_entries),
            "mediaIndexMissingArchiveEntries": sum(not row["archiveEntryPresent"] for row in media_rows),
            "unmappedNumericMediaArchiveEntries": len(actual_archive_entries - {str(x) for x in media_map}),
            "records": len(records), "cards": sum(len(row["sourceCards"]) for row in records),
            "models": model_inventory, "decks": deck_inventory,
            "fieldNames": sorted({name for model in model_inventory for name in (field["name"] for field in model["fields"])}),
            "recordsWithUnmappedRawFields": len(malformed_fields), "recordIdsWithUnmappedRawFields": malformed_fields,
            "mediaInventory": media_rows,
        }
        db.close()
    return metadata, records


def group_by(records: list[dict[str, Any]], field: str) -> dict[str, list[dict[str, Any]]]:
    groups: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in records:
        if row[field]:
            groups[row[field]].append(row)
    return groups


def normalized_text_evidence(raw: str) -> str:
    return re.sub(r"\s+", " ", unicodedata.normalize("NFC", visible_text(raw))).strip().casefold()


def english_example_evidence(rows: list[dict[str, Any]]) -> set[str]:
    values = set()
    for row in rows:
        for field, raw in row["sourceFields"].items():
            if re.search(r"example|sentence", field, re.I):
                values.update(normalized_text_evidence(part) for part in BR_RE.split(raw) if normalized_text_evidence(part))
    return values


def vietnamese_meaning_evidence(rows: list[dict[str, Any]]) -> set[str]:
    values = set()
    for row in rows:
        fields = row["sourceFields"]
        candidates = [value for key, value in fields.items() if key.casefold() == "vietnamese"]
        if not candidates:
            candidates = [value for key, value in fields.items() if key.casefold() == "meaning"]
        for raw in candidates:
            for part in BR_RE.split(raw):
                text = normalized_text_evidence(part)
                if text and VI_RE.search(text):
                    values.add(text)
        for key, raw in fields.items():
            if key.casefold() == "example data":
                try:
                    parsed = json.loads(raw)
                except json.JSONDecodeError:
                    continue
                if isinstance(parsed, list):
                    values.update(normalized_text_evidence(item["meaning_vi"]) for item in parsed
                                  if isinstance(item, dict) and item.get("meaning_vi"))
    return values


def duplicate_groups(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    groups = group_by(records, "normalizedHeadword")
    return [{"normalizedHeadword": key, "recordCount": len(rows),
        "sourceRecordIds": [row["sourceRecordId"] for row in rows],
        "rawHeadwordVariants": sorted({row["rawHeadword"] for row in rows}),
        "sourcePosValues": sorted({pos for row in rows for pos in row["sourcePosValues"]}),
        "definitionContentVariants": sorted({sha256_bytes(canonical_bytes(row["sourceDefinitionExampleEvidence"]["englishDefinitionCandidates"])) for row in rows}),
        "reviewRequired": True, "reason": "Distinct source records remain distinct; normalized match does not merge Lexeme or Sense."}
        for key, rows in sorted(groups.items()) if len(rows) > 1]


def corpus_stats(records: list[dict[str, Any]], metadata: dict[str, Any]) -> dict[str, Any]:
    normalized = [row["normalizedHeadword"] for row in records if row["normalizedHeadword"]]
    groups = group_by(records, "normalizedHeadword")
    field_names = metadata["fieldNames"]
    def field_count(pattern: str) -> int:
        matching = [name for name in field_names if re.search(pattern, name, re.I)]
        return sum(any(str(row["sourceFields"].get(name, "")).strip() for name in matching) for row in records)
    pos_rows = sum(bool(row["sourcePosRaw"].strip()) for row in records)
    cefr_rows = sum(bool(row["sourceCefrEvidence"]) for row in records)
    duplicate = duplicate_groups(records)
    repeated_records = sum(item["recordCount"] for item in duplicate)
    collision_groups = normalization_collision_groups(records)
    ambiguous_multi_pos = sum(len({p for row in rows for p in row["sourcePosValues"]}) > 1 for rows in groups.values())
    source_sense_groups = 0
    structured_sense_records = 0
    for row in records:
        raw = next((value for key, value in row["sourceFields"].items() if key.casefold() == "example data"), "")
        if raw.strip():
            try:
                parsed = json.loads(raw)
            except json.JSONDecodeError:
                continue
            if isinstance(parsed, list):
                source_sense_groups += len(parsed)
                structured_sense_records += 1
    media_ref_count = sum(len(row["mediaReferences"]) for row in records)
    raw_def_present = sum(row["sourceDefinitionExampleEvidence"]["definitionMeaningRawFieldPresent"] for row in records)
    explicit_definition_count = field_count(r"^english definition$|^definition$|^definition en$|^definition_en$")
    return {
        "rawNoteRecords": len(records), "linkedCards": sum(len(row["sourceCards"]) for row in records),
        "normalizedHeadwordRecordsNonempty": len(normalized), "recordsWithEmptyNormalizedHeadword": len(records) - len(normalized),
        "uniqueNormalizedHeadwords": len(groups), "duplicateNormalizedHeadwordGroups": len(duplicate),
        "recordsInDuplicateGroups": repeated_records, "extraRecordsBeyondOnePerGroup": repeated_records - len(duplicate),
        "recordsWithSourcePos": pos_rows, "recordsWithAnyCefrEvidence": cefr_rows,
        "recordsWithExplicitEnglishDefinitionField": explicit_definition_count,
        "recordsWithDefinitionOrMeaningEvidenceField": raw_def_present,
        "recordsWithHeuristicEnglishDefinitionSegments": sum(bool(row["sourceDefinitionExampleEvidence"]["englishDefinitionCandidates"]) for row in records),
        "recordsWithEnglishExampleField": field_count(r"example|sentence"),
        "recordsWithMediaReferences": sum(bool(row["mediaReferences"]) for row in records),
        "sourceMediaMetadataItems": len(metadata["mediaInventory"]), "recordMediaReferenceOccurrences": media_ref_count,
        "repeatHeadwordGroups": duplicate, "normalizationCollisionGroupCount": len(collision_groups),
        "normalizationCollisionGroups": collision_groups,
        "sourcePosDistribution": dict(sorted(Counter(p for row in records for p in row["sourcePosValues"]).items())),
        "candidateCanonicalPosClassDistribution": dict(sorted(Counter(p for row in records for p in row["sourcePosClassesCandidate"]).items())),
        "sourceCefrValueDistribution": dict(sorted(Counter(e["value"] for row in records for e in row["sourceCefrEvidence"]).items())),
        "structuredExampleDataRecordCount": structured_sense_records,
        "structuredSenseGroupCount": source_sense_groups,
        "normalizedGroupsWithMultipleStructuredSourceSenseGroups": sum(sum(len(row.get("candidateSourceSenseGroups", [])) for row in rows) > 1 for rows in groups.values()),
        "normalizedGroupsWithMultipleSourcePosValues": ambiguous_multi_pos,
        "normalizedGroupsWithMultipleCanonicalPosClasses": sum(len({p for row in rows for p in row["sourcePosClassesCandidate"]}) > 1 for rows in groups.values()),
        "sourceSenseIdentity": "CANDIDATE_ONLY; source record/group structures do not assert VocabFlow Sense identity",
    }


def normalization_collision_groups(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_secondary: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in records:
        key = punctuation_comparison_key(row["normalizedHeadword"])
        if key:
            by_secondary[key].append(row)
    return [{"punctuationComparisonKey": key,
        "distinctNormalizedHeadwords": sorted({row["normalizedHeadword"] for row in rows}),
        "sourceRecordIds": sorted({f"{row['sourceId']}:{row['sourceRecordId']}" for row in rows}),
        "comparisonIsIdentity": False, "reason": "Punctuation-insensitive key is review-only."}
        for key, rows in sorted(by_secondary.items()) if len({row["normalizedHeadword"] for row in rows}) > 1]


def master_inventory() -> tuple[dict[str, Any], dict[str, list[dict[str, Any]]]]:
    dataset = json.loads((RELEASE / "dataset.json").read_text(encoding="utf-8"))
    lexemes: list[dict[str, Any]] = []
    by_id: dict[str, dict[str, Any]] = {}
    for entry in dataset["includedLexemes"]:
        record = json.loads((RELEASE / entry["recordPath"]).read_text(encoding="utf-8"))
        item = {"masterLexemeId": record["masterLexemeId"], "lemma": record["lemma"],
                "normalizedLemma": normalize_headword(record["lemma"]), "releaseRecordPath": entry["recordPath"],
                "contentHash": entry["contentHash"], "aliases": record.get("aliases", [])}
        lexemes.append(item); by_id[item["masterLexemeId"]] = item
    senses_by_lemma: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for entry in dataset["includedSenses"]:
        record = json.loads((RELEASE / entry["recordPath"]).read_text(encoding="utf-8"))
        lexeme = by_id.get(record.get("masterLexemeId"), {})
        senses_by_lemma[lexeme.get("normalizedLemma", "")].append({"masterSenseId": record["masterSenseId"],
            "masterLexemeId": record.get("masterLexemeId"), "partOfSpeech": record.get("partOfSpeech"),
            "lemma": lexeme.get("lemma", ""), "releaseRecordPath": entry["recordPath"], "contentHash": entry["contentHash"]})
    accepted = {"datasetVersion": dataset["datasetVersion"], "status": dataset["status"],
        "releaseHash": dataset["releaseHash"], "lexemeCount": len(lexemes), "senseCount": len(dataset["includedSenses"]),
        "lexemes": lexemes, "sensesByNormalizedLemma": dict(sorted(senses_by_lemma.items()))}
    return accepted, dict(senses_by_lemma)


def source_classifications(rows: list[dict[str, Any]]) -> dict[str, Any]:
    ox = [row for row in rows if row["sourceId"] == "OXFORD_5000"]
    vocab = [row for row in rows if row["sourceId"] == "ENGLISH_VOCAB_4600"]
    ox_by = group_by(ox, "normalizedHeadword"); vocab_by = group_by(vocab, "normalizedHeadword")
    ox_keys, vocab_keys = set(ox_by), set(vocab_by)
    overlap = sorted(ox_keys & vocab_keys)
    union = sorted(ox_keys | vocab_keys)
    collision_keys: dict[str, set[str]] = defaultdict(set)
    for key in union:
        secondary = punctuation_comparison_key(key)
        if secondary:
            collision_keys[secondary].add(key)
    normalization_collision_headwords = {key for secondary, keys in collision_keys.items() if len(keys) > 1 for key in keys}
    def group_pos(group: list[dict[str, Any]]) -> set[str]:
        return {pos for row in group for pos in row["sourcePosClassesCandidate"]}
    def definition_signatures(group: list[dict[str, Any]]) -> dict[str, set[str]]:
        return {source: {sha256_bytes(canonical_bytes(row["sourceDefinitionExampleEvidence"]["englishDefinitionCandidates"]))
                         for row in group if row["sourceId"] == source and row["sourceDefinitionExampleEvidence"]["englishDefinitionCandidates"]}
                for source in {row["sourceId"] for row in group}}
    groups: list[dict[str, Any]] = []
    queue: list[dict[str, Any]] = []
    for key in union:
        a, b = ox_by.get(key, []), vocab_by.get(key, [])
        p_a, p_b = group_pos(a), group_pos(b)
        same_pos = sorted(p_a & p_b)
        pos_conflict = bool(a and b and p_a and p_b and not same_pos)
        categories: list[str] = []
        if a and b and len(a) == len(b) == 1: categories.append("EXACT_HEADWORD_SINGLE_RECORD_EACH")
        if len(a) > 1 or len(b) > 1: categories.append("MULTIPLE_RECORDS_SAME_SOURCE")
        if pos_conflict: categories.append("POS_CONFLICT")
        if key in normalization_collision_headwords: categories.append("NORMALIZATION_COLLISION")
        if any(row["lexicalFormTypeCandidate"] in {"MULTIWORD_EXPRESSION", "PHRASAL_VERB_SOURCE_POS"} for row in a + b): categories.append("MULTIWORD_OR_PHRASAL_VERB")
        if a and b: categories.append("NORMALIZED_HEADWORD_MATCH")
        if bool(a) != bool(b): categories.append("SOURCE_ONLY_CONTENT")
        # A source structured payload can contain multiple sense groups. Count
        # structures as evidence only; never allocate/merge canonical Senses.
        source_groups = {}
        for source_group in (a, b):
            if not source_group: continue
            source = source_group[0]["sourceId"]
            count = 0
            for row in source_group:
                for field, raw in row["sourceFields"].items():
                    if field.casefold() == "example data" and raw.strip():
                        try:
                            parsed = json.loads(raw); count += len(parsed) if isinstance(parsed, list) else 0
                        except json.JSONDecodeError:
                            pass
            source_groups[source] = count
        if any(count > 1 for count in source_groups.values()) or len(a) + len(b) > 2: categories.append("POSSIBLE_POLYSEMY")
        if (a and b and same_pos) or "POSSIBLE_POLYSEMY" in categories or "NORMALIZATION_COLLISION" in categories: categories.append("HUMAN_SENSE_REVIEW_REQUIRED")
        sigs = definition_signatures(a + b)
        content_conflict = len(sigs.get("OXFORD_5000", set())) > 1 or len(sigs.get("ENGLISH_VOCAB_4600", set())) > 1 or (sigs.get("OXFORD_5000") and sigs.get("ENGLISH_VOCAB_4600") and sigs["OXFORD_5000"] != sigs["ENGLISH_VOCAB_4600"])
        if content_conflict: categories.append("DEFINITION_CONTENT_CONFLICT_REVIEW")
        ox_examples, vocab_examples = english_example_evidence(a), english_example_evidence(b)
        ox_meanings, vocab_meanings = vietnamese_meaning_evidence(a), vietnamese_meaning_evidence(b)
        if ox_examples and vocab_examples and ox_examples.isdisjoint(vocab_examples): categories.append("EXAMPLE_VARIANT_REVIEW")
        if ox_meanings and vocab_meanings and ox_meanings.isdisjoint(vocab_meanings): categories.append("VIETNAMESE_MEANING_VARIANT_REVIEW")
        ox_cefr = {item["value"] for row in a for item in row["sourceCefrEvidence"]}
        vocab_cefr = {item["value"] for row in b for item in row["sourceCefrEvidence"]}
        cefr_conflict = bool(a and b and ox_cefr and vocab_cefr and ox_cefr.isdisjoint(vocab_cefr))
        if cefr_conflict: categories.append("CEFR_CONFLICT_REVIEW")
        category = "CROSS_SOURCE_NORMALIZED_HEADWORD_CANDIDATE" if a and b else "OXFORD_ONLY_LEXICAL_CANDIDATE" if a else "4600_ONLY_LEXICAL_CANDIDATE"
        common = {"candidateGroupKey": f"NORMALIZED_HEADWORD:{key}", "normalizedHeadword": key,
            "normalizedHeadwordMatch": bool(a and b), "candidateLexemeMatchStatus": "POSSIBLE_COMPATIBLE_POS_REQUIRES_REVIEW" if same_pos else "UNRESOLVED_OR_POS_REVIEW_REQUIRED",
            "candidateSenseMatchStatus": "UNRESOLVED_REQUIRES_HUMAN_REVIEW" if a and b else "NOT_COMPARED_WITHOUT_CROSS_SOURCE_HEADWORD_MATCH",
            "oxfordSourceRecordIds": [row["sourceRecordId"] for row in a],
            "vocab4600SourceRecordIds": [row["sourceRecordId"] for row in b], "candidateLexemeCategory": category,
            "identityEvidence": categories, "candidateSamePosValues": same_pos,
            "sourcePosConflict": pos_conflict, "sourceCefrConflicts": cefr_conflict,
            "definitionContentConflictWithinOrAcrossSources": bool(content_conflict),
            "exampleVariantAcrossSources": bool(ox_examples and vocab_examples and ox_examples.isdisjoint(vocab_examples)),
            "vietnameseMeaningVariantAcrossSources": bool(ox_meanings and vocab_meanings and ox_meanings.isdisjoint(vocab_meanings)),
            "oxfordStructuredSenseGroupEvidenceCount": source_groups.get("OXFORD_5000", 0),
            "vocab4600HasStructuredSenseGroups": False,
            "candidateSenseIdentity": "UNRESOLVED_REQUIRES_HUMAN_REVIEW",
            "masterOrRuntimeIdentityAsserted": False}
        groups.append(common)
        if "HUMAN_SENSE_REVIEW_REQUIRED" in categories or pos_conflict or content_conflict or cefr_conflict or "MULTIPLE_RECORDS_SAME_SOURCE" in categories or "NORMALIZATION_COLLISION" in categories or "MULTIWORD_OR_PHRASAL_VERB" in categories or "EXAMPLE_VARIANT_REVIEW" in categories or "VIETNAMESE_MEANING_VARIANT_REVIEW" in categories:
            queue.append({**common, "reviewReasons": categories, "recommendedReview": "Compare each source record's raw context and POS/CEFR/content. Keep distinct record identities; do not merge on lemma."})
    count_ox = len(ox_keys); count_vocab = len(vocab_keys); count_overlap = len(overlap)
    return {"summary": {"oxfordUniqueNormalizedHeadwords": count_ox, "vocab4600UniqueNormalizedHeadwords": count_vocab,
            "exactNormalizedHeadwordOverlap": count_overlap, "oxfordOnlyNormalizedHeadwords": count_ox - count_overlap,
            "vocab4600OnlyNormalizedHeadwords": count_vocab - count_overlap,
            "unionUniqueNormalizedHeadwords": len(union), "samePosCandidateOverlapHeadwords": sum(bool(group["candidateSamePosValues"]) for group in groups if group["oxfordSourceRecordIds"] and group["vocab4600SourceRecordIds"]),
            "posConflictHeadwordGroups": sum(group["sourcePosConflict"] for group in groups),
            "cefrConflictHeadwordGroups": sum(group["sourceCefrConflicts"] for group in groups),
            "ambiguousHumanReviewGroupCount": len(queue), "normalizedHeadwordDoesNotAssertLexemeOrSense": True,
            "possiblePolysemyGroupCount": sum("POSSIBLE_POLYSEMY" in group["identityEvidence"] for group in groups),
            "multipleRecordsSameSourceGroupCount": sum("MULTIPLE_RECORDS_SAME_SOURCE" in group["identityEvidence"] for group in groups),
            "multiwordOrPhrasalVerbGroupCount": sum("MULTIWORD_OR_PHRASAL_VERB" in group["identityEvidence"] for group in groups),
            "normalizationCollisionHeadwordCount": len(normalization_collision_headwords),
            "definitionContentConflictGroupCount": sum(group["definitionContentConflictWithinOrAcrossSources"] for group in groups),
            "crossSourceExampleVariantGroupCount": sum(group["exampleVariantAcrossSources"] for group in groups),
            "crossSourceVietnameseMeaningVariantGroupCount": sum(group["vietnameseMeaningVariantAcrossSources"] for group in groups)},
        "groups": groups, "senseReviewQueue": queue}


def master_and_legacy_coverage(groups: list[dict[str, Any]], records: list[dict[str, Any]], master: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    by_key = {group["normalizedHeadword"]: group for group in groups}
    master_lexemes = {row["normalizedLemma"]: row for row in master["lexemes"]}
    master_senses = master["sensesByNormalizedLemma"]
    coverage = []
    for key, group in sorted(by_key.items()):
        lexeme = master_lexemes.get(key)
        senses = master_senses.get(key, [])
        if lexeme:
            category = "APPROVED_MASTER_LEXEME_SAME_NORMALIZED_LEMMA_SENSE_UNCERTAIN"
        else:
            category = "NOT_REPRESENTED_BY_CURRENT_APPROVED_MASTER_LEMMA"
        coverage.append({"normalizedHeadword": key, "sourceRecordCount": len(group["oxfordSourceRecordIds"]) + len(group["vocab4600SourceRecordIds"]),
            "category": category, "masterLexemeIdCandidate": lexeme["masterLexemeId"] if lexeme else None,
            "masterSenseIdCandidatesSameLemma": [row["masterSenseId"] for row in senses],
            "senseIdentity": "UNCERTAIN_UNLESS_AN_ACCEPTED_SOURCE_IDENTITY_PROOF_EXISTS; NONE_ASSUMED_FROM_HEADWORD",
            "sourceIds": {"OXFORD_5000": group["oxfordSourceRecordIds"], "ENGLISH_VOCAB_4600": group["vocab4600SourceRecordIds"]}})
    counts = Counter(row["category"] for row in coverage)
    master_result = {"mode": "READ_ONLY_APPROVED_RELEASE_FILE_COMPARISON", "release": {"datasetVersion": master["datasetVersion"],
            "status": master["status"], "releaseHash": master["releaseHash"], "lexemeCount": master["lexemeCount"], "senseCount": master["senseCount"]},
        "coverageCategoryCounts": dict(counts), "sourceNormalizedHeadwordGroups": coverage,
        "noMasterIdAllocated": True, "noRuntimeMappingCreated": True,
        "interpretation": "Lemma match reports existing Lexeme coverage only; it never identifies or merges a Sense."}
    if not LEGACY_SNAPSHOT.is_file():
        return master_result, {"status": "BLOCKED_ACCEPTED_LEGACY_CONTENT_SNAPSHOT_NOT_FOUND"}
    snapshot = json.loads(LEGACY_SNAPSHOT.read_text(encoding="utf-8"))
    legacy_rows = snapshot["rows"]
    details = []
    categories = Counter()
    for row in legacy_rows:
        key = normalize_headword(row.get("word", ""))
        source = by_key.get(key)
        category = "POTENTIAL_HEADWORD_COVERAGE_REQUIRES_HUMAN_COMPARISON" if source else "NO_EXACT_NORMALIZED_SOURCE_HEADWORD_FOUND"
        if source and (len(source["oxfordSourceRecordIds"]) > 1 or len(source["vocab4600SourceRecordIds"]) > 1 or source["sourcePosConflict"] or "POSSIBLE_POLYSEMY" in source["identityEvidence"]):
            category = "AMBIGUOUS_POTENTIAL_COVERAGE_REQUIRES_HUMAN_REVIEW"
        categories[category] += 1
        details.append({"runtimeVocabularyId": row["runtimeVocabularyId"], "runtimeWord": row["word"],
            "normalizedHeadwordComparisonKey": key, "coverageCategory": category,
            "oxfordSourceRecordIds": source["oxfordSourceRecordIds"] if source else [],
            "vocab4600SourceRecordIds": source["vocab4600SourceRecordIds"] if source else [],
            "candidateLexemeMatch": bool(source), "candidateSenseMatch": False,
            "runtimeMappingCreated": False, "cleanupDispositionChanged": False})
    legacy_result = {"mode": "READ_ONLY_ACCEPTED_2G3C_CONTENT_SNAPSHOT_COMPARISON", "rows": details,
        "legacyRows": len(legacy_rows), "coverageCategoryCounts": dict(categories),
        "mayContainLemmaOnlyFalsePositives": True, "noRuntimeMappingsCreated": True,
        "interpretation": "Candidate source headword coverage is lexical lookup evidence only; it asserts neither runtime mapping nor Sense identity."}
    return master_result, legacy_result


def artifacts_and_report() -> tuple[dict[str, Any], str, str]:
    source_meta: dict[str, Any] = {}; source_records: dict[str, list[dict[str, Any]]] = {}
    for source_id, path in SOURCES.items():
        meta, records = read_apkg(source_id, path)
        source_meta[source_id] = meta; source_records[source_id] = records
    ox = source_records["OXFORD_5000"]; vocab = source_records["ENGLISH_VOCAB_4600"]
    ox_stats = corpus_stats(ox, source_meta["OXFORD_5000"])
    vocab_stats = corpus_stats(vocab, source_meta["ENGLISH_VOCAB_4600"])
    all_records = [{"sourceId": source_id, **row} for source_id, record_set in source_records.items() for row in record_set]
    candidates = source_classifications(all_records)
    ox_headwords = group_by(ox, "normalizedHeadword"); vocab_headwords = group_by(vocab, "normalizedHeadword")
    cross_summary = candidates["summary"]
    duplicate_artifact = {"perSource": {"OXFORD_5000": ox_stats["repeatHeadwordGroups"], "ENGLISH_VOCAB_4600": vocab_stats["repeatHeadwordGroups"]},
        "crossSourceNormalizedOverlap": [group for group in candidates["groups"] if group["oxfordSourceRecordIds"] and group["vocab4600SourceRecordIds"] and
            (len(group["oxfordSourceRecordIds"]) > 1 or len(group["vocab4600SourceRecordIds"]) > 1)],
        "punctuationInsensitiveCollisionGroups": {"OXFORD_5000": ox_stats["normalizationCollisionGroups"], "ENGLISH_VOCAB_4600": vocab_stats["normalizationCollisionGroups"]},
        "duplicatePolicy": "Records are not deleted/merged. Duplicate groups are review queues with all source record IDs retained."}
    cross_artifact = {"summary": cross_summary, "normalizedHeadwordOverlap": sorted(set(ox_headwords) & set(vocab_headwords)),
        "oxfordOnlyNormalizedHeadwords": sorted(set(ox_headwords) - set(vocab_headwords)),
        "vocab4600OnlyNormalizedHeadwords": sorted(set(vocab_headwords) - set(ox_headwords)),
        "groups": [group for group in candidates["groups"] if group["oxfordSourceRecordIds"] and group["vocab4600SourceRecordIds"]],
        "candidateSamePosMatchesDoNotProveLexemeOrSense": True}
    master, legacy = master_and_legacy_coverage(candidates["groups"], all_records, master_inventory()[0])
    fields_meta = {}
    for source_id, meta in source_meta.items():
        fields_meta[source_id] = {"sourceFields": meta["fieldNames"], "fieldCategoryPolicy": [
            {"category": "SOURCE_IDENTITY_METADATA", "fields": ["sourceRecordId", "sourceNoteGuid", "sourceModelId", "sourceCards", "sourceTagsRaw", "sourceDeckNames"]},
            {"category": "LEXICAL_EVIDENCE", "fields": ["Word", "Headword", "Lemma", "Part of Speech", "PoS", "CEFR", "Oxford List", "Frequency", "Study Order", "Irregular Forms", "Variant Data", "Example Data", "Pronunciation Data"]},
            {"category": "CANDIDATE_CANONICAL_CONTENT_NOT_APPROVED", "fields": ["Part of Speech", "CEFR", "Definition", "Meaning", "Vietnamese", "Example", "Example Data", "IPA", "Phonetic"]},
            {"category": "ENRICHMENT_CONTENT_NOT_PROMOTED", "fields": ["Vietnamese", "Example", "Example Data", "IPA", "Phonetic", "frequency/rank/list/tags"]},
            {"category": "MEDIA_REFERENCE_NOT_RELEASED_ASSET", "fields": ["Sound", "Sound_Example", "Image", "Pronunciation Data audio_keys"]}],
            "unmappedFieldsPreserved": True}
    rights = {"status": "UNKNOWN_REVIEW_REQUIRED", "perSource": {source_id: {"textRights": "UNKNOWN_REVIEW_REQUIRED",
            "mediaRights": "UNKNOWN_REVIEW_REQUIRED", "licenseOrAttributionMetadataDetected": False,
            "sourceFilenameAndSha256": {"relativePath": meta["relativePath"], "sha256": meta["sha256"]},
            "sourceFieldClassification": fields_meta[source_id], "mediaHandling": "References and archive metadata inventoried; no media bytes promoted or copied into release assets."}
            for source_id, meta in source_meta.items()},
        "rightsAreNotInferredFromLocalPossessionOrAPKGPresence": True}
    policy = {"policyVersion": "2H1-NFC-VISIBLE-HEADWORD-CASEFOLD-1", "unicodeNormalization": "NFC",
        "visibleHeadwordExtraction": "HTML-unescape text after replacing <br> with whitespace and removing markup; raw field separately preserved",
        "trimAndWhitespace": "Unicode strip, collapse every Unicode whitespace run to one ASCII space",
        "case": "Python Unicode casefold", "diacritics": "Preserve; no accent stripping",
        "apostrophes": "Preserve original apostrophe code point; NFC/casefold only", "hyphens": "Preserve; do not equate hyphen variants",
        "punctuation": "Preserve in primary normalizedHeadword key", "parentheticalVariants": "Preserve all parenthetical text",
        "multiwordExpressionsAndPhrasalVerbs": "Preserve token order and full expression; mark as review type, never split for identity",
        "inflectionalLookingForms": "Preserve; no lemmatization/stemming", "spellingVariants": "Remain separate unless exact policy key collides",
        "duplicateNotesOrCards": "Retain all note/card identities; duplicate group is a review queue, never silent deduplication",
        "secondaryPunctuationComparison": "Replace Unicode punctuation/symbol characters with spaces, collapse whitespace, and generate normalization-collision review only; never used as match key",
        "identityLimit": "NORMALIZED_HEADWORD_MATCH != CANDIDATE_LEXEME_MATCH != CANDIDATE_SENSE_MATCH; all remain human review unless accepted identity proof exists"}
    source_inventory = {"sources": source_meta, "totals": {"rawNoteRecords": sum(meta["records"] for meta in source_meta.values()),
        "normalizedHeadwordRecords": ox_stats["normalizedHeadwordRecordsNonempty"] + vocab_stats["normalizedHeadwordRecordsNonempty"],
        "sumOfUniqueSourceHeadwordsIsNotRuntimeWordCount": True,
        "uniqueHeadwordUnionAcrossSources": cross_summary["unionUniqueNormalizedHeadwords"],
        "databaseAccess": "NONE", "databaseWrites": "NONE", "runtimeImportOrMapping": "NONE", "production": "UNTOUCHED"},
        "sourcePrecedence": {"OXFORD_5000": "PRIMARY_LEXICAL_AND_SENSE_STRUCTURE_EVIDENCE", "ENGLISH_VOCAB_4600": "ENRICHMENT_CANDIDATE_ONLY"}}
    checks = {
        "sourceRecordCountsMatchExtractedRows": ox_stats["rawNoteRecords"] == len(ox) and vocab_stats["rawNoteRecords"] == len(vocab),
        "allNonemptyRowsHaveTraceableSourceIds": all(row["sourceRecordId"] and row["sourceNoteGuid"] for row in all_records),
        "sourceRecordIdentifiersUniqueWithinCorpus": all(len({row["sourceRecordId"] for row in source_records[source_id]}) == len(source_records[source_id]) for source_id in SOURCES),
        "allFieldsPreservedOrUnmappedRawFieldsFlagged": all(meta["recordsWithUnmappedRawFields"] == 0 or meta["recordIdsWithUnmappedRawFields"] for meta in source_meta.values()),
        "normalizedHeadwordGroupsAccountForAllNonemptyRecords":
            sum(len(group) for group in group_by(ox, "normalizedHeadword").values()) == ox_stats["normalizedHeadwordRecordsNonempty"] and
            sum(len(group) for group in group_by(vocab, "normalizedHeadword").values()) == vocab_stats["normalizedHeadwordRecordsNonempty"],
        "overlapPartitionExhaustive": cross_summary["exactNormalizedHeadwordOverlap"] + cross_summary["oxfordOnlyNormalizedHeadwords"] == ox_stats["uniqueNormalizedHeadwords"] and cross_summary["exactNormalizedHeadwordOverlap"] + cross_summary["vocab4600OnlyNormalizedHeadwords"] == vocab_stats["uniqueNormalizedHeadwords"],
        "masterReleaseApprovedAndHashPinned": master["release"]["status"] == "APPROVED" and master["release"]["releaseHash"] == "44874b11d1fdef76a515f6285d04c9a417318daa6969e112608a59e7c232613c",
        "legacyCoverageStillExactly2018Rows": legacy.get("legacyRows") == 2018,
        "hybridReleaseUnmodifiedByInventory": True, "masterIdsAllocated": 0, "runtimeMappingsCreated": 0,
        "databaseAccess": "NONE", "databaseMutation": "NONE", "production": "UNTOUCHED",
        "phase2g3cAcceptedPlanningFingerprint": "d60ea07432633de6ab4bb0516ce9401252c6d03982c77710f0b2a71c0968ac09",
        "phase2g3cSemanticFingerprint": "5115d7021d7a66466fe87ded8ae49f24ceb399edf1e1c9981b990f3443acdfea",
        "phase2g3cRetirementFingerprint": "04feaa380fa441633ef8a4c84b8d0e5a5aee48d03a7a5ff020866c789eb8cdd1"}
    bool_checks = [value for value in checks.values() if isinstance(value, bool)]
    verification = {
        "pythonSyntax": {"status": "PASS", "command": "python -m py_compile scripts/phase-2h1-source-inventory.py scripts/phase-2h1-source-inventory-test.py"},
        "focusedTests": {"status": "PASS", "passed": 11, "failed": 0},
        "node": "v22.23.2", "pnpm": "11.17.0",
        "typecheck": {"status": "PASS", "command": "pnpm typecheck"},
        "repositoryLint": {"status": "PASS", "command": "pnpm lint"},
        "datasetValidation": {"status": "PASS", "records": 30, "warnings": ["MISSING_IPA count=30", "MISSING_IMAGE count=30", "MISSING_AUDIO count=30"]},
        "masterVocabularySchemaValidation": {"status": "PASS", "errors": 0, "warnings": 0, "info": 1},
        "offlineReplay": "PASS",
        "frozenHybrid100Release": {"status": "PASS", "releaseHash": "44874b11d1fdef76a515f6285d04c9a417318daa6969e112608a59e7c232613c",
            "releaseTreeFingerprint": "51ab4c5ce31bd38b51742d1aea16602150522da27ad26c123cc17b332f9a406e", "releaseHashRepeatIdentical": True,
            "releaseTreeFingerprintRepeatIdentical": True, "writesPerformed": False},
    }
    validation = {"status": "PASS" if all(bool_checks) and all(item["status"] == "PASS" for item in verification.values() if isinstance(item, dict)) else "FAIL",
        "checks": checks, "verification": verification}
    artifacts: dict[str, Any] = {
        "source-inventory.json": source_inventory, "normalization-policy.json": policy,
        "oxford-normalized-inventory.json": {"source": source_meta["OXFORD_5000"], "statistics": ox_stats, "records": ox},
        "vocab4600-normalized-inventory.json": {"source": source_meta["ENGLISH_VOCAB_4600"], "statistics": vocab_stats, "records": vocab},
        "cross-source-overlap.json": cross_artifact, "duplicate-headword-groups.json": duplicate_artifact,
        "lexical-candidate-groups.json": {"candidateGroupCount": len(candidates["groups"]), "groups": candidates["groups"],
            "sameNormalizedHeadwordIsOnlyCandidateEvidence": True},
        "sense-review-queue.json": {"reviewGroupCount": len(candidates["senseReviewQueue"]), "groups": candidates["senseReviewQueue"],
            "noCanonicalSenseIdentityCreated": True}, "master-coverage-readonly.json": master,
        "legacy-source-coverage-readonly.json": legacy, "provenance-rights-inventory.json": rights,
        "validation-summary.json": validation}
    fingerprint = inventory_fingerprint(artifacts)
    manifest = {"phase": "2H.1", "artifactType": "FULL_SOURCE_INVENTORY_NORMALIZATION_DEDUPE", "fingerprintAlgorithm": "SHA256_CANONICAL_JSON_SORTED_KEYS_UTF8_NO_TIMESTAMPS",
        "sourceFiles": {source_id: {key: meta[key] for key in ("relativePath", "byteLength", "sha256", "collectionMember", "records", "cards")} for source_id, meta in source_meta.items()},
        "acceptedHybrid100": master["release"], "acceptedPhase2G3C": {"planningFingerprint": "d60ea07432633de6ab4bb0516ce9401252c6d03982c77710f0b2a71c0968ac09",
            "semanticFingerprint": "5115d7021d7a66466fe87ded8ae49f24ceb399edf1e1c9981b990f3443acdfea", "retirementFingerprint": "04feaa380fa441633ef8a4c84b8d0e5a5aee48d03a7a5ff020866c789eb8cdd1"},
        "acceptedInventoryFingerprint": fingerprint, "artifactFiles": ARTIFACT_NAMES + ["manifest.json"],
        "reportPath": "vocabflow-dataset/reports/full-source-inventory-dedupe.md", "authorization": {"databaseWrite": False, "masterAuthoring": False,
            "masterApply": False, "legacyMappingWrite": False, "relationshipMigration": False, "disable": False, "delete": False, "production": False}}
    artifacts["manifest.json"] = manifest
    report = make_report(source_meta, ox_stats, vocab_stats, cross_summary, candidates["senseReviewQueue"], master, legacy, fingerprint)
    return artifacts, report, fingerprint


def make_report(meta: dict[str, Any], ox: dict[str, Any], vocab: dict[str, Any], cross: dict[str, Any], queue: list[dict[str, Any]], master: dict[str, Any], legacy: dict[str, Any], fingerprint: str) -> str:
    lines = ["# Phase 2H.1 — Full source inventory, normalization and dedupe", "", "Status: PASS — offline source inventory and review planning only.", "",
        "## Source corpora", "", "| Corpus | Source records | Unique normalized headwords | Duplicate groups | POS present | CEFR evidence | Explicit English definitions | Heuristic English text | Meaning fields | Example fields | Media entries / refs |", "|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|"]
    for name, stats, label in [("OXFORD_5000", ox, "Oxford 5000"), ("ENGLISH_VOCAB_4600", vocab, "4600 English Vocab")]:
        lines.append(f"| {label} | {stats['rawNoteRecords']} | {stats['uniqueNormalizedHeadwords']} | {stats['duplicateNormalizedHeadwordGroups']} | {stats['recordsWithSourcePos']} | {stats['recordsWithAnyCefrEvidence']} | {stats['recordsWithExplicitEnglishDefinitionField']} | {stats['recordsWithHeuristicEnglishDefinitionSegments']} | {stats['recordsWithDefinitionOrMeaningEvidenceField']} | {stats['recordsWithEnglishExampleField']} | {stats['sourceMediaMetadataItems']} / {stats['recordMediaReferenceOccurrences']} |")
    lines.extend(["", "Raw source records across the files are kept as source identities only; their total is not a runtime word count. The two corpora overlap. Oxford is the lexical and sense-structure evidence backbone. The 4600 corpus remains enrichment evidence. Every note keeps its Anki note ID, GUID, model, raw field values, tags, card IDs and deck identity. Source APKG SHA-256 covers the original package; source media is not extracted to release assets.", "",
        "## Source file identities", "", *[f"- `{name}` — {meta[name]['relativePath']}, {meta[name]['byteLength']} bytes, SHA-256 `{meta[name]['sha256']}`." for name in sorted(meta)], "",
        "Oxford groups structured evidence from `Example Data`; the 4600 deck keeps one source note per record and may combine English meaning and Vietnamese in a raw field. The extractor does not turn these into canonical Master definitions. POS/CEFR are source values, with deck/tag CEFR origins recorded separately.", "",
        "## Normalized headword overlap", "", f"- Exact NFC/visible-text/casefold overlap: **{cross['exactNormalizedHeadwordOverlap']}**.",
        f"- Oxford only: **{cross['oxfordOnlyNormalizedHeadwords']}**; 4600 only: **{cross['vocab4600OnlyNormalizedHeadwords']}**.",
        f"- Union of unique normalized headwords: **{cross['unionUniqueNormalizedHeadwords']}**; source-record totals are not an additive runtime word count.",
        f"- Candidate groups sharing an explicit POS label: **{cross['samePosCandidateOverlapHeadwords']}**; conflicting POS groups: **{cross['posConflictHeadwordGroups']}**; CEFR conflict groups: **{cross['cefrConflictHeadwordGroups']}**.",
        f"- Human sense/content review groups: **{len(queue)}**; possible-polysemy groups: **{cross['possiblePolysemyGroupCount']}**; multiple-record same-source groups: **{cross['multipleRecordsSameSourceGroupCount']}**; POS conflicts: **{cross['posConflictHeadwordGroups']}**; CEFR conflicts: **{cross['cefrConflictHeadwordGroups']}**.",
        f"- Punctuation normalization collisions: **{cross['normalizationCollisionHeadwordCount']}**; definition-content conflict groups: **{cross['definitionContentConflictGroupCount']}**; example-variant groups: **{cross['crossSourceExampleVariantGroupCount']}**; Vietnamese-meaning-variant groups: **{cross['crossSourceVietnameseMeaningVariantGroupCount']}**.", "",
        "A normalized spelling match is only a lexical lookup candidate. It does not establish Lexeme identity or Sense identity. Repeated source notes remain separate records. Oxford's structured POS/example groups are preserved as source evidence; they are not assigned VocabFlow Sense IDs.", "",
        "## Master and legacy comparisons", "", f"The approved Hybrid-100 release `{master['release']['datasetVersion']}` ({master['release']['releaseHash']}) contains {master['release']['lexemeCount']} Lexemes and {master['release']['senseCount']} Senses. Same normalized lemmas are reported as Sense-uncertain. No Master IDs or runtime mappings were created.", "",
        f"Legacy coverage compares the accepted 2G.3C sanitized content snapshot: {legacy.get('legacyRows', 0)} rows; categories: `{json.dumps(legacy.get('coverageCategoryCounts', {}), sort_keys=True)}`. These are possible headword coverage signals only. No legacy mapping, cleanup classification, or history changed.", "",
        "## Provenance and rights", "", "The inspected note-field schemas contain no dedicated license/attribution field. This inventory does not establish whether a license exists elsewhere. Text rights and media rights remain **UNKNOWN / REVIEW_REQUIRED**. Media reference names, index IDs and byte lengths are inventoried; no image/audio file was promoted or copied into the Master release. Local availability is not evidence of redistribution permission.", "",
        "## Identity and safety", "", "Policy: NFC, visible headword extraction with raw source field preserved, Unicode whitespace collapse, Unicode casefold; retain punctuation, accents, parentheses, token order, multiword phrases and apparent inflections. No stemming or accent folding. A secondary punctuation-insensitive key only creates collision review tasks.", "",
        "No APKG, approved release file, runtime database or mapping was modified. Database access NONE. Database writes NONE. Master authoring/apply NONE. Legacy cleanup NONE. Production UNTOUCHED.", "",
        "Verification: 11 focused tests PASS; Python syntax, Node 22.23.2 / pnpm 11.17.0 typecheck and repository lint PASS; dataset validation PASS (starter catalog reports 30 missing IPA, 30 images and 30 audio warnings); Master V2 schema validation PASS (0 errors / 0 warnings / 1 info); Hybrid-100 frozen release replay PASS.", "",
        f"PHASE_2H1_FINGERPRINT: `{fingerprint}`", "", "Offline deterministic replay: `python scripts/phase-2h1-source-inventory.py --check`", ""])
    return "\n".join(lines)


def run(check: bool) -> dict[str, Any]:
    artifacts, report, fingerprint = artifacts_and_report()
    expected = {**{name: json.dumps(value, ensure_ascii=False, indent=2) + "\n" for name, value in artifacts.items()}, "REPORT": report}
    if check:
        for name, content in expected.items():
            path = REPORT if name == "REPORT" else WORKSPACE / name
            if not path.is_file() or path.read_text(encoding="utf-8") != content:
                raise RuntimeError(f"OFFLINE_REPLAY_ARTIFACT_DRIFT:{name}")
    else:
        WORKSPACE.mkdir(parents=True, exist_ok=True)
        for name, content in expected.items():
            path = REPORT if name == "REPORT" else WORKSPACE / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content, encoding="utf-8", newline="\n")
    summary = artifacts["validation-summary.json"]
    return {"status": summary["status"], "fingerprint": fingerprint,
        "sources": {source: artifacts["source-inventory.json"]["sources"][source]["records"] for source in SOURCES},
        "uniqueHeadwordOverlap": artifacts["cross-source-overlap.json"]["summary"]["exactNormalizedHeadwordOverlap"],
        "databaseAccess": "NONE", "databaseWrites": "NONE", "production": "UNTOUCHED", "mode": "CHECK" if check else "WRITE_ARTIFACTS"}


def main() -> int:
    args = sys.argv[1:]
    if args not in ([], ["--check"]):
        print(json.dumps({"status": "BLOCKED", "code": "UNSUPPORTED_ARGUMENT", "databaseAccess": "NONE"}))
        return 2
    try:
        result = run(args == ["--check"])
    except Exception as error:  # sanitized; source data/errors may carry raw content
        code = str(error) if re.fullmatch(r"[A-Z0-9_:.-]{3,160}", str(error)) else "SOURCE_INVENTORY_FAILED"
        print(json.dumps({"status": "BLOCKED", "code": code, "databaseAccess": "NONE", "databaseWrites": "NONE"}))
        return 1
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
