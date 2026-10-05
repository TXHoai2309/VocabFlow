import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import {
  assertAuthorization,
  buildPhasePlan,
  canonicalHash,
  main,
  AUTHORIZED_CEFR_FINGERPRINT,
  LIGHT_ID,
  LIGHT_SENSE_ID,
  RC_RELEASE,
  RC_VERSION,
  WATER_ID,
  WATER_SENSE_ID,
  FUSE_SENSE_ID,
} from "./hybrid-100-release-candidate";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonObject = Record<string, any>;
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixtureRoots: string[] = [];

function readJson<T>(root: string, relativePath: string): T {
  return JSON.parse(readFileSync(path.join(root, relativePath), "utf8")) as T;
}

function makeFixture(): string {
  const root = mkdtempSync(path.join(os.tmpdir(), "vocabflow-hybrid-100-rc-test-"));
  fixtureRoots.push(root);
  cpSync(path.join(REPO_ROOT, "vocabflow-dataset"), path.join(root, "vocabflow-dataset"), { recursive: true });
  cpSync(path.join(REPO_ROOT, "docs"), path.join(root, "docs"), { recursive: true });
  cpSync(path.join(REPO_ROOT, "package.json"), path.join(root, "package.json"));
  revertFixtureToAuthorizedBase(root);
  return root;
}

