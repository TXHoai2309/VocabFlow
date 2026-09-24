import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";
import { createApp, type WorkerBindings } from "./index";
import {
  createReviewFingerprint,
  createReviewService,
  householdLocalDate,
  parseReviewRequest,
  ReviewServiceError,
  serverDerivedExerciseResult,
  type ReviewDatabase
} from "./reviews";

const LEARNER_ID = "123e4567-e89b-42d3-a456-426614174abc";
const HOUSEHOLD_ID = "123e4567-e89b-42d3-a456-426614174abd";
const REVIEW_ID = "123e4567-e89b-42d3-a456-426614174abe";
const USER_ID = "user-1";

const request = {
  reviewId: REVIEW_ID,
  learnerId: LEARNER_ID,
  vocabularyId: 1,
  result: "REMEMBERED" as const,
  expectedRevision: 0
};

const schedulerOutput = {
  status: "LEARNING" as const,
  consecutiveCorrect: 1,
  intervalDays: 1 as const,
  firstLearnedDate: "2026-09-14",
  lastReviewedDate: "2026-09-14",
  nextReviewDate: "2026-09-15",
  totalCorrect: 1,
  totalIncorrect: 0
};

function queuedDatabase(results: unknown[], queries?: Array<{ sql: string; params: unknown[] }>): ReviewDatabase & { execute: ReturnType<typeof vi.fn> } {
  return {
    execute: vi.fn(async (query) => {
      if (queries) queries.push(new PgDialect().sqlToQuery(query));
      return results.shift() ?? { rows: [] };
    })
  };
}

function authorizedRows() {
  return { rows: [{ learner_id: LEARNER_ID, household_id: HOUSEHOLD_ID }] };
}

function vocabularyRows(timezone = "Asia/Ho_Chi_Minh") {
  return { rows: [{ timezone, vocabulary_id: 1, word: "ice cream", vietnamese: "kem" }] };
}

function emptyEvent() {
  return { rows: [] };
}

function emptyProgress() {
  return { rows: [] };
}

function insertedReview(resultingRevision: number | string | bigint = 1) {
  return {
    rows: [{
      existing_fingerprint: null,
      existing_response_payload: null,
      inserted_review_id: REVIEW_ID,
      resulting_revision: resultingRevision,
      daily_limit_reached: false
    }]
  };
}

