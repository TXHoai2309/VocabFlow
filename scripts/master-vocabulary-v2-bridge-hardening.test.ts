import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getTableConfig } from "drizzle-orm/pg-core";
import {
  masterLearningSetMappings,
  masterLearningSetMemberships,
  masterTopicMappings,
  masterVocabularyMappings,
  masterVocabularyTopicMemberships,
} from "../apps/api/src/db/schema";
import { buildMasterVocabularyV2CanaryArtifacts } from "./master-vocabulary-v2-canary-preparation";

const repositoryRoot = process.cwd();
const migrationRoot = join(repositoryRoot, "drizzle", "migrations");

function foreignKey(table: Parameters<typeof getTableConfig>[0], name: string) {
  const config = getTableConfig(table);
  const found = config.foreignKeys.find((candidate) => candidate.getName() === name);
  if (!found) throw new Error(`FOREIGN_KEY_NOT_FOUND:${name}`);
  return found.reference();
}

function uniqueColumns(table: Parameters<typeof getTableConfig>[0], name: string): string[] {
  const config = getTableConfig(table);
  const found = config.uniqueConstraints.find((candidate) => candidate.name === name);
  if (!found) throw new Error(`UNIQUE_CONSTRAINT_NOT_FOUND:${name}`);
  return found.columns.map((column) => column.name);
}

function functionBody(sql: string, name: string): string {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = sql.match(new RegExp(`CREATE OR REPLACE FUNCTION "vocabflow_app"\."${escaped}"\\(\\)[\\s\\S]*?AS \\$\\$([\\s\\S]*?)\\$\\$;`));
  if (!match?.[1]) throw new Error(`TRIGGER_FUNCTION_NOT_FOUND:${name}`);
  return match[1];
}

function ownedWriteBlocked(isMapped: boolean, ownedFieldsChanged: boolean, importerContext: boolean): boolean {
  return isMapped && ownedFieldsChanged && !importerContext;
}

