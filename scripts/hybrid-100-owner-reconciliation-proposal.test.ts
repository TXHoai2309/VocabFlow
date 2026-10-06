import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  buildOwnerReconciliationProposal,
  OWNER_RECONCILIATION_BASELINE,
  OWNER_RECONCILIATION_RELEASE_HASH,
  OWNER_RECONCILIATION_RELEASE_TREE,
  OWNER_RECONCILIATION_SNAPSHOT,
} from "./hybrid-100-owner-reconciliation-proposal";
import { canonicalJsonSha256 } from "./validate-master-vocabulary-v2";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Proposal evidence is JSON-defined and pinned by tests.
type JsonObject = Record<string, any>;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const proposal = buildOwnerReconciliationProposal(ROOT);
const senses = proposal.senses as JsonObject[];

function byLemma(lemma: string, meaningIncludes?: string): JsonObject {
  const row = senses.find((sense) => sense.lemma === lemma && (!meaningIncludes || String(sense.reviewedMeaning).includes(meaningIncludes)));
  if (!row) throw new Error(`Test sense not found: ${lemma} / ${meaningIncludes ?? ""}`);
  return row;
}

function changedFiles(relativePath: string): string[] {
  return execFileSync("git", ["diff", "--name-only", OWNER_RECONCILIATION_BASELINE, "--", relativePath], { cwd: ROOT, encoding: "utf8" })
    .split(/\r?\n/).filter(Boolean);
}

