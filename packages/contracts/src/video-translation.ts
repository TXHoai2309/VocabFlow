import { z } from "zod";

import { videoCueSchema } from "./video-learning.js";
export const translationScopeSchema = z.object({versionId:z.uuid(),startMs:z.number().int().nonnegative().max(86400000),endMs:z.number().int().positive().max(86400000)}).strict();
export const translationStartSchema = translationScopeSchema.extend({ requestId: z.uuid(), reviewedNonpersonal: z.literal(true) }).strict();
export const translationResultSchema = z.object({ requestId: z.uuid(), versionId: z.uuid(), hash: z.string(), startMs: z.number(), endMs: z.number(), status: z.enum(["processing", "success", "failed", "uncertain"]), reason: z.string().nullable(), createdAt: z.iso.datetime(), items: z.array(videoCueSchema.extend({ vietnamese: z.string() })).max(50) }).strict();
export const translationPreviewSchema = z.object({ versionId: z.uuid(), hash: z.string(), startMs: z.number(), endMs: z.number(), characters: z.number().int().nonnegative(), cues: z.array(videoCueSchema).max(50), available: z.boolean(), remaining: z.number().int().nonnegative().nullable(), reason: z.string().nullable(), cached: translationResultSchema.nullable() }).strict();
export const translationPageSchema = z.object({ page: z.number().int().positive(), pageSize: z.literal(20), total: z.number().int().nonnegative(), items: z.array(translationResultSchema).max(20) }).strict();
export type TranslationScope = z.infer<typeof translationScopeSchema>;
export type TranslationResult = z.infer<typeof translationResultSchema>;