describe("Master V2 bridge identity hardening", () => {
  it.each([
    {
      name: "Sense A mapped to vocabulary 10 cannot be paired with vocabulary 11",
      table: masterVocabularyTopicMemberships,
      constraint: "master_vocabulary_topic_memberships_sense_vocabulary_fk",
      sourceColumns: ["master_sense_id", "vocabulary_id"],
      targetColumns: ["master_sense_id", "vocabulary_id"],
      mappingTuple: ["sense-A", 10],
      membershipTuple: ["sense-A", 11],
    },
    {
      name: "Topic X mapped to topic 20 cannot be paired with topic 21",
      table: masterVocabularyTopicMemberships,
      constraint: "master_vocabulary_topic_memberships_topic_runtime_fk",
      sourceColumns: ["master_topic_id", "topic_id"],
      targetColumns: ["master_topic_id", "topic_id"],
      mappingTuple: ["topic-X", 20],
      membershipTuple: ["topic-X", 21],
    },
    {
      name: "Set M mapped to Learning Set 30 cannot be paired with Learning Set 31",
      table: masterLearningSetMemberships,
      constraint: "master_learning_set_memberships_set_runtime_fk",
      sourceColumns: ["master_learning_set_id", "learning_set_id"],
      targetColumns: ["master_learning_set_id", "learning_set_id"],
      mappingTuple: ["set-M", 30],
      membershipTuple: ["set-M", 31],
    },
    {
      name: "Sense A mapped to vocabulary 10 cannot appear as vocabulary 11 in a Learning Set",
      table: masterLearningSetMemberships,
      constraint: "master_learning_set_memberships_sense_vocabulary_fk",
      sourceColumns: ["master_sense_id", "vocabulary_id"],
      targetColumns: ["master_sense_id", "vocabulary_id"],
      mappingTuple: ["sense-A", 10],
      membershipTuple: ["sense-A", 11],
    },
  ])("declares an exact composite foreign key for $name", ({ table, constraint, sourceColumns, targetColumns, mappingTuple, membershipTuple }) => {
    const reference = foreignKey(table, constraint);
    expect(reference.columns.map((column) => column.name)).toEqual(sourceColumns);
    expect(reference.foreignColumns.map((column) => column.name)).toEqual(targetColumns);
    expect(membershipTuple).not.toEqual(mappingTuple);
  });

  it("backs each referenced identity pair with a unique candidate key", () => {
    expect(uniqueColumns(masterVocabularyMappings, "master_vocabulary_mappings_identity_pair_unique"))
      .toEqual(["master_sense_id", "vocabulary_id"]);
    expect(uniqueColumns(masterTopicMappings, "master_topic_mappings_identity_pair_unique"))
      .toEqual(["master_topic_id", "topic_id"]);
    expect(uniqueColumns(masterLearningSetMappings, "master_learning_set_mappings_identity_pair_unique"))
      .toEqual(["master_learning_set_id", "learning_set_id"]);
  });

  it("generates only an additive follow-up migration linked to the committed 0015 snapshot", () => {
    const journal = JSON.parse(readFileSync(join(migrationRoot, "meta", "_journal.json"), "utf8")) as {
      entries: Array<{ idx: number; tag: string }>;
    };
    const previous = journal.entries.find((entry) => entry.tag === "0015_clean_yellowjacket");
    const followUp = journal.entries.find((entry) => entry.tag === "0016_nostalgic_mattie_franklin");
    expect(previous).toMatchObject({ idx: 15, tag: "0015_clean_yellowjacket" });
    expect(followUp).toMatchObject({ idx: 16, tag: "0016_nostalgic_mattie_franklin" });
    const migration = readFileSync(join(migrationRoot, `${followUp?.tag}.sql`), "utf8");
    const oldSnapshot = JSON.parse(readFileSync(join(migrationRoot, "meta", "0015_snapshot.json"), "utf8")) as { id: string };
    const nextSnapshot = JSON.parse(readFileSync(join(migrationRoot, "meta", `${followUp?.tag.slice(0, 4)}_snapshot.json`), "utf8")) as { prevId: string };
    expect(nextSnapshot.prevId).toBe(oldSnapshot.id);
    expect(migration).toContain('UNIQUE("master_sense_id","vocabulary_id")');
    expect(migration).toContain('UNIQUE("master_topic_id","topic_id")');
    expect(migration).toContain('UNIQUE("master_learning_set_id","learning_set_id")');
    expect(migration).toContain('FOREIGN KEY ("master_sense_id","vocabulary_id") REFERENCES "vocabflow_app"."master_vocabulary_mappings"("master_sense_id","vocabulary_id")');
    expect(migration).toContain('FOREIGN KEY ("master_topic_id","topic_id") REFERENCES "vocabflow_app"."master_topic_mappings"("master_topic_id","topic_id")');
    expect(migration).toContain('FOREIGN KEY ("master_learning_set_id","learning_set_id") REFERENCES "vocabflow_app"."master_learning_set_mappings"("master_learning_set_id","learning_set_id")');
    expect(migration).toContain('FOREIGN KEY ("master_sense_id","vocabulary_id") REFERENCES "vocabflow_app"."master_vocabulary_mappings"("master_sense_id","vocabulary_id")');
    for (const [uniqueConstraint, foreignKeyConstraint] of [
      ["master_learning_set_mappings_identity_pair_unique", "master_learning_set_memberships_set_runtime_fk"],
      ["master_topic_mappings_identity_pair_unique", "master_vocabulary_topic_memberships_topic_runtime_fk"],
      ["master_vocabulary_mappings_identity_pair_unique", "master_learning_set_memberships_sense_vocabulary_fk"],
      ["master_vocabulary_mappings_identity_pair_unique", "master_vocabulary_topic_memberships_sense_vocabulary_fk"],
    ]) {
      expect(migration.indexOf(`ADD CONSTRAINT "${uniqueConstraint}"`)).toBeGreaterThanOrEqual(0);
      expect(migration.indexOf(`ADD CONSTRAINT "${foreignKeyConstraint}"`))
        .toBeGreaterThan(migration.indexOf(`ADD CONSTRAINT "${uniqueConstraint}"`));
    }
    expect(migration).not.toMatch(/DROP CONSTRAINT|DROP TABLE|TRUNCATE|DELETE FROM|UPDATE\s+"vocabflow_app"\./i);
  });

  it.each([
    { name: "an unmapped legacy row remains writable", mapped: false, changed: true, importer: false, blocked: false },
    { name: "a mapped row rejects a legacy owned-field change", mapped: true, changed: true, importer: false, blocked: true },
    { name: "a mapped row allows an unchanged owned projection", mapped: true, changed: false, importer: false, blocked: false },
    { name: "the V2 importer may change mapped owned fields", mapped: true, changed: true, importer: true, blocked: false },
  ])("models the adoption write transition: $name", ({ mapped, changed, importer, blocked }) => {
    expect(ownedWriteBlocked(mapped, changed, importer)).toBe(blocked);
  });

  it("keeps migration guards conditional on Master ownership and importer context", () => {
    const migration = readFileSync(join(migrationRoot, "0015_clean_yellowjacket.sql"), "utf8");
    const vocabulary = functionBody(migration, "guard_master_managed_vocabulary_write");
    const topic = functionBody(migration, "guard_master_owned_topic_write");
    const learningSet = functionBody(migration, "guard_master_owned_learning_set_write");
    const setItem = functionBody(migration, "guard_master_learning_set_item_write");
    for (const body of [vocabulary, topic, learningSet, setItem]) {
      expect(body).toContain("IS DISTINCT FROM");
      expect(body).toContain("current_setting('vocabflow.master_v2_import', true) IS DISTINCT FROM 'on'");
    }
    expect(vocabulary).toContain('mapping."vocabulary_id" = OLD."id"');
    expect(topic).toContain('mapping."topic_id" = OLD."id"');
    expect(learningSet).toContain('mapping."learning_set_id" = OLD."id"');
    expect(setItem).toContain('mapping."learning_set_id" = OLD."learning_set_id" AND mapping."vocabulary_id" = OLD."vocabulary_id"');
    expect(setItem).toContain('TG_OP = \'DELETE\' OR NEW."sort_order" IS DISTINCT FROM OLD."sort_order"');
    expect(migration).toContain('BEFORE UPDATE OR DELETE ON "vocabflow_app"."learning_set_items"');
  });
});

