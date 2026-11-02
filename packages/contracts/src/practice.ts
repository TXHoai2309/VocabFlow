import { z } from "zod";
import { cefrFilterValues } from "./learning-levels.js";

const filter = z.enum(cefrFilterValues);
export const practiceSourceSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("learned"), cefr: filter.optional() }).strict(),
  z.object({ kind: z.literal("saved"), cefr: filter.optional() }).strict(),
  z.object({ kind: z.literal("set"), setId: z.number().int().positive().max(2147483647), cefr: filter.optional() }).strict(),
  z.object({ kind: z.literal("level"), cefr: filter }).strict()
]);
export const practiceConfigSchema = z.object({
  count: z.union([z.literal(5), z.literal(10), z.literal(20), z.literal(30)]).default(10),
  source: practiceSourceSchema.default({ kind: "learned" }),
  cue: z.enum(["image", "audio", "mixed"]).default("image"), responseMode: z.enum(["choice", "type"]).default("choice")
}).strict();
export type PracticeSource = z.infer<typeof practiceSourceSchema>;
export type PracticeConfig = z.infer<typeof practiceConfigSchema>;
export const practiceCreateSchema = practiceConfigSchema.extend({ sessionId: z.uuid() });
const actionBase = { actionId: z.uuid(), questionId: z.uuid() };
export const practiceActionSchema = z.discriminatedUnion("kind", [
  z.object({ ...actionBase, kind: z.literal("answer"), optionId: z.uuid() }).strict(),
  z.object({ ...actionBase, kind: z.literal("type-answer"), text: z.string().trim().min(1).max(200) }).strict(),
  z.object({ ...actionBase, kind: z.literal("reveal") }).strict(),
  z.object({ ...actionBase, kind: z.literal("skip") }).strict(),
  z.object({ ...actionBase, kind: z.literal("technical-skip") }).strict()
]);
export const practiceOutcomeSchema = z.enum(["correct", "incorrect", "revealed", "skipped", "technical"]);
const outcomeCounts = z.object({ correct: z.number().int().nonnegative(), incorrect: z.number().int().nonnegative(),
  revealed: z.number().int().nonnegative(), skipped: z.number().int().nonnegative(), technical: z.number().int().nonnegative() });
export const practiceSessionSchema = z.object({
  config: practiceConfigSchema,
  sessionId: z.uuid(), learnerId: z.uuid(), revision: z.number().int().nonnegative(),
  requestedCount: z.number().int().positive(), availableCount: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(), completed: z.number().int().nonnegative(),
  status: z.enum(["active", "complete"]),
  emptyReason: z.enum(["no-learned-words", "empty-source", "insufficient-media-or-options", "insufficient-mixed-media"]).nullable(),
  current: z.object({
    questionId: z.uuid(), responseMode: z.enum(["choice", "type"]), cueKind: z.enum(["image", "audio"]), imageUrl: z.string().nullable(), audioUrl: z.string().nullable(),
    options: z.array(z.object({ optionId: z.uuid(), label: z.string() })).max(4)
  }).nullable(),
  feedback: z.object({ questionId: z.uuid(), cueKind: z.enum(["image", "audio"]), outcome: practiceOutcomeSchema, answer: z.string() }).nullable(),
  summary: z.object({
    correct: z.number().int().nonnegative(), incorrect: z.number().int().nonnegative(),
    revealed: z.number().int().nonnegative(), skipped: z.number().int().nonnegative(),
    technical: z.number().int().nonnegative(), accuracy: z.number().min(0).max(100).nullable(),
    byCue: z.object({ image: outcomeCounts, audio: outcomeCounts })
  })
});
export type PracticeAction = z.infer<typeof practiceActionSchema>;
export type PracticeSession = z.infer<typeof practiceSessionSchema>;
export type PracticeOutcome = z.infer<typeof practiceOutcomeSchema>;

