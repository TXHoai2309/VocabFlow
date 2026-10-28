#!/usr/bin/env python3
"""Deterministically map the pinned English Vocabulary 4600 manifest to the current staging snapshot."""

from __future__ import annotations

import hashlib
import html
import json
import re
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
WORKSPACE = ROOT / "vocabflow-dataset/workspaces/english-vocabulary-4600-media-v2"
MANIFEST_PATH = WORKSPACE / "media-manifest-v2.json"
SNAPSHOT_PATH = WORKSPACE / "current-effective-staging-snapshot-v1.json"
INVENTORY_PATH = ROOT / "vocabflow-dataset/workspaces/full-source-inventory-dedupe/vocab4600-normalized-inventory.json"
CROSSWALK_PATH = ROOT / "vocabflow-dataset/workspaces/full-source-inventory-dedupe/lexical-candidate-groups.json"
BUNDLE_PATH = WORKSPACE / "media-mapping-bundle-v1.json"
RIGHTS_PATH = WORKSPACE / "media-rights-ledger-v1.json"
PLAN_PATH = WORKSPACE / "cloudinary-offline-plan-v2.json"

APKG_SHA256 = "495077028ede6f4de9ff166c605673da379ac4ce32113e49099f6d8e28ffbd6b"
PROJECT_ID = "shy-hill-72364426"
BRANCH_ID = "br-square-grass-b3af0nte"
EXPECTED_EFFECTIVE = 5616
EXPECTED_IDENTITIES = 7451


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def stable_json(value: Any) -> bytes:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")


def pretty_json(value: Any) -> bytes:
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + "\n").encode("utf-8")


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def verify_snapshot(snapshot_raw: bytes, snapshot: dict[str, Any]) -> str:
    sidecar = SNAPSHOT_PATH.with_suffix(SNAPSHOT_PATH.suffix + ".sha256").read_text(encoding="utf-8").split()[0]
    actual = sha256_bytes(snapshot_raw)
    if actual != sidecar:
        raise ValueError("CURRENT_STAGING_SNAPSHOT_SHA256_MISMATCH")
    if snapshot.get("snapshotVersion") != "current-effective-staging-snapshot-v1":
        raise ValueError("CURRENT_STAGING_SNAPSHOT_VERSION_MISMATCH")
    target = snapshot.get("target", {})
    if (target.get("projectId"), target.get("branchId"), target.get("databaseName")) != (PROJECT_ID, BRANCH_ID, "neondb"):
        raise ValueError("CURRENT_STAGING_SNAPSHOT_TARGET_MISMATCH")
    summary = snapshot.get("summary", {})
    statuses = {row["resolution_status"]: int(row["rows"]) for row in summary.get("resolutionStatuses", [])}
    if len(snapshot.get("effectiveSenses", [])) != EXPECTED_EFFECTIVE:
        raise ValueError("CURRENT_STAGING_EFFECTIVE_TARGET_MISMATCH")
    proposal_keys = [str(row.get("proposalKey", "")) for row in snapshot["effectiveSenses"]]
    if len(set(proposal_keys)) != EXPECTED_EFFECTIVE or int(summary.get("uniqueEffectiveProposalIdentities", 0)) != EXPECTED_EFFECTIVE:
        raise ValueError("CURRENT_STAGING_EFFECTIVE_PROPOSAL_IDENTITY_MISMATCH")
    if int(summary.get("identityRows", 0)) != EXPECTED_IDENTITIES or statuses != {
        "EFFECTIVE": 5616,
        "PENDING_CONTENT_VALIDATION": 1689,
        "PENDING_VERSION_DECISION": 146,
    }:
        raise ValueError("CURRENT_STAGING_IDENTITY_BASELINE_MISMATCH")
    if any(
        row.get("editorialStatus") != "DRAFT"
        or row.get("contentHash") != row.get("draftContentHash")
        or not re.fullmatch(r"[0-9a-f]{64}", str(row.get("contentHash", "")))
        for row in snapshot["effectiveSenses"]
    ):
        raise ValueError("CURRENT_STAGING_EFFECTIVE_HASH_OR_STATUS_MISMATCH")
    if int(summary.get("missingOrNonDraftEffectiveRows", -1)) != 0:
        raise ValueError("CURRENT_STAGING_MISSING_OR_NON_DRAFT_ROWS")
    if int(summary.get("multipleSelectedCandidateVersions", -1)) != 0:
        raise ValueError("CURRENT_STAGING_MULTIPLE_EFFECTIVE_VERSIONS")
    if int(summary.get("effectiveRowsWithoutCandidateVersionHistory", -1)) != 573:
        raise ValueError("CURRENT_STAGING_RECOVERY_VERSION_LINEAGE_CHANGED")
    return actual


