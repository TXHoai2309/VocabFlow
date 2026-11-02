import { z } from "zod";
import { practiceOutcomeSchema } from "./practice.js";
export const videoPracticeCreateSchema = z.object({ sessionId: z.uuid(), versionId: z.uuid(), startMs: z.number().int().nonnegative().max(86400000), endMs: z.number().int().positive().max(86400000) }).strict().refine(value => value.endMs > value.startMs);
const base = { actionId: z.uuid(), questionId: z.uuid() };
export const videoPracticeActionSchema = z.discriminatedUnion("kind", [z.object({ ...base, kind: z.literal("answer"), text: z.string().trim().min(1).max(200) }).strict(), z.object({...base,kind:z.literal("report-source"),reason:z.enum(["text","timing"])}).strict(), ...["reveal", "skip", "technical-skip"].map(kind => z.object({ ...base, kind: z.literal(kind as "reveal" | "skip" | "technical-skip") }).strict())]);
export const videoPracticeSessionSchema = z.object({ sessionId: z.uuid(), videoId: z.uuid(), versionId: z.uuid(), transcriptHash: z.string(), startMs: z.number(), endMs: z.number(), revision: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(), completed: z.number().int().nonnegative(), status: z.enum(["active", "complete"]),
  current: z.object({ questionId: z.uuid(), maskedText: z.string(), startMs: z.number(), endMs: z.number() }).strict().nullable(),
  feedback: z.object({ questionId: z.uuid(), text: z.string(), answer: z.string(), outcome: practiceOutcomeSchema, sourceReport:z.enum(["text","timing"]).nullable().optional(),translation:z.object({text:z.string(),provider:z.string()}).nullable().optional() }).strict().nullable(),
  summary: z.object({ correct: z.number().int().nonnegative(), incorrect: z.number().int().nonnegative(), revealed: z.number().int().nonnegative(), skipped: z.number().int().nonnegative(), technical: z.number().int().nonnegative(), accuracy: z.number().min(0).max(100).nullable() }).strict()
}).strict();
export type VideoPracticeAction = z.infer<typeof videoPracticeActionSchema>;
export type VideoPracticeSession = z.infer<typeof videoPracticeSessionSchema>;
export type VideoPracticeCreate = z.infer<typeof videoPracticeCreateSchema>;
export const videoPracticeHistoryEntrySchema = videoPracticeSessionSchema.omit({ current: true, feedback: true }).extend({ createdAt: z.iso.datetime() });
export const videoPracticeHistorySchema = z.object({ page: z.number().int().positive(), pageSize: z.literal(20), total: z.number().int().nonnegative(), items: z.array(videoPracticeHistoryEntrySchema).max(20) }).strict();
export const videoPracticeResultsSchema = z.object({ session: videoPracticeHistoryEntrySchema, page: z.number().int().positive(), pageSize: z.literal(20), items: z.array(z.object({ questionId: z.uuid(), cueId: z.string(), text: z.string(), answer: z.string(), maskedText: z.string(), startMs: z.number(), endMs: z.number(), outcome: practiceOutcomeSchema, submitted: z.string().nullable(), answeredAt: z.iso.datetime(), sourceReport:z.enum(["text","timing"]).nullable().optional(),translation:z.object({text:z.string(),provider:z.string()}).nullable().optional() }).strict()).max(20) }).strict();
export type VideoPracticeHistory = z.infer<typeof videoPracticeHistorySchema>;
export type VideoPracticeResults = z.infer<typeof videoPracticeResultsSchema>;
