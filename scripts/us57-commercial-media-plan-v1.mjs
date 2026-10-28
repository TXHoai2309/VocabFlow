import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const WORKSPACE = join(REPO_ROOT, "vocabflow-dataset", "workspaces", "us57-commercial-media-pipeline");
const SOURCE_WORKSPACE = join(REPO_ROOT, "vocabflow-dataset", "workspaces", "english-vocabulary-4600-media-v2");
const MASTER_DATASET_PATH = join(REPO_ROOT, "vocabflow-dataset", "dataset.json");
const EXPECTED_SNAPSHOT_SHA256 = "ed5728a635234a1fb3c8771f8d2ed19041866106a10e04430abe5b31d89a9f3b";
const EXPECTED_SNAPSHOT_FINGERPRINT = "217c272765f80e92319b928740176ec6685527ff56de74d891bf16052cb7106b";

const SENSE_SELECTION = [
  { proposalKey: "PROVISIONAL_BULK_2026_01:democracy:core-sense", tags: ["ABSTRACT", "MULTIWORD_CONTEXT"], imageBrief: "A neutral local election: several adults place ballots in a box to choose representatives; no flags, party marks, or readable text." },
  { proposalKey: "EDITORIAL_2H2K:although:concession-link", tags: ["COMMON", "FUNCTION_WORD"], imageBrief: null },
  { proposalKey: "EDITORIAL_2H2L:reservation:booking", tags: ["POLYSEMY", "CONCRETE"], imageBrief: "A passenger checks a berth assignment with a train attendant before boarding a night train; no readable labels." },
  { proposalKey: "EDITORIAL_2H2L:reservation:doubt", tags: ["POLYSEMY", "ABSTRACT"], imageBrief: "A person pauses thoughtfully while reviewing a proposal, conveying a specific concern before accepting it; no text or exaggerated emotion." },
  { proposalKey: "EDITORIAL_2H2K:beautiful:pleasing-to-see", tags: ["ADJECTIVE", "SENSORY"], imageBrief: "An old stone bridge in warm evening light, viewed by a person who pauses to admire it; use a generic, unrecognizable setting." },
  { proposalKey: "EDITORIAL_2H2K:quickly:at-high-speed", tags: ["ADVERB", "COMMON"], imageBrief: "A person swiftly moves papers away from a glass of spilled water, with one clear action and minimal motion cues." },
  { proposalKey: "PHASE_E_T21:play:perform-music", tags: ["POLYSEMY", "VERB"], imageBrief: "A violinist performing with a small community orchestra; focus on producing music with the instrument, with no logos or text." },
  { proposalKey: "PHASE_E_T21:play:play-game-or-sport", tags: ["POLYSEMY", "VERB"], imageBrief: "Two children concentrating on a chess game at a table; show participation in the game, not a stage performance." },
  { proposalKey: "PHASE_E_T21:play:stage-drama", tags: ["POLYSEMY", "MULTIPLE_POS"], imageBrief: "Actors performing a school drama on a simple stage, with a small audience; no script text or recognizable play characters." },
  { proposalKey: "PHASE_E_T21:orange:citrus-fruit", tags: ["POLYSEMY", "CONCRETE"], imageBrief: "A fresh orange fruit peeled into segments on a plain kitchen table; make the fruit itself the single focal subject." },
  { proposalKey: "PHASE_E_T21:orange:orange-color", tags: ["POLYSEMY", "ABSTRACT"], imageBrief: "A clean spectrum of color blocks progressing from red through orange to yellow, without labels or objects that could be mistaken for fruit." },
  { proposalKey: "PHASE_E_T21:orange:orange-colored", tags: ["POLYSEMY", "MULTIPLE_POS"], imageBrief: "A bright orange scarf against fresh snow; make the scarf's color unmistakable and do not show orange fruit." },
  { proposalKey: "EDITORIAL_2H2L:gap:difference-between-groups", tags: ["POLYSEMY", "ABSTRACT"], imageBrief: "A respectful community discussion between two small groups representing different generations, with an unlabelled visual comparison that makes their age difference clear without stereotypes; no text or status markers." },
  { proposalKey: "EDITORIAL_2H2L:gap:free-interval", tags: ["POLYSEMY", "ABSTRACT"], imageBrief: "A blank interval on a weekly calendar between two separate activity blocks, using icons only and no readable writing." },
  { proposalKey: "EDITORIAL_2H2L:gap:physical-opening", tags: ["POLYSEMY", "CONCRETE"], imageBrief: "A narrow physical opening beneath a garden gate, with daylight visible through the space between the gate and ground." },
  { proposalKey: "EDITORIAL_2H2L:trade:buying-selling-activity", tags: ["POLYSEMY", "NOUN"], imageBrief: "A small market seller and customer exchange a good for payment at a stall; no currency branding or readable signs." },
  { proposalKey: "EDITORIAL_2H2L:trade:exchange-items", tags: ["POLYSEMY", "MULTIPLE_POS"], imageBrief: "Two schoolchildren exchange stickers directly, with no money, to distinguish swapping items from commercial trade." },
  { proposalKey: "EDITORIAL_2H2L:let:allow", tags: ["COMMON", "VERB"], imageBrief: "A guide gives visitors permission to take photographs in a courtyard with an open-handed welcoming gesture; no signs or text." },
  { proposalKey: "EDITORIAL_2H2L:rear:at-back", tags: ["POLYSEMY", "MULTIPLE_POS"], imageBrief: "The back-positioned window of a generic car, with visible dust on the glass; composition makes the rear location clear." },
  { proposalKey: "EDITORIAL_2H2L:rear:back-part", tags: ["POLYSEMY", "MULTIPLE_POS"], imageBrief: "The rear section of a generic car with a spare tire attached at the back; no license plate text or brand marks." },
  { proposalKey: "EDITORIAL_2H2L:during:within-period", tags: ["COMMON", "ABSTRACT"], imageBrief: "A text-free clock and a short highlighted interval surrounding an ongoing lecture demonstration; avoid a before/after contrast." },
  { proposalKey: "EDITORIAL_2H2L:relief:emergency-aid", tags: ["POLYSEMY", "ABSTRACT"], imageBrief: "Volunteers hand practical supplies to residents after flooding; show respectful assistance without identifiable real people." },
  { proposalKey: "EDITORIAL_2H2L:relief:pain-easing", tags: ["POLYSEMY", "ABSTRACT"], imageBrief: "A person rests with a cool cloth on their forehead and looks more comfortable; avoid medical branding or suggesting treatment advice." },
  { proposalKey: "EDITORIAL_2H2L:rest:relax", tags: ["POLYSEMY", "VERB"], imageBrief: "Gardeners pause in the shade after digging garden beds, visibly recovering their strength." },
  { proposalKey: "PHASE_E_2026_10_12:tear:core-sense", tags: ["MULTIPLE_PRONUNCIATIONS", "HOMOGRAPH", "VERB"], imageBrief: "Two hands pull a sheet of paper until it separates; depict only the material-damage verb sense, not crying or an eye." }
];

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function hashJson(value) {
  return sha256(Buffer.from(JSON.stringify(value), "utf8"));
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function normalized(value) {
  return String(value ?? "").normalize("NFKC").trim().toLocaleLowerCase("en-US");
}

function canonicalLocaleCharacters(text) {
  return Array.from(String(text)).length;
}

function requestKey(kind, request) {
  const hash = hashJson({ schemaVersion: 1, mediaKind: kind, ...request });
  return `media/v2/generated/requests/${kind.toLowerCase()}/${hash}`;
}

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

function loadPinnedSnapshot() {
  const snapshotPath = join(SOURCE_WORKSPACE, "current-effective-staging-snapshot-v1.json");
  const bytes = readFileSync(snapshotPath);
  const actualHash = sha256(bytes);
  const sidecar = readFileSync(`${snapshotPath}.sha256`, "utf8").trim().split(/\s+/)[0];
  requireCondition(actualHash === EXPECTED_SNAPSHOT_SHA256, "Current-effective snapshot bytes do not match the US-56 SHA pin.");
  requireCondition(sidecar === EXPECTED_SNAPSHOT_SHA256, "Current-effective snapshot sidecar does not match the US-56 SHA pin.");
  const snapshot = JSON.parse(bytes.toString("utf8"));
  requireCondition(snapshot.snapshotFingerprint === EXPECTED_SNAPSHOT_FINGERPRINT, "Current-effective snapshot fingerprint changed.");
  requireCondition(snapshot.target?.projectId === "shy-hill-72364426", "Unexpected Neon Development project.");
  requireCondition(snapshot.target?.branchId === "br-square-grass-b3af0nte", "Unexpected Neon Development branch.");
  requireCondition(snapshot.target?.databaseName === "neondb", "Unexpected Neon Development database.");
  requireCondition(snapshot.target?.schema === "vocabflow_editorial_staging", "Unexpected Neon staging schema.");
  requireCondition(snapshot.summary?.effectiveDraftRows === 5616, "Effective DRAFT target is not 5,616.");
  requireCondition(snapshot.effectiveSenses?.length === 5616, "Snapshot does not contain 5,616 effective Sense rows.");
  return { snapshot, sha256: actualHash, path: snapshotPath };
}

function loadMasterRecords() {
  const datasetBytes = readFileSync(MASTER_DATASET_PATH);
  const dataset = JSON.parse(datasetBytes.toString("utf8"));
  const lexemes = dataset.includedLexemes.map((entry) => ({
    ...readJson(join(REPO_ROOT, "vocabflow-dataset", entry.recordPath)),
    recordPath: entry.recordPath,
    recordContentHash: entry.contentHash
  }));
  const senses = dataset.includedSenses.map((entry) => ({
    ...readJson(join(REPO_ROOT, "vocabflow-dataset", entry.recordPath)),
    recordPath: entry.recordPath,
    recordContentHash: entry.contentHash
  }));
  const lexemesByLemma = new Map();
  for (const lexeme of lexemes) {
    const key = normalized(lexeme.normalizedLemma || lexeme.lemma);
    const rows = lexemesByLemma.get(key) ?? [];
    rows.push(lexeme);
    lexemesByLemma.set(key, rows);
  }
  return {
    dataset,
    datasetSha256: sha256(datasetBytes),
    lexemes,
    senses,
    lexemesByLemma
  };
}

function buildImagePrompt(sense, imageBrief) {
  return [
    "Create one learner-dictionary illustration for this single English sense.",
    `Headword: ${sense.headword}. Part of speech: ${sense.partOfSpeech}.`,
    `English definition: ${sense.definitionEn}`,
    `Vietnamese meaning: ${sense.meaningVi}`,
    `Sense-specific visual brief: ${imageBrief}`,
    `Example for context only: ${sense.example.en}`,
    "Use one clear focal scene that depicts this meaning only. Do not add readable text, labels, logos, branded objects, or extra senses. Do not use reference images, imitate a named artist, or reproduce a specific existing artwork."
  ].join("\n");
}

export function buildCommercialMediaPlan({ repoRoot = REPO_ROOT, selection = SENSE_SELECTION } = {}) {
  const previousRoot = REPO_ROOT;
  requireCondition(resolve(repoRoot) === previousRoot, "This builder is pinned to the current VocabFlow checkout.");
  const { snapshot, sha256: snapshotSha256, path: snapshotPath } = loadPinnedSnapshot();
  const master = loadMasterRecords();
  const snapshotRowsByKey = new Map(snapshot.effectiveSenses.map((row) => [row.proposalKey, row]));
  const masterSensesByLexeme = new Map();
  for (const sense of master.senses) {
    const rows = masterSensesByLexeme.get(sense.masterLexemeId) ?? [];
    rows.push(sense);
    masterSensesByLexeme.set(sense.masterLexemeId, rows);
  }

  requireCondition(selection.length >= 20 && selection.length <= 30, "Canary selection must contain 20–30 effective Senses.");
  const proposalKeys = new Set();
  const canarySenses = selection.map((chosen) => {
    requireCondition(!proposalKeys.has(chosen.proposalKey), `Duplicate canary Sense: ${chosen.proposalKey}`);
    proposalKeys.add(chosen.proposalKey);
    const row = snapshotRowsByKey.get(chosen.proposalKey);
    requireCondition(Boolean(row), `Canary Sense is not present in the pinned effective snapshot: ${chosen.proposalKey}`);
    requireCondition(row.editorialStatus === "DRAFT", `Canary Sense is not DRAFT: ${chosen.proposalKey}`);
    requireCondition(row.contentHash === row.draftContentHash, `Canary Sense content hash mismatch: ${chosen.proposalKey}`);
    const content = row.content ?? {};
    requireCondition(Boolean(content.headword && content.partOfSpeech && content.definitionEn && content.meaningVi), `Canary Sense is missing required content: ${chosen.proposalKey}`);
    requireCondition(Array.isArray(content.examples) && content.examples.length > 0 && Boolean(content.examples[0].en), `Canary Sense is missing an English example: ${chosen.proposalKey}`);
    const candidates = master.lexemesByLemma.get(normalized(content.headword)) ?? [];
    const lexeme = candidates.length === 1 ? candidates[0] : null;
    const rootSenses = lexeme ? (masterSensesByLexeme.get(lexeme.masterLexemeId) ?? []) : [];
    const hasPosEvidence = Boolean(lexeme && rootSenses.some((sense) => sense.partOfSpeechCode === content.partOfSpeech));
    return {
      proposalKey: row.proposalKey,
      sourceGroupKey: row.sourceGroupKey,
      editorialStatus: row.editorialStatus,
      contentFingerprint: row.contentHash,
      headword: content.headword,
      partOfSpeech: content.partOfSpeech,
      definitionEn: content.definitionEn,
      meaningVi: content.meaningVi,
      example: {
        exampleKey: content.examples[0].exampleKey ?? null,
        en: content.examples[0].en,
        textSha256: sha256(Buffer.from(content.examples[0].en, "utf8"))
      },
      tags: chosen.tags,
      candidateLexeme: lexeme ? {
        masterLexemeId: lexeme.masterLexemeId,
        lemma: lexeme.lemma,
        status: lexeme.status,
        mappingStatus: "CANDIDATE_REVIEW_REQUIRED",
        evidence: ["NFKC case-folded lemma equality", ...(hasPosEvidence ? ["canonical Master V2 Sense has matching POS"] : ["no matching canonical Master V2 POS Sense; reviewer decision required"])],
        existingPronunciationIds: (lexeme.pronunciations ?? []).map((pronunciation) => pronunciation.pronunciationId)
      } : {
        masterLexemeId: null,
        lemma: content.headword,
        mappingStatus: candidates.length > 1 ? "AMBIGUOUS_LEXEME_CANDIDATES" : "UNRESOLVED_NO_CANONICAL_LEXEME",
        evidence: ["No unique exact normalized-lemma Lexeme match in current Master V2 index"]
      },
      illustration: chosen.imageBrief ? {
        disposition: "PLANNED_NEEDS_HUMAN_SEMANTIC_REVIEW",
        semanticBrief: chosen.imageBrief
      } : {
        disposition: "SKIP_NO_UNAMBIGUOUS_STANDALONE_ILLUSTRATION",
        semanticBrief: null
      }
    };
  });

  const wordAudioByKey = new Map();
  for (const sense of canarySenses) {
    if (!sense.candidateLexeme.masterLexemeId) continue;
    const masterLexeme = master.lexemes.find((row) => row.masterLexemeId === sense.candidateLexeme.masterLexemeId);
    for (const locale of ["en-US", "en-GB"]) {
      const voice = locale === "en-US" ? "Joanna" : "Amy";
      const existing = (masterLexeme.pronunciations ?? []).filter((pronunciation) => pronunciation.locale === locale);
      const cacheRequest = {
        provider: "aws-polly",
        engine: "neural",
        model: "amazon-polly-neural",
        voice,
        locale,
        text: sense.candidateLexeme.lemma,
        outputFormat: "mp3",
        speakingRate: 1
      };
      const key = `${sense.candidateLexeme.masterLexemeId}:${locale}`;
      const item = wordAudioByKey.get(key) ?? {
        mediaKind: "WORD_PRONUNCIATION_AUDIO",
        targetLexemeIdentity: sense.candidateLexeme.masterLexemeId,
        lemma: sense.candidateLexeme.lemma,
        locale,
        provider: "aws-polly",
        engine: "neural",
        model: "amazon-polly-neural",
        voice,
        inputText: sense.candidateLexeme.lemma,
        inputTextSha256: sha256(Buffer.from(sense.candidateLexeme.lemma, "utf8")),
        generatedOutput: { providerRequestId: null, generatedAtUtc: null, providerTermsEvidenceVersion: null, outputSha256: null, byteLength: null, mimeType: "audio/mpeg" },
        outputFormat: "mp3",
        speakingRate: 1,
        pronunciationIdentityId: existing.length === 1 ? existing[0].pronunciationId : null,
        pronunciationIdentityStatus: existing.length === 1 ? existing[0].status : "MISSING_CANONICAL_PRONUNCIATION_IDENTITY",
        status: existing.length === 1 && existing[0].status === "APPROVED" ? "PLANNED_NEEDS_AUDIO_QA" : "BLOCKED_PRONUNCIATION_IDENTITY_REVIEW",
        targetSenseIdentities: [],
        characterCount: canonicalLocaleCharacters(sense.candidateLexeme.lemma),
        providerNeutralRequestKey: requestKey("WORD_PRONUNCIATION_AUDIO", cacheRequest),
        rightsStatus: "UNKNOWN_REVIEW_REQUIRED",
        uploadEligibility: false,
        generated: false
      };
      item.targetSenseIdentities.push(sense.proposalKey);
      wordAudioByKey.set(key, item);
    }
  }

  const exampleAudioByRequest = new Map();
  for (const sense of canarySenses) {
    const text = sense.example.en;
    const cacheRequest = {
      provider: "aws-polly",
      engine: "neural",
      model: "amazon-polly-neural",
      voice: "Joanna",
      locale: "en-US",
      text,
      outputFormat: "mp3",
      speakingRate: 1
    };
    const key = requestKey("EXAMPLE_SENTENCE_AUDIO", cacheRequest);
    const item = exampleAudioByRequest.get(key) ?? {
      mediaKind: "EXAMPLE_SENTENCE_AUDIO",
      locale: "en-US",
      provider: "aws-polly",
      engine: "neural",
      model: "amazon-polly-neural",
      voice: "Joanna",
      inputText: text,
      inputTextSha256: sense.example.textSha256,
      generatedOutput: { providerRequestId: null, generatedAtUtc: null, providerTermsEvidenceVersion: null, outputSha256: null, byteLength: null, mimeType: "audio/mpeg" },
      outputFormat: "mp3",
      speakingRate: 1,
      mappingContract: "UTF8_EXACT_SOURCE_EXAMPLE_TEXT_HASH",
      targetSenseMappings: [],
      characterCount: canonicalLocaleCharacters(text),
      providerNeutralRequestKey: key,
      status: "PLANNED_EXACT_EFFECTIVE_SENSE_EXAMPLE_TEXT",
      rightsStatus: "UNKNOWN_REVIEW_REQUIRED",
      uploadEligibility: false,
      generated: false
    };
    item.targetSenseMappings.push({ senseIdentity: sense.proposalKey, contentFingerprint: sense.contentFingerprint, exampleKey: sense.example.exampleKey });
    exampleAudioByRequest.set(key, item);
  }

  const imagePlans = canarySenses.filter((sense) => sense.illustration.semanticBrief).map((sense) => {
    const prompt = buildImagePrompt(sense, sense.illustration.semanticBrief);
    const request = {
      provider: "UNSELECTED_PENDING_RIGHTS_AND_AUDIENCE_GATE",
      promptVersion: "vocabflow-sense-illustration-v1",
      prompt,
      outputFormat: "png",
      size: "1024x1024",
      referenceImageHashes: []
    };
    return {
      mediaKind: "SENSE_ILLUSTRATION_IMAGE",
      targetSenseIdentity: sense.proposalKey,
      targetContentFingerprint: sense.contentFingerprint,
      headword: sense.headword,
      partOfSpeech: sense.partOfSpeech,
      definitionEn: sense.definitionEn,
      meaningVi: sense.meaningVi,
      exampleText: sense.example.en,
      semanticBrief: sense.illustration.semanticBrief,
      provider: null,
      model: null,
      promptVersion: "vocabflow-sense-illustration-v1",
      promptSha256: sha256(Buffer.from(prompt, "utf8")),
      prompt,
      generatedOutput: { providerRequestId: null, generatedAtUtc: null, providerTermsEvidenceVersion: null, outputSha256: null, byteLength: null, mimeType: "image/png" },
      outputFormat: "png",
      size: "1024x1024",
      referenceImageHashes: [],
      reuseAssetIdentity: null,
      providerNeutralRequestKey: requestKey("SENSE_ILLUSTRATION_IMAGE", request),
      status: "BLOCKED_PROVIDER_AND_RIGHTS_REVIEW",
      rightsStatus: "UNKNOWN_REVIEW_REQUIRED",
      uploadEligibility: false,
      generated: false
    };
  });

  const wordAudio = [...wordAudioByKey.values()].sort((a, b) => `${a.targetLexemeIdentity}:${a.locale}`.localeCompare(`${b.targetLexemeIdentity}:${b.locale}`));
  const exampleAudio = [...exampleAudioByRequest.values()].sort((a, b) => a.providerNeutralRequestKey.localeCompare(b.providerNeutralRequestKey));
  const wordCharacters = wordAudio.reduce((sum, row) => sum + row.characterCount, 0);
  const exampleCharacters = exampleAudio.reduce((sum, row) => sum + row.characterCount, 0);
  const totalCharacters = wordCharacters + exampleCharacters;
  const neuralUsdPerMillionCharacters = 16;

  return {
    schemaVersion: 1,
    manifestId: "vocabflow-commercial-media-generation-manifest-v1",
    planMode: "OFFLINE_ONLY",
    createdAt: null,
    sourcePins: {
      stagingSnapshotPath: "vocabflow-dataset/workspaces/english-vocabulary-4600-media-v2/current-effective-staging-snapshot-v1.json",
      stagingSnapshotSha256: snapshotSha256,
      stagingSnapshotFingerprint: snapshot.snapshotFingerprint,
      masterDatasetPath: "vocabflow-dataset/dataset.json",
      masterDatasetSha256: master.datasetSha256,
      effectiveSenseCount: snapshot.effectiveSenses.length,
      selectedSenseCount: canarySenses.length
    },
    target: {
      neonProjectId: snapshot.target.projectId,
      neonBranchId: snapshot.target.branchId,
      neonDatabase: snapshot.target.databaseName,
      neonSchema: snapshot.target.schema,
      neonWrites: 0,
      cloudinaryUploads: 0,
      paidProviderCalls: 0,
      runtimeWrites: 0
    },
    selectionContract: {
      source: "current EFFECTIVE DRAFT rows from the pinned snapshot only",
      requireMatchingIdentityAndDraftContentHash: true,
      excludedMediaInputs: ["ENGLISH_VOCAB_4600_APKG", "2000_COMMON_ENGLISH_VOCABULARY", "all unverified reference artwork/audio"],
      wordAudioSharing: "one request per unique Lexeme identity and locale, gated by an explicit pronunciation identity",
      exampleAudioMapping: "exact UTF-8 source example text hash only",
      imageMapping: "one Sense-specific brief and reviewer decision; no headword-only mapping"
    },
    canarySenses,
    generationPlans: {
      wordPronunciationAudio: wordAudio,
      exampleSentenceAudio: exampleAudio,
      senseIllustrationImages: imagePlans
    },
    costEstimate: {
      currency: "USD",
      tts: {
        provider: "Amazon Polly Neural",
        wordAudioRequests: wordAudio.length,
        wordAudioCharacters: wordCharacters,
        exampleAudioRequests: exampleAudio.length,
        exampleAudioCharacters: exampleCharacters,
        totalCharacters: totalCharacters,
        listPriceUsdPerMillionCharacters: neuralUsdPerMillionCharacters,
        exampleAudioOnlyUsdIfAuthorized: Number((exampleCharacters * neuralUsdPerMillionCharacters / 1_000_000).toFixed(6)),
        currentlyBlockedWordAudioUsdIfPronunciationsAreLaterApproved: Number((wordCharacters * neuralUsdPerMillionCharacters / 1_000_000).toFixed(6)),
        estimatedUsdOnePassBeforeFreeTier: Number((totalCharacters * neuralUsdPerMillionCharacters / 1_000_000).toFixed(6)),
        note: "Excludes tax and retries; AWS cache/replay itself has no additional fee. No request has been sent."
      },
      image: {
        provider: "Google Imagen 4 conditional quote only",
        model: "imagen-4.0-generate-001",
        plannedImages: imagePlans.length,
        listPriceUsdPerImage: 0.04,
        estimatedUsdOnePass: Number((imagePlans.length * 0.04).toFixed(2)),
        oneRetryEachScenarioUsd: Number((imagePlans.length * 2 * 0.04).toFixed(2)),
        status: "NOT_APPROVED; blocked by audience/terms and owner authorization gates"
      },
      totalScenarioUsdOnePass: Number((totalCharacters * neuralUsdPerMillionCharacters / 1_000_000 + imagePlans.length * 0.04).toFixed(6)),
      totalScenarioUsdOneRetryEach: Number((totalCharacters * 2 * neuralUsdPerMillionCharacters / 1_000_000 + imagePlans.length * 2 * 0.04).toFixed(6)),
      executableUsdNow: 0,
      authorizationStatus: "NO_OWNER_COST_CAP_OR_PROVIDER_ACCOUNT_AUTHORIZATION"
    },
    rights: {
      policyVersion: "commercial-media-rights-policy-v1",
      clearedAssetCount: 0,
      unknownAssetCount: wordAudio.length + exampleAudio.length + imagePlans.length,
      blockedAssetCount: wordAudio.length + exampleAudio.length + imagePlans.length,
      uploadEligibleAssetCount: 0,
      note: "Provider terms research is not an asset-level rights decision; no APKG rights are inferred."
    },
    deliveryAndStagingContract: {
      outputProvenanceRequired: [
        "provider", "modelOrVoice", "providerAccountReference", "providerTermsEvidenceVersion",
        "providerRequestId", "generatedAtUtc", "promptOrTextSha256", "promptVersion",
        "outputSha256", "byteLength", "mimeType", "generationParameters"
      ],
      cloudinary: {
        mode: "OFFLINE_ONLY",
        eligibleAssetCount: 0,
        blockedRequestCount: wordAudio.length + exampleAudio.length + imagePlans.length,
        outputHashRequiredBeforePublicId: true,
        publicIdTemplate: "vocabflow/{image|audio}/content-v2/{outputSha256}",
        audioResourceType: "video",
        overwrite: false,
        useExistingUploader: "scripts/vocab-media-upload.ts after a generated-media manifest adapter, rights gate, and explicit content-v2 public-ID support",
        uploads: 0
      },
      neonDevelopment: {
        target: "shy-hill-72364426/br-square-grass-b3af0nte/neondb/vocabflow_editorial_staging",
        mode: "NO_CONNECTION_NO_WRITE",
        rowsWritten: 0,
        proposedVersionedTables: [
          "commercial_generated_media_assets_v1",
          "commercial_generated_media_mappings_v1",
          "commercial_generated_media_rights_v1"
        ],
        identity: "(manifest_version, output_sha256) for assets; mapping key hashes output SHA, media kind, target identity, and target content fingerprint",
        isolationRequirement: "Additive staging-only tables; explicitly verify runtime has no schema USAGE/CREATE and use a staging-scoped migration role before any later apply.",
        compatibilityNote: "Existing US-56 media_assets_v2/media_mappings_v2/media_rights_v1 enforce upload_eligible=false; do not alter their rows or constraints for commercial generated assets."
      },
      runtimeWrites: 0
    },
    executionGates: {
      paidGenerationEnabled: false,
      paidGenerationReason: "Owner cost cap and provider-account authorization are not present.",
      imageProviderEnabled: false,
      imageProviderReason: "Audience-age policy is unresolved; Imagen is conditional and Firefly API rate card/entitlement is unavailable.",
      cloudinaryEnabled: false,
      neonWriteEnabled: false
    },
    integrity: {
      snapshotVerified: true,
      uniqueWordAudioRequests: wordAudio.length,
      uniqueExampleAudioRequests: exampleAudio.length,
      imageRequestCount: imagePlans.length,
      requestKeysContentAddressed: true,
      outputsGenerated: 0,
      binarySha256Values: null
    }
  };
}

export function evaluateRightsDecision(decision, intendedUse) {
  const required = [
    decision?.providerOrSource,
    decision?.licenseOrContractEvidence?.url,
    decision?.licenseOrContractEvidence?.versionOrEffectiveDate,
    decision?.assetIdentity?.sha256,
    decision?.intendedUse,
    decision?.attributionRequirements,
    decision?.reviewerIdentity,
    decision?.reviewedAt
  ];
  if (required.some((value) => !value)) return false;
  if (!/^[a-f0-9]{64}$/i.test(decision.assetIdentity.sha256)) return false;
  if (decision.reviewStatus !== "CLEARED_FOR_INTENDED_USE") return false;
  if (decision.intendedUse !== intendedUse) return false;
  if (decision.licenseOrContractEvidence.commercialUse !== true) return false;
  if (decision.licenseOrContractEvidence.distributionScopeConfirmed !== true) return false;
  if (decision.licenseOrContractEvidence.attributionSatisfied !== true) return false;
  if (decision.licenseOrContractEvidence.sourceIsNonCommercialOnly === true) return false;
  if (decision.licenseOrContractEvidence.evidenceHash && !/^[a-f0-9]{64}$/i.test(decision.licenseOrContractEvidence.evidenceHash)) return false;
  return true;
}

export function cloudinaryIdentityForVerifiedAsset(mediaKind, mediaSha256) {
  requireCondition(/^[a-f0-9]{64}$/.test(mediaSha256), "Cloudinary identity requires a verified output SHA-256.");
  const kind = mediaKind === "SENSE_ILLUSTRATION_IMAGE" ? "image"
    : mediaKind === "WORD_PRONUNCIATION_AUDIO" || mediaKind === "EXAMPLE_SENTENCE_AUDIO" ? "audio" : null;
  requireCondition(Boolean(kind), "Unsupported commercial media kind.");
  return {
    publicId: `vocabflow/${kind}/content-v2/${mediaSha256}`,
    resourceType: kind === "image" ? "image" : "video",
    overwrite: false
  };
}

export function generatedMediaMappingKey({ mediaSha256, mediaKind, targetIdentity, targetContentFingerprint }) {
  requireCondition(/^[a-f0-9]{64}$/.test(mediaSha256), "Staging mapping identity requires a verified output SHA-256.");
  requireCondition(/^[a-f0-9]{64}$/.test(targetContentFingerprint), "Staging mapping identity requires a pinned target content fingerprint.");
  requireCondition(Boolean(mediaKind && targetIdentity), "Staging mapping identity requires media kind and target identity.");
  return `us57:${hashJson({ schemaVersion: 1, mediaSha256, mediaKind, targetIdentity, targetContentFingerprint })}`;
}

export function evaluateCanarySpendGate({ ownerApproved, approvedCapUsd, spentUsd = 0, nextRequestUpperBoundUsd }) {
  const finiteNonnegative = (value) => Number.isFinite(value) && value >= 0;
  if (ownerApproved !== true) return { allowed: false, status: "BLOCKED_OWNER_APPROVAL_PENDING", remainingUsd: null };
  if (!finiteNonnegative(approvedCapUsd) || approvedCapUsd <= 0) return { allowed: false, status: "BLOCKED_INVALID_APPROVED_CAP", remainingUsd: null };
  if (!finiteNonnegative(spentUsd) || !finiteNonnegative(nextRequestUpperBoundUsd)) return { allowed: false, status: "BLOCKED_INVALID_COST_RESERVATION", remainingUsd: null };
  const remainingUsd = Number((approvedCapUsd - spentUsd).toFixed(6));
  if (nextRequestUpperBoundUsd > remainingUsd) return { allowed: false, status: "BLOCKED_BUDGET_EXCEEDED", remainingUsd };
  return { allowed: true, status: "AUTHORIZED_WITHIN_APPROVED_CAP", remainingUsd };
}

export function buildCanaryExecutionReadiness(plan, { reviewedAt = "2026-10-15", proposedCapUsd = 3, ownerApproved = false } = {}) {
  const allAudio = [
    ...plan.generationPlans.wordPronunciationAudio,
    ...plan.generationPlans.exampleSentenceAudio
  ];
  const imagePlans = plan.generationPlans.senseIllustrationImages;
  const wordsByLexeme = new Map();
  for (const request of plan.generationPlans.wordPronunciationAudio) {
    const current = wordsByLexeme.get(request.targetLexemeIdentity) ?? {
      lexemeIdentity: request.targetLexemeIdentity,
      lemma: request.lemma,
      locales: [],
      canonicalPronunciationIds: []
    };
    current.locales.push(request.locale);
    if (request.pronunciationIdentityId) current.canonicalPronunciationIds.push(request.pronunciationIdentityId);
    wordsByLexeme.set(request.targetLexemeIdentity, current);
  }
  const promptUtf8Bytes = imagePlans.reduce((sum, image) => sum + Buffer.byteLength(image.prompt, "utf8"), 0);
  const ttsCharacters = allAudio.reduce((sum, audio) => sum + audio.characterCount, 0);
  const retryMultiplier = 2;
  const openAiImageOutputUsd = imagePlans.length * retryMultiplier * 196 * 30 / 1_000_000;
  const openAiPromptTextUsdUpperBound = promptUtf8Bytes * retryMultiplier * 5 / 1_000_000;
  const ttsUsd = ttsCharacters * retryMultiplier * 16 / 1_000_000;
  const twoPassScenarioUsd = Number((openAiImageOutputUsd + openAiPromptTextUsdUpperBound + ttsUsd).toFixed(6));
  const exampleHashesVerified = plan.generationPlans.exampleSentenceAudio.every((request) =>
    request.inputTextSha256 === sha256(Buffer.from(request.inputText, "utf8"))
    && request.targetSenseMappings.every((mapping) => {
      const sense = plan.canarySenses.find((row) => row.proposalKey === mapping.senseIdentity);
      return Boolean(sense && request.inputText === sense.example.en && mapping.contentFingerprint === sense.contentFingerprint);
    })
  );
  const briefReviewNotes = {
    "PROVISIONAL_BULK_2026_01:democracy:core-sense": "Voting scene directly represents choosing representatives.",
    "EDITORIAL_2H2L:reservation:booking": "Checking a berth assignment represents an advance place reservation.",
    "EDITORIAL_2H2L:reservation:doubt": "Pausing over a proposal conveys a concern before acceptance.",
    "EDITORIAL_2H2K:beautiful:pleasing-to-see": "An admired landscape feature is a concrete example of visual pleasure.",
    "EDITORIAL_2H2K:quickly:at-high-speed": "A single rapid action expresses speed without relying on text.",
    "PHASE_E_T21:play:perform-music": "An instrument performance represents producing music.",
    "PHASE_E_T21:play:play-game-or-sport": "A chess game shows participation in a game, distinct from performing music or drama.",
    "PHASE_E_T21:play:stage-drama": "Actors and an audience represent a staged dramatic work.",
    "PHASE_E_T21:orange:citrus-fruit": "The segmented fruit is the focal object for the citrus sense.",
    "PHASE_E_T21:orange:orange-color": "A red-to-yellow spectrum isolates the color sense from the fruit.",
    "PHASE_E_T21:orange:orange-colored": "A scarf demonstrates the adjective without showing the fruit.",
    "EDITORIAL_2H2L:gap:difference-between-groups": "A generational comparison represents a difference between groups without labels or stereotypes.",
    "EDITORIAL_2H2L:gap:free-interval": "An empty calendar interval between planned activities represents a schedule gap.",
    "EDITORIAL_2H2L:gap:physical-opening": "Daylight through the opening under a gate makes the physical gap visible.",
    "EDITORIAL_2H2L:trade:buying-selling-activity": "A seller and customer exchanging a good for payment represents commercial trade.",
    "EDITORIAL_2H2L:trade:exchange-items": "A direct sticker swap without money distinguishes exchanging from buying and selling.",
    "EDITORIAL_2H2L:let:allow": "The guide's welcoming permission gesture and camera action represent allowing an action.",
    "EDITORIAL_2H2L:rear:at-back": "The rear-positioned car window represents a location at the back.",
    "EDITORIAL_2H2L:rear:back-part": "The back section of the car represents its rearmost part.",
    "EDITORIAL_2H2L:during:within-period": "An ongoing lecture within a highlighted time interval represents during an event.",
    "EDITORIAL_2H2L:relief:emergency-aid": "Practical supply handoff after a flood represents disaster relief.",
    "EDITORIAL_2H2L:relief:pain-easing": "A more comfortable resting person represents reduced discomfort without treatment claims.",
    "EDITORIAL_2H2L:rest:relax": "Gardeners pausing after physical work represent resting to recover strength.",
    "PHASE_E_2026_10_12:tear:core-sense": "Tearing paper represents material damage and explicitly excludes the crying/eye homograph."
  };
  const semanticBriefReview = imagePlans.map((image) => ({
    senseIdentity: image.targetSenseIdentity,
    targetContentFingerprint: image.targetContentFingerprint,
    promptSha256: image.promptSha256,
    decision: briefReviewNotes[image.targetSenseIdentity] ? "BRIEF_ALIGNS_WITH_TARGET_SENSE" : "NEEDS_REVIEW",
    evidence: briefReviewNotes[image.targetSenseIdentity] ?? "No brief-to-definition review note exists.",
    referenceImageHashes: image.referenceImageHashes
  }));

  return {
    schemaVersion: 1,
    reportId: "vocabflow-us57-canary-execution-readiness-v1",
    reviewedAt,
    mode: "OFFLINE_PREFLIGHT_ONLY",
    sourcePins: {
      manifestSha256: sha256(Buffer.from(renderPlan(plan), "utf8")),
      stagingSnapshotSha256: plan.sourcePins.stagingSnapshotSha256,
      stagingSnapshotFingerprint: plan.sourcePins.stagingSnapshotFingerprint,
      masterDatasetSha256: plan.sourcePins.masterDatasetSha256
    },
    baseline: {
      effectiveDraftSenses: plan.sourcePins.effectiveSenseCount,
      selectedSenses: plan.canarySenses.length,
      snapshotTarget: `${plan.target.neonProjectId}/${plan.target.neonBranchId}/${plan.target.neonDatabase}/${plan.target.neonSchema}`
    },
    amazonPollyPreflight: {
      publicTermsReviewed: true,
      publicTermsReviewedAt: reviewedAt,
      commercialOutput: "PUBLISHED_AWS_TERMS_DESIGNATE_OUTPUT_AS_CUSTOMER_CONTENT; PRODUCT_PAGE_SAYS_STANDARD_AUDIO_FILES_MAY_BE_REDISTRIBUTED",
      repeatedPlayback: "PRICING_PAGE_SAYS_CACHE_AND_REPLAY_WITHOUT_ADDITIONAL_FEE",
      voices: [
        { locale: "en-US", voice: "Joanna", neuralListed: true },
        { locale: "en-GB", voice: "Amy", neuralListed: true }
      ],
      neuralRegionsInclude: ["us-east-1", "us-west-2", "ap-southeast-7"],
      configuredRegion: null,
      accountRegionAndVoiceAvailability: "UNVERIFIED_NO_AWS_CREDENTIALS_OR_PROFILE",
      effectiveAiContentOptOut: "UNVERIFIED_ACCOUNT_POLICY; AWS DOCUMENTATION SUPPORTS POLLY OPT-OUT THROUGH AWS ORGANIZATIONS",
      publicQuota: { neuralSynthesizeSpeechRequestsPerSecond: 8, burstRequestsPerSecond: 10, maximumConcurrentRequests: 18 },
      accountQuota: "UNVERIFIED",
      credentialsAvailable: false,
      awsCliAvailable: false,
      readyForProviderCall: false,
      sources: [
        "https://aws.amazon.com/service-terms/",
        "https://aws.amazon.com/polly/",
        "https://aws.amazon.com/polly/pricing/",
        "https://docs.aws.amazon.com/polly/latest/dg/neural-voices.html",
        "https://docs.aws.amazon.com/polly/latest/dg/limits.html",
        "https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_ai-opt-out_all.html"
      ],
      blockers: ["AWS credentials/profile unavailable in VocabFlow environment", "No provider region configured", "Effective AWS Organizations Polly opt-out not verified", "Owner-specific AWS contracting terms/account eligibility not inspected"]
    },
    wordAudioReadiness: {
      plannedJobs: plan.generationPlans.wordPronunciationAudio.length,
      exactMasterLexemeCandidates: wordsByLexeme.size,
      canonicalPronunciationIdentitiesResolved: [...wordsByLexeme.values()].filter((row) => row.canonicalPronunciationIds.length > 0).length,
      jobsBlocked: plan.generationPlans.wordPronunciationAudio.filter((request) => request.status === "BLOCKED_PRONUNCIATION_IDENTITY_REVIEW").length,
      sourceIdentityStatus: "LEXEME_IDENTITY_AND_LOCALE_ARE_STABLE; ROOT MASTER V2 PRONUNCIATIONS ARRAYS ARE EMPTY FOR THESE 14 LEXEMES, SO NO CANONICAL PRONUNCIATION ID CAN BE CLAIMED",
      candidateLexemes: [...wordsByLexeme.values()].sort((a, b) => a.lemma.localeCompare(b.lemma)).map((row) => ({ ...row, locales: row.locales.sort() })),
      homographCanary: {
        lemma: "tear",
        status: "UNRESOLVED_NO_CANONICAL_LEXEME_OR_PRONUNCIATION_IDENTITY",
        affectedSenseIdentity: plan.canarySenses.find((sense) => sense.headword === "tear")?.proposalKey ?? null,
        includedInWordAudioJobs: false
      }
    },
    exampleAudioReadiness: {
      plannedJobs: plan.generationPlans.exampleSentenceAudio.length,
      exactValidatedSenseTextAndContentHashVerified: exampleHashesVerified,
      readyInputs: exampleHashesVerified ? plan.generationPlans.exampleSentenceAudio.length : 0,
      generated: 0,
      mappingContract: "UTF8_EXACT_SOURCE_EXAMPLE_TEXT_HASH",
      readyForProviderCall: false,
      blocker: "All 25 inputs are source-pinned; provider/account and explicit spend authorization gates remain closed."
    },
    imageReadiness: {
      originalSenseSpecificBriefs: imagePlans.length,
      referencesUsed: imagePlans.reduce((sum, image) => sum + image.referenceImageHashes.length, 0),
      briefIdentityAndPromptHashesVerified: imagePlans.every((image) => image.promptSha256 === sha256(Buffer.from(image.prompt, "utf8")) && image.targetContentFingerprint),
      semanticBriefReview: {
        reviewer: "Codex offline review",
        reviewedAt,
        reviewedCount: semanticBriefReview.length,
        decisions: semanticBriefReview
      },
      generated: 0,
      providerCandidates: [
        {
          provider: "Google Vertex AI Imagen",
          status: "BLOCKED_FOR_VOCABFLOW_MINOR_AUDIENCE",
          evidence: "Current Google Cloud Service Specific Terms prohibit use of Generative AI Services in online services directed to or likely accessed by under-18 users.",
          priceUsdPerImage: 0.04,
          evidenceUrl: "https://cloud.google.com/terms/service-terms"
        },
        {
          provider: "OpenAI API Images",
          model: "gpt-image-2.5-sunburst",
          status: "CONDITIONAL_OWNER_REVIEW_REQUIRED",
          evidence: "Business terms assign output to the customer and permit API integration in Customer Applications; service terms require parental/guardian consent for minors using OpenAI Services, and API under-18 guidance requires age-appropriate safety/privacy safeguards.",
          currentPriceBasis: "USD 5 per million text-input tokens and USD 30 per million image-output tokens; low 1024x1024 calculator projection uses 196 image tokens (USD 0.00588 output per image).",
          accountAndMinorScopeVerified: false,
          evidenceUrls: [
            "https://openai.com/policies/services-agreement/",
            "https://developers.openai.com/api/docs/guides/safety-checks/under-18-api-guidance",
            "https://developers.openai.com/api/docs/guides/image-generation",
            "https://developers.openai.com/api/docs/pricing"
          ]
        },
        {
          provider: "Adobe Firefly Services API",
          status: "CONDITIONAL_ENTITLEMENT_PRICE_AND_MINOR_SCOPE_UNVERIFIED",
          evidence: "Adobe states non-beta Firefly output may be used commercially; automated Firefly Services requires provisioned business credentials and the organization-specific API operations rate card. No account/minor-scope review is available.",
          documentedDefaultRateLimitRequestsPerMinute: 4,
          evidenceUrls: [
            "https://helpx.adobe.com/creative-cloud/apps/generative-ai/generative-credits-faq.html",
            "https://developer.adobe.com/firefly-services/docs/firefly-api/getting-started/usage-notes/",
            "https://helpx.adobe.com/in/legal/product-descriptions/shared-credits.html"
          ]
        }
      ],
      eligibleProvider: null
    },
    costGate: {
      currency: "USD",
      proposedCapUsd,
      ownerApprovalStatus: ownerApproved ? "APPROVED" : "PENDING_OWNER_APPROVAL",
      approvalIsNotInferredFromProposedCap: true,
      executableSpendAuthorizedUsd: 0,
      conservativeScenario: {
        scenario: "OPENAI_GPT_IMAGE_2_5_LOW_1024_SQUARE_PLUS_POLLY_NEURAL; ONE_RETRY_PER_REQUEST; NOT_AN_EXECUTION_APPROVAL",
        imageOutputTokensAssumedPerImage: 196,
        imagePromptUtf8Bytes: promptUtf8Bytes,
        ttsCharacters: ttsCharacters,
        imageOutputUsd: Number(openAiImageOutputUsd.toFixed(6)),
        imagePromptTextUsdUpperBound: Number(openAiPromptTextUsdUpperBound.toFixed(6)),
        ttsUsd: Number(ttsUsd.toFixed(6)),
        totalUsd: twoPassScenarioUsd,
        excludes: ["tax", "account-specific discounts", "any provider other than this specific OpenAI image model/settings", "Cloudinary storage/delivery", "costs outside one retry per job"],
        caveat: "A provider has not been cleared or selected. Refresh current terms/prices and verify returned usage before later approval; do not execute from this scenario alone."
      },
      paidProviderCalls: 0,
      imageGenerations: 0,
      audioGenerations: 0,
      cloudinaryUploads: 0,
      neonWrites: 0,
      runtimeWrites: 0,
      generationEnabled: false
    },
    blockers: [
      "Owner has not approved the proposed USD 3 cost cap.",
      "No eligible image provider has been selected and verified for the minor-audience scope.",
      "AWS account credentials, region, account eligibility, and effective Polly AI-content opt-out are unavailable/unverified.",
      "All 28 word jobs lack canonical Master V2 pronunciation identities; tear also lacks a canonical Lexeme identity.",
      "No provider terms/account approval authorizes the planned output generation yet."
    ],
    status: "READY_INPUTS_ONLY_BLOCKED_BEFORE_PROVIDER_CALLS"
  };
}

export function renderPlan(plan) {
  return `${JSON.stringify(plan, null, 2)}\n`;
}

function main() {
  const plan = buildCommercialMediaPlan();
  const readiness = buildCanaryExecutionReadiness(plan);
  mkdirSync(WORKSPACE, { recursive: true });
  const outputPath = join(WORKSPACE, "media-generation-manifest-v1.json");
  writeFileSync(outputPath, renderPlan(plan), "utf8");
  const summary = {
    manifestPath: "vocabflow-dataset/workspaces/us57-commercial-media-pipeline/media-generation-manifest-v1.json",
    stagingEffectiveSenses: plan.sourcePins.effectiveSenseCount,
    canarySenses: plan.canarySenses.length,
    matchedLexemes: new Set(plan.canarySenses.map((sense) => sense.candidateLexeme.masterLexemeId).filter(Boolean)).size,
    wordAudioRequests: plan.generationPlans.wordPronunciationAudio.length,
    exampleAudioRequests: plan.generationPlans.exampleSentenceAudio.length,
    imagesPlanned: plan.generationPlans.senseIllustrationImages.length,
    ttsEstimateUsd: plan.costEstimate.tts.estimatedUsdOnePassBeforeFreeTier,
    ttsExampleOnlyUsd: plan.costEstimate.tts.exampleAudioOnlyUsdIfAuthorized,
    ttsWordAudioConditionalUsd: plan.costEstimate.tts.currentlyBlockedWordAudioUsdIfPronunciationsAreLaterApproved,
    imageScenarioUsd: plan.costEstimate.image.estimatedUsdOnePass,
    imageScenarioProvider: plan.costEstimate.image.provider,
    imageScenarioStatus: "BLOCKED_CURRENT_GOOGLE_UNDER_18_TERMS; CONDITIONAL PRICE IS NOT AN ELIGIBLE EXECUTION SCENARIO",
    totalOnePassConditionalUsd: plan.costEstimate.totalScenarioUsdOnePass,
    totalOneRetryEachConditionalUsd: plan.costEstimate.totalScenarioUsdOneRetryEach,
    currentOpenAiLowQualityOneRetryEstimateUsd: readiness.costGate.conservativeScenario.totalUsd,
    currentOpenAiImageScenarioStatus: "CONDITIONAL_ONLY; NO IMAGE PROVIDER CLEARED OR SELECTED",
    proposedCostCapUsd: readiness.costGate.proposedCapUsd,
    costCapApproval: readiness.costGate.ownerApprovalStatus,
    executableSpendAuthorizedUsd: plan.costEstimate.executableUsdNow,
    plannedRequestCount: plan.generationPlans.wordPronunciationAudio.length + plan.generationPlans.exampleSentenceAudio.length + plan.generationPlans.senseIllustrationImages.length,
    rightsClearedAssets: plan.rights.clearedAssetCount,
    rightsUnknownAssets: plan.rights.unknownAssetCount,
    uploadEligibleAssets: plan.rights.uploadEligibleAssetCount,
    paidProviderCalls: plan.target.paidProviderCalls,
    cloudinaryUploads: plan.target.cloudinaryUploads,
    neonWrites: plan.target.neonWrites,
    planSha256: sha256(Buffer.from(renderPlan(plan), "utf8"))
  };
  summary.executionReadinessPath = "vocabflow-dataset/workspaces/us57-commercial-media-pipeline/canary-execution-readiness-v1.json";
  summary.executionReadinessSha256 = sha256(Buffer.from(`${JSON.stringify(readiness, null, 2)}\n`, "utf8"));
  writeFileSync(join(WORKSPACE, "media-generation-plan-report-v1.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  writeFileSync(join(WORKSPACE, "canary-execution-readiness-v1.json"), `${JSON.stringify(readiness, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
