import { z } from "zod";

export const APP_SCHEMA = "vocabflow_app" as const;
export const MIGRATION_SCHEMA = "drizzle" as const;

export const executionContextSchema = z.enum([
  "local-development",
  "ci-test",
  "cloudflare-production"
]);
export type ExecutionContext = z.infer<typeof executionContextSchema>;

export const trustedSourceSchema = z.enum(["dev-launcher", "github-actions", "cloudflare-runtime"]);
export type TrustedSource = z.infer<typeof trustedSourceSchema>;

export const environmentSchema = z.enum(["development", "test", "production"]);
export type Environment = z.infer<typeof environmentSchema>;

export const databaseUsageSchema = z.enum(["development", "shared-ci", "disposable", "production"]);
export type DatabaseUsage = z.infer<typeof databaseUsageSchema>;

export const databasePurposeSchema = z.enum([
  "bootstrap",
  "identity-provision",
  "migration",
  "runtime",
  "integration-test"
]);
export type DatabasePurpose = z.infer<typeof databasePurposeSchema>;

export type DatabaseTarget = {
  environment: Environment;
  provider: "neon";
  projectId: string;
  branchId: string;
  databaseName: string;
  pooled: boolean;
  usage: DatabaseUsage;
  identityVersion: 1;
};

export type ConnectionTarget = DatabaseTarget & {
  purpose: DatabasePurpose;
  roleName: string;
};

export type ConfiguredConnectionFingerprint = {
  host: string;
  databaseName: string;
  roleName: string;
  pooled: boolean;
};

export type ProviderVerifiedTarget = {
  projectId: string;
  branchId: string;
  host: string;
  databaseName: string;
  roleName: string;
  pooled: boolean;
};

export type ResolvedDatabaseTarget = {
  expected: ConnectionTarget;
  provider: ProviderVerifiedTarget;
  configured: ConfiguredConnectionFingerprint;
};

export type TrustedDbStatus =
  | "PASS"
  | "SKIPPED_NO_TEST_DATABASE_SECRET"
  | "BLOCKED_PROVIDER_VERIFICATION"
  | "BLOCKED_ROLE_MODEL"
  | "FAIL";

export type ProviderErrorCode =
  | "PROVIDER_AUTH_FAILED"
  | "PROJECT_NOT_FOUND"
  | "BRANCH_NOT_FOUND"
  | "PROVIDER_RESPONSE_INVALID"
  | "CONNECTION_TARGET_MISMATCH"
  | "PROVIDER_UNAVAILABLE";

export function mapProviderErrorToDbStatus(code: ProviderErrorCode): TrustedDbStatus {
  return code === "PROVIDER_UNAVAILABLE" ? "BLOCKED_PROVIDER_VERIFICATION" : "FAIL";
}

export type DatabaseIdentity = Pick<DatabaseTarget, "environment" | "provider" | "projectId" | "branchId" | "identityVersion">;

export function canonicalIdentityMatches(identity: DatabaseIdentity, expected: DatabaseTarget): boolean {
  return identity.environment === expected.environment
    && identity.provider === expected.provider
    && identity.projectId === expected.projectId
    && identity.branchId === expected.branchId
    && identity.identityVersion === expected.identityVersion;
}

export function validateEnvironmentUsage(target: Pick<DatabaseTarget, "environment" | "usage">) {
  const valid = target.environment === "development"
    ? target.usage === "development" || target.usage === "disposable"
    : target.environment === "test"
      ? target.usage === "shared-ci" || target.usage === "disposable"
      : target.usage === "production";
  if (!valid) throw new Error("INVALID_DATABASE_TARGET_POLICY");
}

export function expectedMatchesProvider(expected: ConnectionTarget, provider: ProviderVerifiedTarget) {
  return expected.projectId === provider.projectId
    && expected.branchId === provider.branchId
    && expected.databaseName === provider.databaseName
    && expected.pooled === provider.pooled;
}

export function providerMatchesConfigured(provider: ProviderVerifiedTarget, configured: ConfiguredConnectionFingerprint) {
  return provider.host === configured.host
    && provider.databaseName === configured.databaseName
    && provider.roleName === configured.roleName
    && provider.pooled === configured.pooled;
}

export function resolveDatabaseTarget(
  expected: ConnectionTarget,
  provider: ProviderVerifiedTarget,
  configured: ConfiguredConnectionFingerprint
): ResolvedDatabaseTarget {
  validateEnvironmentUsage(expected);
  if (!expectedMatchesProvider(expected, provider) || !providerMatchesConfigured(provider, configured)) {
    throw new Error("CONNECTION_TARGET_MISMATCH");
  }
  return { expected, provider, configured };
}

