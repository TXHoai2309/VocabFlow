import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { canonicalHash } from "./hybrid-100-canonical-promote";
import {
  AUTHORIZED_BASELINE,
  buildSenseLifecycleRevision,
  EXECUTION_BASELINE,
  EXPECTED_CEFR,
  FIRST_EXECUTION_BASELINE,
  gitPackageTreeFingerprint,
  REMOTE_ADVANCE_COMMITS,
  RELEASE_RELATIVE,
  SEMANTIC_DRAFT_FINGERPRINT,
  SOURCE_RELEASE_HASH,
  SOURCE_RELEASE_TREE,
  TARGET_RELEASE_HASH_ALGORITHM,
  TARGET_RELEASE_RELATIVE,
  main,
  verifyMaterializedRelease,
} from "./hybrid-100-runtime-eligible-patch-release";
import { buildAppImportV2, loadPinnedMasterProjectionGraph } from "./transform-master-vocabulary-v2";
import { validateMasterVocabularyV2 } from "./validate-master-vocabulary-v2";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dataset rows are JSON-schema driven.
type JsonObject = Record<string, any>;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATASET = path.join(ROOT, "vocabflow-dataset");
const SOURCE_DIR = path.join(ROOT, ...RELEASE_RELATIVE.split("/"));
const RELEASE_DIR = path.join(ROOT, ...TARGET_RELEASE_RELATIVE.split("/"));
const WORKSPACE = path.join(DATASET, "workspaces", "hybrid-100-runtime-eligibility-closure");
const materialized = existsSync(RELEASE_DIR);
const PUBLISH_BASELINE = "93c79463d7fde531d68d02b5b8a2bfcfd878af18";

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(file, "utf8")) as T;
}

function filesystemPackageTreeFingerprint(packageRoot: string): string {
  const files: string[] = [];
  const visit = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, "en"))) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(file);
      else if (entry.isFile()) files.push(file);
    }
  };
  visit(packageRoot);
  const entries = files
    .map((file) => {
      const content = readFileSync(file);
      const gitContent = content.includes(0) ? content : Buffer.from(content.toString("utf8").replace(/\r\n/g, "\n"), "utf8");
      return {
        path: path.relative(packageRoot, file).split(path.sep).join("/"),
        sha256: createHash("sha256").update(gitContent).digest("hex"),
      };
    })
    .filter((entry) => entry.path !== "reports/release-approval-evidence.json")
    .sort((a, b) => a.path.localeCompare(b.path, "en"));
  return canonicalHash(entries);
}

function rows(value: unknown): JsonObject[] {
  return Array.isArray(value) ? value.filter((row): row is JsonObject => Boolean(row) && typeof row === "object" && !Array.isArray(row)) : [];
}

function withoutReleaseHash(manifest: JsonObject): JsonObject {
  return Object.fromEntries(Object.entries(manifest).filter(([key]) => key !== "releaseHash"));
}

function withoutLifecycleFields(value: unknown, root = true): unknown {
  if (Array.isArray(value)) return value.map((item) => withoutLifecycleFields(item, false));
  if (!value || typeof value !== "object") return value;
  const result: JsonObject = {};
  for (const [key, item] of Object.entries(value)) {
    if (key === "status" || (root && ["senseRevision", "updatedAt"].includes(key))) continue;
    result[key] = withoutLifecycleFields(item, false);
  }
  return result;
}

function allChildRows(sense: JsonObject): Array<{ type: string; id: string; row: JsonObject; owner: string }> {
  return [
    ...rows(sense.translations).map((row) => ({ type: "TRANSLATION", id: String(row.translationId), row, owner: String(row.masterSenseId) })),
    ...rows(sense.definitions).map((row) => ({ type: "DEFINITION", id: String(row.definitionId), row, owner: String(row.masterSenseId) })),
    ...rows(sense.examples).flatMap((row) => [
      { type: "EXAMPLE", id: String(row.exampleId), row, owner: String(row.masterSenseId) },
      ...rows(row.exampleTranslations).map((translation) => ({ type: "EXAMPLE_TRANSLATION", id: String(translation.exampleTranslationId), row: translation, owner: String(translation.exampleId) })),
    ]),
  ];
}

