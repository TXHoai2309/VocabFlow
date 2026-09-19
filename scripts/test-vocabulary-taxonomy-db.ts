import { randomUUID } from "node:crypto";
import { assertPostConnectIdentity, openSql } from "./db-core";
import type { ConnectionTarget } from "@vocabflow/contracts";

type SqlClient = ReturnType<typeof openSql>;

type TaxonomyTrustedDbInput = {
  migrationUrl: string;
  runtimeUrl: string;
  migrationTarget: ConnectionTarget;
  runtimeTarget: ConnectionTarget;
};

type VocabularyIdentity = {
  id: number;
  source_dataset: string | null;
  source_record_id: number | null;
  enabled: boolean;
};

const APP_SCHEMA = '"vocabflow_app"';
const VOCABULARY_TABLE = `${APP_SCHEMA}."vocabularies"`;
const TOPICS_TABLE = `${APP_SCHEMA}."topics"`;
const MEMBERSHIP_TABLE = `${APP_SCHEMA}."vocabulary_topics"`;
const PROGRESS_TABLE = `${APP_SCHEMA}."learner_progress"`;
const EVENTS_TABLE = `${APP_SCHEMA}."review_events"`;
const ROLLBACK_MARKER = "__VOCABFLOW_TAXONOMY_ROLLBACK__";

function mark(name: string) {
  console.log(`TRUSTED_DB_SUBSTAGE=us26-us27-${name}`);
}

function fail(code: string): never {
  throw new Error(`US26_US27_DB_${code}`);
}

function assert(condition: unknown, code: string): asserts condition {
  if (!condition) fail(code);
}

async function vocabularyIdentities(sql: SqlClient): Promise<VocabularyIdentity[]> {
  const rows = await sql<VocabularyIdentity[]>`
    SELECT id, source_dataset, source_record_id, enabled
    FROM ${sql.unsafe(VOCABULARY_TABLE)}
    ORDER BY id ASC
  `;
  return rows.map((row) => ({
    id: Number(row.id),
    source_dataset: row.source_dataset == null ? null : String(row.source_dataset),
    source_record_id: row.source_record_id == null ? null : Number(row.source_record_id),
    enabled: row.enabled === true
  }));
}

async function countRows(sql: SqlClient, table: string) {
  const rows = await sql<{ count: string }[]>`SELECT count(*)::text AS count FROM ${sql.unsafe(table)}`;
  return Number(rows[0]?.count ?? -1);
}

async function assertRollback(sql: SqlClient, operation: (tx: SqlClient) => Promise<void>) {
  try {
    await sql.begin(async (tx) => {
      await operation(tx as unknown as SqlClient);
      throw new Error(ROLLBACK_MARKER);
    });
  } catch (error) {
    if (error instanceof Error && error.message === ROLLBACK_MARKER) return;
    throw error;
  }
}

async function assertDuplicateMembership(tx: SqlClient, vocabularyId: number, topicId: number) {
  try {
    await tx`
      INSERT INTO ${tx.unsafe(MEMBERSHIP_TABLE)} (vocabulary_id, topic_id)
      VALUES (${vocabularyId}, ${topicId})
    `;
  } catch (error) {
    const candidate = error as { code?: string };
    if (candidate.code !== "23505") fail("DUPLICATE_MEMBERSHIP_NOT_REJECTED");
    return;
  }
  fail("DUPLICATE_MEMBERSHIP_NOT_REJECTED");
}

