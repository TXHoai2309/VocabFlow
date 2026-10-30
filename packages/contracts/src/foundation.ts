import { z } from "zod";

export const foundationItemTypeSchema = z.enum(["LETTER_ACTIVITY", "UTTERANCE"]);
export const foundationPinsSchema = z.object({
  targetRevision: z.number().int().positive(),
  presentationRevision: z.number().int().positive(),
  pronunciationRevision: z.number().int().positive().nullable()
}).strict();
const localDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const foundationStateSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("NEW"), consecutiveCorrect: z.literal(0), intervalDays: z.literal(0), firstLearnedDate: z.null(), lastReviewedDate: z.null(), nextReviewDate: z.null(), totalCorrect: z.literal(0), totalIncorrect: z.literal(0) }).strict(),
  z.object({ status: z.enum(["LEARNING", "MASTERED"]), consecutiveCorrect: z.number().int().nonnegative(), intervalDays: z.union([z.literal(1), z.literal(3), z.literal(7), z.literal(14), z.literal(30)]), firstLearnedDate: localDate, lastReviewedDate: localDate, nextReviewDate: localDate, totalCorrect: z.number().int().nonnegative(), totalIncorrect: z.number().int().nonnegative() }).strict()
]);
export const foundationProgressSchema = z.object({ revision: z.number().int().nonnegative(), state: foundationStateSchema }).strict();
export const foundationQueueQuerySchema = z.object({ collection: z.string().regex(/^[a-z][a-z0-9-]{0,70}$/), capacity: z.enum(["5", "10", "20", "30"]).default("10"), mode: z.enum(["new", "review", "mixed"]).default("mixed") }).strict();
export const foundationAttemptRequestSchema = z.object({ targetId: z.string().uuid(), pins: foundationPinsSchema, expectedRevision: z.number().int().nonnegative(), mode: z.enum(["ASSESS", "PRACTICE"]).default("ASSESS"), guestId: z.string().uuid().optional() }).strict();
export const foundationRevealRequestSchema = z.object({ attemptRef: z.string().uuid(), guestId: z.string().uuid().optional() }).strict();
export const foundationReviewRequestSchema = z.object({
  reviewId: z.string().uuid(), attemptRef: z.string().uuid(), expectedRevision: z.number().int().nonnegative(), pins: foundationPinsSchema,
  answer: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("LETTER_OPTION"), optionKey: z.string().uuid() }).strict(),
    z.object({ kind: z.literal("SELF_RECALL"), result: z.enum(["REMEMBERED", "FORGOTTEN"]) }).strict()
  ]), guestId: z.string().uuid().optional()
}).strict();
export const foundationQueueItemSchema = z.object({ targetId: z.string().uuid(), itemType: foundationItemTypeSchema, kind: z.enum(["LETTER_NAME", "LETTER_SOUND", "UTTERANCE"]), pins: foundationPinsSchema, context: z.string().nullable(), progress: foundationProgressSchema, audioAvailable: z.boolean(), listeningReady: z.boolean() }).strict();
export const foundationQueueResponseSchema = z.object({ date: localDate, items: z.array(foundationQueueItemSchema), collection: z.string(), unavailableCount: z.number().int().nonnegative() }).strict();
export const foundationCatalogSchema = z.object({ collections: z.array(z.object({ code: z.string(), title: z.string(), module: z.enum(["letters", "utterances"]), total: z.number().int().nonnegative(), mediaReady: z.number().int().nonnegative(), listeningReady: z.number().int().nonnegative() }).strict()), counts: z.object({ letters: z.number().int(), activities: z.number().int(), utterances: z.number().int() }).strict() }).strict();
export const foundationAttemptResponseSchema = z.object({ attemptRef: z.string().uuid(), targetId: z.string().uuid(), itemType: foundationItemTypeSchema, pins: foundationPinsSchema, expectedRevision: z.number().int().nonnegative(), instruction: z.string(), audioUrl: z.string().nullable(), options: z.array(z.object({ optionKey: z.string().uuid(), glyph: z.string() }).strict()) }).strict();
export const foundationTeachingSchema = z.object({ targetId: z.string().uuid(), title: z.string(), textEn: z.string(), translationVi: z.string(), explanation: z.string(), audioUrl: z.string().nullable(), audioReview: z.enum(["PENDING", "OWNER_ACCEPTED", "MISSING"]) }).strict();
export const foundationReviewResponseSchema = z.object({ reviewId: z.string().uuid(), targetId: z.string().uuid(), itemType: foundationItemTypeSchema, result: z.enum(["REMEMBERED", "FORGOTTEN"]), progress: foundationProgressSchema, date: localDate }).strict();
export const foundationGradeResponseSchema = foundationReviewResponseSchema.omit({ progress: true });

export type FoundationPins = z.infer<typeof foundationPinsSchema>;
export type FoundationProgress = z.infer<typeof foundationProgressSchema>;
export type FoundationQueueItem = z.infer<typeof foundationQueueItemSchema>;
export type FoundationQueue = z.infer<typeof foundationQueueResponseSchema>;
export type FoundationReviewRequest = z.infer<typeof foundationReviewRequestSchema>;
export type FoundationReviewResponse = z.infer<typeof foundationReviewResponseSchema>;
export type FoundationAttempt = z.infer<typeof foundationAttemptResponseSchema>;
export type FoundationTeaching = z.infer<typeof foundationTeachingSchema>;
