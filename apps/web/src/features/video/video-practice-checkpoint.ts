import { z } from "zod";
import { videoPracticeCreateSchema, videoPracticeActionSchema } from "@vocabflow/contracts";
const schema = z.object({ version: z.literal(1), userId: z.string().min(1), learnerId: z.uuid(), videoId: z.uuid(), input: videoPracticeCreateSchema,
  created: z.boolean(), pending: videoPracticeActionSchema.nullable(), feedback: z.boolean(), draft: z.object({ questionId: z.uuid(), text: z.string().max(200) }).nullable() }).strict();
export type VideoPracticeCheckpoint = z.infer<typeof schema>;
export class VideoCheckpointError extends Error { constructor(readonly code: string) { super(code); } }
export const videoCheckpointKey = (user: string, learner: string, video: string) => `vocabflow.video.practice.v1:${encodeURIComponent(user)}:${learner}:${video}`;
export function readVideoCheckpoint(user: string, learner: string, video: string): VideoPracticeCheckpoint | null {
  let raw: string | null; try { raw = localStorage.getItem(videoCheckpointKey(user, learner, video)); } catch { throw new VideoCheckpointError("STORAGE_UNAVAILABLE"); }
  if (!raw) return null;
  try { if (raw.length > 16384) throw new Error(); const item = schema.parse(JSON.parse(raw)); if (item.userId !== user || item.learnerId !== learner || item.videoId !== video) throw new Error(); return item; } catch { throw new VideoCheckpointError("INVALID_VIDEO_CHECKPOINT"); }
}
export function writeVideoCheckpoint(value: VideoPracticeCheckpoint) { try { localStorage.setItem(videoCheckpointKey(value.userId, value.learnerId, value.videoId), JSON.stringify(schema.parse(value))); } catch { throw new VideoCheckpointError("STORAGE_UNAVAILABLE"); } }
export function clearVideoCheckpoint(user: string, learner: string, video: string) { try { localStorage.removeItem(videoCheckpointKey(user, learner, video)); } catch { throw new VideoCheckpointError("STORAGE_UNAVAILABLE"); } }
