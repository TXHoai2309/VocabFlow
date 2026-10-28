import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  buildCommercialMediaPlan,
  buildCanaryExecutionReadiness,
  cloudinaryIdentityForVerifiedAsset,
  evaluateCanarySpendGate,
  evaluateRightsDecision,
  generatedMediaMappingKey,
  renderPlan
} from "./us57-commercial-media-plan-v1.mjs";

const INTENDED_USE = "Store and serve audio/image files inside the paid VocabFlow learning application, including provider-neutral storage, Cloudinary authenticated or signed delivery, caching, and playback to subscribers.";

test("plan is pinned to current effective Development snapshot and a 25-Sense canary", () => {
  const plan = buildCommercialMediaPlan();
  assert.equal(plan.sourcePins.effectiveSenseCount, 5616);
  assert.equal(plan.sourcePins.stagingSnapshotSha256, "ed5728a635234a1fb3c8771f8d2ed19041866106a10e04430abe5b31d89a9f3b");
  assert.equal(plan.sourcePins.stagingSnapshotFingerprint, "217c272765f80e92319b928740176ec6685527ff56de74d891bf16052cb7106b");
  assert.equal(plan.target.neonProjectId, "shy-hill-72364426");
  assert.equal(plan.target.neonBranchId, "br-square-grass-b3af0nte");
  assert.equal(plan.target.neonDatabase, "neondb");
  assert.equal(plan.target.neonSchema, "vocabflow_editorial_staging");
  assert.equal(plan.canarySenses.length, 25);
  assert.ok(plan.canarySenses.every((sense) => sense.editorialStatus === "DRAFT"));
  assert.ok(plan.canarySenses.every((sense) => /^[a-f0-9]{64}$/.test(sense.contentFingerprint)));
  assert.ok(plan.canarySenses.every((sense) => sense.example.textSha256 === createHash("sha256").update(sense.example.en).digest("hex")));
});

test("rebuild is deterministic and provider-neutral request keys are content addressed", () => {
  const first = renderPlan(buildCommercialMediaPlan());
  const second = renderPlan(buildCommercialMediaPlan());
  assert.equal(first, second);
  const plan = JSON.parse(first);
  const requestKeys = [
    ...plan.generationPlans.wordPronunciationAudio,
    ...plan.generationPlans.exampleSentenceAudio,
    ...plan.generationPlans.senseIllustrationImages
  ].map((row) => row.providerNeutralRequestKey);
  assert.equal(new Set(requestKeys).size, requestKeys.length);
  assert.ok(requestKeys.every((key) => key.startsWith("media/v2/generated/requests/")));
  assert.ok(plan.deliveryAndStagingContract.cloudinary.overwrite === false);
  assert.equal(plan.deliveryAndStagingContract.cloudinary.uploads, 0);
  assert.equal(plan.deliveryAndStagingContract.neonDevelopment.rowsWritten, 0);
  assert.deepEqual(plan.deliveryAndStagingContract.neonDevelopment.proposedVersionedTables, [
    "commercial_generated_media_assets_v1",
    "commercial_generated_media_mappings_v1",
    "commercial_generated_media_rights_v1"
  ]);
  assert.ok(plan.deliveryAndStagingContract.neonDevelopment.compatibilityNote.includes("upload_eligible=false"));
});

test("word audio is one shared candidate per Lexeme and locale; tear remains unresolved", () => {
  const plan = buildCommercialMediaPlan();
  const wordAudio = plan.generationPlans.wordPronunciationAudio;
  assert.equal(wordAudio.length, 28);
  assert.equal(new Set(wordAudio.map((row) => `${row.targetLexemeIdentity}:${row.locale}`)).size, wordAudio.length);
  assert.ok(wordAudio.every((row) => row.status === "BLOCKED_PRONUNCIATION_IDENTITY_REVIEW"));
  assert.ok(wordAudio.every((row) => row.pronunciationIdentityId === null));
  assert.ok(wordAudio.some((row) => row.targetSenseIdentities.length > 1), "Polysemous senses should reuse a Lexeme-level request.");
  const tear = plan.canarySenses.find((sense) => sense.headword === "tear");
  assert.ok(tear);
  assert.equal(tear.candidateLexeme.masterLexemeId, null);
  assert.equal(tear.candidateLexeme.mappingStatus, "UNRESOLVED_NO_CANONICAL_LEXEME");
  assert.ok(!wordAudio.some((row) => row.lemma === "tear"));
});

