import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getTableConfig } from "drizzle-orm/pg-core";
import { APP_SCHEMA, MIGRATION_SCHEMA } from "@vocabflow/contracts";
import {
  account,
  achievements,
  householdMembers,
  households,
  learnerLearningSets,
  learnerAchievements,
  learnerProfiles,
  learnerProgress,
  learnerSavedVocabulary,
  learningSetItems,
  learningSets,
  masterLearningSetMappings,
  masterLearningSetMemberships,
  masterTopicMappings,
  masterVocabularyImportRuns,
  masterVocabularyMappings,
  masterVocabularyTopicMemberships,
  reviewEvents,
  session,
  topics,
  user,
  verification,
  vocabularies,
  vocabularyTopics,
  xpEvents
} from "../apps/api/src/db/schema";
import { DATABASE_RESET_POLICY } from "../config/database-reset-policy";
import { assertApplicationTablesAbsent, assertApplicationTablesPresent } from "./db-core";
import { resetApplicationScope } from "./db-reset-operations";

type CapturedQuery = { text: string; values: unknown[] };

function applicationAssertionSql(count: string, queries: CapturedQuery[], enumCount = "0") {
  const tag = ((strings: TemplateStringsArray, ...values: unknown[]) => {
    const text = strings.join("?");
    queries.push({ text, values });
    return Promise.resolve([{ count: text.includes("pg_type") ? enumCount : count }]);
  }) as unknown as Parameters<typeof assertApplicationTablesAbsent>[0] & { array(values: unknown[]): unknown };
  tag.array = ((values: unknown[]) => values) as typeof tag.array;
  return tag;
}

