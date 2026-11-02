import { z } from "zod";
import { practiceActionSchema, practiceConfigSchema } from "@vocabflow/contracts";

const schema = z.object({
  version: z.literal(1), userId: z.string().min(1).max(200), learnerId: z.uuid(), sessionId: z.uuid(),
  config: practiceConfigSchema, created: z.boolean(), pending: practiceActionSchema.nullable(), feedback: z.boolean(),
  draft: z.object({ questionId: z.uuid(), text: z.string().max(200) }).nullable(),
  retry: z.object({ originalId: z.uuid(), questionIds: z.array(z.uuid()).min(1).max(30) }).optional()
}).strict();
export type PracticeCheckpoint = z.infer<typeof schema>;
export class PracticeCheckpointError extends Error {
  constructor(readonly code: "STORAGE_UNAVAILABLE") { super(code); }
}
export function practiceCheckpointKey(userId: string, learnerId: string) {
  return `vocabflow.practice.resume.v1:${encodeURIComponent(userId)}:${learnerId}`;
}
export function readPracticeCheckpoint(userId: string, learnerId: string): PracticeCheckpoint | null {
  let raw: string | null;
  try { raw = localStorage.getItem(practiceCheckpointKey(userId, learnerId)); }
  catch { throw new PracticeCheckpointError("STORAGE_UNAVAILABLE"); }
  if (!raw) return null;
  if (raw.length > 16384) throw new Error("INVALID_PRACTICE_CHECKPOINT");
  const parsed = schema.safeParse(JSON.parse(raw));
  if (!parsed.success || parsed.data.userId !== userId || parsed.data.learnerId !== learnerId) throw new Error("INVALID_PRACTICE_CHECKPOINT");
  return parsed.data;
}
export function writePracticeCheckpoint(checkpoint: PracticeCheckpoint) {
  const value = schema.parse(checkpoint);
  localStorage.setItem(practiceCheckpointKey(value.userId, value.learnerId), JSON.stringify(value));
}
export function clearPracticeCheckpoint(userId: string, learnerId: string) {
  localStorage.removeItem(practiceCheckpointKey(userId, learnerId));
}
