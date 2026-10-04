#!/usr/bin/env python3
"""Build a sanitized, deterministic offline APKG source-candidate proof."""

from __future__ import annotations

import argparse
import collections
import hashlib
import html.parser
import json
import re
import sqlite3
import sys
import unicodedata
import zipfile
from pathlib import Path
from typing import Any, Iterable


PARSER_CONTRACT_VERSION = "APKG-SOURCE-PROOF-3"
NORMALIZATION_POLICY_VERSION = "NFKC-HTMLTEXT-EN-CASEFOLD-1"
SELECTION_POLICY_VERSION = "HYBRID-100-STRATIFIED-2"
ALGORITHM_VERSION = "HYBRID-SENSE-ALIGNMENT-3"
EXPECTED_FILES = {
    "oxford": "5000_T_vng_Ting_Anh_Oxford_5000_A1-C1.apkg",
    "vocab4600": "4600 English Vocab.apkg",
}
CEFR_ORDER = ("A1", "A2", "B1", "B2", "C1")
POS_ORDER = ("NOUN", "VERB", "ADJECTIVE", "ADVERB")
POS_ALIASES = {
    "N": "NOUN", "NOUN": "NOUN", "V": "VERB", "VERB": "VERB",
    "AUX": "VERB", "AUXILIARY VERB": "VERB", "MODAL VERB": "VERB",
    "ADJ": "ADJECTIVE", "ADJECTIVE": "ADJECTIVE", "ADV": "ADVERB", "ADVERB": "ADVERB",
    "PREP": "PREPOSITION", "PREPOSITION": "PREPOSITION", "PRONOUN": "PRONOUN",
    "DETER": "DETERMINER", "DETERMINER": "DETERMINER", "CONJ": "CONJUNCTION",
    "CONJUNCTION": "CONJUNCTION", "EXCLAM": "INTERJECTION", "EXCLA": "INTERJECTION",
    "INTERJECTION": "INTERJECTION", "NUMBER": "OTHER", "ARTICLE": "DETERMINER",
    "DEFINITE ARTICLE": "DETERMINER", "INDEFINITE ARTICLE": "DETERMINER",
    "INFINITIVE MARKER": "OTHER", "OTHER": "OTHER",
}
STOP_WORDS = {
    "a", "an", "the", "and", "or", "of", "to", "in", "on", "at", "by", "for", "from",
    "with", "as", "is", "are", "be", "been", "being", "it", "its", "this", "that", "someone",
    "something", "one", "which", "who", "what", "when", "where", "how", "used", "use", "việc",
    "một", "của", "cho", "và", "là", "được", "có", "trong", "với", "để", "người", "cái",
}
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".tif", ".tiff", ".svg"}
AUDIO_EXTENSIONS = {".mp3", ".wav", ".ogg", ".oga", ".opus", ".m4a", ".aac", ".flac", ".wma"}
DB_MEMBER_CANDIDATES = ("collection.anki21b", "collection.anki21", "collection.anki2")
FIELD_SEPARATOR = "\x1f"


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha256_text(value: str) -> str:
    return sha256_bytes(value.encode("utf-8"))


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def _jcs_key(value: str) -> bytes:
    return value.encode("utf-16-be", errors="surrogatepass")


def canonical_json(value: Any) -> str:
    """RFC 8785-compatible serialization for this integer/string-only proof."""
    if value is None or isinstance(value, (str, bool, int)):
        return json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    if isinstance(value, float):
        raise TypeError("Proof fingerprint payload must not contain floating-point values.")
    if isinstance(value, list):
        return "[" + ",".join(canonical_json(item) for item in value) + "]"
    if isinstance(value, dict):
        entries = sorted(value.items(), key=lambda item: _jcs_key(str(item[0])))
        return "{" + ",".join(
            canonical_json(str(key)) + ":" + canonical_json(item)
            for key, item in entries
        ) + "}"
    raise TypeError(f"Unsupported fingerprint value: {type(value).__name__}")


def canonical_sha256(value: Any) -> str:
    return sha256_text(canonical_json(value))


class _TextExtractor(html.parser.HTMLParser):
    BLOCK_TAGS = {"br", "div", "p", "li", "td", "tr", "section", "article", "h1", "h2", "h3"}

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self._skip_depth = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() in {"script", "style"}:
            self._skip_depth += 1
        elif not self._skip_depth and tag.lower() in self.BLOCK_TAGS:
            self.parts.append(" ")

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() in {"script", "style"} and self._skip_depth:
            self._skip_depth -= 1
        elif not self._skip_depth and tag.lower() in self.BLOCK_TAGS:
            self.parts.append(" ")

    def handle_data(self, data: str) -> None:
        if not self._skip_depth:
            self.parts.append(data)


def html_to_text(value: str | None) -> str:
    parser = _TextExtractor()
    try:
        parser.feed(value or "")
        parser.close()
        text = "".join(parser.parts)
    except Exception:
        text = re.sub(r"<[^>]*>", " ", value or "")
    return " ".join(unicodedata.normalize("NFKC", text).split()).strip()


def has_html_noise(value: str | None) -> bool:
    return bool(value and re.search(r"<\s*/?\s*[A-Za-z][^>]*>|&(?:nbsp|amp|lt|gt|quot|#\d+);", value, re.I))


def normalize_lemma(value: str | None) -> str:
    # NFKC plus casefold is the stable English matching key. Punctuation stays intact.
    return " ".join(unicodedata.normalize("NFKC", html_to_text(value)).casefold().split())


def _field(record: dict[str, Any], name: str) -> str:
    value = record.get("fields", {}).get(name, "")
    return value if isinstance(value, str) else ""


def _safe_json_field(value: str) -> Any:
    try:
        return json.loads(value)
    except (TypeError, json.JSONDecodeError):
        try:
            return json.loads(html_to_text(value))
        except (TypeError, json.JSONDecodeError):
            return None


def _pos_codes(value: str | None) -> list[str]:
    if not value:
        return []
    normalized = unicodedata.normalize("NFKC", html_to_text(value)).upper()
    pieces = re.split(r"[,;/|]+|\s+AND\s+", normalized)
    result: list[str] = []
    for piece in pieces:
        key = " ".join(piece.split()).strip(" .()[]")
        if not key:
            continue
        code = POS_ALIASES.get(key)
        if code and code not in result:
            result.append(code)
    return result


def _detect_media_type(prefix: bytes, declared_name: str) -> str:
    ext = Path(declared_name).suffix.lower()
    if prefix.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if prefix.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if prefix.startswith((b"GIF87a", b"GIF89a")):
        return "image/gif"
    if prefix.startswith(b"RIFF") and prefix[8:12] == b"WEBP":
        return "image/webp"
    if prefix.startswith(b"BM"):
        return "image/bmp"
    if prefix.startswith(b"ID3") or (len(prefix) >= 2 and prefix[0] == 0xFF and prefix[1] & 0xE0 == 0xE0):
        return "audio/mpeg"
    if prefix.startswith(b"RIFF") and prefix[8:12] == b"WAVE":
        return "audio/wav"
    if prefix.startswith(b"OggS"):
        return "audio/ogg"
    if prefix.startswith(b"fLaC"):
        return "audio/flac"
    if ext in IMAGE_EXTENSIONS:
        return "image/unknown"
    if ext in AUDIO_EXTENSIONS:
        return "audio/unknown"
    return "application/octet-stream"


def _source_note_ref(source_hash: str, guid: str) -> str:
    return "NOTE-" + sha256_text(source_hash + "\0" + guid)


