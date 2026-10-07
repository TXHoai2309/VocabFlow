import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { getConnectionTarget } from "../config/database-targets";
import { canonicalJsonSha256 } from "./validate-master-vocabulary-v2";
import {
  buildOwnerApprovedDryRunPlan,
  HYBRID_100_APPROVED_MAPS,
  PHASE_2G2B_BASELINE,
  APPROVED_PROPOSAL_FINGERPRINT,
  APPROVED_SOURCE_SNAPSHOT,
  assertOwnerApprovedDevelopmentTarget,
  makeOwnerAuthorization,
  materializeFinalizedReconciliation,
  materializeOwnerDecisionRows,
  parsePhase2G2BArgs,
  type ProposalSense,
} from "./hybrid-100-owner-reconciliation-dry-run";
import {
  emptySnapshot,
  type ImportArtifacts,
  type Reconciliation,
  type RuntimeSnapshot,
  type RuntimeVocabulary,
} from "./master-vocabulary-v2-import-planner";
import { runMasterVocabularyTransform } from "./transform-master-vocabulary-v2";
import { verifyHybrid100SourceRelease } from "./hybrid-100-development-reconciliation-scan";

const ROOT = process.cwd();
const PROPOSAL_PATH = path.join(ROOT, "vocabflow-dataset/workspaces/hybrid-100-runtime-reconciliation-2.2.1/owner-review/owner-reconciliation-proposal.json");

function safeTarget() {
  const target = getConnectionTarget("development", "runtime");
  return {
    environment: target.environment,
    provider: target.provider,
    projectId: target.projectId,
    branchId: target.branchId,
    databaseName: target.databaseName,
    pooled: target.pooled,
    usage: target.usage,
    identityVersion: target.identityVersion,
    purpose: target.purpose,
    roleName: target.roleName,
  };
}

function runtimeVocabulary(id: number, word: string): RuntimeVocabulary {
  return {
    id,
    word,
    ipa: "/legacy/",
    vietnamese: "nghĩa cũ",
    vietnameseOverride: null,
    definitionEn: "Legacy definition.",
    exampleEn: "A legacy example.",
    imageUrl: `https://example.invalid/${id}.png`,
    imageQuarantined: false,
    audioUrl: `https://example.invalid/${id}.mp3`,
    topic: "Legacy topic",
    level: "GRADE_1",
    enabled: true,
    contentVersion: 1,
  };
}

