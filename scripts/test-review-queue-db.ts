import { randomInt, randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/postgres-js";
import {
  createReviewQueueService,
  ReviewQueueServiceError,
  type ReviewQueueDatabase
} from "../apps/api/src/review-queue";
import {
  createProgressSummaryService,
  ProgressSummaryServiceError,
  type ProgressSummaryDatabase
} from "../apps/api/src/progress-summary";
import {
  createLearnerVocabularyService,
  LearnerVocabularyServiceError,
  type LearnerVocabularyDatabase
} from "../apps/api/src/learner-vocabulary";
import {
  createResetLearnerProgressService,
  ResetLearnerProgressServiceError,
  type ResetLearnerProgressDatabase
} from "../apps/api/src/reset-learner-progress";
import type { ConnectionTarget, ReviewQueueResponse } from "@vocabflow/contracts";
import { assertApplicationTablesAbsent, assertMigrationStateZero, assertPostConnectIdentity, openSql } from "./db-core";
import { assertIdentitySnapshot, getIdentitySnapshot, resetApplicationScope } from "./db-reset-operations";

type SqlClient = ReturnType<typeof openSql>;

type Us08TrustedDbInput = {
  migrationUrl: string;
  runtimeUrl: string;
  migrationTarget: ConnectionTarget;
  runtimeTarget: ConnectionTarget;
};

type VocabularySpec = { id: number; enabled: boolean };

type Fixture = {
  ownerUserId: string;
  householdId: string;
  learnerId: string;
  vocabularyIds: number[];
  timezone: string;
};

type ProgressSpec = {
  status: "LEARNING" | "MASTERED";
  nextReviewDate: string;
  revision: number;
};

type Outcome<T> = { ok: true; value: T } | { ok: false; error: unknown };

const APP_SCHEMA = '"vocabflow_app"';
const USER_TABLE = `${APP_SCHEMA}."user"`;
const HOUSEHOLDS_TABLE = `${APP_SCHEMA}."households"`;
const MEMBERS_TABLE = `${APP_SCHEMA}."household_members"`;
const LEARNERS_TABLE = `${APP_SCHEMA}."learner_profiles"`;
const LEARNING_SETS_TABLE = `${APP_SCHEMA}."learning_sets"`;
const LEARNER_LEARNING_SETS_TABLE = `${APP_SCHEMA}."learner_learning_sets"`;
const VOCABULARY_TABLE = `${APP_SCHEMA}."vocabularies"`;
const PROGRESS_TABLE = `${APP_SCHEMA}."learner_progress"`;
const EVENTS_TABLE = `${APP_SCHEMA}."review_events"`;
const XP_EVENTS_TABLE = `${APP_SCHEMA}."xp_events"`;
const LEARNER_ACHIEVEMENTS_TABLE = `${APP_SCHEMA}."learner_achievements"`;
const FIXED_NOW = new Date("2026-09-15T01:00:00.000Z");
const CONTROLLED_REVIEW_DATE = "2026-09-14";
const ISOLATION_NEXT_REVIEW_DATE = "2026-09-15";
const FIXTURE_PREFIX = randomUUID().replaceAll("-", "");
const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER;
let fixtureNumber = 0;
let nextVocabularyId = randomInt(100_000_000, 1_000_000_000);

function mark(name: string) {
  console.log(`TRUSTED_DB_SUBSTAGE=us08-${name}`);
}

function fail(code: string): never {
  throw new Error(`US08_DB_${code}`);
}

function assert(condition: unknown, code: string): asserts condition {
  if (!condition) fail(code);
}

function allocateVocabulary(count: number): number[] {
  return Array.from({ length: count }, () => nextVocabularyId++);
}

async function enabledVocabularyIds(migration: SqlClient): Promise<number[]> {
  const rows = await migration<{ id: number }[]>`
    SELECT id
    FROM ${migration.unsafe(VOCABULARY_TABLE)}
    WHERE enabled = true
    ORDER BY id ASC
  `;
  const ids = rows.map((row) => Number(row.id));
  if (!ids.every(Number.isSafeInteger)) fail("BASELINE_VOCABULARY_IDS_INVALID");
  return ids;
}

async function seedFixture(
  migration: SqlClient,
  label: string,
  vocabulary: VocabularySpec[],
  timezone = "America/Los_Angeles",
): Promise<Fixture> {
  fixtureNumber += 1;
  const suffix = `${FIXTURE_PREFIX}-${fixtureNumber}-${label}`;
  const fixture = {
    ownerUserId: `trusted-db-us08-${suffix}`,
    householdId: randomUUID(),
    learnerId: randomUUID(),
    vocabularyIds: vocabulary.map((item) => item.id),
    timezone
  } satisfies Fixture;
  const email = `${fixture.ownerUserId}@example.invalid`;

  mark(`fixture-${label}`);
  await migration.begin(async (tx) => {
    await tx`
      INSERT INTO ${tx.unsafe(USER_TABLE)}
        (id, name, email, email_verified)
      VALUES (${fixture.ownerUserId}::text, ${label}::text, ${email}::text, true)
    `;
    await tx`
      INSERT INTO ${tx.unsafe(HOUSEHOLDS_TABLE)}
        (id, primary_owner_user_id, name, timezone)
      VALUES (${fixture.householdId}::uuid, ${fixture.ownerUserId}::text, ${label}::text, ${timezone}::text)
    `;
    await tx`
      INSERT INTO ${tx.unsafe(MEMBERS_TABLE)}
        (household_id, user_id)
      VALUES (${fixture.householdId}::uuid, ${fixture.ownerUserId}::text)
    `;
    await tx`
      INSERT INTO ${tx.unsafe(LEARNERS_TABLE)}
        (id, household_id, display_name, enabled)
      VALUES (${fixture.learnerId}::uuid, ${fixture.householdId}::uuid, ${label}::text, true)
    `;
    await tx`
      INSERT INTO ${tx.unsafe(LEARNER_LEARNING_SETS_TABLE)} (learner_id, learning_set_id, active)
      SELECT ${fixture.learnerId}::uuid, id, true
      FROM ${tx.unsafe(LEARNING_SETS_TABLE)}
      WHERE slug = 'starter-vocabulary' AND enabled = true
      ON CONFLICT (learner_id, learning_set_id) DO NOTHING
    `;
    for (const item of vocabulary) {
      await tx`
      INSERT INTO ${tx.unsafe(VOCABULARY_TABLE)}
          (id, word, vietnamese, enabled)
        VALUES (${item.id}::integer, ${`trusted-${label}-${item.id}`}::text, ${label}::text, ${item.enabled})
      `;
    }
  });
  return fixture;
}

async function addLearner(migration: SqlClient, fixture: Fixture, enabled: boolean, label: string) {
  const learnerId = randomUUID();
  await migration`
    INSERT INTO ${migration.unsafe(LEARNERS_TABLE)}
      (id, household_id, display_name, enabled)
    VALUES (${learnerId}::uuid, ${fixture.householdId}::uuid, ${label}::text, ${enabled})
  `;
  await migration`
    INSERT INTO ${migration.unsafe(LEARNER_LEARNING_SETS_TABLE)} (learner_id, learning_set_id, active)
    SELECT ${learnerId}::uuid, id, true
    FROM ${migration.unsafe(LEARNING_SETS_TABLE)}
    WHERE slug = 'starter-vocabulary' AND enabled = true
    ON CONFLICT (learner_id, learning_set_id) DO NOTHING
  `;
  return learnerId;
}

async function insertProgress(
  migration: SqlClient,
  fixture: Fixture,
  vocabularyId: number,
  state: ProgressSpec,
  learnerId = fixture.learnerId,
) {
  await migration`
    INSERT INTO ${migration.unsafe(PROGRESS_TABLE)}
      (learner_id, vocabulary_id, status, consecutive_correct, interval_days,
       first_learned_date, last_reviewed_date, next_review_date, total_correct,
       total_incorrect, revision)
    VALUES (
      ${learnerId}::uuid,
      ${vocabularyId}::integer,
      ${state.status}::text::"vocabflow_app"."learning_status",
      1::bigint,
      1::bigint,
      '2026-09-01'::date,
      '2026-09-14'::date,
      ${state.nextReviewDate}::date,
      1::bigint,
      0::bigint,
      ${String(state.revision)}::bigint
    )
  `;
}

async function isolateExistingVocabularyForLearner(
  migration: SqlClient,
  fixture: Fixture,
  vocabularyIds: readonly number[],
) {
  for (const vocabularyId of vocabularyIds) {
    await insertProgress(migration, fixture, vocabularyId, {
      status: "LEARNING",
      nextReviewDate: ISOLATION_NEXT_REVIEW_DATE,
      revision: 1
    });
  }
}

async function withQueue<T>(
  runtimeUrl: string,
  operation: (service: ReturnType<typeof createReviewQueueService>) => Promise<T>,
): Promise<T> {
  const connection = openSql(runtimeUrl);
  const database = drizzle(connection) as unknown as ReviewQueueDatabase;
  console.log("TRUSTED_DB_CONNECTION role=runtime operation=us08-review-queue");
  try {
    return await operation(createReviewQueueService(database, { now: () => FIXED_NOW }));
  } finally {
    await connection.end({ timeout: 5 });
  }
}

async function withProgress<T>(
  runtimeUrl: string,
  operation: (service: ReturnType<typeof createProgressSummaryService>) => Promise<T>,
): Promise<T> {
  const connection = openSql(runtimeUrl);
  const database = drizzle(connection) as unknown as ProgressSummaryDatabase;
  console.log("TRUSTED_DB_CONNECTION role=runtime operation=us20-progress-summary");
  try {
    return await operation(createProgressSummaryService(database, { now: () => FIXED_NOW }));
  } finally {
    await connection.end({ timeout: 5 });
  }
}

async function withLearnerVocabulary<T>(
  runtimeUrl: string,
  operation: (service: ReturnType<typeof createLearnerVocabularyService>) => Promise<T>,
): Promise<T> {
  const connection = openSql(runtimeUrl);
  const database = drizzle(connection) as unknown as LearnerVocabularyDatabase;
  console.log("TRUSTED_DB_CONNECTION role=runtime operation=us22-learner-vocabulary");
  try {
    return await operation(createLearnerVocabularyService(database));
  } finally {
    await connection.end({ timeout: 5 });
  }
}

async function withReset<T>(
  runtimeUrl: string,
  operation: (service: ReturnType<typeof createResetLearnerProgressService>) => Promise<T>,
): Promise<T> {
  const connection = openSql(runtimeUrl);
  const database = drizzle(connection) as unknown as ResetLearnerProgressDatabase;
  console.log("TRUSTED_DB_CONNECTION role=runtime operation=us24-reset-progress");
  try {
    return await operation(createResetLearnerProgressService(database));
  } finally {
    await connection.end({ timeout: 5 });
  }
}

async function capture<T>(promise: Promise<T>): Promise<Outcome<T>> {
  try {
    return { ok: true, value: await promise };
  } catch (error) {
    return { ok: false, error };
  }
}

async function expectDenied(
  runtimeUrl: string,
  userId: string,
  learnerId: string,
  code: string,
) {
  const outcome = await withQueue(runtimeUrl, (service) => capture(service.list(userId, learnerId)));
  assert(!outcome.ok, `${code}_LEAKED`);
  assert(outcome.error instanceof ReviewQueueServiceError, `${code}_WRONG_ERROR_TYPE`);
  assert(outcome.error.code === "HOUSEHOLD_ACCESS_DENIED", `${code}_WRONG_ERROR_CODE`);
  assert(outcome.error.status === 403, `${code}_WRONG_STATUS`);
}

async function expectProgressDenied(
  runtimeUrl: string,
  userId: string,
  learnerId: string,
  code: string,
) {
  const outcome = await withProgress(runtimeUrl, (service) => capture(service.get(userId, learnerId)));
  assert(!outcome.ok, code + "_LEAKED");
  assert(outcome.error instanceof ProgressSummaryServiceError, code + "_WRONG_ERROR_TYPE");
  assert(outcome.error.code === "HOUSEHOLD_ACCESS_DENIED", code + "_WRONG_ERROR_CODE");
  assert(outcome.error.status === 403, code + "_WRONG_STATUS");
}

async function expectLearnerVocabularyDenied(
  runtimeUrl: string,
  userId: string,
  learnerId: string,
  code: string,
) {
  const outcome = await withLearnerVocabulary(runtimeUrl, (service) => capture(service.list(userId, learnerId)));
  assert(!outcome.ok, code + "_LEAKED");
  assert(outcome.error instanceof LearnerVocabularyServiceError, code + "_WRONG_ERROR_TYPE");
  assert(outcome.error.code === "HOUSEHOLD_ACCESS_DENIED", code + "_WRONG_ERROR_CODE");
  assert(outcome.error.status === 403, code + "_WRONG_STATUS");
}

async function expectResetDenied(
  runtimeUrl: string,
  userId: string,
  learnerId: string,
  code: string,
) {
  const outcome = await withReset(runtimeUrl, (service) => capture(service.reset(userId, learnerId)));
  assert(!outcome.ok, code + "_LEAKED");
  assert(outcome.error instanceof ResetLearnerProgressServiceError, code + "_WRONG_ERROR_TYPE");
  assert(outcome.error.code === "HOUSEHOLD_ACCESS_DENIED", code + "_WRONG_ERROR_CODE");
  assert(outcome.error.status === 403, code + "_WRONG_STATUS");
}

function assertQueueItem(queue: ReviewQueueResponse, vocabularyId: number, queueType: "DUE" | "NEW", revision: number) {
  const item = queue.queue.find((candidate) => candidate.vocabulary.id === vocabularyId);
  assert(item, `QUEUE_ITEM_MISSING_${vocabularyId}`);
  assert(item.queueType === queueType, `QUEUE_ITEM_TYPE_${vocabularyId}`);
  assert(item.expectedRevision === revision, `QUEUE_ITEM_REVISION_${vocabularyId}`);
  if (queueType === "NEW") {
    assert(item.status === "NEW", `QUEUE_NEW_STATUS_${vocabularyId}`);
    assert(item.nextReviewDate === null, `QUEUE_NEW_DATE_${vocabularyId}`);
  }
}

type ExpectedNewSelection = {
  eligibleCount: number;
  vocabularyIds: number[];
};

async function expectedNewSelection(migration: SqlClient, learnerId: string): Promise<ExpectedNewSelection> {
  const [countRow] = await migration<{ eligible_count: string }[]>`
    SELECT count(*)::text AS eligible_count
    FROM ${migration.unsafe(VOCABULARY_TABLE)} v
    LEFT JOIN ${migration.unsafe(PROGRESS_TABLE)} lp
      ON lp.vocabulary_id = v.id
     AND lp.learner_id = ${learnerId}::uuid
    WHERE v.enabled = true
      AND lp.vocabulary_id IS NULL
  `;
  const rows = await migration<{ id: number }[]>`
    SELECT v.id
    FROM ${migration.unsafe(VOCABULARY_TABLE)} v
    LEFT JOIN ${migration.unsafe(PROGRESS_TABLE)} lp
      ON lp.vocabulary_id = v.id
     AND lp.learner_id = ${learnerId}::uuid
    WHERE v.enabled = true
      AND lp.vocabulary_id IS NULL
    ORDER BY v.id ASC
    LIMIT 10
  `;
  const eligibleCount = Number(countRow?.eligible_count ?? "0");
  const vocabularyIds = rows.map((row) => Number(row.id));
  if (!Number.isSafeInteger(eligibleCount) || eligibleCount < 0 || !vocabularyIds.every(Number.isSafeInteger)) {
    fail("AUTHORIZED_EXPECTED_NEW_STATE_INVALID");
  }
  return { eligibleCount, vocabularyIds };
}

function formatVocabularyIds(ids: readonly number[]) {
  return ids.length === 0 ? "<empty>" : ids.join(",");
}

export type CapQueueExpectation = {
  reviewDate: string;
  dueCount: number;
  newCount: number;
  returnedDueIds: number[];
  returnedNewIds: number[];
  queueIds: number[];
  newSuppressed: boolean;
};

export function buildCapQueueExpectation(
  reviewDate: string,
  expectedDueIds: readonly number[],
  expectedNewIds: readonly number[],
): CapQueueExpectation {
  const returnedDueIds = [...expectedDueIds].slice(0, 20);
  const returnedNewIds = expectedDueIds.length >= 20 ? [] : [...expectedNewIds].slice(0, 10);
  return {
    reviewDate,
    dueCount: expectedDueIds.length,
    newCount: expectedNewIds.length,
    returnedDueIds,
    returnedNewIds,
    queueIds: [...returnedDueIds, ...returnedNewIds],
    newSuppressed: expectedDueIds.length >= 20
  };
}

function assertCapQueue(label: string, queue: ReviewQueueResponse, expected: CapQueueExpectation) {
  const actualDueIds = queue.queue.filter((item) => item.queueType === "DUE").map((item) => item.vocabulary.id);
  const actualNewIds = queue.queue.filter((item) => item.queueType === "NEW").map((item) => item.vocabulary.id);
  const actualQueueIds = queue.queue.map((item) => item.vocabulary.id);
  const actualNewSuppressed = queue.dueCount >= 20;
  console.log(
    `TRUSTED_DB_${label}_EXPECTATION expected_review_date=${expected.reviewDate}`
      + ` actual_review_date=${queue.reviewDate} expected_due_count=${expected.dueCount}`
      + ` actual_due_count=${queue.dueCount} expected_new_count=${expected.newCount}`
      + ` actual_new_count=${queue.newCount} expected_returned_due_ids=${formatVocabularyIds(expected.returnedDueIds)}`
      + ` actual_returned_due_ids=${formatVocabularyIds(actualDueIds)}`
      + ` expected_returned_new_ids=${formatVocabularyIds(expected.returnedNewIds)}`
      + ` actual_returned_new_ids=${formatVocabularyIds(actualNewIds)}`
      + ` expected_queue_ids=${formatVocabularyIds(expected.queueIds)}`
      + ` actual_queue_ids=${formatVocabularyIds(actualQueueIds)}`
      + ` expected_queue_count=${expected.queueIds.length} actual_queue_count=${actualQueueIds.length}`
      + ` expected_new_suppressed=${expected.newSuppressed} actual_new_suppressed=${actualNewSuppressed}`,
  );
  assert(queue.reviewDate === expected.reviewDate, `${label}_REVIEW_DATE`);
  assert(queue.dueCount === expected.dueCount, `${label}_DUE_COUNT`);
  assert(queue.newCount === expected.newCount, `${label}_NEW_COUNT`);
  assert(actualDueIds.join(",") === expected.returnedDueIds.join(","), `${label}_DUE_ORDER_OR_CONTENT`);
  assert(actualNewIds.join(",") === expected.returnedNewIds.join(","), `${label}_NEW_ORDER_OR_CONTENT`);
  assert(actualQueueIds.join(",") === expected.queueIds.join(","), `${label}_QUEUE_ORDER_OR_CONTENT`);
  assert(actualNewSuppressed === expected.newSuppressed, `${label}_NEW_SUPPRESSION`);
}

async function stateSnapshot(migration: SqlClient, fixture: Fixture) {
  const [row] = await migration<{
    progress_count: string;
    event_count: string;
    vocabulary_count: string;
  }[]>`
    SELECT
      (SELECT count(*)::text FROM ${migration.unsafe(PROGRESS_TABLE)} WHERE learner_id = ${fixture.learnerId}::uuid) AS progress_count,
      (SELECT count(*)::text FROM ${migration.unsafe(EVENTS_TABLE)} WHERE household_id = ${fixture.householdId}::uuid) AS event_count,
      (SELECT count(*)::text FROM ${migration.unsafe(VOCABULARY_TABLE)} WHERE id = ANY(${migration.array(fixture.vocabularyIds)}::integer[])) AS vocabulary_count
  `;
  return {
    progress: row?.progress_count,
    events: row?.event_count,
    vocabulary: row?.vocabulary_count
  };
}

async function insertReviewHistory(
  migration: SqlClient,
  fixture: Fixture,
  learnerId: string,
  vocabularyId: number,
) {
  await migration`
    INSERT INTO ${migration.unsafe(EVENTS_TABLE)}
      (household_id, review_id, request_fingerprint, learner_id, vocabulary_id,
       result, previous_status, new_status, previous_interval, new_interval,
       expected_revision, resulting_revision, review_date, response_payload)
    VALUES (
      ${fixture.householdId}::uuid,
      ${randomUUID()}::uuid,
      'sha256:us24-reset'::text,
      ${learnerId}::uuid,
      ${vocabularyId}::integer,
      'REMEMBERED'::text::"vocabflow_app"."review_result",
      'NEW'::text::"vocabflow_app"."learning_status",
      'LEARNING'::text::"vocabflow_app"."learning_status",
      0::bigint,
      1::bigint,
      0::bigint,
      1::bigint,
      '2026-09-14'::date,
      '{"reviewId":"us24-reset"}'::jsonb
    )
  `;
}

async function cleanupFixture(migration: SqlClient, fixture: Fixture) {
  mark("fixture-cleanup");
  await migration.begin(async (tx) => {
    await tx`
      DELETE FROM ${tx.unsafe(LEARNER_ACHIEVEMENTS_TABLE)}
      WHERE learner_id IN (
        SELECT id FROM ${tx.unsafe(LEARNERS_TABLE)}
        WHERE household_id = ${fixture.householdId}::uuid
      )
    `;
    await tx`
      DELETE FROM ${tx.unsafe(XP_EVENTS_TABLE)}
      WHERE learner_id IN (
        SELECT id FROM ${tx.unsafe(LEARNERS_TABLE)}
        WHERE household_id = ${fixture.householdId}::uuid
      )
    `;
    await tx`DELETE FROM ${tx.unsafe(EVENTS_TABLE)} WHERE household_id = ${fixture.householdId}::uuid`;
    await tx`
      DELETE FROM ${tx.unsafe(LEARNER_LEARNING_SETS_TABLE)}
      WHERE learner_id IN (
        SELECT id FROM ${tx.unsafe(LEARNERS_TABLE)}
        WHERE household_id = ${fixture.householdId}::uuid
      )
    `;
    await tx`
      DELETE FROM ${tx.unsafe(PROGRESS_TABLE)}
      WHERE learner_id IN (
        SELECT id FROM ${tx.unsafe(LEARNERS_TABLE)}
        WHERE household_id = ${fixture.householdId}::uuid
      )
    `;
    await tx`DELETE FROM ${tx.unsafe(LEARNERS_TABLE)} WHERE household_id = ${fixture.householdId}::uuid`;
    await tx`DELETE FROM ${tx.unsafe(MEMBERS_TABLE)} WHERE household_id = ${fixture.householdId}::uuid`;
    await tx`DELETE FROM ${tx.unsafe(HOUSEHOLDS_TABLE)} WHERE id = ${fixture.householdId}::uuid`;
    await tx`DELETE FROM ${tx.unsafe(VOCABULARY_TABLE)} WHERE id = ANY(${tx.array(fixture.vocabularyIds)}::integer[])`;
    await tx`DELETE FROM ${tx.unsafe(USER_TABLE)} WHERE id = ${fixture.ownerUserId}::text`;
  });
  const [remaining] = await migration<{ xp_count: string; achievement_count: string; learner_count: string }[]>`
    SELECT
      (SELECT count(*)::text FROM ${migration.unsafe(XP_EVENTS_TABLE)} WHERE learner_id = ${fixture.learnerId}::uuid) AS xp_count,
      (SELECT count(*)::text FROM ${migration.unsafe(LEARNER_ACHIEVEMENTS_TABLE)} WHERE learner_id = ${fixture.learnerId}::uuid) AS achievement_count,
      (SELECT count(*)::text FROM ${migration.unsafe(LEARNERS_TABLE)} WHERE id = ${fixture.learnerId}::uuid) AS learner_count
  `;
  assert(remaining?.xp_count === "0", "CLEANUP_XP_ORPHAN");
  assert(remaining?.achievement_count === "0", "CLEANUP_ACHIEVEMENT_ORPHAN");
  assert(remaining?.learner_count === "0", "CLEANUP_LEARNER_REMAINS");
}

async function seedGamificationCleanupEvidence(migration: SqlClient, fixture: Fixture) {
  mark("gamification-cleanup-evidence");
  const [achievement] = await migration<{ id: number }[]>`
    SELECT id FROM ${migration.unsafe(`${APP_SCHEMA}."achievements"`)}
    WHERE code = 'FIRST_REVIEW'
    LIMIT 1
  `;
  assert(Number.isSafeInteger(achievement?.id), "CLEANUP_ACHIEVEMENT_CATALOG_MISSING");
  await migration.begin(async (tx) => {
    await tx`
      INSERT INTO ${tx.unsafe(XP_EVENTS_TABLE)} (learner_id, source_type, source_key, points)
      VALUES (${fixture.learnerId}::uuid, 'REVIEW', ${`cleanup-review:${fixture.learnerId}`}::text, 10)
    `;
    await tx`
      INSERT INTO ${tx.unsafe(LEARNER_ACHIEVEMENTS_TABLE)} (learner_id, achievement_id)
      VALUES (${fixture.learnerId}::uuid, ${achievement!.id}::integer)
    `;
  });
}

async function testAuthorization(migration: SqlClient, runtimeUrl: string, fixtures: Fixture[]) {
  mark("authorization-cases");
  const householdA = await seedFixture(migration, "auth-a", [{ id: nextVocabularyId++, enabled: true }]);
  const householdB = await seedFixture(migration, "auth-b", [{ id: nextVocabularyId++, enabled: true }]);
  fixtures.push(householdA, householdB);
  const disabledLearnerId = await addLearner(migration, householdA, false, "disabled-learner");

  const expected = await expectedNewSelection(migration, householdA.learnerId);
  const allowed = await withQueue(runtimeUrl, (service) => service.list(householdA.ownerUserId, householdA.learnerId));
  const actualIds = allowed.queue.map((item) => item.vocabulary.id);
  console.log(
    `TRUSTED_DB_AUTHORIZED_QUEUE_EXPECTATION expected_queue_count=${expected.vocabularyIds.length}`
      + ` actual_queue_count=${actualIds.length} eligible_new_count=${expected.eligibleCount}`
      + ` actual_due_count=${allowed.dueCount} actual_new_count=${allowed.newCount}`
      + ` expected_vocabulary_ids=${formatVocabularyIds(expected.vocabularyIds)}`
      + ` actual_vocabulary_ids=${formatVocabularyIds(actualIds)}`,
  );
  assert(allowed.learnerId === householdA.learnerId, "AUTHORIZED_LEARNER_ID_MISMATCH");
  assert(allowed.dueCount === 0, "AUTHORIZED_DUE_ITEMS_UNEXPECTED");
  assert(allowed.newCount === expected.eligibleCount, "AUTHORIZED_NEW_COUNT_MISMATCH");
  assert(actualIds.length === Math.min(expected.eligibleCount, 10), "AUTHORIZED_QUEUE_COUNT_MISMATCH");
  assert(actualIds.every((id, index) => id === expected.vocabularyIds[index]), "AUTHORIZED_QUEUE_ORDER_OR_CONTENT_MISMATCH");
  assert(allowed.queue.every((item) => item.queueType === "NEW" && item.status === "NEW" && item.expectedRevision === 0), "AUTHORIZED_NEW_ITEM_SHAPE_MISMATCH");
  await expectDenied(runtimeUrl, householdA.ownerUserId, householdB.learnerId, "CROSS_HOUSEHOLD");
  await expectDenied(runtimeUrl, householdA.ownerUserId, disabledLearnerId, "DISABLED_LEARNER");
  await expectDenied(runtimeUrl, householdA.ownerUserId, randomUUID(), "MISSING_LEARNER");
}

async function testQueueSemantics(migration: SqlClient, runtimeUrl: string, fixtures: Fixture[]) {
  mark("queue-semantics");
  // The migration seeds enabled global vocabulary rows. Isolate those rows
  // for this learner before adding the scenario-specific sparse-NEW rows so
  // this test proves queue semantics without depending on database-wide
  // fixture state left by earlier cases.
  const preExistingEnabledIds = await enabledVocabularyIds(migration);
  const ids = allocateVocabulary(8);
  const fixture = await seedFixture(migration, "semantics", ids.map((id, index) => ({
    id,
    enabled: index !== 4 && index !== 5
  })).reverse());
  fixtures.push(fixture);
  await isolateExistingVocabularyForLearner(migration, fixture, preExistingEnabledIds);
  // Deliberately insert the due rows in the opposite order from the expected
  // date/id order. The two 2026-09-13 rows also prove the secondary ID key.
  for (const [vocabularyId, state] of [
    [ids[2]!, { status: "LEARNING" as const, nextReviewDate: "2026-09-14", revision: MAX_SAFE_INTEGER }],
    [ids[1]!, { status: "MASTERED" as const, nextReviewDate: "2026-09-13", revision: 3_000_000_000 }],
    [ids[0]!, { status: "LEARNING" as const, nextReviewDate: "2026-09-13", revision: 3 }],
    [ids[3]!, { status: "LEARNING" as const, nextReviewDate: "2026-09-15", revision: 5 }],
    [ids[4]!, { status: "LEARNING" as const, nextReviewDate: "2026-09-13", revision: 7 }]
  ] as const) {
    await insertProgress(migration, fixture, vocabularyId, state);
  }

  const before = await stateSnapshot(migration, fixture);
  const queue = await withQueue(runtimeUrl, (service) => service.list(fixture.ownerUserId, fixture.learnerId));
  const after = await stateSnapshot(migration, fixture);
  const expectedReviewDate = CONTROLLED_REVIEW_DATE;
  const expectedDueIds = [ids[0]!, ids[1]!, ids[2]!];
  const expectedNewIds = [ids[6]!, ids[7]!];
  const expectedQueueIds = [...expectedDueIds, ...expectedNewIds];
  const actualDueIds = queue.queue.filter((item) => item.queueType === "DUE").map((item) => item.vocabulary.id);
  const actualNewIds = queue.queue.filter((item) => item.queueType === "NEW").map((item) => item.vocabulary.id);
  const actualQueueIds = queue.queue.map((item) => item.vocabulary.id);
  console.log(
    `TRUSTED_DB_QUEUE_SEMANTICS_EXPECTATION expected_review_date=${expectedReviewDate}`
      + ` actual_review_date=${queue.reviewDate} expected_due_count=${expectedDueIds.length}`
      + ` actual_due_count=${queue.dueCount} expected_new_count=${expectedNewIds.length}`
      + ` actual_new_count=${queue.newCount} expected_queue_count=${expectedQueueIds.length}`
      + ` actual_queue_count=${actualQueueIds.length}`
      + ` expected_due_ids=${formatVocabularyIds(expectedDueIds)}`
      + ` actual_due_ids=${formatVocabularyIds(actualDueIds)}`
      + ` expected_new_ids=${formatVocabularyIds(expectedNewIds)}`
      + ` actual_new_ids=${formatVocabularyIds(actualNewIds)}`
      + ` expected_queue_ids=${formatVocabularyIds(expectedQueueIds)}`
      + ` actual_queue_ids=${formatVocabularyIds(actualQueueIds)}`,
  );
  assert(queue.reviewDate === expectedReviewDate, "HOUSEHOLD_LOCAL_DATE");
  assert(queue.dueCount === expectedDueIds.length && queue.newCount === expectedNewIds.length, "QUEUE_COUNTS");
  assert(actualQueueIds.join(",") === expectedQueueIds.join(","), "QUEUE_ORDER");
  assertQueueItem(queue, ids[0]!, "DUE", 3);
  assertQueueItem(queue, ids[1]!, "DUE", 3_000_000_000);
  assertQueueItem(queue, ids[2]!, "DUE", MAX_SAFE_INTEGER);
  assertQueueItem(queue, ids[6]!, "NEW", 0);
  assertQueueItem(queue, ids[7]!, "NEW", 0);
  assert(!queue.queue.some((item) => item.vocabulary.id === ids[3]), "FUTURE_PROGRESS_LEAK");
  assert(!queue.queue.some((item) => item.vocabulary.id === ids[4]), "DISABLED_DUE_LEAK");
  assert(!queue.queue.some((item) => item.vocabulary.id === ids[5]), "DISABLED_NEW_LEAK");
  assert(JSON.stringify(before) === JSON.stringify(after), "QUEUE_READ_MUTATED_STATE");
}

async function testCapsAndSuppression(migration: SqlClient, runtimeUrl: string, fixtures: Fixture[]) {
  mark("caps-and-suppression");
  const preExistingEnabledIds19 = await enabledVocabularyIds(migration);
  const nineteenDue = allocateVocabulary(30);
  const fixture19 = await seedFixture(migration, "nineteen-due", nineteenDue.map((id) => ({ id, enabled: true })).reverse());
  fixtures.push(fixture19);
  await isolateExistingVocabularyForLearner(migration, fixture19, preExistingEnabledIds19);
  for (const vocabularyId of nineteenDue.slice(0, 19).reverse()) {
    await insertProgress(migration, fixture19, vocabularyId, { status: "LEARNING", nextReviewDate: CONTROLLED_REVIEW_DATE, revision: 1 });
  }
  const queue19 = await withQueue(runtimeUrl, (service) => service.list(fixture19.ownerUserId, fixture19.learnerId));
  const expectation19 = buildCapQueueExpectation(CONTROLLED_REVIEW_DATE, nineteenDue.slice(0, 19), nineteenDue.slice(19));
  assertCapQueue("DUE_19", queue19, expectation19);

  const preExistingEnabledIds20 = await enabledVocabularyIds(migration);
  const twentyDue = allocateVocabulary(21);
  const fixture20 = await seedFixture(migration, "twenty-due", twentyDue.map((id) => ({ id, enabled: true })).reverse());
  fixtures.push(fixture20);
  await isolateExistingVocabularyForLearner(migration, fixture20, preExistingEnabledIds20);
  for (const vocabularyId of twentyDue.slice(0, 20).reverse()) {
    await insertProgress(migration, fixture20, vocabularyId, { status: "LEARNING", nextReviewDate: CONTROLLED_REVIEW_DATE, revision: 1 });
  }
  const queue20 = await withQueue(runtimeUrl, (service) => service.list(fixture20.ownerUserId, fixture20.learnerId));
  const expectation20 = buildCapQueueExpectation(CONTROLLED_REVIEW_DATE, twentyDue.slice(0, 20), twentyDue.slice(20));
  assertCapQueue("DUE_20", queue20, expectation20);

  const preExistingEnabledIds21 = await enabledVocabularyIds(migration);
  const twentyOneDue = allocateVocabulary(21);
  const fixture21 = await seedFixture(migration, "twenty-one-due", twentyOneDue.map((id) => ({ id, enabled: true })).reverse());
  fixtures.push(fixture21);
  await isolateExistingVocabularyForLearner(migration, fixture21, preExistingEnabledIds21);
  // Reverse insertion makes the canonical first 20 assertion prove that
  // PostgreSQL orders before applying LIMIT 20.
  for (const vocabularyId of twentyOneDue.slice().reverse()) {
    await insertProgress(migration, fixture21, vocabularyId, { status: "LEARNING", nextReviewDate: CONTROLLED_REVIEW_DATE, revision: 1 });
  }
  const queue21 = await withQueue(runtimeUrl, (service) => service.list(fixture21.ownerUserId, fixture21.learnerId));
  const expectation21 = buildCapQueueExpectation(CONTROLLED_REVIEW_DATE, twentyOneDue, []);
  assertCapQueue("DUE_21", queue21, expectation21);
}

async function testProgressSummary(migration: SqlClient, runtimeUrl: string, fixtures: Fixture[]) {
  mark("progress-summary");
  const preExistingEnabledIds = await enabledVocabularyIds(migration);
  const ids = allocateVocabulary(7);
  const fixture = await seedFixture(migration, "progress-summary", ids.map((id, index) => ({
    id,
    enabled: index !== 3 && index !== 6
  })).reverse());
  fixtures.push(fixture);
  await isolateExistingVocabularyForLearner(migration, fixture, preExistingEnabledIds);
  await insertProgress(migration, fixture, ids[0]!, {
    status: "LEARNING",
    nextReviewDate: CONTROLLED_REVIEW_DATE,
    revision: 3
  });
  await insertProgress(migration, fixture, ids[1]!, {
    status: "MASTERED",
    nextReviewDate: "2026-09-13",
    revision: 4
  });
  await insertProgress(migration, fixture, ids[2]!, {
    status: "MASTERED",
    nextReviewDate: "2026-09-15",
    revision: 5
  });
  await insertProgress(migration, fixture, ids[3]!, {
    status: "LEARNING",
    nextReviewDate: "2026-09-13",
    revision: 6
  });

  const summary = await withProgress(runtimeUrl, (service) => service.get(fixture.ownerUserId, fixture.learnerId));
  const baselineCount = preExistingEnabledIds.length;
  assert(summary.newCount === 2, "SUMMARY_NEW_COUNT");
  assert(summary.learningCount === baselineCount + 2, "SUMMARY_LEARNING_COUNT");
  assert(summary.masteredCount === 2, "SUMMARY_MASTERED_COUNT");
  assert(summary.dueCount === 2, "SUMMARY_DUE_COUNT");
  assert(summary.learnedCount === baselineCount + 4, "SUMMARY_LEARNED_COUNT");
  console.log(
    "TRUSTED_DB_PROGRESS_SUMMARY_EXPECTATION"
      + " review_date=" + CONTROLLED_REVIEW_DATE
      + " new_count=" + summary.newCount
      + " learning_count=" + summary.learningCount
      + " mastered_count=" + summary.masteredCount
      + " due_count=" + summary.dueCount
      + " learned_count=" + summary.learnedCount,
  );

  const otherLearnerId = await addLearner(migration, fixture, true, "progress-summary-other");
  const otherSummary = await withProgress(runtimeUrl, (service) => service.get(fixture.ownerUserId, otherLearnerId));
  assert(otherSummary.newCount === baselineCount + 5, "SUMMARY_OTHER_NEW_COUNT");
  assert(otherSummary.learningCount === 0, "SUMMARY_OTHER_LEARNING_LEAK");
  assert(otherSummary.masteredCount === 0, "SUMMARY_OTHER_MASTERED_LEAK");
  assert(otherSummary.dueCount === 0, "SUMMARY_OTHER_DUE_LEAK");
  assert(otherSummary.learnedCount === 0, "SUMMARY_OTHER_LEARNED_LEAK");

  const foreignFixture = fixtures[1];
  assert(foreignFixture, "SUMMARY_FOREIGN_FIXTURE_MISSING");
  await expectProgressDenied(runtimeUrl, fixture.ownerUserId, foreignFixture.learnerId, "SUMMARY_CROSS_HOUSEHOLD");
}

async function testLearnerVocabulary(migration: SqlClient, runtimeUrl: string, fixtures: Fixture[]) {
  mark("learner-vocabulary");
  const ids = allocateVocabulary(4);
  const fixture = await seedFixture(migration, "learner-vocabulary", ids.map((id, index) => ({
    id,
    enabled: index !== 2
  })).reverse());
  fixtures.push(fixture);
  await insertProgress(migration, fixture, ids[0]!, {
    status: "LEARNING",
    nextReviewDate: "2026-09-20",
    revision: 2
  });
  await insertProgress(migration, fixture, ids[1]!, {
    status: "MASTERED",
    nextReviewDate: "2026-09-20",
    revision: 3
  });
  await insertProgress(migration, fixture, ids[2]!, {
    status: "LEARNING",
    nextReviewDate: CONTROLLED_REVIEW_DATE,
    revision: 4
  });

  const learnerA = await withLearnerVocabulary(runtimeUrl, (service) => service.list(fixture.ownerUserId, fixture.learnerId));
  const rowA = learnerA.find((item) => item.id === ids[0]);
  const rowMasteredA = learnerA.find((item) => item.id === ids[1]);
  const disabledA = learnerA.find((item) => item.id === ids[2]);
  const newA = learnerA.find((item) => item.id === ids[3]);
  assert(rowA?.status === "LEARNING", "VOCABULARY_LEARNING_STATUS");
  assert(rowMasteredA?.status === "MASTERED", "VOCABULARY_MASTERED_STATUS");
  assert(disabledA === undefined, "VOCABULARY_DISABLED_LEAK");
  assert(newA?.status === "NEW", "VOCABULARY_VIRTUAL_NEW_STATUS");
  assert(learnerA.every((item, index) => index === 0 || item.id > learnerA[index - 1]!.id), "VOCABULARY_ORDER");

  const otherLearnerId = await addLearner(migration, fixture, true, "learner-vocabulary-other");
  const learnerB = await withLearnerVocabulary(runtimeUrl, (service) => service.list(fixture.ownerUserId, otherLearnerId));
  const rowB = learnerB.find((item) => item.id === ids[0]);
  assert(rowB?.status === "NEW", "VOCABULARY_LEARNER_ISOLATION");

  const foreignFixture = fixtures[1];
  assert(foreignFixture, "VOCABULARY_FOREIGN_FIXTURE_MISSING");
  await expectLearnerVocabularyDenied(runtimeUrl, fixture.ownerUserId, foreignFixture.learnerId, "VOCABULARY_CROSS_HOUSEHOLD");
}

async function testResetProgress(migration: SqlClient, runtimeUrl: string, fixtures: Fixture[]) {
  mark("reset-progress");
  const preExistingEnabledIds = await enabledVocabularyIds(migration);
  const ids = allocateVocabulary(2);
  const fixture = await seedFixture(migration, "reset-progress", ids.map((id) => ({ id, enabled: true })));
  fixtures.push(fixture);
  const learnerB = await addLearner(migration, fixture, true, "reset-progress-b");

  await insertProgress(migration, fixture, ids[0]!, {
    status: "LEARNING",
    nextReviewDate: CONTROLLED_REVIEW_DATE,
    revision: 2
  });
  await insertProgress(migration, fixture, ids[0]!, {
    status: "MASTERED",
    nextReviewDate: "2026-09-20",
    revision: 7
  }, learnerB);
  await insertReviewHistory(migration, fixture, fixture.learnerId, ids[0]!);
  await insertReviewHistory(migration, fixture, learnerB, ids[0]!);

  const beforeB = await migration<{ progress_count: string; event_count: string }[]>`
    SELECT
      (SELECT count(*)::text FROM ${migration.unsafe(PROGRESS_TABLE)} WHERE learner_id = ${learnerB}::uuid) AS progress_count,
      (SELECT count(*)::text FROM ${migration.unsafe(EVENTS_TABLE)} WHERE learner_id = ${learnerB}::uuid) AS event_count
  `;
  const beforeAEvents = await migration<{ event_count: string }[]>`
    SELECT count(*)::text AS event_count
    FROM ${migration.unsafe(EVENTS_TABLE)}
    WHERE learner_id = ${fixture.learnerId}::uuid
  `;

  const firstReset = await withReset(runtimeUrl, (service) => service.reset(fixture.ownerUserId, fixture.learnerId));
  assert(firstReset.deletedProgressCount === 1, "RESET_DELETED_COUNT");
  const secondReset = await withReset(runtimeUrl, (service) => service.reset(fixture.ownerUserId, fixture.learnerId));
  assert(secondReset.deletedProgressCount === 0, "RESET_REPEAT_NOT_IDEMPOTENT");

  const summaryA = await withProgress(runtimeUrl, (service) => service.get(fixture.ownerUserId, fixture.learnerId));
  const summaryB = await withProgress(runtimeUrl, (service) => service.get(fixture.ownerUserId, learnerB));
  assert(summaryA.newCount === preExistingEnabledIds.length + 2, "RESET_A_NEW_COUNT");
  assert(summaryA.learningCount === 0 && summaryA.masteredCount === 0, "RESET_A_STATUS_COUNTS");
  assert(summaryA.dueCount === 0 && summaryA.learnedCount === 0, "RESET_A_LEARNED_COUNTS");
  assert(summaryB.newCount === preExistingEnabledIds.length + 1, "RESET_B_NEW_COUNT_CHANGED");
  assert(summaryB.learningCount === 0 && summaryB.masteredCount === 1, "RESET_B_STATUS_CHANGED");
  assert(summaryB.dueCount === 0 && summaryB.learnedCount === 1, "RESET_B_LEARNED_CHANGED");

  const queueA = await withQueue(runtimeUrl, (service) => service.list(fixture.ownerUserId, fixture.learnerId));
  const queueB = await withQueue(runtimeUrl, (service) => service.list(fixture.ownerUserId, learnerB));
  assert(queueA.queue.some((item) => item.vocabulary.id === ids[0] && item.queueType === "NEW" && item.expectedRevision === 0), "RESET_A_QUEUE_NOT_NEW");
  assert(!queueB.queue.some((item) => item.vocabulary.id === ids[0]), "RESET_B_QUEUE_CHANGED");
  assert(queueB.queue.some((item) => item.vocabulary.id === ids[1] && item.queueType === "NEW"), "RESET_B_NEW_QUEUE_MISSING");

  const vocabularyA = await withLearnerVocabulary(runtimeUrl, (service) => service.list(fixture.ownerUserId, fixture.learnerId));
  const vocabularyB = await withLearnerVocabulary(runtimeUrl, (service) => service.list(fixture.ownerUserId, learnerB));
  assert(vocabularyA.find((item) => item.id === ids[0])?.status === "NEW", "RESET_A_VOCABULARY_NOT_NEW");
  assert(vocabularyB.find((item) => item.id === ids[0])?.status === "MASTERED", "RESET_B_VOCABULARY_CHANGED");

  const afterB = await migration<{ progress_count: string; event_count: string }[]>`
    SELECT
      (SELECT count(*)::text FROM ${migration.unsafe(PROGRESS_TABLE)} WHERE learner_id = ${learnerB}::uuid) AS progress_count,
      (SELECT count(*)::text FROM ${migration.unsafe(EVENTS_TABLE)} WHERE learner_id = ${learnerB}::uuid) AS event_count
  `;
  const afterAEvents = await migration<{ event_count: string }[]>`
    SELECT count(*)::text AS event_count
    FROM ${migration.unsafe(EVENTS_TABLE)}
    WHERE learner_id = ${fixture.learnerId}::uuid
  `;
  assert(afterB[0]?.progress_count === beforeB[0]?.progress_count, "RESET_B_PROGRESS_DELETED");
  assert(afterB[0]?.event_count === beforeB[0]?.event_count, "RESET_B_HISTORY_DELETED");
  assert(afterAEvents[0]?.event_count === beforeAEvents[0]?.event_count, "RESET_A_HISTORY_DELETED");

  const foreignFixture = fixtures[1];
  assert(foreignFixture, "RESET_FOREIGN_FIXTURE_MISSING");
  await expectResetDenied(runtimeUrl, fixture.ownerUserId, foreignFixture.learnerId, "RESET_CROSS_HOUSEHOLD");
}

async function verifyReset(
  migrationUrl: string,
  migrationTarget: ConnectionTarget,
  beforeIdentity: Awaited<ReturnType<typeof getIdentitySnapshot>>,
) {
  mark("reset");
  const reset = openSql(migrationUrl);
  try {
    await assertPostConnectIdentity(reset, migrationTarget);
    await resetApplicationScope(reset);
    await assertMigrationStateZero(reset);
    await assertApplicationTablesAbsent(reset);
    await assertIdentitySnapshot(reset, beforeIdentity);
  } finally {
    await reset.end({ timeout: 5 });
  }
}

export async function runUs08TrustedDbSuite(input: Us08TrustedDbInput) {
  const migration = openSql(input.migrationUrl);
  const beforeIdentity = await getIdentitySnapshot(migration);
  const fixtures: Fixture[] = [];
  try {
    await assertPostConnectIdentity(migration, input.migrationTarget);
    const runtimeIdentity = openSql(input.runtimeUrl);
    try {
      await assertPostConnectIdentity(runtimeIdentity, input.runtimeTarget);
    } finally {
      await runtimeIdentity.end({ timeout: 5 });
    }
    await testAuthorization(migration, input.runtimeUrl, fixtures);
    await testQueueSemantics(migration, input.runtimeUrl, fixtures);
    await testProgressSummary(migration, input.runtimeUrl, fixtures);
    await testLearnerVocabulary(migration, input.runtimeUrl, fixtures);
    await testResetProgress(migration, input.runtimeUrl, fixtures);
    await testCapsAndSuppression(migration, input.runtimeUrl, fixtures);
    const cleanupFixture = fixtures[0];
    assert(cleanupFixture, "CLEANUP_FIXTURE_MISSING");
    await seedGamificationCleanupEvidence(migration, cleanupFixture);
  } finally {
    try {
      for (const fixture of fixtures.reverse()) await cleanupFixture(migration, fixture);
    } finally {
      await migration.end({ timeout: 5 });
      await verifyReset(input.migrationUrl, input.migrationTarget, beforeIdentity);
    }
  }
  console.log("TRUSTED_DB_US08_STATUS=PASS");
}

const invokedScript = process.argv[1]?.replaceAll("\\", "/") ?? "";
if (invokedScript.endsWith("/test-review-queue-db.ts") || invokedScript.endsWith("/test-review-queue-db.js")) {
  console.error("US08_DB_DIRECT_INVOCATION_NOT_SUPPORTED_USE_TEST_DB");
  process.exitCode = 1;
}