test("example audio stays bound to exact effective example text and image prompts use no references", () => {
  const plan = buildCommercialMediaPlan();
  const senses = new Map(plan.canarySenses.map((sense) => [sense.proposalKey, sense]));
  assert.equal(plan.generationPlans.exampleSentenceAudio.length, 25);
  for (const audio of plan.generationPlans.exampleSentenceAudio) {
    assert.equal(audio.mappingContract, "UTF8_EXACT_SOURCE_EXAMPLE_TEXT_HASH");
    assert.equal(audio.inputTextSha256, createHash("sha256").update(audio.inputText).digest("hex"));
    for (const mapping of audio.targetSenseMappings) {
      const sense = senses.get(mapping.senseIdentity);
      assert.ok(sense);
      assert.equal(audio.inputText, sense.example.en);
      assert.equal(mapping.contentFingerprint, sense.contentFingerprint);
    }
  }
  assert.equal(plan.generationPlans.senseIllustrationImages.length, 24);
  assert.ok(plan.generationPlans.senseIllustrationImages.every((image) => image.referenceImageHashes.length === 0));
  assert.ok(plan.generationPlans.senseIllustrationImages.every((image) => image.targetContentFingerprint === senses.get(image.targetSenseIdentity).contentFingerprint));
  assert.ok(plan.generationPlans.senseIllustrationImages.every((image) => image.generated === false));
});

test("rights decision fails closed for unknown, noncommercial, missing evidence, or wrong intended use", () => {
  const cleared = {
    providerOrSource: "Example Provider",
    licenseOrContractEvidence: {
      url: "https://example.com/terms",
      versionOrEffectiveDate: "2026-10-01",
      evidenceHash: "a".repeat(64),
      commercialUse: true,
      distributionScopeConfirmed: true,
      attributionSatisfied: true,
      sourceIsNonCommercialOnly: false
    },
    assetIdentity: { sha256: "b".repeat(64), mediaKind: "SENSE_ILLUSTRATION_IMAGE", providerRequestOrSourceIdentity: "job-001" },
    intendedUse: INTENDED_USE,
    attributionRequirements: "NONE_VERIFIED",
    reviewStatus: "CLEARED_FOR_INTENDED_USE",
    reviewerIdentity: "owner@example.test",
    reviewedAt: "2026-10-15T00:00:00.000Z"
  };
  assert.equal(evaluateRightsDecision(cleared, INTENDED_USE), true);
  assert.equal(evaluateRightsDecision({ ...cleared, reviewStatus: "UNKNOWN_REVIEW_REQUIRED" }, INTENDED_USE), false);
  assert.equal(evaluateRightsDecision({ ...cleared, licenseOrContractEvidence: { ...cleared.licenseOrContractEvidence, sourceIsNonCommercialOnly: true } }, INTENDED_USE), false);
  assert.equal(evaluateRightsDecision({ ...cleared, licenseOrContractEvidence: { ...cleared.licenseOrContractEvidence, distributionScopeConfirmed: false } }, INTENDED_USE), false);
  assert.equal(evaluateRightsDecision({ ...cleared, intendedUse: "internal reference" }, INTENDED_USE), false);
  assert.equal(evaluateRightsDecision({ ...cleared, assetIdentity: { ...cleared.assetIdentity, sha256: "not-a-hash" } }, INTENDED_USE), false);
  assert.equal(evaluateRightsDecision({ ...cleared, licenseOrContractEvidence: { ...cleared.licenseOrContractEvidence, url: undefined } }, INTENDED_USE), false);
});