describe("Phase 2G.2B owner-approved Hybrid-100 dry-run", () => {
  let proposal: { senses: ProposalSense[] };
  let artifacts: ImportArtifacts;
  let decisions: ReturnType<typeof materializeOwnerDecisionRows>;
  let snapshot: RuntimeSnapshot;
  let reconciliation: Reconciliation;
  let plan: ReturnType<typeof buildOwnerApprovedDryRunPlan>;

  beforeAll(() => {
    proposal = JSON.parse(readFileSync(PROPOSAL_PATH, "utf8")) as { senses: ProposalSense[] };
    const transformed = runMasterVocabularyTransform({
      datasetRoot: path.join(ROOT, "vocabflow-dataset/releases/hybrid-100-v2.2.1"),
      mode: "RELEASE",
      writeOutputs: false,
    });
    artifacts = {
      vocabulary: transformed.vocabulary as unknown as ImportArtifacts["vocabulary"],
      topics: transformed.topics as unknown as ImportArtifacts["topics"],
      learningSets: transformed.learningSets as unknown as ImportArtifacts["learningSets"],
      learningSetItems: transformed.learningSetItems as unknown as ImportArtifacts["learningSetItems"],
      topicMemberships: transformed.topicMemberships as unknown as ImportArtifacts["topicMemberships"],
    };
    decisions = materializeOwnerDecisionRows(proposal.senses);
    snapshot = emptySnapshot();
    snapshot.vocabularies.push(
      runtimeVocabulary(1836, "deviate"),
      runtimeVocabulary(1461, "relief"),
      runtimeVocabulary(948, "stand"),
      runtimeVocabulary(284, "reservation"),
      runtimeVocabulary(11, "water"),
    );
    snapshot.vocabularyMappings.push({
      masterSenseId: "01a0fc13-09ef-7d37-a50f-d05db6b1a89c",
      masterLexemeId: "01a0fc13-09ef-7e5d-b757-aa456f0cd969",
      vocabularyId: 284,
      projectionContractVersion: "runtime-vocabulary-projection-v2",
      appliedProjectionFingerprint: "a".repeat(64),
      lastReleaseHash: "b".repeat(64),
    });
    snapshot.progressVocabularyIds.push(11);
    snapshot.reviewVocabularyIds.push(11, 11);
    const plannerFingerprint = canonicalJsonSha256(snapshot);
    const ownerAuthorization = makeOwnerAuthorization({
      proposalFingerprint: APPROVED_PROPOSAL_FINGERPRINT,
      freshScanFingerprints: [APPROVED_SOURCE_SNAPSHOT, APPROVED_SOURCE_SNAPSHOT],
      plannerSnapshotFingerprint: plannerFingerprint,
      snapshotStale: false,
      target: safeTarget(),
    });
    reconciliation = materializeFinalizedReconciliation({
      artifacts,
      decisions,
      ownerAuthorizationFingerprint: String(ownerAuthorization.ownerAuthorizationFingerprint),
      snapshotFingerprint: APPROVED_SOURCE_SNAPSHOT,
      plannerSnapshotFingerprint: plannerFingerprint,
      target: safeTarget(),
    });
    plan = buildOwnerApprovedDryRunPlan({ artifacts, reconciliation, snapshot, targetIdentity: safeTarget() });
  }, 60_000);

  it("pins the reviewed remote baseline and canonical proposal fingerprint", () => {
    const actualProposal = JSON.parse(readFileSync(PROPOSAL_PATH, "utf8")) as unknown;
    expect(PHASE_2G2B_BASELINE).toBe("642e1f80a6c0236771d2c5bc4c93992faa982b28");
    expect(APPROVED_PROPOSAL_FINGERPRINT).toBe("6033cb0d217578aeab7b7e3fb750fda0476c2b880e9958f3865992604b2be6c0");
    expect(canonicalJsonSha256(actualProposal)).toBe(APPROVED_PROPOSAL_FINGERPRINT);
  });

  it("materializes exactly 97 CREATE_NEW and 3 MAP_EXISTING decisions", () => {
    expect(decisions.filter((row) => row.decision === "CREATE_NEW")).toHaveLength(97);
    expect(decisions.filter((row) => row.decision === "MAP_EXISTING")).toHaveLength(3);
  });

  it("leaves no unresolved decisions in the finalized reconciliation", () => {
    expect(decisions.every((row) => row.decision === "CREATE_NEW" || row.decision === "MAP_EXISTING")).toBe(true);
    expect(reconciliation.vocabulary).toHaveLength(100);
    expect(reconciliation.vocabulary.some((row) => row.decision === "UNRESOLVED")).toBe(false);
  });

  it("maps only #1836, #1461 and #948", () => {
    expect(decisions.filter((row) => row.decision === "MAP_EXISTING").map((row) => row.appVocabularyId).sort((a, b) => Number(a) - Number(b)))
      .toEqual([948, 1461, 1836]);
  });

  it("sets UPDATE_TO_MASTER on every approved map", () => {
    expect(decisions.filter((row) => row.decision === "MAP_EXISTING").every((row) => row.firstAdoptionPolicy === "UPDATE_TO_MASTER")).toBe(true);
  });

  it("plans 97 creates and 3 updates without NOOP, SKIP, CONFLICT or BLOCKED actions", () => {
    expect(plan.mode).toBe("DRY_RUN");
    expect(plan.vocabulary.filter((row) => row.action === "CREATE")).toHaveLength(97);
    expect(plan.vocabulary.filter((row) => row.action === "UPDATE")).toHaveLength(3);
    expect(plan.vocabulary.filter((row) => ["NOOP", "SKIP", "CONFLICT", "BLOCKED"].includes(row.action))).toHaveLength(0);
    expect(plan.vocabulary.filter((row) => row.mappingAction === "CREATE_MAPPING")).toHaveLength(100);
    expect(plan.vocabulary.filter((row) => row.mappingAction === "KEEP_MAPPING")).toHaveLength(0);
    expect(plan.summary.newMappings).toBe(100);
    expect(plan.summary.existingMappings).toBe(0);
    expect(plan.eligibility).toMatchObject({ reconciliationComplete: true, canApply: true });
  });

  it("does not preallocate integer IDs for any CREATE_NEW decision", () => {
    expect(decisions.filter((row) => row.decision === "CREATE_NEW").every((row) => row.appVocabularyId === null)).toBe(true);
  });

  it("does not select #944, #1463, #1482, #846, #1796, #1313, #1330 or #1477", () => {
    const selectedIds = decisions.filter((row) => row.decision === "MAP_EXISTING").map((row) => row.appVocabularyId);
    expect(selectedIds).not.toEqual(expect.arrayContaining([944, 1463, 1482, 846, 1796, 1313, 1330, 1477]));
  });

  it("does not select runtime #1260 for any Hybrid light Sense", () => {
    const lightIds = proposal.senses.filter((sense) => sense.lemma === "light").map((sense) => sense.masterSenseId);
    expect(lightIds.length).toBeGreaterThan(0);
    expect(decisions.filter((row) => lightIds.includes(row.masterSenseId)).every((row) => row.decision === "CREATE_NEW")).toBe(true);
    expect(decisions.filter((row) => row.decision === "MAP_EXISTING").some((row) => row.appVocabularyId === 1260)).toBe(false);
  });

  it("leaves #284 mapped to its existing non-Hybrid reservation Sense", () => {
    expect(snapshot.vocabularyMappings.find((row) => row.vocabularyId === 284)?.masterSenseId).toBe("01a0fc13-09ef-7d37-a50f-d05db6b1a89c");
    expect(decisions.some((row) => row.decision === "MAP_EXISTING" && row.appVocabularyId === 284)).toBe(false);
    expect(plan.vocabulary.every((row) => row.appVocabularyId !== 284)).toBe(true);
  });

  it("keeps water verb CREATE_NEW so history remains on #11 and #405 is not reused", () => {
    const waterVerb = proposal.senses.find((sense) => sense.lemma === "water" && /plant/i.test(sense.reviewedMeaning));
    expect(waterVerb).toBeDefined();
    const decision = decisions.find((row) => row.masterSenseId === waterVerb!.masterSenseId);
    expect(decision).toMatchObject({ decision: "CREATE_NEW", appVocabularyId: null });
    expect(snapshot.progressVocabularyIds).toContain(11);
    expect(snapshot.reviewVocabularyIds.filter((id) => id === 11)).toHaveLength(2);
    expect(decisions.some((row) => row.appVocabularyId === 405 || row.appVocabularyId === 11)).toBe(false);
  });

  it("preserves runtime enrichment and does not authorize clearing override or quarantine controls", () => {
    for (const approved of HYBRID_100_APPROVED_MAPS) {
      const action = plan.vocabulary.find((row) => row.masterSenseId === approved.masterSenseId)!;
      const preserve = action.fieldOperations.filter((field) => field.action === "PRESERVE").map((field) => field.field);
      expect(preserve).toEqual(expect.arrayContaining(["ipa", "imageUrl", "audioUrl", "topic", "level"]));
      expect(action.controlOperations.every((control) => control.action === "PRESERVE")).toBe(true);
      expect(reconciliation.vocabulary.find((row) => row.masterSenseId === approved.masterSenseId)).not.toHaveProperty("clearFields");
    }
  });

  it("marks the reconciliation human-reviewed and importer-accepted", () => {
    expect(reconciliation).toMatchObject({
      artifactVersion: "runtime-reconciliation-v3",
      owner: "human-reviewed",
      generatedByTransform: false,
      analysisOnly: false,
      acceptedByImporter: true,
    });
  });

  it("disallows partial import", () => {
    expect(reconciliation.allowPartialImport).toBe(false);
  });

  it("verifies the frozen release identity and leaves its manifest unchanged", () => {
    const manifestPath = path.join(ROOT, "vocabflow-dataset/releases/hybrid-100-v2.2.1/dataset.json");
    const before = readFileSync(manifestPath);
    const source = verifyHybrid100SourceRelease(ROOT);
    const after = readFileSync(manifestPath);
    expect(source.manifest.releaseHash).toBe("44874b11d1fdef76a515f6285d04c9a417318daa6969e112608a59e7c232613c");
    expect(source.releaseTreeFingerprint).toBe("51ab4c5ce31bd38b51742d1aea16602150522da27ad26c123cc17b332f9a406e");
    expect(after.equals(before)).toBe(true);
  }, 60_000);

  it("blocks a changed live snapshot instead of silently rebasing the approved planner pin", () => {
    const changedSnapshot = { ...snapshot, vocabularies: [...snapshot.vocabularies, runtimeVocabulary(999, "changed")] };
    const changedPlan = buildOwnerApprovedDryRunPlan({ artifacts, reconciliation, snapshot: changedSnapshot, targetIdentity: safeTarget() });
    expect(changedPlan.eligibility.canApply).toBe(false);
    expect(changedPlan.issues.map((issue) => issue.code)).toContain("PLANNER_SNAPSHOT_FINGERPRINT_MISMATCH");
  });

  it("hard-fails a Development target mismatch", () => {
    expect(() => assertOwnerApprovedDevelopmentTarget({
      ...getConnectionTarget("development", "runtime"), branchId: "br-other-branch",
    })).toThrow("PHASE_2G2B_DEVELOPMENT_TARGET_MISMATCH");
  });

  it("exposes a DRY_RUN-only entry point that rejects APPLY arguments", () => {
    expect(parsePhase2G2BArgs(["--env-file", "D:/local/.env"]).envFile).toBe(path.resolve("D:/local/.env"));
    expect(() => parsePhase2G2BArgs(["--apply"])).toThrow("PHASE_2G2B_ARGUMENT_INVALID");
    expect(plan.mode).toBe("DRY_RUN");
  });

  it("allocates zero runtime IDs in the generated plan", () => {
    expect(plan.vocabulary.filter((row) => row.action === "CREATE").every((row) => row.appVocabularyId === null)).toBe(true);
  });

  it("contains no database mutation SQL or APPLY adapter in the phase execution path", () => {
    const source = readFileSync(path.join(ROOT, "scripts/hybrid-100-owner-reconciliation-dry-run.ts"), "utf8");
    expect(source).not.toMatch(/\bINSERT\s+INTO\s+(?:"|[a-z_])|\bUPDATE\s+"vocabflow_|\bDELETE\s+FROM\s+"vocabflow_|\bCREATE\s+(?:TABLE|INDEX)\s+"|\bALTER\s+TABLE\s+"|\bDROP\s+TABLE\s+"|\bTRUNCATE\s+TABLE\s+"|\b(?:nextval|setval)\s*\(|\bFOR\s+UPDATE\b/i);
    expect(source).not.toContain("applyMasterVocabularyImport");
    expect(source).toContain("createPostgresMasterImportStore(sql).readSnapshot()");
  });

  it("contains no Production connection or mutation path", () => {
    const source = readFileSync(path.join(ROOT, "scripts/hybrid-100-owner-reconciliation-dry-run.ts"), "utf8");
    expect(source).not.toContain("resolveProductionConnection");
    expect(source).not.toContain("getConnectionTarget(\"production\"");
    expect(source).not.toContain("runAuthorizedProductionMutation");
    expect(source).toContain("getConnectionTarget(\"development\", \"runtime\")");
  });

  it("produces a deterministic canonical reconciliation hash", () => {
    expect(canonicalJsonSha256(reconciliation)).toBe(canonicalJsonSha256(JSON.parse(JSON.stringify(reconciliation))));
  });

  it("produces a deterministic plan fingerprint for an identical snapshot", () => {
    const repeated = buildOwnerApprovedDryRunPlan({ artifacts, reconciliation, snapshot, targetIdentity: safeTarget() });
    expect(repeated.planFingerprint).toBe(plan.planFingerprint);
  });

  it("does not change files under apps/web", () => {
    const changed = execFileSync("git", ["diff", "--name-only", "origin/TXH", "--", "apps/web"], { cwd: ROOT, encoding: "utf8" });
    expect(changed.trim()).toBe("");
  });
});
