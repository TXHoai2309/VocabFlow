import {videoWriteFence,videoIdAllowed,videoEpoch} from "./video-write-fence";
import { Hono } from "hono";
import { sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { errorEnvelope, type NativeQuota, type NativeRun } from "@vocabflow/contracts";
import { createDatabaseVideoLibraryService, VideoError, type VideoLibraryService } from "./video-learning";
import { ProviderFailure, supadataProvider, type NativeProvider } from "./video-providers";
import type { RuntimeBindings } from "./runtime-bindings";
export type StoredNativeRun = NativeRun & { jobId: string | null; text: string | null; revision: number };
export type NativeRepository = { read: (owner: string, learner: string, video: string) => Promise<StoredNativeRun | null>; insert: (owner: string, learner: string, video: string, run: StoredNativeRun) => Promise<boolean>; replace: (owner: string, learner: string, video: string, run: StoredNativeRun, revision: number) => Promise<boolean> };
export type NativeService = ReturnType<typeof createNativeService>;
const publicRun = (run: StoredNativeRun | null): NativeRun | null => run ? { requestId: run.requestId, status: run.status, reason: run.reason, versionId: run.versionId } : null;
export function createNativeService(library: VideoLibraryService, repository: NativeRepository, provider: NativeProvider) {
  async function persist(owner: string, learner: string, video: string, run: StoredNativeRun, patch: Partial<StoredNativeRun>) { const next = { ...run, ...patch, revision: run.revision + 1 }; if (!await repository.replace(owner, learner, video, next, run.revision)) {const current=await repository.read(owner,learner,video);if(!current||current.requestId!==run.requestId||current.reason==="VIDEO_DATA_CHANGED")throw new VideoError("VIDEO_NOT_FOUND",404);return current;} return next; }
  async function complete(owner: string, learner: string, video: string, run: StoredNativeRun, text: string) {
    // Persist normalized content before immutable transcript insert, allowing DB retry without another provider call.
    const normalized = await persist(owner, learner, video, run, { text, status: "processing" });
    await library.importTranscript(owner, learner, video, { versionId: run.requestId, format: "srt", language: "en", text }, "supadata-native");
    return persist(owner, learner, video, normalized, { status: "success", reason: null, versionId: run.requestId });
  }
  return {
    async view(owner: string, learner: string, video: string): Promise<{ quota: NativeQuota; run: NativeRun | null }> { await library.read(owner, learner, video); return { quota: await provider.quota(), run: publicRun(await repository.read(owner, learner, video)) }; },
    async start(owner: string, learner: string, video: string, requestId: string) {
      const entry = await library.read(owner, learner, video), existing = await repository.read(owner, learner, video); if (existing) { if (existing.text && existing.status !== "success") return publicRun(await complete(owner, learner, video, existing, existing.text)); return publicRun(existing); }
      const quota = await provider.quota(); if (!quota.available) return { requestId, status: "failed" as const, reason: quota.reason ?? "QUOTA_UNKNOWN", versionId: null };
      const run: StoredNativeRun = { requestId, status: "processing", reason: null, versionId: null, revision: 0, jobId: null, text: null };
      if (!await repository.insert(owner, learner, video, run)) return publicRun(await repository.read(owner, learner, video));
      try { const result = await provider.start(entry.canonicalUrl); if ("jobId" in result) return publicRun(await persist(owner, learner, video, run, { status: "waiting", jobId: result.jobId })); return publicRun(await complete(owner, learner, video, run, result.text)); }
      catch (error) { const current = await repository.read(owner, learner, video); if (current?.text) throw new VideoError("SERVICE_UNAVAILABLE", 503); return publicRun(await persist(owner, learner, video, run, { status: error instanceof ProviderFailure && error.reason !== "DELIVERY_UNCERTAIN" ? "failed" : "uncertain", reason: error instanceof ProviderFailure ? error.reason : "DELIVERY_UNCERTAIN" })); }
    },
    async poll(owner: string, learner: string, video: string) {
      await library.read(owner, learner, video); const run = await repository.read(owner, learner, video); if (!run) return null; if (run.text && run.status !== "success") return publicRun(await complete(owner, learner, video, run, run.text)); if (run.status !== "waiting" || !run.jobId) return publicRun(run);
      const claimed = { ...run, status: "processing" as const, revision: run.revision + 1 }; if (!await repository.replace(owner, learner, video, claimed, run.revision)) return publicRun(await repository.read(owner, learner, video));
      try { const result = await provider.poll(run.jobId); return publicRun("text" in result ? await complete(owner, learner, video, claimed, result.text) : await persist(owner, learner, video, claimed, { status: "waiting" })); }
      catch (error) { const current = await repository.read(owner, learner, video); if (current?.text) throw new VideoError("SERVICE_UNAVAILABLE", 503); return publicRun(await persist(owner, learner, video, claimed, { status: "waiting", reason: error instanceof ProviderFailure ? error.reason : "PROVIDER_FAILED" })); }
    }
  };
}
type Database = { execute: (query: SQL) => Promise<unknown> };
function rows(value: unknown): { state: StoredNativeRun }[] { if (Array.isArray(value)) return value; if (value && typeof value === "object" && "rows" in value && Array.isArray(value.rows)) return value.rows; throw new VideoError("SERVICE_UNAVAILABLE", 503); }
export function postgresNativeRepository(database: Database,epoch=0): NativeRepository { return {
  async read(owner, learner, video) { return rows(await database.execute(sql`SELECT state FROM vocabflow_app.native_transcript_runs WHERE owner_user_id=${owner} AND learner_id=${learner}::uuid AND video_id=${video}::uuid`))[0]?.state ?? null; },
  async insert(owner, learner, video, run) { return rows(await database.execute(sql`INSERT INTO vocabflow_app.native_transcript_runs(owner_user_id,learner_id,video_id,revision,state) SELECT ${owner},${learner}::uuid,${video}::uuid,${run.revision},${JSON.stringify(run)}::jsonb WHERE ${videoWriteFence(owner,learner,video,epoch)} AND ${videoIdAllowed(owner,learner,video,"blockedRequests",run.requestId)} ON CONFLICT DO NOTHING RETURNING state`)).length === 1; },
  async replace(owner, learner, video, run, revision) { return rows(await database.execute(sql`UPDATE vocabflow_app.native_transcript_runs SET state=${JSON.stringify(run)}::jsonb,revision=${run.revision} WHERE owner_user_id=${owner} AND learner_id=${learner}::uuid AND video_id=${video}::uuid AND revision=${revision} AND ${videoWriteFence(owner,learner,video,epoch)} RETURNING state`)).length === 1; }
}; }
export function nativeRoutes(deps: { readSession: (request: Request, env: RuntimeBindings) => Promise<{ user: { id: string } } | null>; service?: NativeService }) {
  const router = new Hono<{ Bindings: RuntimeBindings; Variables: { owner: string; service: NativeService } }>();
  router.use("*", async (c, next) => { c.header("Cache-Control", "no-store"); const session = await deps.readSession(c.req.raw, c.env); if (!session?.user?.id) return c.json(errorEnvelope("UNAUTHORIZED", "Đăng nhập để lấy phụ đề riêng."), 401); if (c.req.method === "POST" && c.req.header("origin") && c.req.header("origin") !== new URL(c.req.url).origin) throw new VideoError("ORIGIN_DENIED", 403); c.set("owner", session.user.id);
    if (deps.service) c.set("service", deps.service); else { if (!c.env?.DATABASE_URL) throw new VideoError("SERVICE_UNAVAILABLE", 503); const { createHttpDatabase } = await import("./db/client"), db = createHttpDatabase(c.env.DATABASE_URL, c.env.DATABASE_DRIVER); c.set("service", createNativeService(createDatabaseVideoLibraryService(db,videoEpoch(c.req.header("X-Video-Revision"))), postgresNativeRepository(db,videoEpoch(c.req.header("X-Video-Revision"))), supadataProvider(c.env.SUPADATA_API_KEY))); } await next(); });
  router.onError((error, c) => c.json(errorEnvelope(error instanceof VideoError ? error.code : "SERVICE_UNAVAILABLE", "Chưa thể xác nhận phụ đề. Giữ thao tác và thử lại; bạn vẫn nhập SRT/VTT được."), error instanceof VideoError ? error.status : 503));
  const ids = (learner: string, video: string) => { if (!z.uuid().safeParse(learner).success || !z.uuid().safeParse(video).success) throw new VideoError("VIDEO_NOT_FOUND", 404); };
  router.get("/", async c => { const learner = c.req.param("learnerId")!, video = c.req.param("videoId")!; ids(learner, video); return c.json(await c.get("service").view(c.get("owner"), learner, video)); });
  router.post("/", async c => { const learner = c.req.param("learnerId")!, video = c.req.param("videoId")!; ids(learner, video); const raw = await c.req.text(); if (raw.length > 1000) throw new VideoError("INVALID_REQUEST", 400); let parsed; try { parsed = z.object({ requestId: z.uuid() }).strict().parse(JSON.parse(raw)); } catch { throw new VideoError("INVALID_REQUEST", 400); } return c.json(await c.get("service").start(c.get("owner"), learner, video, parsed.requestId)); });
  router.post("/poll", async c => { const learner = c.req.param("learnerId")!, video = c.req.param("videoId")!; ids(learner, video); return c.json(await c.get("service").poll(c.get("owner"), learner, video)); });
  return router;
}
