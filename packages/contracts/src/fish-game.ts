import { z } from "zod";
import { practiceSourceSchema, practiceOutcomeSchema, practiceStoredQuestionSchema } from "./practice.js";

export const fishGameConfigSchema = z.object({ source: practiceSourceSchema.default({ kind: "learned" }), cue: z.enum(["image", "audio", "mixed"]).default("image") }).strict();
export const fishGameCreateSchema = fishGameConfigSchema.extend({ gameId: z.uuid() });
const base = { actionId: z.uuid(), questionId: z.uuid() };
export const fishGameActionSchema = z.discriminatedUnion("kind", [
  z.object({ ...base, kind: z.literal("type-answer"), text: z.string().trim().min(1).max(200) }).strict(),
  z.object({ ...base, kind: z.literal("reveal") }).strict(),
  z.object({ ...base, kind: z.literal("skip") }).strict(),
  z.object({ ...base, kind: z.literal("technical-skip") }).strict()
]);
export const fishGameQuestionSchema = z.object({ questionId: z.uuid(), cueKind: z.enum(["image", "audio"]), imageUrl: z.string().nullable(), audioUrl: z.string().nullable() }).strict();
export const fishGameSessionSchema = z.object({
  gameId: z.uuid(), learnerId: z.uuid(), rulesVersion: z.literal(1), config: fishGameConfigSchema,
  revision: z.number().int().nonnegative(), hearts: z.number().int().min(0).max(5), score: z.number().int().nonnegative(),
  status: z.enum(["active", "lost", "paused-content", "ended"]), cycle: z.number().int().positive(), resolved: z.number().int().nonnegative(),
  emptyReason: z.enum(["no-learned-words", "empty-source", "insufficient-media", "insufficient-mixed-media", "insufficient-next-cue", "no-valid-media"]).nullable(),
  current: fishGameQuestionSchema.nullable(),
  feedback: z.object({ questionId: z.uuid(), answer: z.string(), outcome: practiceOutcomeSchema }).nullable(),
  summary: z.object({ correct: z.number().int().nonnegative(), incorrect: z.number().int().nonnegative(), revealed: z.number().int().nonnegative(), skipped: z.number().int().nonnegative(), technical: z.number().int().nonnegative() })
}).strict();
export type FishGameConfig = z.infer<typeof fishGameConfigSchema>;
export type FishGameAction = z.infer<typeof fishGameActionSchema>;
export type FishGameSession = z.infer<typeof fishGameSessionSchema>;
export const fishGameFinishSchema = z.object({ actionId: z.uuid() }).strict();
export const fishGameHistoryEntrySchema = z.object({ gameId: z.uuid(), createdAt: z.iso.datetime(), endedAt: z.iso.datetime().nullable(),
  config: fishGameConfigSchema, rulesVersion: z.literal(1), score: z.number().int().nonnegative(), hearts: z.number().int().min(0).max(5),
  status: fishGameSessionSchema.shape.status, resolved: z.number().int().nonnegative(), summary: fishGameSessionSchema.shape.summary }).strict();
export const fishGameRecordSchema = z.object({ config: fishGameConfigSchema, rulesVersion: z.literal(1), bestScore: z.number().int().nonnegative(), bestGameId: z.uuid(), finalizedGames: z.number().int().positive() }).strict();
export const fishGameHistorySchema = z.object({ page: z.number().int().positive(), recordsPage: z.number().int().positive(), pageSize: z.literal(20),
  totalGames: z.number().int().nonnegative(), totalRecords: z.number().int().nonnegative(), items: z.array(fishGameHistoryEntrySchema).max(20), records: z.array(fishGameRecordSchema).max(20) }).strict();
export const fishGameResultsSchema = z.object({ game: fishGameHistoryEntrySchema, page: z.number().int().positive(), pageSize: z.literal(20), totalResolved: z.number().int().nonnegative(),
  items: z.array(z.object({ questionId: z.uuid(), word: z.string(), outcome: practiceOutcomeSchema, cueKind: z.enum(["image", "audio"]), submitted: z.string().nullable(), contentVersion: z.number().int().positive(), contentHash: z.string().nullable(), answeredAt: z.iso.datetime() }).strict()).max(20) }).strict();
export type FishGameHistoryEntry = z.infer<typeof fishGameHistoryEntrySchema>;
export type FishGameRecord = z.infer<typeof fishGameRecordSchema>;
export type FishGameHistory = z.infer<typeof fishGameHistorySchema>;
export type FishGameResults = z.infer<typeof fishGameResultsSchema>;
/** Private local persistence shape, never an unanswered API response. */
export const fishGameStoredStateSchema = z.object({
  gameId: z.uuid(), learnerId: z.uuid(), rulesVersion: z.literal(1), config: fishGameConfigSchema,
  revision: z.number().int().nonnegative(), hearts: z.number().int().min(0).max(5), score: z.number().int().nonnegative(),
  status: fishGameSessionSchema.shape.status, cycle: z.number().int().positive(), emptyReason: fishGameSessionSchema.shape.emptyReason,
  phase: z.enum(["learned", "new", "cycle"]).optional(), unseen: z.array(z.number().int().positive()).optional(), excludedIds: z.array(z.number().int().positive()).optional(),
  finished: z.object({ actionId: z.uuid(), at: z.iso.datetime() }).strict().optional(),
  pool: z.array(z.object({ id: z.number().int().positive(), word: z.string().min(1), vietnamese: z.string(), contentVersion: z.number().int().positive(), learned: z.boolean(),
    imageUrl: z.string().nullable(), audioUrl: z.string().nullable().optional(), imageMediaStatus: z.string().optional(), contentHash: z.string().regex(/^[a-f0-9]{64}$/).optional() }).strict()),
  remaining: z.array(z.number().int().positive()), current: practiceStoredQuestionSchema.nullable(),
  receipts: z.array(z.object({ action: fishGameActionSchema, question: practiceStoredQuestionSchema, outcome: practiceOutcomeSchema, answeredAt: z.iso.datetime() }).strict())
}).strict();
