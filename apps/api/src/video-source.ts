import {videoWriteFence,videoEpoch} from "./video-write-fence";
import { Hono } from "hono";
import { sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { errorEnvelope, sourceReportSchema, type SourceReport, type SourceReports } from "@vocabflow/contracts";
import { createDatabaseVideoLibraryService, VideoError, type VideoLibraryService } from "./video-learning";
import type { RuntimeBindings } from "./runtime-bindings";
export type SourceReportRepository = { list: (owner: string, learner: string, video: string, version: string) => Promise<SourceReports>; insert: (owner: string, learner: string, video: string, version: string, report: SourceReports[number]) => Promise<void> };
export type SourceReportService = ReturnType<typeof createSourceReportService>;
export function createSourceReportService(library: VideoLibraryService, repository: SourceReportRepository) { return {
  async list(owner: string, learner: string, video: string, version: string) { await library.transcript(owner, learner, video, version); return repository.list(owner, learner, video, version); },
  async report(owner: string, learner: string, video: string, version: string, input: SourceReport) { const transcript = await library.transcript(owner, learner, video, version); if (!transcript.cues.some(cue => cue.id === input.cueId)) throw new VideoError("INVALID_REQUEST", 400);
    const same = (report: SourceReports[number]) => { if (report.actionId === input.actionId && report.reason !== input.reason) throw new VideoError("IDEMPOTENCY_CONFLICT", 409); return report; };
    const old = (await repository.list(owner, learner, video, version)).find(report => report.cueId === input.cueId); if (old) return same(old);
    await repository.insert(owner, learner, video, version, { ...input, reportedAt: new Date().toISOString() }); const saved = (await repository.list(owner, learner, video, version)).find(report => report.cueId === input.cueId); if (!saved) throw new VideoError("IDEMPOTENCY_CONFLICT", 409); return same(saved);
  }
}; }
type Database = { execute: (query: SQL) => Promise<unknown> };
function rows(value: unknown): Record<string, unknown>[] { if (Array.isArray(value)) return value; if (value && typeof value === "object" && "rows" in value && Array.isArray(value.rows)) return value.rows; throw new VideoError("SERVICE_UNAVAILABLE", 503); }
export function postgresSourceReportRepository(database: Database,epoch=0): SourceReportRepository { return {
  async list(owner, learner, video, version) { return rows(await database.execute(sql`SELECT action_id,cue_id,reason,reported_at::text AS reported_at FROM vocabflow_app.video_source_reports WHERE owner_user_id=${owner} AND learner_id=${learner}::uuid AND video_id=${video}::uuid AND version_id=${version}::uuid ORDER BY reported_at,cue_id`)).map(row => ({ actionId: String(row.action_id), cueId: String(row.cue_id), reason: row.reason as "text" | "timing", reportedAt: new Date(String(row.reported_at)).toISOString() })); },
  async insert(owner, learner, video, version, report) { await database.execute(sql`INSERT INTO vocabflow_app.video_source_reports(owner_user_id,learner_id,video_id,version_id,cue_id,action_id,reason,reported_at) SELECT ${owner},${learner}::uuid,${video}::uuid,${version}::uuid,${report.cueId},${report.actionId}::uuid,${report.reason},${report.reportedAt}::timestamptz WHERE ${videoWriteFence(owner,learner,video,epoch)} ON CONFLICT DO NOTHING`); }
}; }
export function sourceReportRoutes(deps: { readSession: (request: Request, env: RuntimeBindings) => Promise<{ user: { id: string } } | null>; service?: SourceReportService }) {
  const router = new Hono<{ Bindings: RuntimeBindings; Variables: { owner: string; service: SourceReportService } }>();
  router.use("*", async (c, next) => { c.header("Cache-Control", "no-store"); const session = await deps.readSession(c.req.raw, c.env); if (!session?.user?.id) return c.json(errorEnvelope("UNAUTHORIZED", "Đăng nhập để báo lỗi nguồn riêng."), 401); if (c.req.method === "POST" && c.req.header("origin") && c.req.header("origin") !== new URL(c.req.url).origin) throw new VideoError("ORIGIN_DENIED", 403); for (const name of ["learnerId", "videoId", "versionId"]) if (!z.uuid().safeParse(c.req.param(name)).success) throw new VideoError("VIDEO_NOT_FOUND", 404); c.set("owner", session.user.id);
    if (deps.service) c.set("service", deps.service); else { if (!c.env?.DATABASE_URL) throw new VideoError("SERVICE_UNAVAILABLE", 503); const { createHttpDatabase } = await import("./db/client"), db = createHttpDatabase(c.env.DATABASE_URL, c.env.DATABASE_DRIVER); c.set("service", createSourceReportService(createDatabaseVideoLibraryService(db,videoEpoch(c.req.header("X-Video-Revision"))), postgresSourceReportRepository(db,videoEpoch(c.req.header("X-Video-Revision"))))); } await next(); });
  router.onError((error, c) => c.json(errorEnvelope(error instanceof VideoError ? error.code : "SERVICE_UNAVAILABLE", "Chưa thể xác nhận báo lỗi nguồn. Lời và kết quả cũ được giữ; thử lại cùng thao tác."), error instanceof VideoError ? error.status : 503));
  router.get("/", async c => c.json(await c.get("service").list(c.get("owner"), c.req.param("learnerId")!, c.req.param("videoId")!, c.req.param("versionId")!)));
  router.post("/", async c => { const raw = await c.req.text(); if (raw.length > 1000) throw new VideoError("INVALID_REQUEST", 400); let input; try { input = sourceReportSchema.parse(JSON.parse(raw)); } catch { throw new VideoError("INVALID_REQUEST", 400); } return c.json(await c.get("service").report(c.get("owner"), c.req.param("learnerId")!, c.req.param("videoId")!, c.req.param("versionId")!, input)); });
  return router;
}