def clean_text(value: str) -> str:
    value = html.unescape(re.sub(r"<[^>]*>", " ", value or ""))
    value = unicodedata.normalize("NFKC", value).casefold()
    return " ".join(re.findall(r"[\w']+", value, flags=re.UNICODE))


def source_english_definition(record: dict[str, Any]) -> str:
    candidates = record.get("sourceDefinitionExampleEvidence", {}).get("englishDefinitionCandidates", [])
    for item in candidates:
        value = item.get("rawSegment", "")
        if isinstance(value, str) and value.strip():
            return value
    return ""


def pos_classes(record: dict[str, Any]) -> set[str]:
    return {str(value).strip().upper() for value in record.get("sourcePosClassesCandidate", []) if str(value).strip()}


def lemma_key(record: dict[str, Any]) -> str:
    return clean_text(str(record.get("normalizedHeadword", record.get("headwordText", ""))))


STOP_WORDS = {
    "a", "an", "the", "is", "are", "was", "were", "be", "been", "being", "to", "of", "in", "on", "at",
    "for", "from", "with", "by", "as", "and", "or", "but", "that", "this", "these", "those", "it", "its",
    "you", "your", "someone", "something", "another", "one", "do", "does", "did", "have", "has", "had", "can",
    "could", "will", "would", "may", "might", "should", "must", "often", "used", "use", "when", "what", "who",
    "how", "which", "their", "they", "them", "he", "she", "we", "i", "not", "than", "then", "into", "about",
}


def semantic_tokens(value: str, lemma: str) -> set[str]:
    tokens = set(clean_text(value).split())
    lemma_tokens = set(clean_text(lemma).split())
    result = set()
    for token in tokens - STOP_WORDS - lemma_tokens:
        if len(token) > 4 and token.endswith("ies"):
            token = token[:-3] + "y"
        elif len(token) > 5 and token.endswith(("ing", "ed")):
            token = token[:-3] if token.endswith("ing") else token[:-2]
        elif len(token) > 4 and token.endswith("s") and not token.endswith("ss"):
            token = token[:-1]
        result.add(token)
    return result


def semantic_score(source_text: str, sense: dict[str, Any], lemma: str) -> float:
    source_tokens = semantic_tokens(source_text, lemma)
    target_content = sense.get("content", {})
    target_text = " ".join(
        str(part)
        for part in (
            target_content.get("senseIdentity", {}).get("senseLabelEn", ""),
            target_content.get("definitionEn", ""),
        )
    )
    target_tokens = semantic_tokens(target_text, lemma)
    if not source_tokens or not target_tokens:
        return 0.0
    overlap = len(source_tokens & target_tokens)
    # Weighted overlap rewards a concise source definition covering most of a sense definition.
    return round(2 * overlap / (len(source_tokens) + len(target_tokens)), 4)