describe("Master V2 canary preparation", () => {
  it("generates a deterministic owner review package and unresolved no-target candidates without touching human decisions", () => {
    const datasetRoot = join(repositoryRoot, "vocabflow-dataset");
    const humanReconciliationPath = join(datasetRoot, "import", "mappings", "runtime-reconciliation-v2.json");
    const humanBefore = readFileSync(humanReconciliationPath, "utf8");
    const first = buildMasterVocabularyV2CanaryArtifacts(datasetRoot);
    const second = buildMasterVocabularyV2CanaryArtifacts(datasetRoot);
    const candidates = JSON.parse(first.reconciliationCandidatesJson) as {
      targetStatus: string;
      runtimeSearchPerformed: boolean;
      candidates: Array<{ decision: string; runtimeCandidateSearchPerformed: boolean; runtimeCandidates: unknown[]; runtimeVisibility: { state: string; learnerProgressReferenceCount: number | null; reviewEventReferenceCount: number | null } }>;
    };
    const releasePlan = JSON.parse(first.releasePlanJson) as {
      candidateSenseCount: number;
      proposedLearnerContentBoundary: { includedSensePins: unknown[]; requiredLexemePins: unknown[]; requiredProvenancePins: unknown[]; includedClassificationPins: unknown[]; includedLearningSetPins: unknown[]; includedLearningSetItemCount: number };
      excludedLearningSetClosure: { excludedLearningSetPins: unknown[] };
      manifestRules: { canonicalManifestMutation: string; everyPinnedLexemeSenseClassificationLearningSetRelationMustBeApproved: boolean };
    };
    expect(first).toEqual(second);
    expect(candidates.targetStatus).toBe("NO_TARGET");
    expect(candidates.runtimeSearchPerformed).toBe(false);
    expect(candidates.candidates).toHaveLength(8);
    expect(candidates.candidates.every((candidate) => candidate.decision === "UNRESOLVED")).toBe(true);
    expect(candidates.candidates.every((candidate) => !candidate.runtimeCandidateSearchPerformed && candidate.runtimeCandidates.length === 0)).toBe(true);
    expect(candidates.candidates.every((candidate) => candidate.runtimeVisibility.state === "UNAVAILABLE_NO_TARGET" && candidate.runtimeVisibility.learnerProgressReferenceCount === null && candidate.runtimeVisibility.reviewEventReferenceCount === null)).toBe(true);
    expect(releasePlan.candidateSenseCount).toBe(8);
    expect(releasePlan.proposedLearnerContentBoundary.includedSensePins).toHaveLength(8);
    expect(releasePlan.proposedLearnerContentBoundary.requiredLexemePins).toHaveLength(6);
    expect(releasePlan.proposedLearnerContentBoundary.requiredProvenancePins.length).toBeGreaterThan(0);
    expect(releasePlan.proposedLearnerContentBoundary.includedClassificationPins).toEqual([]);
    expect(releasePlan.proposedLearnerContentBoundary.includedLearningSetPins).toHaveLength(1);
    expect(releasePlan.proposedLearnerContentBoundary.includedLearningSetItemCount).toBe(1);
    expect(releasePlan.excludedLearningSetClosure.excludedLearningSetPins).toHaveLength(6);
    expect(releasePlan.manifestRules.canonicalManifestMutation).toContain("not performed");
    expect(releasePlan.manifestRules.everyPinnedLexemeSenseClassificationLearningSetRelationMustBeApproved).toBe(true);
    expect(first.reviewMarkdown).toContain("Owner review only");
    expect(first.reviewMarkdown).toContain("Technology starter");
    expect(first.reviewMarkdown).not.toContain("[object Object]");
    expect(first.reviewMarkdown).toContain("A1 — editorial estimate, non-official");
    expect(first.reviewMarkdown).toContain("Legacy Topic (full DRAFT preview)");
    expect(first.reviewMarkdown).toContain("ɹɪˈkɔɹd` (Sense override)");
    expect(first.reviewMarkdown).toContain("Domains: EDITORIAL / NON-OFFICIAL");
    const ownerApproval = JSON.parse(first.ownerApprovalTemplateJson) as { releaseApproval: { decision: string }; senseReviews: Array<{ decision: string }> };
    expect(ownerApproval.releaseApproval.decision).toBe("PENDING");
    expect(ownerApproval.senseReviews).toHaveLength(8);
    expect(ownerApproval.senseReviews.every((review) => review.decision === "PENDING")).toBe(true);
    expect(readFileSync(humanReconciliationPath, "utf8")).toBe(humanBefore);
  });
});