export async function runUs26Us27TrustedDbSuite(input: TaxonomyTrustedDbInput) {
  const migration = openSql(input.migrationUrl);
  const runtime = openSql(input.runtimeUrl);
  try {
    mark("migration-identity");
    await assertPostConnectIdentity(migration, input.migrationTarget);
    await assertPostConnectIdentity(runtime, input.runtimeTarget);

    const beforeVocabulary = await vocabularyIdentities(migration);
    const beforeProgress = await countRows(migration, PROGRESS_TABLE);
    const beforeEvents = await countRows(migration, EVENTS_TABLE);
    assert(beforeVocabulary.length === 30, "BASELINE_VOCABULARY_ROWS_INVALID");

    mark("level-nullability-and-filter");
    await assertRollback(migration, async (tx) => {
      await tx`
        UPDATE ${tx.unsafe(VOCABULARY_TABLE)}
        SET level = 'GRADE_1'::${tx.unsafe(APP_SCHEMA)}."vocabulary_level"
        WHERE id = 1
      `;
      await tx`
        UPDATE ${tx.unsafe(VOCABULARY_TABLE)}
        SET level = 'GENERAL'::${tx.unsafe(APP_SCHEMA)}."vocabulary_level"
        WHERE id = 2
      `;
      const nullable = await tx<{ id: number; level: string | null }[]>`
        SELECT id, level::text
        FROM ${tx.unsafe(VOCABULARY_TABLE)}
        WHERE id = 3
      `;
      assert(nullable.length === 1 && nullable[0]?.level == null, "NULL_LEVEL_NOT_PRESERVED");
      const gradeRows = await tx<{ id: number }[]>`
        SELECT id FROM ${tx.unsafe(VOCABULARY_TABLE)}
        WHERE enabled = true AND level = 'GRADE_1'::${tx.unsafe(APP_SCHEMA)}."vocabulary_level"
      `;
      assert(gradeRows.length === 1 && Number(gradeRows[0]?.id) === 1, "GRADE_FILTER_INVALID");
      const generalRows = await tx<{ id: number }[]>`
        SELECT id FROM ${tx.unsafe(VOCABULARY_TABLE)}
        WHERE enabled = true AND level = 'GENERAL'::${tx.unsafe(APP_SCHEMA)}."vocabulary_level"
      `;
      assert(generalRows.length === 1 && Number(generalRows[0]?.id) === 2, "GENERAL_FILTER_INVALID");
    });

    mark("topic-catalog-and-membership");
    await assertRollback(migration, async (tx) => {
      const suffix = randomUUID().replaceAll("-", "");
      const topicRows = await tx<{ id: number }[]>`
        INSERT INTO ${tx.unsafe(TOPICS_TABLE)} (slug, name, description, sort_order, enabled, source_topic)
        VALUES
          (${`trusted-${suffix}-a`}, 'Trusted A', 'Trusted taxonomy fixture', 1000, true, NULL),
          (${`trusted-${suffix}-b`}, 'Trusted B', 'Trusted taxonomy fixture', 1001, true, NULL),
          (${`trusted-${suffix}-disabled`}, 'Trusted Disabled', 'Trusted taxonomy fixture', 1002, false, NULL)
        RETURNING id
      `;
      const topicA = Number(topicRows[0]?.id);
      const topicB = Number(topicRows[1]?.id);
      const disabledTopic = Number(topicRows[2]?.id);
      assert(Number.isInteger(topicA) && Number.isInteger(topicB) && Number.isInteger(disabledTopic), "TOPIC_INSERT_FAILED");

      await tx`
        INSERT INTO ${tx.unsafe(MEMBERSHIP_TABLE)} (vocabulary_id, topic_id)
        VALUES (1, ${topicA}), (1, ${topicB}), (2, ${topicA})
      `;
      await assertDuplicateMembership(tx, 1, topicA);

      const multiTopicRows = await tx<{ id: number; topic_count: string }[]>`
        SELECT v.id, count(*)::text AS topic_count
        FROM ${tx.unsafe(VOCABULARY_TABLE)} v
        JOIN ${tx.unsafe(MEMBERSHIP_TABLE)} vt ON vt.vocabulary_id = v.id
        WHERE v.id = 1 AND vt.topic_id IN (${topicA}, ${topicB})
        GROUP BY v.id
      `;
      assert(multiTopicRows.length === 1 && Number(multiTopicRows[0]?.topic_count) === 2, "MULTI_TOPIC_MAPPING_INVALID");

      const enabledTopics = await tx<{ id: number }[]>`
        SELECT id FROM ${tx.unsafe(TOPICS_TABLE)}
        WHERE id IN (${topicA}, ${topicB}, ${disabledTopic}) AND enabled = true
        ORDER BY sort_order ASC, id ASC
      `;
      assert(enabledTopics.map((row) => Number(row.id)).join(",") === `${topicA},${topicB}`, "DISABLED_TOPIC_NOT_FILTERED");

      await tx`UPDATE ${tx.unsafe(VOCABULARY_TABLE)} SET enabled = false WHERE id = 2`;
      const enabledVocabulary = await tx<{ id: number }[]>`
        SELECT v.id
        FROM ${tx.unsafe(MEMBERSHIP_TABLE)} vt
        JOIN ${tx.unsafe(VOCABULARY_TABLE)} v ON v.id = vt.vocabulary_id
        WHERE vt.topic_id = ${topicA} AND v.enabled = true
        ORDER BY v.id ASC
      `;
      assert(enabledVocabulary.map((row) => Number(row.id)).join(",") === "1", "DISABLED_VOCABULARY_NOT_FILTERED");
    });

    mark("runtime-read-and-invariants");
    const runtimeTopics = await runtime<{ id: number }[]>`
      SELECT id FROM ${runtime.unsafe(TOPICS_TABLE)}
      WHERE enabled = true
      ORDER BY sort_order ASC, id ASC
    `;
    assert(runtimeTopics.length === 17, "SEEDED_TOPIC_CATALOG_INVALID");
    const afterVocabulary = await vocabularyIdentities(migration);
    const afterProgress = await countRows(migration, PROGRESS_TABLE);
    const afterEvents = await countRows(migration, EVENTS_TABLE);
    assert(JSON.stringify(afterVocabulary) === JSON.stringify(beforeVocabulary), "VOCABULARY_IDENTITIES_CHANGED");
    assert(afterProgress === beforeProgress, "LEARNER_PROGRESS_CHANGED");
    assert(afterEvents === beforeEvents, "REVIEW_EVENTS_CHANGED");
    console.log("TRUSTED_DB_US26_US27_STATUS=PASS");
  } finally {
    await Promise.all([
      migration.end({ timeout: 5 }),
      runtime.end({ timeout: 5 })
    ]);
  }
}
