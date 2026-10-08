# Phase 2H.2E — Approval intake and first 40-Sense candidate

Offline technical completion; actual human decisions and canonical authorization remain absent.

Approval gate fingerprint: 7b81c06de08b75412039cb28b1b72490da51e0a82595d68fb54de33c57740e18

```json
{
  "actualHumanDecisions": 0,
  "classificationReviewed": 0,
  "cohort": 40,
  "correctionFields": 8,
  "draftGroups": 520,
  "glossSignalsReviewed": 18,
  "identityResolved": 0,
  "inventory": 813,
  "linguisticIssues": 7,
  "readyForCanonicalAuthoring": 0,
  "releaseReady": 0,
  "reviewPacks": 4,
  "rightsResolved": 0,
  "riskReclassified": 103,
  "riskTiers": {
    "CRITICAL": 7,
    "HIGH": 588,
    "LOW": 193,
    "MEDIUM": 25
  }
}
```

Risk audit covers all 813 keys. Any legacy-linked identity is HIGH, regardless of history count. Specific unresolved lexical/alias blockers remain HIGH after wording correction. a, an and abnormal were incorrectly LOW and are now HIGH. The accepted queue and original drafts are unchanged. Source rights unknown is a gate, not automatic proof that original prose is copied.

## Frozen selection

```json
{
  "acceptedQueueFingerprint": "53fb17292af49e1c2c144a13630275386c7bdd7edc5a4d7e6c5e8ba8aa9b107e",
  "algorithm": "SCARCE_STRATUM_HASH_RANK_POS_CAP_V1",
  "capacity": {
    "ADJECTIVE": 37,
    "ADVERB": 21,
    "BOTH": 85,
    "CEFR_A1": 16,
    "CEFR_A2": 22,
    "CEFR_B1": 21,
    "CEFR_B2": 45,
    "CEFR_C1": 39,
    "CEFR_C2": 46,
    "NOUN": 87,
    "OXFORD_ONLY": 39,
    "VERB": 44,
    "VOCAB4600_ONLY": 65
  },
  "coverage": {
    "ADJECTIVE": 10,
    "ADVERB": 10,
    "BOTH": 17,
    "CEFR_A1": 4,
    "CEFR_A2": 3,
    "CEFR_B1": 3,
    "CEFR_B2": 13,
    "CEFR_C1": 7,
    "CEFR_C2": 10,
    "NOUN": 10,
    "OXFORD_ONLY": 8,
    "VERB": 10,
    "VOCAB4600_ONLY": 15
  },
  "eligibleLowRiskCount": 189,
  "quotaShortfalls": [],
  "reviewOnlyCount": 0,
  "seed": "PHASE_2H2E_FIRST40_V1",
  "targets": {
    "ADJECTIVE": 10,
    "ADVERB": 10,
    "BOTH": 16,
    "CEFR_A1": 3,
    "CEFR_A2": 3,
    "CEFR_B1": 3,
    "CEFR_B2": 3,
    "CEFR_C1": 3,
    "NOUN": 10,
    "OXFORD_ONLY": 8,
    "VERB": 10,
    "VOCAB4600_ONLY": 8
  }
}
```

## Owner workflow

1. Read one review pack and edit its decisions CSV. Leave untouched rows blank. Keep exact proposal key and review hash.
2. Record actual reviewer ID, UTC date, rationale and separate content, Lexeme/Sense, POS, classification and rights decisions. KEEP alone is a disposition; PENDING fields are valid.
3. Submit the completed file to the owner in a future task. The owner must authorize real reviewer IDs, roles and dates in a trusted evidence bundle. The checked-in registry is empty; AI recommendations cannot authorize a reviewer.
4. Validate first; import only into the offline ledger after the owner verifies the authorization bundle SHA. The CSV does not authenticate its signer by itself. Never authorize a bundle only because it was supplied by the same untrusted CSV.
5. Partial imports append hash-addressed events; identical reimport adds no event. Conflicts fail atomically and preserve prior decisions. Changed decisions need an explicit later supersession workflow, not overwrite.

```powershell
python -B scripts/phase-2h2e-approval-gate.py --validate-decisions PATH.csv --trust-bundle OWNER_VERIFIED.json --trust-sha256 EXACT_SHA
python -B scripts/phase-2h2e-approval-gate.py --import-decisions PATH.csv --trust-bundle OWNER_VERIFIED.json --trust-sha256 EXACT_SHA
python -B scripts/phase-2h2e-approval-gate.py --validate-rights RIGHTS.csv --trust-bundle OWNER_VERIFIED.json --trust-sha256 EXACT_SHA
python -B scripts/phase-2h2e-approval-gate.py --check
```

The trust bundle holds human reviewers (kind HUMAN; authorizedFrom/Through; roles; authorizationEvidenceRef), actual approvalEvidence with humanSubmissionEvidenceRef, identityEvidence with reviewed target hashes and protected reference assessment, classificationEvidence and rights evidence. See tests for synthetic isolated examples; test identities are never written to the real ledger. --validate-decisions writes nothing. --import-decisions appends only offline ledger/history and refreshes this package. It never changes the 813 accepted drafts or allocates identities.