function readSense(manifest: JsonObject, base: string, id: string): { pin: JsonObject; record: JsonObject } {
  const pin = rows(manifest.includedSenses).find((row) => row.masterSenseId === id);
  if (!pin) throw new Error(`MISSING_SENSE_PIN:${id}`);
  return { pin, record: readJson<JsonObject>(path.join(base, ...String(pin.recordPath).split("/"))) };
}

function cefrDistribution(manifest: JsonObject): JsonObject {
  const counts: JsonObject = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, UNCLASSIFIED: 0 };
  const classes = rows(manifest.includedClassifications).map((pin) => readJson<JsonObject>(path.join(DATASET, ...String(pin.recordPath).split("/"))));
  const bySense = new Map(classes.filter((row) => row.dimension === "CEFR").map((row) => [String(row.masterSenseId), row.valueCode]));
  for (const pin of rows(manifest.includedSenses)) {
    const level = String(bySense.get(String(pin.masterSenseId)) ?? "UNCLASSIFIED");
    counts[level] = (counts[level] ?? 0) + 1;
  }
  return counts;
}

function runCheck(): JsonObject {
  const output = vi.spyOn(console, "log").mockImplementation(() => undefined);
  try {
    return main(["--check"], ROOT);
  } finally {
    output.mockRestore();
  }
}

