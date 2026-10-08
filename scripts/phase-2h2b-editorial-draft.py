#!/usr/bin/env python3
"""Assemble persisted AI-generated editorial proposals; no AI calls or Master writer."""
from __future__ import annotations
import argparse
import hashlib
import importlib.util
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "vocabflow-dataset/workspaces/full-master-expansion-candidate-preparation"
SOURCE = ROOT / "vocabflow-dataset/workspaces/full-source-inventory-dedupe"
WORKSPACE = ROOT / "vocabflow-dataset/workspaces/master-editorial-draft-pilot"
REPORT = ROOT / "vocabflow-dataset/reports/master-editorial-draft-pilot.md"
BASELINE = "a2f4f54eefc6734eb7da805f80ff8a9c6ebd4690"
PHASE2A = "5b754405d9072e79b603e6b008bd8788a7dae7aed4f2eedde3087482fc0bc7ff"
RIGHTS = "UNKNOWN_REVIEW_REQUIRED"
POS = {"NOUN", "VERB", "ADJECTIVE", "ADVERB", "PREPOSITION", "PRONOUN", "DETERMINER", "CONJUNCTION", "INTERJECTION", "OTHER"}
AUTH = {k: False for k in ["canonicalIdentity", "canonicalAuthoring", "ownerApproval", "releasePublication", "runtimeMapping", "developmentApply", "legacyCleanup", "mediaPublishing", "databaseAccess", "databaseWrite", "production"]}


def load(path):
    return json.loads(path.read_text(encoding="utf-8"))