REVISE references an exact overlay and never approves its original automatically. MERGE/SPLIT require human identity evidence and exact reviewed target revisions; operations are recorded only. Existing Master reuse must match pinned approved Sense and its record hash; lemma similarity cannot authorize it. DEFER/REJECT are not approvals. Rights decisions must cover this exact content revision, original editorial text only, excluded media, originality assessment, copying concerns, attribution and actual rights-review evidence.

## Rights matrix

Deck permissions, independent editorial wording, lexical/POS/CEFR facts, third-party references and short conventional glosses are separate. Unknown deck license provides no permission to reproduce expressive deck text/media. Independently authored wording is not labelled copied merely because deck rights are unknown. Similarity signals still require actual rights assessment; reference URLs confer no reproduction license. Legal/rights review is needed for unresolved publication rights, not invented clearance.

The rights CSV validator emits normalized evidence records without writing or granting clearance. The owner can review these records and include them in the verified trust bundle. evidenceInventory pins each supporting evidence reference with SHA256 and ownerVerified=true. An established ledger rejects silent trust-bundle changes; extending reviewer authorization requires explicit reconciliation. Import receipts under decision-history preserve the prior ledger hash, new snapshot and verified bundle before snapshot replacement, allowing recovery after an interrupted refresh.

Primary guidance (US scope only): [protected expression and facts](https://www.copyright.gov/help/faq/faq-protect.html), [no fixed fair-use word threshold](https://www.copyright.gov/help/faq/faq-fairuse.html), [AI output and human expressive authorship](https://www.copyright.gov/newsnet/2025/1060.html). The eight-token scan is technical screening, not legal clearance. Generated provenance is not a claim of human authorship or copyright ownership.

## Corrections

### 2H2E_CORRECTION_01

BEFORE: Present in a quantity that easily meets the need.

AFTER (PROPOSED): Existing or available in large quantities.

Abundant means existing in large quantity, not necessarily enough for a particular demand. Definition and Vietnamese gloss wrongly bind abundance to meeting a need. Fruit example otherwise appropriate.

### 2H2E_CORRECTION_02

BEFORE: có nhiều và đủ đáp ứng nhu cầu

AFTER (PROPOSED): dồi dào; có nhiều

Abundant means existing in large quantity, not necessarily enough for a particular demand. Definition and Vietnamese gloss wrongly bind abundance to meeting a need. Fruit example otherwise appropriate.

### 2H2E_CORRECTION_03

BEFORE: Strange or unusual in a way that attracts attention.

AFTER (PROPOSED): Very strange or unusual.

Weird can mean strange without necessarily attracting attention. Remove this nonessential restriction from the definition; clicking sound and kỳ lạ align.

### 2H2E_CORRECTION_04

BEFORE: Các tình nguyện viên ủng hộ một hoạt động địa phương đáng trân trọng.

AFTER (PROPOSED): Các tình nguyện viên ủng hộ một mục đích tốt đẹp ở địa phương.

Worthy describes deserving support, not objective worth certification. Local cause refers to an aim deserving support; hoạt động đáng trân trọng is understandable but narrower and shifts support to respect.

### 2H2E_CORRECTION_05

BEFORE: trục xuất; đuổi khỏi

AFTER (PROPOSED): đuổi khỏi; trục xuất; khai trừ khỏi tổ chức

Expel from an organization covers club exclusion. Khai trừ is accurate in the example, but primary gloss omits this supported sense and could misleadingly suggest only geographic removal.

### 2H2E_CORRECTION_06

BEFORE: Anh ấy hét lên để át tiếng ồn.

AFTER (PROPOSED): Anh ấy hét lên để người khác nghe được giữa tiếng ồn.

Yelled to be heard is speaking loudly enough for others to hear over noise. Vietnamese để át tiếng ồn can suggest drowning noise out rather than being audible; propose more faithful purpose wording.

### 2H2E_CORRECTION_07

BEFORE: kinh phí; sự tài trợ

AFTER (PROPOSED): kinh phí; tiền tài trợ

Funding definition denotes money provided, whereas sự tài trợ names support process. Kinh phí is right; add tiền tài trợ as primary monetary gloss to avoid process/material ambiguity.

### 2H2E_CORRECTION_08

BEFORE: Countable restriction; uncountable limiting process also possible.

AFTER (PROPOSED): Countable restriction in this proposal; the uncountable act of limiting needs separate boundary review before inclusion.

Restriction Sense fits battery limitation. Grammar also mentions uncountable limiting process absent from the definition; clarify that note so owner can decide separate process usage rather than assume exhaustive coalescence.

## Remaining gates

Human content, Lexeme/Sense identity, POS/construction, classification, originality/similarity, field provenance and adequate intended-publication rights. CANONICAL_AUTHORIZED is false irrespective of future offline intake. No canonical UUIDs, runtime mappings or DB capabilities. Hybrid 2.2.1 (87/100), legacy 2018/history75/#11/#284/#295/#849/exclusions remain pinned offline; no live verification. Production untouched.

Next: obtain real owner decisions and rights evidence, then validate them in a separately authorized task before canonical materialization and Development planning. No automatic next phase. External command evidence is recorded separately from generator checks.
