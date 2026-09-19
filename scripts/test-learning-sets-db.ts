import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/postgres-js";
import { createLearningSetService, type LearningSetDatabase } from "../apps/api/src/learning-sets";
import { createReviewQueueService, type ReviewQueueDatabase } from "../apps/api/src/review-queue";
import { assertPostConnectIdentity, openSql } from "./db-core";
import type { ConnectionTarget } from "@vocabflow/contracts";

type SqlClient = ReturnType<typeof openSql>;
type TransactionClient = SqlClient & {
  savepoint<T>(operation: (tx: TransactionClient) => T | Promise<T>): Promise<T>;
};

type LearningSetsTrustedDbInput = {
  migrationUrl: string;
  runtimeUrl: string;
  migrationTarget: ConnectionTarget;
  runtimeTarget: ConnectionTarget;
};

const APP_SCHEMA = '"vocabflow_app"';
const USER_TABLE = `${APP_SCHEMA}."user"`;
const HOUSEHOLDS_TABLE = `${APP_SCHEMA}."households"`;
const MEMBERS_TABLE = `${APP_SCHEMA}."household_members"`;
const LEARNERS_TABLE = `${APP_SCHEMA}."learner_profiles"`;
const SETS_TABLE = `${APP_SCHEMA}."learning_sets"`;
const ITEMS_TABLE = `${APP_SCHEMA}."learning_set_items"`;
const ASSIGNMENTS_TABLE = `${APP_SCHEMA}."learner_learning_sets"`;
const VOCABULARY_TABLE = `${APP_SCHEMA}."vocabularies"`;
const PROGRESS_TABLE = `${APP_SCHEMA}."learner_progress"`;
const EVENTS_TABLE = `${APP_SCHEMA}."review_events"`;
function mark(name: string) {
  console.log(`TRUSTED_DB_SUBSTAGE=us28-us29-${name}`);
}

function fail(code: string): never {
  throw new Error(`US28_US29_DB_${code}`);
}

function assert(condition: unknown, code: string): asserts condition {
  if (!condition) fail(code);
}

async function countRows(sql: SqlClient, table: string) {
  const rows = await sql<{ count: string }[]>`SELECT count(*)::text AS count FROM ${sql.unsafe(table)}`;
  return Number(rows[0]?.count ?? -1);
}

async function duplicateAssignment(tx: TransactionClient, learnerId: string, setId: number) {
  try {
    await tx.savepoint(async (savepoint) => {
      await savepoint`
        INSERT INTO ${savepoint.unsafe(ASSIGNMENTS_TABLE)} (learner_id, learning_set_id, active)
        VALUES (${learnerId}::uuid, ${setId}, true)
      `;
    });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") return;
    throw error;
  }
  fail("DUPLICATE_ASSIGNMENT_NOT_REJECTED");
}