def exact_candidate(records: list[dict[str, Any]], target_senses: list[dict[str, Any]]) -> tuple[dict[str, Any] | None, str]:
    source_example = clean_text(str(records[0].get("sourceFields", {}).get("Example", ""))) if records else ""
    if not source_example:
        return None, "SOURCE_EXAMPLE_EMPTY"
    hits: list[tuple[dict[str, Any], int, dict[str, Any]]] = []
    for sense in target_senses:
        for index, example in enumerate(sense.get("content", {}).get("examples", [])):
            if source_example == clean_text(str(example.get("en", ""))):
                hits.append((sense, index, example))
    if len(hits) == 1:
        sense, index, example = hits[0]
        return {"sense": sense, "index": index, "example": example}, "EXACT_TEXT_MATCH"
    if len(hits) > 1:
        return None, "EXACT_TEXT_MATCH_MULTIPLE_TARGETS"
    return None, "EXAMPLE_TEXT_MISMATCH"


def map_bundle() -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]]:
    manifest_raw = MANIFEST_PATH.read_bytes()
    snapshot_raw = SNAPSHOT_PATH.read_bytes()
    inventory_raw = INVENTORY_PATH.read_bytes()
    crosswalk_raw = CROSSWALK_PATH.read_bytes()
    manifest = json.loads(manifest_raw)
    snapshot = json.loads(snapshot_raw)
    inventory = json.loads(inventory_raw)
    crosswalk = json.loads(crosswalk_raw)
    snapshot_sha = verify_snapshot(snapshot_raw, snapshot)

    if manifest.get("manifestVersion") != "english-vocabulary-4600-media-v2.0.0":
        raise ValueError("SOURCE_MANIFEST_VERSION_MISMATCH")
    source = manifest.get("source", {})
    if source.get("sourceId") != "ENGLISH_VOCAB_4600" or source.get("apkgSha256") != APKG_SHA256:
        raise ValueError("SOURCE_MANIFEST_APKG_PIN_MISMATCH")
    if int(source.get("apkgByteLength", 0)) != 584090331:
        raise ValueError("SOURCE_MANIFEST_APKG_LENGTH_MISMATCH")
    if len(manifest.get("assets", [])) != 13977 or len(manifest.get("mappings", [])) != 14012:
        raise ValueError("SOURCE_MANIFEST_COUNTS_MISMATCH")
    mapping_keys = [str(row.get("mapping_key", "")) for row in manifest["mappings"]]
    if len(set(mapping_keys)) != len(mapping_keys) or any(not re.fullmatch(r"[0-9a-f]{64}", key) for key in mapping_keys):
        raise ValueError("SOURCE_MANIFEST_MAPPING_KEY_INTEGRITY_FAILURE")
    assets = {str(row["media_sha256"]): row for row in manifest["assets"]}
    if len(assets) != len(manifest["assets"]):
        raise ValueError("SOURCE_MANIFEST_DUPLICATE_ASSET_HASH")
    for row in manifest["mappings"]:
        asset = assets.get(str(row.get("media_sha256")))
        if asset is None:
            raise ValueError("SOURCE_MANIFEST_MAPPING_ASSET_MISSING")
        if not re.fullmatch(r"[0-9a-f]{64}", str(row.get("source_record_evidence_sha256", ""))):
            raise ValueError("SOURCE_MANIFEST_NOTE_EVIDENCE_HASH_INVALID")
    records = inventory.get("records", [])
    by_record_id = {str(row["sourceRecordId"]): row for row in records}
    if len(by_record_id) != len(records) or len(records) != 4673:
        raise ValueError("SOURCE_INVENTORY_RECORD_ID_INTEGRITY_FAILURE")
    groups = crosswalk.get("groups", [])
    record_group: dict[str, str] = {}
    for group in groups:
        for record_id in group.get("vocab4600SourceRecordIds", []):
            if str(record_id) in record_group and record_group[str(record_id)] != group["candidateGroupKey"]:
                raise ValueError("SOURCE_RECORD_MULTIPLE_CROSSWALK_GROUPS")
            record_group[str(record_id)] = str(group["candidateGroupKey"])

    for row in manifest["mappings"]:
        record_id = str(row.get("source_note_id", ""))
        record = by_record_id.get(record_id)
        if record is None:
            raise ValueError("SOURCE_MANIFEST_NOTE_ID_NOT_IN_PINNED_INVENTORY")
        if row.get("source_note_guid") != record.get("sourceNoteGuid"):
            raise ValueError("SOURCE_MANIFEST_NOTE_GUID_MISMATCH")
        if row.get("source_record_evidence_sha256") != record.get("recordEvidenceSha256"):
            raise ValueError("SOURCE_MANIFEST_NOTE_EVIDENCE_MISMATCH")
        if row.get("source_note_id") != record.get("sourceRecordId"):
            raise ValueError("SOURCE_MANIFEST_NOTE_ID_MISMATCH")

    effective = snapshot["effectiveSenses"]
    all_identities = effective + snapshot["nonEffectiveIdentities"]
    identities_by_group: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for identity in all_identities:
        identities_by_group[str(identity.get("sourceGroupKey", ""))].append(identity)
    effective_by_source_record: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for sense in effective:
        for ref in sense.get("draftSourceProvenance", {}).get("sourceEvidenceReferences", []):
            if ref.get("corpus") == "ENGLISH_VOCAB_4600" and ref.get("verificationStatus") == "PASS_RECORD_PIN":
                record_id = str(ref.get("sourceRecordId", ""))
                record = by_record_id.get(record_id)
                if record is None or ref.get("sourceNoteGuid") != record.get("sourceNoteGuid") or ref.get("recordEvidenceSha256") != record.get("recordEvidenceSha256"):
                    raise ValueError("TARGET_SOURCE_PROVENANCE_RECORD_PIN_MISMATCH")
                effective_by_source_record[record_id].append(sense)
    for record_id, senses in effective_by_source_record.items():
        effective_by_source_record[record_id] = list({sense["proposalKey"]: sense for sense in senses}.values())

    mapping_counts: Counter[str] = Counter()
    mapping_rows: list[dict[str, Any]] = []
    unique_lexemes: set[str] = set()
    unique_sense_proposals: set[str] = set()
    unique_image_sense_proposals: set[str] = set()
    unique_example_assets: set[str] = set()
    exact_example_rows = mismatch_example_rows = unresolved_example_rows = 0
    ambiguous_rows = unmatched_rows = pending_candidate_rows = 0

    for row in manifest["mappings"]:
        source_id = str(row["source_note_id"])
        record = by_record_id[source_id]
        asset = assets[str(row["media_sha256"])]
        group_key = record_group.get(source_id)
        source_pos = pos_classes(record)
        effective_candidates = effective_by_source_record.get(source_id, [])
        valid_senses = [
            sense
            for sense in effective_candidates
            if sense.get("sourceGroupKey") == group_key
            and clean_text(str(sense.get("content", {}).get("headword", ""))) == lemma_key(record)
            and str(sense.get("content", {}).get("partOfSpeech", "")).upper() in source_pos
        ]
        pending_candidates = [
            identity
            for identity in identities_by_group.get(group_key or "", [])
            if identity.get("resolutionStatus") != "EFFECTIVE"
        ]
        row_kind = str(row.get("media_kind", ""))
        status = "UNMATCHED_NO_VERIFIED_TARGET_CANDIDATE"
        target_lexeme: str | None = None
        target_proposal: str | None = None
        target_example_key: str | None = None
        target_example_index: int | None = None
        target_content_fingerprint: str | None = None
        evidence: dict[str, Any] = {
            "sourceNoteIdentityVerified": True,
            "sourceGroupCrosswalkKey": group_key,
            "sourceLemma": lemma_key(record),
            "sourcePosClasses": sorted(source_pos),
            "sourceIpaSha256": sha256_bytes(str(record.get("sourceFields", {}).get("IPA", "")).encode("utf-8"))
            if record.get("sourceFields", {}).get("IPA") else None,
            "effectiveSourceEvidenceProposalKeys": sorted(sense["proposalKey"] for sense in valid_senses),
            "semanticComparison": None,
            "exampleTextComparison": None,
            "candidateProposalKeysPendingSelection": sorted(identity["proposalKey"] for identity in pending_candidates),
        }
        confidence = 0.0

        if row_kind == "WORD_PRONUNCIATION_AUDIO":
            group_identities = identities_by_group.get(group_key or "", [])
            matching_pos = {
                str(sense.get("content", {}).get("partOfSpeech", "")).upper()
                for sense in effective
                if sense.get("sourceGroupKey") == group_key
                and clean_text(str(sense.get("content", {}).get("headword", ""))) == lemma_key(record)
            }
            crosswalk_pos = {str(value).upper() for group in groups if group.get("candidateGroupKey") == group_key for value in group.get("candidateSamePosValues", [])}
            compatible = bool((matching_pos | crosswalk_pos) & source_pos)
            if group_key and group_identities and group_key == "NORMALIZED_HEADWORD:" + lemma_key(record) and compatible:
                target_lexeme = group_key
                status = "MATCHED_LEXEME_SOURCE_IDENTITY_LEMMA_POS_PRONUNCIATION"
                evidence["pronunciationEvidence"] = "SOURCE_NOTE_FIELD_SOUND_AND_IPA"
                confidence = 1.0
                unique_lexemes.add(group_key)
            elif pending_candidates:
                status = "SOURCE_CANDIDATE_PENDING_TARGET_SELECTION"
                pending_candidate_rows += 1
            else:
                unmatched_rows += 1

        elif row_kind == "EXAMPLE_SENTENCE_AUDIO":
            exact, comparison = exact_candidate([record], valid_senses)
            source_example = str(record.get("sourceFields", {}).get("Example", ""))
            target_candidates = []
            if exact:
                sense = exact["sense"]
                target_proposal = sense["proposalKey"]
                target_example_index = int(exact["index"])
                target_example_key = str(exact["example"].get("exampleKey", "")) or None
                target_content_fingerprint = str(sense["contentHash"])
                status = "MATCHED_EXAMPLE_AUDIO_EXACT_TEXT"
                confidence = 1.0
                exact_example_rows += 1
                unique_example_assets.add(str(row["media_sha256"]))
                unique_sense_proposals.add(target_proposal)
            elif comparison == "EXACT_TEXT_MATCH_MULTIPLE_TARGETS":
                status = "AMBIGUOUS_EXAMPLE_AUDIO_EXACT_TEXT_MULTIPLE_TARGETS"
                ambiguous_rows += 1
                evidence["exampleTextComparison"] = {
                    "method": "NFKC_CASEFOLD_HTML_STRIP_WORD_SEQUENCE_EXACT",
                    "sourceExampleSha256": sha256_bytes(clean_text(source_example).encode("utf-8")),
                    "result": comparison,
                    "mismatchCandidateProposalKeys": sorted(sense["proposalKey"] for sense in valid_senses),
                }
            elif valid_senses:
                status = "UNRESOLVED_EXAMPLE_TEXT_MISMATCH"
                mismatch_example_rows += 1
                target_candidates = sorted(sense["proposalKey"] for sense in valid_senses)
            else:
                status = "UNRESOLVED_EXAMPLE_NO_EFFECTIVE_TARGET"
                unresolved_example_rows += 1
            evidence["exampleTextComparison"] = {
                "method": "NFKC_CASEFOLD_HTML_STRIP_WORD_SEQUENCE_EXACT",
                "sourceExampleSha256": sha256_bytes(clean_text(source_example).encode("utf-8")),
                "result": comparison,
                "mismatchCandidateProposalKeys": target_candidates,
            }

        elif row_kind == "ILLUSTRATION_IMAGE":
            definition = source_english_definition(record)
            scored = sorted(
                ((semantic_score(definition, sense, lemma_key(record)), sense) for sense in valid_senses),
                key=lambda item: (-item[0], item[1]["proposalKey"]),
            )
            best_score = scored[0][0] if scored else 0.0
            second_score = scored[1][0] if len(scored) > 1 else 0.0
            unique_best = bool(scored) and (len(scored) == 1 or best_score - second_score >= 0.15)
            if unique_best and best_score >= 0.22:
                selected = scored[0][1]
                target_proposal = str(selected["proposalKey"])
                target_content_fingerprint = str(selected["contentHash"])
                status = "PROPOSED_SENSE_SOURCE_MEANING_MATCH_REQUIRES_VISUAL_REVIEW"
                confidence = round(min(0.99, 0.55 + best_score * 0.4), 3)
                unique_sense_proposals.add(target_proposal)
                unique_image_sense_proposals.add(target_proposal)
                evidence["semanticComparison"] = {
                    "method": "PINNED_SOURCE_NOTE_MEANING_VS_TARGET_LABEL_AND_DEFINITION_TOKEN_DICE",
                    "sourceMeaningSha256": sha256_bytes(clean_text(definition).encode("utf-8")),
                    "winnerProposalKey": target_proposal,
                    "winnerScore": best_score,
                    "runnerUpScore": second_score,
                    "candidateScores": [{"proposalKey": sense["proposalKey"], "score": score} for score, sense in scored],
                    "visualReview": "NOT_PERFORMED",
                }
            elif len(valid_senses) > 1:
                status = "AMBIGUOUS_SENSE_MAPPING"
                ambiguous_rows += 1
                evidence["semanticComparison"] = {
                    "method": "PINNED_SOURCE_NOTE_MEANING_VS_TARGET_LABEL_AND_DEFINITION_TOKEN_DICE",
                    "sourceMeaningSha256": sha256_bytes(clean_text(definition).encode("utf-8")),
                    "candidateScores": [{"proposalKey": sense["proposalKey"], "score": score} for score, sense in scored],
                    "visualReview": "NOT_PERFORMED",
                }
            elif pending_candidates:
                status = "SOURCE_CANDIDATE_PENDING_TARGET_SELECTION"
                pending_candidate_rows += 1
            else:
                status = "UNMATCHED_NO_VERIFIED_SENSE_CANDIDATE"
                unmatched_rows += 1
        else:
            raise ValueError("SOURCE_MANIFEST_MEDIA_KIND_UNKNOWN")

        rights_status = str(asset.get("rights_status", "UNKNOWN_REVIEW_REQUIRED"))
        if rights_status not in {"CLEARED_FOR_INTENDED_USE", "INTERNAL_REFERENCE_ONLY", "UNKNOWN_REVIEW_REQUIRED", "RESTRICTED"}:
            raise ValueError("RIGHTS_STATUS_INVALID")
        if rights_status == "UNKNOWN_REVIEW_REQUIRED" and asset.get("upload_eligible") is not False:
            raise ValueError("RIGHTS_GATE_UPLOAD_ELIGIBILITY_FAILURE")
        bundle_row = {
            "mappingKey": row["mapping_key"],
            "mediaSha256": row["media_sha256"],
            "sourceNoteIdentity": {
                "sourceRecordId": source_id,
                "sourceNoteGuid": row["source_note_guid"],
                "recordEvidenceSha256": row["source_record_evidence_sha256"],
            },
            "mediaKind": row_kind,
            "sourceField": row["source_field"],
            "sourceFilename": row["source_filename"],
            "sourceReferenceOrdinal": int(row["source_reference_ordinal"]),
            "targetLexemeIdentity": target_lexeme,
            "targetSenseProposalKey": target_proposal,
            "targetExampleKey": target_example_key,
            "targetExampleIndex": target_example_index,
            "targetContentFingerprint": target_content_fingerprint,
            "targetSnapshotFingerprint": snapshot["snapshotFingerprint"],
            "mappingStatus": status,
            "mappingConfidence": confidence,
            "mappingEvidence": evidence,
            "rightsStatus": rights_status,
            "uploadEligible": False,
        }
        mapping_counts[status] += 1
        mapping_rows.append(bundle_row)

    rights_evidence = [
        {
            "evidenceId": "ANKIVN_PAGE_LEVEL_CC_BY_NC_NOTICE",
            "url": "https://ankivn.com/decks/4600-english-vocab-anki-vietnam/",
            "scope": "PAGE_LEVEL_ONLY",
            "finding": "Deck listing page-level notice does not establish permissions for individual third-party image/audio files.",
        },
        {
            "evidenceId": "CC_BY_NC_LICENSE_SCOPE_REFERENCE",
            "url": "https://creativecommons.org/licenses/by-nc/4.0/",
            "scope": "LICENSE_SCOPE_REFERENCE",
            "finding": "A page-level CC BY-NC statement does not by itself prove asset-level authority or rights for intended distribution.",
        },
    ]
    rights_group_id = sha256_bytes(stable_json(rights_evidence))
    rights_rows = []
    for asset in sorted(manifest["assets"], key=lambda item: item["media_sha256"]):
        status = str(asset.get("rights_status", "UNKNOWN_REVIEW_REQUIRED"))
        if status != "UNKNOWN_REVIEW_REQUIRED" or asset.get("upload_eligible") is not False:
            raise ValueError("UNSUPPORTED_RIGHTS_CLEARANCE_IN_SOURCE_MANIFEST")
        rights_rows.append({
            "mediaSha256": asset["media_sha256"],
            "sourceFileIdentities": asset.get("source_file_identities", []),
            "sourceNoteIdentities": asset.get("source_note_identities", []),
            "rightsStatus": "UNKNOWN_REVIEW_REQUIRED",
            "evidenceGroupId": rights_group_id,
            "evidence": rights_evidence,
            "uploadEligible": False,
        })

    counts = {
        "sourcePhysicalAssets": len(assets),
        "sourceReferenceMappings": len(mapping_rows),
        "matchedLexemes": len(unique_lexemes),
        "matchedSenseCandidates": len(unique_image_sense_proposals),
        "matchedSenseMappingRows": mapping_counts["PROPOSED_SENSE_SOURCE_MEANING_MATCH_REQUIRES_VISUAL_REVIEW"],
        "matchedExampleAudioRowsExactText": exact_example_rows,
        "matchedExampleAudioAssetsExactText": len(unique_example_assets),
        "exampleAudioTextMismatch": mismatch_example_rows,
        "exampleAudioUnresolved": unresolved_example_rows,
        "ambiguousMappings": ambiguous_rows,
        "unmatchedMappings": unmatched_rows,
        "pendingTargetSelectionCandidates": pending_candidate_rows,
        "rightsClearedAssets": 0,
        "rightsUnknownAssets": len(rights_rows),
        "rightsBlockedAssets": len(rights_rows),
        "cloudinaryEligibleAssets": 0,
    }
    bundle = {
        "schemaVersion": 1,
        "bundleVersion": "english-vocabulary-4600-media-mapping-bundle-v1.0.0",
        "source": {
            "sourceId": "ENGLISH_VOCAB_4600",
            "apkgSha256": APKG_SHA256,
            "sourceManifestSha256": sha256_bytes(manifest_raw),
            "sourceInventorySha256": sha256_bytes(inventory_raw),
            "sourceCrosswalkSha256": sha256_bytes(crosswalk_raw),
        },
        "target": {
            "projectId": PROJECT_ID,
            "branchId": BRANCH_ID,
            "databaseName": "neondb",
            "schema": "vocabflow_editorial_staging",
            "snapshotVersion": snapshot["snapshotVersion"],
            "snapshotSha256": snapshot_sha,
            "snapshotFingerprint": snapshot["snapshotFingerprint"],
            "effectiveSenseCount": EXPECTED_EFFECTIVE,
            "identityCount": EXPECTED_IDENTITIES,
            "currentEffectiveProjectionCount": int(snapshot["summary"]["effectiveDraftRows"]),
            "candidateVersionHistoryRowsMissing": int(snapshot["summary"]["effectiveRowsWithoutCandidateVersionHistory"]),
        },
        "counts": counts,
        "statusCounts": dict(sorted(mapping_counts.items())),
        "mappings": mapping_rows,
    }
    rights_ledger = {
        "schemaVersion": 1,
        "ledgerVersion": "english-vocabulary-4600-media-rights-ledger-v1.0.0",
        "sourceApkgSha256": APKG_SHA256,
        "sourceManifestSha256": sha256_bytes(manifest_raw),
        "rightsEvidenceGroupCount": 1,
        "evidenceGroups": [{"evidenceGroupId": rights_group_id, "status": "UNKNOWN_REVIEW_REQUIRED", "evidence": rights_evidence}],
        "counts": {"assets": len(rights_rows), "CLEARED_FOR_INTENDED_USE": 0, "INTERNAL_REFERENCE_ONLY": 0, "UNKNOWN_REVIEW_REQUIRED": len(rights_rows), "RESTRICTED": 0},
        "assets": rights_rows,
    }
    offline_plan = {
        "schemaVersion": 2,
        "manifestVersion": manifest["manifestVersion"],
        "mappingBundleVersion": bundle["bundleVersion"],
        "mode": "OFFLINE_PLAN_ONLY",
        "source": "ENGLISH_VOCAB_4600",
        "vocabflowCloudinaryConfig": {
            "configSource": "VocabFlow repository .env",
            "cloudNameConfigured": True,
            "apiKeyConfigured": True,
            "apiSecretConfigured": True,
            "mediaProviderCloudinaryConfigured": True,
            "imageFolderConfigured": True,
            "audioFolderConfigured": True,
            "valuesPrinted": False,
        },
        "rightsLedgerVersion": rights_ledger["ledgerVersion"],
        "rightsClearedAssets": 0,
        "rightsBlockedAssets": len(rights_rows),
        "eligibleAssets": 0,
        "plannedUploads": [],
        "canary": {"status": "BLOCKED_RIGHTS_UNKNOWN", "eligibleImage": None, "eligibleWordAudio": None, "eligibleExampleAudio": None},
        "bulkUpload": "BLOCKED_RIGHTS_UNKNOWN",
        "networkRequestsMade": 0,
        "credentialValuesPrinted": False,
    }
    return bundle, rights_ledger, offline_plan


def write_deterministic(path: Path, value: Any) -> str:
    payload = pretty_json(value)
    path.write_bytes(payload)
    digest = sha256_bytes(payload)
    path.with_suffix(path.suffix + ".sha256").write_text(f"{digest}  {path.name}\n", encoding="ascii")
    return digest


def main() -> None:
    bundle, rights, plan = map_bundle()
    bundle_sha = write_deterministic(BUNDLE_PATH, bundle)
    rights_sha = write_deterministic(RIGHTS_PATH, rights)
    write_deterministic(PLAN_PATH, plan)
    print(json.dumps({
        "mappingBundle": str(BUNDLE_PATH.relative_to(ROOT)),
        "mappingBundleSha256": bundle_sha,
        "rightsLedger": str(RIGHTS_PATH.relative_to(ROOT)),
        "rightsLedgerSha256": rights_sha,
        "counts": bundle["counts"],
        "statusCounts": bundle["statusCounts"],
        "deterministic": True,
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