describe("Phase 2G.2A owner reconciliation proposal", () => {
  it("pins the exact committed Phase 2G.1C snapshot fingerprint", () => {
    expect(proposal.sourceSnapshot.snapshotFingerprint).toBe(OWNER_RECONCILIATION_SNAPSHOT);
  });

  it("generates one proposal row for all 100 Master Senses", () => {
    expect(senses).toHaveLength(100);
    expect(proposal.counts.masterSenses).toBe(100);
  });

  it("leaves every actual ownerDecision unresolved", () => {
    expect(senses.every((sense) => sense.ownerDecision === "UNRESOLVED")).toBe(true);
    expect(proposal.ownership.ownerDecisionsFinalized).toBe(0);
    expect(proposal.ownership.ownerDecisionsUnresolved).toBe(100);
  });

  it("defaults every zero-candidate Sense to CREATE_NEW without an ID", () => {
    const rows = senses.filter((sense) => (sense.runtimeCandidateIds as number[]).length === 0);
    expect(rows).toHaveLength(85);
    expect(rows.every((sense) => sense.proposedDecision === "CREATE_NEW" && sense.proposedAppVocabularyId === null)).toBe(true);
  });

  it("does not treat a different English lemma as the same identity from Vietnamese overlap", () => {
    const exact = byLemma("exact");
    const rally = byLemma("rally");
    expect(exact.proposedDecision).toBe("CREATE_NEW");
    expect(exact.evidence.rejectedCandidateReasons[0].runtimeWord).toBe("precise");
    expect(rally.proposedDecision).toBe("CREATE_NEW");
    expect(rally.evidence.rejectedCandidateReasons[0].runtimeWord).toBe("muster");
  });

  it("rejects rock to runtime kick as a Vietnamese translation homonym", () => {
    const rock = byLemma("rock");
    expect(rock.proposedDecision).toBe("CREATE_NEW");
    expect(rock.proposedAppVocabularyId).toBeNull();
    expect(rock.evidence.rejectedCandidateReasons[0].runtimeId).toBe(944);
    expect(rock.evidence.rejectedCandidateReasons[0].reason).toContain("translation homonym");
  });

  it("preserves reservation runtime #284 and records its different existing Master mapping", () => {
    const reservation = byLemma("reservation");
    expect(reservation.proposedDecision).toBe("CREATE_NEW");
    expect(reservation.proposedAppVocabularyId).toBeNull();
    expect(reservation.evidence.mappingConflict.present).toBe(true);
    expect(reservation.evidence.mappingConflict.conflictingRuntimeMappings[0].runtimeId).toBe(284);
    expect(reservation.evidence.mappingConflict.conflictingRuntimeMappings[0].mappedMasterSenseId).toBe("01a0fc13-09ef-7d37-a50f-d05db6b1a89c");
  });

  it("rejects runtime #1260 for each of the three Hybrid light Senses", () => {
    const lightRows = senses.filter((sense) => sense.lemma === "light");
    expect(lightRows).toHaveLength(3);
    expect(lightRows.every((sense) => sense.proposedDecision === "CREATE_NEW" && sense.proposedAppVocabularyId === null)).toBe(true);
    expect(lightRows.every((sense) => sense.runtimeCandidateIds.includes(1260))).toBe(true);
  });

  it("assigns relief #1461 only to the pain-relief Sense, not emergency aid", () => {
    const reliefRows = senses.filter((sense) => sense.lemma === "relief");
    expect(reliefRows).toHaveLength(2);
    const aid = reliefRows.find((sense) => String(sense.reviewedMeaning).includes("Help given"))!;
    const pain = reliefRows.find((sense) => String(sense.reviewedMeaning).includes("reduction in pain"))!;
    expect(aid.proposedDecision).toBe("CREATE_NEW");
    expect(aid.proposedAppVocabularyId).toBeNull();
    expect(pain.proposedDecision).toBe("MAP_EXISTING");
    expect(pain.proposedAppVocabularyId).toBe(1461);
    expect(reliefRows.filter((sense) => sense.proposedAppVocabularyId === 1461)).toHaveLength(1);
  });

  it("proposes stand #948 as a strong same-identity map with UPDATE_TO_MASTER", () => {
    const stand = byLemma("stand");
    expect(stand.proposedDecision).toBe("MAP_EXISTING");
    expect(stand.proposedAppVocabularyId).toBe(948);
    expect(stand.proposedFirstAdoptionPolicy).toBe("UPDATE_TO_MASTER");
  });

  it("surfaces water #11 history and never proposes moving it", () => {
    const water = byLemma("water");
    expect(water.proposedDecision).toBe("CREATE_NEW");
    expect(water.proposedAppVocabularyId).toBeNull();
    expect(water.evidence.learnerProgressReferences).toContainEqual({ runtimeId: 11, count: 1 });
    expect(water.evidence.reviewEventReferences).toContainEqual({ runtimeId: 11, count: 5 });
    expect(water.evidence.candidateReviews.find((candidate: JsonObject) => candidate.runtimeId === 11).existingMasterSenseMapping).toBeNull();
  });

  it("requires a firstAdoptionPolicy for every MAP_EXISTING proposal", () => {
    const maps = senses.filter((sense) => sense.proposedDecision === "MAP_EXISTING");
    expect(maps.length).toBeGreaterThan(0);
    expect(maps.every((sense) => ["ADOPT_EXISTING_AS_BASELINE", "UPDATE_TO_MASTER"].includes(sense.proposedFirstAdoptionPolicy))).toBe(true);
  });

  it("never preallocates integer IDs for CREATE_NEW", () => {
    expect(senses.filter((sense) => sense.proposedDecision === "CREATE_NEW")
      .every((sense) => sense.proposedAppVocabularyId === null)).toBe(true);
  });

  it("remains analysis-only and is not importer-accepted", () => {
    expect(proposal.ownership.analysisOnly).toBe(true);
    expect(proposal.ownership.acceptedByImporter).toBe(false);
    expect(proposal.ownership.requiresHumanDecision).toBe(true);
    expect(proposal.ownership.ownerReviewed).toBe(false);
    expect(proposal.ownership.importerApplyAuthorized).toBe(false);
  });

  it("has no database connector or openSql call in the 2G.2A execution script", () => {
    const source = readFileSync(path.join(ROOT, "scripts/hybrid-100-owner-reconciliation-proposal.ts"), "utf8");
    expect(source).not.toMatch(/openSql|@neondatabase\/serverless|DATABASE_URL|connectToDatabase/i);
  });

  it("verifies the frozen release identity and confirms no release files differ from the baseline", () => {
    const releasePath = path.join(ROOT, "vocabflow-dataset/releases/hybrid-100-v2.2.1/dataset.json");
    const manifest = JSON.parse(readFileSync(releasePath, "utf8")) as JsonObject;
    const unhashed = { ...manifest };
    delete unhashed.releaseHash;
    expect(manifest.releaseHash).toBe(OWNER_RECONCILIATION_RELEASE_HASH);
    expect(canonicalJsonSha256(unhashed)).toBe(OWNER_RECONCILIATION_RELEASE_HASH);
    expect(manifest.status).toBe("APPROVED");
    expect(OWNER_RECONCILIATION_RELEASE_TREE).toBe("51ab4c5ce31bd38b51742d1aea16602150522da27ad26c123cc17b332f9a406e");
    expect(changedFiles("vocabflow-dataset/releases/hybrid-100-v2.2.1")).toEqual([]);
  });

  it("has no apps/web changes from the Phase 2G.1C baseline", () => {
    expect(changedFiles("apps/web")).toEqual([]);
  });
});
