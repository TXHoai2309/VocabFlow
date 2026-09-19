import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/postgres-js";
import type { ConnectionTarget } from "@vocabflow/contracts";
import { createLearnerService, type LearnerDatabase } from "../apps/api/src/learners";
import { createLearnerSettingsService, type LearnerSettingsDatabase } from "../apps/api/src/learner-settings";
import { createActivitySummaryService, type ActivitySummaryDatabase } from "../apps/api/src/activity-summary";
import { createResetLearnerProgressService, type ResetLearnerProgressDatabase } from "../apps/api/src/reset-learner-progress";
import { createReviewQueueService, type ReviewQueueDatabase } from "../apps/api/src/review-queue";
import { createReviewService, type ReviewDatabase } from "../apps/api/src/reviews";
import { assertPostConnectIdentity, openSql } from "./db-core";

type SqlClient = ReturnType<typeof openSql>;

type DailyNewWordLimitTrustedDbInput = {
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
const ASSIGNMENTS_TABLE = `${APP_SCHEMA}."learner_learning_sets"`;
const PROGRESS_TABLE = `${APP_SCHEMA}."learner_progress"`;
const EVENTS_TABLE = `${APP_SCHEMA}."review_events"`;
const FIXED_NOW = new Date("2026-09-14T03:00:00.000Z");

function mark(name: string) {
  console.log(`TRUSTED_DB_SUBSTAGE=us30-${name}`);
}

function fail(code: string): never {
  throw new Error(`US30_DB_${code}`);
}

function assert(condition: unknown, code: string): asserts condition {
  if (!condition) fail(code);
}

async function countRows(sql: SqlClient, table: string) {
  const rows = await sql<{ count: string }[]>`SELECT count(*)::text AS count FROM ${sql.unsafe(table)}`;
  return Number(rows[0]?.count ?? -1);
}

async function countFixtureEvents(sql: SqlClient, householdId: string) {
  const rows = await sql<{ count: string }[]>`
    SELECT count(*)::text AS count
    FROM ${sql.unsafe(EVENTS_TABLE)}
    WHERE household_id = ${householdId}::uuid
  `;
  return Number(rows[0]?.count ?? -1);
}

async function countFixtureProgress(sql: SqlClient, learnerId: string) {
  const rows = await sql<{ count: string }[]>`
    SELECT count(*)::text AS count
    FROM ${sql.unsafe(PROGRESS_TABLE)}
    WHERE learner_id = ${learnerId}::uuid
  `;
  return Number(rows[0]?.count ?? -1);
}

async function insertDueProgress(sql: SqlClient, learnerId: string, vocabularyId: number) {
  await sql`
    INSERT INTO ${sql.unsafe(PROGRESS_TABLE)}
      (learner_id, vocabulary_id, status, consecutive_correct, interval_days,
       first_learned_date, last_reviewed_date, next_review_date, total_correct,
       total_incorrect, revision)
    VALUES (
      ${learnerId}::uuid, ${vocabularyId}::integer,
      'LEARNING'::text::"vocabflow_app"."learning_status",
      1::bigint, 1::bigint, '2026-09-01'::date, '2026-09-13'::date,
      '2026-09-14'::date, 1::bigint, 0::bigint, 1::bigint
    )
  `;
}

async function runReview(
  reviewService: ReturnType<typeof createReviewService>,
  userId: string,
  learnerId: string,
  vocabularyId: number,
  expectedRevision: number,
  reviewId = randomUUID(),
  result: "REMEMBERED" | "FORGOTTEN" = "REMEMBERED",
) {
  return reviewService.write(userId, {
    reviewId,
    learnerId,
    vocabularyId,
    result,
    expectedRevision
  });
}

export async function runUs30TrustedDbSuite(input: DailyNewWordLimitTrustedDbInput) {
  const migration = openSql(input.migrationUrl);
  const runtime = openSql(input.runtimeUrl);
  const ownerUserId = `trusted-db-us30-owner-${randomUUID().replaceAll("-", "")}`;
  const outsiderUserId = `trusted-db-us30-outsider-${randomUUID().replaceAll("-", "")}`;
  const ownerEmail = `${ownerUserId}@example.invalid`;
  const outsiderEmail = `${outsiderUserId}@example.invalid`;
  const householdId = randomUUID();
  const outsiderHouseholdId = randomUUID();
  const existingLearnerId = randomUUID();
  const outsiderLearnerId = randomUUID();
  let newLearnerId = "";

  try {
    mark("migration-identity");
    await assertPostConnectIdentity(migration, input.migrationTarget);
    await assertPostConnectIdentity(runtime, input.runtimeTarget);
    const beforeVocabulary = await countRows(migration, `${APP_SCHEMA}."vocabularies"`);
    const beforeProgress = await countRows(migration, PROGRESS_TABLE);
    const beforeEvents = await countRows(migration, EVENTS_TABLE);
    assert(beforeVocabulary === 30, "BASELINE_VOCABULARY_ROWS_INVALID");

    mark("fixture-defaults-and-authorization");
    await migration.begin(async (tx) => {
      await tx`
        INSERT INTO ${tx.unsafe(USER_TABLE)} (id, name, email, email_verified)
        VALUES (${ownerUserId}, 'US30 owner', ${ownerEmail}, true),
               (${outsiderUserId}, 'US30 outsider', ${outsiderEmail}, true)
      `;
      await tx`
        INSERT INTO ${tx.unsafe(HOUSEHOLDS_TABLE)} (id, primary_owner_user_id, name, timezone)
        VALUES (${householdId}::uuid, ${ownerUserId}, 'US30 household', 'Asia/Ho_Chi_Minh'),
               (${outsiderHouseholdId}::uuid, ${outsiderUserId}, 'US30 outsider household', 'Asia/Ho_Chi_Minh')
      `;
      await tx`
        INSERT INTO ${tx.unsafe(MEMBERS_TABLE)} (household_id, user_id)
        VALUES (${householdId}::uuid, ${ownerUserId}), (${outsiderHouseholdId}::uuid, ${outsiderUserId})
      `;
      await tx`
        INSERT INTO ${tx.unsafe(LEARNERS_TABLE)} (id, household_id, display_name, enabled)
        VALUES (${existingLearnerId}::uuid, ${householdId}::uuid, 'US30 existing learner', true),
               (${outsiderLearnerId}::uuid, ${outsiderHouseholdId}::uuid, 'US30 outsider learner', true)
      `;
      await tx`
        INSERT INTO ${tx.unsafe(ASSIGNMENTS_TABLE)} (learner_id, learning_set_id, active)
        SELECT ${existingLearnerId}::uuid, id, true
        FROM ${tx.unsafe(`${APP_SCHEMA}."learning_sets"`)}
        WHERE slug = 'starter-vocabulary' AND enabled = true
        ON CONFLICT (learner_id, learning_set_id) DO UPDATE SET active = true
      `;
    });

    const runtimeDatabase = drizzle(runtime) as unknown as LearnerDatabase
      & LearnerSettingsDatabase
      & ReviewDatabase
      & ReviewQueueDatabase
      & ResetLearnerProgressDatabase
      & ActivitySummaryDatabase;
    const learnerService = createLearnerService(runtimeDatabase);
    const settingsService = createLearnerSettingsService(runtimeDatabase);
    const reviewService = createReviewService(runtimeDatabase, { now: () => FIXED_NOW });
    const queueService = createReviewQueueService(runtimeDatabase, { now: () => FIXED_NOW });
    const resetService = createResetLearnerProgressService(runtimeDatabase);
    const activityService = createActivitySummaryService(runtimeDatabase, { now: () => FIXED_NOW });

    const existingDefaults = await settingsService.get(ownerUserId, existingLearnerId);
    assert(existingDefaults.dailyNewWordLimit === 10, "EXISTING_LEARNER_DEFAULT_INVALID");
    assert(existingDefaults.dailyLearningGoal === 10, "EXISTING_LEARNING_GOAL_DEFAULT_INVALID");
    const created = await learnerService.create(ownerUserId, { displayName: "US30 new learner" });
    newLearnerId = created.id;
    const newDefaults = await settingsService.get(ownerUserId, newLearnerId);
    assert(newDefaults.dailyNewWordLimit === 10, "NEW_LEARNER_DEFAULT_INVALID");
    assert(newDefaults.dailyLearningGoal === 10, "NEW_LEARNING_GOAL_DEFAULT_INVALID");
    await expectForbidden(async () => settingsService.update(ownerUserId, outsiderLearnerId, { dailyNewWordLimit: 5 }));
    await expectForbidden(async () => settingsService.update(ownerUserId, outsiderLearnerId, { dailyLearningGoal: 5 }));
    const invalidSetting = await expectInvalidSetting(() => settingsService.update(ownerUserId, existingLearnerId, { dailyNewWordLimit: -1 }));
    assert(invalidSetting, "INVALID_SETTING_ACCEPTED");
    const invalidGoal = await expectInvalidSetting(() => settingsService.update(ownerUserId, existingLearnerId, { dailyLearningGoal: 0 }));
    assert(invalidGoal, "INVALID_LEARNING_GOAL_ACCEPTED");

    mark("due-exemption");
    await settingsService.update(ownerUserId, existingLearnerId, { dailyNewWordLimit: 0 });
    await insertDueProgress(migration, existingLearnerId, 30);
    const dueOnly = await queueService.list(ownerUserId, existingLearnerId);
    assert(dueOnly.queue.length === 1 && dueOnly.queue[0]?.queueType === "DUE", "DUE_BLOCKED_BY_LIMIT");

    mark("daily-consumption-and-retry");
    await settingsService.update(ownerUserId, existingLearnerId, { dailyNewWordLimit: 10 });
    for (const vocabularyId of [1, 2, 3, 4, 5, 6]) {
      await runReview(reviewService, ownerUserId, existingLearnerId, vocabularyId, 0);
    }
    const afterSix = await queueService.list(ownerUserId, existingLearnerId);
    assert(afterSix.queue.filter((item) => item.queueType === "NEW").length === 4, "REMAINING_ALLOWANCE_INVALID");
    const reinforcement = await runReview(reviewService, ownerUserId, existingLearnerId, 1, 1);
    assert(reinforcement.status === 201, "REINFORCEMENT_WRITE_INVALID");
    const eventsAfterReinforcement = await countFixtureEvents(migration, householdId);
    const replay = await runReview(
      reviewService,
      ownerUserId,
      existingLearnerId,
      1,
      1,
      reinforcement.response.reviewId as `${string}-${string}-${string}-${string}-${string}`
    );
    assert(replay.status === 200, "RETRY_NOT_IDEMPOTENT");
    assert(await countFixtureEvents(migration, householdId) === eventsAfterReinforcement, "RETRY_DOUBLE_COUNTED_EVENT");
    const afterRetry = await queueService.list(ownerUserId, existingLearnerId);
    assert(afterRetry.queue.filter((item) => item.queueType === "NEW").length === 4, "REINFORCEMENT_CONSUMED_ALLOWANCE");

    mark("daily-goal-and-streak-aggregation");
    await settingsService.update(ownerUserId, existingLearnerId, { dailyLearningGoal: 5 });
    const forgotten = await runReview(reviewService, ownerUserId, existingLearnerId, 3, 1, randomUUID(), "FORGOTTEN");
    assert(forgotten.status === 201, "FORGOTTEN_REVIEW_WRITE_INVALID");
    const sameDay = await activityService.get(ownerUserId, existingLearnerId);
    assert(sameDay.dailyGoal.reviewedUnique === 6, "UNIQUE_DAILY_ACTIVITY_INVALID");
    assert(sameDay.dailyGoal.completed && sameDay.dailyGoal.remaining === 0, "DAILY_GOAL_COMPLETION_INVALID");
    assert(sameDay.streak.currentStreak === 1 && sameDay.streak.longestStreak === 1, "SINGLE_DAY_STREAK_INVALID");
    const failedEvents = await countFixtureEvents(migration, householdId);
    try {
      await runReview(reviewService, ownerUserId, existingLearnerId, 4, 0);
      fail("FAILED_REVIEW_WAS_PERSISTED");
    } catch (error) {
      assert((error as { code?: string }).code === "STALE_REVISION", "FAILED_REVIEW_WRONG_ERROR");
    }
    assert(await countFixtureEvents(migration, householdId) === failedEvents, "FAILED_REVIEW_CHANGED_HISTORY");
    const nextDayReview = createReviewService(runtimeDatabase, { now: () => new Date("2026-09-14T17:00:00.000Z") });
    await runReview(nextDayReview, ownerUserId, existingLearnerId, 1, 2);
    const nextDayActivity = await createActivitySummaryService(runtimeDatabase, { now: () => new Date("2026-09-14T17:00:00.000Z") }).get(ownerUserId, existingLearnerId);
    assert(nextDayActivity.localDate === "2026-09-15", "LOCAL_DATE_BOUNDARY_INVALID");
    assert(nextDayActivity.dailyGoal.reviewedUnique === 1, "NEXT_DAY_ACTIVITY_INVALID");
    assert(nextDayActivity.streak.currentStreak === 2 && nextDayActivity.streak.longestStreak === 2, "CONSECUTIVE_STREAK_INVALID");
    const preservedActivity = await activityService.get(ownerUserId, existingLearnerId);

    mark("learner-isolation");
    await settingsService.update(ownerUserId, existingLearnerId, { dailyNewWordLimit: 5 });
    await settingsService.update(ownerUserId, newLearnerId, { dailyNewWordLimit: 10 });
    await runReview(reviewService, ownerUserId, newLearnerId, 10, 0);
    await runReview(reviewService, ownerUserId, newLearnerId, 11, 0);
    const learnerA = await queueService.list(ownerUserId, existingLearnerId);
    const learnerB = await queueService.list(ownerUserId, newLearnerId);
    assert(learnerA.queue.filter((item) => item.queueType === "NEW").length === 0, "LEARNER_A_LIMIT_NOT_ISOLATED");
    assert(learnerB.queue.filter((item) => item.queueType === "NEW").length === 8, "LEARNER_B_LIMIT_NOT_ISOLATED");

    mark("set-union-and-reassignment");
    await migration`
      INSERT INTO ${migration.unsafe(ASSIGNMENTS_TABLE)} (learner_id, learning_set_id, active)
      SELECT ${existingLearnerId}::uuid, id, true
      FROM ${migration.unsafe(`${APP_SCHEMA}."learning_sets"`)}
      WHERE slug = 'family-basics'
      ON CONFLICT (learner_id, learning_set_id) DO UPDATE SET active = true
    `;
    const unionQueue = await queueService.list(ownerUserId, existingLearnerId);
    const unionIds = unionQueue.queue.map((item) => item.vocabulary.id);
    assert(new Set(unionIds).size === unionIds.length, "DUPLICATE_SET_MEMBERSHIP_NOT_DEDUPED");
    await migration`
      UPDATE ${migration.unsafe(ASSIGNMENTS_TABLE)} SET active = false
      WHERE learner_id = ${existingLearnerId}::uuid
    `;
    const unassigned = await queueService.list(ownerUserId, existingLearnerId);
    assert(unassigned.queue.length === 0, "UNASSIGN_DID_NOT_REMOVE_QUEUE");
    assert(await countFixtureProgress(migration, existingLearnerId) === 7, "UNASSIGN_DELETED_PROGRESS");
    await migration`
      INSERT INTO ${migration.unsafe(ASSIGNMENTS_TABLE)} (learner_id, learning_set_id, active)
      SELECT ${existingLearnerId}::uuid, id, true
      FROM ${migration.unsafe(`${APP_SCHEMA}."learning_sets"`)}
      WHERE slug = 'starter-vocabulary' AND enabled = true
      ON CONFLICT (learner_id, learning_set_id) DO UPDATE SET active = true
    `;
    const reassigned = await queueService.list(ownerUserId, existingLearnerId);
    assert(!reassigned.queue.some((item) => [1, 2, 3, 4, 5, 6, 30].includes(item.vocabulary.id) && item.queueType === "NEW"), "REASSIGN_CREATED_FALSE_NEW");

    mark("local-midnight-and-reset");
    const beforeMidnight = await queueService.list(ownerUserId, existingLearnerId);
    const afterMidnight = await createReviewQueueService(runtimeDatabase, { now: () => new Date("2026-09-14T17:00:00.000Z") }).list(ownerUserId, existingLearnerId);
    assert(beforeMidnight.queue.filter((item) => item.queueType === "NEW").length === 0, "PRE_MIDNIGHT_ALLOWANCE_INVALID");
    assert(afterMidnight.queue.filter((item) => item.queueType === "NEW").length === 5, "LOCAL_MIDNIGHT_DID_NOT_RESET_ALLOWANCE");
    const eventsBeforeReset = await countFixtureEvents(migration, householdId);
    await resetService.reset(ownerUserId, existingLearnerId);
    assert(await countFixtureEvents(migration, householdId) === eventsBeforeReset, "RESET_DELETED_REVIEW_EVENTS");
    const afterReset = await queueService.list(ownerUserId, existingLearnerId);
    assert(afterReset.queue.filter((item) => item.queueType === "NEW").length === 5, "RESET_NEW_LIFECYCLE_INVALID");
    const afterResetActivity = await activityService.get(ownerUserId, existingLearnerId);
    assert(afterResetActivity.dailyGoal.reviewedUnique === preservedActivity.dailyGoal.reviewedUnique, "RESET_DELETED_DAILY_HISTORY");
    assert(afterResetActivity.streak.currentStreak === preservedActivity.streak.currentStreak, "RESET_DELETED_STREAK");

    const afterVocabulary = await countRows(migration, `${APP_SCHEMA}."vocabularies"`);
    const afterProgress = await countRows(migration, PROGRESS_TABLE);
    const afterEvents = await countRows(migration, EVENTS_TABLE);
    assert(afterVocabulary === beforeVocabulary, "VOCABULARY_ROWS_CHANGED");
    assert(afterProgress === beforeProgress + 2, "PROGRESS_BASELINE_CHANGED_UNEXPECTEDLY");
    assert(afterEvents === beforeEvents + 11, "REVIEW_EVENTS_COUNT_INVALID");
    console.log("TRUSTED_DB_US30_STATUS=PASS");
  } finally {
    try {
      await migration.begin(async (tx) => {
        await tx`DELETE FROM ${tx.unsafe(EVENTS_TABLE)} WHERE household_id IN (${householdId}::uuid, ${outsiderHouseholdId}::uuid)`;
        await tx`DELETE FROM ${tx.unsafe(ASSIGNMENTS_TABLE)} WHERE learner_id IN (${existingLearnerId}::uuid, ${outsiderLearnerId}::uuid, ${newLearnerId || randomUUID()}::uuid)`;
        await tx`DELETE FROM ${tx.unsafe(PROGRESS_TABLE)} WHERE learner_id IN (${existingLearnerId}::uuid, ${outsiderLearnerId}::uuid, ${newLearnerId || randomUUID()}::uuid)`;
        await tx`DELETE FROM ${tx.unsafe(LEARNERS_TABLE)} WHERE id IN (${existingLearnerId}::uuid, ${outsiderLearnerId}::uuid, ${newLearnerId || randomUUID()}::uuid)`;
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
  fail("CROSS_HOUSEHOLD_UPDATE_NOT_BLOCKED");
}

async function expectInvalidSetting(operation: () => Promise<unknown>) {
  try {
    await operation();
  } catch (error) {
    return (error as { code?: string }).code === "INVALID_REQUEST";
  }
  return false;
}
