import { sql, type SQL } from "drizzle-orm";
import {
  APP_SCHEMA,
  reviewRequestSchema,
  reviewResponseSchema,
  type ReviewRequest,
  type ReviewResponse
} from "@vocabflow/contracts";
import {
  scheduleReview,
  type SchedulerOutput,
  type SchedulerState
} from "@vocabflow/learning-domain";
import { authorizeLearnerOwnership } from "./learners";

export type ReviewDatabase = {
  execute: (query: SQL) => Promise<unknown>;
};

export type ReviewWriteResult = {
  status: 200 | 201;
  response: ReviewResponse;
};

export type ReviewServiceErrorCode =
  | "HOUSEHOLD_ACCESS_DENIED"
  | "INVALID_REQUEST"
  | "VOCABULARY_NOT_FOUND"
  | "IDEMPOTENCY_CONFLICT"
  | "STALE_REVISION"
  | "INTERNAL_ERROR";

export class ReviewServiceError extends Error {
  readonly code: ReviewServiceErrorCode;
  readonly status: 400 | 403 | 404 | 409 | 500;
  readonly details?: Record<string, unknown>;

  constructor(
    code: ReviewServiceErrorCode,
    status: 400 | 403 | 404 | 409 | 500,
    details?: Record<string, unknown>
  ) {
    super(code);
    this.name = "ReviewServiceError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

type ReviewClock = () => Date;
type ReviewScheduler = typeof scheduleReview;

type ReviewEventRow = {
  request_fingerprint: string;
  response_payload: unknown;
};

type ProgressRow = {
  status: string;
  consecutive_correct: number | string | bigint;
  interval_days: number | string | bigint;
  first_learned_date: string | null;
  last_reviewed_date: string | null;
  next_review_date: string | null;
  total_correct: number | string | bigint;
  total_incorrect: number | string | bigint;
  revision: number | string | bigint;
};

type AtomicWriteRow = {
  existing_fingerprint: string | null;
  existing_response_payload: unknown;
  inserted_review_id: string | null;
  resulting_revision: number | string | bigint | null;
};

function rowsOf<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === "object" && Array.isArray((result as { rows?: unknown }).rows)) {
    return (result as { rows: T[] }).rows;
  }
  throw new ReviewServiceError("INTERNAL_ERROR", 500);
}

function internalFailure(): ReviewServiceError {
  return new ReviewServiceError("INTERNAL_ERROR", 500);
}

export function parseReviewRequest(payload: unknown): ReviewRequest {
  const parsed = reviewRequestSchema.safeParse(payload);
  if (!parsed.success) throw new ReviewServiceError("INVALID_REQUEST", 400);
  return parsed.data;
}

export function householdLocalDate(now: Date, timezone: string): string {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) throw internalFailure();
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(now);
    const values = new Map(parts.map((part) => [part.type, part.value]));
    const year = values.get("year");
    const month = values.get("month");
    const day = values.get("day");
    if (!year || !month || !day) throw internalFailure();
    return `${year}-${month}-${day}`;
  } catch (error) {
    if (error instanceof ReviewServiceError) throw error;
    throw internalFailure();
  }
}

export async function createReviewFingerprint(input: ReviewRequest) {
  // An explicit ordered tuple makes the canonical field order intentional and
  // excludes reviewId and every server-derived value from the fingerprint.
  const canonical = JSON.stringify([
    input.learnerId,
    input.vocabularyId,
    input.result,
    input.expectedRevision
  ]);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `sha256:${hex}`;
}

async function resolveVocabularyAndTimezone(
  database: ReviewDatabase,
  householdId: string,
  vocabularyId: number
): Promise<string> {
  const result = await database.execute(sql`
    SELECT h.timezone, v.id AS vocabulary_id
    FROM "${sql.raw(APP_SCHEMA)}"."households" h
    JOIN "${sql.raw(APP_SCHEMA)}"."vocabularies" v
      ON v.id = ${vocabularyId}::integer
     AND v.enabled = true
    WHERE h.id = ${householdId}::uuid
    LIMIT 1
  `);
  const [row] = rowsOf<{ timezone: unknown; vocabulary_id: unknown }>(result);
  if (!row || typeof row.timezone !== "string" || row.vocabulary_id == null) {
    throw new ReviewServiceError("VOCABULARY_NOT_FOUND", 404);
  }
  return row.timezone;
}

async function findReviewEvent(
  database: ReviewDatabase,
  householdId: string,
  reviewId: string
): Promise<ReviewEventRow | null> {
  const result = await database.execute(sql`
    SELECT request_fingerprint, response_payload
    FROM "${sql.raw(APP_SCHEMA)}"."review_events"
    WHERE household_id = ${householdId}::uuid
      AND review_id = ${reviewId}::uuid
    LIMIT 1
  `);
  return rowsOf<ReviewEventRow>(result)[0] ?? null;
}