describe("dedicated application schema", () => {
  it("uses one canonical application schema in the reset policy", () => {
    expect(APP_SCHEMA).toBe("vocabflow_app");
    expect(MIGRATION_SCHEMA).toBe("drizzle");
    expect(DATABASE_RESET_POLICY.applicationSchemas).toEqual([APP_SCHEMA]);
    expect(DATABASE_RESET_POLICY.applicationTables).toEqual([
      `${APP_SCHEMA}.master_learning_set_memberships`,
      `${APP_SCHEMA}.master_vocabulary_topic_memberships`,
      `${APP_SCHEMA}.master_learning_set_mappings`,
      `${APP_SCHEMA}.master_topic_mappings`,
      `${APP_SCHEMA}.master_vocabulary_mappings`,
      `${APP_SCHEMA}.master_vocabulary_import_runs`,
      `${APP_SCHEMA}.learner_achievements`,
      `${APP_SCHEMA}.xp_events`,
      `${APP_SCHEMA}.achievements`,
      `${APP_SCHEMA}.learner_learning_sets`,
      `${APP_SCHEMA}.learning_set_items`,
      `${APP_SCHEMA}.vocabulary_topics`,
      `${APP_SCHEMA}.learner_saved_vocabulary`,
      `${APP_SCHEMA}.review_events`,
      `${APP_SCHEMA}.learner_progress`,
      `${APP_SCHEMA}.vocabularies`,
      `${APP_SCHEMA}.learning_sets`,
      `${APP_SCHEMA}.topics`,
      `${APP_SCHEMA}.learner_profiles`,
      `${APP_SCHEMA}.household_members`,
      `${APP_SCHEMA}.households`,
      `${APP_SCHEMA}.account`,
      `${APP_SCHEMA}.session`,
      `${APP_SCHEMA}.verification`,
      `${APP_SCHEMA}.user`
    ]);
    expect(DATABASE_RESET_POLICY.applicationEnumTypes).toEqual([
      `${APP_SCHEMA}.vocabulary_level`,
      `${APP_SCHEMA}.review_result`,
      `${APP_SCHEMA}.learning_status`,
      `${APP_SCHEMA}.household_role`
    ]);
    expect(DATABASE_RESET_POLICY.protectedSchemas).toEqual(["vocabflow_meta"]);
    expect(DATABASE_RESET_POLICY.migrationTrackingObjects).toEqual([`${MIGRATION_SCHEMA}.__drizzle_migrations`]);
  });

  it("binds every runtime Drizzle table to the dedicated application schema", () => {
    for (const table of [account, session, user, verification, households, householdMembers, learnerProfiles, vocabularies, topics, learningSets, vocabularyTopics, learningSetItems, masterVocabularyImportRuns, masterVocabularyMappings, masterTopicMappings, masterLearningSetMappings, masterVocabularyTopicMemberships, masterLearningSetMemberships, learnerLearningSets, learnerProgress, learnerSavedVocabulary, reviewEvents, xpEvents, achievements, learnerAchievements]) {
      expect(getTableConfig(table).schema).toBe(APP_SCHEMA);
    }
  });

  it("qualifies clean-migration table assertions with vocabflow_app", async () => {
    const absentQueries: CapturedQuery[] = [];
    await expect(assertApplicationTablesAbsent(applicationAssertionSql("0", absentQueries))).resolves.toBeUndefined();
    expect(absentQueries[0]?.text).toContain("table_schema::text = ?::text");
    expect(absentQueries[0]?.text).toContain("table_name::text = ANY(?::text[])");
    expect(absentQueries[0]?.values[0]).toBe(APP_SCHEMA);

    const presentQueries: CapturedQuery[] = [];
    await expect(assertApplicationTablesPresent(applicationAssertionSql(String(DATABASE_RESET_POLICY.applicationTables.length), presentQueries))).resolves.toBeUndefined();
    expect(presentQueries[0]?.values[0]).toBe(APP_SCHEMA);
    await expect(assertApplicationTablesPresent(applicationAssertionSql("3", []))).rejects.toThrow("APPLICATION_SCHEMA_INCOMPLETE");
  });

  it("fails state-zero validation when the application enum survives reset", async () => {
    await expect(assertApplicationTablesAbsent(applicationAssertionSql("0", [], "1"))).rejects.toThrow("APPLICATION_ENUM_TYPES_PRESENT");
  });

  it("resets only application tables and Drizzle state while preserving protected metadata", async () => {
    const statements: string[] = [];
    const unsafeFragments: string[] = [];
    const tx = ((strings: TemplateStringsArray, ..._values: unknown[]) => {
      const text = strings.join("?");
      statements.push(text);
      return Promise.resolve(text.includes("to_regclass") ? [{ exists: true }] : []);
    }) as unknown as { (strings: TemplateStringsArray, ...values: unknown[]): Promise<unknown[]>; unsafe(value: string): unknown };
    tx.unsafe = (value: string) => {
      unsafeFragments.push(value);
      return value;
    };
    const sql = {
      begin: async (operation: (transaction: typeof tx) => Promise<void>) => operation(tx)
    } as unknown as Parameters<typeof resetApplicationScope>[0];

    await resetApplicationScope(sql);

    expect(statements[0]).toContain("pg_advisory_xact_lock");
    expect(statements.filter((statement) => statement.includes("DROP TABLE IF EXISTS"))).toHaveLength(DATABASE_RESET_POLICY.applicationTables.length);
    const lastTableDrop = Math.max(...statements.map((statement, index) => statement.includes("DROP TABLE IF EXISTS") ? index : -1));
    const enumDrop = statements.findIndex((statement) => statement.includes("DROP TYPE IF EXISTS"));
    const migrationReset = statements.findIndex((statement) => statement.includes("TRUNCATE TABLE"));
    expect(enumDrop).toBeGreaterThan(lastTableDrop);
    expect(migrationReset).toBeGreaterThan(enumDrop);
    expect(statements.some((statement) => statement.includes("DROP SCHEMA"))).toBe(false);
    expect(statements.some((statement) => /DROP ROLE|GRANT|REVOKE/i.test(statement))).toBe(false);
    expect(unsafeFragments).toEqual([
      ...DATABASE_RESET_POLICY.applicationTables.map((objectName) => {
        const [schema, table] = objectName.split(".");
        return `"${schema}"."${table}"`;
      }),
      ...DATABASE_RESET_POLICY.applicationEnumTypes.map((objectName) => {
        const [schema, type] = objectName.split(".");
        return `"${schema}"."${type}"`;
      }),
      `"${MIGRATION_SCHEMA}"."__drizzle_migrations"`
    ]);
    expect(unsafeFragments.some((fragment) => fragment.includes("vocabflow_meta"))).toBe(false);
  });

  it("keeps Drizzle metadata separate and emits only schema-qualified application objects", () => {
    const schemaSource = readFileSync(join(process.cwd(), "apps", "api", "src", "db", "schema.ts"), "utf8");
    const migration = readFileSync(join(process.cwd(), "drizzle", "migrations", "0000_application-schema.sql"), "utf8");
    const householdMigration = readFileSync(join(process.cwd(), "drizzle", "migrations", "0001_curious_miss_america.sql"), "utf8");
    const learnerMigration = readFileSync(join(process.cwd(), "drizzle", "migrations", "0002_smiling_wrecking_crew.sql"), "utf8");
    const vocabularyMigration = readFileSync(join(process.cwd(), "drizzle", "migrations", "0003_lazy_lady_deathstrike.sql"), "utf8");
    const reviewMigration = readFileSync(join(process.cwd(), "drizzle", "migrations", "0004_scheduled_review_write.sql"), "utf8");
    const catalogMigration = readFileSync(join(process.cwd(), "drizzle", "migrations", "0005_graceful_eddie_brock.sql"), "utf8");
    const taxonomyMigration = readFileSync(join(process.cwd(), "drizzle", "migrations", "0006_sticky_risque.sql"), "utf8");
    const learningSetMigration = readFileSync(join(process.cwd(), "drizzle", "migrations", "0007_modern_mysterio.sql"), "utf8");
    const learnerSettingsMigration = readFileSync(join(process.cwd(), "drizzle", "migrations", "0008_chief_morph.sql"), "utf8");
    const activityMigration = readFileSync(join(process.cwd(), "drizzle", "migrations", "0009_tricky_meggan.sql"), "utf8");
    const gamificationMigration = readFileSync(join(process.cwd(), "drizzle", "migrations", "0010_gamification-rewards.sql"), "utf8");
    const exerciseXpMigration = readFileSync(join(process.cwd(), "drizzle", "migrations", "0011_exercise-correct-xp.sql"), "utf8");
    const masterV2Migration = readFileSync(join(process.cwd(), "drizzle", "migrations", "0015_clean_yellowjacket.sql"), "utf8");
    const journal = JSON.parse(readFileSync(join(process.cwd(), "drizzle", "migrations", "meta", "_journal.json"), "utf8")) as { entries: Array<{ idx: number; tag: string; when: number }> };
    const previousMigrationSnapshot = JSON.parse(readFileSync(join(process.cwd(), "drizzle", "migrations", "meta", "0012_snapshot.json"), "utf8")) as { id: string; prevId: string; [key: string]: unknown };
    const sequencePrivilegeSnapshot = JSON.parse(readFileSync(join(process.cwd(), "drizzle", "migrations", "meta", "0013_snapshot.json"), "utf8")) as { id: string; prevId: string; [key: string]: unknown };
    const masterV2Snapshot = JSON.parse(readFileSync(join(process.cwd(), "drizzle", "migrations", "meta", "0015_snapshot.json"), "utf8")) as { id: string; prevId: string; tables: Record<string, unknown>; [key: string]: unknown };
    const lastExistingSnapshot = JSON.parse(readFileSync(join(process.cwd(), "drizzle", "migrations", "meta", "0016_snapshot.json"), "utf8")) as { id: string; prevId: string; tables: Record<string, unknown>; [key: string]: unknown };
    const savedVocabularyMigration = readFileSync(join(process.cwd(), "drizzle", "migrations", "0017_nosy_hellfire_club.sql"), "utf8");
    const savedVocabularySnapshot = JSON.parse(readFileSync(join(process.cwd(), "drizzle", "migrations", "meta", "0017_snapshot.json"), "utf8")) as { id: string; prevId: string; tables: Record<string, { columns: Record<string, { type: string; notNull?: boolean }>; compositePrimaryKeys: Record<string, unknown>; foreignKeys: Record<string, unknown>; indexes: Record<string, unknown> }>; [key: string]: unknown };
    const dailyGoalsMigration = readFileSync(join(process.cwd(), "drizzle", "migrations", "0018_panoramic_spirit.sql"), "utf8");
    const dailyGoalsSnapshot = JSON.parse(readFileSync(join(process.cwd(), "drizzle", "migrations", "meta", "0018_snapshot.json"), "utf8")) as { id: string; prevId: string; tables: Record<string, { columns: Record<string, { type: string; notNull?: boolean; default?: number }>; checkConstraints?: Record<string, unknown> }>; [key: string]: unknown };
    const snapshot = JSON.parse(readFileSync(join(process.cwd(), "drizzle", "migrations", "meta", "0000_snapshot.json"), "utf8")) as {
      schemas: Record<string, string>;
      tables: Record<string, unknown>;
    };
    const reviewSnapshot = JSON.parse(readFileSync(join(process.cwd(), "drizzle", "migrations", "meta", "0004_snapshot.json"), "utf8")) as {
      tables: Record<string, {
        columns: Record<string, { type: string }>;
        compositePrimaryKeys: Record<string, unknown>;
      }>;
    };
    const taxonomySnapshot = JSON.parse(readFileSync(join(process.cwd(), "drizzle", "migrations", "meta", "0006_snapshot.json"), "utf8")) as {
      tables: Record<string, { columns: Record<string, { type: string; notNull?: boolean }>; compositePrimaryKeys: Record<string, unknown> }>;
      enums: Record<string, { values: string[] }>;
    };
    const learningSetSnapshot = JSON.parse(readFileSync(join(process.cwd(), "drizzle", "migrations", "meta", "0007_snapshot.json"), "utf8")) as {
      tables: Record<string, { columns: Record<string, { type: string; notNull?: boolean }>; compositePrimaryKeys: Record<string, unknown> }>;
    };
    const learnerSettingsSnapshot = JSON.parse(readFileSync(join(process.cwd(), "drizzle", "migrations", "meta", "0008_snapshot.json"), "utf8")) as {
      tables: Record<string, { columns: Record<string, { type: string; notNull?: boolean }> }>;
    };
    const activitySnapshot = JSON.parse(readFileSync(join(process.cwd(), "drizzle", "migrations", "meta", "0009_snapshot.json"), "utf8")) as {
      tables: Record<string, { columns: Record<string, { type: string; notNull?: boolean }> }>;
    };
    const dbCore = readFileSync(join(process.cwd(), "scripts", "db-core.ts"), "utf8");

    expect(schemaSource).toContain("pgSchema(APP_SCHEMA)");
    expect(schemaSource).not.toContain("pgTable(");
    expect(Object.keys(snapshot.schemas)).toEqual([APP_SCHEMA]);
    expect(Object.keys(snapshot.tables).every((table) => table.startsWith(`${APP_SCHEMA}.`))).toBe(true);
    expect(migration).not.toContain("CREATE SCHEMA");
    expect(migration).not.toContain('"public".');
    expect(migration).toContain(`CREATE TABLE "${APP_SCHEMA}"."user"`);
    expect(migration).toContain(`TO "vocabflow_runtime"`);
    expect(migration).toContain(`ALTER DEFAULT PRIVILEGES FOR ROLE "vocabflow_migration" IN SCHEMA "${APP_SCHEMA}"`);
    expect(householdMigration).toContain(`CREATE TYPE "${APP_SCHEMA}"."household_role" AS ENUM('OWNER', 'PARENT')`);
    expect(householdMigration).toContain(`CREATE TABLE "${APP_SCHEMA}"."households"`);
    expect(householdMigration).toContain(`CREATE TABLE "${APP_SCHEMA}"."household_members"`);
    expect(householdMigration).not.toMatch(/CREATE SCHEMA|CREATE ON DATABASE|vocabflow_meta/i);
    expect(learnerMigration).toContain(`CREATE TABLE "${APP_SCHEMA}"."learner_profiles"`);
    expect(learnerMigration).toContain(`REFERENCES "${APP_SCHEMA}"."households"("id") ON DELETE restrict`);
    expect(learnerMigration).toContain(`CREATE INDEX "learner_profiles_household_enabled_created_id_idx"`);
    expect(learnerMigration).not.toContain('UNIQUE("display_name")');
    expect(vocabularyMigration).toContain(`CREATE TABLE "${APP_SCHEMA}"."vocabularies"`);
    expect(vocabularyMigration).toContain(`CONSTRAINT "vocabularies_content_version_check"`);
    expect(vocabularyMigration).toContain("ON CONFLICT (\"id\") DO NOTHING");
    expect((vocabularyMigration.match(/\([0-9]+, '[^']+'/g) ?? [])).toHaveLength(30);
    expect(vocabularyMigration).not.toMatch(/household_id|learner_id|learner_progress|review_events/i);
    expect(reviewMigration).toContain(`CREATE TYPE "${APP_SCHEMA}"."learning_status" AS ENUM('NEW', 'LEARNING', 'MASTERED')`);
    expect(reviewMigration).toContain(`CREATE TYPE "${APP_SCHEMA}"."review_result" AS ENUM('REMEMBERED', 'FORGOTTEN')`);
    expect(reviewMigration).toContain(`CREATE TABLE "${APP_SCHEMA}"."learner_progress"`);
    expect(reviewMigration).toContain(`CREATE TABLE "${APP_SCHEMA}"."review_events"`);
    expect(reviewMigration).toContain('"household_id" uuid NOT NULL');
    expect(reviewMigration).toContain('CONSTRAINT "review_events_household_review_pk" PRIMARY KEY ("household_id","review_id")');
    expect(reviewMigration).toContain('"consecutive_correct" bigint');
    expect(reviewMigration).toContain('"revision" bigint');
    expect(reviewMigration).toContain('<= 9007199254740991');
    expect(reviewMigration).toContain(`UNIQUE("learner_id","vocabulary_id")`);
    expect(reviewMigration).toContain(`CREATE INDEX "${"learner_progress_learner_next_review_idx"}`);
    expect(reviewMigration).not.toMatch(/CREATE SCHEMA|DROP TABLE|vocabflow_meta/i);
    expect(catalogMigration).toContain(`ALTER TABLE "${APP_SCHEMA}"."vocabularies" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY`);
    expect(catalogMigration).toContain(`setval('${APP_SCHEMA}.vocabularies_id_seq'`);
    expect(catalogMigration).toContain(`ADD COLUMN "source_dataset" text`);
    expect(catalogMigration).toContain(`ADD COLUMN "source_record_id" integer`);
    expect(catalogMigration).toContain(`UNIQUE("source_dataset","source_record_id")`);
    expect(catalogMigration).not.toMatch(/DROP TABLE|TRUNCATE|DELETE FROM/i);
    expect(taxonomyMigration).toContain(`CREATE TYPE "${APP_SCHEMA}"."vocabulary_level" AS ENUM('GRADE_1', 'GRADE_2', 'GRADE_3', 'GRADE_4', 'GRADE_5', 'GENERAL')`);
    expect(taxonomyMigration).toContain(`ALTER TABLE "${APP_SCHEMA}"."vocabularies" ADD COLUMN "level" "${APP_SCHEMA}"."vocabulary_level"`);
    expect(taxonomyMigration).toContain(`CREATE TABLE "${APP_SCHEMA}"."topics"`);
    expect(taxonomyMigration).toContain(`CREATE TABLE "${APP_SCHEMA}"."vocabulary_topics"`);
    expect(taxonomyMigration).toContain(`CONSTRAINT "vocabulary_topics_vocabulary_topic_pk" PRIMARY KEY("vocabulary_id","topic_id")`);
    expect(taxonomyMigration).toContain(`INSERT INTO "${APP_SCHEMA}"."topics"`);
    expect(taxonomyMigration).toContain(`INSERT INTO "${APP_SCHEMA}"."vocabulary_topics"`);
    expect(taxonomyMigration).toContain("ON CONFLICT");
    expect(taxonomyMigration).not.toMatch(/DROP TABLE|TRUNCATE|DELETE FROM/i);
    expect(learningSetMigration).toContain(`CREATE TABLE "${APP_SCHEMA}"."learning_sets"`);
    expect(learningSetMigration).toContain(`CREATE TABLE "${APP_SCHEMA}"."learning_set_items"`);
    expect(learningSetMigration).toContain(`CREATE TABLE "${APP_SCHEMA}"."learner_learning_sets"`);
    expect(learningSetMigration).toContain("starter-vocabulary");
    expect(learningSetMigration).toContain("family-basics");
    expect(learningSetMigration).toContain("school-basics");
    expect(learningSetMigration).toContain("everyday-words");
    expect(learningSetMigration).toContain("ON CONFLICT");
    expect(learningSetMigration).not.toMatch(/DROP TABLE|TRUNCATE|DELETE FROM/i);
    expect(learnerSettingsMigration).toContain(`ALTER TABLE "${APP_SCHEMA}"."learner_profiles" ADD COLUMN "daily_new_word_limit" integer DEFAULT 10 NOT NULL`);
    expect(learnerSettingsMigration).toContain("learner_profiles_daily_new_word_limit_check");
    expect(learnerSettingsMigration).not.toMatch(/DROP TABLE|TRUNCATE|DELETE FROM/i);
    expect(activityMigration).toContain(`ALTER TABLE "${APP_SCHEMA}"."learner_profiles" ADD COLUMN "daily_learning_goal" integer DEFAULT 10 NOT NULL`);
    expect(activityMigration).toContain("learner_profiles_daily_learning_goal_check");
    expect(activityMigration).not.toMatch(/DROP TABLE|TRUNCATE|DELETE FROM/i);
    expect(gamificationMigration).toContain(`CREATE TABLE "${APP_SCHEMA}"."xp_events"`);
    expect(gamificationMigration).toContain(`CREATE TABLE "${APP_SCHEMA}"."achievements"`);
    expect(gamificationMigration).toContain(`CREATE TABLE "${APP_SCHEMA}"."learner_achievements"`);
    expect(gamificationMigration).toContain("xp_events_source_type_key_unique");
    expect(gamificationMigration).toContain("ON CONFLICT (\"code\") DO NOTHING");
    expect(gamificationMigration).not.toMatch(/DROP TABLE|TRUNCATE|DELETE FROM/i);
    expect(exerciseXpMigration).toContain("DROP CONSTRAINT \"xp_events_source_type_check\"");
    expect(exerciseXpMigration).toContain("'EXERCISE_CORRECT'");
    expect(exerciseXpMigration).not.toMatch(/DROP TABLE|TRUNCATE|DELETE FROM/i);
    const catalogSnapshot = JSON.parse(readFileSync(join(process.cwd(), "drizzle", "migrations", "meta", "0005_snapshot.json"), "utf8")) as {
      tables: Record<string, { columns: Record<string, { identity?: { type: string } }>; uniqueConstraints: Record<string, { columns: string[] }> }>;
    };
    const vocabularyTable = catalogSnapshot.tables[`${APP_SCHEMA}.vocabularies`];
    expect(vocabularyTable?.columns.id?.identity?.type).toBe("byDefault");
    expect(vocabularyTable?.uniqueConstraints.vocabularies_source_identity_unique.columns).toEqual(["source_dataset", "source_record_id"]);
    expect(taxonomySnapshot.enums[`${APP_SCHEMA}.vocabulary_level`]?.values).toEqual(["GRADE_1", "GRADE_2", "GRADE_3", "GRADE_4", "GRADE_5", "GENERAL"]);
    expect(taxonomySnapshot.tables[`${APP_SCHEMA}.vocabularies`]?.columns.level).toMatchObject({ type: "vocabulary_level", notNull: false });
    expect(taxonomySnapshot.tables[`${APP_SCHEMA}.vocabulary_topics`]?.compositePrimaryKeys.vocabulary_topics_vocabulary_topic_pk).toBeDefined();
    expect(learningSetSnapshot.tables[`${APP_SCHEMA}.learning_set_items`]?.compositePrimaryKeys.learning_set_items_set_vocabulary_pk).toBeDefined();
    expect(learningSetSnapshot.tables[`${APP_SCHEMA}.learner_learning_sets`]?.compositePrimaryKeys.learner_learning_sets_learner_set_pk).toBeDefined();
    expect(masterV2Snapshot.tables[`${APP_SCHEMA}.master_vocabulary_mappings`]).toBeDefined();
    expect(masterV2Snapshot.tables[`${APP_SCHEMA}.master_topic_mappings`]).toBeDefined();
    expect(masterV2Snapshot.tables[`${APP_SCHEMA}.master_learning_set_mappings`]).toBeDefined();
    expect(masterV2Snapshot.tables[`${APP_SCHEMA}.master_vocabulary_topic_memberships`]).toBeDefined();
    expect(masterV2Snapshot.tables[`${APP_SCHEMA}.master_learning_set_memberships`]).toBeDefined();
    expect(savedVocabularySnapshot.tables[`${APP_SCHEMA}.learner_saved_vocabulary`]?.columns.created_at).toMatchObject({ type: "timestamp with time zone", notNull: true });
    expect(savedVocabularySnapshot.tables[`${APP_SCHEMA}.learner_saved_vocabulary`]?.compositePrimaryKeys.learner_saved_vocabulary_learner_vocabulary_pk).toBeDefined();
    expect(savedVocabularySnapshot.tables[`${APP_SCHEMA}.learner_saved_vocabulary`]?.foreignKeys).toEqual(expect.objectContaining({
      learner_saved_vocabulary_learner_id_learner_profiles_id_fk: expect.any(Object),
      learner_saved_vocabulary_vocabulary_id_vocabularies_id_fk: expect.any(Object)
    }));
    expect(savedVocabularySnapshot.tables[`${APP_SCHEMA}.learner_saved_vocabulary`]?.indexes.learner_saved_vocabulary_learner_saved_at_idx).toBeDefined();
    expect(savedVocabularyMigration).toContain(`CREATE TABLE "${APP_SCHEMA}"."learner_saved_vocabulary"`);
    expect(savedVocabularyMigration).toContain('PRIMARY KEY("learner_id","vocabulary_id")');
    expect(savedVocabularyMigration).toContain('REFERENCES "vocabflow_app"."learner_profiles"');
    expect(savedVocabularyMigration).toContain('REFERENCES "vocabflow_app"."vocabularies"');
    expect(savedVocabularyMigration).toContain('CREATE INDEX "learner_saved_vocabulary_learner_saved_at_idx"');
    expect(savedVocabularyMigration).not.toMatch(/CREATE SCHEMA|DROP TABLE|vocabflow_meta/i);
    expect(dailyGoalsMigration).toContain(`ADD COLUMN "daily_new_word_goal" integer DEFAULT 10 NOT NULL`);
    expect(dailyGoalsMigration).toContain(`ADD COLUMN "daily_review_word_goal" integer DEFAULT 20 NOT NULL`);
    expect(dailyGoalsMigration).toContain("learner_profiles_daily_new_word_goal_check");
    expect(dailyGoalsMigration).toContain("learner_profiles_daily_review_word_goal_check");
    expect(dailyGoalsMigration).not.toMatch(/DROP|TRUNCATE|DELETE|RENAME/i);
    expect(learnerSettingsSnapshot.tables[`${APP_SCHEMA}.learner_profiles`]?.columns.daily_new_word_limit).toMatchObject({ type: "integer", notNull: true });
    expect(activitySnapshot.tables[`${APP_SCHEMA}.learner_profiles`]?.columns.daily_learning_goal).toMatchObject({ type: "integer", notNull: true });
    expect(reviewSnapshot.tables[`${APP_SCHEMA}.learner_progress`]?.columns.consecutive_correct.type).toBe("bigint");
    expect(reviewSnapshot.tables[`${APP_SCHEMA}.review_events`]?.columns.expected_revision.type).toBe("bigint");
    expect(reviewSnapshot.tables[`${APP_SCHEMA}.review_events`]?.compositePrimaryKeys.review_events_household_review_pk).toBeDefined();
    expect(journal.entries.map((entry) => entry.tag)).toEqual(["0000_application-schema", "0001_curious_miss_america", "0002_smiling_wrecking_crew", "0003_lazy_lady_deathstrike", "0004_scheduled_review_write", "0005_graceful_eddie_brock", "0006_sticky_risque", "0007_modern_mysterio", "0008_chief_morph", "0009_tricky_meggan", "0010_gamification-rewards", "0011_exercise-correct-xp", "0012_us41_owner_content_overrides", "0013_runtime-vocabulary-sequence-privilege", "0014_vietnamese_catalog_metadata", "0015_clean_yellowjacket", "0016_nostalgic_mattie_franklin", "0017_nosy_hellfire_club", "0018_panoramic_spirit", "0019_light_penance", "0020_learning_topic_review"]);
    const latestMigration = journal.entries.at(-1);
    const previousMigration = journal.entries.at(-2);
    expect(latestMigration).toMatchObject({ idx: 20, tag: "0020_learning_topic_review" });
    expect(latestMigration?.when).toBeGreaterThan(previousMigration?.when ?? 0);
    const { id: previousSnapshotId, prevId: previousSnapshotParent, ...previousSnapshotSchema } = previousMigrationSnapshot;
    const { id: currentSnapshotId, prevId: currentSnapshotParent, ...currentSnapshotSchema } = sequencePrivilegeSnapshot;
    expect(currentSnapshotParent).toBe(previousSnapshotId);
    expect(currentSnapshotId).not.toBe(previousSnapshotId);
    expect(previousSnapshotParent).toBeTruthy();
    expect(currentSnapshotSchema).toEqual(previousSnapshotSchema);
    expect(masterV2Snapshot.prevId).toBe(sequencePrivilegeSnapshot.id);
    expect(lastExistingSnapshot.prevId).toBe(masterV2Snapshot.id);
    expect(savedVocabularySnapshot.prevId).toBe(lastExistingSnapshot.id);
    expect(dailyGoalsSnapshot.prevId).toBe(savedVocabularySnapshot.id);
    expect(dailyGoalsSnapshot.tables[`${APP_SCHEMA}.learner_profiles`]?.columns.daily_new_word_goal).toMatchObject({ type: "integer", notNull: true, default: 10 });
    expect(dailyGoalsSnapshot.tables[`${APP_SCHEMA}.learner_profiles`]?.columns.daily_review_word_goal).toMatchObject({ type: "integer", notNull: true, default: 20 });
    expect(masterV2Migration).toContain(`CREATE TABLE "${APP_SCHEMA}"."master_vocabulary_mappings"`);
    expect(masterV2Migration).toContain(`CREATE TABLE "${APP_SCHEMA}"."master_vocabulary_import_runs"`);
    expect(masterV2Migration).toContain("ON DELETE no action ON UPDATE no action");
    expect(masterV2Migration).toContain("MASTER_MANAGED_VOCABULARY_WRITE_REQUIRES_IMPORTER");
    expect(masterV2Migration).toContain("MASTER_MAPPING_IDENTITY_IMMUTABLE");
    expect(masterV2Migration).not.toMatch(/DROP TABLE|TRUNCATE|DELETE FROM|ALTER TABLE[^;]+ADD COLUMN/i);
    expect(masterV2Migration).not.toMatch(/UPDATE "vocabflow_app"\."learner_progress"|UPDATE "vocabflow_app"\."review_events"/i);
    expect(dbCore).toContain("await executeApplicationMigrations(sql, options)");
  });

  it("grants only runtime USAGE on the existing and future application sequences", () => {
    const migration = readFileSync(join(process.cwd(), "drizzle", "migrations", "0013_runtime-vocabulary-sequence-privilege.sql"), "utf8");
    const statements = migration
      .split("--> statement-breakpoint")
      .map((statement) => statement.trim())
      .filter(Boolean);

    expect(statements).toEqual([
      `GRANT USAGE ON SEQUENCE "${APP_SCHEMA}"."vocabularies_id_seq" TO "vocabflow_runtime";`,
      `ALTER DEFAULT PRIVILEGES FOR ROLE "vocabflow_migration" IN SCHEMA "${APP_SCHEMA}" GRANT USAGE ON SEQUENCES TO "vocabflow_runtime";`,
    ]);
    expect(migration).not.toMatch(/\b(?:ALL|CREATE|SELECT|INSERT|UPDATE|DELETE|PUBLIC|drizzle|vocabflow_meta)\b/i);
    expect(migration).not.toMatch(/\b(?:GRANT|REVOKE)\b[^;]*\b(?:TABLES|SCHEMA)\b/i);
  });

  it("keeps household reset order dependency-safe", () => {
    const tables = DATABASE_RESET_POLICY.applicationTables;
    expect(tables.indexOf(`${APP_SCHEMA}.learner_profiles`)).toBeLessThan(tables.indexOf(`${APP_SCHEMA}.households`));
    expect(tables.indexOf(`${APP_SCHEMA}.household_members`)).toBeLessThan(tables.indexOf(`${APP_SCHEMA}.households`));
    expect(tables.indexOf(`${APP_SCHEMA}.households`)).toBeLessThan(tables.indexOf(`${APP_SCHEMA}.user`));
  });
});
