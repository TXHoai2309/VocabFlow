import { assertPostConnectIdentity, openSql } from "./db-core";
import { applyCurationManifest, readManifest } from "./vocabulary-curation";
import type { CatalogMediaAvailabilityBySourceId } from "./import-vocabulary-catalog";
import type { ConnectionTarget } from "@vocabflow/contracts";

type SqlClient = ReturnType<typeof openSql>;
type CurationTrustedDbInput = {
  migrationUrl: string;
  runtimeUrl: string;
  migrationTarget: ConnectionTarget;
  runtimeTarget: ConnectionTarget;
};

const APP_SCHEMA = '"vocabflow_app"';
const VOCABULARY_TABLE = `${APP_SCHEMA}."vocabularies"`;
const ITEMS_TABLE = `${APP_SCHEMA}."learning_set_items"`;
const SETS_TABLE = `${APP_SCHEMA}."learning_sets"`;
const MEMBERSHIPS_TABLE = `${APP_SCHEMA}."vocabulary_topics"`;
const ASSIGNMENTS_TABLE = `${APP_SCHEMA}."learner_learning_sets"`;
const PROGRESS_TABLE = `${APP_SCHEMA}."learner_progress"`;
const REVIEWS_TABLE = `${APP_SCHEMA}."review_events"`;
const XP_TABLE = `${APP_SCHEMA}."xp_events"`;
const LEARNER_ACHIEVEMENTS_TABLE = `${APP_SCHEMA}."learner_achievements"`;
const SOURCE_DATASET = "2000_COMMON_ENGLISH_VOCABULARY_V1";

function mark(name: string) {
  console.log(`TRUSTED_DB_SUBSTAGE=us41-${name}`);
}

function fail(code: string): never {
  throw new Error(`US41_DB_${code}`);
}

function assert(condition: unknown, code: string): asserts condition {
  if (!condition) fail(code);
}

async function countRows(sql: SqlClient, table: string) {
  const [row] = await sql<{ count: string }[]>`SELECT count(*)::text AS count FROM ${sql.unsafe(table)}`;
  return Number(row?.count ?? 0);
}