async function loadProgress(database: ReviewDatabase, learnerId: string, vocabularyId: number): Promise<ProgressRow | null> {
  const result = await database.execute(sql`
    SELECT status::text AS status,
           consecutive_correct,
           interval_days,
           first_learned_date::text AS first_learned_date,
           last_reviewed_date::text AS last_reviewed_date,
           next_review_date::text AS next_review_date,
           total_correct,
           total_incorrect,
           revision
    FROM "${sql.raw(APP_SCHEMA)}"."learner_progress"
    WHERE learner_id = ${learnerId}::uuid
      AND vocabulary_id = ${vocabularyId}::integer
    LIMIT 1
  `);
  return rowsOf<ProgressRow>(result)[0] ?? null;
}

function numberValue(value: number | string | bigint): number {
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || value < 0) throw internalFailure();
    return value;
  }

  if (typeof value === "string" && !/^-?\d+$/.test(value)) throw internalFailure();

  let parsed: bigint;
  try {
    parsed = typeof value === "bigint" ? value : BigInt(value);
  } catch {
    throw internalFailure();
  }
  if (parsed < 0n || parsed > BigInt(Number.MAX_SAFE_INTEGER)) throw internalFailure();
  return Number(parsed);
}

function schedulerState(row: ProgressRow): SchedulerState {
  if (row.status !== "NEW" && row.status !== "LEARNING" && row.status !== "MASTERED") {
    throw internalFailure();
  }
  return {
    status: row.status,
    consecutiveCorrect: numberValue(row.consecutive_correct),
    intervalDays: numberValue(row.interval_days),
    firstLearnedDate: row.first_learned_date,
    lastReviewedDate: row.last_reviewed_date,
    nextReviewDate: row.next_review_date,
    totalCorrect: numberValue(row.total_correct),
    totalIncorrect: numberValue(row.total_incorrect)
  } as SchedulerState;
}

function storedResponse(value: unknown): ReviewResponse {
  let candidate = value;
  if (typeof candidate === "string") {
    try {
      candidate = JSON.parse(candidate) as unknown;
    } catch {
      throw internalFailure();
    }
  }
  const parsed = reviewResponseSchema.safeParse(candidate);
  if (!parsed.success) throw internalFailure();
  return parsed.data;
}

function buildResponse(input: ReviewRequest, output: SchedulerOutput, revision: number): ReviewResponse {
  const parsed = reviewResponseSchema.safeParse({
    reviewId: input.reviewId,
    learnerId: input.learnerId,
    vocabularyId: input.vocabularyId,
    result: input.result,
    progress: { ...output, revision }
  });
  if (!parsed.success) throw internalFailure();
  return parsed.data;
}

