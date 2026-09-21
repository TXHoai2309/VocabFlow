import { randomInt, randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/postgres-js";
import { createReviewService, ReviewServiceError, type ReviewDatabase } from "../apps/api/src/reviews";
import type { ConnectionTarget } from "@vocabflow/contracts";
import { assertApplicationTablesAbsent, assertMigrationStateZero, assertPostConnectIdentity, openSql } from "./db-core";
import { assertIdentitySnapshot, getIdentitySnapshot, resetApplicationScope } from "./db-reset-operations";

type SqlClient = ReturnType<typeof openSql>;

type Us07TrustedDbInput = {
  migrationUrl: string;
  runtimeUrl: string;
  migrationTarget: ConnectionTarget;
  runtimeTarget: ConnectionTarget;
};

type Fixture = {
  ownerUserId: string;
  householdId: string;
  learnerId: string;
  vocabularyId: number;
  timezone: string;
};

type ProgressState = {
  status: "LEARNING" | "MASTERED";
  consecutiveCorrect: number;
  intervalDays: number;
  firstLearnedDate: string;
  lastReviewedDate: string;
  nextReviewDate: string;
  totalCorrect: number;
  totalIncorrect: number;
  revision: number;
};

type ProgressRow = ProgressState & {
  learner_id: string;
  vocabulary_id: number;
};

type EventRow = {
  household_id: string;
  review_id: string;
  request_fingerprint: string;
  learner_id: string;
  vocabulary_id: number;
  result: string;
  previous_status: string;
  new_status: string;
  previous_interval: number | string | bigint;
  new_interval: number | string | bigint;
  expected_revision: number | string | bigint;
  resulting_revision: number | string | bigint;
  review_date: string;
  reviewed_at: string | Date;
  response_payload: unknown;
};

type ReviewRequest = {
  reviewId: string;
  learnerId: string;
  vocabularyId: number;
  result: "REMEMBERED" | "FORGOTTEN";
  expectedRevision: number;
  exerciseSubmission?: { type: "TYPE_WORD"; answer: string };
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
const FIXED_NOW = new Date("2026-09-14T03:00:00.000Z");
const ROLLBACK_MARKER = "__VOCABFLOW_US07_ROLLBACK__";
const FIXTURE_PREFIX = randomUUID().replaceAll("-", "");
let fixtureNumber = 0;
let nextVocabularyId = randomInt(100_000_000, 1_000_000_000);

function mark(name: string) {
  console.log(`TRUSTED_DB_SUBSTAGE=us07-${name}`);
}

function fail(code: string): never {
  throw new Error(`US07_DB_${code}`);
}

function assert(condition: unknown, code: string): asserts condition {
  if (!condition) fail(code);
}

function scalar(value: unknown): string {
  if (typeof value === "bigint") return value.toString();
  return String(value);
}

function sqlState(error: unknown): string | undefined {
  const visited = new Set<unknown>();
  let current: unknown = error;
  while (current && typeof current === "object" && !visited.has(current) && visited.size < 8) {
    visited.add(current);
    const candidate = current as { code?: unknown; cause?: unknown };
    if (typeof candidate.code === "string" && /^[A-Z0-9]{5}$/.test(candidate.code)) return candidate.code;
    current = candidate.cause;
  }
  return undefined;
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function sameJson(left: unknown, right: unknown): boolean {
  return stableJson(left) === stableJson(right);
}

function nextIds(label: string) {
  fixtureNumber += 1;
  const suffix = `${FIXTURE_PREFIX}-${fixtureNumber}-${label}`;
  return {
    ownerUserId: `trusted-db-us07-${suffix}`,
    householdId: randomUUID(),
    learnerId: randomUUID(),
    vocabularyId: nextVocabularyId++
  };
}

async function seedFixture(migration: SqlClient, label: string, timezone = "Asia/Ho_Chi_Minh"): Promise<Fixture> {
  const ids = nextIds(label);
  const email = `${ids.ownerUserId}@example.invalid`;
  console.log("TRUSTED_DB_CONNECTION role=migration operation=us07-fixture-setup");
  await migration.begin(async (tx) => {
    await tx`
      INSERT INTO ${tx.unsafe(USER_TABLE)}
        (id, name, email, email_verified)
      VALUES (${ids.ownerUserId}::text, ${label}::text, ${email}::text, true)
    `;
    await tx`
      INSERT INTO ${tx.unsafe(HOUSEHOLDS_TABLE)}
        (id, primary_owner_user_id, name, timezone)
      VALUES (${ids.householdId}::uuid, ${ids.ownerUserId}::text, ${label}::text, ${timezone}::text)
    `;
    await tx`
      INSERT INTO ${tx.unsafe(MEMBERS_TABLE)}
        (household_id, user_id)
      VALUES (${ids.householdId}::uuid, ${ids.ownerUserId}::text)
    `;
    await tx`
      INSERT INTO ${tx.unsafe(LEARNERS_TABLE)}
        (id, household_id, display_name, enabled)
      VALUES (${ids.learnerId}::uuid, ${ids.householdId}::uuid, ${label}::text, true)
    `;
    await tx`
      INSERT INTO ${tx.unsafe(LEARNER_LEARNING_SETS_TABLE)} (learner_id, learning_set_id, active)
      SELECT ${ids.learnerId}::uuid, id, true
      FROM ${tx.unsafe(LEARNING_SETS_TABLE)}
      WHERE slug = 'starter-vocabulary' AND enabled = true
      ON CONFLICT (learner_id, learning_set_id) DO NOTHING
    `;
    await tx`
      INSERT INTO ${tx.unsafe(VOCABULARY_TABLE)}
        (id, word, vietnamese, enabled, content_version)
      VALUES (${ids.vocabularyId}::integer, ${`trusted-${label}`}::text, ${label}::text, true, 1)
    `;
  });
  return { ...ids, timezone };
}

async function insertProgress(migration: SqlClient, fixture: Fixture, state: ProgressState) {
  console.log("TRUSTED_DB_CONNECTION role=migration operation=us07-progress-setup");
  await migration`
    INSERT INTO ${migration.unsafe(PROGRESS_TABLE)}
      (learner_id, vocabulary_id, status, consecutive_correct, interval_days,
       first_learned_date, last_reviewed_date, next_review_date, total_correct,
       total_incorrect, revision)
    VALUES (
      ${fixture.learnerId}::uuid,
      ${fixture.vocabularyId}::integer,
      ${state.status}::text::"vocabflow_app"."learning_status",
      ${String(state.consecutiveCorrect)}::bigint,
      ${String(state.intervalDays)}::bigint,
      ${state.firstLearnedDate}::date,
      ${state.lastReviewedDate}::date,
      ${state.nextReviewDate}::date,
      ${String(state.totalCorrect)}::bigint,
      ${String(state.totalIncorrect)}::bigint,
      ${String(state.revision)}::bigint
    )
  `;
}

function makeRequest(
  fixture: Fixture,
  result: ReviewRequest["result"],
  expectedRevision: number,
  reviewId = randomUUID(),
): ReviewRequest {
  return {
    reviewId,
    learnerId: fixture.learnerId,
    vocabularyId: fixture.vocabularyId,
    result,
    expectedRevision
  };
}

async function withRuntimeService<T>(
  url: string,
  operation: (service: ReturnType<typeof createReviewService>, connection: SqlClient) => Promise<T>,
): Promise<T> {
  const connection = openSql(url);
  const database = drizzle(connection) as unknown as ReviewDatabase;
  console.log("TRUSTED_DB_CONNECTION role=runtime operation=us07-review");
  try {
    return await operation(createReviewService(database, { now: () => FIXED_NOW }), connection);
  } finally {
    await connection.end({ timeout: 5 });
  }
}

async function openRuntimeService(url: string) {
  const connection = openSql(url);
  const database = drizzle(connection) as unknown as ReviewDatabase;
  console.log("TRUSTED_DB_CONNECTION role=runtime operation=us07-concurrency");
  return { connection, service: createReviewService(database, { now: () => FIXED_NOW }) };
}

async function capture<T>(promise: Promise<T>): Promise<Outcome<T>> {
  try {
    return { ok: true, value: await promise };
  } catch (error) {
    return { ok: false, error };
  }
}

function expectReviewError<T>(outcome: Outcome<T>, code: string) {
  assert(!outcome.ok, `EXPECTED_${code}`);
  assert(outcome.error instanceof ReviewServiceError, `EXPECTED_${code}_SERVICE_ERROR`);
  assert(outcome.error.code === code, `EXPECTED_${code}_GOT_${outcome.error.code}`);
}

async function progressFor(migration: SqlClient, fixture: Fixture): Promise<ProgressRow | null> {
  const rows = await migration`
    SELECT learner_id::text AS learner_id,
           vocabulary_id,
           status::text AS status,
           consecutive_correct::text AS consecutive_correct,
           interval_days::text AS interval_days,
           first_learned_date::text AS first_learned_date,
           last_reviewed_date::text AS last_reviewed_date,
           next_review_date::text AS next_review_date,
           total_correct::text AS total_correct,
           total_incorrect::text AS total_incorrect,
           revision::text AS revision
    FROM ${migration.unsafe(PROGRESS_TABLE)}
    WHERE learner_id = ${fixture.learnerId}::uuid
      AND vocabulary_id = ${fixture.vocabularyId}::integer
  ` as unknown as Array<Record<string, unknown>>;
  const row = rows[0];
  if (!row) return null;
  return {
    learner_id: String(row.learner_id),
    vocabulary_id: Number(row.vocabulary_id),
    status: String(row.status) as ProgressState["status"],
    consecutiveCorrect: Number(scalar(row.consecutive_correct)),
    intervalDays: Number(scalar(row.interval_days)),
    firstLearnedDate: String(row.first_learned_date),
    lastReviewedDate: String(row.last_reviewed_date),
    nextReviewDate: String(row.next_review_date),
    totalCorrect: Number(scalar(row.total_correct)),
    totalIncorrect: Number(scalar(row.total_incorrect)),
    revision: Number(scalar(row.revision))
  };
}

async function eventsFor(migration: SqlClient, fixture: Fixture): Promise<EventRow[]> {
  return await migration`
    SELECT household_id::text AS household_id,
           review_id::text AS review_id,
           request_fingerprint,
           learner_id::text AS learner_id,
           vocabulary_id,
           result::text AS result,
           previous_status::text AS previous_status,
           new_status::text AS new_status,
           previous_interval::text AS previous_interval,
           new_interval::text AS new_interval,
           expected_revision::text AS expected_revision,
           resulting_revision::text AS resulting_revision,
           review_date::text AS review_date,
           reviewed_at,
           response_payload
    FROM ${migration.unsafe(EVENTS_TABLE)}
    WHERE learner_id = ${fixture.learnerId}::uuid
      AND vocabulary_id = ${fixture.vocabularyId}::integer
    ORDER BY created_at, review_id
  ` as unknown as EventRow[];
}

async function eventFor(migration: SqlClient, fixture: Fixture, reviewId: string): Promise<EventRow | null> {
  const rows = await migration`
    SELECT household_id::text AS household_id,
           review_id::text AS review_id,
           request_fingerprint,
           learner_id::text AS learner_id,
           vocabulary_id,
           result::text AS result,
           previous_status::text AS previous_status,
           new_status::text AS new_status,
           previous_interval::text AS previous_interval,
           new_interval::text AS new_interval,
           expected_revision::text AS expected_revision,
           resulting_revision::text AS resulting_revision,
           review_date::text AS review_date,
           reviewed_at,
           response_payload
    FROM ${migration.unsafe(EVENTS_TABLE)}
    WHERE household_id = ${fixture.householdId}::uuid
      AND review_id = ${reviewId}::uuid
  ` as unknown as EventRow[];
  return rows[0] ?? null;
}

async function assertCanonicalEvent(
  migration: SqlClient,
  fixture: Fixture,
  request: ReviewRequest,
  result: { response: unknown },
  expectedReviewDate: string,
) {
  const event = await eventFor(migration, fixture, request.reviewId);
  assert(event, "EVENT_MISSING");
  assert(event.household_id === fixture.householdId, "EVENT_HOUSEHOLD_MISMATCH");
  assert(event.review_id === request.reviewId.toLowerCase(), "EVENT_REVIEW_ID_NOT_CANONICAL");
  assert(event.learner_id === fixture.learnerId, "EVENT_LEARNER_MISMATCH");
  assert(event.vocabulary_id === fixture.vocabularyId, "EVENT_VOCABULARY_MISMATCH");
  assert(event.review_date === expectedReviewDate, "EVENT_REVIEW_DATE_MISMATCH");
  assert(event.reviewed_at !== null && event.reviewed_at !== undefined, "EVENT_REVIEWED_AT_MISSING");
  assert(sameJson(event.response_payload, result.response), "EVENT_RESPONSE_PAYLOAD_MISMATCH");
}

async function assertLiveSchema(migration: SqlClient) {
  mark("live-schema");
  console.log("TRUSTED_DB_CONNECTION role=migration operation=us07-schema-inspection");
  const columns = await migration<{
    table_name: string;
    column_name: string;
    udt_name: string;
    is_nullable: string;
  }[]>`
    SELECT table_name, column_name, udt_name, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'vocabflow_app'
      AND table_name IN ('learner_progress', 'review_events')
    ORDER BY table_name, ordinal_position
  `;
  const columnType = (table: string, column: string) => columns.find((item) => item.table_name === table && item.column_name === column);
  for (const [table, column] of [
    ["learner_progress", "consecutive_correct"],
    ["learner_progress", "interval_days"],
    ["learner_progress", "total_correct"],
    ["learner_progress", "total_incorrect"],
    ["learner_progress", "revision"],
    ["review_events", "previous_interval"],
    ["review_events", "new_interval"],
    ["review_events", "expected_revision"],
    ["review_events", "resulting_revision"]
  ]) {
    assert(columnType(table, column)?.udt_name === "int8", `BIGINT_${table}_${column}`);
  }
  assert(columnType("learner_progress", "vocabulary_id")?.udt_name === "int4", "PROGRESS_VOCABULARY_NOT_INTEGER");
  assert(columnType("review_events", "vocabulary_id")?.udt_name === "int4", "EVENT_VOCABULARY_NOT_INTEGER");

  const constraints = await migration<{ table_name: string; constraint_name: string; constraint_type: string; definition: string }[]>`
    SELECT c.relname AS table_name,
           con.conname AS constraint_name,
           CASE con.contype
             WHEN 'p' THEN 'PRIMARY KEY'
             WHEN 'u' THEN 'UNIQUE'
             WHEN 'f' THEN 'FOREIGN KEY'
             WHEN 'c' THEN 'CHECK'
             ELSE con.contype::text
           END AS constraint_type,
           pg_get_constraintdef(con.oid) AS definition
    FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'vocabflow_app'
      AND c.relname IN ('learner_progress', 'review_events', 'xp_events')
  `;
  const hasConstraint = (name: string, type?: string) => constraints.some((item) => item.constraint_name === name && (!type || item.constraint_type === type));
  assert(hasConstraint("review_events_household_review_pk", "PRIMARY KEY"), "EVENT_COMPOSITE_PRIMARY_KEY_MISSING");
  const primary = constraints.find((item) => item.constraint_name === "review_events_household_review_pk");
  assert(primary?.definition.replaceAll(" ", "").toLowerCase().includes("(household_id,review_id)"), "EVENT_PRIMARY_KEY_NOT_SCOPED");
  assert(hasConstraint("learner_progress_learner_vocabulary_unique", "UNIQUE"), "PROGRESS_UNIQUE_KEY_MISSING");
  for (const name of [
    "learner_progress_consecutive_correct_check",
    "learner_progress_interval_days_check",
    "learner_progress_total_correct_check",
    "learner_progress_total_incorrect_check",
    "learner_progress_revision_check",
    "review_events_previous_interval_check",
    "review_events_new_interval_check",
    "review_events_expected_revision_check",
    "review_events_resulting_revision_check"
  ]) {
    assert(hasConstraint(name, "CHECK"), `CHECK_MISSING_${name}`);
    const definition = constraints.find((item) => item.constraint_name === name)?.definition ?? "";
    assert(definition.includes("9007199254740991"), `CHECK_SAFE_RANGE_MISSING_${name}`);
  }
  assert(hasConstraint("xp_events_source_type_check", "CHECK"), "XP_SOURCE_TYPE_CHECK_MISSING");
  const xpSourceCheck = constraints.find((item) => item.constraint_name === "xp_events_source_type_check")?.definition ?? "";
  assert(xpSourceCheck.includes("EXERCISE_CORRECT"), "XP_EXERCISE_SOURCE_MISSING");
  for (const name of [
    "learner_progress_learner_id_learner_profiles_id_fk",
    "learner_progress_vocabulary_id_vocabularies_id_fk",
    "review_events_household_id_households_id_fk",
    "review_events_learner_id_learner_profiles_id_fk",
    "review_events_vocabulary_id_vocabularies_id_fk"
  ]) assert(hasConstraint(name, "FOREIGN KEY"), `FOREIGN_KEY_MISSING_${name}`);

  const indexes = await migration<{ index_name: string; is_unique: boolean; is_primary: boolean; columns: string[] }[]>`
    SELECT index_class.relname AS index_name,
           index_info.indisunique AS is_unique,
           index_info.indisprimary AS is_primary,
           array_agg(attribute.attname ORDER BY key_column.ordinality) AS columns
    FROM pg_class table_class
    JOIN pg_namespace namespace ON namespace.oid = table_class.relnamespace
    JOIN pg_index index_info ON index_info.indrelid = table_class.oid
    JOIN pg_class index_class ON index_class.oid = index_info.indexrelid
    CROSS JOIN LATERAL unnest(index_info.indkey) WITH ORDINALITY AS key_column(attnum, ordinality)
    JOIN pg_attribute attribute
      ON attribute.attrelid = table_class.oid
     AND attribute.attnum = key_column.attnum
    WHERE namespace.nspname = 'vocabflow_app'
      AND table_class.relname IN ('learner_progress', 'review_events')
    GROUP BY index_class.relname, index_info.indisunique, index_info.indisprimary
  `;
  const index = (name: string) => indexes.find((item) => item.index_name === name);
  assert(index("learner_progress_learner_next_review_idx"), "PROGRESS_DUE_INDEX_MISSING");
  assert(index("review_events_learner_reviewed_at_idx"), "EVENT_HISTORY_INDEX_MISSING");
  assert(index("review_events_learner_vocabulary_reviewed_at_idx"), "EVENT_VOCABULARY_HISTORY_INDEX_MISSING");
  const eventIndexes = indexes.filter((item) => item.index_name.startsWith("review_events_"));
  assert(!eventIndexes.some((item) => item.is_unique && item.columns.length === 1 && item.columns[0] === "review_id"), "GLOBAL_REVIEW_ID_UNIQUE");
}

async function testNewRemembered(migration: SqlClient, runtimeUrl: string) {
  mark("new-remembered");
  const fixture = await seedFixture(migration, "remembered", "Pacific/Honolulu");
  const request = makeRequest(fixture, "REMEMBERED", 0);
  const result = await withRuntimeService(runtimeUrl, (service) => service.write(fixture.ownerUserId, {
    ...request,
    reviewId: request.reviewId.toUpperCase(),
    learnerId: request.learnerId.toUpperCase()
  }));
  assert(result.status === 201, "NEW_REMEMBERED_NOT_CREATED");
  assert(result.response.reviewId === request.reviewId.toLowerCase(), "NEW_REMEMBERED_REVIEW_ID");
  assert(result.response.learnerId === fixture.learnerId, "NEW_REMEMBERED_LEARNER_ID");
  assert(result.response.progress.revision === 1, "NEW_REMEMBERED_REVISION");
  assert(result.response.progress.status === "LEARNING", "NEW_REMEMBERED_STATUS");
  assert(result.response.progress.totalCorrect === 1, "NEW_REMEMBERED_COUNTER");
  const progress = await progressFor(migration, fixture);
  assert(progress?.revision === 1, "NEW_REMEMBERED_PROGRESS_MISSING");
  assert(progress.status === result.response.progress.status, "NEW_REMEMBERED_PROGRESS_STATE");
  assert(progress.firstLearnedDate === "2026-09-13" && progress.lastReviewedDate === "2026-09-13", "NEW_REMEMBERED_LOCAL_DATE");
  assert(progress.nextReviewDate === "2026-09-14", "NEW_REMEMBERED_NEXT_DATE");
  assert((await eventsFor(migration, fixture)).length === 1, "NEW_REMEMBERED_EVENT_COUNT");
  await assertCanonicalEvent(migration, fixture, request, result, "2026-09-13");
}

async function testNewForgotten(migration: SqlClient, runtimeUrl: string) {
  mark("new-forgotten");
  const fixture = await seedFixture(migration, "forgotten");
  const request = makeRequest(fixture, "FORGOTTEN", 0);
  const result = await withRuntimeService(runtimeUrl, (service) => service.write(fixture.ownerUserId, request));
  assert(result.status === 201, "NEW_FORGOTTEN_NOT_CREATED");
  assert(result.response.progress.revision === 1, "NEW_FORGOTTEN_REVISION");
  assert(result.response.progress.status === "LEARNING", "NEW_FORGOTTEN_STATUS");
  assert(result.response.progress.consecutiveCorrect === 0, "NEW_FORGOTTEN_CONSECUTIVE");
  assert(result.response.progress.totalIncorrect === 1, "NEW_FORGOTTEN_COUNTER");
  const progress = await progressFor(migration, fixture);
  assert(progress?.revision === 1 && progress.status === "LEARNING", "NEW_FORGOTTEN_PROGRESS");
  assert(progress.totalIncorrect === 1 && progress.intervalDays === 1, "NEW_FORGOTTEN_STATE");
  assert((await eventsFor(migration, fixture)).length === 1, "NEW_FORGOTTEN_EVENT_COUNT");
  await assertCanonicalEvent(migration, fixture, request, result, "2026-09-14");
}

async function testServerVerifiedExerciseXp(migration: SqlClient, runtimeUrl: string) {
  mark("server-verified-exercise-xp");
  const fixture = await seedFixture(migration, "exercise-xp");
  const correctRequest: ReviewRequest = {
    ...makeRequest(fixture, "REMEMBERED", 0),
    exerciseSubmission: { type: "TYPE_WORD", answer: " TRUSTED-EXERCISE-XP " }
  };
  const created = await withRuntimeService(runtimeUrl, (service) => service.write(fixture.ownerUserId, correctRequest));
  assert(created.status === 201 && created.response.result === "REMEMBERED", "EXERCISE_CORRECT_NOT_CREATED");

  const rewardsAfterCorrect = await migration<{ source_type: string; source_key: string; points: number }[]>`
    SELECT source_type, source_key, points
    FROM ${migration.unsafe(XP_EVENTS_TABLE)}
    WHERE learner_id = ${fixture.learnerId}::uuid
    ORDER BY source_type
  `;
  assert(rewardsAfterCorrect.length === 2, "EXERCISE_CORRECT_REWARD_COUNT");
  assert(rewardsAfterCorrect.some((row) => row.source_type === "REVIEW" && Number(row.points) === 10), "EXERCISE_REVIEW_REWARD_MISSING");
  assert(rewardsAfterCorrect.some((row) => row.source_type === "EXERCISE_CORRECT" && row.source_key === `exercise-correct:${correctRequest.reviewId}` && Number(row.points) === 5), "EXERCISE_BONUS_MISSING");
  assert(!JSON.stringify(await eventFor(migration, fixture, correctRequest.reviewId)).includes("TRUSTED-EXERCISE-XP"), "EXERCISE_TYPED_ANSWER_PERSISTED");

  const replay = await withRuntimeService(runtimeUrl, (service) => service.write(fixture.ownerUserId, correctRequest));
  assert(replay.status === 200, "EXERCISE_REPLAY_NOT_IDEMPOTENT");
  const [rewardCountAfterReplay] = await migration<{ count: string }[]>`
    SELECT count(*)::text AS count FROM ${migration.unsafe(XP_EVENTS_TABLE)}
    WHERE learner_id = ${fixture.learnerId}::uuid
  `;
  assert(rewardCountAfterReplay?.count === "2", "EXERCISE_REPLAY_DUPLICATE_REWARD");

  const wrongRequest: ReviewRequest = {
    ...makeRequest(fixture, "FORGOTTEN", 1),
    exerciseSubmission: { type: "TYPE_WORD", answer: "wrong" }
  };
  const wrong = await withRuntimeService(runtimeUrl, (service) => service.write(fixture.ownerUserId, wrongRequest));
  assert(wrong.status === 201 && wrong.response.result === "FORGOTTEN", "EXERCISE_WRONG_NOT_CREATED");
  const [bonusCountAfterWrong] = await migration<{ count: string }[]>`
    SELECT count(*)::text AS count FROM ${migration.unsafe(XP_EVENTS_TABLE)}
    WHERE learner_id = ${fixture.learnerId}::uuid AND source_type = 'EXERCISE_CORRECT'
  `;
  assert(bonusCountAfterWrong?.count === "1", "EXERCISE_WRONG_BONUS_CREATED");

  const mismatchRequest: ReviewRequest = {
    ...makeRequest(fixture, "REMEMBERED", 2),
    exerciseSubmission: { type: "TYPE_WORD", answer: "wrong" }
  };
  const mismatch = await withRuntimeService(runtimeUrl, (service) => capture(service.write(fixture.ownerUserId, mismatchRequest)));
  expectReviewError(mismatch, "INVALID_REQUEST");
}

async function testExistingRevision(migration: SqlClient, runtimeUrl: string) {
  mark("existing-revision");
  const fixture = await seedFixture(migration, "existing");
  const state: ProgressState = {
    status: "LEARNING",
    consecutiveCorrect: 1,
    intervalDays: 1,
    firstLearnedDate: "2026-09-10",
    lastReviewedDate: "2026-09-13",
    nextReviewDate: "2026-09-14",
    totalCorrect: 5,
    totalIncorrect: 2,
    revision: 4
  };
  await insertProgress(migration, fixture, state);
  const request = makeRequest(fixture, "REMEMBERED", 4);
  const result = await withRuntimeService(runtimeUrl, (service) => service.write(fixture.ownerUserId, request));
  assert(result.status === 201, "EXISTING_NOT_CREATED");
  assert(result.response.progress.revision === 5, "EXISTING_REVISION_NOT_INCREMENTED");
  assert(result.response.progress.consecutiveCorrect === 2 && result.response.progress.intervalDays === 3, "EXISTING_SCHEDULER_STATE");
  const progress = await progressFor(migration, fixture);
  assert(progress?.revision === 5 && progress.totalCorrect === 6, "EXISTING_PROGRESS_STATE");
  assert((await eventsFor(migration, fixture)).length === 1, "EXISTING_EVENT_COUNT");
  await assertCanonicalEvent(migration, fixture, request, result, "2026-09-14");
}

async function testStaleNoMutation(migration: SqlClient, runtimeUrl: string) {
  mark("stale-no-mutation");
  const fixture = await seedFixture(migration, "stale");
  const state: ProgressState = {
    status: "LEARNING",
    consecutiveCorrect: 1,
    intervalDays: 1,
    firstLearnedDate: "2026-09-10",
    lastReviewedDate: "2026-09-13",
    nextReviewDate: "2026-09-14",
    totalCorrect: 5,
    totalIncorrect: 2,
    revision: 3
  };
  await insertProgress(migration, fixture, state);
  const request = makeRequest(fixture, "REMEMBERED", 2);
  const outcome = await withRuntimeService(runtimeUrl, (service) => capture(service.write(fixture.ownerUserId, request)));
  expectReviewError(outcome, "STALE_REVISION");
  const progress = await progressFor(migration, fixture);
  assert(sameJson(progress, { learner_id: fixture.learnerId, vocabulary_id: fixture.vocabularyId, ...state }), "STALE_PROGRESS_MUTATED");
  assert((await eventsFor(migration, fixture)).length === 0, "STALE_EVENT_INSERTED");
}

async function testAtomicRollback(migration: SqlClient, runtimeUrl: string) {
  mark("atomic-rollback");
  const fixture = await seedFixture(migration, "rollback");
  const state: ProgressState = {
    status: "LEARNING",
    consecutiveCorrect: 1,
    intervalDays: 1,
    firstLearnedDate: "2026-09-10",
    lastReviewedDate: "2026-09-13",
    nextReviewDate: "2026-09-14",
    totalCorrect: 5,
    totalIncorrect: 2,
    revision: 4
  };
  await insertProgress(migration, fixture, state);
  const triggerSuffix = randomUUID().replaceAll("-", "");
  const functionName = `__vf_us07_fail_event_${triggerSuffix}`;
  const triggerName = `__vf_us07_fail_event_trigger_${triggerSuffix}`;
  try {
    console.log("TRUSTED_DB_CONNECTION role=migration operation=us07-rollback-trigger");
    await migration.unsafe(`
      CREATE FUNCTION ${APP_SCHEMA}."${functionName}"()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $$ BEGIN RAISE EXCEPTION 'US07_TEST_EVENT_FAILURE'; END; $$;
      CREATE TRIGGER "${triggerName}"
      BEFORE INSERT ON ${EVENTS_TABLE}
      FOR EACH ROW EXECUTE FUNCTION ${APP_SCHEMA}."${functionName}"();
    `);
    const request = makeRequest(fixture, "REMEMBERED", 4);
    const outcome = await withRuntimeService(runtimeUrl, (service) => capture(service.write(fixture.ownerUserId, request)));
    assert(!outcome.ok, "ATOMIC_FAILURE_NOT_FORCED");
    const progress = await progressFor(migration, fixture);
    assert(sameJson(progress, { learner_id: fixture.learnerId, vocabulary_id: fixture.vocabularyId, ...state }), "ATOMIC_PROGRESS_COMMITTED");
    assert((await eventsFor(migration, fixture)).length === 0, "ATOMIC_ORPHAN_EVENT");
  } finally {
    await migration.unsafe(`DROP TRIGGER IF EXISTS "${triggerName}" ON ${EVENTS_TABLE}`);
    await migration.unsafe(`DROP FUNCTION IF EXISTS ${APP_SCHEMA}."${functionName}"()`);
  }
}

async function closeRuntimePair(first: { connection: SqlClient }, second: { connection: SqlClient }) {
  await Promise.all([
    first.connection.end({ timeout: 5 }),
    second.connection.end({ timeout: 5 })
  ]);
}

async function testCasConcurrency(migration: SqlClient, runtimeUrl: string) {
  mark("cas-concurrency");
  const fixture = await seedFixture(migration, "cas");
  await insertProgress(migration, fixture, {
    status: "LEARNING",
    consecutiveCorrect: 0,
    intervalDays: 1,
    firstLearnedDate: "2026-09-10",
    lastReviewedDate: "2026-09-13",
    nextReviewDate: "2026-09-14",
    totalCorrect: 4,
    totalIncorrect: 0,
    revision: 7
  });
  const first = await openRuntimeService(runtimeUrl);
  const second = await openRuntimeService(runtimeUrl);
  try {
    const firstRequest = makeRequest(fixture, "REMEMBERED", 7);
    const secondRequest = makeRequest(fixture, "REMEMBERED", 7);
    const [left, right] = await Promise.all([
      capture(first.service.write(fixture.ownerUserId, firstRequest)),
      capture(second.service.write(fixture.ownerUserId, secondRequest))
    ]);
    const outcomes = [left, right];
    assert(outcomes.filter((outcome) => outcome.ok && outcome.value.status === 201).length === 1, "CAS_WINNER_COUNT");
    assert(outcomes.filter((outcome) => !outcome.ok).length === 1, "CAS_LOSER_COUNT");
    expectReviewError(outcomes.find((outcome) => !outcome.ok)!, "STALE_REVISION");
    const progress = await progressFor(migration, fixture);
    assert(progress?.revision === 8, "CAS_REVISION_DOUBLE_ADVANCE");
    assert((await eventsFor(migration, fixture)).length === 1, "CAS_EVENT_COUNT");
  } finally {
    await closeRuntimePair(first, second);
  }
}

async function testFirstMaterializationConcurrency(migration: SqlClient, runtimeUrl: string) {
  mark("first-materialization-concurrency");
  const fixture = await seedFixture(migration, "first-race");
  const first = await openRuntimeService(runtimeUrl);
  const second = await openRuntimeService(runtimeUrl);
  try {
    const [left, right] = await Promise.all([
      capture(first.service.write(fixture.ownerUserId, makeRequest(fixture, "REMEMBERED", 0))),
      capture(second.service.write(fixture.ownerUserId, makeRequest(fixture, "REMEMBERED", 0)))
    ]);
    const outcomes = [left, right];
    assert(outcomes.filter((outcome) => outcome.ok && outcome.value.status === 201).length === 1, "FIRST_RACE_WINNER_COUNT");
    expectReviewError(outcomes.find((outcome) => !outcome.ok)!, "STALE_REVISION");
    const progress = await progressFor(migration, fixture);
    assert(progress?.revision === 1, "FIRST_RACE_REVISION");
    assert((await eventsFor(migration, fixture)).length === 1, "FIRST_RACE_EVENT_COUNT");
  } finally {
    await closeRuntimePair(first, second);
  }
}

async function testSameIdSameFingerprintRace(migration: SqlClient, runtimeUrl: string) {
  mark("same-id-replay-race");
  const fixture = await seedFixture(migration, "replay-race");
  const reviewId = randomUUID();
  const request = makeRequest(fixture, "REMEMBERED", 0, reviewId);
  const first = await openRuntimeService(runtimeUrl);
  const second = await openRuntimeService(runtimeUrl);
  try {
    const [left, right] = await Promise.all([
      capture(first.service.write(fixture.ownerUserId, request)),
      capture(second.service.write(fixture.ownerUserId, request))
    ]);
    const outcomes = [left, right];
    assert(outcomes.filter((outcome) => outcome.ok && outcome.value.status === 201).length === 1, "REPLAY_RACE_CREATOR_COUNT");
    assert(outcomes.filter((outcome) => outcome.ok && outcome.value.status === 200).length === 1, "REPLAY_RACE_REPLAY_COUNT");
    const responses = outcomes.flatMap((outcome) => outcome.ok ? [outcome.value.response] : []);
    assert(responses.length === 2 && sameJson(responses[0], responses[1]), "REPLAY_RACE_RESPONSE_MISMATCH");
    assert((await eventsFor(migration, fixture)).length === 1, "REPLAY_RACE_EVENT_COUNT");
    assert((await progressFor(migration, fixture))?.revision === 1, "REPLAY_RACE_DOUBLE_TRANSITION");
  } finally {
    await closeRuntimePair(first, second);
  }
}

async function testSameIdConflictRace(migration: SqlClient, runtimeUrl: string) {
  mark("same-id-conflict-race");
  const fixture = await seedFixture(migration, "conflict-race");
  const reviewId = randomUUID();
  const first = await openRuntimeService(runtimeUrl);
  const second = await openRuntimeService(runtimeUrl);
  try {
    const [left, right] = await Promise.all([
      capture(first.service.write(fixture.ownerUserId, makeRequest(fixture, "REMEMBERED", 0, reviewId))),
      capture(second.service.write(fixture.ownerUserId, makeRequest(fixture, "FORGOTTEN", 0, reviewId)))
    ]);
    const outcomes = [left, right];
    assert(outcomes.filter((outcome) => outcome.ok && outcome.value.status === 201).length === 1, "CONFLICT_RACE_CREATOR_COUNT");
    expectReviewError(outcomes.find((outcome) => !outcome.ok)!, "IDEMPOTENCY_CONFLICT");
    assert((await eventsFor(migration, fixture)).length === 1, "CONFLICT_RACE_EVENT_COUNT");
    assert((await progressFor(migration, fixture))?.revision === 1, "CONFLICT_RACE_DOUBLE_TRANSITION");
  } finally {
    await closeRuntimePair(first, second);
  }
}

async function testCrossHouseholdSameReviewId(migration: SqlClient, runtimeUrl: string) {
  mark("cross-household-same-id");
  const householdA = await seedFixture(migration, "household-a");
  const householdB = await seedFixture(migration, "household-b");
  const reviewId = randomUUID();
  const first = await openRuntimeService(runtimeUrl);
  const second = await openRuntimeService(runtimeUrl);
  try {
    const [left, right] = await Promise.all([
      capture(first.service.write(householdA.ownerUserId, makeRequest(householdA, "REMEMBERED", 0, reviewId))),
      capture(second.service.write(householdB.ownerUserId, makeRequest(householdB, "REMEMBERED", 0, reviewId)))
    ]);
    assert(left.ok && left.value.status === 201, "HOUSEHOLD_A_NOT_CREATED");
    assert(right.ok && right.value.status === 201, "HOUSEHOLD_B_NOT_CREATED");
    assert(left.value.response.learnerId === householdA.learnerId, "HOUSEHOLD_A_RESPONSE_LEAK");
    assert(right.value.response.learnerId === householdB.learnerId, "HOUSEHOLD_B_RESPONSE_LEAK");
    const rows = await migration`
      SELECT household_id::text AS household_id, review_id::text AS review_id
      FROM ${migration.unsafe(EVENTS_TABLE)}
      WHERE review_id = ${reviewId}::uuid
      ORDER BY household_id
    ` as unknown as Array<{ household_id: string; review_id: string }>;
    assert(rows.length === 2, "HOUSEHOLD_SHARED_ID_ROW_COUNT");
    assert(new Set(rows.map((row) => row.household_id)).size === 2, "HOUSEHOLD_SHARED_ID_COLLISION");
    assert(rows.every((row) => row.review_id === reviewId), "HOUSEHOLD_SHARED_ID_CANONICALIZATION");
  } finally {
    await closeRuntimePair(first, second);
  }
}

async function testBigIntRoundTrip(migration: SqlClient, runtimeUrl: string) {
  mark("bigint-round-trip");
  const aboveInt32 = 2_147_483_648;
  const fixture = await seedFixture(migration, "bigint");
  await insertProgress(migration, fixture, {
    status: "MASTERED",
    consecutiveCorrect: 4,
    intervalDays: 14,
    firstLearnedDate: "2026-09-01",
    lastReviewedDate: "2026-09-13",
    nextReviewDate: "2026-09-14",
    totalCorrect: aboveInt32,
    totalIncorrect: 0,
    revision: aboveInt32
  });
  const request = makeRequest(fixture, "REMEMBERED", aboveInt32);
  const result = await withRuntimeService(runtimeUrl, async (service, connection) => {
    const written = await service.write(fixture.ownerUserId, request);
    const rows = await connection<{ total_correct: unknown; revision: unknown }[]>`
      SELECT total_correct, revision
      FROM ${connection.unsafe(PROGRESS_TABLE)}
      WHERE learner_id = ${fixture.learnerId}::uuid
        AND vocabulary_id = ${fixture.vocabularyId}::integer
    `;
    assert(scalar(rows[0]?.total_correct) === String(aboveInt32 + 1), "BIGINT_DRIVER_TOTAL_CORRECT");
    assert(scalar(rows[0]?.revision) === String(aboveInt32 + 1), "BIGINT_DRIVER_REVISION");
    assert(!JSON.stringify(written.response).includes("BigInt"), "BIGINT_JSON_LEAK");
    return written;
  });
  assert(result.response.progress.totalCorrect === aboveInt32 + 1, "BIGINT_RESPONSE_TOTAL_CORRECT");
  assert(result.response.progress.revision === aboveInt32 + 1, "BIGINT_RESPONSE_REVISION");

  const max = Number.MAX_SAFE_INTEGER;
  const boundary = await seedFixture(migration, "bigint-boundary");
  await insertProgress(migration, boundary, {
    status: "MASTERED",
    consecutiveCorrect: max - 1,
    intervalDays: 30,
    firstLearnedDate: "2026-09-01",
    lastReviewedDate: "2026-09-13",
    nextReviewDate: "2026-10-13",
    totalCorrect: 5,
    totalIncorrect: 0,
    revision: max - 1
  });
  const boundaryResult = await withRuntimeService(runtimeUrl, (service) => service.write(
    boundary.ownerUserId,
    makeRequest(boundary, "REMEMBERED", max - 1),
  ));
  assert(boundaryResult.response.progress.revision === max, "BIGINT_MAX_MINUS_ONE_BOUNDARY");
  const exhausted = await withRuntimeService(runtimeUrl, (service) => capture(service.write(
    boundary.ownerUserId,
    makeRequest(boundary, "REMEMBERED", max),
  )));
  expectReviewError(exhausted, "INTERNAL_ERROR");
  assert((await progressFor(migration, boundary))?.revision === max, "BIGINT_EXHAUSTION_MUTATED");
  assert((await eventsFor(migration, boundary)).length === 1, "BIGINT_EXHAUSTION_EVENT");

  const unsafeFixture = await seedFixture(migration, "bigint-unsafe");
  const rejected = await capture(migration.begin(async (tx) => {
    await tx`
      INSERT INTO ${tx.unsafe(PROGRESS_TABLE)}
        (learner_id, vocabulary_id, status, consecutive_correct, interval_days,
         first_learned_date, last_reviewed_date, next_review_date, total_correct,
         total_incorrect, revision)
      VALUES (
        ${unsafeFixture.learnerId}::uuid,
        ${unsafeFixture.vocabularyId}::integer,
        'LEARNING'::text::"vocabflow_app"."learning_status",
        0::bigint, 1::bigint, '2026-09-01'::date, '2026-09-13'::date,
        '2026-09-14'::date, ${String(BigInt(max) + 1n)}::bigint, 0::bigint, 99::bigint
      )
    `;
  }));
  assert(!rejected.ok, "BIGINT_UNSAFE_INSERT_ACCEPTED");
  assert(sqlState(rejected.error) === "23514", "BIGINT_UNSAFE_INSERT_WRONG_REJECTION");
}

async function testRuntimePrivileges(migration: SqlClient, runtimeUrl: string) {
  mark("runtime-privileges");
  const fixture = await seedFixture(migration, "privileges");
  const runtime = openSql(runtimeUrl);
  console.log("TRUSTED_DB_CONNECTION role=runtime operation=us07-privilege-matrix");
  try {
    const outcome = await capture(runtime.begin(async (tx) => {
      const progressReviewId = randomUUID();
      await tx`
        INSERT INTO ${tx.unsafe(PROGRESS_TABLE)}
          (learner_id, vocabulary_id, status, consecutive_correct, interval_days,
           total_correct, total_incorrect, revision)
        VALUES (${fixture.learnerId}::uuid, ${fixture.vocabularyId}::integer,
          'NEW'::text::"vocabflow_app"."learning_status", 0::bigint, 0::bigint,
          0::bigint, 0::bigint, 0::bigint)
      `;
      const progress = await tx`
        SELECT revision FROM ${tx.unsafe(PROGRESS_TABLE)}
        WHERE learner_id = ${fixture.learnerId}::uuid AND vocabulary_id = ${fixture.vocabularyId}::integer
      `;
      assert(progress.length === 1, "RUNTIME_PROGRESS_SELECT");
      await tx`
        UPDATE ${tx.unsafe(PROGRESS_TABLE)}
        SET updated_at = updated_at
        WHERE learner_id = ${fixture.learnerId}::uuid AND vocabulary_id = ${fixture.vocabularyId}::integer
      `;
      await tx`
        INSERT INTO ${tx.unsafe(EVENTS_TABLE)}
          (household_id, review_id, request_fingerprint, learner_id, vocabulary_id,
           result, previous_status, new_status, previous_interval, new_interval,
           expected_revision, resulting_revision, review_date, response_payload)
        VALUES (${fixture.householdId}::uuid, ${progressReviewId}::uuid,
          'sha256:test'::text, ${fixture.learnerId}::uuid, ${fixture.vocabularyId}::integer,
          'REMEMBERED'::text::"vocabflow_app"."review_result",
          'NEW'::text::"vocabflow_app"."learning_status",
          'LEARNING'::text::"vocabflow_app"."learning_status",
          0::bigint, 1::bigint, 0::bigint, 1::bigint, '2026-09-14'::date,
          '{"reviewId":"test"}'::jsonb)
      `;
      const event = await tx`
        SELECT review_id FROM ${tx.unsafe(EVENTS_TABLE)}
        WHERE household_id = ${fixture.householdId}::uuid AND review_id = ${progressReviewId}::uuid
      `;
      assert(event.length === 1, "RUNTIME_EVENT_SELECT");
      throw new Error(ROLLBACK_MARKER);
    }));
    assert(!outcome.ok && outcome.error instanceof Error && outcome.error.message === ROLLBACK_MARKER, "RUNTIME_PRIVILEGES_FAILED");
  } finally {
    await runtime.end({ timeout: 5 });
  }
}

async function verifyReset(migrationUrl: string, migrationTarget: ConnectionTarget, beforeIdentity: Awaited<ReturnType<typeof getIdentitySnapshot>>) {
  mark("reset");
  console.log("TRUSTED_DB_CONNECTION role=migration operation=us07-reset");
  const migration = openSql(migrationUrl);
  try {
    await assertPostConnectIdentity(migration, migrationTarget);
    await resetApplicationScope(migration);
    await assertMigrationStateZero(migration);
    await assertApplicationTablesAbsent(migration);
    await assertIdentitySnapshot(migration, beforeIdentity);
  } finally {
    await migration.end({ timeout: 5 });
  }
}

export async function runUs07TrustedDbSuite(input: Us07TrustedDbInput) {
  const migration = openSql(input.migrationUrl);
  const beforeIdentity = await getIdentitySnapshot(migration);
  try {
    await assertPostConnectIdentity(migration, input.migrationTarget);
    const runtimeIdentity = openSql(input.runtimeUrl);
    try {
      await assertPostConnectIdentity(runtimeIdentity, input.runtimeTarget);
    } finally {
      await runtimeIdentity.end({ timeout: 5 });
    }
    await assertLiveSchema(migration);
    await testNewRemembered(migration, input.runtimeUrl);
    await testNewForgotten(migration, input.runtimeUrl);
    await testServerVerifiedExerciseXp(migration, input.runtimeUrl);
    await testExistingRevision(migration, input.runtimeUrl);
    await testStaleNoMutation(migration, input.runtimeUrl);
    await testAtomicRollback(migration, input.runtimeUrl);
    await testCasConcurrency(migration, input.runtimeUrl);
    await testFirstMaterializationConcurrency(migration, input.runtimeUrl);
    await testSameIdSameFingerprintRace(migration, input.runtimeUrl);
    await testSameIdConflictRace(migration, input.runtimeUrl);
    await testCrossHouseholdSameReviewId(migration, input.runtimeUrl);
    await testBigIntRoundTrip(migration, input.runtimeUrl);
    await testRuntimePrivileges(migration, input.runtimeUrl);
  } finally {
    await migration.end({ timeout: 5 });
    await verifyReset(input.migrationUrl, input.migrationTarget, beforeIdentity);
  }
  console.log("TRUSTED_DB_US07_STATUS=PASS");
}

const invokedScript = process.argv[1]?.replaceAll("\\", "/") ?? "";
if (invokedScript.endsWith("/test-reviews-db.ts") || invokedScript.endsWith("/test-reviews-db.js")) {
  const migrationUrl = process.env.NEON_TEST_MIGRATION_DATABASE_URL;
  const runtimeUrl = process.env.NEON_TEST_RUNTIME_DATABASE_URL;
  if (!migrationUrl || !runtimeUrl) {
    console.error("US07_DB_REQUIRED_DATABASE_CONFIGURATION");
    process.exitCode = 1;
  } else {
    console.error("US07_DB_DIRECT_INVOCATION_NOT_SUPPORTED_USE_TEST_DB");
    process.exitCode = 1;
  }
}