export type ErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "HOUSEHOLD_ACCESS_DENIED"
  | "LEARNER_DISPLAY_NAME_INVALID"
  | "INVALID_REQUEST"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "VOCABULARY_NOT_FOUND"
  | "IDEMPOTENCY_CONFLICT"
  | "STALE_REVISION"
  | "INTERNAL_ERROR";

export type ErrorEnvelope = {
  error: { code: ErrorCode; message: string; details?: Record<string, unknown> };
};

export const householdRoleSchema = z.enum(["OWNER", "PARENT"]);
export type HouseholdRole = z.infer<typeof householdRoleSchema>;

export const householdBootstrapResponseSchema = z.object({
  household: z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
    timezone: z.string().min(1)
  })
});
export type HouseholdBootstrapResponse = z.infer<typeof householdBootstrapResponseSchema>;

export const learnerDtoSchema = z.object({
  id: z.string().uuid(),
  householdId: z.string().uuid(),
  displayName: z.string().min(1),
  avatarKey: z.string().nullable(),
  enabled: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});
export type LearnerDto = z.infer<typeof learnerDtoSchema>;

export const createLearnerRequestSchema = z.object({
  displayName: z.string()
}).strict();
export type CreateLearnerRequest = z.infer<typeof createLearnerRequestSchema>;

export const learnerListResponseSchema = z.object({
  learners: z.array(learnerDtoSchema)
});
export type LearnerListResponse = z.infer<typeof learnerListResponseSchema>;

export const vocabularyDtoSchema = z.object({
  id: z.number().int(),
  word: z.string().min(1),
  ipa: z.string().nullable(),
  vietnamese: z.string().min(1),
  definitionEn: z.string().nullable(),
  exampleEn: z.string().nullable(),
  imageUrl: z.string().nullable(),
  audioUrl: z.string().nullable(),
  topic: z.string().nullable(),
  enabled: z.boolean(),
  contentVersion: z.number().int().min(1)
});
export type VocabularyDto = z.infer<typeof vocabularyDtoSchema>;

export const vocabularyListResponseSchema = z.object({
  vocabulary: z.array(vocabularyDtoSchema)
});
export type VocabularyListResponse = z.infer<typeof vocabularyListResponseSchema>;

export const reviewResultSchema = z.enum(["REMEMBERED", "FORGOTTEN"]);
export type ReviewResult = z.infer<typeof reviewResultSchema>;

const canonicalUuidSchema = z.string().uuid().transform((value) => value.toLowerCase());

export const reviewRequestSchema = z.object({
  reviewId: canonicalUuidSchema,
  learnerId: canonicalUuidSchema,
  vocabularyId: z.number().int().positive().max(2147483647),
  result: reviewResultSchema,
  expectedRevision: z.number().int().nonnegative().safe()
}).strict();
export type ReviewRequest = z.infer<typeof reviewRequestSchema>;

export const reviewProgressSchema = z.object({
  status: z.enum(["LEARNING", "MASTERED"]),
  consecutiveCorrect: z.number().int().nonnegative().safe(),
  intervalDays: z.number().int().positive().safe(),
  firstLearnedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  lastReviewedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  nextReviewDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  totalCorrect: z.number().int().nonnegative().safe(),
  totalIncorrect: z.number().int().nonnegative().safe(),
  revision: z.number().int().positive().safe()
}).strict();
export type ReviewProgress = z.infer<typeof reviewProgressSchema>;

export const reviewResponseSchema = z.object({
  reviewId: canonicalUuidSchema,
  learnerId: canonicalUuidSchema,
  vocabularyId: z.number().int().positive().max(2147483647),
  result: reviewResultSchema,
  progress: reviewProgressSchema
}).strict();
export type ReviewResponse = z.infer<typeof reviewResponseSchema>;

export const vocabularySeedRecordSchema = z.object({
  id: z.number().int(),
  word: z.string().min(1),
  vietnamese: z.string().min(1),
  enabled: z.boolean(),
  contentVersion: z.number().int().min(1),
  ipa: z.string().nullable().optional(),
  definitionEn: z.string().nullable().optional(),
  exampleEn: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  audioUrl: z.string().nullable().optional(),
  topic: z.string().nullable().optional()
}).strict();
export type VocabularySeedRecord = z.infer<typeof vocabularySeedRecordSchema>;

export const vocabflowStarterDatasetSchema = z.object({
  source: z.literal("VOCABFLOW_STARTER_V1"),
  provenance: z.literal("PROJECT_AUTHORED"),
  status: z.literal("APPROVED"),
  name: z.literal("VocabFlow Starter Vocabulary v1"),
  version: z.literal(1),
  records: z.array(vocabularySeedRecordSchema)
}).strict();
export type VocabflowStarterDataset = z.infer<typeof vocabflowStarterDatasetSchema>;

export function errorEnvelope(code: ErrorCode, message: string, details?: Record<string, unknown>): ErrorEnvelope {
  return details ? { error: { code, message, details } } : { error: { code, message } };
}