describe("US-07 review contracts and orchestration", () => {
  it("accepts exactly the approved request shape", () => {
    expect(parseReviewRequest(request)).toEqual(request);
    expect(parseReviewRequest({
      ...request,
      reviewId: REVIEW_ID.toUpperCase(),
      learnerId: LEARNER_ID.toUpperCase()
    })).toEqual(request);
    expect(() => parseReviewRequest({ ...request, status: "LEARNING" })).toThrow();
    expect(() => parseReviewRequest({ ...request, expectedRevision: -1 })).toThrow();
    expect(() => parseReviewRequest({ ...request, vocabularyId: 1.5 })).toThrow();
    expect(() => parseReviewRequest({ ...request, expectedRevision: Number.MAX_SAFE_INTEGER + 1 })).toThrow();
    expect(() => parseReviewRequest({ ...request, exerciseSubmission: { type: "TYPE_WORD", answer: "ice cream", correct: true } })).toThrow();
  });

  it("derives every exercise result from canonical vocabulary rather than a client boolean", () => {
    const vocabulary = { id: 7, word: "ice cream", vietnamese: "kem que" };
    expect(serverDerivedExerciseResult({ type: "MULTIPLE_CHOICE_MEANING", answer: " KEM QUE " }, vocabulary)).toBe("REMEMBERED");
    expect(serverDerivedExerciseResult({ type: "MULTIPLE_CHOICE_MEANING", answer: "bánh mì" }, vocabulary)).toBe("FORGOTTEN");
    expect(serverDerivedExerciseResult({ type: "LISTENING_CHOICE", selectedVocabularyId: 7 }, vocabulary)).toBe("REMEMBERED");
    expect(serverDerivedExerciseResult({ type: "LISTENING_CHOICE", selectedVocabularyId: 8 }, vocabulary)).toBe("FORGOTTEN");
    expect(serverDerivedExerciseResult({ type: "IMAGE_TO_WORD", selectedVocabularyId: 7 }, vocabulary)).toBe("REMEMBERED");
    expect(serverDerivedExerciseResult({ type: "IMAGE_TO_WORD", selectedVocabularyId: 8 }, vocabulary)).toBe("FORGOTTEN");
    expect(serverDerivedExerciseResult({ type: "TYPE_WORD", answer: " ＩＣＥ ＣＲＥＡＭ " }, vocabulary)).toBe("REMEMBERED");
    expect(serverDerivedExerciseResult({ type: "TYPE_WORD", answer: "icecream" }, vocabulary)).toBe("FORGOTTEN");
  });

  it("verifies multiple-choice answers against the owner-reviewed canonical meaning", async () => {
    const queries: Array<{ sql: string; params: unknown[] }> = [];
    const database = queuedDatabase([
      authorizedRows(),
      { rows: [{ timezone: "Asia/Ho_Chi_Minh", vocabulary_id: 1, word: "aunt", vietnamese: "Cô, dì, bác gái" }] },
      emptyEvent(),
      emptyProgress(),
      insertedReview()
    ], queries);
    await expect(createReviewService(database).write(USER_ID, {
      ...request,
      exerciseSubmission: { type: "MULTIPLE_CHOICE_MEANING", answer: "Cô, dì, bác gái" }
    })).resolves.toMatchObject({ status: 201 });
    expect(queries[1]?.sql).toContain("COALESCE(v.vietnamese_override, v.vietnamese) AS vietnamese");
  });

  it("rejects a client recall result that conflicts with server-verified exercise evidence", async () => {
    const database = queuedDatabase([authorizedRows(), vocabularyRows()]);
    const scheduler = vi.fn(() => schedulerOutput);
    await expect(createReviewService(database, { scheduler }).write(USER_ID, {
      ...request,
      exerciseSubmission: { type: "TYPE_WORD", answer: "wrong answer" }
    })).rejects.toMatchObject({ code: "INVALID_REQUEST", status: 400 });
    expect(scheduler).not.toHaveBeenCalled();
  });

  it("adds one server-derived correct-exercise reward without persisting the typed answer", async () => {
    const database = queuedDatabase([
      authorizedRows(),
      vocabularyRows(),
      emptyEvent(),
      emptyProgress(),
      insertedReview()
    ]);
    await expect(createReviewService(database, {
      now: () => new Date("2026-09-14T03:00:00.000Z")
    }).write(USER_ID, {
      ...request,
      exerciseSubmission: { type: "TYPE_WORD", answer: " ＩＣＥ ＣＲＥＡＭ " }
    })).resolves.toMatchObject({ status: 201 });
    const atomicQuery = new PgDialect().sqlToQuery(database.execute.mock.calls[4]?.[0]);
    expect(atomicQuery.sql).toContain("'EXERCISE_CORRECT'");
    expect(atomicQuery.params).not.toContain(" ＩＣＥ ＣＲＥＡＭ ");
  });

  it("creates a first scheduled review at revision 1", async () => {
    const database = queuedDatabase([
      authorizedRows(),
      vocabularyRows(),
      emptyEvent(),
      emptyProgress(),
      insertedReview()
    ]);
    const scheduler = vi.fn(() => schedulerOutput);
    const service = createReviewService(database, {
      scheduler,
      now: () => new Date("2026-09-14T03:00:00.000Z")
    });

    await expect(service.write(USER_ID, request)).resolves.toEqual({
      status: 201,
      response: {
        reviewId: REVIEW_ID,
        learnerId: LEARNER_ID,
        vocabularyId: 1,
        result: "REMEMBERED",
        progress: { ...schedulerOutput, revision: 1 }
      }
    });
    expect(scheduler).toHaveBeenCalledTimes(1);
    expect(scheduler).toHaveBeenCalledWith({
      currentState: {
        status: "NEW",
        consecutiveCorrect: 0,
        intervalDays: 0,
        firstLearnedDate: null,
        lastReviewedDate: null,
        nextReviewDate: null,
        totalCorrect: 0,
        totalIncorrect: 0
      },
      result: "REMEMBERED",
      today: "2026-09-14"
    });
    const atomicQuery = new PgDialect().sqlToQuery(database.execute.mock.calls[4]?.[0]);
    expect(atomicQuery.sql).toContain("WITH locked_learner AS MATERIALIZED");
    expect(atomicQuery.sql).toContain('UPDATE "vocabflow_app"."learner_progress"');
    expect(atomicQuery.sql).toContain('INSERT INTO "vocabflow_app"."review_events"');
    expect(atomicQuery.sql).toContain('INSERT INTO "vocabflow_app"."xp_events"');
    expect(atomicQuery.sql).toContain("'REVIEW'");
    expect(atomicQuery.sql).toContain("'EXERCISE_CORRECT'");
    expect(atomicQuery.sql).toContain("'DAILY_GOAL'");
    expect(atomicQuery.sql).toContain("ON CONFLICT (source_type, source_key) DO NOTHING");
    expect(atomicQuery.sql).toContain("ON CONFLICT (learner_id, vocabulary_id) DO NOTHING");
    expect(atomicQuery.sql).toContain("household_id =");
    expect(atomicQuery.sql).toContain("::bigint");
    expect(atomicQuery.sql).toContain("::bigint AS expected_revision");
    expect(atomicQuery.sql).not.toContain("cp.revision AS expected_revision");
    expect(atomicQuery.sql).not.toContain(REVIEW_ID);
    expect(atomicQuery.params).toContain(REVIEW_ID);
  });

  it("rejects a stale NEW write after the daily allowance is consumed", async () => {
    const database = queuedDatabase([
      authorizedRows(),
      vocabularyRows(),
      emptyEvent(),
      emptyProgress(),
      { rows: [{ existing_fingerprint: null, existing_response_payload: null, inserted_review_id: null, resulting_revision: null, daily_limit_reached: true }] }
    ]);
    const scheduler = vi.fn(() => schedulerOutput);

    await expect(createReviewService(database, {
      scheduler,
      now: () => new Date("2026-09-14T03:00:00.000Z")
    }).write(USER_ID, request)).rejects.toMatchObject({
      code: "DAILY_NEW_LIMIT_REACHED",
      status: 409
    });
    const atomicQuery = new PgDialect().sqlToQuery(database.execute.mock.calls[4]?.[0]);
    expect(atomicQuery.sql).toContain("pg_advisory_xact_lock");
    expect(atomicQuery.sql).toContain("daily_new_word_limit");
    expect(atomicQuery.sql).toContain("first_learned_date");
  });

  it("uses the stored response for an idempotent replay without scheduling", async () => {
    const fingerprint = await createReviewFingerprint(request);
    const stored = {
      reviewId: REVIEW_ID,
      learnerId: LEARNER_ID,
      vocabularyId: 1,
      result: "REMEMBERED" as const,
      progress: { ...schedulerOutput, revision: 1 }
    };
    const database = queuedDatabase([
      authorizedRows(),
      vocabularyRows(),
      { rows: [{ request_fingerprint: fingerprint, response_payload: stored }] }
    ]);
    const scheduler = vi.fn(() => schedulerOutput);

    await expect(createReviewService(database, { scheduler }).write(USER_ID, request)).resolves.toEqual({
      status: 200,
      response: stored
    });
    expect(database.execute).toHaveBeenCalledTimes(3);
    expect(scheduler).not.toHaveBeenCalled();
  });

  it("returns an idempotency conflict without scheduling or writing", async () => {
    const database = queuedDatabase([
      authorizedRows(),
      vocabularyRows(),
      { rows: [{ request_fingerprint: "sha256:different", response_payload: {} }] }
    ]);
    const scheduler = vi.fn(() => schedulerOutput);

    await expect(createReviewService(database, { scheduler }).write(USER_ID, request)).rejects.toMatchObject({
      code: "IDEMPOTENCY_CONFLICT",
      status: 409
    });
    expect(database.execute).toHaveBeenCalledTimes(3);
    expect(scheduler).not.toHaveBeenCalled();
  });

  it("returns a conflict when an authorized request reuses a reviewId for another learner", async () => {
    const otherLearnerId = "00000000-0000-4000-8000-000000000011";
    const database = queuedDatabase([
      { rows: [{ learner_id: otherLearnerId, household_id: HOUSEHOLD_ID }] },
      vocabularyRows(),
      { rows: [{ request_fingerprint: await createReviewFingerprint(request), response_payload: {} }] }
    ]);
    const scheduler = vi.fn(() => schedulerOutput);

    await expect(createReviewService(database, { scheduler }).write(USER_ID, {
      ...request,
      learnerId: otherLearnerId
    })).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT", status: 409 });
    expect(scheduler).not.toHaveBeenCalled();
  });

  it("treats a foreign-household reviewId as fresh in the authorized scope", async () => {
    const foreignEvent = { rows: [{ request_fingerprint: "sha256:foreign", response_payload: {} }] };
    const database = {
      execute: vi.fn(async (query) => {
        const rendered = new PgDialect().sqlToQuery(query);
        if (rendered.sql.includes("WITH locked_learner")) return insertedReview();
        if (rendered.sql.includes('FROM "vocabflow_app"."review_events"')) {
          return rendered.sql.includes("household_id") ? emptyEvent() : foreignEvent;
        }
        if (rendered.sql.includes('"vocabflow_app"."household_members"')) return authorizedRows();
        if (rendered.sql.includes('FROM "vocabflow_app"."households"')) return vocabularyRows();
        if (rendered.sql.includes('FROM "vocabflow_app"."learner_progress"')) return emptyProgress();
        throw new Error("unexpected test query");
      })
    } satisfies ReviewDatabase;
    const scheduler = vi.fn(() => schedulerOutput);

    await expect(createReviewService(database, { scheduler }).write(USER_ID, request)).resolves.toMatchObject({ status: 201 });
    expect(scheduler).toHaveBeenCalledTimes(1);
    const replayQuery = new PgDialect().sqlToQuery(database.execute.mock.calls[2]?.[0]);
    expect(replayQuery.sql).toContain("household_id =");
    expect(replayQuery.params).toContain(HOUSEHOLD_ID);
  });

  it("authorizes before replay and does not disclose cross-household review data", async () => {
    const database = queuedDatabase([{ rows: [] }]);
    await expect(createReviewService(database).write(USER_ID, request)).rejects.toMatchObject({
      code: "HOUSEHOLD_ACCESS_DENIED",
      status: 403
    });
    expect(database.execute).toHaveBeenCalledTimes(1);
  });

  it("rejects missing or disabled vocabulary before scheduler execution", async () => {
    const database = queuedDatabase([authorizedRows(), { rows: [] }]);
    const scheduler = vi.fn(() => schedulerOutput);

    await expect(createReviewService(database, { scheduler }).write(USER_ID, request)).rejects.toMatchObject({
      code: "VOCABULARY_NOT_FOUND",
      status: 404
    });
    expect(scheduler).not.toHaveBeenCalled();
  });

  it("rejects a stale expected revision before scheduler execution", async () => {
    const database = queuedDatabase([
      authorizedRows(),
      vocabularyRows(),
      emptyEvent(),
      { rows: [{
        status: "LEARNING",
        consecutive_correct: 1,
        interval_days: 1,
        first_learned_date: "2026-09-01",
        last_reviewed_date: "2026-09-13",
        next_review_date: "2026-09-14",
        total_correct: 1,
        total_incorrect: 0,
        revision: 4
      }] }
    ]);
    const scheduler = vi.fn(() => schedulerOutput);

    await expect(createReviewService(database, { scheduler }).write(USER_ID, { ...request, expectedRevision: 3 })).rejects.toMatchObject({
      code: "STALE_REVISION",
      status: 409,
      details: { currentRevision: 4 }
    });
    expect(scheduler).not.toHaveBeenCalled();
  });

  it("maps a write race to replay or stale without a second scheduler call", async () => {
    const fingerprint = await createReviewFingerprint(request);
    const stored = {
      reviewId: REVIEW_ID,
      learnerId: LEARNER_ID,
      vocabularyId: 1,
      result: "REMEMBERED" as const,
      progress: { ...schedulerOutput, revision: 1 }
    };
    const database = queuedDatabase([
      authorizedRows(),
      vocabularyRows(),
      emptyEvent(),
      emptyProgress(),
      { rows: [{ existing_fingerprint: null, existing_response_payload: null, inserted_review_id: null, resulting_revision: null, daily_limit_reached: false }] },
      { rows: [{ request_fingerprint: fingerprint, response_payload: stored }] }
    ]);
    const scheduler = vi.fn(() => schedulerOutput);

    await expect(createReviewService(database, { scheduler }).write(USER_ID, request)).resolves.toEqual({
      status: 200,
      response: stored
    });
    expect(scheduler).toHaveBeenCalledTimes(1);
  });

  it("keeps foreign reviewIds hidden during post-write race reclassification", async () => {
    const foreignEvent = { rows: [{ request_fingerprint: "sha256:foreign", response_payload: {} }] };
    let progressReads = 0;
    const database = {
      execute: vi.fn(async (query) => {
        const rendered = new PgDialect().sqlToQuery(query);
        if (rendered.sql.includes("WITH locked_learner")) {
          return { rows: [{ existing_fingerprint: null, existing_response_payload: null, inserted_review_id: null, resulting_revision: null, daily_limit_reached: false }] };
        }
        if (rendered.sql.includes('FROM "vocabflow_app"."review_events"')) {
          return rendered.sql.includes("household_id") ? emptyEvent() : foreignEvent;
        }
        if (rendered.sql.includes('"vocabflow_app"."household_members"')) return authorizedRows();
        if (rendered.sql.includes('FROM "vocabflow_app"."households"')) return vocabularyRows();
        if (rendered.sql.includes('FROM "vocabflow_app"."learner_progress"')) {
          progressReads += 1;
          return progressReads === 1
            ? emptyProgress()
            : { rows: [{
                status: "LEARNING",
                consecutive_correct: "1",
                interval_days: "1",
                first_learned_date: "2026-09-01",
                last_reviewed_date: "2026-09-13",
                next_review_date: "2026-09-14",
                total_correct: "1",
                total_incorrect: "0",
                revision: "1"
              }] };
        }
        throw new Error("unexpected test query");
      })
    } satisfies ReviewDatabase;
    const scheduler = vi.fn(() => schedulerOutput);

    await expect(createReviewService(database, { scheduler }).write(USER_ID, request)).rejects.toMatchObject({
      code: "STALE_REVISION",
      status: 409,
      details: { currentRevision: 1 }
    });
    expect(scheduler).toHaveBeenCalledTimes(1);
  });

  it("reclassifies a duplicate event SQL race without exposing the database error", async () => {
    const fingerprint = await createReviewFingerprint(request);
    const stored = {
      reviewId: REVIEW_ID,
      learnerId: LEARNER_ID,
      vocabularyId: 1,
      result: "REMEMBERED" as const,
      progress: { ...schedulerOutput, revision: 1 }
    };
    const database = {
      execute: vi.fn()
        .mockResolvedValueOnce(authorizedRows())
        .mockResolvedValueOnce(vocabularyRows())
        .mockResolvedValueOnce(emptyEvent())
        .mockResolvedValueOnce(emptyProgress())
        .mockRejectedValueOnce({ code: "23505", message: "duplicate key value violates unique constraint" })
        .mockResolvedValueOnce({ rows: [{ request_fingerprint: fingerprint, response_payload: stored }] })
    } satisfies ReviewDatabase;
    const scheduler = vi.fn(() => schedulerOutput);

    await expect(createReviewService(database, { scheduler }).write(USER_ID, request)).resolves.toEqual({
      status: 200,
      response: stored
    });
    expect(scheduler).toHaveBeenCalledTimes(1);
  });

  it("derives dates from the household timezone rather than UTC", () => {
    expect(householdLocalDate(new Date("2026-09-15T01:00:00.000Z"), "America/Los_Angeles")).toBe("2026-09-14");
    expect(householdLocalDate(new Date("2026-09-15T01:00:00.000Z"), "Asia/Ho_Chi_Minh")).toBe("2026-09-15");
    expect(() => householdLocalDate(new Date("2026-09-15T01:00:00.000Z"), "Not/A_Timezone")).toThrow();
  });

  it("canonicalizes UUIDs for equal semantic fingerprints and replay", async () => {
    const lowercase = parseReviewRequest(request);
    const uppercase = parseReviewRequest({
      ...request,
      reviewId: REVIEW_ID.toUpperCase(),
      learnerId: LEARNER_ID.toUpperCase()
    });
    const first = await createReviewFingerprint(lowercase);
    const uppercaseFingerprint = await createReviewFingerprint(uppercase);
    const second = await createReviewFingerprint(parseReviewRequest({
      ...request,
      reviewId: "123e4567-e89b-42d3-a456-426614174abf"
    }));
    const differentLearnerFingerprint = await createReviewFingerprint(parseReviewRequest({
      ...request,
      learnerId: "123e4567-e89b-42d3-a456-426614174abf"
    }));
    const changed = await createReviewFingerprint(parseReviewRequest({ ...request, result: "FORGOTTEN" }));
    expect(REVIEW_ID.toUpperCase()).not.toBe(REVIEW_ID);
    expect(LEARNER_ID.toUpperCase()).not.toBe(LEARNER_ID);
    expect(uppercase).toEqual(lowercase);
    expect(uppercaseFingerprint).toBe(first);
    expect(second).toBe(first);
    expect(differentLearnerFingerprint).not.toBe(first);
    expect(changed).not.toBe(first);
  });

  it("replays a case-only UUID variant instead of conflicting", async () => {
    const stored = {
      reviewId: REVIEW_ID,
      learnerId: LEARNER_ID,
      vocabularyId: 1,
      result: "REMEMBERED" as const,
      progress: { ...schedulerOutput, revision: 1 }
    };
    const database = queuedDatabase([
      authorizedRows(),
      vocabularyRows(),
      { rows: [{ request_fingerprint: await createReviewFingerprint(request), response_payload: stored }] }
    ]);
    const scheduler = vi.fn(() => schedulerOutput);

    await expect(createReviewService(database, { scheduler }).write(USER_ID, {
      ...request,
      reviewId: REVIEW_ID.toUpperCase(),
      learnerId: LEARNER_ID.toUpperCase()
    })).resolves.toEqual({ status: 200, response: stored });
    expect(scheduler).not.toHaveBeenCalled();
  });

  it("round-trips scheduler values above the int32 boundary", async () => {
    const large = 2147483647;
    const database = queuedDatabase([
      authorizedRows(),
      vocabularyRows(),
      emptyEvent(),
      { rows: [{
          status: "MASTERED",
          consecutive_correct: String(large),
          interval_days: "30",
          first_learned_date: "2026-09-01",
          last_reviewed_date: "2026-09-13",
          next_review_date: "2026-10-13",
          total_correct: String(large),
          total_incorrect: "0",
          revision: String(large)
        }] },
      insertedReview(large + 1)
    ]);

    const result = await createReviewService(database, {
      now: () => new Date("2026-09-14T03:00:00.000Z")
    }).write(USER_ID, { ...request, expectedRevision: large });

    expect(result.status).toBe(201);
    expect(result.response.progress.consecutiveCorrect).toBe(large + 1);
    expect(result.response.progress.totalCorrect).toBe(large + 1);
    const atomicQuery = new PgDialect().sqlToQuery(database.execute.mock.calls[4]?.[0]);
    expect(atomicQuery.sql).toContain("::bigint");
    expect(atomicQuery.sql).not.toContain("::integer AS consecutive_correct");
  });

  it("persists the safe-integer maximum without narrowing", async () => {
    const max = Number.MAX_SAFE_INTEGER;
    const database = queuedDatabase([
      authorizedRows(),
      vocabularyRows(),
      emptyEvent(),
      { rows: [{
          status: "MASTERED",
          consecutive_correct: String(max - 1),
          interval_days: "30",
          first_learned_date: "2026-09-01",
          last_reviewed_date: "2026-09-13",
          next_review_date: "2026-10-13",
          total_correct: String(max - 1),
          total_incorrect: "0",
          revision: String(max - 1)
        }] },
      insertedReview(String(max))
    ]);

    const result = await createReviewService(database, {
      now: () => new Date("2026-09-14T03:00:00.000Z")
    }).write(USER_ID, { ...request, expectedRevision: max - 1 });

    expect(result.response.progress.consecutiveCorrect).toBe(max);
    expect(result.response.progress.totalCorrect).toBe(max);
    expect(result.response.progress.revision).toBe(max);
  });

  it("fails closed at revision exhaustion before scheduler execution", async () => {
    const max = Number.MAX_SAFE_INTEGER;
    const database = queuedDatabase([
      authorizedRows(),
      vocabularyRows(),
      emptyEvent(),
      { rows: [{
          status: "LEARNING",
          consecutive_correct: "1",
          interval_days: "1",
          first_learned_date: "2026-09-01",
          last_reviewed_date: "2026-09-13",
          next_review_date: "2026-09-14",
          total_correct: "1",
          total_incorrect: "0",
          revision: String(max)
        }] }
    ]);
    const scheduler = vi.fn(() => schedulerOutput);

    await expect(createReviewService(database, { scheduler }).write(USER_ID, {
      ...request,
      expectedRevision: max
    })).rejects.toMatchObject({ code: "INTERNAL_ERROR", status: 500 });
    expect(scheduler).not.toHaveBeenCalled();
  });

  it("rejects an unsafe bigint string before scheduler execution", async () => {
    const database = queuedDatabase([
      authorizedRows(),
      vocabularyRows(),
      emptyEvent(),
      { rows: [{
          status: "LEARNING",
          consecutive_correct: "1",
          interval_days: "1",
          first_learned_date: "2026-09-01",
          last_reviewed_date: "2026-09-13",
          next_review_date: "2026-09-14",
          total_correct: "1",
          total_incorrect: "0",
          revision: String(Number.MAX_SAFE_INTEGER + 1)
        }] }
    ]);
    const scheduler = vi.fn(() => schedulerOutput);

    await expect(createReviewService(database, { scheduler }).write(USER_ID, request)).rejects.toMatchObject({
      code: "INTERNAL_ERROR",
      status: 500
    });
    expect(scheduler).not.toHaveBeenCalled();
  });
});