describe("Phase 2G.1B runtime-eligible patch release", () => {
  it("applies only lifecycle status transitions in a fixture Sense revision", () => {
    const predecessor: JsonObject = {
      masterSenseId: "sense-fixture",
      masterLexemeId: "lexeme-fixture",
      senseRevision: 2,
      status: "APPROVED",
      createdAt: "2026-10-01T00:00:00Z",
      updatedAt: "2026-10-01T00:00:00Z",
      translations: [{ translationId: "translation-fixture", masterSenseId: "sense-fixture", language: "vi", text: "mẫu", translationKind: "EQUIVALENT", isPreferred: true, displayOrder: 0, provenanceIds: ["prov-t"], status: "IN_REVIEW" }],
      definitions: [{ definitionId: "definition-fixture", masterSenseId: "sense-fixture", language: "en", text: "A fixture.", definitionKind: "LEARNER_FRIENDLY", displayOrder: 0, provenanceIds: ["prov-d"], status: "DRAFT" }],
      examples: [{ exampleId: "example-fixture", masterSenseId: "sense-fixture", language: "en", text: "A fixture sentence.", register: "NEUTRAL", displayOrder: 0, exampleTranslations: [{ exampleTranslationId: "translation-example-fixture", exampleId: "example-fixture", language: "vi", text: "Câu mẫu.", isPreferred: true, displayOrder: 0, provenanceIds: ["prov-et"], status: "DRAFT" }], audioAssetIds: [], provenanceIds: ["prov-e"], status: "IN_REVIEW" }],
      pronunciationOverrides: [],
      provenanceIds: ["prov-s"],
    };
    const transitions = [
      { entityType: "TRANSLATION", childId: "translation-fixture", from: "IN_REVIEW", to: "APPROVED" },
      { entityType: "DEFINITION", childId: "definition-fixture", from: "DRAFT", to: "APPROVED" },
      { entityType: "EXAMPLE", childId: "example-fixture", from: "IN_REVIEW", to: "APPROVED" },
      { entityType: "EXAMPLE_TRANSLATION", childId: "translation-example-fixture", from: "DRAFT", to: "APPROVED" },
    ];
    const next = buildSenseLifecycleRevision(predecessor, 3, "2026-10-06T01:02:03.000Z", transitions);
    expect(next.masterSenseId).toBe(predecessor.masterSenseId);
    expect(next.masterLexemeId).toBe(predecessor.masterLexemeId);
    expect(next.status).toBe("APPROVED");
    expect(next.senseRevision).toBe(3);
    expect(next.createdAt).toBe(predecessor.createdAt);
    expect(next.updatedAt).toBe("2026-10-06T01:02:03.000Z");
    expect(withoutLifecycleFields(next)).toEqual(withoutLifecycleFields(predecessor));
    const childRows = allChildRows(next).map(({ id, owner, row }) => [id, owner, row.status]).sort((a, b) => String(a[0]).localeCompare(String(b[0])));
    expect(childRows).toEqual([
      ["definition-fixture", "sense-fixture", "APPROVED"],
      ["example-fixture", "sense-fixture", "APPROVED"],
      ["translation-example-fixture", "example-fixture", "APPROVED"],
      ["translation-fixture", "sense-fixture", "APPROVED"],
    ].sort((a, b) => String(a[0]).localeCompare(String(b[0]))));
    expect(() => buildSenseLifecycleRevision(predecessor, 4, "2026-10-06T01:02:03.000Z", transitions)).toThrow("SENSE_REVISION_NOT_NEXT");
  });

  it("keeps the materialization and publish baselines separate while retaining the owner authorization source", () => {
    const headHistory = execFileSync("git", ["rev-list", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim().split(/\r?\n/);
    const publishParent = execFileSync("git", ["rev-parse", `${PUBLISH_BASELINE}^`], { cwd: ROOT, encoding: "utf8" }).trim();
    const firstExecutionParent = execFileSync("git", ["rev-parse", `${FIRST_EXECUTION_BASELINE}^`], { cwd: ROOT, encoding: "utf8" }).trim();
    const currentCommitFiles = execFileSync("git", ["diff-tree", "--no-commit-id", "--name-only", "-r", `${EXECUTION_BASELINE}^`, EXECUTION_BASELINE], { cwd: ROOT, encoding: "utf8" })
      .trim().split(/\r?\n/).filter(Boolean).sort();
    const publishCommitFiles = execFileSync("git", ["diff-tree", "--no-commit-id", "--name-only", "-r", `${PUBLISH_BASELINE}^`, PUBLISH_BASELINE], { cwd: ROOT, encoding: "utf8" })
      .trim().split(/\r?\n/).filter(Boolean).sort();
    const historical = readJson<JsonObject>(path.join(WORKSPACE, "manifest.json"));
    const audit = readJson<JsonObject>(path.join(WORKSPACE, "validation-summary.json"));
    expect(headHistory).toContain(PUBLISH_BASELINE);
    expect(publishParent).toBe(EXECUTION_BASELINE);
    expect(firstExecutionParent).toBe(AUTHORIZED_BASELINE);
    expect(execFileSync("git", ["show", "-s", "--format=%s", FIRST_EXECUTION_BASELINE], { cwd: ROOT, encoding: "utf8" }).trim()).toBe("feat: standardize async states");
    expect(execFileSync("git", ["show", "-s", "--format=%s", EXECUTION_BASELINE], { cwd: ROOT, encoding: "utf8" }).trim()).toBe("fix: add clear search empty action");
    expect(execFileSync("git", ["show", "-s", "--format=%s", PUBLISH_BASELINE], { cwd: ROOT, encoding: "utf8" }).trim()).toBe("fix: persist active learner selection");
    expect(currentCommitFiles).toEqual([
      "apps/web/src/features/search/global-search-palette.tsx",
      "apps/web/src/features/search/global-search.test.tsx",
    ].sort());
    expect(publishCommitFiles).toEqual([
      "apps/web/src/App.test.tsx",
      "apps/web/src/App.tsx",
      "apps/web/src/features/learners/learner-context-provider.test.tsx",
      "apps/web/src/features/learners/learner-context-provider.tsx",
      "apps/web/src/features/learners/learner-context.ts",
      "apps/web/src/features/learners/learner-page.test.tsx",
      "apps/web/src/features/learners/learner-page.tsx",
    ].sort());
    expect(execFileSync("git", ["rev-parse", `${AUTHORIZED_BASELINE}:vocabflow-dataset`], { cwd: ROOT, encoding: "utf8" }).trim())
      .toBe(execFileSync("git", ["rev-parse", `${EXECUTION_BASELINE}:vocabflow-dataset`], { cwd: ROOT, encoding: "utf8" }).trim());
    expect(execFileSync("git", ["rev-parse", `${EXECUTION_BASELINE}:vocabflow-dataset`], { cwd: ROOT, encoding: "utf8" }).trim())
      .toBe(execFileSync("git", ["rev-parse", `${PUBLISH_BASELINE}:vocabflow-dataset`], { cwd: ROOT, encoding: "utf8" }).trim());
    expect(historical.authorization.nestedChildApprovalAuthorized).toBe(false);
    expect(audit.phase2G1AReady).toBe(true);
    expect(audit.runtimeEligibilityClosureTechnicallyReady).toBe(true);
    expect(audit.semanticDraftFingerprint).toMatchObject({ expected: SEMANTIC_DRAFT_FINGERPRINT, computed: SEMANTIC_DRAFT_FINGERPRINT, verified: true });
  });

  it("verifies source release hash/tree and all exact child/Sense plans before apply", () => {
    const sourceManifest = readJson<JsonObject>(path.join(SOURCE_DIR, "dataset.json"));
    const trace = readJson<JsonObject>(path.join(WORKSPACE, "owner-review-trace.json"));
    const plan = readJson<JsonObject>(path.join(WORKSPACE, "sense-revision-plan.json"));
    const validation = readJson<JsonObject>(path.join(WORKSPACE, "validation-summary.json"));
    expect(sourceManifest).toMatchObject({ datasetVersion: "2.2.0", schemaVersion: "2.0.1", status: "APPROVED", releaseHash: SOURCE_RELEASE_HASH });
    expect(canonicalHash(withoutReleaseHash(sourceManifest))).toBe(SOURCE_RELEASE_HASH);
    expect(gitPackageTreeFingerprint(ROOT, "HEAD", RELEASE_RELATIVE)).toBe(SOURCE_RELEASE_TREE);
    expect(gitPackageTreeFingerprint(ROOT, "origin/TXH", RELEASE_RELATIVE)).toBe(SOURCE_RELEASE_TREE);
    expect(validation.lifecycleTrace).toMatchObject({ childRowsTraced: 400, childRowsPassed: 400, childRowsBlocked: 0, provenanceReferencesValidated: 400 });
    expect(plan.revisions).toHaveLength(100);
    expect(trace.senses).toHaveLength(100);
    expect(rows(trace.senses).flatMap((sense) => rows(sense.childRows))).toHaveLength(400);
    expect(trace.summary.childRowsByType).toEqual({ TRANSLATION: 100, DEFINITION: 100, EXAMPLE: 100, EXAMPLE_TRANSLATION: 100 });
    const childIds = rows(trace.senses).flatMap((sense) => rows(sense.childRows).map((child) => `${child.entityType}:${child.childId}`));
    expect(new Set(childIds).size).toBe(400);
    const check = runCheck();
    expect(check.status).toBe(materialized ? "NOOP_ALREADY_MATERIALIZED_AND_FROZEN" : "PLAN_READY");
    if (!materialized) {
      expect(check).toMatchObject({
        writesPerformed: false,
        ownerAuthorizationContentBaseline: AUTHORIZED_BASELINE,
        firstExecutionBaseline: FIRST_EXECUTION_BASELINE,
        currentExecutionBaseline: EXECUTION_BASELINE,
        remoteAdvanceCommits: REMOTE_ADVANCE_COMMITS,
        executionBaseline: EXECUTION_BASELINE,
        remoteAdvanceClassification: "UNRELATED_APP_UI_CHANGE",
        authorizedDatasetStateUnchanged: true,
        auditedNestedRows: 400,
        plannedSenseRevisions: 100,
        newEntityIds: 0,
        newProvenanceIds: 0,
        databaseConnection: "NONE",
        databaseWrites: "NONE",
      });
    }
  }, 120_000);

  it("does not materialize targets during CHECK; detects the complete result only after apply", () => {
    const plan = readJson<JsonObject>(path.join(WORKSPACE, "sense-revision-plan.json"));
    const targetFiles = rows(plan.revisions).map((row) => path.join(DATASET, "master", "senses", `${row.masterSenseId}-r${row.plannedSenseRevision}.json`));
    if (materialized) {
      expect(targetFiles.every((file) => existsSync(file))).toBe(true);
      expect(verifyMaterializedRelease(ROOT)).toMatchObject({ status: "NOOP_ALREADY_MATERIALIZED_AND_FROZEN", senseRevisions: 100, childRowsApproved: 400 });
    } else {
      expect(existsSync(RELEASE_DIR)).toBe(false);
      expect(targetFiles.filter((file) => existsSync(file))).toHaveLength(0);
      expect(existsSync(path.join(WORKSPACE, "materialization-authorization.json"))).toBe(false);
      expect(existsSync(path.join(WORKSPACE, "materialization-plan.json"))).toBe(false);
    }
  }, 120_000);

  if (materialized) {
    it("preserves Sense and child identities and permits only lifecycle/status/timestamp changes", () => {
      const sourceManifest = readJson<JsonObject>(path.join(SOURCE_DIR, "dataset.json"));
      const releaseManifest = readJson<JsonObject>(path.join(RELEASE_DIR, "dataset.json"));
      const plan = readJson<JsonObject>(path.join(WORKSPACE, "sense-revision-plan.json"));
      const materializationPlan = readJson<JsonObject>(path.join(WORKSPACE, "materialization-plan.json"));
      const sourceIds = new Set(rows(sourceManifest.includedSenses).map((pin) => String(pin.masterSenseId)));
      const allIds = new Set<string>();
      const typeCounts: JsonObject = {};
      for (const revision of rows(plan.revisions)) {
        const id = String(revision.masterSenseId);
        expect(sourceIds.has(id)).toBe(true);
        const before = readSense(sourceManifest, SOURCE_DIR, id).record;
        const after = readSense(releaseManifest, RELEASE_DIR, id).record;
        expect(after.senseRevision).toBe(before.senseRevision + 1);
        expect(after.masterSenseId).toBe(before.masterSenseId);
        expect(after.masterLexemeId).toBe(before.masterLexemeId);
        expect(after.createdAt).toBe(before.createdAt);
        expect(after.status).toBe("APPROVED");
        expect(after.provenanceIds).toEqual(before.provenanceIds);
        expect(after.pronunciationOverrides).toEqual(before.pronunciationOverrides);
        expect(withoutLifecycleFields(after)).toEqual(withoutLifecycleFields(before));
        expect(after.updatedAt).toBe(materializationPlan.releasedAt);
        const beforeChildren = allChildRows(before);
        const afterChildren = allChildRows(after);
        expect(afterChildren).toHaveLength(4);
        expect(afterChildren.map(({ type, id: childId, owner }) => [type, childId, owner]).sort()).toEqual(beforeChildren.map(({ type, id: childId, owner }) => [type, childId, owner]).sort());
        for (const child of afterChildren) {
          const key = `${child.type}:${child.id}`;
          expect(allIds.has(key)).toBe(false);
          allIds.add(key);
          expect(child.row.status).toBe("APPROVED");
          const predecessor = beforeChildren.find((prior) => prior.type === child.type && prior.id === child.id);
          if (!predecessor) throw new Error(`MISSING_PREDECESSOR_CHILD:${key}`);
          expect(withoutLifecycleFields(child.row)).toEqual(withoutLifecycleFields(predecessor.row));
          typeCounts[child.type] = (typeCounts[child.type] ?? 0) + 1;
        }
      }
      expect(allIds.size).toBe(400);
      expect(typeCounts).toEqual({ TRANSLATION: 100, DEFINITION: 100, EXAMPLE: 100, EXAMPLE_TRANSLATION: 100 });
    });

    it("preserves the canonical root and publishes the exact 2.2.1 release cohort", () => {
      const rootManifest = readJson<JsonObject>(path.join(DATASET, "dataset.json"));
      const sourceManifest = readJson<JsonObject>(path.join(SOURCE_DIR, "dataset.json"));
      const releaseManifest = readJson<JsonObject>(path.join(RELEASE_DIR, "dataset.json"));
      expect(rootManifest).toMatchObject({ datasetVersion: "2.0.0", schemaVersion: "2.0.1", status: "DRAFT" });
      expect(rootManifest.releaseHash).toBeUndefined();
      expect({ lexemes: rootManifest.includedLexemes.length, senses: rootManifest.includedSenses.length, classifications: rootManifest.includedClassifications.length, provenance: rootManifest.includedProvenance.length })
        .toEqual({ lexemes: 103, senses: 123, classifications: 219, provenance: 1043 });
      expect(releaseManifest).toMatchObject({ datasetVersion: "2.2.1", schemaVersion: "2.0.1", status: "APPROVED", releaseHashAlgorithm: TARGET_RELEASE_HASH_ALGORITHM });
      expect({ lexemes: releaseManifest.includedLexemes.length, senses: releaseManifest.includedSenses.length, classifications: releaseManifest.includedClassifications.length, provenance: releaseManifest.includedProvenance.length, taxonomy: releaseManifest.includedTaxonomySnapshots.length, media: releaseManifest.includedMediaAssets.length, mediaVersions: releaseManifest.includedMediaAssetVersions.length, learningSets: releaseManifest.includedLearningSets.length, relations: releaseManifest.includedRelations.length })
        .toEqual({ lexemes: 87, senses: 100, classifications: 99, provenance: 799, taxonomy: 1, media: 0, mediaVersions: 0, learningSets: 0, relations: 0 });
      for (const key of ["includedLexemes", "includedClassifications", "includedProvenance", "includedTaxonomySnapshots", "includedMediaAssets", "includedMediaAssetVersions", "includedLearningSets", "includedRelations"]) {
        expect(releaseManifest[key] ?? []).toEqual(sourceManifest[key] ?? []);
      }
      expect(cefrDistribution(releaseManifest)).toEqual(EXPECTED_CEFR);
    });

    it("validates release and canonical root, then matches all audited RELEASE projection fingerprints", () => {
      const releaseManifest = readJson<JsonObject>(path.join(RELEASE_DIR, "dataset.json"));
      const releaseValidation = validateMasterVocabularyV2({ datasetRoot: RELEASE_DIR, schemaRoot: path.join(RELEASE_DIR, "schemas"), writeReport: false, validatedAt: releaseManifest.releasedAt });
      const canonicalValidation = validateMasterVocabularyV2({ datasetRoot: DATASET, schemaRoot: path.join(DATASET, "schemas"), writeReport: false, validatedAt: releaseManifest.releasedAt });
      expect(releaseValidation).toMatchObject({ status: "PASS", errorCount: 0, warningCount: 0, infoCount: 0 });
      expect(canonicalValidation).toMatchObject({ status: "PASS", errorCount: 0, warningCount: 0, infoCount: 1 });
      const artifact = buildAppImportV2(loadPinnedMasterProjectionGraph(RELEASE_DIR), "RELEASE");
      const simulated = readJson<JsonObject>(path.join(WORKSPACE, "runtime-projection-simulation.json"));
      const actualRows = rows(artifact.vocabulary.records);
      expect(actualRows).toHaveLength(100);
      expect(simulated.projectedSenses).toBe(100);
      expect(simulated.skippedSenses).toBe(0);
      expect(simulated.importEligible).toBe(true);
      expect(artifact.report).toContain("- importEligible: true");
      expect(actualRows.filter((row) => row.runtimeProjection.vietnamese !== null)).toHaveLength(100);
      expect(actualRows.filter((row) => row.runtimeProjection.definitionEn !== null)).toHaveLength(100);
      expect(actualRows.filter((row) => row.runtimeProjection.exampleEn !== null)).toHaveLength(100);
      expect(actualRows.filter((row) => row.runtimeProjection.ipa !== null)).toHaveLength(0);
      for (const expected of rows(simulated.perSense)) {
        const actual = actualRows.find((row) => row.masterSenseId === expected.masterSenseId);
        if (!actual) throw new Error(`RUNTIME_SENSE_NOT_PROJECTED:${String(expected.masterSenseId)}`);
        expect(actual.masterProjectionFingerprint).toBe(expected.projectionFingerprint);
        expect(actual.runtimeProjection.enabled).toBe(true);
        expect(actual.runtimeProjection.imageUrl).toBeNull();
        expect(actual.runtimeProjection.audioUrl).toBeNull();
      }
    }, 120_000);

    it("independently recomputes frozen release hash/tree and CHECK confirms the frozen NOOP", () => {
      const manifest = readJson<JsonObject>(path.join(RELEASE_DIR, "dataset.json"));
      const plan = readJson<JsonObject>(path.join(WORKSPACE, "materialization-plan.json"));
      const auth = readJson<JsonObject>(path.join(WORKSPACE, "materialization-authorization.json"));
      const evidence = readJson<JsonObject>(path.join(RELEASE_DIR, "reports", "release-approval-evidence.json"));
      expect(canonicalHash(withoutReleaseHash(manifest))).toBe(manifest.releaseHash);
      expect(filesystemPackageTreeFingerprint(RELEASE_DIR)).toBe(plan.releaseTreeFingerprint);
      expect(evidence.releaseTreeFingerprint).toBe(plan.releaseTreeFingerprint);
      expect(manifest.releasedAt).toBe(plan.releasedAt);
      expect(auth).toMatchObject({ ownerAuthorizationContentBaseline: AUTHORIZED_BASELINE, firstExecutionBaseline: FIRST_EXECUTION_BASELINE, currentExecutionBaseline: EXECUTION_BASELINE, remoteAdvanceCommits: REMOTE_ADVANCE_COMMITS, executionBaseline: EXECUTION_BASELINE, remoteAdvanceClassification: "UNRELATED_APP_UI_CHANGE", authorizedDatasetStateUnchanged: true, runtimeImportAuthorized: false, databaseWriteAuthorized: false });
      expect(evidence).toMatchObject({ sourceReleaseHash: SOURCE_RELEASE_HASH, semanticDraftFingerprint: SEMANTIC_DRAFT_FINGERPRINT, nestedRowsPromoted: 400, senseRevisionsCreated: 100, newEntityIds: 0, newProvenanceIds: 0, runtimeReleaseProjectionReady: true, runtimeImportExecuted: false, databaseWrites: "NONE", productionMutation: false });
      const output = vi.spyOn(console, "log").mockImplementation(() => undefined);
      try {
        expect(main(["--check"], ROOT)).toMatchObject({ status: "NOOP_ALREADY_MATERIALIZED_AND_FROZEN", writesPerformed: false, releaseHash: manifest.releaseHash, releasedAt: manifest.releasedAt });
      } finally {
        output.mockRestore();
      }
    }, 120_000);
  }
});
