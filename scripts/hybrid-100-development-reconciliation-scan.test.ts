import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { getConnectionTarget } from "../config/database-targets";
import { emptySnapshot, type RuntimeVocabulary } from "./master-vocabulary-v2-import-planner";
import type { MasterRuntimeCandidate, ReadOnlySnapshot } from "./master-vocabulary-v2-read-only-reconciliation-scan";
import {
  HYBRID_100_2_2_1,
  HYBRID_100_READ_ONLY_TRANSACTION,
  buildHybrid100OwnerDecisionTemplate,
  finalizeHybrid100CandidateScan,
  fingerprintHybrid100Snapshot,
  isExactHybrid100DevelopmentTarget,
  nullEnrichmentDisposition,
  parseHybrid100ScannerArgs,
  redactSensitiveReconciliationValue,
  verifyHybrid100SourceRelease,
} from "./hybrid-100-development-reconciliation-scan";

type TestSense = MasterRuntimeCandidate & {
  partOfSpeech: string;
  reviewedMeaning: string | null;
  lexemeRevision: number;
  senseRevision: number;
};

function sense(id = "sense-bank", vietnamese = "ngân hàng", definition = "A financial institution."): TestSense {
  return {
    masterLexemeId: "lexeme-bank",
    masterSenseId: id,
    lemma: "bank",
    normalizedLemma: "bank",
    partOfSpeech: "NOUN",
    reviewedMeaning: definition,
    lexemeRevision: 2,
    senseRevision: 3,
    projection: {
      word: "bank",
      ipa: null,
      vietnamese,
      definitionEn: definition,
      exampleEn: "She went to the bank.",
      imageUrl: null,
      audioUrl: null,
      topic: null,
      level: null,
      enabled: true,
    },
  };
}

function runtimeVocabulary(overrides: Partial<RuntimeVocabulary> = {}): RuntimeVocabulary {
  return {
    id: 42,
    word: "bank",
    ipa: null,
    vietnamese: "ngân hàng",
    vietnameseOverride: null,
    definitionEn: "A financial institution.",
    exampleEn: "She went to the bank.",
    imageUrl: null,
    imageQuarantined: false,
    audioUrl: null,
    topic: null,
    level: null,
    enabled: true,
    contentVersion: 1,
    ...overrides,
  };
}

function readOnlySnapshot(rows: RuntimeVocabulary[] = []): ReadOnlySnapshot {
  const snapshot = emptySnapshot() as ReadOnlySnapshot;
  snapshot.vocabularies.push(...rows);
  return snapshot;
}

function mapping(overrides: Partial<{
  masterSenseId: string;
  masterLexemeId: string;
  vocabularyId: number;
  projectionContractVersion: string;
  appliedProjectionFingerprint: string;
  lastReleaseHash: string;
  appliedLexemeRevision: number;
  appliedSenseRevision: number;
}> = {}) {
  return {
    masterSenseId: "sense-bank",
    masterLexemeId: "lexeme-bank",
    vocabularyId: 42,
    projectionContractVersion: HYBRID_100_2_2_1.projectionContract,
    appliedProjectionFingerprint: "a".repeat(64),
    lastReleaseHash: HYBRID_100_2_2_1.releaseHash,
    appliedLexemeRevision: 2,
    appliedSenseRevision: 3,
    ...overrides,
  };
}

function rows(scan: Record<string, unknown>): Array<Record<string, unknown>> {
  return scan.senses as Array<Record<string, unknown>>;
}