function staleRevision(currentRevision: number): ReviewServiceError {
  return new ReviewServiceError("STALE_REVISION", 409, { currentRevision });
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

function isWriteRaceError(error: unknown): boolean {
  const code = sqlState(error);
  return code === "23505" || code === "40001";
}

async function atomicPersist(
  database: ReviewDatabase,
  input: ReviewRequest,
  householdId: string,
  fingerprint: string,
  reviewDate: string,
  output: SchedulerOutput,
  response: ReviewResponse
): Promise<AtomicWriteRow | undefined> {
  const result = await database.execute(sql`
    WITH existing_event AS MATERIALIZED (
      SELECT request_fingerprint, response_payload
      FROM "${sql.raw(APP_SCHEMA)}"."review_events"
      WHERE household_id = ${householdId}::uuid
        AND review_id = ${input.reviewId}::uuid
    ), current_progress AS MATERIALIZED (
      SELECT learner_id,
             vocabulary_id,
             status,
             consecutive_correct,
             interval_days,
             first_learned_date,
             last_reviewed_date,
             next_review_date,
             total_correct,
             total_incorrect,
             revision
      FROM "${sql.raw(APP_SCHEMA)}"."learner_progress"
      WHERE learner_id = ${input.learnerId}::uuid
        AND vocabulary_id = ${input.vocabularyId}::integer
    ), prepared AS (
      SELECT
        ${householdId}::uuid AS household_id,
        ${input.reviewId}::uuid AS review_id,
        ${fingerprint}::text AS request_fingerprint,
        cp.learner_id,
        cp.vocabulary_id,
        ${input.result}::text::"${sql.raw(APP_SCHEMA)}"."review_result" AS result,
        cp.status AS previous_status,
        ${output.status}::text::"${sql.raw(APP_SCHEMA)}"."learning_status" AS new_status,
        cp.interval_days AS previous_interval,
        (${output.intervalDays})::bigint AS new_interval,
        ${input.expectedRevision}::bigint AS expected_revision,
        ${reviewDate}::date AS review_date,
        ${JSON.stringify(response)}::jsonb AS response_payload,
        false AS is_new,
        (${output.consecutiveCorrect})::bigint AS consecutive_correct,
        ${output.firstLearnedDate}::date AS first_learned_date,
        ${output.lastReviewedDate}::date AS last_reviewed_date,
        ${output.nextReviewDate}::date AS next_review_date,
        (${output.totalCorrect})::bigint AS total_correct,
        (${output.totalIncorrect})::bigint AS total_incorrect
      FROM current_progress cp
      WHERE NOT EXISTS (SELECT 1 FROM existing_event)
      UNION ALL
      SELECT
        ${householdId}::uuid AS household_id,
        ${input.reviewId}::uuid AS review_id,
        ${fingerprint}::text AS request_fingerprint,
        ${input.learnerId}::uuid AS learner_id,
        ${input.vocabularyId}::integer AS vocabulary_id,
        ${input.result}::text::"${sql.raw(APP_SCHEMA)}"."review_result" AS result,
        'NEW'::"${sql.raw(APP_SCHEMA)}"."learning_status" AS previous_status,
        ${output.status}::text::"${sql.raw(APP_SCHEMA)}"."learning_status" AS new_status,
        0::bigint AS previous_interval,
        (${output.intervalDays})::bigint AS new_interval,
        0::bigint AS expected_revision,
        ${reviewDate}::date AS review_date,
        ${JSON.stringify(response)}::jsonb AS response_payload,
        true AS is_new,
        (${output.consecutiveCorrect})::bigint AS consecutive_correct,
        ${output.firstLearnedDate}::date AS first_learned_date,
        ${output.lastReviewedDate}::date AS last_reviewed_date,
        ${output.nextReviewDate}::date AS next_review_date,
        (${output.totalCorrect})::bigint AS total_correct,
        (${output.totalIncorrect})::bigint AS total_incorrect
      WHERE NOT EXISTS (SELECT 1 FROM current_progress)
        AND NOT EXISTS (SELECT 1 FROM existing_event)
    ), updated_progress AS (
      UPDATE "${sql.raw(APP_SCHEMA)}"."learner_progress" AS lp
      SET status = p.new_status,
          consecutive_correct = p.consecutive_correct,
          interval_days = p.new_interval,
          first_learned_date = p.first_learned_date,
          last_reviewed_date = p.last_reviewed_date,
          next_review_date = p.next_review_date,
          total_correct = p.total_correct,
          total_incorrect = p.total_incorrect,
          revision = p.expected_revision + 1::bigint,
          updated_at = now()
      FROM prepared p
      WHERE p.is_new = false
        AND lp.learner_id = p.learner_id
        AND lp.vocabulary_id = p.vocabulary_id
        AND lp.revision = p.expected_revision
      RETURNING lp.learner_id, lp.vocabulary_id
    ), inserted_progress AS (
      INSERT INTO "${sql.raw(APP_SCHEMA)}"."learner_progress" (
        learner_id,
        vocabulary_id,
        status,
        consecutive_correct,
        interval_days,
        first_learned_date,
        last_reviewed_date,
        next_review_date,
        total_correct,
        total_incorrect,
        revision
      )
      SELECT learner_id,
             vocabulary_id,
             new_status,
             consecutive_correct,
             new_interval,
             first_learned_date,
             last_reviewed_date,
             next_review_date,
             total_correct,
             total_incorrect,
             1::bigint
      FROM prepared
      WHERE is_new = true
      ON CONFLICT (learner_id, vocabulary_id) DO NOTHING
      RETURNING learner_id, vocabulary_id
    ), successful AS (
      SELECT p.*
      FROM prepared p
      JOIN updated_progress u
        ON u.learner_id = p.learner_id
       AND u.vocabulary_id = p.vocabulary_id
      WHERE p.is_new = false
      UNION ALL
      SELECT p.*
      FROM prepared p
      JOIN inserted_progress i
        ON i.learner_id = p.learner_id
       AND i.vocabulary_id = p.vocabulary_id
      WHERE p.is_new = true
    ), inserted_event AS (
      INSERT INTO "${sql.raw(APP_SCHEMA)}"."review_events" (
        household_id,
        review_id,
        request_fingerprint,
        learner_id,
        vocabulary_id,
        result,
        previous_status,
        new_status,
        previous_interval,
        new_interval,
        expected_revision,
        resulting_revision,
        review_date,
        response_payload
      )
      SELECT household_id,
             review_id,
             request_fingerprint,
             learner_id,
             vocabulary_id,
             result,
             previous_status,
             new_status,
             previous_interval,
             new_interval,
             expected_revision,
             expected_revision + 1::bigint,
             review_date,
             response_payload
      FROM successful
      RETURNING review_id::text AS review_id
    )
    SELECT ee.request_fingerprint AS existing_fingerprint,
           ee.response_payload AS existing_response_payload,
           ie.review_id AS inserted_review_id,
           (SELECT expected_revision + 1::bigint FROM successful LIMIT 1) AS resulting_revision
    FROM (SELECT 1) AS anchor
    LEFT JOIN existing_event ee ON true
    LEFT JOIN inserted_event ie ON true
  `);
  return rowsOf<AtomicWriteRow>(result)[0];
}

async function classifyWriteRace(
  database: ReviewDatabase,
  input: ReviewRequest,
  householdId: string,
  fingerprint: string
): Promise<ReviewWriteResult> {
  const racedEvent = await findReviewEvent(database, householdId, input.reviewId);
  if (racedEvent) {
    if (racedEvent.request_fingerprint !== fingerprint) {
      throw new ReviewServiceError("IDEMPOTENCY_CONFLICT", 409);
    }
    return { status: 200, response: storedResponse(racedEvent.response_payload) };
  }
  const racedProgress = await loadProgress(database, input.learnerId, input.vocabularyId);
  throw staleRevision(racedProgress ? numberValue(racedProgress.revision) : 0);
}

export type ReviewService = {
  write: (userId: string, payload: unknown) => Promise<ReviewWriteResult>;
};

export function createReviewService(
  database: ReviewDatabase,
  options: { now?: ReviewClock; scheduler?: ReviewScheduler } = {}
): ReviewService {
  const now = options.now ?? (() => new Date());
  const scheduler = options.scheduler ?? scheduleReview;

  return {
    async write(userId, payload) {
      const input = parseReviewRequest(payload);
      if (!userId) throw new ReviewServiceError("HOUSEHOLD_ACCESS_DENIED", 403);

      const ownership = await authorizeLearnerOwnership(database, userId, input.learnerId);
      if (ownership.decision === "FORBIDDEN") {
        throw new ReviewServiceError("HOUSEHOLD_ACCESS_DENIED", 403);
      }

      const timezone = await resolveVocabularyAndTimezone(database, ownership.householdId, input.vocabularyId);
      const fingerprint = await createReviewFingerprint(input);
      const existing = await findReviewEvent(database, ownership.householdId, input.reviewId);
      if (existing) {
        if (existing.request_fingerprint !== fingerprint) {
          throw new ReviewServiceError("IDEMPOTENCY_CONFLICT", 409);
        }
        return { status: 200, response: storedResponse(existing.response_payload) };
      }

      const current = await loadProgress(database, input.learnerId, input.vocabularyId);
      const currentRevision = current ? numberValue(current.revision) : 0;
      if (input.expectedRevision !== currentRevision) throw staleRevision(currentRevision);
      if (input.expectedRevision === Number.MAX_SAFE_INTEGER) throw internalFailure();

      const reviewDate = householdLocalDate(now(), timezone);
      let output: SchedulerOutput;
      try {
        output = scheduler({
          currentState: current ? schedulerState(current) : {
            status: "NEW",
            consecutiveCorrect: 0,
            intervalDays: 0,
            firstLearnedDate: null,
            lastReviewedDate: null,
            nextReviewDate: null,
            totalCorrect: 0,
            totalIncorrect: 0
          },
          result: input.result,
          today: reviewDate
        });
      } catch {
        throw internalFailure();
      }

      const response = buildResponse(input, output, input.expectedRevision + 1);
      let persisted: AtomicWriteRow | undefined;
      try {
        persisted = await atomicPersist(database, input, ownership.householdId, fingerprint, reviewDate, output, response);
      } catch (error) {
        if (!isWriteRaceError(error)) throw error;
        return classifyWriteRace(database, input, ownership.householdId, fingerprint);
      }
      if (persisted?.existing_fingerprint) {
        if (persisted.existing_fingerprint !== fingerprint) {
          throw new ReviewServiceError("IDEMPOTENCY_CONFLICT", 409);
        }
        return { status: 200, response: storedResponse(persisted.existing_response_payload) };
      }
      if (persisted?.inserted_review_id) {
        if (
          persisted.resulting_revision == null
          || numberValue(persisted.resulting_revision) !== input.expectedRevision + 1
        ) {
          throw internalFailure();
        }
        return { status: 201, response };
      }
      return classifyWriteRace(database, input, ownership.householdId, fingerprint);
    }
  };
}
