import { sql, type SQL } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { errorEnvelope, practiceActionSchema, practiceCreateSchema, practiceRetryRequestSchema, practiceHistorySchema, type ErrorCode, type PracticeAction, type PracticeSession, type LearnerVocabularyDto, type PracticeConfig, type PracticeSource, type PracticeHistory, type PracticeResults } from "@vocabflow/contracts";
import { applyPracticeAction, createPracticeState, createPracticeRetryState, defaultPracticeConfig, practiceConfigFingerprint, practiceContentIsCurrent, practiceQuestionPinsAreCurrent, practiceHistoryEntry, practiceResults, selectPracticeRetryQuestions, presentPractice, PracticeRuleError, type PracticeState, type PracticeHistoryRecord } from "@vocabflow/learning-domain";
import { authorizeLearnerOwnership } from "./learners";
import { createLearnerVocabularyService } from "./learner-vocabulary";
import { vocabularyDatasetVersion } from "./vocabulary-dataset-version";
import { withoutUnclearedV2Media } from "./v2-public-media";
import type { RuntimeBindings } from "./runtime-bindings";

export class PracticeError extends Error {
  constructor(readonly code: ErrorCode, readonly status: 400 | 403 | 404 | 409 | 503) { super(code); }
}
export type PracticeRepository = {
  history: (learnerId: string, page: number, needsPage: number) => Promise<PracticeHistory>;
  results: (learnerId: string, sessionId: string) => Promise<PracticeResults | null>;
  read: (learnerId: string, sessionId: string) => Promise<PracticeState | null>;
  insert: (state: PracticeState) => Promise<void>;
  replace: (state: PracticeState, expectedRevision: number) => Promise<boolean>;
};
export type PracticeService = {
  history: (userId: string, learnerId: string, page: number, needsPage: number) => Promise<PracticeHistory>;
  results: (userId: string, learnerId: string, sessionId: string) => Promise<PracticeResults>;
  retry: (userId: string, learnerId: string, originalId: string, sessionId: string, questionIds?: string[]) => Promise<PracticeSession>;
  create: (userId: string, learnerId: string, sessionId: string, config?: PracticeConfig) => Promise<PracticeSession>;
  get: (userId: string, learnerId: string, sessionId: string) => Promise<PracticeSession>;
  act: (userId: string, learnerId: string, sessionId: string, action: PracticeAction) => Promise<PracticeSession>;
};
export function createPracticeService(deps: {
  authorize: (userId: string, learnerId: string) => Promise<boolean>;
  sourceWords: (userId: string, learnerId: string, source: PracticeSource) => Promise<LearnerVocabularyDto[]>;
  currentWords: (userId: string, learnerId: string, ids: number[]) => Promise<LearnerVocabularyDto[]>;
  repository: PracticeRepository;
  now?: () => Date;
}): PracticeService {
  async function authorize(userId: string, learnerId: string) {
    if (!await deps.authorize(userId, learnerId)) throw new PracticeError("HOUSEHOLD_ACCESS_DENIED", 403);
  }
  async function read(learnerId: string, sessionId: string) {
    const state = await deps.repository.read(learnerId, sessionId);
    if (!state) throw new PracticeError("PRACTICE_NOT_FOUND", 404);
    return state;
  }
  async function requireCurrent(userId: string, learnerId: string, state: PracticeState) {
    const ids = state.questions.slice(state.results.length).map(question => question.vocabularyId);
    if (ids.length && !practiceContentIsCurrent(state, await deps.currentWords(userId, learnerId, ids))) throw new PracticeError("STALE_PRACTICE_CONTENT", 409);
  }
  return {
    async history(userId, learnerId, page, needsPage) { await authorize(userId, learnerId); return deps.repository.history(learnerId, page, needsPage); },
    async results(userId, learnerId, sessionId) {
      await authorize(userId, learnerId);
      const results = await deps.repository.results(learnerId, sessionId);
      if (!results) throw new PracticeError("PRACTICE_NOT_FOUND", 404);
      return results;
    },
    async retry(userId, learnerId, originalId, sessionId, questionIds) {
      await authorize(userId, learnerId);
      if (originalId === sessionId) throw new PracticeError("INVALID_REQUEST", 400);
      const original = await read(learnerId, originalId);
      const selected = selectPracticeRetryQuestions(original, questionIds);
      const ids = selected.map(q => q.questionId).sort();
      function sameRetry(state: PracticeState) {
        if (state.retryOf !== originalId || JSON.stringify(state.retryQuestionIds) !== JSON.stringify(ids)) throw new PracticeError("IDEMPOTENCY_CONFLICT", 409);
        return presentPractice(state);
      }
      const existing = await deps.repository.read(learnerId, sessionId);
      if (existing) { await requireCurrent(userId, learnerId, existing); return sameRetry(existing); }
      if (!practiceQuestionPinsAreCurrent(selected, await deps.currentWords(userId, learnerId, selected.map(q => q.vocabularyId)))) throw new PracticeError("STALE_PRACTICE_CONTENT", 409);
      const state = createPracticeRetryState(sessionId, original, ids, await deps.sourceWords(userId, learnerId, original.config.source), () => crypto.randomUUID());
      if (!state.questions.length) return presentPractice(state);
      await deps.repository.insert(state);
      return sameRetry(await read(learnerId, sessionId));
    },
    async create(userId, learnerId, sessionId, config = defaultPracticeConfig) {
      await authorize(userId, learnerId);
      const existing = await deps.repository.read(learnerId, sessionId);
      function presentSameConfig(state: PracticeState) {
        if (practiceConfigFingerprint(state.config) !== practiceConfigFingerprint(config)) throw new PracticeError("IDEMPOTENCY_CONFLICT", 409);
        return presentPractice(state);
      }
      if (existing) { await requireCurrent(userId, learnerId, existing); return presentSameConfig(existing); }
      const words = (await deps.sourceWords(userId, learnerId, config.source)).filter(word => word.enabled && (config.source.kind !== "learned" || word.status !== "NEW"));
      const state = createPracticeState(sessionId, learnerId, words, () => crypto.randomUUID(), Math.random, config);
      // Do not create empty sessions, but return an honest setup result.
      if (!state.questions.length) return presentPractice(state);
      await deps.repository.insert(state);
      return presentSameConfig(await read(learnerId, sessionId));
    },
    async get(userId, learnerId, sessionId) {
      await authorize(userId, learnerId);
      const state = await read(learnerId, sessionId);
      await requireCurrent(userId, learnerId, state);
      return presentPractice(state);
    },
    async act(userId, learnerId, sessionId, action) {
      await authorize(userId, learnerId);
      // CAS prevents double resolution even when two distinct action IDs race.
      for (let retry = 0; retry < 4; retry++) {
        const state = await read(learnerId, sessionId);
        const next = applyPracticeAction(state, action, (deps.now?.() ?? new Date()).toISOString());
        if (next === state) return presentPractice(state);
        await requireCurrent(userId, learnerId, state);
        if (await deps.repository.replace(next, state.revision)) return presentPractice(next);
      }
      throw new PracticeError("STALE_QUESTION", 409);
    }
  };
}
type Database = { execute: (query: SQL) => Promise<unknown> };
function rows(result: unknown): { state: PracticeState }[] {
  if (Array.isArray(result)) return result;
  if (result && typeof result === "object" && "rows" in result && Array.isArray(result.rows)) return result.rows;
  throw new PracticeError("INTERNAL_ERROR", 503);
}
export function postgresPracticeRepository(database: Database): PracticeRepository {
  const record = (row: { state: PracticeState; created_at: unknown }): PracticeHistoryRecord => ({ state: row.state, createdAt: new Date(String(row.created_at)).toISOString() });
  return {
    async results(learnerId, sessionId) {
      const result = await database.execute(sql`SELECT state,created_at::text AS created_at FROM vocabflow_app.practice_sessions WHERE learner_id=${learnerId}::uuid AND id=${sessionId}::uuid`);
      const first = rows(result)[0] as { state: PracticeState; created_at: unknown } | undefined;
      return first ? practiceResults(record(first)) : null;
    },
    async history(learnerId, page, needsPage) {
      const [entries, aggregates] = await Promise.all([
        database.execute(sql`SELECT state,created_at::text AS created_at FROM vocabflow_app.practice_sessions
          WHERE learner_id=${learnerId}::uuid ORDER BY created_at DESC,id DESC LIMIT 20 OFFSET ${(page - 1) * 20}`),
        database.execute(sql`WITH events AS (
          SELECT s.id::text AS session_id,
            (s.state->'questions'->((r.ordinality-1)::integer)->>'vocabularyId')::integer AS vocabulary_id,
            r.value->>'answer' AS word,r.value->>'outcome' AS outcome,
            COALESCE((r.value->>'answeredAt')::timestamptz,s.created_at) AS answered_at
          FROM vocabflow_app.practice_sessions s
          CROSS JOIN LATERAL jsonb_array_elements(s.state->'results') WITH ORDINALITY r(value,ordinality)
          WHERE s.learner_id=${learnerId}::uuid AND r.value->>'outcome' IN ('correct','incorrect')
        ), ranked AS (
          SELECT *, count(*) FILTER (WHERE outcome='incorrect') OVER (PARTITION BY vocabulary_id) AS errors,
            row_number() OVER (PARTITION BY vocabulary_id ORDER BY answered_at DESC,session_id DESC) AS rank
          FROM events
        ), needs AS (SELECT * FROM ranked WHERE rank=1 AND outcome='incorrect'),
        paged AS (SELECT * FROM needs ORDER BY answered_at DESC,word,vocabulary_id LIMIT 20 OFFSET ${(needsPage - 1) * 20})
        SELECT (SELECT count(*)::integer FROM vocabflow_app.practice_sessions WHERE learner_id=${learnerId}::uuid) AS total_sessions,
          (SELECT count(*)::integer FROM needs) AS needs_total,
          COALESCE((SELECT jsonb_agg(jsonb_build_object('vocabularyId',vocabulary_id,'word',word,'incorrectCount',errors,
            'lastAnsweredAt',to_char(answered_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'sessionId',session_id)
            ORDER BY answered_at DESC,word,vocabulary_id) FROM paged),'[]'::jsonb) AS needs_practice`)
      ]);
      const [aggregate] = rows(aggregates) as unknown as { total_sessions: unknown; needs_total: unknown; needs_practice: unknown }[];
      return practiceHistorySchema.parse({ page, needsPage, pageSize: 20, totalSessions: Number(aggregate?.total_sessions), needsTotal: Number(aggregate?.needs_total),
        items: (rows(entries) as { state: PracticeState; created_at: unknown }[]).map(row => practiceHistoryEntry(record(row))), needsPractice: aggregate?.needs_practice });
    },
    async read(learnerId, sessionId) {
      return rows(await database.execute(sql`SELECT state FROM vocabflow_app.practice_sessions
        WHERE learner_id = ${learnerId}::uuid AND id = ${sessionId}::uuid`))[0]?.state ?? null;
    },
    async insert(state) {
      await database.execute(sql`INSERT INTO vocabflow_app.practice_sessions (learner_id, id, revision, state)
        VALUES (${state.learnerId}::uuid, ${state.sessionId}::uuid, ${state.revision}, ${JSON.stringify(state)}::jsonb)
        ON CONFLICT (learner_id, id) DO NOTHING`);
    },
    async replace(state, expectedRevision) {
      const resolved = state.questions[state.results.length - 1]!;
      return rows(await database.execute(sql`UPDATE vocabflow_app.practice_sessions
        SET state = ${JSON.stringify(state)}::jsonb, revision = ${state.revision}
        WHERE learner_id = ${state.learnerId}::uuid AND id = ${state.sessionId}::uuid AND revision = ${expectedRevision}
        AND EXISTS (SELECT 1 FROM vocabflow_app.vocabularies v WHERE v.id=${resolved.vocabularyId} AND v.enabled=true AND v.content_version=${resolved.contentVersion})
        RETURNING state`)).length === 1;
    }
  };
}
export function createPracticeContentReader(database: Database, env: RuntimeBindings) {
  async function permittedWords(userId: string, learnerId: string, source?: PracticeSource, ids?: number[]) {
    const vocabulary = createLearnerVocabularyService(database, { datasetVersion: vocabularyDatasetVersion(env), practiceSource: source, practiceIds: ids });
    const words = withoutUnclearedV2Media(await vocabulary.list(userId, learnerId), env) as LearnerVocabularyDto[];
    return words.map(word => {
      if (word.audioUrl || vocabularyDatasetVersion(env) !== "owner-local") return word;
      const audio = word.developmentMedia?.wordAudio;
      const item = audio?.length === 1 ? audio[0] : undefined;
      if (!item || item.reviewStatus !== "ACCEPTED_MAPPING" || !/^\/api\/local-owner-editorial-media\/[a-f0-9]{64}\.mp3$/.test(item.url)
        || (item.targetProposalKey && item.targetProposalKey !== word.masterSenseIdentity)
        || (item.targetContentSha256 && item.targetContentSha256 !== word.contentHash)) return word;
      return { ...word, audioUrl: item.url };
    });
  }
  return {
    sourceWords: async (userId: string, learnerId: string, source: PracticeSource) => {
      if (source.kind === "set") {
        const result = await database.execute(sql`SELECT true AS state FROM vocabflow_app.learning_sets WHERE id=${source.setId} AND enabled=true`);
        if (!rows(result).length) throw new PracticeError("INVALID_REQUEST", 400);
      }
      return permittedWords(userId, learnerId, source);
    },
    currentWords: (userId: string, learnerId: string, ids: number[]) => permittedWords(userId, learnerId, undefined, ids)
  };
}
export function createDatabasePracticeService(database: Database, env: RuntimeBindings) {
  return createPracticeService({
    authorize: async (userId, learnerId) => (await authorizeLearnerOwnership(database, userId, learnerId)).decision === "ALLOW",
    ...createPracticeContentReader(database, env), repository: postgresPracticeRepository(database)
  });
}
export function practiceRoutes(deps: {
  readSession: (request: Request, env: RuntimeBindings) => Promise<{ user: { id: string } } | null>;
  service?: PracticeService;
}) {
  const router = new Hono<{ Bindings: RuntimeBindings; Variables: { userId: string; practice: PracticeService } }>();
  router.use("*", async (c, next) => {
    c.header("Cache-Control", "no-store");
    try {
      const session = await deps.readSession(c.req.raw, c.env);
      if (!session?.user?.id) return c.json(errorEnvelope("UNAUTHORIZED", "Đăng nhập để tiếp tục."), 401);
      const origin = c.req.header("origin");
      if (c.req.method === "POST" && origin && origin !== new URL(c.req.url).origin) throw new PracticeError("ORIGIN_DENIED", 403);
      c.set("userId", session.user.id);
      if (deps.service) c.set("practice", deps.service);
      else {
        if (!c.env?.DATABASE_URL) throw new PracticeError("SERVICE_UNAVAILABLE", 503);
        const { createHttpDatabase } = await import("./db/client");
        c.set("practice", createDatabasePracticeService(createHttpDatabase(c.env.DATABASE_URL, c.env.DATABASE_DRIVER), c.env));
      }
      await next();
    } catch (error) {
      const code = error instanceof PracticeError || error instanceof PracticeRuleError ? error.code : "SERVICE_UNAVAILABLE";
      const status = error instanceof PracticeError ? error.status : error instanceof PracticeRuleError ? 409 : 503;
      return c.json(errorEnvelope(code, code === "HOUSEHOLD_ACCESS_DENIED" ? "Bạn không có quyền truy cập dữ liệu này." : "Chưa thể lưu buổi luyện. Vui lòng thử lại."), status);
    }
  });
  router.onError((error, c) => {
    const code = error instanceof PracticeError || error instanceof PracticeRuleError ? error.code : "SERVICE_UNAVAILABLE";
    return c.json(errorEnvelope(code, "Chưa thể tải hoặc lưu buổi luyện. Vui lòng thử lại."), error instanceof PracticeError ? error.status : error instanceof PracticeRuleError ? error.code === "INVALID_REQUEST" ? 400 : 409 : 503);
  });
  async function payload(request: Request) {
    const raw = await request.text();
    if (raw.length > 8192) throw new PracticeError("INVALID_REQUEST", 400);
    try { return JSON.parse(raw) as unknown; } catch { throw new PracticeError("INVALID_REQUEST", 400); }
  }
  function sessionId(value: string) {
    if (!z.uuid().safeParse(value).success) throw new PracticeError("PRACTICE_NOT_FOUND", 404);
    return value;
  }
  router.post("/", async c => {
    const parsed = practiceCreateSchema.safeParse(await payload(c.req.raw));
    if (!parsed.success) throw new PracticeError("INVALID_REQUEST", 400);
    const { sessionId, ...config } = parsed.data;
    return c.json(await c.get("practice").create(c.get("userId"), c.req.param("learnerId")!, sessionId, config));
  });
  router.get("/", async c => {
    const params = new URL(c.req.url).searchParams;
    if ([...params.keys()].some(key => !["page", "needsPage"].includes(key)) || params.getAll("page").length > 1 || params.getAll("needsPage").length > 1) throw new PracticeError("INVALID_REQUEST", 400);
    const parsePage = (value: string | null) => { if (value === null) return 1; const page = Number(value); if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(page) || page > 100000) throw new PracticeError("INVALID_REQUEST", 400); return page; };
    return c.json(await c.get("practice").history(c.get("userId"), c.req.param("learnerId")!, parsePage(params.get("page")), parsePage(params.get("needsPage"))));
  });
  router.get("/:sessionId/results", async c => c.json(await c.get("practice").results(c.get("userId"), c.req.param("learnerId")!, sessionId(c.req.param("sessionId")))));
  router.post("/:sessionId/retry", async c => {
    const parsed = practiceRetryRequestSchema.safeParse(await payload(c.req.raw));
    if (!parsed.success) throw new PracticeError("INVALID_REQUEST", 400);
    return c.json(await c.get("practice").retry(c.get("userId"), c.req.param("learnerId")!, sessionId(c.req.param("sessionId")), parsed.data.sessionId, parsed.data.questionIds));
  });
  router.get("/:sessionId", async c => c.json(await c.get("practice").get(c.get("userId"), c.req.param("learnerId")!, sessionId(c.req.param("sessionId")))));
  router.post("/:sessionId/actions", async c => {
    const parsed = practiceActionSchema.safeParse(await payload(c.req.raw));
    if (!parsed.success) throw new PracticeError("INVALID_REQUEST", 400);
    return c.json(await c.get("practice").act(c.get("userId"), c.req.param("learnerId")!, sessionId(c.req.param("sessionId")), parsed.data));
  });
  return router;
}