describe("Phase 2G.1C Hybrid-100 Development candidate scan", () => {
  let sourceEvidence: ReturnType<typeof verifyHybrid100SourceRelease>;
  let sourceManifestBefore: Buffer;
  let sourceManifestAfter: Buffer;

  beforeAll(() => {
    const manifestPath = path.join(process.cwd(), "vocabflow-dataset/releases/hybrid-100-v2.2.1/dataset.json");
    sourceManifestBefore = readFileSync(manifestPath);
    sourceEvidence = verifyHybrid100SourceRelease(process.cwd());
    sourceManifestAfter = readFileSync(manifestPath);
  }, 60_000);

  it("verifies the exact frozen 2.2.1 source, hash and RELEASE projection without output writes", () => {
    const source = sourceEvidence;
    expect(source.manifest).toMatchObject({
      datasetVersion: "2.2.1",
      schemaVersion: "2.0.1",
      status: "APPROVED",
      releaseHashAlgorithm: "sha256-canonical-json-v1",
      releaseHash: HYBRID_100_2_2_1.releaseHash,
    });
    expect(source.releaseTreeFingerprint).toBe(HYBRID_100_2_2_1.releaseTreeFingerprint);
    expect(source.projected).toBe(100);
    expect(source.skipped).toBe(0);
    expect(source.importEligible).toBe(true);
    expect(source.projection.vocabulary.records).toHaveLength(100);
    expect(source.projectionScope).toEqual({
      appImportContract: "app-import-v3",
      projectionContract: "runtime-vocabulary-projection-v2",
      topics: 0,
      topicMemberships: 0,
      learningSets: 0,
      learningSetItems: 0,
    });
    expect(source.fieldCounts).toEqual({ vietnameseNonNull: 100, definitionEnNonNull: 100, exampleEnNonNull: 100, ipaNonNull: 0 });
    expect(sourceManifestAfter.equals(sourceManifestBefore)).toBe(true);
  });

  it("accepts only the configured Development branch and rejects shared CI and production", () => {
    expect(isExactHybrid100DevelopmentTarget(getConnectionTarget("development", "runtime"))).toBe(true);
    expect(isExactHybrid100DevelopmentTarget(getConnectionTarget("development", "migration"))).toBe(true);
    expect(isExactHybrid100DevelopmentTarget(getConnectionTarget("test", "runtime"))).toBe(false);
    expect(isExactHybrid100DevelopmentTarget(getConnectionTarget("production", "runtime"))).toBe(false);
  });

  it("pins repeatable-read read-only mode and does not accept apply flags", () => {
    expect(HYBRID_100_READ_ONLY_TRANSACTION).toBe("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY");
    expect(parseHybrid100ScannerArgs(["--env-file", ".env"]).envFile).toBe(".env");
    expect(() => parseHybrid100ScannerArgs(["--apply"])).toThrow("SCANNER_ARGUMENT_INVALID");
  });

  it("redacts database URLs, URL credentials, query strings and external URL paths", () => {
    expect(redactSensitiveReconciliationValue("postgresql://runtime:secret@db.example/neondb?sslmode=require"))
      .toBe("[REDACTED_DATABASE_URL]");
    expect(redactSensitiveReconciliationValue("https://user:pass@cdn.example.invalid/private/image.png?token=secret"))
      .toBe("https://cdn.example.invalid/[REDACTED_PATH]");
  });

  it("builds a 100-row owner template with unresolved decisions and no allocated integer IDs", () => {
    const source = sourceEvidence;
    const template = buildHybrid100OwnerDecisionTemplate(source.sources.map((row) => ({
      masterSenseId: row.masterSenseId,
      masterLexemeId: row.masterLexemeId,
      candidateAppVocabularyIds: [],
    })));
    expect(template.decisions).toHaveLength(100);
    expect(template.ownerReviewed).toBe(false);
    expect(template.acceptedByImporter).toBe(false);
    expect(template.decisions.every((row) => row.ownerDecision === "UNRESOLVED"
      && row.appVocabularyId === null && row.firstAdoptionPolicy === null && row.clearFields.length === 0)).toBe(true);
  });

  it("keeps an existing mapping identity and flags a mapping to a missing runtime row as blocked", () => {
    const preserved = readOnlySnapshot([runtimeVocabulary()]);
    (preserved.vocabularyMappings as unknown[]).push(mapping());
    const mappedScan = finalizeHybrid100CandidateScan(preserved, [sense()]);
    const mapped = rows(mappedScan)[0]!;
    expect(mapped.existingMasterMapping).toMatchObject({ vocabularyId: 42, appliedSenseRevision: 3 });
    expect((mapped.runtimeCandidates as Array<Record<string, unknown>>)[0]).toMatchObject({ appVocabularyId: 42, ownerDecision: "UNRESOLVED" });

    const missing = readOnlySnapshot();
    (missing.vocabularyMappings as unknown[]).push(mapping());
    const missingScan = finalizeHybrid100CandidateScan(missing, [sense()]);
    expect(rows(missingScan)[0]).toMatchObject({
      analysisRecommendation: "BLOCKED",
      mappingAnomalies: ["MAPPED_RUNTIME_ROW_MISSING"],
      ownerDecision: "UNRESOLVED",
    });
  });

  it("flags a runtime candidate shared by distinct Senses for identity review", () => {
    const scan = finalizeHybrid100CandidateScan(readOnlySnapshot([runtimeVocabulary()]), [
      sense("sense-bank-finance"),
      sense("sense-bank-river", "bờ sông", "The land beside a river.") ,
    ]);
    for (const row of rows(scan)) {
      expect(row.analysisRecommendation).toBe("IDENTITY_REVIEW_REQUIRED");
      expect(row.ownerDecision).toBe("UNRESOLVED");
      expect((row.runtimeCandidates as Array<Record<string, unknown>>)[0]).toMatchObject({
        appVocabularyId: 42,
        polysemyAmbiguous: true,
        candidateClassification: "CONFLICTING_MEANING",
      });
      expect(row.identityReviewCompetingSenseIds).toHaveLength(1);
    }
  });

  it("uses effective Vietnamese and quarantined-image semantics while preserving null Master enrichment", () => {
    const runtime = runtimeVocabulary({
      vietnameseOverride: "cách hiểu riêng",
      ipa: "/bæŋk/",
      imageUrl: "https://example.invalid/bank.png",
      imageQuarantined: true,
    });
    const scan = finalizeHybrid100CandidateScan(readOnlySnapshot([runtime]), [sense()]);
    const candidate = (rows(scan)[0]!.runtimeCandidates as Array<Record<string, unknown>>)[0]!;
    expect(candidate).toMatchObject({
      effectiveVietnamese: "cách hiểu riêng",
      vietnameseOverrideStatus: "CONFLICTS_WITH_MASTER",
      effectiveImageUrl: null,
      imageQuarantined: true,
    });
    const diffs = candidate.projectionDifferences as Array<Record<string, unknown>>;
    expect(diffs).toContainEqual(expect.objectContaining({ field: "ipa", action: "PRESERVE" }));
    expect(nullEnrichmentDisposition("ipa", null)).toBe("PRESERVE");
    expect(nullEnrichmentDisposition("imageUrl", null)).toBe("PRESERVE");
    expect(nullEnrichmentDisposition("definitionEn", null)).toBe("COMPARE");
    expect(rows(scan)[0]!.analysisRecommendation).toBe("QUARANTINE_REVIEW_REQUIRED");
  });

  it("uses aggregate history counts only and serializes no learner identities", () => {
    const snapshot = readOnlySnapshot([runtimeVocabulary()]);
    snapshot.learnerProgressCounts = [{ vocabularyId: 42, referenceCount: 5 }];
    snapshot.reviewEventCounts = [{ vocabularyId: 42, referenceCount: 7 }];
    const result = finalizeHybrid100CandidateScan(snapshot, [sense()]);
    const candidate = (rows(result)[0]!.runtimeCandidates as Array<Record<string, unknown>>)[0]!;
    expect(candidate.learnerProgressReferenceCount).toBe(5);
    expect(candidate.reviewEventReferenceCount).toBe(7);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toMatch(/learnerId|householdId|learner_id|household_id/i);
    expect(snapshot.progressVocabularyIds).toEqual([]);
    expect(snapshot.reviewVocabularyIds).toEqual([]);
  });

  it("computes the same source, migration and runtime fingerprint twice from one snapshot", () => {
    const snapshot = readOnlySnapshot([runtimeVocabulary()]);
    snapshot.learnerProgressCounts = [{ vocabularyId: 42, referenceCount: 1 }];
    const scan = finalizeHybrid100CandidateScan(snapshot, [sense()]);
    const binding = {
      target: getConnectionTarget("development", "runtime"),
      snapshot,
      scan,
      appliedMigrations: [{ tag: "0018_panoramic_spirit", hash: "f".repeat(64) }],
      sourceSenseIdentities: [{
        masterLexemeId: "lexeme-bank", masterSenseId: "sense-bank", lemma: "bank", normalizedLemma: "bank",
        partOfSpeech: "NOUN", lexemeRevision: 2, senseRevision: 3,
      }],
      migrationState: { localMigrationCount: 19, appliedCount: 19, current: true },
    };
    const first = fingerprintHybrid100Snapshot(binding);
    const second = fingerprintHybrid100Snapshot(binding);
    expect(first.repeatIdentical).toBe(true);
    expect(first.fingerprint).toBe(second.fingerprint);
  });
});