export async function runUs41TrustedDbSuite(input: CurationTrustedDbInput) {
  const manifest = readManifest();
  const mediaAvailabilityBySourceId: CatalogMediaAvailabilityBySourceId = Object.fromEntries(
    manifest.records.map((record) => [record.sourceRecordId, {
      image: [953, 998, 987].includes(record.sourceRecordId) ? "MISSING" as const : "READY" as const,
      audio: "READY" as const
    }])
  );
  const migration = openSql(input.migrationUrl);
  const runtime = openSql(input.runtimeUrl);
  try {
    mark("identity");
    await assertPostConnectIdentity(migration, input.migrationTarget);
    await assertPostConnectIdentity(runtime, input.runtimeTarget);

    mark("seed-imported-fixture");
    await migration.begin(async (tx) => {
      for (const record of manifest.records) {
        const imageUrl = [953, 998, 987].includes(record.sourceRecordId) ? null : "https://media.invalid/image";
        await tx`
          INSERT INTO ${tx.unsafe(VOCABULARY_TABLE)}
            (word, vietnamese, definition_en, image_url, audio_url, enabled, content_version, source_dataset, source_record_id)
          VALUES
            (${record.expectedWord}, 'trusted fixture', 'Trusted US-41 fixture row', ${imageUrl}, 'https://media.invalid/audio', false, 1, ${SOURCE_DATASET}, ${record.sourceRecordId})
        `;
      }
    });

    const beforeProgress = await countRows(migration, PROGRESS_TABLE);
    const beforeReviews = await countRows(migration, REVIEWS_TABLE);
    const beforeXp = await countRows(migration, XP_TABLE);
    const beforeAchievements = await countRows(migration, LEARNER_ACHIEVEMENTS_TABLE);
    const beforeAssignments = await countRows(migration, ASSIGNMENTS_TABLE);

    mark("apply-first-run");
    const first = await applyCurationManifest(runtime, manifest, mediaAvailabilityBySourceId);
    assert(first.selectedRecords === 213, "SELECTED_RECORD_COUNT_INVALID");
    assert(first.newlyActivatedRecords === 213, "FIRST_RUN_ACTIVATION_COUNT_INVALID");
    assert(first.alreadyActiveRecords === 0, "FIRST_RUN_ALREADY_ACTIVE_INVALID");
    assert(first.learningSets === 11 && first.setMemberships === 213, "SET_ACTIVATION_COUNT_INVALID");

    const activated = await runtime<{ enabled: boolean; level: string | null; source_record_id: number; image_url: string | null }[]>`
      SELECT enabled, level::text, source_record_id, image_url FROM ${runtime.unsafe(VOCABULARY_TABLE)}
      WHERE source_dataset = ${SOURCE_DATASET}
      ORDER BY source_record_id
    `;
    assert(activated.length === 213 && activated.every((row) => row.enabled === true && ["GRADE_1", "GRADE_2", "GRADE_3"].includes(row.level ?? "")), "ACTIVATED_ROWS_INVALID");
    assert([953, 998, 987].every((id) => activated.find((row) => row.source_record_id === id)?.image_url === null), "MISSING_IMAGE_ROWS_NOT_ACTIVATED");
    const setRows = await runtime<{ slug: string; item_count: string }[]>`
      SELECT ls.slug, count(lsi.vocabulary_id)::text AS item_count
      FROM ${runtime.unsafe(SETS_TABLE)} ls
      LEFT JOIN ${runtime.unsafe(ITEMS_TABLE)} lsi ON lsi.learning_set_id = ls.id
      WHERE ls.slug = ANY(${runtime.array(manifest.learningSets.map((set) => set.slug))}::text[])
      GROUP BY ls.slug ORDER BY ls.slug
    `;
    assert(setRows.length === 11 && setRows.every((row) => Number(row.item_count) === (row.slug === "grade-2-feelings" ? 13 : 20)), "CURATED_SET_MEMBERSHIP_INVALID");
    const starterMemberships = await runtime<{ count: string }[]>`
      SELECT count(*)::text AS count FROM ${runtime.unsafe(MEMBERSHIPS_TABLE)} WHERE vocabulary_id BETWEEN 1 AND 30
    `;
    assert(Number(starterMemberships[0]?.count) === 38, "STARTER_TOPIC_MEMBERSHIP_INVALID");
    assert(await countRows(migration, ASSIGNMENTS_TABLE) === beforeAssignments, "LEARNER_ASSIGNMENTS_CHANGED");

    mark("apply-idempotent-rerun");
    const second = await applyCurationManifest(runtime, manifest, mediaAvailabilityBySourceId);
    assert(second.newlyActivatedRecords === 0 && second.alreadyActiveRecords === 213, "RERUN_NOT_IDEMPOTENT");
    assert(await countRows(migration, PROGRESS_TABLE) === beforeProgress, "PROGRESS_CHANGED");
    assert(await countRows(migration, REVIEWS_TABLE) === beforeReviews, "REVIEWS_CHANGED");
    assert(await countRows(migration, XP_TABLE) === beforeXp, "XP_CHANGED");
    assert(await countRows(migration, LEARNER_ACHIEVEMENTS_TABLE) === beforeAchievements, "ACHIEVEMENTS_CHANGED");
    assert(await countRows(migration, ASSIGNMENTS_TABLE) === beforeAssignments, "ASSIGNMENTS_CHANGED");
    console.log("TRUSTED_DB_US41_STATUS=PASS");
  } finally {
    try {
      await migration.begin(async (tx) => {
        await tx`DELETE FROM ${tx.unsafe(MEMBERSHIPS_TABLE)} WHERE vocabulary_id BETWEEN 1 AND 30`;
        await tx`DELETE FROM ${tx.unsafe(ITEMS_TABLE)} WHERE learning_set_id IN (SELECT id FROM ${tx.unsafe(SETS_TABLE)} WHERE slug = ANY(${tx.array(manifest.learningSets.map((set) => set.slug))}::text[]))`;
        await tx`DELETE FROM ${tx.unsafe(SETS_TABLE)} WHERE slug = ANY(${tx.array(manifest.learningSets.map((set) => set.slug))}::text[])`;
        await tx`DELETE FROM ${tx.unsafe(VOCABULARY_TABLE)} WHERE source_dataset = ${SOURCE_DATASET}`;
      });
    } finally {
      await Promise.all([migration.end({ timeout: 5 }), runtime.end({ timeout: 5 })]);
    }
  }
}