function revertFixtureToAuthorizedBase(root: string): void {
  const datasetRoot = path.join(root, "vocabflow-dataset");
  const manifest = readJson<JsonObject>(root, "vocabflow-dataset/dataset.json");
  const workspace = "vocabflow-dataset/workspaces/hybrid-100-cefr-draft";
  const workspaceClasses = readJson<JsonObject>(root, workspace + "/manifest.json");
  const sourceClasses = readdirSync(path.join(root, workspace, "classifications"))
    .filter((file: string) => file.endsWith(".json"));
  const classRecords = sourceClasses.map((file: string) => readJson<JsonObject>(root, workspace + "/classifications/" + file));
  const newIds = new Set(classRecords.filter((record) => record.classificationId !== LIGHT_ID).map((record) => record.classificationId));
  const provenanceFiles: string[] = readdirSync(path.join(root, workspace, "provenance"))
    .filter((file: string) => file.endsWith(".json"));
  const provenanceIds = new Set(provenanceFiles.map((file) => file.replace(/\.json$/u, "")));
  const lightR1Path = "master/classifications/" + LIGHT_ID + "-r1.json";
  const lightR1 = readJson<JsonObject>(root, "vocabflow-dataset/" + lightR1Path);
  const lightR1Pin = {
    classificationId: LIGHT_ID,
    classificationRevision: 1,
    recordPath: lightR1Path,
    contentHash: canonicalHash(lightR1),
  };
  manifest.includedClassifications = manifest.includedClassifications
    .filter((pin: JsonObject) => !newIds.has(pin.classificationId))
    .map((pin: JsonObject) => pin.classificationId === LIGHT_ID ? lightR1Pin : pin);
  manifest.includedProvenance = manifest.includedProvenance
    .filter((pin: JsonObject) => !provenanceIds.has(pin.provenanceId));
  writeFileSync(path.join(datasetRoot, "dataset.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8");
  for (const file of sourceClasses) rmSync(path.join(datasetRoot, "master/classifications", file), { force: true });
  for (const file of provenanceFiles) rmSync(path.join(datasetRoot, "provenance", file), { force: true });
  const candidate = path.join(datasetRoot, "releases/hybrid-100-v2.2.0-rc.1");
  if (existsSync(candidate)) rmSync(candidate, { recursive: true, force: true });
  expect(workspaceClasses.fullOwnerApprovalFingerprint).toBe(AUTHORIZED_CEFR_FINGERPRINT);
}

afterAll(() => {
  for (const root of fixtureRoots) rmSync(root, { recursive: true, force: true });
});

describe("Phase 2F.5 canonical promotion and Hybrid-100 RC", () => {
  it("blocks missing or drifted authorization and keeps downstream scopes closed", () => {
    expect(() => assertAuthorization(undefined)).toThrow("AUTHORIZATION_NOT_MATERIALIZED");
    const wrong: JsonObject = {
      artifactType: "HYBRID_100_CANONICAL_PROMOTION_AND_RC_AUTHORIZATION",
      authorizedCefrFingerprint: "wrong",
    };
    expect(() => assertAuthorization(wrong)).toThrow("AUTHORIZED_CEFR_PACKAGE_STALE");
    const pinned = readJson<JsonObject>(REPO_ROOT, "vocabflow-dataset/workspaces/hybrid-100-release-candidate/authorization.json");
    expect(pinned.authorizedCefrFingerprint).toBe(AUTHORIZED_CEFR_FINGERPRINT);
    expect(pinned.approvedReleaseAuthorized).toBe(false);
    expect(pinned.runtimeImportAuthorized).toBe(false);
    expect(pinned.databaseWriteAuthorized).toBe(false);
    expect(pinned.productionMutationAuthorized).toBe(false);
    expect(() => assertAuthorization({ ...pinned, approvedReleaseAuthorized: true })).toThrow("AUTHORIZATION_SCOPE_OR_IDENTITY_INVALID");
  }, 60000);

  it("pins exactly 97 new classifications, light r2, water reuse, fuse exclusion and 197 immutable CEFR provenance", () => {
    const plan = buildPhasePlan(REPO_ROOT);
    const repeated = buildPhasePlan(REPO_ROOT);
    const root = plan.canonicalManifest;
    const candidate = plan.candidateManifest;
    const rootBefore = readJson<JsonObject>(REPO_ROOT, "vocabflow-dataset/dataset.json");
    const plannedClassFiles = [...plan.files.keys()].filter((file) => file.startsWith("vocabflow-dataset/master/classifications/"));
    const plannedProvenanceFiles = [...plan.files.keys()].filter((file) => file.startsWith("vocabflow-dataset/provenance/"));
    const light = root.includedClassifications.find((pin: JsonObject) => pin.classificationId === LIGHT_ID);
    const water = root.includedClassifications.find((pin: JsonObject) => pin.classificationId === WATER_ID);
    expect(plan.promotionPlanFingerprint).toBe(repeated.promotionPlanFingerprint);
    expect(plan.candidateFingerprint).toBe(repeated.candidateFingerprint);
    expect(plannedClassFiles).toHaveLength(98);
    expect(plannedProvenanceFiles).toHaveLength(197);
    expect(root.includedLexemes).toEqual(rootBefore.includedLexemes);
    expect(root.includedSenses).toEqual(rootBefore.includedSenses);
    expect(root.includedClassifications).toHaveLength(219);
    expect(root.includedProvenance).toHaveLength(1043);
    expect(root.datasetVersion).toBe("2.0.0");
    expect(root.schemaVersion).toBe("2.0.1");
    expect(root.status).toBe("DRAFT");
    expect(root.releaseHash).toBeUndefined();
    expect(light).toMatchObject({ classificationRevision: 2, recordPath: "master/classifications/" + LIGHT_ID + "-r2.json" });
    expect(water).toMatchObject({ classificationRevision: 1, contentHash: "9bf8e322e7b508d43f69ef7b9927d5a83ac04ab6d0c0e79d546fb2a3b9fb1eec" });
    expect(canonicalHash(readJson<JsonObject>(REPO_ROOT, "vocabflow-dataset/master/classifications/" + LIGHT_ID + "-r1.json")))
      .toBe("08482dae079eb7932bb7254e9a99277f104d58cf73be9f954b63641996c9763c");
    expect(candidate.datasetVersion).toBe(RC_VERSION);
    expect(candidate.status).toBe("IN_REVIEW");
    expect(candidate.includedLexemes).toHaveLength(87);
    expect(candidate.includedSenses).toHaveLength(100);
    expect(candidate.includedClassifications).toHaveLength(99);
    expect(candidate.includedProvenance).toHaveLength(799);
    expect(candidate.includedTaxonomySnapshots).toHaveLength(1);
    expect(candidate.includedMediaAssets).toEqual([]);
    expect(candidate.includedMediaAssetVersions).toEqual([]);
    expect(candidate.includedLearningSets).toEqual([]);
    expect(candidate.includedRelations).toEqual([]);
    expect(candidate.releaseHash).toBeUndefined();
    expect(candidate.releaseHashAlgorithm).toBeUndefined();
    expect(candidate.releasedAt).toBeUndefined();
    expect(candidate.includedSenses.some((pin: JsonObject) => pin.masterSenseId === FUSE_SENSE_ID)).toBe(true);
    expect(candidate.includedClassifications.some((pin: JsonObject) => {
      const record = JSON.parse(plan.candidateFiles.get(RC_RELEASE + "/" + pin.recordPath)!);
      return record.masterSenseId === FUSE_SENSE_ID;
    })).toBe(false);
    expect(candidate.includedSenses.some((pin: JsonObject) => pin.masterSenseId === LIGHT_SENSE_ID)).toBe(true);
    expect(candidate.includedSenses.some((pin: JsonObject) => pin.masterSenseId === WATER_SENSE_ID)).toBe(true);
    expect(plan.summary.canonicalClassificationFilesPromoted).toBe(98);
    expect(plan.summary.canonicalClassificationNetPinDelta).toBe(97);
    expect(plan.summary.canonicalProvenancePromoted).toBe(197);
    expect(plan.summary.candidateFingerprintRepeatIdentical).toBe(true);
    expect([...plan.candidateFiles.keys()].some((file) => file.includes("/import/"))).toBe(false);
  }, 60000);

  it("builds, validates and checks an isolated candidate idempotently without allocating identities", () => {
    const root = makeFixture();
    const baseManifestBefore = readFileSync(path.join(root, "vocabflow-dataset/dataset.json"), "utf8");
    const candidatePath = path.join(root, RC_RELEASE);
    expect(existsSync(path.join(root, "vocabflow-dataset/workspaces/hybrid-100-release-candidate/authorization.json"))).toBe(true);
    main(["--check"], root);
    expect(readFileSync(path.join(root, "vocabflow-dataset/dataset.json"), "utf8")).toBe(baseManifestBefore);
    expect(existsSync(candidatePath)).toBe(false);
    main(["--apply"], root);
    const check = buildPhasePlan(root);
    expect(check.differences).toEqual([]);
    expect(check.summary.canonicalClassificationNetPinDelta).toBe(97);
    expect(check.summary.candidateProvenanceCount).toBe(799);
    const candidateManifest = readJson<JsonObject>(root, RC_RELEASE + "/dataset.json");
    expect(candidateManifest.status).toBe("IN_REVIEW");
    expect(candidateManifest.releaseHash).toBeUndefined();
    main(["--apply"], root);
    const mutableRecord = path.join(candidatePath, "master/senses/" + candidateManifest.includedSenses[0].masterSenseId + "-r1.json");
    writeFileSync(mutableRecord, readFileSync(mutableRecord, "utf8") + " ");
    expect(() => buildPhasePlan(root)).toThrow("RC_IMMUTABILITY_VIOLATION");
  }, 90000);

  it("derives the authorized cohort fingerprints from the pinned inputs", () => {
    const plan = buildPhasePlan(REPO_ROOT);
    const evidence = JSON.parse(plan.files.get(RC_RELEASE + "/reports/release-candidate-evidence.json")!) as JsonObject;
    expect(evidence.authorizedCefrFingerprint).toBe(AUTHORIZED_CEFR_FINGERPRINT);
    expect(evidence.candidateFingerprint).toBe(plan.candidateFingerprint);
    expect(evidence.releaseHashPresent).toBe(false);
    expect(evidence.sourceRightsVerified).toBe(false);
    expect(canonicalHash(evidence.taxonomyPin)).toBe(canonicalHash(plan.candidateManifest.includedTaxonomySnapshots[0]));
  }, 60000);
});
