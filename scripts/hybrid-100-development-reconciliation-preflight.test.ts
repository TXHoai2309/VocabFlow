import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getConnectionTarget } from "../config/database-targets";
import {
  assessMigrationHistory,
  buildOwnerDecisionTemplate,
  matchesDevelopmentTarget,
  summarizeTranslationStatuses,
} from "./hybrid-100-development-reconciliation-preflight";
import { runMasterVocabularyTransform, loadPinnedMasterProjectionGraph } from "./transform-master-vocabulary-v2";
import { canonicalJsonSha256 } from "./validate-master-vocabulary-v2";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const releaseRoot = path.join(repositoryRoot, "vocabflow-dataset/releases/hybrid-100-v2.2.0");
const expectedReleaseHash = "c82a32a3d7fc3534105b85e14908edd336c2409aa7294d070528a47f6260339d";

describe("Hybrid-100 Development reconciliation preflight", () => {
  it("independently pins the frozen release and exposes the unapproved nested Vietnamese rows", () => {
    const manifest = JSON.parse(readFileSync(path.join(releaseRoot, "dataset.json"), "utf8")) as Record<string, unknown>;
    const { releaseHash, ...payload } = manifest;
    expect(releaseHash).toBe(expectedReleaseHash);
    expect(canonicalJsonSha256(payload)).toBe(expectedReleaseHash);
    expect((manifest.includedSenses as unknown[]).length).toBe(100);

    const graph = loadPinnedMasterProjectionGraph(releaseRoot);
    const summary = summarizeTranslationStatuses(graph.senses);
    expect(summary).toEqual({
      total: 100,
      byStatus: { DRAFT: 98, IN_REVIEW: 2 },
      releaseEligible: 0,
      releaseIneligible: 100,
      ineligibleSenseCount: 100,
    });
    expect(() => runMasterVocabularyTransform({ datasetRoot: releaseRoot, mode: "RELEASE", writeOutputs: false }))
      .toThrow("RELEASE_PROJECTION_INCOMPLETE:100");
    const preview = runMasterVocabularyTransform({ datasetRoot: releaseRoot, mode: "PREVIEW", writeOutputs: false });
    expect(preview.vocabulary.records).toHaveLength(100);
    expect(preview.vocabulary.artifactVersion).toBe("app-import-v3");
    expect(preview.vocabulary.projectionContractVersion).toBe("runtime-vocabulary-projection-v2");
    expect(preview.vocabulary.importEligible).toBe(false);
  });

  it("assesses the entire repository migration chain by its current journal entries and hashes", () => {
    const journal = JSON.parse(readFileSync(path.join(repositoryRoot, "drizzle/migrations/meta/_journal.json"), "utf8")) as { entries: Array<{ idx: number; when: number; tag: string }> };
    const entries = journal.entries.map((entry) => ({ ...entry, when: entry.when + 1000 }));
    const evidence = entries.map((entry) => ({
      tag: entry.tag,
      folderMillis: entry.when,
      worktreeHash: String(entry.idx).padStart(64, "0"),
      lfHash: String(entry.idx).padStart(64, "0"),
      crlfHash: "c".repeat(64),
      crHash: "d".repeat(64),
      acceptedHashes: [String(entry.idx).padStart(64, "0"), "c".repeat(64), "d".repeat(64)],
    }));
    const rows = entries.map((entry, index) => ({ id: index + 1, hash: String(index).padStart(64, "0"), created_at: entry.when }));
    expect(assessMigrationHistory({ entries, evidence, rows, tableExists: true })).toMatchObject({ current: true, localMigrationCount: entries.length, appliedCount: entries.length });
    const lastIndex = entries.length - 1;
    const driftedRows = rows.map((row, index) => index === lastIndex ? { ...row, hash: "f".repeat(64) } : row);
    expect(assessMigrationHistory({ entries, evidence, rows: driftedRows, tableExists: true })).toMatchObject({ current: false, hashMismatches: [{ tag: entries[lastIndex]!.tag }] });
  });

  it("accepts only the configured Development Neon target", () => {
    expect(matchesDevelopmentTarget(getConnectionTarget("development", "migration"))).toBe(true);
    expect(matchesDevelopmentTarget(getConnectionTarget("test", "migration"))).toBe(false);
    expect(matchesDevelopmentTarget(getConnectionTarget("production", "migration"))).toBe(false);
  });

  it("keeps all 100 owner decisions unresolved and allocates no runtime identity", () => {
    const senses = Array.from({ length: 100 }, (_, index) => ({ masterSenseId: `sense-${index}`, masterLexemeId: `lexeme-${index}` }));
    const template = buildOwnerDecisionTemplate(senses);
    expect(template.decisions).toHaveLength(100);
    expect(template.decisions.every((row) => row.ownerDecision === "UNRESOLVED" && row.appVocabularyId === null
      && row.firstAdoptionPolicy === null && row.clearFields.length === 0
      && typeof row.masterLexemeId === "string")).toBe(true);
    expect(template.ownerReviewed).toBe(false);
    expect(template.acceptedByImporter).toBe(false);
  });
});
