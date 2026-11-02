import {videoWriteFence,videoIdAllowed,videoEpoch} from "./video-write-fence";
import { sql, type SQL } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { errorEnvelope, videoLibraryCreateSchema, videoTranscriptImportSchema, videoWatchActionSchema, type VideoWatchAction, type VideoWatchState, type VideoTranscript, type VideoTranscriptImport, type ErrorCode, type VideoLibraryEntry, type VideoLibraryPage } from "@vocabflow/contracts";
import { parseYoutubeVideoUrl, parseTimedSubtitles, applyVideoWatch, emptyVideoWatch, presentVideoWatch, type StoredVideoWatch, VideoRuleError } from "@vocabflow/learning-domain";
import { authorizeLearnerOwnership } from "./learners";
import type { RuntimeBindings } from "./runtime-bindings";
export class VideoError extends Error { constructor(readonly code: ErrorCode, readonly status: 400 | 403 | 404 | 409 | 503) { super(code); } }
export type VideoLibraryRepository = {
  watch: (owner: string, learner: string, video: string) => Promise<StoredVideoWatch>;
  saveWatch: (owner: string, learner: string, video: string, state: StoredVideoWatch, revision: number) => Promise<boolean>;
  transcripts: (owner: string, learner: string, video: string) => Promise<Omit<VideoTranscript, "cues">[]>;
  transcript: (owner: string, learner: string, video: string, version: string) => Promise<VideoTranscript | null>;
  insertTranscript: (owner: string, learner: string, item: VideoTranscript, text: string) => Promise<void>;
  list: (owner: string, learner: string, page: number) => Promise<VideoLibraryPage>;
  read: (owner: string, learner: string, id: string) => Promise<VideoLibraryEntry | null>;
  findSource: (owner: string, learner: string, youtubeId: string) => Promise<VideoLibraryEntry | null>;
  insert: (owner: string, learner: string, entry: VideoLibraryEntry) => Promise<void>;
};
export type VideoLibraryService = {
  watch: (owner: string, learner: string, video: string) => Promise<VideoWatchState>;
  watchAction: (owner: string, learner: string, video: string, action: VideoWatchAction) => Promise<VideoWatchState>;
  transcripts: (owner: string, learner: string, video: string) => Promise<{ items: Omit<VideoTranscript, "cues">[]; latestVersionId: string | null }>;
  transcript: (owner: string, learner: string, video: string, version: string) => Promise<VideoTranscript>;
  importTranscript: (owner: string, learner: string, video: string, input: VideoTranscriptImport, source?: "supadata-native") => Promise<VideoTranscript>;
  list: (owner: string, learner: string, page: number) => Promise<VideoLibraryPage>;
  read: (owner: string, learner: string, id: string) => Promise<VideoLibraryEntry>;
  create: (owner: string, learner: string, id: string, url: string) => Promise<VideoLibraryEntry>;
};
export function createVideoLibraryService(deps: { authorize: (owner: string, learner: string) => Promise<boolean>; repository: VideoLibraryRepository }): VideoLibraryService {
  async function authorize(owner: string, learner: string) { if (!await deps.authorize(owner, learner)) throw new VideoError("HOUSEHOLD_ACCESS_DENIED", 403); }
  async function owned(owner: string, learner: string, video: string) { await authorize(owner, learner); if (!await deps.repository.read(owner, learner, video)) throw new VideoError("VIDEO_NOT_FOUND", 404); }
  return {
    async watch(owner, learner, video) { await owned(owner, learner, video); return presentVideoWatch(await deps.repository.watch(owner, learner, video)); },
    async watchAction(owner, learner, video, action) {
      await owned(owner, learner, video);
      for (let attempt = 0; attempt < 4; attempt++) {
        const state = await deps.repository.watch(owner, learner, video), next = applyVideoWatch(state, action, new Date().toISOString());
        if (next === state) return presentVideoWatch(state);
        if (action.kind === "bookmark") { const transcript = await deps.repository.transcript(owner, learner, video, action.versionId); if (!transcript) throw new VideoError("TRANSCRIPT_NOT_FOUND", 404); if (action.startMs < transcript.cues[0]!.startMs || action.endMs > Math.max(...transcript.cues.map(cue => cue.endMs))) throw new VideoError("INVALID_REQUEST", 400); }
        if (await deps.repository.saveWatch(owner, learner, video, next, state.revision)) return presentVideoWatch(next);
      }
      throw new VideoError("STALE_QUESTION", 409);
    },
    async transcripts(owner, learner, video) { await owned(owner, learner, video); const items = await deps.repository.transcripts(owner, learner, video); return { items, latestVersionId: items[0]?.versionId ?? null }; },
    async transcript(owner, learner, video, version) { await owned(owner, learner, video); const item = await deps.repository.transcript(owner, learner, video, version); if (!item) throw new VideoError("TRANSCRIPT_NOT_FOUND", 404); return item; },
    async importTranscript(owner, learner, video, input, nativeSource) {
      await owned(owner, learner, video); const cues = parseTimedSubtitles(input.text, input.format, input.language);
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify([input.format, input.language, input.text])));
      const sha256 = [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, "0")).join("");
      const source = nativeSource ?? "personal-import";
      const same = (item: VideoTranscript) => { if (item.sha256 !== sha256 || item.format !== input.format || item.source !== source) throw new VideoError("IDEMPOTENCY_CONFLICT", 409); return item; };
      const existing = await deps.repository.transcript(owner, learner, video, input.versionId); if (existing) return same(existing);
      const item: VideoTranscript = { versionId: input.versionId, videoId: video, format: input.format, language: "en", source, sha256, createdAt: new Date().toISOString(), cues };
      await deps.repository.insertTranscript(owner, learner, item, input.text);
      const saved = await deps.repository.transcript(owner, learner, video, input.versionId); if (!saved) throw new VideoError("SERVICE_UNAVAILABLE", 503); return same(saved);
    },
    async list(owner, learner, page) { await authorize(owner, learner); return deps.repository.list(owner, learner, page); },
    async read(owner, learner, id) { await authorize(owner, learner); const item = await deps.repository.read(owner, learner, id); if (!item) throw new VideoError("VIDEO_NOT_FOUND", 404); return item; },
    async create(owner, learner, id, url) {
      await authorize(owner, learner); const source = parseYoutubeVideoUrl(url);
      function same(entry: VideoLibraryEntry) { if (entry.youtubeId !== source.youtubeId) throw new VideoError("IDEMPOTENCY_CONFLICT", 409); return entry; }
      const existing = await deps.repository.read(owner, learner, id); if (existing) return same(existing);
      const saved = await deps.repository.findSource(owner, learner, source.youtubeId); if (saved) return saved;
      await deps.repository.insert(owner, learner, { id, dataRevision:0, ...source, createdAt: new Date().toISOString() });
      const inserted = await deps.repository.read(owner, learner, id); if (inserted) return same(inserted);
      const canonical = await deps.repository.findSource(owner, learner, source.youtubeId); if (!canonical) throw new VideoError("SERVICE_UNAVAILABLE", 503); return canonical;
    }
  };
}
type Database = { execute: (query: SQL) => Promise<unknown> };
function rows(result: unknown): Record<string, unknown>[] { if (Array.isArray(result)) return result; if (result && typeof result === "object" && "rows" in result && Array.isArray(result.rows)) return result.rows; throw new VideoError("SERVICE_UNAVAILABLE", 503); }
function entry(row: Record<string, unknown>): VideoLibraryEntry { const youtubeId = String(row.youtube_id); return { dataRevision:Number(row.data_revision??0),id: String(row.id), youtubeId, canonicalUrl: `https://www.youtube.com/watch?v=${youtubeId}`, createdAt: new Date(String(row.created_at)).toISOString() }; }
export function postgresVideoLibraryRepository(database: Database, epoch=0): VideoLibraryRepository {
  const transcript = (row: Record<string, unknown>): VideoTranscript => ({ versionId: String(row.id), videoId: String(row.video_id), format: row.format as "srt" | "vtt", language: "en", source: row.source_kind === "supadata-native" ? "supadata-native" : "personal-import", sha256: String(row.sha256), createdAt: new Date(String(row.created_at)).toISOString(), cues: row.cues as VideoTranscript["cues"] });
  return {
    async watch(owner, learner, video) { return rows(await database.execute(sql`SELECT state FROM vocabflow_app.video_watch_states WHERE owner_user_id=${owner} AND learner_id=${learner}::uuid AND video_id=${video}::uuid`))[0]?.state as StoredVideoWatch ?? emptyVideoWatch(); },
    async saveWatch(owner, learner, video, state, revision) { return rows(await database.execute(sql`INSERT INTO vocabflow_app.video_watch_states (owner_user_id,learner_id,video_id,revision,state) SELECT ${owner},${learner}::uuid,${video}::uuid,${state.revision},${JSON.stringify(state)}::jsonb WHERE ${videoWriteFence(owner,learner,video,epoch)} AND (${revision}=0 OR EXISTS (SELECT 1 FROM vocabflow_app.video_watch_states WHERE owner_user_id=${owner} AND learner_id=${learner}::uuid AND video_id=${video}::uuid))
      ON CONFLICT (owner_user_id,learner_id,video_id) DO UPDATE SET revision=EXCLUDED.revision,state=EXCLUDED.state WHERE video_watch_states.revision=${revision} RETURNING state`)).length === 1; },
    async transcripts(owner, learner, video) { return rows(await database.execute(sql`SELECT id,video_id,format,source_kind,sha256,created_at::text AS created_at FROM vocabflow_app.video_transcripts WHERE owner_user_id=${owner} AND learner_id=${learner}::uuid AND video_id=${video}::uuid ORDER BY created_at DESC,id DESC`)).map(row => { const item = transcript(row); return { versionId: item.versionId, videoId: item.videoId, format: item.format, language: item.language, source: item.source, sha256: item.sha256, createdAt: item.createdAt }; }); },
    async transcript(owner, learner, video, version) { const row = rows(await database.execute(sql`SELECT id,video_id,format,source_kind,sha256,cues,created_at::text AS created_at FROM vocabflow_app.video_transcripts WHERE owner_user_id=${owner} AND learner_id=${learner}::uuid AND video_id=${video}::uuid AND id=${version}::uuid`))[0]; return row ? transcript(row) : null; },
    async insertTranscript(owner, learner, item, text) { await database.execute(sql`INSERT INTO vocabflow_app.video_transcripts (owner_user_id,learner_id,video_id,id,format,language,source_text,sha256,cues,source_kind) SELECT ${owner},${learner}::uuid,${item.videoId}::uuid,${item.versionId}::uuid,${item.format},'en',${text},${item.sha256},${JSON.stringify(item.cues)}::jsonb,${item.source} WHERE ${videoWriteFence(owner,learner,item.videoId,epoch)} AND ${videoIdAllowed(owner,learner,item.videoId,"blockedVersions",item.versionId)} ON CONFLICT DO NOTHING`); },
    async list(owner, learner, page) {
      const [items, count] = await Promise.all([database.execute(sql`SELECT id,youtube_id,data_revision,created_at::text AS created_at FROM vocabflow_app.video_library WHERE owner_user_id=${owner} AND learner_id=${learner}::uuid ORDER BY created_at DESC,id DESC LIMIT 20 OFFSET ${(page - 1) * 20}`), database.execute(sql`SELECT count(*)::integer AS total FROM vocabflow_app.video_library WHERE owner_user_id=${owner} AND learner_id=${learner}::uuid`)]);
      return { page, pageSize: 20, items: rows(items).map(entry), total: Number(rows(count)[0]?.total) };
    },
    async read(owner, learner, id) { const row = rows(await database.execute(sql`SELECT id,youtube_id,data_revision,created_at::text AS created_at FROM vocabflow_app.video_library WHERE owner_user_id=${owner} AND learner_id=${learner}::uuid AND id=${id}::uuid`))[0]; return row ? entry(row) : null; },
    async findSource(owner, learner, youtubeId) { const row = rows(await database.execute(sql`SELECT id,youtube_id,data_revision,created_at::text AS created_at FROM vocabflow_app.video_library WHERE owner_user_id=${owner} AND learner_id=${learner}::uuid AND youtube_id=${youtubeId}`))[0]; return row ? entry(row) : null; },
    async insert(owner, learner, item) { await database.execute(sql`INSERT INTO vocabflow_app.video_library (owner_user_id,learner_id,id,youtube_id) SELECT ${owner},${learner}::uuid,${item.id}::uuid,${item.youtubeId} WHERE ${videoIdAllowed(owner,learner,item.id,"blockedVideo",item.id)} ON CONFLICT DO NOTHING`); }
  };
}
export function createDatabaseVideoLibraryService(database: Database,epoch=0) { return createVideoLibraryService({ authorize: async (owner, learner) => (await authorizeLearnerOwnership(database, owner, learner)).decision === "ALLOW", repository: postgresVideoLibraryRepository(database,epoch) }); }
export function videoLearningRoutes(deps: { readSession: (request: Request, env: RuntimeBindings) => Promise<{ user: { id: string } } | null>; service?: VideoLibraryService }) {
  const router = new Hono<{ Bindings: RuntimeBindings; Variables: { user: string; library: VideoLibraryService } }>();
  router.use("*", async (c, next) => {
    c.header("Cache-Control", "no-store"); const session = await deps.readSession(c.req.raw, c.env);
    if (!session?.user?.id) return c.json(errorEnvelope("UNAUTHORIZED", "Đăng nhập để dùng thư viện video riêng."), 401);
    if (c.req.method === "POST" && c.req.header("origin") && c.req.header("origin") !== new URL(c.req.url).origin) throw new VideoError("ORIGIN_DENIED", 403);
    c.set("user", session.user.id);
    if (deps.service) c.set("library", deps.service); else { if (!c.env?.DATABASE_URL) throw new VideoError("SERVICE_UNAVAILABLE", 503); const { createHttpDatabase } = await import("./db/client"); c.set("library", createDatabaseVideoLibraryService(createHttpDatabase(c.env.DATABASE_URL, c.env.DATABASE_DRIVER),videoEpoch(c.req.header("X-Video-Revision")))); }
    await next();
  });
  router.onError((error, c) => { const code = error instanceof VideoError || error instanceof VideoRuleError ? error.code : "SERVICE_UNAVAILABLE"; const status = error instanceof VideoError ? error.status : error instanceof VideoRuleError ? error.code === "IDEMPOTENCY_CONFLICT" ? 409 : 400 : 503; return c.json(errorEnvelope(code, error instanceof VideoRuleError && error.reason ? error.reason : code === "INVALID_VIDEO_URL" ? "Dán link một video YouTube hợp lệ; không nhận playlist hoặc kênh." : "Chưa thể tải hoặc lưu dữ liệu video."), status); });
  function id(value: string) { if (!z.uuid().safeParse(value).success) throw new VideoError("VIDEO_NOT_FOUND", 404); return value; }
  router.get("/", async c => { const params = new URL(c.req.url).searchParams, raw = params.get("page") ?? "1", page = Number(raw); if ([...params.keys()].some(key => key !== "page") || params.getAll("page").length > 1 || !/^[1-9]\d*$/.test(raw) || !Number.isSafeInteger(page) || page > 100000) throw new VideoError("INVALID_REQUEST", 400); return c.json(await c.get("library").list(c.get("user"), c.req.param("learnerId")!, page)); });
  router.get("/:videoId", async c => c.json(await c.get("library").read(c.get("user"), c.req.param("learnerId")!, id(c.req.param("videoId")))));
  router.get("/:videoId/watch-state", async c => c.json(await c.get("library").watch(c.get("user"), c.req.param("learnerId")!, id(c.req.param("videoId")))));
  router.post("/:videoId/watch-state/actions", async c => { const raw = await c.req.text(); if (raw.length > 8192) throw new VideoError("INVALID_REQUEST", 400); let value: unknown; try { value = JSON.parse(raw); } catch { throw new VideoError("INVALID_REQUEST", 400); } const action = videoWatchActionSchema.safeParse(value); if (!action.success) throw new VideoError("INVALID_REQUEST", 400); return c.json(await c.get("library").watchAction(c.get("user"), c.req.param("learnerId")!, id(c.req.param("videoId")), action.data)); });
  router.get("/:videoId/transcripts", async c => c.json(await c.get("library").transcripts(c.get("user"), c.req.param("learnerId")!, id(c.req.param("videoId")))));
  router.get("/:videoId/transcripts/:versionId", async c => c.json(await c.get("library").transcript(c.get("user"), c.req.param("learnerId")!, id(c.req.param("videoId")), id(c.req.param("versionId")))));
  router.post("/:videoId/transcripts", async c => { const raw = await c.req.text(); if (raw.length > 800000) throw new VideoError("INVALID_SUBTITLE", 400); let input: unknown; try { input = JSON.parse(raw); } catch { throw new VideoError("INVALID_REQUEST", 400); } const parsed = videoTranscriptImportSchema.safeParse(input); if (!parsed.success) throw new VideoError("INVALID_SUBTITLE", 400); return c.json(await c.get("library").importTranscript(c.get("user"), c.req.param("learnerId")!, id(c.req.param("videoId")), parsed.data)); });
  router.post("/", async c => { const raw = await c.req.text(); if (raw.length > 8192) throw new VideoError("INVALID_REQUEST", 400); let input: unknown; try { input = JSON.parse(raw); } catch { throw new VideoError("INVALID_REQUEST", 400); } const parsed = videoLibraryCreateSchema.safeParse(input); if (!parsed.success) throw new VideoError("INVALID_REQUEST", 400); return c.json(await c.get("library").create(c.get("user"), c.req.param("learnerId")!, parsed.data.videoId, parsed.data.url)); });
  return router;
}
