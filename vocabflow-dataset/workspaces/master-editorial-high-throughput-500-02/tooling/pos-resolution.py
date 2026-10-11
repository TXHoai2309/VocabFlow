"""Verified additive authoring POS resolution; frozen and source objects stay immutable."""
import copy
import hashlib
import json
import re
from pathlib import Path

POLICY_SHA256 = "45f43cc85b6d0c05dc409d1cf1aab889eb9544df8f77ac4b1ac636c21014e270"
POLICY_REFERENCE = "owner-authorization-024a8647-e7be-4097-a910-1fd88c2ef0a3"
POS_TAGS = {"v": "VERB", "v.": "VERB", "verb": "VERB", "n": "NOUN", "n.": "NOUN", "noun": "NOUN", "adj": "ADJECTIVE", "adj.": "ADJECTIVE", "adjective": "ADJECTIVE", "adv": "ADVERB", "adv.": "ADVERB", "adverb": "ADVERB", "prep": "PREPOSITION", "preposition": "PREPOSITION", "pron": "PRONOUN", "pronoun": "PRONOUN", "det": "DETERMINER", "determiner": "DETERMINER", "conj": "CONJUNCTION", "conjunction": "CONJUNCTION"}

def require(condition, message):
    if not condition:
        raise ValueError(message)

def digest(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")).hexdigest()

def source_evidence(group, sources):
    return [{"reference": copy.deepcopy(ref), "record": sources[ref["corpus"]][ref["recordIndex"]]} for ref in group["sourceEvidence"]]

def explicit_tags(record):
    tags = []
    raw_pos = record.get("sourcePosRaw", "").strip()
    if raw_pos:
        values = [x.strip().lower() for x in re.split(r"[,;/|\n]+", raw_pos)]
        require(all(v in POS_TAGS for v in values), "Ambiguous or unknown source POS tag")
        tags.extend({"pointerSuffix": "sourcePosRaw", "rawTag": v, "mappedPOS": POS_TAGS[v]} for v in values)
    headword = record.get("rawHeadword", "")
    match = re.search(r"\(([^()]*)\)\s*$", headword)
    if match:
        raw_tag = match.group(1).strip().lower()
        require(raw_tag in POS_TAGS, "Ambiguous parenthetical source POS tag")
        tags.append({"pointerSuffix": "rawHeadword", "rawTag": raw_tag, "mappedPOS": POS_TAGS[raw_tag]})
    return tags

def provenance(group, evidence):
    require(len(evidence) == len(group["sourceEvidence"]) and evidence, "Missing linked source evidence")
    result = []
    for expected, item in zip(group["sourceEvidence"], evidence):
        ref, record = item["reference"], item["record"]
        require(ref == expected, "Source reference binding mismatch")
        record_hash = digest({k: v for k, v in record.items() if k != "recordEvidenceSha256"})
        require(record_hash == record.get("recordEvidenceSha256") == ref["recordEvidenceSha256"], "Incorrect pinned source evidence hash")
        require(record["sourceRecordId"] == ref["sourceRecordId"] and record["sourceNoteGuid"] == ref["sourceNoteGuid"], "Source record identity mismatch")
        require(record["normalizedHeadword"] == group["normalizedHeadword"], "Source headword binding mismatch")
        index = ref["recordIndex"]
        require(ref["rawHeadwordEvidencePointer"] == f"/records/{index}/rawHeadword" and ref["rawPosEvidencePointer"] == f"/records/{index}/sourcePosRaw" and ref["rawContentPointer"] == f"/records/{index}/sourceFields", "Raw pointer binding mismatch")
        tags = explicit_tags(record)
        require(tags, "No explicit raw source POS evidence")
        result.append({"sourceCorpus": ref["corpus"], "sourceArtifact": ref["artifact"], "sourceRecordIndex": index, "sourceRecordId": ref["sourceRecordId"], "sourceNoteGuid": ref["sourceNoteGuid"], "sourceRecordSha256": record_hash, "rawHeadwordEvidencePointer": ref["rawHeadwordEvidencePointer"], "rawPosEvidencePointer": ref["rawPosEvidencePointer"], "rawContentPointer": ref["rawContentPointer"], "rawHeadword": record["rawHeadword"], "rawSourcePOS": record["sourcePosRaw"], "explicitPOSTags": tags})
    return result

def resolveEffectivePOS(group, evidence, approvedResolution):
    original = group["normalizedPosCandidates"]
    if original:
        return list(original)
    require(isinstance(approvedResolution, dict), "Empty POS requires approved resolution entry")
    entry = approvedResolution
    require(entry["candidateGroupKey"] == group["candidateGroupKey"] and entry["frozenCohortOrder"] == group["cohortOrder"] and entry["checkpoint"] == group["checkpoint"], "Resolution scope mismatch")
    require(entry["originalNormalizedPosCandidates"] == original == [], "Resolution original POS mismatch")
    require(entry["ownerPolicyReference"] == POLICY_REFERENCE and entry["ownerPolicySha256"] == POLICY_SHA256 and entry["validationStatus"] == "VERIFIED_EXPLICIT_SOURCE_POS", "Resolution owner policy/status mismatch")
    actual = provenance(group, evidence)
    require(entry["sourceProvenance"] == actual, "Resolution provenance mismatch")
    mapped = {tag["mappedPOS"] for item in actual for tag in item["explicitPOSTags"]}
    require(len(mapped) == 1, "Conflicting source POS evidence")
    require(entry["resolvedPOS"] == sorted(mapped), "Resolved POS differs from source tags")
    require(len(entry.get("resolutionRationale", "")) >= 70, "Missing resolution rationale")
    return list(entry["resolvedPOS"])

def approved_entries(path):
    value = json.loads(Path(path).read_bytes().decode("utf-8"))
    entries = value["entries"]
    require(len(entries) == len({e["candidateGroupKey"] for e in entries}), "Duplicate resolution entries")
    return {e["candidateGroupKey"]: e for e in entries}
