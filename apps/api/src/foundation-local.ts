/** Node-only local foundation authority. Never imported by the production Worker. */
import { createHash, randomInt, randomUUID } from "node:crypto";
import { readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import postgres from "postgres";
import { z } from "zod";
import type { Context, Hono } from "hono";
import { foundationAttemptRequestSchema, foundationAttemptResponseSchema, foundationCatalogSchema, foundationGradeResponseSchema, foundationPinsSchema, foundationProgressSchema, foundationQueueQuerySchema, foundationQueueResponseSchema, foundationRevealRequestSchema, foundationReviewRequestSchema, foundationReviewResponseSchema, foundationTeachingSchema, type FoundationProgress } from "@vocabflow/contracts";
import { scheduleReview, selectFoundationQueue } from "@vocabflow/learning-domain";
import { createAuth } from "./auth";
import { createHttpDatabase } from "./db/client";
import { authorizeLearnerOwnership } from "./learners";
import { householdLocalDate } from "./reviews";
import { runtimeBindingsFromEnvironment } from "./runtime-bindings";

const mediaSchema = z.object({ path: z.string(), sha256: z.string().regex(/^[a-f0-9]{64}$/), byteLength: z.number().int().positive(), review: z.enum(["PENDING", "OWNER_ACCEPTED"]) }).strict();
const contentSchema = z.object({ glyph: z.string().nullable(), optionGlyphs: z.array(z.string()), instruction: z.string(), context: z.string().nullable(), title: z.string(), textEn: z.string(), translationVi: z.string(), explanation: z.string(), audio: mediaSchema.nullable() }).strict();
type Target = { id: string; item_type: "LETTER_ACTIVITY" | "UTTERANCE"; kind: "LETTER_NAME" | "LETTER_SOUND" | "UTTERANCE"; pins: unknown; content: unknown; content_sha256: string };
type Actor = { key: string; learnerId: string | null; guestId: string | null; timezone: string };
type AttemptPayload = { pins: z.infer<typeof foundationPinsSchema>; expectedRevision: number; contentHash: string; mode: "ASSESS" | "PRACTICE"; options: { optionKey: string; glyph: string }[]; correctOptionKey: string | null; grade?: { requestHash: string; response: z.infer<typeof foundationGradeResponseSchema> } };
type Attempt = { id: string; owner_key: string; target_id: string; payload: AttemptPayload; phase: "ASSESS" | "REVEALED" | "CONSUMED"; expires_at: Date };
const fresh: FoundationProgress = { revision: 0, state: { status: "NEW", consecutiveCorrect: 0, intervalDays: 0, firstLearnedDate: null, lastReviewedDate: null, nextReviewDate: null, totalCorrect: 0, totalIncorrect: 0 } };
const hash = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
const sourceMediaRoot = ".vocabflow-local/editorial-refresh-20261030/foundation08-09-media-r0001/assets/audio";
class FoundationError extends Error { constructor(readonly code: string, readonly status: 400 | 401 | 403 | 404 | 409 | 503) { super(code); } }
function fail(code: string, status: FoundationError["status"]): never { throw new FoundationError(code, status); }
function valid<T>(schema: z.ZodType<T>, value: unknown): T { const p = schema.safeParse(value); return p.success ? p.data : fail("INVALID_REQUEST", 400); }
function shuffle<T>(values: T[]): T[] { const result = [...values]; for (let i = result.length - 1; i > 0; i--) { const j = randomInt(i + 1); [result[i], result[j]] = [result[j], result[i]]; } return result; }
async function requestBody(c: Context): Promise<unknown> { try { return await c.req.json(); } catch { return fail("INVALID_REQUEST", 400); } }

export function foundationLocalEnabled(env: NodeJS.ProcessEnv): boolean {
  try { const u = new URL(env.DATABASE_URL ?? ""); return u.hostname === "127.0.0.1" && u.port === "55432" && u.pathname === "/vocabflow_dev" && env.VOCABFLOW_ENV === "development" && env.DATABASE_ENV === "development" && env.DATABASE_DRIVER === "postgres-js" && env.EXECUTION_CONTEXT === "local-development" && !env.VERCEL_ENV; } catch { return false; }
}

export function installFoundationLocal(app: Hono, env: NodeJS.ProcessEnv, dependencies: { readSession?: (request: Request) => Promise<{ user: { id: string } } | null> } = {}) {
  if (!foundationLocalEnabled(env)) return;
  const db = postgres(env.DATABASE_URL!, { max: 4, prepare: false, connect_timeout: 10, onnotice: () => {} });
  const runtime = runtimeBindingsFromEnvironment(env);
  async function actor(c: Context, guestId?: string): Promise<Actor> {
    const learnerId = c.req.param("learnerId");
    if (!learnerId) {
      if (!guestId || !z.string().uuid().safeParse(guestId).success) return fail("INVALID_REQUEST", 400);
      return { key: `guest:${guestId}`, guestId, learnerId: null, timezone: "Asia/Ho_Chi_Minh" };
    }
    if (guestId) return fail("INVALID_REQUEST", 400);
    const session = dependencies.readSession ? await dependencies.readSession(c.req.raw) : await createAuth(runtime.DATABASE_URL!, runtime.BETTER_AUTH_SECRET!, runtime).api.getSession({ headers: c.req.raw.headers });
    if (!session?.user.id) return fail("UNAUTHORIZED", 401);
    const ownership = await authorizeLearnerOwnership(createHttpDatabase(runtime.DATABASE_URL!, "postgres-js"), session.user.id, learnerId);
    if (ownership.decision !== "ALLOW") return fail("HOUSEHOLD_ACCESS_DENIED", 403);
    const [household] = await db`SELECT timezone FROM vocabflow_app.households WHERE id=${ownership.householdId}::uuid`;
    return { key: `account:${learnerId}`, guestId: null, learnerId, timezone: String(household.timezone) };
  }
  async function target(id: string, tx: postgres.Sql | postgres.TransactionSql = db): Promise<Target> {
    const [row] = await tx<Target[]>`SELECT id,item_type,kind,pins,content,content_sha256 FROM vocabflow_app.foundation_targets WHERE id=${id}::uuid AND enabled=true`;
    return row ?? fail("TARGET_NOT_FOUND", 404);
  }
  async function progress(a: Actor, t: Target, tx: postgres.Sql | postgres.TransactionSql = db): Promise<FoundationProgress> {
    if (!a.learnerId) return fresh;
    const [row] = await tx`SELECT revision,state FROM vocabflow_app.foundation_progress WHERE learner_id=${a.learnerId}::uuid AND target_id=${t.id}::uuid AND item_type=${t.item_type}`;
    return row ? foundationProgressSchema.parse(row) : fresh;
  }
  function audioUrl(a: Actor, attempt: string): string {
    return a.learnerId ? `/api/learners/${a.learnerId}/foundation/attempts/${attempt}/audio` : `/api/public/foundation/attempts/${attempt}/audio?guestId=${a.guestId}`;
  }
  function listenReady(t: Target) { const c = contentSchema.parse(t.content); return c.audio?.review === "OWNER_ACCEPTED"; }
  async function loadAttempt(id: string, a: Actor, tx: postgres.Sql | postgres.TransactionSql = db): Promise<Attempt> {
    const [row] = await tx<Attempt[]>`SELECT * FROM vocabflow_app.foundation_attempts WHERE id=${id}::uuid AND owner_key=${a.key}`;
    return row ?? fail("ATTEMPT_NOT_FOUND", 404);
  }
  function currentAttempt(at: Attempt, t: Target) {
    if (new Date(at.expires_at).getTime() <= Date.now()) fail("ATTEMPT_EXPIRED", 409);
    if (!same(at.payload.pins, foundationPinsSchema.parse(t.pins)) || at.payload.contentHash !== t.content_sha256) fail("STALE_CONTENT", 409);
  }
  const boundary = (fn: (c: Context) => Promise<Response>) => async (c: Context) => {
    try {
      if (!["127.0.0.1", "localhost"].includes(new URL(c.req.url).hostname)) return c.notFound();
      if (c.req.method !== "GET") {
        const origin = c.req.header("Origin");
        if (origin && !["http://127.0.0.1:5173", "http://localhost:5173", "http://127.0.0.1:3002"].includes(origin)) return c.json({ error: { code: "ORIGIN_DENIED", message: "Nguồn yêu cầu không hợp lệ." } }, 403);
      }
      c.header("Cache-Control", "no-store");
      return await fn(c);
    } catch (error) {
      if (error instanceof FoundationError) return c.json({ error: { code: error.code, message: error.status === 409 ? "Nội dung hoặc tiến độ đã thay đổi. Vui lòng tải lại bài." : "Chưa thể thực hiện. Vui lòng thử lại." } }, error.status);
      return c.json({ error: { code: "FOUNDATION_UNAVAILABLE", message: "Chưa thể tải hoặc lưu bài học. Vui lòng thử lại." } }, 503);
    }
  };
  app.get("/api/public/foundation/catalog", boundary(async c => {
    if (Object.keys(c.req.query()).length) fail("INVALID_REQUEST", 400);
    const rows = await db`SELECT fc.code,fc.title,fc.module,count(ft.id)::int AS total,count(ft.id) FILTER(WHERE ft.content->'audio' IS NOT NULL AND ft.content->'audio'<>'null'::jsonb)::int AS media_ready,count(ft.id) FILTER(WHERE ft.content->'audio'->>'review'='OWNER_ACCEPTED')::int AS listening_ready FROM vocabflow_app.foundation_collections fc LEFT JOIN vocabflow_app.foundation_memberships fm ON fm.collection=fc.code LEFT JOIN vocabflow_app.foundation_targets ft ON ft.id=fm.target_id AND ft.enabled=true GROUP BY fc.code,fc.title,fc.module,fc.sort_order ORDER BY fc.sort_order,fc.code`;
    return c.json(foundationCatalogSchema.parse({ collections: rows.map(r => ({ code: r.code, title: r.title, module: r.module, total: r.total, mediaReady: r.media_ready, listeningReady: r.listening_ready })), counts: { letters: 6, activities: 12, utterances: 12 } }));
  }));
  for (const prefix of ["/api/public/foundation", "/api/learners/:learnerId/foundation"]) {
    app.get(`${prefix}/queue`, boundary(async c => {
      const q = valid(foundationQueueQuerySchema, c.req.query());
      const a = c.req.param("learnerId") ? await actor(c) : null;
      const [collection] = await db`SELECT code FROM vocabflow_app.foundation_collections WHERE code=${q.collection}`;
      if (!collection) fail("SCOPE_NOT_FOUND", 404);
      type QueueRow = Target & { sort_order: number; revision: number | null; state: unknown };
      const rows = a ? await db<QueueRow[]>`SELECT ft.*,fm.sort_order,fp.revision,fp.state FROM vocabflow_app.foundation_memberships fm JOIN vocabflow_app.foundation_targets ft ON ft.id=fm.target_id AND ft.enabled=true LEFT JOIN vocabflow_app.foundation_progress fp ON fp.target_id=ft.id AND fp.item_type=ft.item_type AND fp.learner_id=${a.learnerId}::uuid WHERE fm.collection=${q.collection} ORDER BY fm.sort_order,ft.id` : await db<QueueRow[]>`SELECT ft.*,fm.sort_order,NULL::int AS revision,NULL::jsonb AS state FROM vocabflow_app.foundation_memberships fm JOIN vocabflow_app.foundation_targets ft ON ft.id=fm.target_id AND ft.enabled=true WHERE fm.collection=${q.collection} ORDER BY fm.sort_order,ft.id`;
      const date = householdLocalDate(new Date(), a?.timezone ?? "Asia/Ho_Chi_Minh");
      const all = rows.map(r => { const p = r.revision ? foundationProgressSchema.parse({ revision: r.revision, state: r.state }) : fresh; return { ...r, progress: p, order: r.sort_order, status: p.state.status, nextReviewDate: p.state.nextReviewDate }; });
      const eligible = all.filter(r => r.item_type === "UTTERANCE" || contentSchema.parse(r.content).audio !== null);
      const selected = selectFoundationQueue(eligible, date, Number(q.capacity), q.mode);
      return c.json(foundationQueueResponseSchema.parse({ date, collection: q.collection, unavailableCount: all.length-eligible.length, items: selected.map(r => ({ targetId: r.id, itemType: r.item_type, kind: r.kind, pins: foundationPinsSchema.parse(r.pins), context: contentSchema.parse(r.content).context, progress: r.progress, audioAvailable: contentSchema.parse(r.content).audio !== null, listeningReady: listenReady(r) })) }));
    }));
    app.post(`${prefix}/attempts`, boundary(async c => {
      const raw = await requestBody(c);
      // Authenticate before accepting target IDs or exposing private content.
      const a = await actor(c, typeof raw === "object" && raw !== null && "guestId" in raw && typeof raw.guestId === "string" ? raw.guestId : undefined);
      const input = valid(foundationAttemptRequestSchema, raw);
      return await db.begin(async tx => {
        await tx`SELECT pg_advisory_xact_lock(hashtextextended(${a.key},0))`;
        const t = await target(input.targetId, tx); const content = contentSchema.parse(t.content); const p = await progress(a, t, tx);
        if (!same(input.pins, foundationPinsSchema.parse(t.pins))) fail("STALE_CONTENT", 409);
        if (a.learnerId && input.expectedRevision !== p.revision) fail("STALE_REVISION", 409);
        if (t.item_type === "LETTER_ACTIVITY" && input.mode === "ASSESS" && !listenReady(t)) fail("LISTENING_AUDIO_PENDING", 409);
        const options = t.item_type === "LETTER_ACTIVITY" && input.mode === "ASSESS" ? shuffle(content.optionGlyphs).map(glyph => ({ optionKey: randomUUID(), glyph })) : [];
        const payload: AttemptPayload = { pins: input.pins, expectedRevision: input.expectedRevision, contentHash: t.content_sha256, mode: input.mode, options, correctOptionKey: options.find(o => o.glyph === content.glyph)?.optionKey ?? null };
        const id = randomUUID();
        await tx`INSERT INTO vocabflow_app.foundation_attempts(id,owner_key,target_id,payload,phase,expires_at) VALUES(${id}::uuid,${a.key},${t.id}::uuid,${tx.json(payload)},'ASSESS',now()+interval '20 minutes')`;
        return c.json(foundationAttemptResponseSchema.parse({ attemptRef: id, targetId: t.id, itemType: t.item_type, pins: input.pins, expectedRevision: input.expectedRevision, instruction: content.instruction, audioUrl: options.length && content.audio ? audioUrl(a, id) : null, options }));
      });
    }));
    app.post(`${prefix}/reveal`, boundary(async c => {
      const raw = await requestBody(c); const input = valid(foundationRevealRequestSchema, raw); const a = await actor(c, input.guestId);
      return await db.begin(async tx => {
        await tx`SELECT pg_advisory_xact_lock(hashtextextended(${a.key},0))`;
        const at = await loadAttempt(input.attemptRef, a, tx); const t = await target(at.target_id, tx); currentAttempt(at, t);
        if (at.phase !== "CONSUMED") await tx`UPDATE vocabflow_app.foundation_attempts SET phase='REVEALED' WHERE id=${at.id}::uuid`;
        const body = contentSchema.parse(t.content);
        return c.json(foundationTeachingSchema.parse({ targetId: t.id, title: body.title, textEn: body.textEn, translationVi: body.translationVi, explanation: body.explanation, audioUrl: body.audio ? audioUrl(a, at.id) : null, audioReview: body.audio?.review ?? "MISSING" }));
      });
    }));
    app.get(`${prefix}/attempts/:attemptRef/audio`, boundary(async c => {
      const a = await actor(c, c.req.query("guestId")); const id = valid(z.string().uuid(), c.req.param("attemptRef"));
      const at = await loadAttempt(id, a); const t = await target(at.target_id); currentAttempt(at, t);
      if (at.phase === "ASSESS" && (at.payload.mode !== "ASSESS" || !listenReady(t))) fail("AUDIO_NOT_REVEALED", 403);
      const audio = contentSchema.parse(t.content).audio; if (!audio) fail("AUDIO_MISSING", 404);
      const mediaRoot = realpathSync(sourceMediaRoot); const file = realpathSync(audio.path); const relative = path.relative(mediaRoot, file);
      if (!relative || relative.startsWith("..") || path.isAbsolute(relative) || !/^[a-f0-9]{64}\.mp3$/.test(relative)) fail("AUDIO_MISSING", 404);
      const blob = readFileSync(file); if (hash(blob) !== audio.sha256 || blob.length !== audio.byteLength) fail("MEDIA_CHANGED", 409);
      c.header("Content-Type", "audio/mpeg"); c.header("Content-Length", String(blob.length)); c.header("X-Content-Type-Options", "nosniff");
      return c.body(new Uint8Array(blob).buffer);
    }));
    app.post(`${prefix}/reviews`, boundary(async c => {
      const raw = await requestBody(c); const input = valid(foundationReviewRequestSchema, raw); const a = await actor(c, input.guestId);
      const requestHash = hash(JSON.stringify(input));
      return await db.begin(async tx => {
        await tx`SELECT pg_advisory_xact_lock(hashtextextended(${a.key},0))`;
        if (a.learnerId) {
          const [old] = await tx`SELECT request_sha256,response FROM vocabflow_app.foundation_reviews WHERE learner_id=${a.learnerId}::uuid AND review_id=${input.reviewId}::uuid`;
          if (old) { if (old.request_sha256 !== requestHash) fail("IDEMPOTENCY_CONFLICT", 409); return c.json(foundationReviewResponseSchema.parse(old.response)); }
        }
        const at = await loadAttempt(input.attemptRef, a, tx);
        if (!a.learnerId && at.payload.grade) { if (at.payload.grade.requestHash !== requestHash) fail("IDEMPOTENCY_CONFLICT", 409); return c.json(at.payload.grade.response); }
        const t = await target(at.target_id, tx); currentAttempt(at, t);
        if (!same(input.pins, at.payload.pins) || input.expectedRevision !== at.payload.expectedRevision) fail("STALE_CONTENT", 409);
        if (at.payload.mode !== "ASSESS" || at.phase === "CONSUMED") fail("ATTEMPT_NOT_ASSESSABLE", 409);
        let result: "REMEMBERED" | "FORGOTTEN";
        if (t.item_type === "LETTER_ACTIVITY") {
          if (at.phase !== "ASSESS" || !listenReady(t) || input.answer.kind !== "LETTER_OPTION") fail("ATTEMPT_NOT_ASSESSABLE", 409);
          const selectedOptionKey = input.answer.optionKey;
          if (!at.payload.options.some(o => o.optionKey === selectedOptionKey)) fail("INVALID_OPTION", 400);
          result = input.answer.optionKey === at.payload.correctOptionKey ? "REMEMBERED" : "FORGOTTEN";
        } else { if (at.phase !== "REVEALED" || input.answer.kind !== "SELF_RECALL") fail("ATTEMPT_NOT_ASSESSABLE", 409); result = input.answer.result; }
        const date = householdLocalDate(new Date(), a.timezone);
        if (!a.learnerId) {
          const response = foundationGradeResponseSchema.parse({ reviewId: input.reviewId, targetId: t.id, itemType: t.item_type, result, date });
          const payload = { ...at.payload, grade: { requestHash, response } };
          await tx`UPDATE vocabflow_app.foundation_attempts SET phase='CONSUMED',payload=${tx.json(payload)} WHERE id=${at.id}::uuid`;
          return c.json(response);
        }
        const before = await progress(a, t, tx); if (before.revision !== input.expectedRevision) fail("STALE_REVISION", 409);
        const after = { revision: before.revision + 1, state: scheduleReview({ currentState: before.state, result, today: date }) };
        const response = foundationReviewResponseSchema.parse({ reviewId: input.reviewId, targetId: t.id, itemType: t.item_type, result, progress: after, date });
        await tx`INSERT INTO vocabflow_app.foundation_progress(learner_id,target_id,item_type,revision,state) VALUES(${a.learnerId}::uuid,${t.id}::uuid,${t.item_type},${after.revision},${tx.json(after.state)}) ON CONFLICT(learner_id,target_id,item_type) DO UPDATE SET revision=EXCLUDED.revision,state=EXCLUDED.state`;
        await tx`INSERT INTO vocabflow_app.foundation_reviews(learner_id,review_id,target_id,request_sha256,response) VALUES(${a.learnerId}::uuid,${input.reviewId}::uuid,${t.id}::uuid,${requestHash},${tx.json(response)})`;
        await tx`UPDATE vocabflow_app.foundation_attempts SET phase='CONSUMED' WHERE id=${at.id}::uuid`;
        return c.json(response);
      });
    }));
  }
  return { close: () => db.end({ timeout: 3 }) };
}