describe("POST /api/reviews route", () => {
  it("requires a session and maps service errors to stable envelopes", async () => {
    const unauthorizedApp = createApp({ readSession: async () => null });
    const unauthorized = await unauthorizedApp.request("http://localhost/api/reviews", { method: "POST", body: "{}" }, {} as WorkerBindings);
    expect(unauthorized.status).toBe(401);
    expect(await unauthorized.json()).toEqual({ error: { code: "UNAUTHORIZED", message: "Đăng nhập để tiếp tục." } });

    const forbiddenApp = createApp({
      readSession: async () => ({ user: { id: USER_ID } }),
      reviewService: { write: vi.fn(async () => { throw new Error("raw SQL secret"); }) }
    });
    const forbidden = await forbiddenApp.request("http://localhost/api/reviews", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request)
    }, {} as WorkerBindings);
    expect(forbidden.status).toBe(503);
    const body = await forbidden.text();
    expect(JSON.parse(body)).toEqual({ error: { code: "INTERNAL_ERROR", message: "Không thể lưu tiến trình lúc này. Vui lòng thử lại." } });
    expect(body).not.toContain("raw SQL secret");

    const staleApp = createApp({
      readSession: async () => ({ user: { id: USER_ID } }),
      reviewService: { write: vi.fn(async () => { throw new ReviewServiceError("STALE_REVISION", 409, { currentRevision: 4 }); }) }
    });
    const stale = await staleApp.request("http://localhost/api/reviews", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request)
    }, {} as WorkerBindings);
    expect(stale.status).toBe(409);
    expect(await stale.json()).toEqual({
      error: {
        code: "STALE_REVISION",
        message: "Tiến trình đã thay đổi. Vui lòng tải lại.",
        details: { currentRevision: 4 }
      }
    });

    const successResponse = {
      reviewId: REVIEW_ID,
      learnerId: LEARNER_ID,
      vocabularyId: 1,
      result: "REMEMBERED" as const,
      progress: { ...schedulerOutput, revision: 1 }
    };
    const successApp = createApp({
      readSession: async () => ({ user: { id: USER_ID } }),
      reviewService: { write: vi.fn(async () => ({ status: 201 as const, response: successResponse })) }
    });
    const success = await successApp.request("http://localhost/api/reviews", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request)
    });
    expect(success.status).toBe(201);
    expect(await success.json()).toEqual(successResponse);
  });
});
