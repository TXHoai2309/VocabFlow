import { z } from "zod";
export const videoLibraryCreateSchema = z.object({ videoId: z.uuid(), url: z.string().trim().min(1).max(2048) }).strict();
export const videoLibraryEntrySchema = z.object({ dataRevision:z.number().int().nonnegative().default(0),id: z.uuid(), youtubeId: z.string().regex(/^[A-Za-z0-9_-]{11}$/), canonicalUrl: z.string().url(), createdAt: z.iso.datetime() }).strict();
export const videoLibraryPageSchema = z.object({ page: z.number().int().positive(), pageSize: z.literal(20), total: z.number().int().nonnegative(), items: z.array(videoLibraryEntrySchema).max(20) }).strict();
export type VideoLibraryEntry = z.infer<typeof videoLibraryEntrySchema>;
export type VideoLibraryPage = z.infer<typeof videoLibraryPageSchema>;
export const VIDEO_SUBTITLE_MAX_BYTES = 524288;
export const videoCueSchema = z.object({ id: z.string().regex(/^cue-\d+$/), startMs: z.number().int().nonnegative().max(86400000), endMs: z.number().int().positive().max(86400000), text: z.string().min(1).max(2000) }).strict().refine(cue => cue.endMs > cue.startMs);
export const videoTranscriptImportSchema = z.object({ versionId: z.uuid(), format: z.enum(["srt", "vtt"]), language: z.literal("en"), text: z.string().min(1).max(VIDEO_SUBTITLE_MAX_BYTES) }).strict();
export const videoTranscriptSchema = z.object({ versionId: z.uuid(), videoId: z.uuid(), format: z.enum(["srt", "vtt"]), language: z.literal("en"), source: z.enum(["personal-import", "supadata-native"]),
  sha256: z.string().regex(/^[a-f0-9]{64}$/), createdAt: z.iso.datetime(), cues: z.array(videoCueSchema).min(1).max(5000) }).strict();
export const videoTranscriptsSchema = z.object({ items: z.array(videoTranscriptSchema.omit({ cues: true })), latestVersionId: z.uuid().nullable() }).strict();
export type VideoCue = z.infer<typeof videoCueSchema>;
export type VideoTranscript = z.infer<typeof videoTranscriptSchema>;
export type VideoTranscriptImport = z.infer<typeof videoTranscriptImportSchema>;
const millis = z.number().int().nonnegative().max(86400000);
export const videoWatchActionSchema = z.discriminatedUnion("kind", [
  z.object({ actionId: z.uuid(), kind: z.literal("position"), positionMs: millis }).strict(),
  z.object({ actionId: z.uuid(), kind: z.literal("bookmark"), versionId: z.uuid(), startMs: millis, endMs: millis, label: z.string().trim().min(1).max(120) }).strict().refine(value => value.endMs > value.startMs)
]);
export const videoBookmarkSchema = z.object({ id: z.uuid(), versionId: z.uuid(), startMs: millis, endMs: millis, label: z.string().min(1).max(120), createdAt: z.iso.datetime() }).strict();
export const videoWatchSchema = z.object({ revision: z.number().int().nonnegative(), positionMs: millis.nullable(), bookmarks: z.array(videoBookmarkSchema) }).strict();
export type VideoWatchAction = z.infer<typeof videoWatchActionSchema>;
export type VideoWatchState = z.infer<typeof videoWatchSchema>;
