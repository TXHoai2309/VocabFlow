import { describe, expect, it } from "vitest";
import { mapResultsToProductionIdentities } from "./short-meanings-v2-production-sync";

const hashA = "a".repeat(64);
const hashB = "b".repeat(64);
const source = [
  { proposalIdentity: "sense:one", vocabularyId: 101, sourceContentHash: hashA },
  { proposalIdentity: "sense:two", vocabularyId: 102, sourceContentHash: hashB },
];
const results = source.map((row) => ({
  ...row,
  shortMeaningVi: "gloss",
  sourceType: "VERIFIED_SOURCE_GLOSS",
  evidenceRef: "source:pin",
  confidence: "HIGH",
  validationStatus: "VERIFIED" as const,
  reviewerIdentity: "reviewer",
  reviewedAt: "2026-10-18T00:00:00.000Z",
  reviewEvidence: "checked source identity and POS",
  artifactVersion: "v3",
}));

describe("short meaning Production stable identity mapping", () => {
  it("maps to Production IDs by stable identity and pinned hash even when numeric IDs differ", () => {
    const production = [
      { proposalIdentity: "sense:one", vocabularyId: 901, sourceContentHash: hashA },
      { proposalIdentity: "sense:two", vocabularyId: 902, sourceContentHash: hashB },
    ];

    expect(mapResultsToProductionIdentities(source, results, production).map((row) => [row.proposalIdentity, row.vocabularyId]))
      .toEqual([["sense:one", 901], ["sense:two", 902]]);
  });

  it("rejects target content hash changes", () => {
    expect(() => mapResultsToProductionIdentities(source, results, [
      { proposalIdentity: "sense:one", vocabularyId: 901, sourceContentHash: hashB },
      { proposalIdentity: "sense:two", vocabularyId: 902, sourceContentHash: hashB },
    ])).toThrow("PRODUCTION_CONTENT_HASH_MISMATCH");
  });

  it("rejects missing and duplicate stable identities", () => {
    expect(() => mapResultsToProductionIdentities(source, results, [productionRow("sense:one", 901, hashA)]))
      .toThrow("PRODUCTION_IDENTITY_COVERAGE_MISMATCH");
    expect(() => mapResultsToProductionIdentities(source, results, [
      productionRow("sense:one", 901, hashA), productionRow("sense:one", 902, hashB),
    ])).toThrow("DUPLICATE_STABLE_IDENTITY");
  });
});

function productionRow(proposalIdentity: string, vocabularyId: number, sourceContentHash: string) {
  return { proposalIdentity, vocabularyId, sourceContentHash };
}