export async function runUs28Us29TrustedDbSuite(input: LearningSetsTrustedDbInput) {
  const migration = openSql(input.migrationUrl);
  const runtime = openSql(input.runtimeUrl);
  const ownerUserId = `trusted-db-us28-us29-${randomUUID().replaceAll("-", "")}`;
  const outsiderUserId = `trusted-db-us28-us29-outsider-${randomUUID().replaceAll("-", "")}`;
  const householdId = randomUUID();
  const outsiderHouseholdId = randomUUID();
  const learnerId = randomUUID();
  const outsiderLearnerId = randomUUID();
  const email = `${ownerUserId}@example.invalid`;
  const outsiderEmail = `${outsiderUserId}@example.invalid`;

  try {
    mark("migration-identity");
    await assertPostConnectIdentity(migration, input.migrationTarget);
    await assertPostConnectIdentity(runtime, input.runtimeTarget);

    const beforeVocabulary = await countRows(migration, VOCABULARY_TABLE);
    const beforeProgress = await countRows(migration, PROGRESS_TABLE);
    const beforeEvents = await countRows(migration, EVENTS_TABLE);
    assert(beforeVocabulary === 30, "BASELINE_VOCABULARY_ROWS_INVALID");

    mark("seeded-catalog-and-ordering");
    const sets = await runtime<{ id: number; slug: string; vocabulary_count: string }[]>`
      SELECT ls.id, ls.slug, count(lsi.vocabulary_id)::text AS vocabulary_count
      FROM ${runtime.unsafe(SETS_TABLE)} ls
      LEFT JOIN ${runtime.unsafe(ITEMS_TABLE)} lsi ON lsi.learning_set_id = ls.id
      WHERE ls.enabled = true
      GROUP BY ls.id, ls.slug, ls.sort_order
      ORDER BY ls.sort_order ASC, ls.id ASC
    `;
    assert(sets.map((row) => row.slug).join(",") === "starter-vocabulary,grade-1-starter,family-basics,school-basics,everyday-words", "STARTER_SET_CATALOG_INVALID");
    const defaultSetId = Number(sets.find((row) => row.slug === "starter-vocabulary")?.id);
    const familySetId = Number(sets.find((row) => row.slug === "family-basics")?.id);
    assert(Number.isInteger(defaultSetId) && Number.isInteger(familySetId), "STARTER_SET_IDS_INVALID");
    assert(Number(sets.find((row) => row.slug === "starter-vocabulary")?.vocabulary_count) === 30, "DEFAULT_SET_MEMBERSHIP_INVALID");
    const ordered = await runtime<{ vocabulary_id: number; sort_order: number }[]>`
      SELECT vocabulary_id, sort_order FROM ${runtime.unsafe(ITEMS_TABLE)}
      WHERE learning_set_id = ${defaultSetId}
      ORDER BY sort_order ASC, vocabulary_id ASC
    `;
    assert(ordered.length === 30 && ordered.every((row, index) => Number(row.vocabulary_id) === index + 1 && Number(row.sort_order) === index), "SET_ITEM_ORDER_INVALID");

    mark("fixture-and-constraints");
    await migration.begin(async (tx) => {
      await tx`
        INSERT INTO ${tx.unsafe(USER_TABLE)} (id, name, email, email_verified)
        VALUES (${ownerUserId}, 'US28/29 owner', ${email}, true), (${outsiderUserId}, 'US28/29 outsider', ${outsiderEmail}, true)
      `;
      await tx`
        INSERT INTO ${tx.unsafe(HOUSEHOLDS_TABLE)} (id, primary_owner_user_id, name, timezone)
        VALUES (${householdId}::uuid, ${ownerUserId}, 'US28/29 household', 'Asia/Ho_Chi_Minh'),
               (${outsiderHouseholdId}::uuid, ${outsiderUserId}, 'US28/29 outsider household', 'Asia/Ho_Chi_Minh')
      `;
      await tx`
        INSERT INTO ${tx.unsafe(MEMBERS_TABLE)} (household_id, user_id)
        VALUES (${householdId}::uuid, ${ownerUserId}), (${outsiderHouseholdId}::uuid, ${outsiderUserId})
      `;
      await tx`
        INSERT INTO ${tx.unsafe(LEARNERS_TABLE)} (id, household_id, display_name, enabled)
        VALUES (${learnerId}::uuid, ${householdId}::uuid, 'US28/29 learner', true),
               (${outsiderLearnerId}::uuid, ${outsiderHouseholdId}::uuid, 'US28/29 outsider learner', true)
      `;
      await tx`
        INSERT INTO ${tx.unsafe(ASSIGNMENTS_TABLE)} (learner_id, learning_set_id, active)
        VALUES (${learnerId}::uuid, ${defaultSetId}, true), (${learnerId}::uuid, ${familySetId}, true)
      `;
      await duplicateAssignment(tx as unknown as TransactionClient, learnerId, defaultSetId);
      await tx`
        INSERT INTO ${tx.unsafe(PROGRESS_TABLE)}
          (learner_id, vocabulary_id, status, consecutive_correct, interval_days, first_learned_date,
           last_reviewed_date, next_review_date, total_correct, total_incorrect, revision)
        VALUES (${learnerId}::uuid, 1, 'LEARNING'::text::${tx.unsafe(APP_SCHEMA)}."learning_status", 1::bigint, 1::bigint,
                '2026-09-01'::date, '2026-09-14'::date, '2026-09-14'::date, 1::bigint, 0::bigint, 4::bigint)
      `;
    });

    const runtimeDatabase = drizzle(runtime) as unknown as ReviewQueueDatabase & LearningSetDatabase;
    const learningSetService = createLearningSetService(runtimeDatabase);
    await expectForbidden(async () => learningSetService.listForLearner(outsiderUserId, learnerId));

    mark("queue-union-and-dedupe");
    const queue = await createReviewQueueService(runtimeDatabase, { now: () => new Date("2026-09-14T03:00:00.000Z") }).list(ownerUserId, learnerId);
    const queueIds = queue.queue.map((item) => item.vocabulary.id);
    assert(new Set(queueIds).size === queueIds.length, "DUPLICATE_VOCABULARY_IN_QUEUE");
    assert(queue.dueCount === 1 && queue.queue.some((item) => item.vocabulary.id === 1 && item.queueType === "DUE"), "ASSIGNED_DUE_QUEUE_INVALID");

    mark("unassign-preserves-progress");
    await migration`
      DELETE FROM ${migration.unsafe(ASSIGNMENTS_TABLE)}
      WHERE learner_id = ${learnerId}::uuid
    `;
    const emptyQueue = await createReviewQueueService(runtimeDatabase, { now: () => new Date("2026-09-14T03:00:00.000Z") }).list(ownerUserId, learnerId);
    assert(emptyQueue.dueCount === 0 && emptyQueue.newCount === 0 && emptyQueue.queue.length === 0, "UNASSIGNED_QUEUE_NOT_EMPTY");
    const preserved = await migration<{ status: string; revision: string }[]>`
      SELECT status::text, revision::text FROM ${migration.unsafe(PROGRESS_TABLE)}
      WHERE learner_id = ${learnerId}::uuid AND vocabulary_id = 1
    `;
    assert(preserved.length === 1 && preserved[0]?.status === "LEARNING" && preserved[0]?.revision === "4", "PROGRESS_NOT_PRESERVED");

    mark("reassign-reuses-progress");
    await migration`
      INSERT INTO ${migration.unsafe(ASSIGNMENTS_TABLE)} (learner_id, learning_set_id, active)
      VALUES (${learnerId}::uuid, ${defaultSetId}, true)
      ON CONFLICT (learner_id, learning_set_id) DO UPDATE SET active = true
    `;
    const reassignedQueue = await createReviewQueueService(runtimeDatabase, { now: () => new Date("2026-09-14T03:00:00.000Z") }).list(ownerUserId, learnerId);
    assert(reassignedQueue.queue.some((item) => item.vocabulary.id === 1 && item.expectedRevision === 4), "REASSIGN_DID_NOT_REUSE_PROGRESS");

    const afterVocabulary = await countRows(migration, VOCABULARY_TABLE);
    const afterProgress = await countRows(migration, PROGRESS_TABLE);
    const afterEvents = await countRows(migration, EVENTS_TABLE);
    assert(afterVocabulary === beforeVocabulary, "VOCABULARY_ROWS_CHANGED");
    assert(afterProgress === beforeProgress + 1, "PROGRESS_BASELINE_CHANGED_UNEXPECTEDLY");
    assert(afterEvents === beforeEvents, "REVIEW_EVENTS_CHANGED");
    console.log("TRUSTED_DB_US28_US29_STATUS=PASS");
  } finally {
    try {
      await migration.begin(async (tx) => {
        await tx`DELETE FROM ${tx.unsafe(ASSIGNMENTS_TABLE)} WHERE learner_id IN (${learnerId}::uuid, ${outsiderLearnerId}::uuid)`;
        await tx`DELETE FROM ${tx.unsafe(PROGRESS_TABLE)} WHERE learner_id = ${learnerId}::uuid`;
        await tx`DELETE FROM ${tx.unsafe(LEARNERS_TABLE)} WHERE id IN (${learnerId}::uuid, ${outsiderLearnerId}::uuid)`;
        await tx`DELETE FROM ${tx.unsafe(MEMBERS_TABLE)} WHERE household_id IN (${householdId}::uuid, ${outsiderHouseholdId}::uuid)`;
        await tx`DELETE FROM ${tx.unsafe(HOUSEHOLDS_TABLE)} WHERE id IN (${householdId}::uuid, ${outsiderHouseholdId}::uuid)`;
        await tx`DELETE FROM ${tx.unsafe(USER_TABLE)} WHERE id IN (${ownerUserId}, ${outsiderUserId})`;
      });
    } finally {
      await Promise.all([migration.end({ timeout: 5 }), runtime.end({ timeout: 5 })]);
    }
  }
}

async function expectForbidden(operation: () => Promise<unknown>) {
  try {
    await operation();
  } catch (error) {
    if ((error as { code?: string }).code === "HOUSEHOLD_ACCESS_DENIED") return;
    throw error;
  }
  fail("CROSS_HOUSEHOLD_ASSIGNMENT_NOT_BLOCKED");
}
