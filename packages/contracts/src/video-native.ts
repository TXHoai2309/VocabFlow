import { z } from "zod";
export const nativeRunSchema = z.object({ requestId: z.uuid(), status: z.enum(["processing", "waiting", "success", "failed", "uncertain"]), reason: z.string().nullable(), versionId: z.uuid().nullable() }).strict();
export const nativeQuotaSchema = z.object({ available: z.boolean(), remaining: z.number().int().nonnegative().nullable(), reason: z.string().nullable() }).strict();
export const nativeViewSchema = z.object({ quota: nativeQuotaSchema, run: nativeRunSchema.nullable() }).strict();
export type NativeRun = z.infer<typeof nativeRunSchema>;
export type NativeQuota = z.infer<typeof nativeQuotaSchema>;