def digest(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")).hexdigest()


def require(condition, reason):
    if not condition:
        raise ValueError(reason)


def words(text):
    return re.findall(r"[^\W\d_]+", text.casefold())


def ngrams(text, size=8):
    tokens = words(re.sub(r"<[^>]*>", " ", text))
    return {tuple(tokens[i:i+size]) for i in range(len(tokens)-size+1)}


def inputs():
    manifest = load(INPUT / "manifest.json")
    require(manifest["fingerprint"] == PHASE2A, "Phase 2H.2A fingerprint drift")
    artifacts = {name: load(INPUT/name) for name in manifest["files"]}
    require(digest(artifacts) == PHASE2A, "Phase 2H.2A artifact drift")
    require(all(digest(value) == manifest["artifactCanonicalHashes"][name] for name, value in artifacts.items()), "Input hash drift")
    spec = importlib.util.spec_from_file_location("expansion2a", ROOT / "scripts/phase-2h2a-master-expansion.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    source_data, legacy, protected_pins = module.checked_inputs()
    pilot = artifacts["pilot-cohort.json"]["groups"]
    owner = artifacts["pilot-owner-review.json"]["groups"]
    require(len(pilot) == len({r["candidateGroupKey"] for r in pilot}) == 100, "Pilot membership drift")
    require(all(r["ownerDecision"] == "UNRESOLVED" and not r["materializationEligible"] for r in owner), "Owner input approval drift")
    ledger = artifacts["full-master-expansion-candidate-ledger.json"]["groups"]
    require(len(ledger) == 6143 and artifacts["authoring-readiness.json"]["currentlyMaterializableGroups"] == 0, "Input readiness drift")
    selected = {r["candidateGroupKey"] for r in pilot}
    groups = sorted([g for g in ledger if g["candidateGroupKey"] in selected], key=lambda g: g["normalizedHeadword"])
    sources = {"OXFORD_5000": source_data["oxford-normalized-inventory.json"]["records"], "ENGLISH_VOCAB_4600": source_data["vocab4600-normalized-inventory.json"]["records"]}
    release = ROOT / protected_pins["hybridReleaseBase"]
    master_manifest = load(release / "dataset.json")
    master_senses = {p["masterSenseId"]: (p, load(release/p["recordPath"])) for p in master_manifest["includedSenses"]}
    return groups, sources, master_senses, artifacts, protected_pins


def read_authored(groups):
    result = defaultdict(list)
    hashes = {}
    for batch_index in range(5):
        path = WORKSPACE / f"authored/batch-{batch_index+1:02d}.psv"
        text = path.read_text(encoding="utf-8")
        hashes[path.relative_to(WORKSPACE).as_posix()] = {"sha256LfUtf8": hashlib.sha256(text.encode("utf-8")).hexdigest(), "encoding": "UTF8_UNIVERSAL_NEWLINES_NORMALIZED_TO_LF"}
        expected = {g["normalizedHeadword"] for g in groups[batch_index*20:(batch_index+1)*20]}
        found = set()
        for line_index, line in enumerate(text.splitlines(), 1):
            if not line.strip():
                continue
            fields = line.split("|")
            require(len(fields) == 10, f"Malformed authored row {path.name}:{line_index}")
            word, slug, pos, label, definition, vi, en_example, vi_example, grammar, ordinals = fields
            require(word in expected, "Authored batch contains unselected or misplaced group: " + word)
            require(pos in POS, "Unsupported POS: " + pos)
            require(re.fullmatch(r"[a-z0-9-]+", slug) is not None, "Invalid editorial slug")
            row = {"candidateGroupKey": "NORMALIZED_HEADWORD:"+word, "normalizedHeadword": word,
                   "proposalKey": "EDITORIAL_2H2B:"+word+":"+slug,
                   "partOfSpeechProposal": pos, "content": {"senseLabelEn": label, "definitionEn": definition, "meaningVi": vi,
                       "examples": [{"exampleKey": "EDITORIAL_2H2B:"+word+":"+slug+":example-1", "en": en_example, "vi": vi_example}], "grammarNotesEn": grammar},
                   "oxfordGroupOrdinalsConsidered": [] if ordinals == "-" else [int(v) for v in ordinals.split(",")],
                   "authoredSource": {"path": path.relative_to(WORKSPACE).as_posix(), "line": line_index},
                   "ownerDecision": "UNRESOLVED", "identityDecision": "UNRESOLVED", "publicationEligible": False,
                   "canonicalIdsAllocated": 0, "draftStatus": "GENERATED_DRAFT_PENDING_HUMAN_REVIEW"}
            result[word].append(row)
            found.add(word)
        require(found == expected, "Authored batch missing groups")
    return result, hashes


def source_passages(groups, sources):
    exact = set()
    eightgrams = set()
    # Compare against both complete pinned corpora, including nonpilot notes.
    for corpus in sources.values():
        for row in corpus:
            values = [v for k, v in row["sourceFields"].items() if any(n in k.lower() for n in ["meaning", "vietnamese", "example"])]
            for source_group in row["candidateSourceSenseGroups"]:
                values.append(source_group.get("sourceVietnameseMeaningRaw", ""))
                for example in source_group.get("sourceExamples", []):
                    values.extend(v for k, v in example.items() if k in ["example_en", "example_vi"])
            for text in values:
                if isinstance(text, str):
                    exact.add(" ".join(words(text)))
                    eightgrams.update(ngrams(text))
    return exact, eightgrams


def content_fields(proposal):
    content = proposal["content"]
    fields = {"/content/senseLabelEn": content["senseLabelEn"], "/content/definitionEn": content["definitionEn"],
              "/content/meaningVi": content["meaningVi"], "/content/grammarNotesEn": content["grammarNotesEn"]}
    for i, example in enumerate(content["examples"]):
        fields[f"/content/examples/{i}/en"] = example["en"]
        fields[f"/content/examples/{i}/vi"] = example["vi"]
    return fields


def qa(proposal, group, exact, eightgrams, sibling_definitions, duplicate_examples):
    findings = []
    def flag(code, severity, field, reason):
        findings.append({"code": code, "severity": severity, "field": field, "reason": reason, "humanDecision": "UNRESOLVED"})
    content = proposal["content"]
    for field, value in content_fields(proposal).items():
        if not value.strip():
            flag("EMPTY_CONTENT", "FAIL", field, "A drafted field must be substantive")
        normalized = " ".join(words(value))
        if len(words(value)) >= 8 and (normalized in exact or ngrams(value) & eightgrams):
            flag("SOURCE_TEXT_SIMILARITY", "REVIEW", field, "Exact passage or eight-token overlap; review possible copying, including false positives")
    if len(words(content["definitionEn"])) < 5 or words(content["definitionEn"]) == words(proposal["normalizedHeadword"]):
        flag("MEANINGLESS_DEFINITION", "FAIL", "/content/definitionEn", "Definition too short or repeats the headword")
    if proposal["partOfSpeechProposal"] not in POS:
        flag("INVALID_POS", "FAIL", "/partOfSpeechProposal", "Unsupported canonical POS vocabulary")
    if proposal["partOfSpeechProposal"] == "VERB" and not content["definitionEn"].startswith("To "):
        flag("POS_DEFINITION_FORM", "REVIEW", "/content/definitionEn", "Verb definition lacks the usual infinitive form; review the proposed usage rather than automatically reject")
    vi_marks = re.compile(r"[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]", re.I)
    if vi_marks.search(content["definitionEn"]) or content["definitionEn"] == content["meaningVi"]:
        flag("LANGUAGE_FIELD_ASSOCIATION", "FAIL", "/content", "English definition appears Vietnamese or the bilingual fields are identical")
    if not vi_marks.search(content["meaningVi"]):
        flag("VIETNAMESE_FORM_REVIEW", "REVIEW", "/content/meaningVi", "No Vietnamese-specific letters detected; this heuristic can have false positives")
    if group["priorityDimensions"]["POS_CONFLICT"] or proposal["partOfSpeechProposal"] == "OTHER" or proposal["partOfSpeechProposal"] not in group["normalizedPosCandidates"]:
        flag("POS_EVIDENCE_REVIEW", "REVIEW", "/partOfSpeechProposal", "Source conflict, construction-level analysis or unsupported source-to-canonical mapping remains pending")
    if Counter(sibling_definitions)[" ".join(words(content["definitionEn"]))] > 1:
        flag("DUPLICATE_SENSE_DEFINITION", "REVIEW", "/content/definitionEn", "Sibling definitions coincide; owner must examine proposed meaning boundaries")
    for i, example in enumerate(content["examples"]):
        if not example.get("en", "").strip() or not example.get("vi", "").strip() or example["en"] == example["vi"]:
            flag("EXAMPLE_PAIR_ASSOCIATION", "FAIL", f"/content/examples/{i}", "An independently identified example requires distinct, nonempty English and Vietnamese text")
        en_numbers = re.findall(r"\d+", example["en"])
        vi_numbers = re.findall(r"\d+", example["vi"])
        if en_numbers != vi_numbers:
            flag("EXAMPLE_NUMBER_MISMATCH", "REVIEW", f"/content/examples/{i}", "Numeric quantities differ; written-out numbers or localization can produce false positives")
        en_negative = bool(re.search(r"\b(?:not|never)\b|n't\b", example["en"], re.I))
        vi_negative = bool(re.search(r"\b(?:không|chẳng|chưa)\b", example["vi"], re.I))
        if en_negative != vi_negative:
            flag("EXAMPLE_POLARITY_MISMATCH", "REVIEW", f"/content/examples/{i}", "Possible negation mismatch; requires human interpretation")
        if duplicate_examples[" ".join(words(example["en"]))] > 1:
            flag("REUSED_EXAMPLE", "REVIEW", f"/content/examples/{i}/en", "Example reused across proposals; review educational specificity")
        if not example["en"].endswith((".", "!", "?")):
            flag("EXAMPLE_SENTENCE_FORM", "REVIEW", f"/content/examples/{i}/en", "Check punctuation and whether this is a complete natural sentence")
    if re.search(r"\b(?:and/or|two unrelated|something or anything)\b", content["definitionEn"], re.I):
        flag("POSSIBLE_SENSE_CONFLATION", "REVIEW", "/content/definitionEn", "Broad or combined wording may conflate distinct meanings")
    for code, field, reason in [
        ("BILINGUAL_MEANING_REVIEW", "/content/meaningVi", "Human must check Vietnamese meaning against this definition and usage, not just spelling"),
        ("BILINGUAL_EXAMPLE_REVIEW", "/content/examples", "Human must verify semantic equivalence, tense, participants and natural Vietnamese wording"),
        ("GRAMMAR_AND_POS_USAGE_REVIEW", "/content", "Heuristics do not establish grammaticality or whether examples realize the proposed POS"),
        ("SENSE_BOUNDARY_REVIEW", "/content/definitionEn", "Human must check duplicate meanings, overbroad definitions and construction versus Sense boundaries"),
        ("CEFR_NOT_VERIFIED", "/classificationProposal", "Headword-level source CEFR is evidence; this proposed Sense is not verified"),
        ("GENERATED_AUTHORSHIP_REVIEW", "/fieldAuthorship", "AI-generated prose requires human editorial verification; no human authorship or license is claimed"),
        ("RIGHTS_UNRESOLVED", "/sourceRights", "Source rights and draft publication permission remain unresolved")]:
        flag(code, "REVIEW", field, reason)
    if group["masterLemmaCandidates"]["lexemeIdReference"]:
        flag("EXISTING_MASTER_IDENTITY_REVIEW", "REVIEW", "/existingMasterComparison", "Lemma overlap never establishes identity; compare POS and meaning under pinned revisions")
    if any(r["ownerReviewedExclusionCount"] for r in group["legacyCoverageEvidence"]):
        flag("LEGACY_EXCLUSION_PROTECTED", "REVIEW", "/legacyDependencies", "Owner-excluded runtime/Sense pairs retain NONE; similarity must not reactivate them")
    if proposal.get("ownerDecision") != "UNRESOLVED" or proposal.get("identityDecision") != "UNRESOLVED" or proposal.get("publicationEligible") or proposal.get("canonicalIdsAllocated") != 0:
        flag("UNAUTHORIZED_APPROVAL_OR_ID", "FAIL", "/", "This phase prohibits approval, publication eligibility and canonical IDs")
    if any(c.get("identityClaim") != "NONE" for c in proposal.get("existingMasterComparison", [])):
        flag("UNAUTHORIZED_IDENTITY_REUSE", "FAIL", "/existingMasterComparison", "Lemma or meaning similarity cannot establish identity or reopen excluded pairs")
    classification = proposal.get("classificationProposal", {})
    if classification.get("status") != "UNRESOLVED" or (classification.get("contradiction") and classification.get("candidateCefrForReview") is not None):
        flag("UNSUPPORTED_CEFR_ASSERTION", "FAIL", "/classificationProposal", "No verified Sense CEFR or automatic conflict resolution is authorized")
    authorship = proposal.get("fieldAuthorship", {})
    for field in content_fields(proposal):
        evidence = authorship.get(field)
        if not evidence or evidence.get("sourceType") != "GENERATED" or evidence.get("humanAuthor") or evidence.get("humanReviewer") or evidence.get("license") or evidence.get("reviewDate") or evidence.get("rightsDecision") != "PENDING" or not evidence.get("process") or evidence.get("textHash") != hashlib.sha256(content_fields(proposal)[field].encode("utf-8")).hexdigest():
            flag("MISSING_OR_INVENTED_PROVENANCE", "FAIL", field, "Generated process must be disclosed without invented human authors or clearance")
    if proposal.get("sourceRights") != RIGHTS:
        flag("UNSUPPORTED_RIGHTS_CLEARANCE", "FAIL", "/sourceRights", "Source rights must remain unknown")
    status = "FAIL" if any(f["severity"] == "FAIL" for f in findings) else "REVIEW" if findings else "PASS"
    return {"proposalKey": proposal["proposalKey"], "status": status, "linguisticReview": "PENDING_HUMAN_REVIEW", "findings": findings}


def materialization_contract():
    return {"contractType": "FUTURE_MAPPING_PLAN_ONLY; NOT_SCHEMA_VALID_MASTER_OBJECTS",
        "identityAllocation": "Separately authorized creation only: allocate UUIDv7 once with maintained RFC9562 library; persist a reviewed draft-key-to-ID registry. Never derive canonical IDs from spelling, hashes or these editorial keys.",
        "lexeme": {"schema": "lexeme.schema.json", "mapping": {"lemma": "owner-selected lexical form, not automatic normalized candidate spelling", "normalizedLemma": "Apply existing NFKC-LOWER-EN-1 canonical policy after lexical-unit review; source NFC/casefold remains evidence", "lexicalUnitType": "Owner confirms WORD/MULTIWORD_EXPRESSION/PHRASAL_VERB/IDIOM", "aliases": "Reviewed variants with provenance, never silently merge a, an"}, "reuse": "Require lexical identity proof under exact pinned records; otherwise separately approve creation. Compositional expressions may be deferred rather than become Lexemes."},
        "sense": {"schema": "sense.schema.json", "mapping": {"senseLabel": "senseLabelEn as localized en label", "partOfSpeechCode": "reviewed partOfSpeechProposal; OTHER requires explicit construction/number decision", "translations": "meaningVi -> vi Translation with translationKind and preferred/order selected by owner", "definitions": "definitionEn -> en LEARNER_FRIENDLY Definition", "examples": "each en/vi pair -> Example and distinct ExampleTranslation", "grammarNotes": "reviewed grammarNotesEn -> en localized note"},
            "reuseOrCreate": "Reuse only with Sense identity proof; similar text/POS is insufficient. Existing accepted identities preserve meaning. A distinct meaning gets a separately allocated ID, not a recycled runtime identity.", "childIds": "Allocate separate UUIDv7 for Definition, Translation, Example and ExampleTranslation at authorized creation; preserve across revisions."},
        "revisionStrategy": "Append new immutable files with positive entity revision; exact identity continuity reviewed. Never overwrite 87 approved Lexemes/100 Senses or a pinned revision. Same-identity corrections get reviewed next revisions; distinct meanings require separate identities.",
        "provenance": {"schema": "provenance.schema.json", "sourceType": "GENERATED", "fieldMapping": "One field-level claim per authored child/field with subjectId, fieldPath, drafting process and persisted text hash; create real human OWNER_REVIEW provenance only after actual review", "rightsGate": "Generated draft does not clear source rights or guarantee publication permission. Owner must establish permissible original content, any attribution obligations and license basis; never label AI prose PROJECT_AUTHORED by a fictional human."},
        "classifications": {"schema": "common.schema.json#/$defs/classification", "cefr": "Source evidence -> separately reviewed Sense classification with CEFR framework/version and Provenance; no default A1, no direct grade conversion", "otherDimensions": "Difficulty needs an approved scale/rubric; school requires curriculum/level; age/topic/domain/exam need explicit evidence and reviewed taxonomy refs; Learning Set requires selection provenance and ordered membership", "taxonomy": "Use pinned immutable taxonomy snapshots and exact existing concepts; no automatic label-to-ID mapping."},
        "release": {"schema": "dataset.schema.json", "pins": "Exact typed IDs, revisions, recordPath and RFC8785 canonical contentHash; no latest-record fallback", "hash": "Existing sha256-canonical-json-v1; releaseHash over canonical manifest with only releaseHash omitted", "validation": "Existing Ajv schemas plus cross-file release validator, reference/provenance closure, reviewed content, rights and independent explicit release authorization; APPROVED gate only after these pass"},
        "hardGates": ["HUMAN_CONTENT_QA", "OWNER_LEXEME_AND_SENSE_IDENTITY_DECISIONS", "REJECTED_LEGACY_PAIRS_PRESERVED", "RIGHTS_DISPOSITION", "CLASSIFICATION_REVIEW", "SEPARATE_CANONICAL_AUTHORING_AUTHORIZATION", "SEPARATE_RELEASE_AUTHORIZATION"],
        "runtimeBoundary": "No runtime IDs, maps, DB operations or Development apply. New Master -> Approved release -> separately authorized Development reconciliation/apply -> legacy transition."}


def build():
    groups, sources, master, previous, protected = inputs()
    authored, source_hashes = read_authored(groups)
    exact, eightgrams = source_passages(groups, sources)
    examples = Counter(" ".join(words(s["content"]["examples"][0]["en"])) for rows in authored.values() for s in rows)
    proposals = []
    reviews = []
    lexemes = []
    audits = []
    for group in groups:
        word = group["normalizedHeadword"]
        rows = authored[word]
        supported_ordinals = {n for r in group["sourceEvidence"] for n in r["structuredOxfordSenseGroupOrdinals"]}
        covered = {n for s in rows for n in s["oxfordGroupOrdinalsConsidered"]}
        require(covered <= supported_ordinals, "Invalid source sense-group ordinal: " + word)
        lexical_type = "MULTIWORD_EXPRESSION" if " " in word or word == "a, an" else "WORD"
        lexeme_key = "EDITORIAL_2H2B_LEXEME_GROUP:"+word
        lexemes.append({"lexemeProposalKey": lexeme_key, "candidateGroupKey": group["candidateGroupKey"], "writtenLemmaEvidence": group["displaySpellings"],
            "lexicalUnitTypeProposal": lexical_type, "identityDecision": "UNRESOLVED", "ownerDecision": "UNRESOLVED", "canonicalId": None,
            "lexicalIdentityCaution": "PROPOSED_VARIANT_REVIEW; a and an may be forms of one article" if word == "a, an" else "COMPOSITIONAL_CONSTRUCTION_REVIEW" if word in ["at the onset", "cosmopolitan city", "have to", "any more", "according to"] else "LEXEME_IDENTITY_REVIEW_REQUIRED"})
        cefr = [dict(evidenceRef={"artifact": ref["artifact"], "recordIndex": ref["recordIndex"], "sourceRecordId": ref["sourceRecordId"], "corpus": ref["corpus"]}, values=ref["cefrEvidence"]) for ref in group["sourceEvidence"]]
        bands = sorted({e["value"] for ref in group["sourceEvidence"] for e in ref["cefrEvidence"]})
        for sense in rows:
            sense["lexemeProposalKey"] = lexeme_key
            sense["sourceRights"] = RIGHTS
            sense["sourceEvidenceReferences"] = group["sourceEvidence"]
            sense["classificationProposal"] = {"sourceCefrEvidence": cefr, "contradiction": len(bands)>1, "candidateCefrForReview": bands[0] if len(bands)==1 else None,
                "status": "UNRESOLVED", "rationale": "Only a headword-level evidence candidate; no verified Sense classification. Conflicting or missing evidence stays unresolved.", "otherDimensions": "UNCLASSIFIED; school, age, difficulty, topic/domain/exam and sets require separate evidence"}
            sense["confidence"] = {"level": "MEDIUM", "rationale": "General linguistic understanding and pinned lexical/POS/context evidence support this wording; identity, bilingual naturalness, CEFR and copyright require independent human verification."}
            sense["fieldAuthorship"] = {field: {"sourceType": "GENERATED", "process": "AI assistant composed new draft wording from general linguistic understanding after inspecting source evidence; persisted once in authored PSV; assembly never generates prose",
                "textHash": hashlib.sha256(text.encode("utf-8")).hexdigest(), "humanAuthor": None, "humanReviewer": None, "reviewDate": None, "license": None, "rightsDecision": "PENDING"} for field, text in content_fields(sense).items()}
            comparisons = []
            for sense_id in group["masterLemmaCandidates"]["senseIdReferences"]:
                pin, accepted = master[sense_id]
                overlap = sorted(set(words(sense["content"]["definitionEn"])) & {w for d in accepted.get("definitions", []) for w in words(d.get("text", ""))} - {"a", "an", "the", "to", "of", "and", "or", "in", "that", "with", "is"})
                comparisons.append({"senseReference": sense_id, "recordPath": pin["recordPath"], "contentHash": pin["contentHash"], "acceptedPos": accepted.get("partOfSpeechCode"), "posCompatible": accepted.get("partOfSpeechCode") == sense["partOfSpeechProposal"], "sharedDefinitionTokens": overlap,
                    "similarityStatus": "POSSIBLE_REUSE_REVIEW_ONLY" if overlap and accepted.get("partOfSpeechCode") == sense["partOfSpeechProposal"] else "MEANING_COMPARISON_REQUIRED", "identityClaim": "NONE"})
            sense["existingMasterComparison"] = comparisons
            sibling_defs = [" ".join(words(s["content"]["definitionEn"])) for s in rows]
            audit = qa(sense, group, exact, eightgrams, sibling_defs, examples)
            sense["qualityAuditKey"] = sense["proposalKey"]
            audits.append(audit)
            proposals.append(sense)
        reviews.append({"candidateGroupKey": group["candidateGroupKey"], "normalizedHeadword": word, "displaySpellings": group["displaySpellings"], "sourceMembership": group["sourceMembership"],
            "sourceEvidenceReferences": group["sourceEvidence"], "existingMasterCandidates": group["masterLemmaCandidates"], "legacyDependencies": group["legacyCoverageEvidence"],
            "lexemeProposalKey": lexeme_key, "senseProposalKeys": [s["proposalKey"] for s in rows], "draftCoverage": "SUBSTANTIVE_PROPOSALS", "evidenceBlockers": [],
            "uncoveredOxfordGroupOrdinals": sorted(supported_ordinals-covered), "coverageCaution": "Source groups are not approved Senses; these proposals do not claim exhaustive dictionary coverage or proven source-to-Sense identity",
            "identityUncertainties": group["readinessStates"], "classificationUncertainties": bands, "rightsStatus": RIGHTS, "reviewerNotes": None,
            "proposedDecisions": ["REQUEST_FIELD_CORRECTION", "PROPOSE_CREATE_LEXEME", "PROPOSE_NEW_SENSE", "REUSE_ONLY_WITH_IDENTITY_PROOF", "SPLIT_OR_COALESCE_PROPOSALS", "REQUEST_MORE_EVIDENCE", "DEFER"],
            "ownerDecision": "UNRESOLVED", "publicationEligible": False, "independentSenseDecisionsRequired": True})
    require(len({s["proposalKey"] for s in proposals}) == len(proposals), "Duplicate Sense proposal key")
    require(len(reviews) == len({r["candidateGroupKey"] for r in reviews}) == 100, "Draft pilot accounting failure")
    counts = {"pilotGroups": len(groups), "groupsWithDrafts": len(reviews), "blockedGroups": 0, "lexemeProposalGroups": len(lexemes), "senseDrafts": len(proposals),
        "multiSenseGroups": sum(len(rows)>1 for rows in authored.values()), "englishDefinitions": len(proposals), "englishExamples": sum(len(s["content"]["examples"]) for s in proposals),
        "vietnameseMeanings": len(proposals), "vietnameseExampleTranslations": sum(len(s["content"]["examples"]) for s in proposals),
        "qualityCounts": {status: sum(a["status"]==status for a in audits) for status in ["PASS", "REVIEW", "FAIL"]},
        "posReviewPending": sum(any(f["code"] in ["POS_EVIDENCE_REVIEW", "GRAMMAR_AND_POS_USAGE_REVIEW"] for f in a["findings"]) for a in audits), "cefrReviewPending": len(proposals),
        "existingMasterGroupReview": sum(bool(g["masterLemmaCandidates"]["lexemeIdReference"]) for g in groups), "existingMasterSenseReview": sum(bool(s["existingMasterComparison"]) for s in proposals),
        "ownerApprovals": 0, "canonicalIdsAllocated": 0, "runtimeMappingsCreated": 0, "publicationEligible": 0}
    pins = {"remoteBaseline": BASELINE, "phase2h2aFingerprint": PHASE2A, "phase2h1Fingerprint": protected["phase2h1Fingerprint"],
        "hybridReleaseHash": protected["hybridReleaseHash"], "hybridTreeExpected": protected["hybridReleaseTreeExpected"], "treeVerification": "EXTERNAL_COMMAND_REQUIRED",
        "authoredSourceHashes": source_hashes, "schemaHashes": protected["schemaCanonicalHashes"], "phase2h2aManifestHash": digest(load(INPUT/"manifest.json"))}
    def wrap(payload):
        return {"phase": "2H.2B", "artifactType": "NONCANONICAL_EDITORIAL_PROPOSAL", "inputPins": pins, "authorization": AUTH, **payload}
    batches = [{"batchKey": f"EDITORIAL_BATCH_{i+1:02d}", "groupKeys": [g["candidateGroupKey"] for g in groups[i*20:(i+1)*20]], "groupCount": len(groups[i*20:(i+1)*20]), "authoredSource": f"authored/batch-{i+1:02d}.psv"} for i in range(5)]
    output = {"editorial-draft-batches.json": wrap({"batchingPolicy": "100 fixed pilot groups sorted by normalized headword, 5 batches of 20; no Sense-count quota", "batches": batches}),
        "pilot-lexeme-proposals.json": wrap({"groups": lexemes}), "pilot-sense-proposals.json": wrap({"senseProposals": proposals}),
        "pilot-editorial-review.json": wrap({"groups": reviews, "summary": counts, "protectedLegacyCases": previous["lexeme-sense-identity-review.json"]["protectedLegacyCases"], "runtime284": previous["lexeme-sense-identity-review.json"]["runtime284"]}),
        "pilot-quality-audit.json": wrap({"summary": counts["qualityCounts"], "automatedScope": "Structural checks and review signals only; translation, grammar, semantic boundaries and rights remain human decisions", "senseAudits": audits}),
        "future-master-materialization-contract.json": wrap(materialization_contract()),
        "validation-summary.json": wrap({"status": "PASS" if not counts["qualityCounts"]["FAIL"] else "FAIL", "statusScope": "DETERMINISTIC_ASSEMBLY_AND_STRUCTURAL_QA; NOT_HUMAN_LINGUISTIC_APPROVAL", "counts": counts,
            "databaseAccess": "NONE", "databaseWrites": "NONE", "production": "UNTOUCHED", "externalVerification": {"status": "NOT_EXECUTED_BY_GENERATOR", "evidenceLocation": "docs/ai-progress.md#phase-2h2b-editorial-draft-pilot-2026-10-08"}})}
    fingerprint = digest(output)
    output["manifest.json"] = wrap({"fingerprint": fingerprint, "fingerprintMethod": "SHA256_SORTED_COMPACT_UTF8_JSON_OUTPUTS_EXCLUDING_MANIFEST; SOURCE_HASHES_INCLUDED; NO_VOLATILE_TIMESTAMPS", "artifactHashes": {k: digest(v) for k, v in sorted(output.items())},
        "authoredSourceFormat": "UTF-8 PSV, ten fields: headword, local slug, POS, English label, English definition, Vietnamese meaning, English example, Vietnamese example, English grammar note, Oxford ordinals or -; no field may contain a pipe",
        "replayContract": "Read already-authored persisted prose; verify inputs and compare output; never call AI or regenerate prose", "files": sorted(output)})
    report = report_text(counts, reviews, proposals, audits, fingerprint)
    return output, report, fingerprint


def report_text(counts, reviews, proposals, audits, fingerprint):
    by_key = {s["proposalKey"]: s for s in proposals}
    audit_by_key = {a["proposalKey"]: a for a in audits}
    lines = ["# Phase 2H.2B — editorial draft pilot", "", "NONCANONICAL GENERATED DRAFTS — HUMAN REVIEW PENDING. No approved identity, license clearance, canonical UUID, release, mapping or database operation.", "",
        f"Baseline: `{BASELINE}`. Phase 2H.2A: `{PHASE2A}`. Phase 2H.2B: `{fingerprint}`.", "",
        "The AI assistant wrote new learner-facing wording in five persisted batches after reviewing pinned source lexical/context evidence. Each content field discloses GENERATED authorship and its text hash; no human author/reviewer/license is invented. Assembly and --check use those files; they never generate prose. Source deck rights remain UNKNOWN_REVIEW_REQUIRED and publicationEligible is false.", "",
        "## Accounting and review gates", "", "```json", json.dumps(counts, ensure_ascii=False, indent=2), "```", "",
        "Every pilot group has substantive draft content. Source ordinals are contextual review references, not final Sense identities. Counts reflect supported editorial splits, not a target of one Sense per headword. Academic study/research and have-to negation are explicitly proposed coalescences; highly polysemous groups remain independently reviewable by proposal key. New meanings and alternative POS tags can be deferred or added after evidence review.", "",
        "QA does not certify linguistic correctness. It flags empty/repeated definitions, duplicates, source passage/eight-token similarity, punctuation, potential conflation, POS conflicts, existing identity overlap, protected legacy exclusions and provenance/rights/approval violations. All bilingual meaning/example, grammar, Sense-boundary and CEFR checks remain human review. False positives must be resolved by the owner, not silently discarded.", "",
        "## Future Master materialization", "", "See future-master-materialization-contract.json: use existing schemas, separately approved UUIDv7 registry, reviewed lexical normalization NFKC-LOWER-EN-1, exact identity/revision continuity, child IDs, GENERATED field-level provenance and real subsequent OWNER_REVIEW evidence, independent reviewed classifications/taxonomy, immutable pins and canonical release hashes. No Master object or allocation occurs here.", "",
        "## Protected inputs and external verification", "", "Accepted Phase 2H.1/2H.2A and the 87-Lexeme/100-Sense Hybrid release are untouched. All 2018 legacy rows and 75 historical identities remain protected; #11 and owner-excluded pairs keep NONE, #284 booking mapping remains pinned, #295 and #849 remain pending cases. No live check is claimed.", "",
        "Generated validation covers deterministic assembly and structural checks only. Exact external commands/exits are recorded [in the handoff](../../docs/ai-progress.md#phase-2h2b-editorial-draft-pilot-2026-10-08). Replay: `python -B scripts/phase-2h2b-editorial-draft.py --check`. No commit/push. Owner reviews actual draft wording, splits, rights and identity before separately authorizing canonical materialization.", "",
        "## Owner reading copy — all 100 groups", "", "Each Sense can be corrected, deferred or rejected independently; every group and Sense decision currently UNRESOLVED.", ""]
    for index, review in enumerate(reviews, 1):
        lines += [f"### {index}. {review['normalizedHeadword']}", "", f"Group key: `{review['candidateGroupKey']}`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.", ""]
        for key in review["senseProposalKeys"]:
            s = by_key[key]; c = s["content"]
            lines += [f"**{c['senseLabelEn']} — {s['partOfSpeechProposal']}** (`{key}`)", "", f"Definition: {c['definitionEn']}", f"Vietnamese: {c['meaningVi']}", ""]
            for example in c["examples"]:
                lines += [f"- EN: {example['en']}", f"- VI: {example['vi']}"]
            lines += ["", f"Grammar / uncertainty: {c['grammarNotesEn']}", f"QA: {audit_by_key[key]['status']}; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: {s['oxfordGroupOrdinalsConsidered']}; see pinned note references in pilot-sense-proposals.json.", ""]
    return "\n".join(lines)


def run(check=False):
    output, report, fingerprint = build()
    expected = {WORKSPACE/name: json.dumps(value, ensure_ascii=False, indent=2)+"\n" for name, value in output.items()}
    expected[REPORT] = report
    if check:
        changed = [p.relative_to(ROOT).as_posix() for p, text in expected.items() if not p.is_file() or p.read_text(encoding="utf-8") != text]
        require(not changed, "Replay drift: " + ", ".join(changed))
    else:
        for p, text in expected.items():
            p.parent.mkdir(parents=True, exist_ok=True)
            if not p.is_file() or p.read_text(encoding="utf-8") != text:
                p.write_text(text, encoding="utf-8", newline="\n")
    return {"status": output["validation-summary.json"]["status"], "fingerprint": fingerprint, "counts": output["validation-summary.json"]["counts"], "artifactComparison": "PASS" if check else "NOT_EXECUTED", "databaseAccess": "NONE", "databaseWrites": "NONE", "production": "UNTOUCHED"}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    result = run(args.check)
    print(json.dumps(result, indent=2))
    raise SystemExit(0 if result["status"] == "PASS" else 1)
