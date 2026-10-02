import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { buildMasterVocabularyV2CanaryArtifacts } from "./master-vocabulary-v2-canary-preparation";
import { prepareMasterVocabularyV2CanaryRelease } from "./master-vocabulary-v2-canary-release-builder";

const repositoryRoot = process.cwd();
const datasetRoot = join(repositoryRoot, "vocabflow-dataset");
const temporaryRoots: string[] = [];
type UnknownRecord = Record<string, unknown>;
type OwnerApprovalTest = {
  releaseApproval: UnknownRecord;
  senseReviews: UnknownRecord[];
  lexemeReviews: UnknownRecord[];
  learningSetReviews: UnknownRecord[];
};

function temporaryDirectory(): string {
  const root = mkdtempSync(join(tmpdir(), "vocabflow-canary-2d2-"));
  temporaryRoots.push(root);
  return root;
}

function readTemplate(): OwnerApprovalTest {
  return JSON.parse(buildMasterVocabularyV2CanaryArtifacts(datasetRoot).ownerApprovalTemplateJson) as OwnerApprovalTest;
}

function explicitlyApproveEveryField(approval: OwnerApprovalTest): void {
  const timestamp = "2026-10-02T12:00:00Z";
  approval.releaseApproval = { decision: "APPROVE", reviewer: "Synthetic test owner", reviewedAt: timestamp, notes: "Synthetic fixture only." };
  for (const review of approval.senseReviews) {
    review.decision = "APPROVE";
    review.fieldDecisions = {
      partOfSpeech: "APPROVED",
      translation: "APPROVED",
      definition: "APPROVED",
      example: "APPROVED",
      exampleTranslation: "APPROVED",
      pronunciation: "APPROVED",
      mediaRuntimeUrls: "ACCEPT_NULL_URLS",
    };
    review.reviewer = "Synthetic test owner";
    review.reviewedAt = timestamp;
  }
  for (const review of approval.lexemeReviews) {
    review.decision = "APPROVE";
    review.fieldDecisions = { lemma: "APPROVED", lexicalUnitType: "APPROVED", pronunciation: "APPROVED" };
    review.reviewer = "Synthetic test owner";
    review.reviewedAt = timestamp;
  }
  for (const review of approval.learningSetReviews) {
    review.decision = "APPROVE";
    review.fieldDecisions = { name: "APPROVED", description: "APPROVED", membership: "APPROVED" };
    review.reviewer = "Synthetic test owner";
    review.reviewedAt = timestamp;
    const items = review.items as UnknownRecord[];
    for (const item of items) {
      item.decision = "APPROVE";
      item.reviewer = "Synthetic test owner";
      item.reviewedAt = timestamp;
    }
  }
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("Master V2 canary owner approval and release preparation", () => {
  it("starts with explicit pending decisions and refuses to prepare from the blank template", () => {
    const root = temporaryDirectory();
    const approval = readTemplate();
    const approvalPath = join(root, "approval.json");
    writeFileSync(approvalPath, `${JSON.stringify(approval, null, 2)}\n`);
    expect(approval.releaseApproval.decision).toBe("PENDING");
    expect(approval.senseReviews.every((review) => review.decision === "PENDING")).toBe(true);
    expect(() => prepareMasterVocabularyV2CanaryRelease({
      datasetRoot,
      approvalFile: approvalPath,
      outputRoot: join(root, "release"),
    })).toThrow("RELEASE_OWNER_APPROVAL_REQUIRED");
  });

  it("builds a deterministic dependency-closed local release only from explicit field approvals", () => {
    const root = temporaryDirectory();
    const approval = readTemplate();
    explicitlyApproveEveryField(approval);
    const approvalPath = join(root, "approval.json");
    writeFileSync(approvalPath, `${JSON.stringify(approval, null, 2)}\n`);
    const sourceManifestBefore = readFileSync(join(datasetRoot, "dataset.json"), "utf8");
    const humanReconciliationPath = join(datasetRoot, "import", "mappings", "runtime-reconciliation-v2.json");
    const humanReconciliationBefore = readFileSync(humanReconciliationPath, "utf8");

    const result = prepareMasterVocabularyV2CanaryRelease({
      datasetRoot,
      approvalFile: approvalPath,
      outputRoot: join(root, "release"),
    });
    const manifest = JSON.parse(readFileSync(join(result.outputRoot, "dataset.json"), "utf8")) as UnknownRecord;
    const importArtifact = JSON.parse(readFileSync(join(result.outputRoot, "import", "vocabulary-import-v2.json"), "utf8")) as UnknownRecord;
    const reconciliation = JSON.parse(readFileSync(join(result.outputRoot, "import", "mappings", "runtime-reconciliation-template-v2.json"), "utf8")) as UnknownRecord;

    expect(result.importEligible).toBe(true);
    expect(result.validationErrorCount).toBe(0);
    expect(manifest).toMatchObject({ datasetVersion: "2.1.0", schemaVersion: "2.0.1", status: "APPROVED", releaseHashAlgorithm: "sha256-canonical-json-v1" });
    expect(manifest.includedSenses as unknown[]).toHaveLength(8);
    expect(manifest.includedLexemes as unknown[]).toHaveLength(6);
    expect(manifest.includedClassifications).toEqual([]);
    expect(manifest.includedTaxonomySnapshots).toEqual([]);
    expect(manifest.includedMediaAssetVersions).toEqual([]);
    const importedRows = importArtifact.records as Array<UnknownRecord & { runtimeProjection?: UnknownRecord }>;
    expect(importedRows).toHaveLength(8);
    expect(importedRows.every((row) => row.runtimeProjection?.imageUrl === null
      && row.runtimeProjection.audioUrl === null
      && row.runtimeProjection.topic === null
      && row.runtimeProjection.level === null)).toBe(true);
    expect(reconciliation.generatedByTransform).toBe(true);
    expect(reconciliation.owner).not.toBe("human-reviewed");
    expect((reconciliation.vocabulary as UnknownRecord[]).every((row) => row.decision === "UNRESOLVED")).toBe(true);
    expect(readFileSync(join(datasetRoot, "dataset.json"), "utf8")).toBe(sourceManifestBefore);
    expect(readFileSync(humanReconciliationPath, "utf8")).toBe(humanReconciliationBefore);
  });
});
