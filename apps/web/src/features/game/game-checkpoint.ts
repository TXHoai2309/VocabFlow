import { z } from "zod";
import { fishGameActionSchema, fishGameConfigSchema, fishGameFinishSchema } from "@vocabflow/contracts";
const schema = z.object({ version: z.literal(1), userId: z.string().min(1).max(200), learnerId: z.uuid(), gameId: z.uuid(), config: fishGameConfigSchema,
  created: z.boolean(), pending: fishGameActionSchema.nullable(), finish: fishGameFinishSchema.optional(), feedback: z.boolean(), draft: z.object({ questionId: z.uuid(), text: z.string().max(200) }).nullable() }).strict().refine(cp => !(cp.pending && cp.finish));
export type GameCheckpoint = z.infer<typeof schema>;
export class GameCheckpointError extends Error { constructor(readonly code: string) { super(code); } }
export const gameCheckpointKey = (user: string, learner: string) => `vocabflow.game.resume.v1:${encodeURIComponent(user)}:${learner}`;
export function readGameCheckpoint(user: string, learner: string): GameCheckpoint | null {
  let raw: string | null; try { raw = localStorage.getItem(gameCheckpointKey(user, learner)); } catch { throw new GameCheckpointError("STORAGE_UNAVAILABLE"); }
  if (!raw) return null;
  try { if (raw.length > 16384) throw new Error(); const parsed = schema.parse(JSON.parse(raw)); if (parsed.userId !== user || parsed.learnerId !== learner) throw new Error(); return parsed; }
  catch { throw new GameCheckpointError("INVALID_GAME_CHECKPOINT"); }
}
export function writeGameCheckpoint(value: GameCheckpoint) { try { localStorage.setItem(gameCheckpointKey(value.userId, value.learnerId), JSON.stringify(schema.parse(value))); } catch { throw new GameCheckpointError("STORAGE_UNAVAILABLE"); } }
export function clearGameCheckpoint(user: string, learner: string) { try { localStorage.removeItem(gameCheckpointKey(user, learner)); } catch { throw new GameCheckpointError("STORAGE_UNAVAILABLE"); } }
