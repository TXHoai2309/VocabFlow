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
  | "TOPIC_NOT_FOUND"
  | "LEARNING_SET_NOT_FOUND"
  | "VOCABULARY_NOT_FOUND"
  | "IDEMPOTENCY_CONFLICT"
  | "STALE_REVISION"
  | "DAILY_NEW_LIMIT_REACHED"
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

export const vocabularyLevelSchema = z.enum([
  "GRADE_1",
  "GRADE_2",
  "GRADE_3",
  "GRADE_4",
  "GRADE_5",
  "GENERAL"
]);
export type VocabularyLevel = z.infer<typeof vocabularyLevelSchema>;

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
  level: vocabularyLevelSchema.nullable(),
  enabled: z.boolean(),
  contentVersion: z.number().int().min(1)
});
export type VocabularyDto = z.infer<typeof vocabularyDtoSchema>;

export const vocabularyListResponseSchema = z.object({
  vocabulary: z.array(vocabularyDtoSchema)
});
export type VocabularyListResponse = z.infer<typeof vocabularyListResponseSchema>;

export const topicDtoSchema = z.object({
  id: z.number().int().positive(),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(1),
  description: z.string().min(1),
  sortOrder: z.number().int().nonnegative(),
  enabled: z.boolean()
}).strict();
export type TopicDto = z.infer<typeof topicDtoSchema>;

export const topicListResponseSchema = z.object({
  topics: z.array(topicDtoSchema)
}).strict();
export type TopicListResponse = z.infer<typeof topicListResponseSchema>;

const canonicalUuidSchema = z.string().uuid().transform((value) => value.toLowerCase());

export const DAILY_NEW_WORD_LIMIT_DEFAULT = 10 as const;
export const DAILY_NEW_WORD_LIMIT_MIN = 0 as const;
export const DAILY_NEW_WORD_LIMIT_MAX = 100 as const;

export const learnerSettingsResponseSchema = z.object({
  learnerId: canonicalUuidSchema,
  dailyNewWordLimit: z.number().int().min(DAILY_NEW_WORD_LIMIT_MIN).max(DAILY_NEW_WORD_LIMIT_MAX).safe()
}).strict();
export type LearnerSettingsResponse = z.infer<typeof learnerSettingsResponseSchema>;

export const updateLearnerSettingsRequestSchema = z.object({
  dailyNewWordLimit: z.number().int().min(DAILY_NEW_WORD_LIMIT_MIN).max(DAILY_NEW_WORD_LIMIT_MAX).safe()
}).strict();
export type UpdateLearnerSettingsRequest = z.infer<typeof updateLearnerSettingsRequestSchema>;

export const learningSetSummarySchema = z.object({
  id: z.number().int().positive(),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(1),
  description: z.string().min(1),
  grade: vocabularyLevelSchema.nullable(),
  enabled: z.boolean(),
  sortOrder: z.number().int().nonnegative(),
  vocabularyCount: z.number().int().nonnegative().safe()
}).strict();
export type LearningSetSummary = z.infer<typeof learningSetSummarySchema>;

export const learningSetItemDtoSchema = z.object({
  sortOrder: z.number().int().nonnegative(),
  vocabulary: vocabularyDtoSchema
}).strict();
export type LearningSetItemDto = z.infer<typeof learningSetItemDtoSchema>;

export const learningSetDetailSchema = learningSetSummarySchema.extend({
  items: z.array(learningSetItemDtoSchema)
}).strict();
export type LearningSetDetail = z.infer<typeof learningSetDetailSchema>;

export const learningSetListResponseSchema = z.object({
  learningSets: z.array(learningSetSummarySchema)
}).strict();
export type LearningSetListResponse = z.infer<typeof learningSetListResponseSchema>;

export const learningSetDetailResponseSchema = z.object({
  learningSet: learningSetDetailSchema
}).strict();
export type LearningSetDetailResponse = z.infer<typeof learningSetDetailResponseSchema>;

export const learnerLearningSetDtoSchema = z.object({
  learningSet: learningSetSummarySchema,
  active: z.boolean()
}).strict();
export type LearnerLearningSetDto = z.infer<typeof learnerLearningSetDtoSchema>;

export const learnerLearningSetListResponseSchema = z.object({
  learningSets: z.array(learnerLearningSetDtoSchema)
}).strict();
export type LearnerLearningSetListResponse = z.infer<typeof learnerLearningSetListResponseSchema>;

export const learnerLearningSetMutationResponseSchema = z.object({
  learnerId: canonicalUuidSchema,
  learningSetId: z.number().int().positive(),
  active: z.boolean()
}).strict();
export type LearnerLearningSetMutationResponse = z.infer<typeof learnerLearningSetMutationResponseSchema>;

export const learnerVocabularyStatusSchema = z.enum(["NEW", "LEARNING", "MASTERED"]);
export type LearnerVocabularyStatus = z.infer<typeof learnerVocabularyStatusSchema>;

export const learnerVocabularyDtoSchema = vocabularyDtoSchema.extend({
  status: learnerVocabularyStatusSchema,
  nextReviewDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable()
}).strict();
export type LearnerVocabularyDto = z.infer<typeof learnerVocabularyDtoSchema>;

export const learnerVocabularyListResponseSchema = z.object({
  vocabulary: z.array(learnerVocabularyDtoSchema)
});
export type LearnerVocabularyListResponse = z.infer<typeof learnerVocabularyListResponseSchema>;

export const progressSummaryResponseSchema = z.object({
  learnerId: canonicalUuidSchema,
  newCount: z.number().int().nonnegative().safe(),
  learningCount: z.number().int().nonnegative().safe(),
  masteredCount: z.number().int().nonnegative().safe(),
  dueCount: z.number().int().nonnegative().safe(),
  learnedCount: z.number().int().nonnegative().safe()
}).strict();
export type ProgressSummaryResponse = z.infer<typeof progressSummaryResponseSchema>;

export const resetLearnerProgressResponseSchema = z.object({
  learnerId: canonicalUuidSchema,
  deletedProgressCount: z.number().int().nonnegative().safe()
}).strict();
export type ResetLearnerProgressResponse = z.infer<typeof resetLearnerProgressResponseSchema>;

export const reviewQueueItemSchema = z.object({
  vocabulary: vocabularyDtoSchema,
  queueType: z.enum(["DUE", "NEW"]),
  status: z.enum(["NEW", "LEARNING", "MASTERED"]),
  nextReviewDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  expectedRevision: z.number().int().nonnegative().safe()
}).strict();
export type ReviewQueueItem = z.infer<typeof reviewQueueItemSchema>;

export const reviewQueueResponseSchema = z.object({
  learnerId: canonicalUuidSchema,
  reviewDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueCount: z.number().int().nonnegative().safe(),
  newCount: z.number().int().nonnegative().safe(),
  queue: z.array(reviewQueueItemSchema)
}).strict();
export type ReviewQueueResponse = z.infer<typeof reviewQueueResponseSchema>;

export const reviewResultSchema = z.enum(["REMEMBERED", "FORGOTTEN"]);
export type ReviewResult = z.infer<typeof reviewResultSchema>;

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
  topic: z.string().nullable().optional(),
  level: vocabularyLevelSchema.nullable().optional()
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