def _raw_cache_write(cache_root: Path | None, key: str, source: dict[str, Any], records: list[dict[str, Any]]) -> None:
    if cache_root is None:
        return
    target_dir = cache_root / key
    target_dir.mkdir(parents=True, exist_ok=True)
    cache_manifest = {
        "source": source,
        "parserContractVersion": PARSER_CONTRACT_VERSION,
        "modelNames": sorted({record["modelName"] for record in records}),
        "fieldNames": sorted({field for record in records for field in record["fields"]}),
        "containsRawSourceText": True,
        "tracked": False,
    }
    (target_dir / "cache-manifest.json").write_text(json.dumps(cache_manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    with (target_dir / "raw-notes.jsonl").open("w", encoding="utf-8", newline="\n") as output:
        for record in records:
            output.write(json.dumps(record, ensure_ascii=False, sort_keys=True) + "\n")


def extract_apkg(path: Path, key: str, cache_root: Path | None = None) -> dict[str, Any]:
    if not path.is_file():
        raise FileNotFoundError(f"Required APKG source is missing: {path.name}")
    source_hash = sha256_file(path)
    source = {"basename": path.name, "sizeBytes": path.stat().st_size, "sha256": source_hash}
    try:
        archive = zipfile.ZipFile(path)
    except (OSError, zipfile.BadZipFile) as error:
        raise ValueError(f"APKG archive could not be opened: {path.name}") from error
    with archive:
        infos = {item.filename: item for item in archive.infolist()}
        db_name = next((name for name in DB_MEMBER_CANDIDATES if name in infos), None)
        if db_name is None:
            raise ValueError(f"APKG has no supported collection database: {path.name}")
        media_manifest_name = "media" if "media" in infos else "media.json" if "media.json" in infos else None
        media_map: dict[str, str] = {}
        if media_manifest_name:
            try:
                parsed_media = json.loads(archive.read(media_manifest_name))
                if isinstance(parsed_media, dict):
                    media_map = {str(index): str(filename) for index, filename in parsed_media.items()}
            except (json.JSONDecodeError, UnicodeDecodeError):
                raise ValueError(f"APKG media map is invalid: {path.name}")
        db_bytes = archive.read(db_name)
        connection = sqlite3.connect(":memory:")
        try:
            connection.deserialize(db_bytes)
            columns = {row[1] for row in connection.execute("PRAGMA table_info(col)")}
            if "models" not in columns:
                raise ValueError(f"APKG collection has no model metadata: {path.name}")
            models_raw = connection.execute("SELECT models FROM col").fetchone()
            models = json.loads(models_raw[0]) if models_raw and models_raw[0] else {}
            col_columns = [row[1] for row in connection.execute("PRAGMA table_info(col)")]
            col_row = connection.execute("SELECT * FROM col LIMIT 1").fetchone()
            collection_metadata_text = [str(value) for value in col_row if isinstance(value, str)] if col_row else []
            model_by_id = {str(model.get("id")): model for model in models.values() if isinstance(model, dict)}
            model_names = sorted({str(model.get("name", "")) for model in model_by_id.values()})
            field_names = sorted({str(field.get("name", "")) for model in model_by_id.values() for field in model.get("flds", []) if isinstance(field, dict)})
            note_rows = connection.execute("SELECT id, guid, mid, flds FROM notes ORDER BY id").fetchall()
            card_count = connection.execute("SELECT COUNT(*) FROM cards").fetchone()[0]
        finally:
            connection.close()

        records: list[dict[str, Any]] = []
        for note_id, guid, model_id, field_blob in note_rows:
            model = model_by_id.get(str(model_id))
            if model is None:
                continue
            definitions = model.get("flds", [])
            values = str(field_blob or "").split(FIELD_SEPARATOR)
            fields = {
                str(definition.get("name", f"field-{index}")): values[index] if index < len(values) else ""
                for index, definition in enumerate(definitions) if isinstance(definition, dict)
            }
            records.append({
                "sourceNoteId": int(note_id),
                "sourceNoteGuid": str(guid),
                "modelId": str(model_id),
                "modelName": str(model.get("name", "")),
                "fields": fields,
            })

        note_fields = {name.lower(): name for name in field_names}
        word_field = note_fields.get("word")
        normalized_heads = [normalize_lemma(_field(record, word_field)) for record in records] if word_field else []
        nonempty_heads = [word for word in normalized_heads if word]
        head_counts = collections.Counter(nonempty_heads)
        duplicate_groups = sum(1 for count in head_counts.values() if count > 1)

        media_infos = {
            name: info for name, info in infos.items()
            if name not in {db_name, media_manifest_name} and not name.endswith("/")
        }
        resolved_map_keys = {key for key in media_map if key in media_infos}
        actual_images = actual_audio = other_media = 0
        extension_counts: collections.Counter[str] = collections.Counter()
        for member_name, info in media_infos.items():
            extension_counts[Path(member_name).suffix.lower() or "[none]"] += 1
            with archive.open(member_name) as media_stream:
                mime = _detect_media_type(media_stream.read(64), member_name)
            actual_images += int(mime.startswith("image/"))
            actual_audio += int(mime.startswith("audio/"))
            other_media += int(not mime.startswith(("image/", "audio/")))

        metadata_member_candidates = [
            name for name in infos
            if name not in {db_name, media_manifest_name}
            and re.search(r"(?:license|licence|copyright|attribution|readme|about|source|metadata|manifest)", Path(name).name, re.I)
        ]
        metadata_member_text = []
        for member_name in metadata_member_candidates:
            try:
                with archive.open(member_name) as metadata_stream:
                    metadata_member_text.append(metadata_stream.read(1024 * 1024).decode("utf-8", errors="ignore"))
            except (KeyError, OSError, RuntimeError):
                continue

    field_presence: dict[str, int] = {}
    for field_name in field_names:
        count = 0
        for record in records:
            count += int(bool(_field(record, field_name).strip()))
        field_presence[field_name] = count
    metadata_text = json.dumps(models, ensure_ascii=False).casefold() + "\n" + "\n".join(collection_metadata_text + metadata_member_text).casefold()
    rights_metadata_indicators = bool(re.search(
        r"(?:\blicen[cs]e\b|\bcopyright\b|\battribution\b|\bsource\s*:|\bmedia rights\b|\bspdx\b)",
        metadata_text,
    ))
    explicit_license_grant = bool(re.search(
        r"(?:creative\s+commons|\bcc\s+by(?:-sa|-nc|-nd)?\b|public\s+domain|licensed\s+under|spdx)",
        metadata_text,
    ))
    summary = {
        "source": source,
        "archiveMemberCount": len(infos),
        "collectionDatabaseFilename": db_name,
        "noteCount": len(records),
        "cardCount": int(card_count),
        "modelNames": model_names,
        "fieldNames": field_names,
        "fieldPresenceCounts": field_presence,
        "collectionMetadataColumnNames": sorted(str(name) for name in col_columns),
        "rightsMetadataMemberCandidateCount": len(metadata_member_candidates),
        "normalizedUniqueHeadwordCount": len(head_counts),
        "duplicateNormalizedHeadwordGroups": duplicate_groups,
        "duplicateNormalizedHeadwordRows": sum(count for count in head_counts.values() if count > 1),
        "mediaMapFilename": media_manifest_name,
        "mediaMapEntryCount": len(media_map),
        "mediaMapResolvedMemberCount": len(resolved_map_keys),
        "mediaMapMissingMemberCount": len(media_map) - len(resolved_map_keys),
        "archiveMediaMemberCount": len(media_infos),
        "unmappedArchiveMediaMemberCount": len(media_infos) - len(resolved_map_keys),
        "actualImageMemberCount": actual_images,
        "actualAudioMemberCount": actual_audio,
        "otherMediaMemberCount": other_media,
        "declaredMediaExtensionCounts": dict(sorted(extension_counts.items())),
        "rightsMetadataIndicatorsFound": rights_metadata_indicators,
        "explicitLicenseGrantFound": explicit_license_grant,
        "explicitRightsMetadataFound": explicit_license_grant,
    }
    _raw_cache_write(cache_root, key, source, records)
    return {"summary": summary, "records": records, "mediaMap": media_map}


def _content_hash(value: str) -> str:
    return sha256_text(value)


def _semantic_tokens(value: str | None) -> set[str]:
    normalized = unicodedata.normalize("NFKC", html_to_text(value or "")).casefold()
    return {token for token in re.findall(r"[^\W_]+", normalized, flags=re.UNICODE) if len(token) > 1 and token not in STOP_WORDS}


def _semantic_similarity(left: str | None, right: str | None) -> int:
    left_text = normalize_lemma(left)
    right_text = normalize_lemma(right)
    if not left_text or not right_text:
        return 0
    if left_text == right_text:
        return 1000
    left_tokens = _semantic_tokens(left_text)
    right_tokens = _semantic_tokens(right_text)
    if not left_tokens or not right_tokens:
        return 0
    intersection = len(left_tokens & right_tokens)
    if not intersection:
        return 0
    # Integer thousandths keep ranking and proof payloads deterministic.
    containment = intersection * 1000 // min(len(left_tokens), len(right_tokens))
    jaccard = intersection * 1000 // len(left_tokens | right_tokens)
    return max(containment, jaccard)


def _sense_groups(record: dict[str, Any]) -> list[dict[str, Any]]:
    data = _safe_json_field(_field(record, "Example Data"))
    items = data if isinstance(data, list) else []
    grouped: dict[tuple[str, tuple[str, ...]], dict[str, Any]] = {}
    structured_count = 0
    for item in items:
        if not isinstance(item, dict):
            continue
        meaning_raw = str(item.get("meaning_vi", "") or "")
        meaning = html_to_text(meaning_raw)
        item_pos = _pos_codes(str(item.get("pos", "") or ""))
        if not meaning or not item_pos:
            continue
        structured_count += 1
        key = (normalize_lemma(meaning), tuple(sorted(item_pos)))
        group = grouped.setdefault(key, {"meaning": meaning, "posCodes": item_pos, "examples": [], "sourceItems": []})
        group["sourceItems"].append(item)
        examples = item.get("examples", [])
        if isinstance(examples, list):
            group["examples"].extend(html_to_text(str(example)) for example in examples if html_to_text(str(example)))
        elif isinstance(examples, str) and html_to_text(examples):
            group["examples"].append(html_to_text(examples))
    if grouped:
        result = []
        for index, (key, group) in enumerate(sorted(grouped.items(), key=lambda item: (item[0][0], item[0][1])), start=1):
            result.append({
                "groupIndex": index,
                "groupKey": canonical_sha256({"meaning": key[0], "posCodes": list(key[1])}),
                "meaning": group["meaning"],
                "posCodes": group["posCodes"],
                "examples": sorted(set(group["examples"])),
                "structured": True,
                "sourceItemCount": len(group["sourceItems"]),
                "validStructuredItemCount": structured_count,
            })
        return result
    fallback_meaning = html_to_text(_field(record, "Vietnamese"))
    fallback_pos = _pos_codes(_field(record, "Part of Speech"))
    if not fallback_meaning and not fallback_pos:
        return []
    return [{
        "groupIndex": 1,
        "groupKey": canonical_sha256({"meaning": normalize_lemma(fallback_meaning), "posCodes": sorted(fallback_pos)}),
        "meaning": fallback_meaning,
        "posCodes": fallback_pos,
        "examples": [html_to_text(_field(record, "Example"))] if html_to_text(_field(record, "Example")) else [],
        "structured": False,
        "sourceItemCount": 0,
        "validStructuredItemCount": structured_count,
    }]


def _cefr_values(record: dict[str, Any]) -> list[str]:
    value = html_to_text(_field(record, "CEFR")).upper()
    found = set(re.findall(r"(?<![A-Z0-9])(?:A1|A2|B1|B2|C1)(?![A-Z0-9])", value))
    return [level for level in CEFR_ORDER if level in found]


def _lexical_unit(lemma: str, pos_codes: list[str]) -> str:
    if not re.search(r"\s", lemma):
        return "WORD"
    tokens = lemma.split()
    particles = {"about", "across", "after", "around", "away", "back", "down", "for", "in", "into", "off", "on", "out", "over", "through", "to", "up"}
    if "VERB" in pos_codes and len(tokens) >= 2 and tokens[-1] in particles:
        return "PHRASAL_VERB"
    return "MULTIWORD_EXPRESSION"


def _source_field_hashes(record: dict[str, Any], field_names: Iterable[str]) -> dict[str, str]:
    return {
        name: _content_hash(_field(record, name))
        for name in sorted(set(field_names))
        if name in record.get("fields", {})
    }


def _new_candidate_id(source_hash: str, note_ref: str, group_ref: str) -> str:
    return "SOURCE-CANDIDATE-" + canonical_sha256({
        "sourcePackageSha256": source_hash,
        "sourceNoteReference": note_ref,
        "sourceSenseGroupReference": group_ref,
    })


def _new_lexeme_candidate_id(source_hash: str, normalized_lemma: str) -> str:
    return "LEXEME-CANDIDATE-" + canonical_sha256({
        "sourcePackageSha256": source_hash,
        "normalizedLemma": normalized_lemma,
    })


def _build_oxford_candidates(package: dict[str, Any]) -> list[dict[str, Any]]:
    summary = package["summary"]
    source_hash = summary["source"]["sha256"]
    result: list[dict[str, Any]] = []
    seen: set[str] = set()
    head_counts = collections.Counter(
        normalize_lemma(_field(record, "Word")) for record in package["records"] if normalize_lemma(_field(record, "Word"))
    )
    for record in package["records"]:
        display_lemma = html_to_text(_field(record, "Word"))
        lemma = normalize_lemma(display_lemma)
        if not lemma:
            continue
        note_ref = _source_note_ref(source_hash, record["sourceNoteGuid"])
        for group in _sense_groups(record):
            group_ref = "SENSE-GROUP-" + group["groupKey"]
            candidate_id = _new_candidate_id(source_hash, note_ref, group_ref)
            if candidate_id in seen:
                continue
            seen.add(candidate_id)
            top_pos = _pos_codes(_field(record, "Part of Speech"))
            group_pos = group["posCodes"] or top_pos
            unique_pos = list(dict.fromkeys(group_pos))
            part_of_speech = unique_pos[0] if len(unique_pos) == 1 else None
            cefr = _cefr_values(record)
            selected_cefr = cefr[0] if cefr else None
            qa_flags: list[str] = []
            if any(has_html_noise(value) for value in record["fields"].values()):
                qa_flags.append("HTML_NOISE")
            if len(cefr) > 1:
                qa_flags.append("CEFR_CONFLICT")
            if len(unique_pos) > 1 or not part_of_speech:
                qa_flags.append("POS_CONFLICT")
            if head_counts[lemma] > 1:
                qa_flags.append("HEADWORD_DUPLICATE")
            if len(group["examples"]) == 0:
                qa_flags.append("MISSING_EXAMPLE")
            if not group["meaning"]:
                qa_flags.append("MISSING_VI")
            if re.search(r"https?://", " ".join(_field(record, field) for field in ("Sound_uk", "Sound_us", "Pronunciation Data")), re.I):
                pronunciation_status = "REMOTE_REFERENCE_PRESENT_UNVERIFIED"
            elif html_to_text(_field(record, "Phonetic")) or _safe_json_field(_field(record, "Pronunciation Data")):
                pronunciation_status = "PRONUNCIATION_EVIDENCE_PRESENT"
            else:
                pronunciation_status = "NOT_PRESENT"
            result.append({
                "candidateId": candidate_id,
                "lexemeCandidateId": _new_lexeme_candidate_id(source_hash, lemma),
                "normalizedLemma": lemma,
                "displayLemma": display_lemma,
                "lexicalUnitType": _lexical_unit(lemma, unique_pos),
                "partOfSpeechCode": part_of_speech,
                "semanticLabel": f"Oxford source sense group {group['groupIndex']}; editorial authoring required",
                "sourceCoverage": "OXFORD_BACKBONE",
                "cefrEvidence": cefr,
                "selectedCefr": selected_cefr,
                "sourcePosCodes": unique_pos,
                "alignmentStatus": "NO_MATCH",
                "existingMasterStatus": "NO_EXISTING_LEXEME",
                "definitionEvidenceStatus": "NOT_AUTHORED",
                "translationEvidenceStatus": "SOURCE_TRANSLATION_PRESENT" if group["meaning"] else "MISSING",
                "exampleEvidenceStatus": "SOURCE_EXAMPLE_PRESENT" if group["examples"] else "MISSING",
                "pronunciationEvidenceStatus": pronunciation_status,
                "imageCandidateStatus": "NOT_PRESENT",
                "wordAudioCandidateStatus": "NOT_PRESENT",
                "exampleAudioCandidateStatus": "NOT_PRESENT",
                "rightsStatus": "UNKNOWN_UNVERIFIED",
                "shipEligible": False,
                "qaFlags": qa_flags,
                "recommendedNextAction": "AUTHOR_AND_REVIEW_MASTER_SENSE",
                "oxfordReference": {"sourceNoteReference": note_ref, "sourceSenseGroupReference": group_ref},
                "vocab4600Reference": None,
                "existingMasterLexemeId": None,
                "existingMasterSenseId": None,
                "_noteRefRaw": note_ref,
                "_groupRefRaw": group_ref,
                "_meaningRaw": group["meaning"],
                "_examplesRaw": group["examples"],
                "_structuredGroup": group["structured"],
                "_sourceGroupIndex": group["groupIndex"],
                "_fieldHashes": _source_field_hashes(record, ("Word", "Vietnamese", "Part of Speech", "Phonetic", "Example", "Example Data", "CEFR", "Pronunciation Data", "Sound_uk", "Sound_us")),
                "_record": record,
            })
    return result


def _build_4600_notes(package: dict[str, Any]) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
    source_hash = package["summary"]["source"]["sha256"]
    for record in package["records"]:
        lemma = normalize_lemma(_field(record, "Word"))
        if not lemma:
            continue
        note_ref = _source_note_ref(source_hash, record["sourceNoteGuid"])
        result.append({
            "normalizedLemma": lemma,
            "displayLemma": html_to_text(_field(record, "Word")),
            "sourceNoteReference": note_ref,
            "posCodes": _pos_codes(_field(record, "PoS")),
            "meaning": html_to_text(_field(record, "Meaning")),
            "example": html_to_text(_field(record, "Example")),
            "wordAudioRefs": _media_references(_field(record, "Sound")),
            "exampleAudioRefs": _media_references(_field(record, "Sound_Example")),
            "imageRefs": _media_references(_field(record, "Image")),
            "htmlNoise": any(has_html_noise(value) for value in record["fields"].values()),
            "fieldHashes": _source_field_hashes(record, ("Word", "IPA", "PoS", "Meaning", "Example", "Sound", "Sound_Example", "Image")),
            "_record": record,
            "_package": package,
        })
    return result


class _MediaReferenceParser(html.parser.HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.references: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        for key, value in attrs:
            if key.lower() in {"src", "href"} and value:
                self.references.append(value)


def _media_references(value: str) -> list[str]:
    parser = _MediaReferenceParser()
    try:
        parser.feed(value)
    except Exception:
        pass
    references = list(parser.references)
    references.extend(re.findall(r"\[sound:([^\]]+)\]", value, re.I))
    result = []
    for reference in references:
        cleaned = reference.strip().replace("\\", "/").split("/")[-1]
        cleaned = re.sub(r"\?.*$", "", cleaned)
        if cleaned and cleaned not in result:
            result.append(cleaned)
    return result


def _pos_compatible(left: list[str], right: list[str]) -> bool:
    return bool(left and right and set(left) & set(right))


def _align_4600(oxford: list[dict[str, Any]], notes4600: list[dict[str, Any]]) -> dict[str, Any]:
    by_lemma: dict[str, list[dict[str, Any]]] = collections.defaultdict(list)
    for candidate in oxford:
        by_lemma[candidate["normalizedLemma"]].append(candidate)
    notes_by_lemma: dict[str, list[dict[str, Any]]] = collections.defaultdict(list)
    for note in notes4600:
        notes_by_lemma[note["normalizedLemma"]].append(note)

    note_options: dict[str, list[dict[str, Any]]] = {}
    ambiguous_ref_by_candidate: dict[str, str] = {}
    for lemma, notes in notes_by_lemma.items():
        candidates = by_lemma.get(lemma, [])
        for note in notes:
            options = []
            for candidate in candidates:
                compatible = _pos_compatible(note["posCodes"], candidate["sourcePosCodes"])
                similarity = _semantic_similarity(note["meaning"], candidate["_meaningRaw"])
                example_similarity = max((_semantic_similarity(note["example"], example) for example in candidate["_examplesRaw"]), default=0)
                score = max(similarity, example_similarity // 2)
                options.append({"candidate": candidate, "compatible": compatible, "score": score})
            options.sort(key=lambda row: (-int(row["compatible"]), -row["score"], row["candidate"]["candidateId"]))
            note_options[note["sourceNoteReference"]] = options
            if candidates and (len(candidates) > 1 or not options or not options[0]["compatible"] or options[0]["score"] < 250):
                group_ref = "AMBIGUOUS-HEADWORD-GROUP-" + canonical_sha256({"sourcePackageSha256": note["_package"]["summary"]["source"]["sha256"], "normalizedLemma": lemma})
                for candidate in candidates:
                    ambiguous_ref_by_candidate[candidate["candidateId"]] = group_ref

    proposals: dict[str, list[dict[str, Any]]] = collections.defaultdict(list)
    note_ambiguous: set[str] = set()
    note_competing_candidates: dict[str, list[str]] = {}
    for note in notes4600:
        options = note_options[note["sourceNoteReference"]]
        compatible = [option for option in options if option["compatible"]]
        if options and not compatible:
            note_ambiguous.add(note["sourceNoteReference"])
            note_competing_candidates[note["sourceNoteReference"]] = [row["candidate"]["candidateId"] for row in options]
            continue
        ranked = sorted(compatible, key=lambda row: (-row["score"], row["candidate"]["candidateId"]))
        if not ranked:
            continue
        top = ranked[0]
        next_score = ranked[1]["score"] if len(ranked) > 1 else -1
        if top["score"] >= 250 and (len(ranked) == 1 or top["score"] - next_score >= 150):
            proposals[top["candidate"]["candidateId"]].append({"note": note, "score": top["score"]})
        elif len(ranked) > 1:
            note_ambiguous.add(note["sourceNoteReference"])
            note_competing_candidates[note["sourceNoteReference"]] = [row["candidate"]["candidateId"] for row in ranked]

    assignments: dict[str, dict[str, Any]] = {}
    for candidate_id, rows in proposals.items():
        ranked = sorted(rows, key=lambda row: (-row["score"], row["note"]["sourceNoteReference"]))
        if len(ranked) == 1 or ranked[0]["score"] - ranked[1]["score"] >= 150:
            assignments[candidate_id] = ranked[0]["note"]
        else:
            note_ambiguous.update(row["note"]["sourceNoteReference"] for row in ranked)
            note_competing_candidates.update({row["note"]["sourceNoteReference"]: [candidate_id] for row in ranked})

    for candidate in oxford:
        lemma_notes = notes_by_lemma.get(candidate["normalizedLemma"], [])
        assigned = assignments.get(candidate["candidateId"])
        if assigned:
            candidate["alignmentStatus"] = "ALIGNED"
            candidate["vocab4600Reference"] = {"sourceNoteReference": assigned["sourceNoteReference"]}
            candidate["_alignedNote"] = assigned
            if assigned.get("htmlNoise"):
                candidate["qaFlags"].append("HTML_NOISE")
            if assigned["meaning"]:
                candidate["definitionEvidenceStatus"] = "SOURCE_EN_DEFINITION_PRESENT_UNVERIFIED"
            else:
                candidate["definitionEvidenceStatus"] = "MISSING"
                candidate["qaFlags"].append("MISSING_EN_DEFINITION")
        elif not lemma_notes:
            candidate["alignmentStatus"] = "NO_MATCH"
            candidate["definitionEvidenceStatus"] = "MISSING"
            candidate["qaFlags"].append("MISSING_EN_DEFINITION")
        else:
            candidate_options = [option for note in lemma_notes for option in note_options[note["sourceNoteReference"]] if option["candidate"]["candidateId"] == candidate["candidateId"]]
            if any(note["posCodes"] for note in lemma_notes) and not any(option["compatible"] for option in candidate_options):
                candidate["qaFlags"].append("POS_CONFLICT")
            if any(note["sourceNoteReference"] in note_ambiguous for note in lemma_notes) or len(by_lemma[candidate["normalizedLemma"]]) > 1:
                candidate["alignmentStatus"] = "AMBIGUOUS"
            elif candidate_options and not candidate_options[0]["compatible"]:
                candidate["alignmentStatus"] = "AMBIGUOUS"
            else:
                candidate["alignmentStatus"] = "HEADWORD_ONLY"
                candidate["vocab4600Reference"] = {"sourceNoteReference": lemma_notes[0]["sourceNoteReference"], "matchKind": "HEADWORD_ONLY"}
            candidate["definitionEvidenceStatus"] = "UNALIGNED_SOURCE_DEFINITION_PRESENT" if any(note["meaning"] for note in lemma_notes) else "MISSING"
            candidate["qaFlags"].append("MISSING_EN_DEFINITION")
            if any(note.get("htmlNoise") for note in lemma_notes):
                candidate["qaFlags"].append("HTML_NOISE")
        if candidate["alignmentStatus"] == "AMBIGUOUS":
            candidate["qaFlags"].append("SEMANTIC_ALIGNMENT_AMBIGUOUS")
            if len(by_lemma[candidate["normalizedLemma"]]) > 1:
                candidate["qaFlags"].append("POLYSEMY_COLLISION_RISK")
            candidate["_ambiguousMatchGroupReference"] = ambiguous_ref_by_candidate.get(candidate["candidateId"])

    crosswalk_notes = []
    for note in notes4600:
        assigned_to = next((candidate_id for candidate_id, assigned in assignments.items() if assigned["sourceNoteReference"] == note["sourceNoteReference"]), None)
        competing = note_competing_candidates.get(note["sourceNoteReference"], [])
        crosswalk_notes.append({
            "sourceNoteReference": note["sourceNoteReference"],
            "normalizedLemma": note["normalizedLemma"],
            "fieldContentHashes": note["fieldHashes"],
            "assignedCandidateId": assigned_to,
            "competingCandidateIds": sorted(set(competing)) if not assigned_to else [],
            "alignmentStatus": "ALIGNED" if assigned_to else "AMBIGUOUS" if competing else "HEADWORD_ONLY" if note["normalizedLemma"] in by_lemma else "NO_MATCH",
        })
    return {"notesByLemma": notes_by_lemma, "noteOptions": note_options, "crosswalkNotes": crosswalk_notes}


def _latest_master_records(dataset_root: Path) -> tuple[dict[str, Any], list[dict[str, Any]], dict[str, list[dict[str, Any]]]]:
    manifest = json.loads((dataset_root / "dataset.json").read_text(encoding="utf-8"))
    lexemes = []
    for pin in manifest.get("includedLexemes", []):
        path = dataset_root / pin["recordPath"]
        if path.is_file():
            lexemes.append(json.loads(path.read_text(encoding="utf-8")))
    senses = []
    for pin in manifest.get("includedSenses", []):
        path = dataset_root / pin["recordPath"]
        if path.is_file():
            senses.append(json.loads(path.read_text(encoding="utf-8")))
    lexeme_by_id = {item["masterLexemeId"]: item for item in lexemes}
    by_lemma: dict[str, list[dict[str, Any]]] = collections.defaultdict(list)
    for sense in senses:
        lexeme = lexeme_by_id.get(sense.get("masterLexemeId"), {})
        sense["_lexeme"] = lexeme
        by_lemma[normalize_lemma(lexeme.get("normalizedLemma") or lexeme.get("lemma"))].append(sense)
    metadata = {
        "datasetVersion": manifest.get("datasetVersion"),
        "schemaVersion": manifest.get("schemaVersion"),
        "status": manifest.get("status"),
        "lexemeCount": len(lexemes),
        "senseCount": len(senses),
    }
    return metadata, lexemes, by_lemma


def _master_audit(candidate: dict[str, Any], master_by_lemma: dict[str, list[dict[str, Any]]]) -> None:
    rows = master_by_lemma.get(candidate["normalizedLemma"], [])
    if not rows:
        candidate["existingMasterStatus"] = "NO_EXISTING_LEXEME"
        return
    lexeme_ids = sorted({row["masterLexemeId"] for row in rows})
    if len(lexeme_ids) != 1:
        candidate["existingMasterStatus"] = "AMBIGUOUS_EXISTING_MASTER"
        candidate["qaFlags"].append("EXISTING_MASTER_AMBIGUOUS")
        return
    candidate["existingMasterLexemeId"] = lexeme_ids[0]
    lexeme_type = rows[0].get("_lexeme", {}).get("lexicalUnitType")
    same_type = [row for row in rows if row.get("_lexeme", {}).get("lexicalUnitType") == candidate["lexicalUnitType"]]
    compatible = [row for row in same_type if candidate["partOfSpeechCode"] and row.get("partOfSpeechCode") == candidate["partOfSpeechCode"]]
    scored = []
    for row in compatible:
        texts = [label.get("text", "") for label in row.get("senseLabel", []) if label.get("language") == "vi"]
        texts += [translation.get("text", "") for translation in row.get("translations", []) if translation.get("language") == "vi"]
        score = max((_semantic_similarity(candidate.get("_meaningRaw"), text) for text in texts), default=0)
        scored.append((score, row))
    scored.sort(key=lambda item: (-item[0], item[1].get("masterSenseId", "")))
    if scored and scored[0][0] >= 500 and (len(scored) == 1 or scored[0][0] - scored[1][0] >= 150):
        candidate["existingMasterStatus"] = "EXISTING_SENSE_CANDIDATE"
        candidate["existingMasterSenseId"] = scored[0][1]["masterSenseId"]
    elif same_type:
        candidate["existingMasterStatus"] = "EXISTING_LEXEME_NEW_SENSE_CANDIDATE"
    else:
        candidate["existingMasterStatus"] = "AMBIGUOUS_EXISTING_MASTER"
        candidate["qaFlags"].append("EXISTING_MASTER_AMBIGUOUS")


def _align_media_candidate(candidate: dict[str, Any], note: dict[str, Any] | None) -> None:
    if not note:
        return
    alignment = candidate.get("alignmentStatus")
    image_refs = note.get("imageRefs", [])
    word_audio_refs = note.get("wordAudioRefs", [])
    example_audio_refs = note.get("exampleAudioRefs", [])
    if image_refs:
        if alignment == "ALIGNED":
            candidate["imageCandidateStatus"] = "SENSE_TARGET_TECHNICAL_ONLY"
        else:
            candidate["imageCandidateStatus"] = "AMBIGUOUS_TARGET"
            candidate["qaFlags"].append("IMAGE_SENSE_TARGET_AMBIGUOUS")
    if word_audio_refs:
        candidate["wordAudioCandidateStatus"] = "LEXEME_TARGET_TECHNICAL_ONLY"
    if example_audio_refs:
        candidate["exampleAudioCandidateStatus"] = "EXAMPLE_TARGET_TECHNICAL_ONLY" if note.get("example") else "AMBIGUOUS_TARGET"
        if not note.get("example"):
            candidate["qaFlags"].append("EXAMPLE_AUDIO_TARGET_AMBIGUOUS")
    if example_audio_refs:
        candidate["qaFlags"].append("EXAMPLE_AUDIO_NOT_PRONUNCIATION")


def _master_type_lemmas(master_lexemes: list[dict[str, Any]]) -> set[str]:
    return {normalize_lemma(item.get("normalizedLemma") or item.get("lemma")) for item in master_lexemes}


def _candidate_priority(candidate: dict[str, Any], seed: str) -> tuple[int, str]:
    return (0 if candidate.get("existingMasterStatus") in {"EXISTING_SENSE_CANDIDATE", "EXISTING_LEXEME_NEW_SENSE_CANDIDATE"} else 1,
            sha256_text(seed + "\0" + candidate["candidateId"]))


def _pos_distribution_key(candidate: dict[str, Any]) -> str:
    pos = candidate.get("partOfSpeechCode")
    return pos if pos in POS_ORDER else "OTHER" if pos else "UNASSIGNED"


def _replace_note_level_fallbacks(
    selected: list[dict[str, Any]], candidates: list[dict[str, Any]], seed: str
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Replace selected Oxford note fallbacks with deterministic structured candidates.

    Keep each hard source/CEFR cell fixed. Prefer replacements that also keep
    the POS distribution, Master-collision status, polysemy membership, and
    lexical-unit type unchanged.
    """
    selected_by_id = {candidate["candidateId"]: candidate for candidate in selected}
    group_counts = collections.Counter(candidate["lexemeCandidateId"] for candidate in candidates)
    replacement_audit = []
    fallbacks = sorted(
        (candidate for candidate in selected_by_id.values() if not candidate.get("_structuredGroup")),
        key=lambda candidate: candidate["candidateId"],
    )
    for fallback in fallbacks:
        selected_ids = set(selected_by_id)
        fallback_multi_sense = group_counts[fallback["lexemeCandidateId"]] > 1
        eligible = [
            candidate for candidate in candidates
            if candidate.get("_structuredGroup")
            and candidate["candidateId"] not in selected_ids
            and candidate["sourceBucket"] == fallback["sourceBucket"]
            and candidate.get("selectedCefr") == fallback.get("selectedCefr")
        ]
        if not eligible:
            continue

        def replacement_priority(candidate: dict[str, Any]) -> tuple[int, int, int, int, str]:
            return (
                int(_pos_distribution_key(candidate) != _pos_distribution_key(fallback)),
                int(candidate.get("existingMasterStatus") != fallback.get("existingMasterStatus")),
                int((group_counts[candidate["lexemeCandidateId"]] > 1) != fallback_multi_sense),
                int(candidate.get("lexicalUnitType") != fallback.get("lexicalUnitType")),
                sha256_text(seed + "\0structured-fallback-replacement\0" + candidate["candidateId"]),
            )

        replacement = min(eligible, key=replacement_priority)
        selected_by_id.pop(fallback["candidateId"])
        selected_by_id[replacement["candidateId"]] = replacement
        replacement_audit.append({
            "replacedCandidateId": fallback["candidateId"],
            "replacementCandidateId": replacement["candidateId"],
            "sourceBucket": fallback["sourceBucket"],
            "selectedCefr": fallback.get("selectedCefr"),
            "posDistributionPreserved": _pos_distribution_key(replacement) == _pos_distribution_key(fallback),
            "existingMasterStatusPreserved": replacement.get("existingMasterStatus") == fallback.get("existingMasterStatus"),
            "polysemyMembershipPreserved": (group_counts[replacement["lexemeCandidateId"]] > 1) == fallback_multi_sense,
            "lexicalUnitTypePreserved": replacement.get("lexicalUnitType") == fallback.get("lexicalUnitType"),
        })
    return sorted(selected_by_id.values(), key=lambda candidate: candidate["candidateId"]), replacement_audit


def _sense_segmentation_status(candidate: dict[str, Any]) -> str:
    if candidate.get("sourceCoverage") == "4600_ONLY" or candidate.get("_bucketNotOxford"):
        return "NOT_APPLICABLE_NO_OXFORD_SENSE"
    return "STRUCTURED" if candidate.get("_structuredGroup") is True else "NOTE_LEVEL_FALLBACK"


def _segmentation_counts(candidates: list[dict[str, Any]]) -> dict[str, int]:
    statuses = collections.Counter(_sense_segmentation_status(candidate) for candidate in candidates)
    return {
        "candidateCount": len(candidates),
        "structured": statuses["STRUCTURED"],
        "fallback": statuses["NOTE_LEVEL_FALLBACK"],
    }


def _editorial_authoring_ready(proof_status: dict[str, Any]) -> bool:
    required_true = (
        "sourceFilesVerified", "apkgParsingVerified", "sampleExactly100Senses",
        "senseSegmentationVerified", "polysemyGuardVerified", "mediaTargetGuardVerified",
        "existingMasterDedupAudited", "selectionCoverageVerified", "proofDeterministic",
    )
    return (
        all(proof_status.get(key) is True for key in required_true)
        and proof_status.get("rawSourceContentCommitted") is False
        and proof_status.get("masterIdsAllocated") == 0
        and proof_status.get("canonicalMasterMutated") is False
        and proof_status.get("databaseWrites") == 0
    )


def _source_reuse_eligible(proof_status: dict[str, Any]) -> bool:
    return proof_status.get("sourceRightsVerified") is True and proof_status.get("mediaReuseEligible") is True


def _existing_master_dedup_audited(candidates: list[dict[str, Any]]) -> bool:
    valid_statuses = {
        "NO_EXISTING_LEXEME", "EXISTING_LEXEME_NEW_SENSE_CANDIDATE",
        "EXISTING_SENSE_CANDIDATE", "AMBIGUOUS_EXISTING_MASTER",
    }
    for candidate in candidates:
        status = candidate.get("existingMasterStatus")
        if status not in valid_statuses:
            return False
        if status == "NO_EXISTING_LEXEME" and (candidate.get("existingMasterLexemeId") or candidate.get("existingMasterSenseId")):
            return False
        if status == "EXISTING_LEXEME_NEW_SENSE_CANDIDATE" and (
            not candidate.get("existingMasterLexemeId") or candidate.get("existingMasterSenseId")
        ):
            return False
        if status == "EXISTING_SENSE_CANDIDATE" and (
            not candidate.get("existingMasterLexemeId") or not candidate.get("existingMasterSenseId")
        ):
            return False
    return True


def _media_target_guard_verified(candidates: list[dict[str, Any]], media_candidates: list[dict[str, Any]]) -> bool:
    by_id = {candidate["candidateId"]: candidate for candidate in candidates}
    for media in media_candidates:
        for role in media.get("roles", []):
            kind = role.get("kind")
            target_type = role.get("targetType")
            target_id = role.get("targetCandidateId")
            if target_type == "UNRESOLVED":
                if target_id is not None:
                    return False
                continue
            if kind == "IMAGE":
                target = by_id.get(target_id)
                if target_type != "SENSE" or target is None or target.get("imageCandidateStatus") != "SENSE_TARGET_TECHNICAL_ONLY":
                    return False
            elif kind == "WORD_AUDIO":
                target = next((candidate for candidate in candidates if candidate.get("lexemeCandidateId") == target_id), None)
                if target_type != "LEXEME" or target is None:
                    return False
            elif kind == "EXAMPLE_AUDIO":
                if target_type != "EXAMPLE" or not isinstance(target_id, str) or not target_id.startswith("EXAMPLE-CANDIDATE-"):
                    return False
            else:
                return False
    return True


def _refresh_readiness_flags(proof_status: dict[str, Any]) -> None:
    proof_status["sourceReuseEligible"] = _source_reuse_eligible(proof_status)
    proof_status["editorialAuthoringReady"] = _editorial_authoring_ready(proof_status)
    proof_status["phase2f1aReady"] = (
        proof_status["editorialAuthoringReady"]
        and proof_status.get("sourceRightsVerified") is False
        and proof_status.get("mediaReuseEligible") is False
        and proof_status["sourceReuseEligible"] is False
    )


def _solve_level_bucket_quotas(candidates: list[dict[str, Any]]) -> dict[str, dict[str, int]] | None:
    matched = collections.Counter(candidate["selectedCefr"] for candidate in candidates if candidate["sourceBucket"] == "OXFORD_PLUS_4600")
    only = collections.Counter(candidate["selectedCefr"] for candidate in candidates if candidate["sourceBucket"] == "OXFORD_ONLY")
    choices = []
    for level in CEFR_ORDER:
        values = [value for value in range(19) if value <= matched[level] and 18 - value <= only[level]]
        if not values:
            return None
        choices.append(values)
    paths: list[tuple[int, tuple[int, ...]]] = [(0, ())]
    for values in choices:
        next_paths = []
        for total, row in paths:
            for value in values:
                if total + value <= 70:
                    next_paths.append((total + value, row + (value,)))
        paths = next_paths
    complete = [row for total, row in paths if total == 70]
    if not complete:
        return None
    best = min(complete, key=lambda row: (sum(abs(value - 14) for value in row), row))
    return {
        level: {"OXFORD_PLUS_4600": best[index], "OXFORD_ONLY": 18 - best[index]}
        for index, level in enumerate(CEFR_ORDER)
    }


def _bucket_key(candidate: dict[str, Any]) -> tuple[str, str]:
    return (candidate["sourceBucket"], candidate["selectedCefr"] or "UNASSIGNED")


def _select_oxford(candidates: list[dict[str, Any]], quotas: dict[str, dict[str, int]] | None, seed: str, multiword_limit: int = 10) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    selected: dict[str, dict[str, Any]] = {}
    capacities: dict[tuple[str, str], int] = {}
    if quotas:
        for level in CEFR_ORDER:
            for bucket in ("OXFORD_PLUS_4600", "OXFORD_ONLY"):
                capacities[(bucket, level)] = quotas[level][bucket]
    else:
        capacities = collections.Counter(_bucket_key(candidate) for candidate in candidates)
        # Deterministic fallback still retains the 70/20 source split whenever possible.
        wanted = {"OXFORD_PLUS_4600": 70, "OXFORD_ONLY": 20}
        for bucket, total in wanted.items():
            available = collections.Counter(candidate.get("selectedCefr") or "UNASSIGNED" for candidate in candidates if candidate["sourceBucket"] == bucket)
            levels = list(CEFR_ORDER) + ["UNASSIGNED"]
            allocation = {level: 0 for level in levels}
            remaining = min(total, sum(available.values()))
            while remaining:
                made_progress = False
                for level in levels:
                    if remaining and allocation[level] < available[level]:
                        allocation[level] += 1
                        remaining -= 1
                        made_progress = True
                if not made_progress:
                    break
            for level, amount in allocation.items():
                capacities[(bucket, level)] = amount

    multi_groups: dict[str, list[dict[str, Any]]] = collections.defaultdict(list)
    for candidate in candidates:
        multi_groups[candidate["lexemeCandidateId"]].append(candidate)
    pair_options = []
    for lexeme_id, rows in multi_groups.items():
        grouped = collections.defaultdict(list)
        for row in rows:
            grouped[_bucket_key(row)].append(row)
        for bucket, same_bucket in grouped.items():
            if len(same_bucket) >= 2:
                ranked = sorted(same_bucket, key=lambda row: _candidate_priority(row, seed))
                pair_options.append({"lexeme": lexeme_id, "bucket": bucket, "rows": ranked[:2], "rank": sha256_text(seed + "\0pair\0" + lexeme_id + bucket[0] + bucket[1])})
    pair_options.sort(key=lambda item: (
        0 if any(row.get("lexicalUnitType") != "WORD" for row in item["rows"]) else 1,
        item["rank"],
    ))
    used_lexemes: set[str] = set()
    selected_pairs = 0
    selected_pair_multiword_count = 0
    for option in pair_options:
        if selected_pairs >= 10:
            break
        bucket = option["bucket"]
        if option["lexeme"] in used_lexemes or capacities.get(bucket, 0) < 2:
            continue
        pair_multiword_count = sum(row.get("lexicalUnitType") != "WORD" for row in option["rows"])
        if selected_pair_multiword_count + pair_multiword_count > multiword_limit:
            continue
        for row in option["rows"]:
            selected[row["candidateId"]] = row
        capacities[bucket] -= 2
        selected_pair_multiword_count += pair_multiword_count
        used_lexemes.add(option["lexeme"])
        selected_pairs += 1

    # Preserve the polysemy sample before ordinary quota filling.
    multi_rows = sorted(
        (row for row in candidates if len(multi_groups[row["lexemeCandidateId"]]) >= 2 and row["candidateId"] not in selected),
        key=lambda row: (
            row["lexemeCandidateId"] in used_lexemes,
            0 if row.get("lexicalUnitType") != "WORD" and selected_pair_multiword_count < multiword_limit else 1,
            _candidate_priority(row, seed),
        ),
    )
    multi_sense_target = 24
    poly_multiword_count = selected_pair_multiword_count
    for row in multi_rows:
        if sum(len(multi_groups[item["lexemeCandidateId"]]) >= 2 for item in selected.values()) >= multi_sense_target:
            break
        if row.get("lexicalUnitType") != "WORD" and poly_multiword_count >= multiword_limit:
            continue
        bucket = _bucket_key(row)
        if capacities.get(bucket, 0) > 0:
            selected[row["candidateId"]] = row
            capacities[bucket] -= 1
            used_lexemes.add(row["lexemeCandidateId"])
            poly_multiword_count += int(row.get("lexicalUnitType") != "WORD")

    # Fill each remaining source/CEFR cell while reducing unmet editorial
    # coverage targets first. Hard source and CEFR cell capacities stay intact.
    remaining = [row for row in candidates if row["candidateId"] not in selected]
    selected_pos_counts = collections.Counter(
        row["partOfSpeechCode"] if row["partOfSpeechCode"] in POS_ORDER else "OTHER" if row["partOfSpeechCode"] else "UNASSIGNED"
        for row in selected.values()
    )
    pos_targets = {"NOUN": 20, "VERB": 20, "ADJECTIVE": 15, "ADVERB": 5, "OTHER": 1}
    existing_target = 5
    selected_existing_count = sum(row.get("existingMasterStatus") in {"EXISTING_SENSE_CANDIDATE", "EXISTING_LEXEME_NEW_SENSE_CANDIDATE"} for row in selected.values())
    selected_multiword_count = sum(row.get("lexicalUnitType") != "WORD" for row in selected.values())
    while remaining and any(amount > 0 for amount in capacities.values()):
        eligible = [
            row for row in remaining
            if capacities.get(_bucket_key(row), 0) > 0
            and (row.get("lexicalUnitType") == "WORD" or selected_multiword_count < multiword_limit)
        ]
        if not eligible:
            break

        def fill_priority(row: dict[str, Any]) -> tuple[int, int, int, int, str]:
            pos = row["partOfSpeechCode"] if row["partOfSpeechCode"] in POS_ORDER else "OTHER" if row["partOfSpeechCode"] else "UNASSIGNED"
            pos_deficit = pos_targets.get(pos, 0) - selected_pos_counts[pos]
            existing = row.get("existingMasterStatus") in {"EXISTING_SENSE_CANDIDATE", "EXISTING_LEXEME_NEW_SENSE_CANDIDATE"}
            existing_deficit = int(existing and selected_existing_count < existing_target)
            multiword_deficit = int(row.get("lexicalUnitType") != "WORD" and selected_multiword_count < multiword_limit)
            return (-int(pos_deficit > 0), -existing_deficit, -multiword_deficit, -max(pos_deficit, 0), _candidate_priority(row, seed)[1])

        candidate = min(eligible, key=fill_priority)
        selected[candidate["candidateId"]] = candidate
        remaining = [row for row in remaining if row["candidateId"] != candidate["candidateId"]]
        capacities[_bucket_key(candidate)] -= 1
        pos = candidate["partOfSpeechCode"] if candidate["partOfSpeechCode"] in POS_ORDER else "OTHER" if candidate["partOfSpeechCode"] else "UNASSIGNED"
        selected_pos_counts[pos] += 1
        selected_existing_count += int(candidate.get("existingMasterStatus") in {"EXISTING_SENSE_CANDIDATE", "EXISTING_LEXEME_NEW_SENSE_CANDIDATE"})
        selected_multiword_count += int(candidate.get("lexicalUnitType") != "WORD")

    selected_rows = sorted(selected.values(), key=lambda row: row["candidateId"])
    counts = collections.Counter(_bucket_key(row) for row in selected_rows)
    return selected_rows, {
        "quotaPlan": quotas,
        "selectedByBucket": {f"{bucket}:{level}": count for (bucket, level), count in sorted(counts.items())},
        "polysemyPairLexemeCount": sum(1 for lexeme_id, rows in multi_groups.items() if sum(row["candidateId"] in selected for row in rows) >= 2),
        "selectedMultiSenseCandidateCount": sum(1 for row in selected_rows if len(multi_groups[row["lexemeCandidateId"]]) >= 2),
        "unfilledCells": {f"{bucket}:{level}": count for (bucket, level), count in sorted(capacities.items()) if count > 0},
        "usedLexemeIds": sorted(used_lexemes),
    }


def _choose_4600_only(notes: list[dict[str, Any]], oxford_lemmas: set[str], master_lexemes: list[dict[str, Any]], seed: str) -> list[dict[str, Any]]:
    by_lemma: dict[str, list[dict[str, Any]]] = collections.defaultdict(list)
    for note in notes:
        if note["normalizedLemma"] not in oxford_lemmas:
            by_lemma[note["normalizedLemma"]].append(note)
    selected = []
    for lemma, rows in by_lemma.items():
        rows.sort(key=lambda row: (-sum(bool(row[key]) for key in ("meaning", "example", "wordAudioRefs", "exampleAudioRefs", "imageRefs")), sha256_text(seed + row["sourceNoteReference"])))
        note = rows[0]
        source_hash = note["_package"]["summary"]["source"]["sha256"]
        sense_group_ref = "4600-UNSEGMENTED-" + canonical_sha256({"sourceNoteReference": note["sourceNoteReference"], "semanticAuthoringRequired": True})
        candidate_id = _new_candidate_id(source_hash, note["sourceNoteReference"], sense_group_ref)
        pos_codes = note["posCodes"]
        candidate = {
            "candidateId": candidate_id,
            "lexemeCandidateId": _new_lexeme_candidate_id(source_hash, lemma),
            "normalizedLemma": lemma,
            "displayLemma": note["displayLemma"],
            "lexicalUnitType": _lexical_unit(lemma, pos_codes),
            "partOfSpeechCode": pos_codes[0] if len(pos_codes) == 1 else None,
            "semanticLabel": "4600-only headword candidate; Master Sense authoring required",
            "sourceCoverage": "4600_ONLY",
            "cefrEvidence": [],
            "selectedCefr": None,
            "sourcePosCodes": pos_codes,
            "alignmentStatus": "SOURCE_SEMANTIC_AUTHORING_REQUIRED",
            "existingMasterStatus": "NO_EXISTING_LEXEME",
            "definitionEvidenceStatus": "SOURCE_MEANING_PRESENT_UNVERIFIED" if note["meaning"] else "MISSING",
            "translationEvidenceStatus": "MISSING",
            "exampleEvidenceStatus": "SOURCE_EXAMPLE_PRESENT" if note["example"] else "MISSING",
            "pronunciationEvidenceStatus": "NOT_PRESENT" if not note["wordAudioRefs"] else "AUDIO_REFERENCE_PRESENT_UNVERIFIED",
            "imageCandidateStatus": "AMBIGUOUS_TARGET" if note["imageRefs"] else "NOT_PRESENT",
            "wordAudioCandidateStatus": "LEXEME_TARGET_TECHNICAL_ONLY" if note["wordAudioRefs"] else "NOT_PRESENT",
            "exampleAudioCandidateStatus": "EXAMPLE_TARGET_TECHNICAL_ONLY" if note["exampleAudioRefs"] else "NOT_PRESENT",
            "rightsStatus": "UNKNOWN_UNVERIFIED",
            "shipEligible": False,
            "qaFlags": ["MISSING_VI"] + (["HTML_NOISE"] if any(has_html_noise(value) for value in note["_record"]["fields"].values()) else []),
            "recommendedNextAction": "AUTHOR_AND_REVIEW_DRAFT_MASTER_SENSE",
            "oxfordReference": None,
            "vocab4600Reference": {"sourceNoteReference": note["sourceNoteReference"]},
            "existingMasterLexemeId": None,
            "existingMasterSenseId": None,
            "_noteRefRaw": note["sourceNoteReference"],
            "_groupRefRaw": sense_group_ref,
            "_meaningRaw": note["meaning"],
            "_examplesRaw": [note["example"]] if note["example"] else [],
            "_structuredGroup": False,
            "_sourceGroupIndex": None,
            "_fieldHashes": note["fieldHashes"],
            "_record": note["_record"],
            "_alignedNote": note,
            "_bucketNotOxford": True,
        }
        if not note["meaning"]:
            candidate["qaFlags"].append("MISSING_EN_DEFINITION")
        if len(rows) > 1:
            candidate["qaFlags"].append("HEADWORD_DUPLICATE")
        selected.append(candidate)
    selected.sort(key=lambda row: _candidate_priority(row, seed))
    return selected


def _attach_selected_media(selected: list[dict[str, Any]], oxford_package: dict[str, Any], package4600: dict[str, Any]) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    media_refs: dict[str, Any] = {}
    reverse_map = {filename.casefold(): key for key, filename in package4600["mediaMap"].items()}
    ambiguous_assigned_counts: collections.Counter[str] = collections.Counter()
    selected_by_lexeme: dict[str, list[dict[str, Any]]] = collections.defaultdict(list)
    for item in selected:
        selected_by_lexeme[item["lexemeCandidateId"]].append(item)
    for candidate in selected:
        note = candidate.get("_alignedNote")
        _align_media_candidate(candidate, note)
        if note and note["wordAudioRefs"]:
            selected_pos = {item["partOfSpeechCode"] for item in selected_by_lexeme[candidate["lexemeCandidateId"]] if item["partOfSpeechCode"]}
            if len(selected_pos) > 1:
                candidate["qaFlags"].append("HETERONYM_AUDIO_RISK")
                candidate["wordAudioCandidateStatus"] = "HETERONYM_REVIEW_REQUIRED"
        if candidate["sourceCoverage"] == "4600_ONLY" and note and note.get("imageRefs"):
            candidate["qaFlags"].append("IMAGE_SENSE_TARGET_AMBIGUOUS")
        if candidate["partOfSpeechCode"] is None or not candidate["sourcePosCodes"]:
            candidate["qaFlags"].append("POS_CONFLICT")
        if candidate["cefrEvidence"] and len(candidate["cefrEvidence"]) > 1 and "CEFR_CONFLICT" not in candidate["qaFlags"]:
            candidate["qaFlags"].append("CEFR_CONFLICT")
        if candidate["lexicalUnitType"] != "WORD":
            candidate["qaFlags"].append("MULTIWORD_NORMALIZATION_REVIEW")
        if candidate["rightsStatus"] == "UNKNOWN_UNVERIFIED":
            candidate["qaFlags"].append("MEDIA_RIGHTS_UNKNOWN")
            candidate["qaFlags"].append("SOURCE_TEXT_RIGHTS_UNKNOWN")
        if candidate["alignmentStatus"] == "AMBIGUOUS":
            candidate["qaFlags"].append("SEMANTIC_ALIGNMENT_AMBIGUOUS")
        if candidate["alignmentStatus"] == "AMBIGUOUS" and candidate["imageCandidateStatus"] != "NOT_PRESENT":
            candidate["qaFlags"].append("IMAGE_SENSE_TARGET_AMBIGUOUS")
        refs = []
        if note:
            for kind, field_key in (("IMAGE", "imageRefs"), ("WORD_AUDIO", "wordAudioRefs"), ("EXAMPLE_AUDIO", "exampleAudioRefs")):
                for filename in note[field_key]:
                    member_key = reverse_map.get(filename.casefold())
                    media_identity = {"packageSha256": package4600["summary"]["source"]["sha256"], "memberNameHash": sha256_text(filename)}
                    media_id = "MEDIA-CANDIDATE-" + canonical_sha256(media_identity)
                    record = media_refs.get(media_id)
                    if record is None:
                        record = {
                            "mediaCandidateId": media_id,
                            "sourcePackage": "vocab4600",
                            "memberNameHash": sha256_text(filename),
                            "archiveMemberReference": member_key,
                            "roles": [],
                            "sizeBytes": None,
                            "sha256": None,
                            "declaredType": Path(filename).suffix.lower() or "[none]",
                            "detectedType": "UNRESOLVED",
                            "rightsStatus": "UNKNOWN_UNVERIFIED",
                            "shipEligible": False,
                        }
                        if member_key is not None:
                            try:
                                with zipfile.ZipFile(package4600["path"]) as archive:
                                    info = archive.getinfo(member_key)
                                    digest = hashlib.sha256()
                                    prefix = b""
                                    with archive.open(member_key) as stream:
                                        first = stream.read(64)
                                        prefix = first
                                        digest.update(first)
                                        for block in iter(lambda: stream.read(1024 * 1024), b""):
                                            digest.update(block)
                                    record["sizeBytes"] = info.file_size
                                    record["sha256"] = digest.hexdigest()
                                    record["detectedType"] = _detect_media_type(prefix, filename)
                            except (KeyError, OSError, zipfile.BadZipFile):
                                record["detectedType"] = "UNRESOLVED"
                        media_refs[media_id] = record
                    if kind == "IMAGE":
                        role_target = "SENSE" if candidate["imageCandidateStatus"] == "SENSE_TARGET_TECHNICAL_ONLY" else "UNRESOLVED"
                        target_id = candidate["candidateId"] if role_target == "SENSE" else None
                    elif kind == "WORD_AUDIO":
                        role_target = "LEXEME" if candidate["wordAudioCandidateStatus"] == "LEXEME_TARGET_TECHNICAL_ONLY" else "UNRESOLVED"
                        target_id = candidate["lexemeCandidateId"] if role_target == "LEXEME" else None
                    else:
                        role_target = "EXAMPLE" if candidate["exampleAudioCandidateStatus"] == "EXAMPLE_TARGET_TECHNICAL_ONLY" else "UNRESOLVED"
                        target_id = "EXAMPLE-CANDIDATE-" + canonical_sha256({
                            "sourceNoteReference": note["sourceNoteReference"],
                            "exampleContentHash": note["fieldHashes"].get("Example"),
                        }) if role_target == "EXAMPLE" else None
                    role = {"kind": kind, "targetType": role_target, "targetCandidateId": target_id}
                    if role not in record["roles"]:
                        record["roles"].append(role)
                    refs.append({"kind": kind, "mediaCandidateId": media_id, "targetStatus": candidate["imageCandidateStatus"] if kind == "IMAGE" else candidate["wordAudioCandidateStatus"] if kind == "WORD_AUDIO" else candidate["exampleAudioCandidateStatus"]})
        candidate["technicalMediaCandidates"] = sorted(refs, key=lambda row: (row["kind"], row["mediaCandidateId"]))
    assigned_notes = collections.defaultdict(set)
    for candidate in selected:
        ref = candidate.get("vocab4600Reference")
        if isinstance(ref, dict) and ref.get("sourceNoteReference"):
            assigned_notes[ref["sourceNoteReference"]].add(candidate["candidateId"])
    broadcast_count = sum(len(candidate_ids) > 1 for candidate_ids in assigned_notes.values())
    return selected, {
        "mediaCandidates": sorted(media_refs.values(), key=lambda row: row["mediaCandidateId"]),
        "assignedNoteBroadcastCount": broadcast_count,
        "uniqueAssigned4600NoteCount": len(assigned_notes),
    }


def _sanitize_candidate(candidate: dict[str, Any]) -> dict[str, Any]:
    keep = (
        "candidateId", "lexemeCandidateId", "normalizedLemma", "displayLemma", "lexicalUnitType",
        "partOfSpeechCode", "semanticLabel", "sourceCoverage", "cefrEvidence", "selectedCefr",
        "sourcePosCodes", "alignmentStatus", "existingMasterStatus", "definitionEvidenceStatus",
        "translationEvidenceStatus", "exampleEvidenceStatus", "pronunciationEvidenceStatus",
        "imageCandidateStatus", "wordAudioCandidateStatus", "exampleAudioCandidateStatus",
        "rightsStatus", "shipEligible", "qaFlags", "recommendedNextAction", "oxfordReference",
        "vocab4600Reference", "existingMasterLexemeId", "existingMasterSenseId", "technicalMediaCandidates",
    )
    sanitized = {key: candidate.get(key) for key in keep}
    sanitized["senseSegmentationStatus"] = _sense_segmentation_status(candidate)
    return sanitized


def build_proof(oxford_path: Path, vocab4600_path: Path, dataset_root: Path, raw_cache_root: Path | None) -> dict[str, Any]:
    oxford = extract_apkg(oxford_path, "oxford", raw_cache_root)
    vocab4600 = extract_apkg(vocab4600_path, "vocab4600", raw_cache_root)
    oxford["path"] = oxford_path
    vocab4600["path"] = vocab4600_path
    oxford_candidates = _build_oxford_candidates(oxford)
    notes4600 = _build_4600_notes(vocab4600)
    alignment = _align_4600(oxford_candidates, notes4600)
    oxford_lemmas = {candidate["normalizedLemma"] for candidate in oxford_candidates}
    for candidate in oxford_candidates:
        candidate["sourceBucket"] = "OXFORD_PLUS_4600" if candidate["normalizedLemma"] in alignment["notesByLemma"] else "OXFORD_ONLY"
        candidate["sourceCoverage"] = candidate["sourceBucket"]

    master_metadata, master_lexemes, master_by_lemma = _latest_master_records(dataset_root)
    for candidate in oxford_candidates:
        _master_audit(candidate, master_by_lemma)

    # Build one 4600-only candidate per normalized headword, without claiming
    # Oxford sense identity. Full note text stays inside the local process/cache.
    only_candidates = _choose_4600_only(notes4600, oxford_lemmas, master_lexemes, SELECTION_POLICY_VERSION)
    for candidate in only_candidates:
        _master_audit(candidate, master_by_lemma)

    quota_plan = _solve_level_bucket_quotas(oxford_candidates)
    selected_only = only_candidates[:10]
    multiword_room = max(0, 10 - sum(candidate["lexicalUnitType"] != "WORD" for candidate in selected_only))
    selected_oxford, selection_report = _select_oxford(oxford_candidates, quota_plan, SELECTION_POLICY_VERSION, multiword_room)
    selected_oxford, segmentation_replacements = _replace_note_level_fallbacks(
        selected_oxford, oxford_candidates, SELECTION_POLICY_VERSION
    )
    selected_internal = selected_oxford + selected_only
    selected_internal, media_report = _attach_selected_media(selected_internal, oxford, vocab4600)
    sanitized_candidates = [_sanitize_candidate(candidate) for candidate in sorted(selected_internal, key=lambda row: row["candidateId"])]

    crosswalk = []
    for candidate in sorted(selected_internal, key=lambda row: row["candidateId"]):
        row = {
            "candidateId": candidate["candidateId"],
            "lexemeCandidateId": candidate["lexemeCandidateId"],
            "sourceCoverage": candidate["sourceCoverage"],
            "senseSegmentationStatus": _sense_segmentation_status(candidate),
            "oxfordReference": candidate["oxfordReference"],
            "vocab4600Reference": candidate["vocab4600Reference"],
            "ambiguousMatchGroupReference": candidate.get("_ambiguousMatchGroupReference"),
            "fieldContentHashes": candidate["_fieldHashes"],
            "alignmentStatus": candidate["alignmentStatus"],
            "mediaCandidates": candidate["technicalMediaCandidates"],
            "existingMasterLexemeId": candidate["existingMasterLexemeId"],
            "existingMasterSenseId": candidate["existingMasterSenseId"],
        }
        crosswalk.append(row)

    selected_oxford_after = [candidate for candidate in selected_internal if candidate["sourceCoverage"] != "4600_ONLY"]
    selected_oxford_segmentation = _segmentation_counts(selected_oxford_after)
    cefr_counts = collections.Counter(candidate["selectedCefr"] or "UNASSIGNED" for candidate in selected_oxford_after)
    pos_counts = collections.Counter(candidate["partOfSpeechCode"] if candidate["partOfSpeechCode"] in POS_ORDER else "OTHER" if candidate["partOfSpeechCode"] else "UNASSIGNED" for candidate in selected_internal)
    source_counts = collections.Counter(candidate["sourceCoverage"] for candidate in selected_internal)
    multi_by_lexeme: dict[str, set[str]] = collections.defaultdict(set)
    for candidate in selected_oxford_after:
        multi_by_lexeme[candidate["lexemeCandidateId"]].add(candidate["candidateId"])
    selected_multi_lexemes = {lexeme for lexeme, ids in multi_by_lexeme.items() if len(ids) >= 2}
    all_by_lexeme: dict[str, set[str]] = collections.defaultdict(set)
    for candidate in oxford_candidates:
        all_by_lexeme[candidate["lexemeCandidateId"]].add(candidate["candidateId"])
    multi_sense_candidate_count = sum(1 for candidate in selected_oxford_after if len(all_by_lexeme[candidate["lexemeCandidateId"]]) >= 2)
    distinct_selected_multisense_lexemes = {
        candidate["lexemeCandidateId"] for candidate in selected_oxford_after
        if len(all_by_lexeme[candidate["lexemeCandidateId"]]) >= 2
    }
    alignment_counts = collections.Counter(candidate["alignmentStatus"] for candidate in selected_oxford_after)
    existing_counts = collections.Counter(candidate["existingMasterStatus"] for candidate in selected_internal)
    qa_counts = collections.Counter(flag for candidate in selected_internal for flag in set(candidate["qaFlags"]))
    selected_media = media_report["mediaCandidates"]
    media_role_counts = collections.Counter(role["kind"] for item in selected_media for role in item["roles"])
    multiword_count = sum(candidate["lexicalUnitType"] != "WORD" for candidate in selected_internal)
    distinct_oxford_lexeme_count = len({candidate["lexemeCandidateId"] for candidate in selected_oxford_after})
    selected_existing_sense_ids = sorted({candidate["existingMasterSenseId"] for candidate in selected_internal if candidate["existingMasterSenseId"]})

    coverage = {
        "selectedSenseCandidateCount": len(sanitized_candidates),
        "uniqueOxfordLexemeCandidateCount": distinct_oxford_lexeme_count,
        "sourceSplit": {
            "oxfordPlus4600Headword": source_counts["OXFORD_PLUS_4600"],
            "oxfordOnly": source_counts["OXFORD_ONLY"],
            "vocab4600Only": source_counts["4600_ONLY"],
        },
        "cefrSelectedOxford": {level: cefr_counts[level] for level in CEFR_ORDER} | {"unassigned": cefr_counts["UNASSIGNED"]},
        "posDistribution": {pos: pos_counts[pos] for pos in POS_ORDER} | {"OTHER": pos_counts["OTHER"], "UNASSIGNED": pos_counts["UNASSIGNED"]},
        "multiSenseLexemeCandidateCount": len(distinct_selected_multisense_lexemes),
        "distinctSelectedMultiSenseLexemeCount": len(distinct_selected_multisense_lexemes),
        "selectedSensesFromMultiSenseLexemes": multi_sense_candidate_count,
        "multiSenseLexemePairCount": len(selected_multi_lexemes),
        "multiwordPhrasalIdiomCandidateCount": multiword_count,
        "alignment": {
            "ALIGNED": alignment_counts["ALIGNED"],
            "HEADWORD_ONLY": alignment_counts["HEADWORD_ONLY"],
            "AMBIGUOUS": alignment_counts["AMBIGUOUS"],
            "NO_MATCH": alignment_counts["NO_MATCH"],
            "SOURCE_SEMANTIC_AUTHORING_REQUIRED": source_counts["4600_ONLY"],
        },
        "existingMaster": {
            "existingSenseCandidates": existing_counts["EXISTING_SENSE_CANDIDATE"],
            "existingLexemeNewSenseCandidates": existing_counts["EXISTING_LEXEME_NEW_SENSE_CANDIDATE"],
            "newLexemeCandidates": existing_counts["NO_EXISTING_LEXEME"],
            "ambiguous": existing_counts["AMBIGUOUS_EXISTING_MASTER"],
            "existingMasterSenseIdsReferenced": selected_existing_sense_ids,
        },
        "quality": {
            "missingTranslation": qa_counts["MISSING_VI"],
            "missingDefinition": qa_counts["MISSING_EN_DEFINITION"],
            "missingExample": qa_counts["MISSING_EXAMPLE"],
            "htmlNoise": qa_counts["HTML_NOISE"],
            "duplicateSourceHeadwordCandidates": qa_counts["HEADWORD_DUPLICATE"],
            "existingMasterAmbiguous": qa_counts["EXISTING_MASTER_AMBIGUOUS"],
            "qaFlagCounts": dict(sorted(qa_counts.items())),
        },
        "media": {
            "technicalImageCandidates": media_role_counts["IMAGE"],
            "wordAudioCandidates": media_role_counts["WORD_AUDIO"],
            "exampleAudioCandidates": media_role_counts["EXAMPLE_AUDIO"],
            "ambiguousMediaTargets": sum(candidate["imageCandidateStatus"] == "AMBIGUOUS_TARGET" for candidate in selected_internal),
            "reusableRightsConfirmed": 0,
            "candidateMemberCount": len(selected_media),
        },
        "remotePronunciationReferenceCandidateCount": sum(
            candidate["pronunciationEvidenceStatus"] == "REMOTE_REFERENCE_PRESENT_UNVERIFIED"
            for candidate in selected_internal
        ),
        "rights": {
            "explicitSourceLicenseMetadataFound": bool(oxford["summary"]["explicitRightsMetadataFound"] or vocab4600["summary"]["explicitRightsMetadataFound"]),
            "sourceRightsVerified": False,
            "unknownRightsItems": len(sanitized_candidates),
            "mediaReuseEligible": False,
        },
        "selection": {
            "requested": {"oxfordPlus4600": 70, "oxfordOnly": 20, "vocab4600Only": 10, "oxfordCefrEach": 18},
            "quotaPlan": selection_report["quotaPlan"],
            "selectedByBucket": selection_report["selectedByBucket"],
            "unfilledCells": selection_report["unfilledCells"],
            "segmentationReplacements": segmentation_replacements,
            "fallbackReasons": [],
        },
        "masterSnapshot": master_metadata,
        "sourceGroupCounts": {
            "oxfordStructuredSenseCandidates": len(oxford_candidates),
            "oxfordStructuredGroupCandidates": sum(bool(candidate["_structuredGroup"]) for candidate in oxford_candidates),
            "oxfordNoteLevelFallbackCandidates": sum(not candidate["_structuredGroup"] for candidate in oxford_candidates),
            "oxfordMultiSenseLexemeCandidatePool": sum(len(rows) > 1 for rows in all_by_lexeme.values()),
        },
        "selectedOxfordSegmentation": selected_oxford_segmentation,
        "alignmentAudit": {
            "unbroadcast4600NoteAssignments": media_report["assignedNoteBroadcastCount"] == 0,
            "uniqueAssigned4600NoteCount": media_report["uniqueAssigned4600NoteCount"],
            "ambiguous4600NoteCount": sum(row["alignmentStatus"] == "AMBIGUOUS" for row in alignment["crosswalkNotes"]),
        },
        "proofStatus": {
            "sourceFilesVerified": True,
            "apkgParsingVerified": True,
            "senseSegmentationVerified": (
                selected_oxford_segmentation["candidateCount"] == 90
                and selected_oxford_segmentation["structured"] == 90
                and selected_oxford_segmentation["fallback"] == 0
            ),
            "polysemyGuardVerified": (
                media_report["assignedNoteBroadcastCount"] == 0
                and multi_sense_candidate_count >= 24
                and len(distinct_selected_multisense_lexemes) >= 10
                and len(selected_multi_lexemes) >= 8
            ),
            "mediaTargetGuardVerified": _media_target_guard_verified(selected_internal, selected_media),
            "existingMasterDedupAudited": False,
            "selectionCoverageVerified": False,
            "rawSourceContentCommitted": False,
            "sourceRightsVerified": False,
            "mediaReuseEligible": False,
            "sourceReuseEligible": False,
            "proofDeterministic": False,
            "sampleExactly100Senses": len(sanitized_candidates) == 100,
            "masterIdsAllocated": 0,
            "databaseWrites": 0,
            "canonicalMasterMutated": False,
            "editorialAuthoringReady": False,
            "phase2f1aReady": False,
        },
    }

    fallback_reasons: list[str] = []
    if len(sanitized_candidates) != 100:
        fallback_reasons.append("TOTAL_CANDIDATE_COUNT_UNAVAILABLE")
    for coverage_key, requested, reason in (
        ("oxfordPlus4600Headword", 70, "OXFORD_PLUS_4600_QUOTA_UNAVAILABLE"),
        ("oxfordOnly", 20, "OXFORD_ONLY_QUOTA_UNAVAILABLE"),
        ("vocab4600Only", 10, "VOCAB4600_ONLY_QUOTA_UNAVAILABLE"),
    ):
        if coverage["sourceSplit"][coverage_key] != requested:
            fallback_reasons.append(reason)
    if any(coverage["cefrSelectedOxford"][level] != 18 for level in CEFR_ORDER):
        fallback_reasons.append("OXFORD_CEFR_QUOTA_UNAVAILABLE")
    if coverage["selectedSensesFromMultiSenseLexemes"] < 24:
        fallback_reasons.append("POLYSEMY_SENSE_COVERAGE_UNAVAILABLE")
    if coverage["distinctSelectedMultiSenseLexemeCount"] < 10:
        fallback_reasons.append("POLYSEMY_LEXEME_COVERAGE_UNAVAILABLE")
    if coverage["multiSenseLexemePairCount"] < 8:
        fallback_reasons.append("POLYSEMY_PAIRED_SENSE_COVERAGE_UNAVAILABLE")
    for pos, minimum in (("NOUN", 20), ("VERB", 20), ("ADJECTIVE", 15), ("ADVERB", 5)):
        if coverage["posDistribution"][pos] < minimum:
            fallback_reasons.append(f"POS_{pos}_COVERAGE_UNAVAILABLE")
    if coverage["posDistribution"]["OTHER"] < 1 and any(candidate.get("partOfSpeechCode") not in POS_ORDER and candidate.get("partOfSpeechCode") for candidate in oxford_candidates):
        fallback_reasons.append("POS_OTHER_SOURCE_CANDIDATE_NOT_SELECTED")
    if selected_oxford_segmentation["fallback"]:
        fallback_reasons.append("SELECTED_OXFORD_NOTE_LEVEL_FALLBACK_REMAINS")
    available_multiword = sum(candidate["lexicalUnitType"] != "WORD" for candidate in oxford_candidates + only_candidates)
    if available_multiword < 5:
        fallback_reasons.append("SOURCE_MULTIWORD_SHORTAGE")
    elif coverage["multiwordPhrasalIdiomCandidateCount"] < 5:
        fallback_reasons.append("MULTIWORD_SAMPLE_UNAVAILABLE_WITHIN_QUOTAS")
    available_master_collisions = sum(candidate["existingMasterStatus"] in {"EXISTING_SENSE_CANDIDATE", "EXISTING_LEXEME_NEW_SENSE_CANDIDATE"} for candidate in oxford_candidates + only_candidates)
    selected_master_collisions = coverage["existingMaster"]["existingSenseCandidates"] + coverage["existingMaster"]["existingLexemeNewSenseCandidates"]
    if selected_master_collisions < 5:
        fallback_reasons.append("EXISTING_MASTER_SOURCE_SHORTAGE" if available_master_collisions < 5 else "EXISTING_MASTER_COLLISION_SAMPLE_UNAVAILABLE_WITHIN_QUOTAS")
    coverage["selection"]["fallbackReasons"] = fallback_reasons
    coverage["selection"]["availableMultiwordCandidateCount"] = available_multiword
    coverage["selection"]["availableExistingMasterCollisionCandidateCount"] = available_master_collisions
    coverage["proofStatus"]["existingMasterDedupAudited"] = _existing_master_dedup_audited(selected_internal)
    coverage["proofStatus"]["selectionCoverageVerified"] = not fallback_reasons
    _refresh_readiness_flags(coverage["proofStatus"])

    candidate_ids = {row["candidateId"] for row in sanitized_candidates}
    for note_row in alignment["crosswalkNotes"]:
        if note_row["assignedCandidateId"] not in candidate_ids:
            note_row["assignedCandidateId"] = None
        note_row["competingCandidateIds"] = [candidate_id for candidate_id in note_row["competingCandidateIds"] if candidate_id in candidate_ids]
    selected_candidate_ids = {candidate["candidateId"] for candidate in selected_internal}
    selected_note_refs = {
        candidate["vocab4600Reference"]["sourceNoteReference"]
        for candidate in selected_internal
        if isinstance(candidate.get("vocab4600Reference"), dict) and candidate["vocab4600Reference"].get("sourceNoteReference")
    }
    selected_note_refs.update(
        candidate["_alignedNote"]["sourceNoteReference"]
        for candidate in selected_internal if candidate.get("_alignedNote")
    )
    selected_note_crosswalk = [
        row | {"competingCandidateIds": [candidate_id for candidate_id in row["competingCandidateIds"] if candidate_id in selected_candidate_ids]}
        for row in alignment["crosswalkNotes"]
        if row["sourceNoteReference"] in selected_note_refs
        or row["assignedCandidateId"] in selected_candidate_ids
        or set(row["competingCandidateIds"]) & selected_candidate_ids
    ]

    proof_input = {
        "sourceIdentities": {"oxford": oxford["summary"]["source"], "vocab4600": vocab4600["summary"]["source"]},
        "parserContractVersion": PARSER_CONTRACT_VERSION,
        "normalizationPolicyVersion": NORMALIZATION_POLICY_VERSION,
        "selectionPolicyVersion": SELECTION_POLICY_VERSION,
        "alignmentAlgorithmVersion": ALGORITHM_VERSION,
        "segmentationPolicy": {
            "candidateStatusField": "senseSegmentationStatus",
            "structuredEvidenceField": "_structuredGroup",
            "sourceSenseGroupReferenceProvesStructure": False,
            "selectedOxfordStructuredRequired": 90,
            "selectedOxfordFallbackAllowed": 0,
        },
        "selectionRepairs": segmentation_replacements,
        "selectionPolicy": {
            "sourceQuota": {"OXFORD_PLUS_4600": 70, "OXFORD_ONLY": 20, "4600_ONLY": 10},
            "cefrQuota": {level: 18 for level in CEFR_ORDER},
            "polysemy": {"multiSenseCandidatesMinimum": 24, "distinctMultiSenseLexemesMinimum": 10, "pairedLexemesMinimum": 8},
            "posMinimum": {"NOUN": 20, "VERB": 20, "ADJECTIVE": 15, "ADVERB": 5, "OTHER": 1 if any(candidate["partOfSpeechCode"] not in POS_ORDER and candidate["partOfSpeechCode"] for candidate in oxford_candidates) else 0},
            "multiword": {"preferredMaximum": 10, "shortageThreshold": 5},
            "existingMasterCollisionPreferredMinimum": 5,
            "candidateCount": 100,
        },
        "candidates": sanitized_candidates,
        "crosswalk": crosswalk,
    }
    proof_fingerprint = canonical_sha256(proof_input)
    rights_audit = {
        "sourceRightsVerified": False,
        "mediaReuseEligible": False,
        "sourceTextRightsStatus": "UNKNOWN_UNVERIFIED",
        "mediaRightsStatus": "UNKNOWN_UNVERIFIED",
        "explicitRightsMetadata": {
            "oxfordPackageMetadataFound": oxford["summary"]["explicitRightsMetadataFound"],
            "vocab4600PackageMetadataFound": vocab4600["summary"]["explicitRightsMetadataFound"],
            "oxfordRightsMetadataIndicatorsFound": oxford["summary"]["rightsMetadataIndicatorsFound"],
            "vocab4600RightsMetadataIndicatorsFound": vocab4600["summary"]["rightsMetadataIndicatorsFound"],
            "licenseFieldNamesFound": sorted({
                field
                for package in (oxford, vocab4600)
                for field in package["summary"]["fieldNames"] + package["summary"]["collectionMetadataColumnNames"]
                if re.search(r"license|licence|copyright|attribution|rights", field, re.I)
            }),
        },
        "packageMetadataInspection": {
            "oxfordCollectionMetadataColumns": oxford["summary"]["collectionMetadataColumnNames"],
            "vocab4600CollectionMetadataColumns": vocab4600["summary"]["collectionMetadataColumnNames"],
            "oxfordRightsNamedMemberCandidateCount": oxford["summary"]["rightsMetadataMemberCandidateCount"],
            "vocab4600RightsNamedMemberCandidateCount": vocab4600["summary"]["rightsMetadataMemberCandidateCount"],
        },
        "selectedCandidateCount": len(sanitized_candidates),
        "selectedTechnicalMediaCandidateCount": len(selected_media),
        "technicalMediaCandidates": selected_media,
        "reusableMediaCount": 0,
        "decision": "No explicit license grant was verified in package/model metadata; source text and media remain unverified and non-shippable.",
    }
    manifest = {
        "artifactType": "HYBRID_SOURCE_CANDIDATE_PACKAGE",
        "workspaceStatus": "OFFLINE_PROOF_ONLY",
        "notAMasterRelease": True,
        "sourceIdentities": {"oxford": oxford["summary"]["source"], "vocab4600": vocab4600["summary"]["source"]},
        "sourceSummaries": {"oxford": oxford["summary"], "vocab4600": vocab4600["summary"]},
        "parserContractVersion": PARSER_CONTRACT_VERSION,
        "normalizationPolicyVersion": NORMALIZATION_POLICY_VERSION,
        "selectionPolicyVersion": SELECTION_POLICY_VERSION,
        "alignmentAlgorithmVersion": ALGORITHM_VERSION,
        "candidateCount": len(sanitized_candidates),
        "proofFingerprint": proof_fingerprint,
        "canonicalMasterMutation": "NONE",
        "masterIdsAllocated": 0,
        "databaseWrites": "NONE",
        "importApplyExecuted": "NO",
        "migrationsExecuted": "NONE",
        "productionConnection": "NONE",
    }
    return {
        "manifest": manifest,
        "selectionPolicy": proof_input["selectionPolicy"] | {
            "fallbackReasons": coverage["selection"]["fallbackReasons"],
            "quotaPlan": selection_report["quotaPlan"],
            "normalizationRules": ["Unicode NFKC", "HTML entity decode and safe text extraction", "trim and collapse whitespace", "casefold normalized match lemma", "preserve source spelling and apostrophes/hyphens", "CEFR remains source evidence; never mapped to GRADE"],
            "semanticAlignmentRules": ["exact normalized lemma is discovery only", "require compatible POS and semantic evidence for ALIGNED", "ambiguous polysemy remains unassigned and requires human/editorial review", "ambiguous, NO_MATCH, HEADWORD_ONLY, and 4600-only rows remain valid independent-authoring inputs", "do not copy source definitions as authoritative; author independent learner-facing text", "a 4600 note can be assigned to at most one Oxford Sense candidate", "image targets require ALIGNED semantic match", "word audio targets Lexeme candidate", "example audio targets Example candidate", "EXISTING_LEXEME_NEW_SENSE_CANDIDATE reuses the Lexeme ID in a later phase and allocates a new Sense ID only in that later phase"],
        },
        "candidates": {"candidates": sanitized_candidates},
        "crosswalk": {"candidateCrosswalk": crosswalk, "vocab4600NoteCrosswalk": sorted(selected_note_crosswalk, key=lambda row: row["sourceNoteReference"])},
        "coverage": coverage,
        "rightsAudit": rights_audit,
        "qaSummary": {
            "candidateCount": len(sanitized_candidates),
            "qaFlagCounts": dict(sorted(qa_counts.items())),
            "selectionFallbackReasons": coverage["selection"]["fallbackReasons"],
            "proofFingerprint": proof_fingerprint,
        },
        "proofFingerprint": proof_fingerprint,
        "proofFingerprintInput": proof_input,
    }


def _write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8", newline="\n")


def _render_report(proof: dict[str, Any]) -> str:
    manifest = proof["manifest"]
    coverage = proof["coverage"]
    oxford = manifest["sourceSummaries"]["oxford"]
    vocab4600 = manifest["sourceSummaries"]["vocab4600"]
    split = coverage["sourceSplit"]
    cefr = coverage["cefrSelectedOxford"]
    pos = coverage["posDistribution"]
    alignment = coverage["alignment"]
    existing = coverage["existingMaster"]
    media = coverage["media"]
    segmentation = coverage["selectedOxfordSegmentation"]
    proof_status = coverage["proofStatus"]
    replacement_audit = coverage["selection"]["segmentationReplacements"]
    lines = [
        "# Hybrid Oxford + 4600 — 100-Sense Offline Source Proof",
        "",
        "## Scope and safety",
        "",
        "This is a sanitized source-candidate workspace, not a Master release. It does not materialize learner-facing Master content or allocate Master UUIDs.",
        "The proof is offline. It performs no database writes, APPLY, migrations, production connection, media upload, or TTS generation.",
        "Raw note fields stay in the ignored `.vocabflow-local/master-v2-hybrid-source/` cache; no source media bytes are copied into the repository.",
        "Source and media rights remain unknown/unverified; no technical media candidate is ship eligible.",
        "",
        "## Source summary",
        "",
        "| Metric | Oxford package | 4600 package |",
        "| --- | ---: | ---: |",
        f"| File | `{oxford['source']['basename']}` | `{vocab4600['source']['basename']}` |",
        f"| Size bytes | {oxford['source']['sizeBytes']} | {vocab4600['source']['sizeBytes']} |",
        f"| SHA-256 | `{oxford['source']['sha256']}` | `{vocab4600['source']['sha256']}` |",
        f"| Archive members | {oxford['archiveMemberCount']} | {vocab4600['archiveMemberCount']} |",
        f"| Collection DB | `{oxford['collectionDatabaseFilename']}` | `{vocab4600['collectionDatabaseFilename']}` |",
        f"| Notes / cards | {oxford['noteCount']} / {oxford['cardCount']} | {vocab4600['noteCount']} / {vocab4600['cardCount']} |",
        f"| Models | {', '.join(f'`{name}`' for name in oxford['modelNames'])} | {', '.join(f'`{name}`' for name in vocab4600['modelNames'])} |",
        f"| Normalized unique headwords | {oxford['normalizedUniqueHeadwordCount']} | {vocab4600['normalizedUniqueHeadwordCount']} |",
        f"| Duplicate normalized headword groups | {oxford['duplicateNormalizedHeadwordGroups']} | {vocab4600['duplicateNormalizedHeadwordGroups']} |",
        f"| Oxford derived sense candidates | {coverage['sourceGroupCounts']['oxfordStructuredSenseCandidates']} | Not segmented from this source model |",
        f"| Media map entries | {oxford['mediaMapEntryCount']} | {vocab4600['mediaMapEntryCount']} |",
        f"| Media-map entries resolved / missing; archive members unreferenced | {oxford['mediaMapResolvedMemberCount']} / {oxford['mediaMapMissingMemberCount']}; {oxford['unmappedArchiveMediaMemberCount']} | {vocab4600['mediaMapResolvedMemberCount']} / {vocab4600['mediaMapMissingMemberCount']}; {vocab4600['unmappedArchiveMediaMemberCount']} |",
        f"| Actual image / audio / other archive members | {oxford['actualImageMemberCount']} / {oxford['actualAudioMemberCount']} / {oxford['otherMediaMemberCount']} | {vocab4600['actualImageMemberCount']} / {vocab4600['actualAudioMemberCount']} / {vocab4600['otherMediaMemberCount']} |",
        "",
        f"Oxford grouping produced {coverage['sourceGroupCounts']['oxfordStructuredGroupCandidates']} structured sense groups and {coverage['sourceGroupCounts']['oxfordNoteLevelFallbackCandidates']} note-level fallback candidates. Field presence counts use raw nonempty fields; media types are classified by member signatures where possible and bytes are not extracted to the workspace.",
        "",
        "## Selected Oxford segmentation proof",
        "",
        f"- Selected Oxford-backed candidates: **{segmentation['candidateCount']}**; structured: **{segmentation['structured']}**; note-level fallback: **{segmentation['fallback']}**.",
        f"- Structured segmentation verified: **{'YES' if proof_status['senseSegmentationVerified'] else 'NO'}**. A source sense-group reference is an identity reference and does not itself prove structured source segmentation.",
        f"- Deterministic fallback replacements: **{len(replacement_audit)}**.",
        *[f"  - `{row['replacedCandidateId']}` → `{row['replacementCandidateId']}` ({row['sourceBucket']}, {row['selectedCefr']}, POS category preserved: {'YES' if row['posDistributionPreserved'] else 'NO'})." for row in replacement_audit],
        "",
        "## Selected 100 candidates",
        "",
        f"- Total candidate Senses: **{coverage['selectedSenseCandidateCount']}**.",
        f"- Unique Oxford Lexeme candidates: **{coverage['uniqueOxfordLexemeCandidateCount']}**.",
        f"- Source split: Oxford + 4600 headword match **{split['oxfordPlus4600Headword']}**; Oxford only **{split['oxfordOnly']}**; 4600 only **{split['vocab4600Only']}**.",
        f"- CEFR: {', '.join(f'{level} {cefr[level]}' for level in CEFR_ORDER)}; unassigned **{cefr['unassigned']}**.",
        f"- POS: {', '.join(f'{key} {pos[key]}' for key in POS_ORDER)}; other **{pos['OTHER']}**; unassigned **{pos['UNASSIGNED']}**.",
        f"- Distinct multi-sense Lexemes represented: **{coverage['distinctSelectedMultiSenseLexemeCount']}**; multi-sense Lexemes with 2+ selected Senses: **{coverage['multiSenseLexemePairCount']}**; selected Senses from multi-sense Lexemes: **{coverage['selectedSensesFromMultiSenseLexemes']}**.",
        f"- Multiword / phrasal candidate count: **{coverage['multiwordPhrasalIdiomCandidateCount']}**.",
        f"- Selection fallbacks: {', '.join(coverage['selection']['fallbackReasons']) if coverage['selection']['fallbackReasons'] else 'none'}.",
        "",
        "## Alignment, Master audit, and media",
        "",
        f"- Alignment: ALIGNED {alignment['ALIGNED']}; HEADWORD_ONLY {alignment['HEADWORD_ONLY']}; AMBIGUOUS {alignment['AMBIGUOUS']}; NO_MATCH {alignment['NO_MATCH']}; 4600-only authoring required {alignment['SOURCE_SEMANTIC_AUTHORING_REQUIRED']}.",
        f"- Existing Master: existing Sense candidates {existing['existingSenseCandidates']}; existing Lexeme / new Sense candidates {existing['existingLexemeNewSenseCandidates']}; new Lexeme candidates {existing['newLexemeCandidates']}; ambiguous {existing['ambiguous']}.",
        "- An existing Sense match requires compatible lexical-unit type, POS, and semantic evidence. An existing Lexeme / new Sense candidate reuses that Lexeme ID and receives a new Sense ID only in a later authoring phase; this proof allocates no IDs.",
        f"- Technical media candidates: images {media['technicalImageCandidates']}; word audio {media['wordAudioCandidates']}; example audio {media['exampleAudioCandidates']}; ambiguous targets {media['ambiguousMediaTargets']}; rights-confirmed reusable media {media['reusableRightsConfirmed']}.",
        "- Example audio remains Example-targeted and is never labeled pronunciation audio. Images are assigned to a Sense target only after semantic alignment.",
        "- `SOURCE_RIGHTS_VERIFIED=NO`; `MEDIA_REUSE_ELIGIBLE=NO`.",
        f"- Explicit license-grant indicators: Oxford {'YES' if oxford['explicitLicenseGrantFound'] else 'NO'}; 4600 {'YES' if vocab4600['explicitLicenseGrantFound'] else 'NO'}. General rights-metadata markers: Oxford {'YES' if oxford['rightsMetadataIndicatorsFound'] else 'NO'}; 4600 {'YES' if vocab4600['rightsMetadataIndicatorsFound'] else 'NO'}.",
        "",
        "## Quality review signals",
        "",
        f"- Missing Vietnamese evidence: {coverage['quality']['missingTranslation']}; missing English-definition evidence: {coverage['quality']['missingDefinition']}; missing example evidence: {coverage['quality']['missingExample']}.",
        f"- HTML noise: {coverage['quality']['htmlNoise']}; duplicate source-headword candidates: {coverage['quality']['duplicateSourceHeadwordCandidates']}; ambiguous existing-Master matches: {coverage['quality']['existingMasterAmbiguous']}.",
        f"- Selected candidates with Oxford remote pronunciation references: {coverage['remotePronunciationReferenceCandidateCount']}; URLs were not fetched or stored.",
        f"- QA flag counts: `{json.dumps(coverage['quality']['qaFlagCounts'], sort_keys=True, ensure_ascii=False)}`.",
        "",
        "## Reproducibility and gates",
        "",
        f"- Proof fingerprint: `{proof['proofFingerprint']}`.",
        f"- Repeat run: {coverage.get('repeatFingerprintIdentical', 'NOT_RUN')}; both passes recompute the source SHA-256 values and proof fingerprint.",
        f"- Alignment is not a readiness requirement: ambiguous, NO_MATCH, HEADWORD_ONLY, and 4600-only rows remain authoring inputs; ambiguous cases require human/editorial review and all learner-facing text must be authored independently.",
        f"- Rights status is independent of authoring readiness: source rights verified **{'YES' if proof_status['sourceRightsVerified'] else 'NO'}**; media reuse eligible **{'YES' if proof_status['mediaReuseEligible'] else 'NO'}**; source reuse eligible **{'YES' if proof_status['sourceReuseEligible'] else 'NO'}**.",
        "- Candidate IDs are SHA-256-derived `SOURCE-CANDIDATE-*` values. No `masterLexemeId`/`masterSenseId` is assigned to new candidates.",
        "- Existing canonical Master package was read only. Master release 2.1.0 and runtime canary remain outside this workspace.",
        "",
        "```text",
        "DATABASE_WRITES = NONE",
        "IMPORT_APPLY_EXECUTED = NO",
        "MIGRATIONS_EXECUTED = NONE",
        "MASTER_CANONICAL_MUTATION = NONE",
        "MEDIA_UPLOADS = NONE",
        f"SOURCE_FILES_VERIFIED = {'YES' if proof_status['sourceFilesVerified'] else 'NO'}",
        f"APKG_PARSING_VERIFIED = {'YES' if proof_status['apkgParsingVerified'] else 'NO'}",
        f"SAMPLE_EXACTLY_100_SENSES = {'YES' if proof_status['sampleExactly100Senses'] else 'NO'}",
        f"SENSE_SEGMENTATION_VERIFIED = {'YES' if proof_status['senseSegmentationVerified'] else 'NO'}",
        f"POLYSEMY_GUARD_VERIFIED = {'YES' if proof_status['polysemyGuardVerified'] else 'NO'}",
        f"MEDIA_TARGET_GUARD_VERIFIED = {'YES' if proof_status['mediaTargetGuardVerified'] else 'NO'}",
        f"EXISTING_MASTER_DEDUP_AUDITED = {'YES' if proof_status['existingMasterDedupAudited'] else 'NO'}",
        f"SELECTION_COVERAGE_VERIFIED = {'YES' if proof_status['selectionCoverageVerified'] else 'NO'}",
        f"PROOF_DETERMINISTIC = {'YES' if proof_status['proofDeterministic'] else 'NO'}",
        f"RAW_SOURCE_CONTENT_COMMITTED = {'YES' if proof_status['rawSourceContentCommitted'] else 'NO'}",
        f"MASTER_IDS_ALLOCATED = {proof_status['masterIdsAllocated']}",
        f"CANONICAL_MASTER_MUTATED = {'YES' if proof_status['canonicalMasterMutated'] else 'NO'}",
        f"SOURCE_RIGHTS_VERIFIED = {'YES' if proof_status['sourceRightsVerified'] else 'NO'}",
        f"MEDIA_REUSE_ELIGIBLE = {'YES' if proof_status['mediaReuseEligible'] else 'NO'}",
        f"SOURCE_REUSE_ELIGIBLE = {'YES' if proof_status['sourceReuseEligible'] else 'NO'}",
        f"DATABASE_WRITES = {proof_status['databaseWrites']}",
        f"RUN_1_PROOF_FINGERPRINT = {coverage.get('run1ProofFingerprint', 'NOT_RECORDED')}",
        f"RUN_2_PROOF_FINGERPRINT = {coverage.get('run2ProofFingerprint', 'NOT_RECORDED')}",
        f"HYBRID_100_EDITORIAL_AUTHORING_READY = {'YES' if proof_status['editorialAuthoringReady'] else 'NO'}",
        f"PHASE_2F1A_READY = {'YES' if proof_status['phase2f1aReady'] else 'NO'}",
        "```",
        "",
    ]
    return "\n".join(lines)


def write_workspace(proof: dict[str, Any], workspace: Path, report_path: Path) -> None:
    _write_json(workspace / "manifest.json", proof["manifest"])
    _write_json(workspace / "selection-policy.json", proof["selectionPolicy"])
    _write_json(workspace / "candidates.json", proof["candidates"])
    _write_json(workspace / "source-crosswalk.json", proof["crosswalk"])
    _write_json(workspace / "coverage.json", proof["coverage"] | {"proofFingerprint": proof["proofFingerprint"]})
    _write_json(workspace / "rights-audit.json", proof["rightsAudit"])
    _write_json(workspace / "qa-summary.json", proof["qaSummary"])
    workspace.mkdir(parents=True, exist_ok=True)
    readme = """# Hybrid 100-Sense Source Candidate Proof

This directory is a sanitized, deterministic source-candidate package. It is **not** a Master release and its `SOURCE-CANDIDATE-*` IDs are not Master UUIDs.

Raw APKG fields and media member names are kept only in the ignored local cache `.vocabflow-local/master-v2-hybrid-source/`. Tracked files include source identity hashes, field hashes, status flags, and candidate references; they do not contain source definitions, examples, translations, remote URLs, absolute paths, or media bytes. Candidate and crosswalk `senseSegmentationStatus` is based on parsed structured-group evidence; the presence of a `sourceSenseGroupReference` alone does not prove structured segmentation.

Requirements: Python 3.11+ standard library only. From the repository root run `python scripts/master-vocabulary-v2-hybrid-source-proof.py --repeat`. The command verifies both APKG files, recomputes their SHA-256 identities twice, refreshes the local raw cache, checks identical proof fingerprints, and deterministically rewrites this workspace and `vocabflow-dataset/reports/hybrid-100-sense-source-proof.md`.

All rights remain UNKNOWN / UNVERIFIED, and `shipEligible` is false for every source media candidate. Do not use this workspace as runtime import input.
"""
    (workspace / "README.md").write_text(readme, encoding="utf-8", newline="\n")
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(_render_report(proof), encoding="utf-8", newline="\n")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    repo_root = Path(__file__).resolve().parents[1]
    data_root = repo_root.parent
    parser.add_argument("--oxford", type=Path, default=data_root / EXPECTED_FILES["oxford"])
    parser.add_argument("--vocab4600", type=Path, default=data_root / EXPECTED_FILES["vocab4600"])
    parser.add_argument("--dataset-root", type=Path, default=repo_root / "vocabflow-dataset")
    parser.add_argument("--workspace", type=Path, default=repo_root / "vocabflow-dataset/workspaces/hybrid-100-sense-proof")
    parser.add_argument("--report", type=Path, default=repo_root / "vocabflow-dataset/reports/hybrid-100-sense-source-proof.md")
    parser.add_argument("--raw-cache", type=Path, default=repo_root / ".vocabflow-local/master-v2-hybrid-source")
    parser.add_argument("--check-only", action="store_true", help="compute and report identity/fingerprint without writing tracked outputs")
    parser.add_argument("--repeat", action="store_true", help="rebuild the proof independently and require an identical fingerprint")
    args = parser.parse_args(argv)
    if args.oxford.name != EXPECTED_FILES["oxford"] or args.vocab4600.name != EXPECTED_FILES["vocab4600"]:
        parser.error("Source basenames must match the two reviewed APKG identities.")
    if not args.oxford.is_file() or not args.vocab4600.is_file():
        missing = [path.name for path in (args.oxford, args.vocab4600) if not path.is_file()]
        parser.error("Required APKG source file is missing: " + ", ".join(missing))
    try:
        proof = build_proof(args.oxford, args.vocab4600, args.dataset_root, args.raw_cache)
        if args.repeat:
            second = build_proof(args.oxford, args.vocab4600, args.dataset_root, None)
            proof["coverage"]["run1ProofFingerprint"] = proof["proofFingerprint"]
            proof["coverage"]["run2ProofFingerprint"] = second["proofFingerprint"]
            identical = proof["proofFingerprint"] == second["proofFingerprint"]
            proof["coverage"]["repeatFingerprintIdentical"] = "YES" if identical else "NO"
            proof["coverage"]["proofStatus"]["proofDeterministic"] = identical
            if not identical:
                sys.stderr.write("PROOF_REPEAT_MISMATCH=YES\n")
                return 1
    except (FileNotFoundError, ValueError, OSError, sqlite3.Error, zipfile.BadZipFile) as error:
        sys.stderr.write(f"SOURCE_PROOF_FAILED={type(error).__name__}\n")
        return 1
    _refresh_readiness_flags(proof["coverage"]["proofStatus"])
    if not args.check_only:
        write_workspace(proof, args.workspace, args.report)
    coverage = proof["coverage"]
    print("SOURCE_PROOF_FINGERPRINT=" + proof["proofFingerprint"])
    print("SELECTED_SENSE_CANDIDATES=" + str(coverage["selectedSenseCandidateCount"]))
    print("SELECTED_OXFORD_STRUCTURED=" + str(coverage["selectedOxfordSegmentation"]["structured"]))
    print("SELECTED_OXFORD_FALLBACK=" + str(coverage["selectedOxfordSegmentation"]["fallback"]))
    print("SOURCE_SPLIT=" + json.dumps(coverage["sourceSplit"], sort_keys=True))
    print("CEFR=" + json.dumps(coverage["cefrSelectedOxford"], sort_keys=True))
    print("POLYSEMY_PAIRS=" + str(coverage["multiSenseLexemePairCount"]))
    print("DISTINCT_MULTI_SENSE_LEXEMES=" + str(coverage["distinctSelectedMultiSenseLexemeCount"]))
    print("POS_DISTRIBUTION=" + json.dumps(coverage["posDistribution"], sort_keys=True))
    print("ALIGNMENT=" + json.dumps(coverage["alignment"], sort_keys=True))
    print("SELECTION_FALLBACKS=" + json.dumps(coverage["selection"]["fallbackReasons"]))
    if args.repeat:
        print("RUN_1_PROOF_FINGERPRINT=" + coverage["run1ProofFingerprint"])
        print("RUN_2_PROOF_FINGERPRINT=" + coverage["run2ProofFingerprint"])
        print("REPEAT_FINGERPRINT_IDENTICAL=" + coverage["repeatFingerprintIdentical"])
    print("SOURCE_RIGHTS_VERIFIED=NO\nMEDIA_REUSE_ELIGIBLE=NO")
    print("HYBRID_100_EDITORIAL_AUTHORING_READY=" + ("YES" if coverage["proofStatus"]["editorialAuthoringReady"] else "NO"))
    print("PHASE_2F1A_READY=" + ("YES" if coverage["proofStatus"]["phase2f1aReady"] else "NO"))
    print("DATABASE_WRITES=NONE\nMASTER_CANONICAL_MUTATION=NONE")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
