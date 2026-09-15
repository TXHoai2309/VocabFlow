import { randomInt, randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/postgres-js";
import {
  createReviewQueueService,
  ReviewQueueServiceError,
  type ReviewQueueDatabase
} from "../apps/api/src/review-queue";
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
const VOCABULARY_TABLE = `${APP_SCHEMA}."vocabularies"`;
const PROGRESS_TABLE = `${APP_SCHEMA}."learner_progress"`;
const EVENTS_TABLE = `${APP_SCHEMA}."review_events"`;
const FIXED_NOW = new Date("2026-09-15T01:00:00.000Z");
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
    for (const item of vocabulary) {
      await tx`
        INSERT INTO ${tx.unsafe(VOCABULARY_TABLE)}
          (id, word, vietnamese, enabled, content_version)
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
  return learnerId;
}

async function insertProgress(migration: SqlClient, fixture: Fixture, vocabularyId: number, state: ProgressSpec) {
  await migration`
    INSERT INTO ${migration.unsafe(PROGRESS_TABLE)}
      (learner_id, vocabulary_id, status, consecutive_correct, interval_days,
       first_learned_date, last_reviewed_date, next_review_date, total_correct,
       total_incorrect, revision)
    VALUES (
      ${fixture.learnerId}::uuid,
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

async function cleanupFixture(migration: SqlClient, fixture: Fixture) {
  mark("fixture-cleanup");
  await migration.begin(async (tx) => {
    await tx`DELETE FROM ${tx.unsafe(EVENTS_TABLE)} WHERE household_id = ${fixture.householdId}::uuid`;
    await tx`DELETE FROM ${tx.unsafe(PROGRESS_TABLE)} WHERE learner_id = ${fixture.learnerId}::uuid`;
    await tx`DELETE FROM ${tx.unsafe(LEARNERS_TABLE)} WHERE household_id = ${fixture.householdId}::uuid`;
    await tx`DELETE FROM ${tx.unsafe(MEMBERS_TABLE)} WHERE household_id = ${fixture.householdId}::uuid`;
    await tx`DELETE FROM ${tx.unsafe(HOUSEHOLDS_TABLE)} WHERE id = ${fixture.householdId}::uuid`;
    await tx`DELETE FROM ${tx.unsafe(VOCABULARY_TABLE)} WHERE id = ANY(${tx.array(fixture.vocabularyIds)}::integer[])`;
    await tx`DELETE FROM ${tx.unsafe(USER_TABLE)} WHERE id = ${fixture.ownerUserId}::text`;
  });
}

async function testAuthorization(migration: SqlClient, runtimeUrl: string, fixtures: Fixture[]) {
  mark("authorization-cases");
  const householdA = await seedFixture(migration, "auth-a", [{ id: nextVocabularyId++, enabled: true }]);
  const householdB = await seedFixture(migration, "auth-b", [{ id: nextVocabularyId++, enabled: true }]);
  fixtures.push(householdA, householdB);
  const disabledLearnerId = await addLearner(migration, householdA, false, "disabled-learner");

  const allowed = await withQueue(runtimeUrl, (service) => service.list(householdA.ownerUserId, householdA.learnerId));
  assert(allowed.learnerId === householdA.learnerId, "AUTHORIZED_LEARNER_ID_MISMATCH");
  assert(allowed.queue.length === 1, "AUTHORIZED_QUEUE_EMPTY");
  assert(allowed.queue.every((item) => householdA.vocabularyIds.includes(item.vocabulary.id)), "AUTHORIZED_QUEUE_LEAK");
  await expectDenied(runtimeUrl, householdA.ownerUserId, householdB.learnerId, "CROSS_HOUSEHOLD");
  await expectDenied(runtimeUrl, householdA.ownerUserId, disabledLearnerId, "DISABLED_LEARNER");
  await expectDenied(runtimeUrl, householdA.ownerUserId, randomUUID(), "MISSING_LEARNER");
}

async function testQueueSemantics(migration: SqlClient, runtimeUrl: string, fixtures: Fixture[]) {
  mark("queue-semantics");
  const ids = allocateVocabulary(8);
  const fixture = await seedFixture(migration, "semantics", ids.map((id, index) => ({
    id,
    enabled: index !== 4 && index !== 5
  })).reverse());
  fixtures.push(fixture);
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
  assert(queue.reviewDate === "2026-09-14", "HOUSEHOLD_LOCAL_DATE");
  assert(queue.dueCount === 3 && queue.newCount === 2, "QUEUE_COUNTS");
  assert(queue.queue.map((item) => item.vocabulary.id).join(",") === [ids[0], ids[1], ids[2], ids[6], ids[7]].join(","), "QUEUE_ORDER");
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
  const nineteenDue = allocateVocabulary(30);
  const fixture19 = await seedFixture(migration, "nineteen-due", nineteenDue.map((id) => ({ id, enabled: true })).reverse());
  fixtures.push(fixture19);
  for (const vocabularyId of nineteenDue.slice(0, 19).reverse()) {
    await insertProgress(migration, fixture19, vocabularyId, { status: "LEARNING", nextReviewDate: "2026-09-14", revision: 1 });
  }
  const queue19 = await withQueue(runtimeUrl, (service) => service.list(fixture19.ownerUserId, fixture19.learnerId));
  assert(queue19.dueCount === 19 && queue19.newCount === 11, "DUE_19_COUNTS");
  assert(queue19.queue.length === 29, "DUE_19_TOTAL_LENGTH");
  assert(queue19.queue.slice(0, 19).every((item) => item.queueType === "DUE"), "DUE_19_PRIORITY");
  assert(queue19.queue.slice(19).map((item) => item.vocabulary.id).join(",") === nineteenDue.slice(19, 29).join(","), "NEW_10_ORDER");

  const twentyDue = allocateVocabulary(21);
  const fixture20 = await seedFixture(migration, "twenty-due", twentyDue.map((id) => ({ id, enabled: true })).reverse());
  fixtures.push(fixture20);
  for (const vocabularyId of twentyDue.slice(0, 20).reverse()) {
    await insertProgress(migration, fixture20, vocabularyId, { status: "LEARNING", nextReviewDate: "2026-09-14", revision: 1 });
  }
  const queue20 = await withQueue(runtimeUrl, (service) => service.list(fixture20.ownerUserId, fixture20.learnerId));
  assert(queue20.dueCount === 20 && queue20.newCount === 1, "DUE_20_COUNTS");
  assert(queue20.queue.length === 20 && queue20.queue.every((item) => item.queueType === "DUE"), "DUE_20_SUPPRESSION");

  const twentyOneDue = allocateVocabulary(21);
  const fixture21 = await seedFixture(migration, "twenty-one-due", twentyOneDue.map((id) => ({ id, enabled: true })).reverse());
  fixtures.push(fixture21);
  // Reverse insertion makes the canonical first 20 assertion prove that
  // PostgreSQL orders before applying LIMIT 20.
  for (const vocabularyId of twentyOneDue.slice().reverse()) {
    await insertProgress(migration, fixture21, vocabularyId, { status: "LEARNING", nextReviewDate: "2026-09-14", revision: 1 });
  }
  const queue21 = await withQueue(runtimeUrl, (service) => service.list(fixture21.ownerUserId, fixture21.learnerId));
  assert(queue21.dueCount === 21 && queue21.queue.length === 20, "DUE_CAP");
  assert(queue21.queue.map((item) => item.vocabulary.id).join(",") === twentyOneDue.slice(0, 20).join(","), "DUE_CAP_ORDER");
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
    await testCapsAndSuppression(migration, input.runtimeUrl, fixtures);
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