/** Private persistence shape; never used as a pre-answer API response. */
export const practiceStoredQuestionSchema = z.object({
  questionId: z.uuid(), vocabularyId: z.number().int().positive(), contentVersion: z.number().int().positive(),
  contentHash: z.string().regex(/^[a-f0-9]{64}$/).optional(), cueKind: z.enum(["image", "audio"]),
  responseMode: z.enum(["choice", "type"]), imageUrl: z.string().nullable(), audioUrl: z.string().nullable(),
  answer: z.string().min(1), correctOptionId: z.uuid().nullable(),
  options: z.array(z.object({ optionId: z.uuid(), label: z.string().min(1) }).strict()).max(4)
}).strict().refine(q => q.responseMode === "type" ? q.options.length === 0 && q.correctOptionId === null
  : q.options.length === 4 && q.options.some(option => option.optionId === q.correctOptionId && option.label === q.answer));
export const practiceStoredStateSchema = z.object({
  sessionId: z.uuid(), learnerId: z.uuid(), revision: z.number().int().nonnegative(),
  requestedCount: z.number().int().positive(), availableCount: z.number().int().nonnegative(),
  emptyReason: practiceSessionSchema.shape.emptyReason, config: practiceConfigSchema,
  retryOf: z.uuid().optional(), retryQuestionIds: z.array(z.uuid()).max(30).optional(),
  questions: z.array(practiceStoredQuestionSchema).max(30),
  results: z.array(z.object({ action: practiceActionSchema, outcome: practiceOutcomeSchema, answer: z.string(), cueKind: z.enum(["image", "audio"]), answeredAt: z.iso.datetime().optional() }).strict()).max(30)
}).strict().refine(state => state.revision === state.results.length && state.results.length <= state.questions.length
  && new Set(state.questions.map(q => q.questionId)).size === state.questions.length
  && new Set(state.questions.map(q => q.vocabularyId)).size === state.questions.length
  && state.results.every((result, i) => result.action.questionId === state.questions[i]?.questionId
    && result.answer === state.questions[i]?.answer && result.cueKind === state.questions[i]?.cueKind));

export const practiceRetryRequestSchema = z.object({ sessionId: z.uuid(), questionIds: z.array(z.uuid()).min(1).max(30)
  .refine(ids => new Set(ids).size === ids.length).optional() }).strict();
export const practiceHistoryEntrySchema = z.object({
  sessionId: z.uuid(), createdAt: z.iso.datetime(), config: practiceConfigSchema, retryOf: z.uuid().optional(),
  total: z.number().int().nonnegative(), completed: z.number().int().nonnegative(), status: z.enum(["active", "complete"]),
  summary: practiceSessionSchema.shape.summary
}).strict();
export const practiceNeedsMoreSchema = z.object({ vocabularyId: z.number().int().positive(), word: z.string(),
  incorrectCount: z.number().int().positive(), lastAnsweredAt: z.iso.datetime(), sessionId: z.uuid() }).strict();
export const practiceHistorySchema = z.object({
  page: z.number().int().positive(), needsPage: z.number().int().positive(), pageSize: z.literal(20),
  totalSessions: z.number().int().nonnegative(), needsTotal: z.number().int().nonnegative(),
  items: z.array(practiceHistoryEntrySchema).max(20), needsPractice: z.array(practiceNeedsMoreSchema).max(20)
}).strict();
export const practiceResultsSchema = z.object({
  session: practiceHistoryEntrySchema,
  results: z.array(z.object({ questionId: z.uuid(), vocabularyId: z.number().int().positive(), word: z.string(),
    outcome: practiceOutcomeSchema, cueKind: z.enum(["image", "audio"]), responseMode: z.enum(["choice", "type"]),
    contentVersion: z.number().int().positive(), contentHash: z.string().nullable(), submitted: z.string().nullable(), answeredAt: z.iso.datetime().nullable()
  }).strict()).max(30)
}).strict();
export type PracticeHistoryEntry = z.infer<typeof practiceHistoryEntrySchema>;
export type PracticeHistory = z.infer<typeof practiceHistorySchema>;
export type PracticeNeedsMore = z.infer<typeof practiceNeedsMoreSchema>;
export type PracticeResults = z.infer<typeof practiceResultsSchema>;