test("cost estimate is reproducible; plan cannot call providers, Cloudinary, or Neon", () => {
  const plan = buildCommercialMediaPlan();
  const characterTotal = [
    ...plan.generationPlans.wordPronunciationAudio,
    ...plan.generationPlans.exampleSentenceAudio
  ].reduce((sum, row) => sum + row.characterCount, 0);
  assert.equal(plan.costEstimate.tts.totalCharacters, characterTotal);
  assert.equal(plan.costEstimate.tts.estimatedUsdOnePassBeforeFreeTier, Number((characterTotal * 16 / 1_000_000).toFixed(6)));
  assert.equal(plan.costEstimate.totalScenarioUsdOnePass, Number((characterTotal * 16 / 1_000_000 + plan.generationPlans.senseIllustrationImages.length * 0.04).toFixed(6)));
  assert.equal(plan.costEstimate.totalScenarioUsdOneRetryEach, Number((characterTotal * 32 / 1_000_000 + plan.generationPlans.senseIllustrationImages.length * 0.08).toFixed(6)));
  assert.equal(plan.costEstimate.executableUsdNow, 0);
  assert.ok([
    ...plan.generationPlans.wordPronunciationAudio,
    ...plan.generationPlans.exampleSentenceAudio,
    ...plan.generationPlans.senseIllustrationImages
  ].every((row) => row.generatedOutput.outputSha256 === null && row.generatedOutput.providerRequestId === null));
  assert.equal(plan.executionGates.paidGenerationEnabled, false);
  assert.equal(plan.executionGates.cloudinaryEnabled, false);
  assert.equal(plan.executionGates.neonWriteEnabled, false);
  assert.equal(plan.target.paidProviderCalls, 0);
  assert.equal(plan.target.cloudinaryUploads, 0);
  assert.equal(plan.target.neonWrites, 0);
  assert.equal(plan.target.runtimeWrites, 0);
  assert.equal(plan.rights.uploadEligibleAssetCount, 0);
});

test("execution readiness pins source text and fails closed on account, pronunciation, provider, and approval gates", () => {
  const plan = buildCommercialMediaPlan();
  const readiness = buildCanaryExecutionReadiness(plan);
  assert.equal(JSON.stringify(readiness), JSON.stringify(buildCanaryExecutionReadiness(buildCommercialMediaPlan())));
  assert.equal(readiness.sourcePins.stagingSnapshotSha256, plan.sourcePins.stagingSnapshotSha256);
  assert.equal(readiness.baseline.effectiveDraftSenses, 5616);
  assert.equal(readiness.baseline.selectedSenses, 25);
  assert.equal(readiness.amazonPollyPreflight.publicTermsReviewed, true);
  assert.equal(readiness.amazonPollyPreflight.voices.length, 2);
  assert.equal(readiness.amazonPollyPreflight.credentialsAvailable, false);
  assert.equal(readiness.amazonPollyPreflight.effectiveAiContentOptOut.startsWith("UNVERIFIED"), true);
  assert.equal(readiness.wordAudioReadiness.plannedJobs, 28);
  assert.equal(readiness.wordAudioReadiness.exactMasterLexemeCandidates, 14);
  assert.equal(readiness.wordAudioReadiness.canonicalPronunciationIdentitiesResolved, 0);
  assert.equal(readiness.wordAudioReadiness.jobsBlocked, 28);
  assert.equal(readiness.wordAudioReadiness.homographCanary.includedInWordAudioJobs, false);
  assert.equal(readiness.exampleAudioReadiness.plannedJobs, 25);
  assert.equal(readiness.exampleAudioReadiness.readyInputs, 25);
  assert.equal(readiness.exampleAudioReadiness.exactValidatedSenseTextAndContentHashVerified, true);
  assert.equal(readiness.imageReadiness.originalSenseSpecificBriefs, 24);
  assert.equal(readiness.imageReadiness.referencesUsed, 0);
  assert.equal(readiness.imageReadiness.briefIdentityAndPromptHashesVerified, true);
  assert.equal(readiness.imageReadiness.semanticBriefReview.reviewedCount, 24);
  assert.ok(readiness.imageReadiness.semanticBriefReview.decisions.every((row) => row.decision === "BRIEF_ALIGNS_WITH_TARGET_SENSE"));
  assert.equal(readiness.imageReadiness.eligibleProvider, null);
  assert.equal(readiness.costGate.proposedCapUsd, 3);
  assert.equal(readiness.costGate.ownerApprovalStatus, "PENDING_OWNER_APPROVAL");
  assert.equal(readiness.costGate.conservativeScenario.totalUsd, 0.503706);
  assert.equal(readiness.costGate.executableSpendAuthorizedUsd, 0);
  assert.equal(readiness.costGate.paidProviderCalls, 0);
  assert.equal(readiness.costGate.imageGenerations, 0);
  assert.equal(readiness.costGate.audioGenerations, 0);
  assert.equal(readiness.costGate.cloudinaryUploads, 0);
  assert.equal(readiness.costGate.neonWrites, 0);
  assert.equal(readiness.status, "READY_INPUTS_ONLY_BLOCKED_BEFORE_PROVIDER_CALLS");
});

