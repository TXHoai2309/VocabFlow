import { sql, type SQL } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { errorEnvelope, fishGameActionSchema, fishGameCreateSchema, fishGameFinishSchema, fishGameHistorySchema, type ErrorCode, type FishGameAction, type FishGameConfig, type FishGameSession, type FishGameHistory, type FishGameResults, type LearnerVocabularyDto, type PracticeSource } from "@vocabflow/contracts";
import { applyFishGameAction, createFishGame, finishFishGame, fishGameHistoryEntry, fishGameResults, fishGameConfigFingerprint, presentFishGame, practiceQuestionPinsAreCurrent, PracticeRuleError, type FishGameState, type FishGameHistoryRow } from "@vocabflow/learning-domain";
import { authorizeLearnerOwnership } from "./learners";
import { createPracticeContentReader, PracticeError } from "./practice";
import type { RuntimeBindings } from "./runtime-bindings";

export class FishGameError extends Error {
  constructor(readonly code: ErrorCode, readonly status: 400 | 403 | 404 | 409 | 503) { super(code); }
}
export type FishGameRepository = {
  history: (learnerId: string, page: number, recordsPage: number) => Promise<FishGameHistory>;
  results: (learnerId: string, gameId: string, page: number) => Promise<FishGameResults | null>;
  read: (learnerId: string, gameId: string) => Promise<FishGameState | null>;
  insert: (state: FishGameState) => Promise<void>;
  replace: (state: FishGameState, revision: number) => Promise<boolean>;
};
export type FishGameService = {
  history: (user: string, learner: string, page: number, recordsPage: number) => Promise<FishGameHistory>;
  results: (user: string, learner: string, game: string, page: number) => Promise<FishGameResults>;
  finish: (user: string, learner: string, game: string, actionId: string) => Promise<FishGameSession>;
  create: (user: string, learner: string, game: string, config: FishGameConfig) => Promise<FishGameSession>;
  get: (user: string, learner: string, game: string) => Promise<FishGameSession>;
  act: (user: string, learner: string, game: string, action: FishGameAction) => Promise<FishGameSession>;
};
export function createFishGameService(deps: {
  authorize: (user: string, learner: string) => Promise<boolean>;
  sourceWords: (user: string, learner: string, source: PracticeSource) => Promise<LearnerVocabularyDto[]>;
  currentWords: (user: string, learner: string, ids: number[]) => Promise<LearnerVocabularyDto[]>;
  repository: FishGameRepository;
}): FishGameService {
  async function authorize(user: string, learner: string) { if (!await deps.authorize(user, learner)) throw new FishGameError("HOUSEHOLD_ACCESS_DENIED", 403); }
  async function read(learner: string, game: string) { const state = await deps.repository.read(learner, game); if (!state) throw new FishGameError("GAME_NOT_FOUND", 404); return state; }
  async function current(user: string, learner: string, state: FishGameState) {
    if (state.current && !practiceQuestionPinsAreCurrent([state.current], (await deps.currentWords(user, learner, [state.current.vocabularyId])).filter(word => word.enabled))) throw new FishGameError("STALE_GAME_CONTENT", 409);
  }
  return {
    async history(user, learner, page, recordsPage) { await authorize(user, learner); return deps.repository.history(learner, page, recordsPage); },
    async results(user, learner, game, page) { await authorize(user, learner); const result = await deps.repository.results(learner, game, page); if (!result) throw new FishGameError("GAME_NOT_FOUND", 404); return result; },
    async finish(user, learner, game, actionId) {
      await authorize(user, learner);
      for (let attempt = 0; attempt < 4; attempt++) {
        const state = await read(learner, game), next = finishFishGame(state, actionId, new Date().toISOString());
        if (next === state) return presentFishGame(state);
        if (await deps.repository.replace(next, state.revision)) return presentFishGame(next);
      }
      throw new FishGameError("STALE_QUESTION", 409);
    },
    async create(user, learner, game, config) {
      await authorize(user, learner);
      function same(state: FishGameState) { if (fishGameConfigFingerprint(state.config) !== fishGameConfigFingerprint(config)) throw new FishGameError("IDEMPOTENCY_CONFLICT", 409); return presentFishGame(state); }
      const existing = await deps.repository.read(learner, game);
      if (existing) { await current(user, learner, existing); return same(existing); }
      const source = (await deps.sourceWords(user, learner, config.source)).filter(word => word.enabled && (config.source.kind !== "learned" || word.status !== "NEW"));
      const state = createFishGame(game, learner, source.map(word => ({ ...word, learned: word.status !== "NEW" })), () => crypto.randomUUID(), Math.random, config);
      if (!state.current) return presentFishGame(state);
      await deps.repository.insert(state); return same(await read(learner, game));
    },
    async get(user, learner, game) { await authorize(user, learner); const state = await read(learner, game); await current(user, learner, state); return presentFishGame(state); },
    async act(user, learner, game, action) {
      await authorize(user, learner);
      for (let attempt = 0; attempt < 4; attempt++) {
        const state = await read(learner, game);
        const next = applyFishGameAction(state, action, new Date().toISOString(), () => crypto.randomUUID());
        if (next === state) return presentFishGame(state);
        await current(user, learner, state);
        if (await deps.repository.replace(next, state.revision)) return presentFishGame(next);
      }
      throw new FishGameError("STALE_QUESTION", 409);
    }
  };
}
type Database = { execute: (query: SQL) => Promise<unknown> };
function rows(result: unknown): { state: FishGameState }[] {
  if (Array.isArray(result)) return result;
  if (result && typeof result === "object" && "rows" in result && Array.isArray(result.rows)) return result.rows;
  throw new FishGameError("SERVICE_UNAVAILABLE", 503);
}
export function postgresFishGameRepository(database: Database): FishGameRepository {
  const record = (row: { state: FishGameState; created_at: unknown }): FishGameHistoryRow => ({ state: row.state, createdAt: new Date(String(row.created_at)).toISOString() });
  return {
    async results(learner, game, page) {
      const first = rows(await database.execute(sql`SELECT state,created_at::text AS created_at FROM vocabflow_app.fish_games WHERE learner_id=${learner}::uuid AND id=${game}::uuid`))[0] as { state: FishGameState; created_at: unknown } | undefined;
      return first ? fishGameResults(record(first), page) : null;
    },
    async history(learner, page, recordsPage) {
      const [entries, aggregates] = await Promise.all([
        database.execute(sql`SELECT state,created_at::text AS created_at FROM vocabflow_app.fish_games WHERE learner_id=${learner}::uuid ORDER BY created_at DESC,id DESC LIMIT 20 OFFSET ${(page - 1) * 20}`),
        database.execute(sql`WITH finals AS (
          SELECT id,state->'config' AS config,(state->>'rulesVersion')::integer AS rules_version,(state->>'score')::bigint AS score,created_at
          FROM vocabflow_app.fish_games WHERE learner_id=${learner}::uuid AND state->>'status' IN ('lost','ended')
        ), ranked AS (
          SELECT *,count(*) OVER (PARTITION BY config,rules_version) AS finalized_games,
            row_number() OVER (PARTITION BY config,rules_version ORDER BY score DESC,created_at DESC,id DESC) AS rank FROM finals
        ), records AS (SELECT * FROM ranked WHERE rank=1),
        paged AS (SELECT * FROM records ORDER BY score DESC,id DESC LIMIT 20 OFFSET ${(recordsPage - 1) * 20})
        SELECT (SELECT count(*)::integer FROM vocabflow_app.fish_games WHERE learner_id=${learner}::uuid) AS total_games,
          (SELECT count(*)::integer FROM records) AS total_records,
          COALESCE((SELECT jsonb_agg(jsonb_build_object('config',config,'rulesVersion',rules_version,'bestScore',score,'bestGameId',id,'finalizedGames',finalized_games) ORDER BY score DESC,id DESC) FROM paged),'[]'::jsonb) AS records`)
      ]);
      const [aggregate] = rows(aggregates) as unknown as { total_games: unknown; total_records: unknown; records: unknown }[];
      return fishGameHistorySchema.parse({ page, recordsPage, pageSize: 20, totalGames: Number(aggregate?.total_games), totalRecords: Number(aggregate?.total_records),
        items: (rows(entries) as { state: FishGameState; created_at: unknown }[]).map(row => fishGameHistoryEntry(record(row))), records: aggregate?.records });
    },
    async read(learner, game) { return rows(await database.execute(sql`SELECT state FROM vocabflow_app.fish_games WHERE learner_id=${learner}::uuid AND id=${game}::uuid`))[0]?.state ?? null; },
    async insert(state) { await database.execute(sql`INSERT INTO vocabflow_app.fish_games (learner_id,id,revision,state) VALUES (${state.learnerId}::uuid,${state.gameId}::uuid,${state.revision},${JSON.stringify(state)}::jsonb) ON CONFLICT (learner_id,id) DO NOTHING`); },
    async replace(state, revision) {
      const q = state.finished ? null : state.receipts.at(-1)?.question;
      const contentGuard = q ? sql`EXISTS (SELECT 1 FROM vocabflow_app.vocabularies WHERE id=${q.vocabularyId} AND enabled=true AND content_version=${q.contentVersion})` : sql`true`;
      return rows(await database.execute(sql`UPDATE vocabflow_app.fish_games SET state=${JSON.stringify(state)}::jsonb,revision=${state.revision}
        WHERE learner_id=${state.learnerId}::uuid AND id=${state.gameId}::uuid AND revision=${revision}
        AND ${contentGuard} RETURNING state`)).length === 1;
    }
  };
}
export function createDatabaseFishGameService(database: Database, env: RuntimeBindings) {
  return createFishGameService({ authorize: async (user, learner) => (await authorizeLearnerOwnership(database, user, learner)).decision === "ALLOW",
    ...createPracticeContentReader(database, env), repository: postgresFishGameRepository(database) });
}
export function fishGameRoutes(deps: {
  readSession: (request: Request, env: RuntimeBindings) => Promise<{ user: { id: string } } | null>;
  service?: FishGameService;
}) {
  const router = new Hono<{ Bindings: RuntimeBindings; Variables: { user: string; game: FishGameService } }>();
  router.use("*", async (c, next) => {
    c.header("Cache-Control", "no-store");
    const session = await deps.readSession(c.req.raw, c.env);
    if (!session?.user?.id) return c.json(errorEnvelope("UNAUTHORIZED", "Đăng nhập để tiếp tục."), 401);
    if (c.req.method === "POST" && c.req.header("origin") && c.req.header("origin") !== new URL(c.req.url).origin) throw new FishGameError("ORIGIN_DENIED", 403);
    c.set("user", session.user.id);
    if (deps.service) c.set("game", deps.service);
    else {
      if (!c.env?.DATABASE_URL) throw new FishGameError("SERVICE_UNAVAILABLE", 503);
      const { createHttpDatabase } = await import("./db/client");
      c.set("game", createDatabaseFishGameService(createHttpDatabase(c.env.DATABASE_URL, c.env.DATABASE_DRIVER), c.env));
    }
    await next();
  });
  router.onError((error, c) => {
    const known = error instanceof FishGameError || error instanceof PracticeError;
    const code = known || error instanceof PracticeRuleError ? error.code : "SERVICE_UNAVAILABLE";
    const status = known ? error.status : error instanceof PracticeRuleError ? error.code === "INVALID_REQUEST" ? 400 : 409 : 503;
    return c.json(errorEnvelope(code, code === "HOUSEHOLD_ACCESS_DENIED" ? "Bạn không có quyền truy cập ván này." : "Chưa tải hoặc lưu được ván. Hãy thử lại."), status);
  });
  async function body(request: Request) { const raw = await request.text(); if (raw.length > 8192) throw new FishGameError("INVALID_REQUEST", 400); try { return JSON.parse(raw) as unknown; } catch { throw new FishGameError("INVALID_REQUEST", 400); } }
  function id(value: string) { if (!z.uuid().safeParse(value).success) throw new FishGameError("GAME_NOT_FOUND", 404); return value; }
  function pages(url: string, names: string[]) {
    const params = new URL(url).searchParams;
    if ([...params.keys()].some(key => !names.includes(key)) || names.some(key => params.getAll(key).length > 1)) throw new FishGameError("INVALID_REQUEST", 400);
    return names.map(key => { const raw = params.get(key); if (raw === null) return 1; const value = Number(raw); if (!/^[1-9]\d*$/.test(raw) || !Number.isSafeInteger(value) || value > 100000) throw new FishGameError("INVALID_REQUEST", 400); return value; });
  }
  router.post("/", async c => { const parsed = fishGameCreateSchema.safeParse(await body(c.req.raw)); if (!parsed.success) throw new FishGameError("INVALID_REQUEST", 400); const { gameId, ...config } = parsed.data; return c.json(await c.get("game").create(c.get("user"), c.req.param("learnerId")!, gameId, config)); });
  router.get("/", async c => { const [page, recordsPage] = pages(c.req.url, ["page", "recordsPage"]); return c.json(await c.get("game").history(c.get("user"), c.req.param("learnerId")!, page!, recordsPage!)); });
  router.get("/:gameId/results", async c => { const [page] = pages(c.req.url, ["page"]); return c.json(await c.get("game").results(c.get("user"), c.req.param("learnerId")!, id(c.req.param("gameId")), page!)); });
  router.post("/:gameId/finish", async c => { const parsed = fishGameFinishSchema.safeParse(await body(c.req.raw)); if (!parsed.success) throw new FishGameError("INVALID_REQUEST", 400); return c.json(await c.get("game").finish(c.get("user"), c.req.param("learnerId")!, id(c.req.param("gameId")), parsed.data.actionId)); });
  router.get("/:gameId", async c => c.json(await c.get("game").get(c.get("user"), c.req.param("learnerId")!, id(c.req.param("gameId")))));
  router.post("/:gameId/actions", async c => { const action = fishGameActionSchema.safeParse(await body(c.req.raw)); if (!action.success) throw new FishGameError("INVALID_REQUEST", 400); return c.json(await c.get("game").act(c.get("user"), c.req.param("learnerId")!, id(c.req.param("gameId")), action.data)); });
  return router;
}
