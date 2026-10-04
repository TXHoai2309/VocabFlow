import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { v7 as uuidv7 } from "uuid";
import {
  assertIdentityMath,
  auditAuthoredText,
  createIdentityRegistry,
  isUuid7Canonical,
  maxContiguousTokenOverlap,
  protectedFileSnapshot,
  senseOrders,
  validateMaterializedWorkspace,
} from "./hybrid-100-editorial-draft";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonObject = Record<string, any>;
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WORKSPACE = path.join(REPO_ROOT, "vocabflow-dataset", "workspaces", "hybrid-100-editorial-draft");

function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

function filesBelow(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? filesBelow(fullPath) : [fullPath];
  });
}

describe("hybrid 100 editorial draft workspace", () => {
  const candidateRows = readJson<{ candidates: JsonObject[] }>(path.join(REPO_ROOT, "vocabflow-dataset/workspaces/hybrid-100-sense-proof/candidates.json")).candidates;
  const decisionPackage = readJson<JsonObject>(path.join(WORKSPACE, "editorial-decisions.json"));
  const decisions: JsonObject[] = decisionPackage.decisions;

  it("generates lowercase canonical RFC UUIDv7 values with the RFC variant", () => {
    const id = uuidv7();
    expect(isUuid7Canonical(id)).toBe(true);
    expect(id[14]).toBe("7");
    expect("89ab").toContain(id[19]);
  });

  it("recomputes the pinned 100-candidate identity split and expected ID counts", () => {
    expect(assertIdentityMath(candidateRows, decisions)).toEqual({
      totalCandidates: 100,
      reuseExistingSense: 2,
      newSenseExistingLexeme: 3,
      newSenseNewLexeme: 95,
      newMasterSenseIds: 98,
      uniqueNewLexemeIdentities: 84,
    });
    expect(filesBelow(path.join(WORKSPACE, "master/lexemes"))).toHaveLength(84);
    expect(filesBelow(path.join(WORKSPACE, "master/senses"))).toHaveLength(98);
  });

  it("reuses the two reviewed canonical Senses without allocating child IDs", () => {
    const registry = readJson<JsonObject>(path.join(WORKSPACE, "identity-registry.json"));
    const reused = decisions.filter((decision) => decision.identityDecision === "REUSE_EXISTING_SENSE");
    expect(reused).toHaveLength(2);
    expect(reused.map((decision) => registry.candidateIdToMasterSenseId[decision.candidateId]).sort()).toEqual([
      "01a0fc13-09ee-7768-9be6-d20fa32521ee",
      "01a0fc13-09ef-75ac-b815-039ab337c01a",
    ].sort());
    for (const decision of reused) {
      expect(registry.candidateIdToTranslationId[decision.candidateId]).toBeUndefined();
      expect(registry.candidateIdToDefinitionId[decision.candidateId]).toBeUndefined();
      expect(registry.candidateIdToExampleId[decision.candidateId]).toBeUndefined();
      expect(registry.candidateIdToExampleTranslationId[decision.candidateId]).toBeUndefined();
    }
  });

  it("keeps new Senses on existing Lexemes and groups sibling candidates under one Lexeme ID", () => {
    const registry = readJson<JsonObject>(path.join(WORKSPACE, "identity-registry.json"));
    const light = decisions.filter((decision) => decision.displayLemma === "light");
    expect(new Set(light.map((decision) => registry.lexemeCandidateIdToMasterLexemeId[decision.lexemeCandidateId]))).toEqual(
      new Set(["01a0fc13-09ee-7fd1-8ad8-a2026a7620e0"]),
    );
    expect(light.filter((decision) => decision.identityDecision === "NEW_SENSE_EXISTING_LEXEME")).toHaveLength(2);
    const rotate = decisions.filter((decision) => decision.displayLemma === "rotate");
    expect(rotate).toHaveLength(2);
    expect(new Set(rotate.map((decision) => registry.lexemeCandidateIdToMasterLexemeId[decision.lexemeCandidateId])).size).toBe(1);
  });

  it("preserves the registry after an authored-text edit and allocates no rerun IDs", () => {
    const registry = readJson<JsonObject>(path.join(WORKSPACE, "identity-registry.json"));
    const edited = JSON.parse(JSON.stringify(decisions)) as JsonObject[];
    edited[0].content.definition.text += " This additional sentence remains a draft.";
    const rerun = createIdentityRegistry(REPO_ROOT, edited, registry, () => {
      throw new Error("A rerun attempted to generate an ID.");
    });
    expect(rerun.allocatedCount).toBe(0);
    expect(rerun.registry).toEqual(registry);
    expect(readJson<JsonObject>(path.join(WORKSPACE, "validation-summary.json")).newUuidsAllocatedOnRerun).toBe(0);
  });

  it("keeps Sense order stable and appends new Senses after existing canonical orders", () => {
    const first = senseOrders(REPO_ROOT, decisions);
    const second = senseOrders(REPO_ROOT, decisions);
    expect(second).toEqual(first);
    const light = decisions.filter((decision) => decision.displayLemma === "light"
      && decision.identityDecision === "NEW_SENSE_EXISTING_LEXEME").sort((left, right) => left.semanticGroupOrder - right.semanticGroupOrder);
    expect(light.map((decision) => first[decision.candidateId])).toEqual([3, 4]);
    const reservation = decisions.find((decision) => decision.displayLemma === "reservation");
    expect(first[reservation!.candidateId]).toBe(2);
  });

  it("rejects exact source definitions, exact examples, and contiguous overlaps of eight tokens", () => {
    const exactDefinition = auditAuthoredText("A learner friendly definition with a clear meaning.", ["A learner friendly definition with a clear meaning."], "en");
    const exactExample = auditAuthoredText("We carried the boxes into the quiet room.", ["We carried the boxes into the quiet room."], "en");
    const longOverlap = auditAuthoredText("This sentence uses eight shared tokens in one exact contiguous sequence.", ["This sentence uses eight shared tokens in one exact contiguous sequence today."], "en");
    expect(exactDefinition.rejected).toBe(true);
    expect(exactExample.rejected).toBe(true);
    expect(maxContiguousTokenOverlap("This sentence uses eight shared tokens in one exact contiguous sequence.", "This sentence uses eight shared tokens in one exact contiguous sequence today.")).toBeGreaterThanOrEqual(8);
    expect(longOverlap.rejected).toBe(true);
  });

  it("allows a short conventional Vietnamese equivalent", () => {
    const result = auditAuthoredText("khối u", ["khối u là một khối tế bào phát triển bất thường"], "vi");
    expect(result.shortVietnameseEquivalentAllowed).toBe(true);
    expect(result.rejected).toBe(false);
  });

  it("passes workspace schema, status, media, URL, and canonical-boundary validation", () => {
    expect(validateMaterializedWorkspace(REPO_ROOT).status).toBe("PASS");
    const manifest = readJson<JsonObject>(path.join(WORKSPACE, "manifest.json"));
    expect(protectedFileSnapshot(REPO_ROOT)).toEqual(manifest.canonicalBefore.files);
    expect(manifest.canonicalAfter.changed).toBe(false);
    const records = filesBelow(WORKSPACE).filter((file) => /master[\\/]senses[\\/].+\.json$/.test(file)).map((file) => readJson<JsonObject>(file));
    expect(records.every((record) => record.status === "DRAFT")).toBe(true);
    expect(records.every((record) => record.examples[0].audioAssetIds.length === 0)).toBe(true);
    expect(records.every((record) => !("classifications" in record) && !("mediaAssets" in record))).toBe(true);
    expect(filesBelow(WORKSPACE).some((file) => /classifications|mediaassets|provenance/i.test(path.basename(file)))).toBe(false);
    const trackedContent = filesBelow(WORKSPACE).map((file) => readFileSync(file, "utf8")).join("\n");
    expect(trackedContent).not.toMatch(/https?:\/\//i);
    expect(trackedContent).not.toMatch(/\b[A-Z]:\\/i);
  });

  it("records a repeatable draft fingerprint with zero rerun allocations", () => {
    const manifest = readJson<JsonObject>(path.join(WORKSPACE, "manifest.json"));
    const summary = readJson<JsonObject>(path.join(WORKSPACE, "validation-summary.json"));
    expect(manifest.draftPackageFingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(summary.rerunFingerprintIdentical).toBe(true);
    expect(summary.newUuidsAllocatedOnRerun).toBe(0);
  });
});
