import { z } from "zod";
export const sourceReportSchema = z.object({ actionId: z.uuid(), cueId: z.string().regex(/^cue-\d+$/), reason: z.enum(["text", "timing"]) }).strict();
export const sourceReportsSchema = z.array(sourceReportSchema.extend({ reportedAt: z.iso.datetime() })).max(5000);
export type SourceReport = z.infer<typeof sourceReportSchema>;
export type SourceReports = z.infer<typeof sourceReportsSchema>;