test("cost gate requires explicit approval and checks each request estimate before it can run", () => {
  assert.deepEqual(evaluateCanarySpendGate({ ownerApproved: false, approvedCapUsd: 3, spentUsd: 0, nextRequestUpperBoundUsd: 0.1 }), {
    allowed: false,
    status: "BLOCKED_OWNER_APPROVAL_PENDING",
    remainingUsd: null
  });
  assert.equal(evaluateCanarySpendGate({ ownerApproved: true, approvedCapUsd: 3, spentUsd: 2.95, nextRequestUpperBoundUsd: 0.1 }).status, "BLOCKED_BUDGET_EXCEEDED");
  assert.deepEqual(evaluateCanarySpendGate({ ownerApproved: true, approvedCapUsd: 3, spentUsd: 2.8, nextRequestUpperBoundUsd: 0.2 }), {
    allowed: true,
    status: "AUTHORIZED_WITHIN_APPROVED_CAP",
    remainingUsd: 0.2
  });
  assert.equal(evaluateCanarySpendGate({ ownerApproved: true, approvedCapUsd: 3, spentUsd: 0, nextRequestUpperBoundUsd: Number.NaN }).allowed, false);
});

test("verified output hashes produce idempotent Cloudinary and staging identities", () => {
  const sha = "a".repeat(64);
  const image = cloudinaryIdentityForVerifiedAsset("SENSE_ILLUSTRATION_IMAGE", sha);
  assert.deepEqual(image, {
    publicId: `vocabflow/image/content-v2/${sha}`,
    resourceType: "image",
    overwrite: false
  });
  assert.deepEqual(cloudinaryIdentityForVerifiedAsset("SENSE_ILLUSTRATION_IMAGE", sha), image);
  assert.deepEqual(cloudinaryIdentityForVerifiedAsset("EXAMPLE_SENTENCE_AUDIO", sha), {
    publicId: `vocabflow/audio/content-v2/${sha}`,
    resourceType: "video",
    overwrite: false
  });
  const args = {
    mediaSha256: sha,
    mediaKind: "EXAMPLE_SENTENCE_AUDIO",
    targetIdentity: "EDITORIAL_2H2K:beautiful:pleasing-to-see",
    targetContentFingerprint: "b".repeat(64)
  };
  assert.equal(generatedMediaMappingKey(args), generatedMediaMappingKey({ ...args }));
  assert.notEqual(generatedMediaMappingKey(args), generatedMediaMappingKey({ ...args, targetIdentity: "another-sense" }));
  assert.throws(() => cloudinaryIdentityForVerifiedAsset("SENSE_ILLUSTRATION_IMAGE", "bad"), /SHA-256/);
  assert.throws(() => generatedMediaMappingKey({ ...args, mediaSha256: "bad" }), /SHA-256/);
});
