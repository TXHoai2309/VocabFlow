import { z } from "zod";

export const APP_SCHEMA = "vocabflow_app" as const;
export const MIGRATION_SCHEMA = "drizzle" as const;

export const executionContextSchema = z.enum([
  "local-development",
  "ci-test",
  "ci-production-release",
  "vercel-production"
]);
export type ExecutionContext = z.infer<typeof executionContextSchema>;

export const trustedSourceSchema = z.enum(["dev-launcher", "github-actions", "vercel-runtime"]);
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
  | "SCOPE_NOT_FOUND"
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
  sourceMeaningVi: z.string().min(1).optional(),
  shortMeaningVi: z.string().trim().min(1).optional(),
  shortMeaningStatus: z.literal("VERIFIED").optional(),
  definitionEn: z.string().nullable(),
  exampleEn: z.string().nullable(),
  imageUrl: z.string().nullable(),
  audioUrl: z.string().nullable(),
  topic: z.string().nullable(),
  level: vocabularyLevelSchema.nullable(),
  enabled: z.boolean(),
  contentVersion: z.number().int().min(1),
  masterSenseIdentity: z.string().optional(),
  displayForm: z.string().optional(),
  partOfSpeech: z.string().optional(),
  cefr: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  metadataEvidence: z.array(z.object({
    dimension: z.enum(["TOPIC", "SUBTOPIC", "DOMAIN"]),
    code: z.string().min(1),
    label: z.string().min(1).optional(),
    parentCode: z.string().min(1).optional(),
    status: z.literal("INFERRED_REVIEWABLE"),
    confidence: z.literal("HIGH"),
    evidenceType: z.string().min(1),
    matchedEvidence: z.string().min(1)
  }).strict()).optional(),
  examples: z.array(z.unknown()).optional(),
  contentHash: z.string().regex(/^[0-9a-f]{64}$/).optional(),
  contentReviewStatus: z.literal("PASS").optional(),
  editorialStatus: z.literal("DRAFT").optional(),
  rightsStatus: z.literal("UNKNOWN_REVIEW_REQUIRED").optional(),
  imageMediaStatus: z.enum(["ACCEPTED_MAPPING", "PROPOSED", "AMBIGUOUS"]).optional(),
  developmentMedia: z.object({
    images: z.array(z.object({
      url: z.string().min(1), mediaSha256: z.string().regex(/^[0-9a-f]{64}$/), mimeType: z.string().min(1),
      sourceNoteIdentity: z.string().min(1), reviewStatus: z.enum(["ACCEPTED_MAPPING", "PROPOSED", "AMBIGUOUS"]),
      rightsStatus: z.literal("UNKNOWN_REVIEW_REQUIRED"), mappingEvidence: z.string().optional(),
      targetProposalKey: z.string().min(1).optional(), targetContentSha256: z.string().regex(/^[0-9a-f]{64}$/).optional()
    }).passthrough()).optional(),
    wordAudio: z.array(z.object({
      url: z.string().min(1), mediaSha256: z.string().regex(/^[0-9a-f]{64}$/), mimeType: z.string().min(1),
      sourceNoteIdentity: z.string().min(1), reviewStatus: z.enum(["ACCEPTED_MAPPING", "PROPOSED", "AMBIGUOUS"]),
      rightsStatus: z.literal("UNKNOWN_REVIEW_REQUIRED"), pronunciationEvidence: z.string().optional(),
      pronunciation: z.string().optional(), mappingEvidence: z.string().optional()
    }).passthrough()).optional(),
    exampleAudio: z.array(z.object({
      url: z.string().min(1), mediaSha256: z.string().regex(/^[0-9a-f]{64}$/), mimeType: z.string().min(1),
      sourceNoteIdentity: z.string().min(1), reviewStatus: z.enum(["ACCEPTED_MAPPING", "PROPOSED", "AMBIGUOUS"]),
      rightsStatus: z.literal("UNKNOWN_REVIEW_REQUIRED"), exampleKey: z.string().optional()
    }).passthrough()).optional()
  }).passthrough().optional()
});
export type VocabularyDto = z.infer<typeof vocabularyDtoSchema>;

export type VietnameseMeaningPresentationInput = {
  vietnamese: string;
  shortMeaningVi?: string | null;
  shortMeaningStatus?: "VERIFIED";
};

export type VietnameseMeaningPresentation = {
  primary: string;
  primaryLabel: "Nghĩa tiếng Việt" | "Giải thích nghĩa";
  explanation: string | null;
  hasVerifiedShortMeaning: boolean;
};

/** Only use a short gloss explicitly verified against the current Sense hash. */
export function presentVietnameseMeaning(value: VietnameseMeaningPresentationInput): VietnameseMeaningPresentation {
  const explanation = value.vietnamese.trim();
  const shortMeaning = value.shortMeaningStatus === "VERIFIED" ? value.shortMeaningVi?.trim() : undefined;
  const hasVerifiedShortMeaning = Boolean(shortMeaning);
  const sameText = Boolean(shortMeaning && explanation && shortMeaning.localeCompare(explanation, "vi", { sensitivity: "accent" }) === 0);
  return {
    primary: hasVerifiedShortMeaning ? shortMeaning! : explanation,
    primaryLabel: hasVerifiedShortMeaning ? "Nghĩa tiếng Việt" : "Giải thích nghĩa",
    explanation: hasVerifiedShortMeaning && !sameText ? explanation : null,
    hasVerifiedShortMeaning
  };
}

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
  enabled: z.boolean(),
  studyScopeAvailable: z.boolean().optional(),
  parentTopicId: z.number().int().positive().nullable().optional()
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
export const DAILY_LEARNING_GOAL_DEFAULT = 10 as const;
export const DAILY_LEARNING_GOAL_MIN = 1 as const;
export const DAILY_LEARNING_GOAL_MAX = 100 as const;
export const DAILY_NEW_WORD_GOAL_DEFAULT = 10 as const;
export const DAILY_REVIEW_WORD_GOAL_DEFAULT = 20 as const;
export const DAILY_WORD_GOAL_MIN = 1 as const;
export const DAILY_WORD_GOAL_MAX = 100 as const;

export const FLASHCARD_DISPLAY_MODE = {
  SELF_RECALL: "SELF_RECALL",
  EASY_INTRO: "EASY_INTRO",
  DETAILED: "DETAILED"
} as const;
export const flashcardDisplayModeSchema = z.enum([
  FLASHCARD_DISPLAY_MODE.SELF_RECALL,
  FLASHCARD_DISPLAY_MODE.EASY_INTRO,
  FLASHCARD_DISPLAY_MODE.DETAILED
]);
export type FlashcardDisplayMode = z.infer<typeof flashcardDisplayModeSchema>;

export const learnerSettingsResponseSchema = z.object({
  learnerId: canonicalUuidSchema,
  dailyNewWordLimit: z.number().int().min(DAILY_NEW_WORD_LIMIT_MIN).max(DAILY_NEW_WORD_LIMIT_MAX).safe(),
  dailyNewWordGoal: z.number().int().min(DAILY_WORD_GOAL_MIN).max(DAILY_WORD_GOAL_MAX).safe(),
  dailyReviewWordGoal: z.number().int().min(DAILY_WORD_GOAL_MIN).max(DAILY_WORD_GOAL_MAX).safe(),
  flashcardDisplayMode: flashcardDisplayModeSchema.optional()
}).strict();
export type LearnerSettingsResponse = z.infer<typeof learnerSettingsResponseSchema>;

export const updateLearnerSettingsRequestSchema = z.object({
  dailyNewWordLimit: z.number().int().min(DAILY_NEW_WORD_LIMIT_MIN).max(DAILY_NEW_WORD_LIMIT_MAX).safe().optional(),
  dailyNewWordGoal: z.number().int().min(DAILY_WORD_GOAL_MIN).max(DAILY_WORD_GOAL_MAX).safe().optional(),
  dailyReviewWordGoal: z.number().int().min(DAILY_WORD_GOAL_MIN).max(DAILY_WORD_GOAL_MAX).safe().optional(),
  flashcardDisplayMode: flashcardDisplayModeSchema.optional()
}).strict().refine((value) =>
  value.dailyNewWordLimit !== undefined
  || value.dailyNewWordGoal !== undefined
  || value.dailyReviewWordGoal !== undefined
  || value.flashcardDisplayMode !== undefined
);
export type UpdateLearnerSettingsRequest = z.infer<typeof updateLearnerSettingsRequestSchema>;

export const learningSetTopicSchema = z.object({
  id: z.number().int().positive(),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(1)
}).strict();
export type LearningSetTopic = z.infer<typeof learningSetTopicSchema>;

export const learningSetSummarySchema = z.object({
  id: z.number().int().positive(),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(1),
  description: z.string().min(1),
  grade: vocabularyLevelSchema.nullable(),
  enabled: z.boolean(),
  sortOrder: z.number().int().nonnegative(),
  vocabularyCount: z.number().int().nonnegative().safe(),
  topics: z.array(learningSetTopicSchema).optional(),
  studyScopeAvailable: z.boolean().optional(),
  classificationStatus: z.enum(["SOURCE_VERIFIED", "INFERRED_REVIEWABLE"]).optional()
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

/** Compact, server-paged row for the Vocabulary catalog. Full content stays on the detail contract. */
export const vocabularyBrowsePageSizeSchema = z.union([z.literal(20), z.literal(30), z.literal(50)]);
export type VocabularyBrowsePageSize = z.infer<typeof vocabularyBrowsePageSizeSchema>;

export const learnerVocabularyBrowseQuerySchema = z.object({
  page: z.number().int().min(1).max(1_000_000).default(1),
  pageSize: vocabularyBrowsePageSizeSchema.default(30),
  q: z.string().trim().max(100).optional(),
  level: vocabularyLevelSchema.optional(),
  cefr: z.string().regex(/^[ABC][12]$/).optional(),
  topic: z.string().trim().min(1).max(100).optional(),
  topicId: z.number().int().positive().max(2147483647).optional()
}).strict();
export type LearnerVocabularyBrowseQuery = z.infer<typeof learnerVocabularyBrowseQuerySchema>;

const vocabularyDevelopmentListMediaSchema = vocabularyDtoSchema.shape.developmentMedia.unwrap()
  .pick({ images: true, wordAudio: true });

export const learnerVocabularyBrowseItemSchema = z.object({
  isSaved: z.boolean().optional(),
  id: z.number().int(),
  word: z.string().min(1),
  ipa: z.string().nullable(),
  vietnamese: z.string().min(1),
  sourceMeaningVi: z.string().min(1).optional(),
  shortMeaningVi: z.string().trim().min(1).optional(),
  shortMeaningStatus: z.literal("VERIFIED").optional(),
  imageUrl: z.string().nullable(),
  audioUrl: z.string().nullable(),
  topic: z.string().nullable(),
  level: vocabularyLevelSchema.nullable(),
  enabled: z.boolean(),
  contentVersion: z.number().int().min(1),
  status: learnerVocabularyStatusSchema,
  nextReviewDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  masterSenseIdentity: z.string().optional(),
  displayForm: z.string().optional(),
  partOfSpeech: z.string().optional(),
  cefr: z.string().nullable().optional(),
  rightsStatus: z.literal("UNKNOWN_REVIEW_REQUIRED").optional(),
  contentHash: z.string().regex(/^[0-9a-f]{64}$/).optional(),
  contentReviewStatus: z.literal("PASS").optional(),
  editorialStatus: z.literal("DRAFT").optional(),
  tags: z.array(z.string()).optional(),
  imageMediaStatus: z.enum(["ACCEPTED_MAPPING", "PROPOSED", "AMBIGUOUS"]).optional(),
  developmentMedia: vocabularyDevelopmentListMediaSchema.optional()
}).strict();
export type LearnerVocabularyBrowseItem = z.infer<typeof learnerVocabularyBrowseItemSchema>;

export const learnerVocabularyBrowseResponseSchema = z.object({
  vocabulary: z.array(learnerVocabularyBrowseItemSchema),
  total: z.number().int().nonnegative().safe(),
  page: z.number().int().positive(),
  pageSize: vocabularyBrowsePageSizeSchema,
  totalPages: z.number().int().positive(),
  filters: z.object({
    cefrOptions: z.array(z.string()),
    topicOptions: z.array(z.string()),
    topicChoices: z.array(topicDtoSchema.pick({ id: true, name: true, slug: true, parentTopicId: true })).optional()
  }).strict()
}).strict();
export type LearnerVocabularyBrowseResponse = z.infer<typeof learnerVocabularyBrowseResponseSchema>;

export const globalSearchVocabularyResultSchema = z.object({
  type: z.literal("VOCABULARY"),
  id: z.number().int().positive(),
  title: z.string().min(1),
  subtitle: z.string().min(1),
  subtitleLabel: z.enum(["Nghĩa tiếng Việt", "Giải thích nghĩa"]),
  imageUrl: z.string().nullable(),
  topic: z.string().nullable(),
  level: vocabularyLevelSchema.nullable()
}).strict();
export const globalSearchTopicResultSchema = z.object({
  type: z.literal("TOPIC"),
  id: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string().min(1)
}).strict();
export const globalSearchLearningSetResultSchema = z.object({
  type: z.literal("LEARNING_SET"),
  id: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string().min(1),
  vocabularyCount: z.number().int().nonnegative().safe(),
  grade: vocabularyLevelSchema.nullable()
}).strict();
export const globalSearchResultSchema = z.discriminatedUnion("type", [
  globalSearchVocabularyResultSchema,
  globalSearchTopicResultSchema,
  globalSearchLearningSetResultSchema
]);
export type GlobalSearchResult = z.infer<typeof globalSearchResultSchema>;
export const globalSearchResponseSchema = z.object({
  query: z.string().max(100),
  vocabulary: z.array(globalSearchVocabularyResultSchema).max(10),
  topics: z.array(globalSearchTopicResultSchema).max(10),
  learningSets: z.array(globalSearchLearningSetResultSchema).max(10)
}).strict();
export type GlobalSearchResponse = z.infer<typeof globalSearchResponseSchema>;

export const learnerSavedVocabularyDtoSchema = z.object({
  vocabulary: learnerVocabularyDtoSchema,
  savedAt: z.string().datetime()
}).strict();
export type LearnerSavedVocabularyDto = z.infer<typeof learnerSavedVocabularyDtoSchema>;

export const learnerSavedVocabularyResponseSchema = z.object({
  savedVocabulary: z.array(learnerSavedVocabularyDtoSchema)
}).strict();
export type LearnerSavedVocabularyResponse = z.infer<typeof learnerSavedVocabularyResponseSchema>;

export const learnerSavedVocabularyMutationResponseSchema = z.object({
  learnerId: canonicalUuidSchema,
  vocabularyId: z.number().int().positive().max(2147483647),
  saved: z.boolean(),
  savedAt: z.string().datetime().nullable()
}).strict();
export type LearnerSavedVocabularyMutationResponse = z.infer<typeof learnerSavedVocabularyMutationResponseSchema>;

export const progressSummaryResponseSchema = z.object({
  learnerId: canonicalUuidSchema,
  newCount: z.number().int().nonnegative().safe(),
  learningCount: z.number().int().nonnegative().safe(),
  masteredCount: z.number().int().nonnegative().safe(),
  dueCount: z.number().int().nonnegative().safe(),
  learnedCount: z.number().int().nonnegative().safe(),
  progressByLevel: z.array(z.object({
    level: vocabularyLevelSchema.nullable(),
    total: z.number().int().nonnegative().safe(),
    learnedCount: z.number().int().nonnegative().safe(),
    masteredCount: z.number().int().nonnegative().safe()
  }).strict()).default([])
}).strict();
export type ProgressSummaryResponse = z.infer<typeof progressSummaryResponseSchema>;

const localDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const progressHistoryDaySchema = z.object({
  date: localDateSchema,
  reviews: z.number().int().nonnegative().safe(),
  uniqueWords: z.number().int().nonnegative().safe(),
  remembered: z.number().int().nonnegative().safe(),
  forgotten: z.number().int().nonnegative().safe(),
  newLearned: z.number().int().nonnegative().safe()
}).strict();
export type ProgressHistoryDay = z.infer<typeof progressHistoryDaySchema>;

export const progressHistoryResponseSchema = z.object({
  learnerId: canonicalUuidSchema,
  timezone: z.string().min(1),
  from: localDateSchema,
  to: localDateSchema,
  days: z.array(progressHistoryDaySchema)
}).strict();
export type ProgressHistoryResponse = z.infer<typeof progressHistoryResponseSchema>;

export const topicProgressItemSchema = z.object({
  topicId: z.number().int().positive(),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(1),
  total: z.number().int().nonnegative().safe(),
  newCount: z.number().int().nonnegative().safe(),
  learningCount: z.number().int().nonnegative().safe(),
  masteredCount: z.number().int().nonnegative().safe(),
  dueCount: z.number().int().nonnegative().safe()
}).strict();
export type TopicProgressItem = z.infer<typeof topicProgressItemSchema>;

export const topicProgressResponseSchema = z.object({
  learnerId: canonicalUuidSchema,
  localDate: localDateSchema,
  topics: z.array(topicProgressItemSchema)
}).strict();
export type TopicProgressResponse = z.infer<typeof topicProgressResponseSchema>;

export const continueLearningCandidateSchema = z.object({
  scope: z.enum(["TOPIC", "LEARNING_SET", "SAVED"]),
  scopeId: z.number().int().positive().safe().nullable(),
  title: z.string().min(1).max(200),
  totalCount: z.number().int().positive().safe(),
  learnedCount: z.number().int().positive().safe(),
  progressPercent: z.number().int().min(0).max(100).safe(),
  lastActivityAt: z.string().datetime().nullable()
}).strict().superRefine((candidate, context) => {
  if (candidate.learnedCount >= candidate.totalCount) {
    context.addIssue({ code: "custom", message: "Continue candidates must be partially learned." });
  }
  if ((candidate.scope === "SAVED") !== (candidate.scopeId === null)) {
    context.addIssue({ code: "custom", message: "Saved candidates have no collection id." });
  }
  if (candidate.progressPercent !== Math.round((candidate.learnedCount / candidate.totalCount) * 100)) {
    context.addIssue({ code: "custom", message: "Continue candidate progress must match its counts." });
  }
});
export type ContinueLearningCandidate = z.infer<typeof continueLearningCandidateSchema>;

export const continueLearningSummaryResponseSchema = z.object({
  learnerId: canonicalUuidSchema,
  candidate: continueLearningCandidateSchema.nullable()
}).strict();
export type ContinueLearningSummaryResponse = z.infer<typeof continueLearningSummaryResponseSchema>;

export const dailyGoalProgressSchema = z.object({
  goal: z.number().int().min(DAILY_WORD_GOAL_MIN).max(DAILY_WORD_GOAL_MAX).safe(),
  completed: z.number().int().nonnegative().safe(),
  remaining: z.number().int().nonnegative().safe(),
  percent: z.number().int().min(0).max(100).safe()
}).strict();
export type DailyGoalProgress = z.infer<typeof dailyGoalProgressSchema>;

export const dailyGoalSummarySchema = z.object({
  newWords: dailyGoalProgressSchema,
  reviews: dailyGoalProgressSchema,
  overallPercent: z.number().int().min(0).max(100).safe(),
  completed: z.boolean()
}).strict();
export type DailyGoalSummary = z.infer<typeof dailyGoalSummarySchema>;

export const streakSummarySchema = z.object({
  currentStreak: z.number().int().nonnegative().safe(),
  longestStreak: z.number().int().nonnegative().safe(),
  todayActive: z.boolean()
}).strict();
export type StreakSummary = z.infer<typeof streakSummarySchema>;

export const activitySummaryResponseSchema = z.object({
  learnerId: canonicalUuidSchema,
  localDate: localDateSchema,
  dailyGoal: dailyGoalSummarySchema,
  streak: streakSummarySchema
}).strict();
export type ActivitySummaryResponse = z.infer<typeof activitySummaryResponseSchema>;

export const achievementCodeSchema = z.enum([
  "FIRST_REVIEW",
  "TEN_WORDS_LEARNED",
  "FIFTY_WORDS_LEARNED",
  "SEVEN_DAY_STREAK",
  "DAILY_GOAL_COMPLETED"
]);
export type AchievementCode = z.infer<typeof achievementCodeSchema>;

export const learnerAchievementSchema = z.object({
  code: achievementCodeSchema,
  name: z.string().min(1),
  description: z.string().min(1),
  unlockedAt: z.string().datetime().nullable()
}).strict();
export type LearnerAchievement = z.infer<typeof learnerAchievementSchema>;

export const gamificationResponseSchema = z.object({
  learnerId: canonicalUuidSchema,
  xp: z.object({
    total: z.number().int().nonnegative().safe(),
    level: z.number().int().positive().safe(),
    xpIntoLevel: z.number().int().nonnegative().safe(),
    xpPerLevel: z.literal(100),
    xpToNextLevel: z.number().int().positive().max(100).safe()
  }).strict(),
  achievements: z.array(learnerAchievementSchema)
}).strict();
export type GamificationResponse = z.infer<typeof gamificationResponseSchema>;

export const resetLearnerProgressResponseSchema = z.object({
  learnerId: canonicalUuidSchema,
  deletedProgressCount: z.number().int().nonnegative().safe()
}).strict();
export type ResetLearnerProgressResponse = z.infer<typeof resetLearnerProgressResponseSchema>;

export const reviewQueueItemSchema = z.object({
  vocabulary: vocabularyDtoSchema,
  queueType: z.enum(["DUE", "NEW", "VOLUNTARY"]),
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
  dailyNewRemaining: z.number().int().nonnegative().safe().optional(),
  queue: z.array(reviewQueueItemSchema)
}).strict();
export type ReviewQueueResponse = z.infer<typeof reviewQueueResponseSchema>;

export const weakWordsStatusSchema = z.enum(["weak", "learning", "stable"]);
export type WeakWordsStatus = z.infer<typeof weakWordsStatusSchema>;

export const weakWordsClassificationSchema = z.enum(["WEAK", "LEARNING", "STABLE"]);
export type WeakWordsClassification = z.infer<typeof weakWordsClassificationSchema>;
export const weakWordsDueStatusSchema = z.enum(["OVERDUE", "DUE_TODAY", "UPCOMING", "NOT_SCHEDULED"]);
export const weakWordsItemSchema = z.object({
  vocabulary: vocabularyDtoSchema,
  learningState: z.enum(["LEARNING", "MASTERED"]),
  weaknessStatus: weakWordsClassificationSchema,
  recentAccuracy: z.number().int().min(0).max(100).nullable(),
  reviewCount: z.number().int().nonnegative().safe(),
  rememberedCount: z.number().int().nonnegative().safe(),
  forgottenCount: z.number().int().nonnegative().safe(),
  nextReviewDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  dueStatus: weakWordsDueStatusSchema,
  daysUntilDue: z.number().int().safe().nullable(),
  expectedRevision: z.number().int().nonnegative().safe()
}).strict();
export type WeakWordsItem = z.infer<typeof weakWordsItemSchema>;

export const weakWordsResponseSchema = z.object({
  learnerId: canonicalUuidSchema,
  reviewDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  summary: z.object({
    weakCount: z.number().int().nonnegative().safe(),
    dueCount: z.number().int().nonnegative().safe(),
    recentAccuracy: z.number().int().min(0).max(100).nullable(),
    recentReviewCount: z.number().int().nonnegative().safe()
  }).strict(),
  items: z.array(weakWordsItemSchema),
  pagination: z.object({
    page: z.number().int().positive().safe(),
    pageSize: z.number().int().positive().max(50).safe(),
    totalItems: z.number().int().nonnegative().safe(),
    totalPages: z.number().int().nonnegative().safe()
  }).strict()
}).strict();
export type WeakWordsResponse = z.infer<typeof weakWordsResponseSchema>;

export const reviewResultSchema = z.enum(["REMEMBERED", "FORGOTTEN"]);
export type ReviewResult = z.infer<typeof reviewResultSchema>;

export const exerciseTypeSchema = z.enum([
  "MULTIPLE_CHOICE_MEANING",
  "LISTENING_CHOICE",
  "IMAGE_TO_WORD",
  "TYPE_WORD"
]);
export type ExerciseType = z.infer<typeof exerciseTypeSchema>;

// This is submission evidence, never a client assertion of correctness.  The
// server derives correctness from the canonical target vocabulary.
export const exerciseSubmissionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("MULTIPLE_CHOICE_MEANING"),
    answer: z.string().min(1).max(1000)
  }).strict(),
  z.object({
    type: z.literal("LISTENING_CHOICE"),
    selectedVocabularyId: z.number().int().positive().max(2147483647)
  }).strict(),
  z.object({
    type: z.literal("IMAGE_TO_WORD"),
    selectedVocabularyId: z.number().int().positive().max(2147483647)
  }).strict(),
  z.object({
    type: z.literal("TYPE_WORD"),
    answer: z.string().min(1).max(1000)
  }).strict()
]);
export type ExerciseSubmission = z.infer<typeof exerciseSubmissionSchema>;

export const reviewRequestSchema = z.object({
  reviewId: canonicalUuidSchema,
  learnerId: canonicalUuidSchema,
  vocabularyId: z.number().int().positive().max(2147483647),
  result: reviewResultSchema,
  expectedRevision: z.number().int().nonnegative().safe(),
  exerciseSubmission: exerciseSubmissionSchema.optional()
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

export * from "./study-scope.js";

/** Public enabled content; no account, household or progress fields. */
export const publicLearningCatalogSchema = z.object({
  vocabulary: z.array(vocabularyDtoSchema),
  learningSets: z.array(learningSetSummarySchema.extend({ vocabularyIds: z.array(z.number().int().positive()) }).strict()),
  topics: z.array(topicDtoSchema.extend({ vocabularyIds: z.array(z.number().int().positive()) }).strict())
}).strict();
export type PublicLearningCatalog = z.infer<typeof publicLearningCatalogSchema>;

/** Scheduling/counting metadata only. Full learning content is always bounded. */
export const publicLearningIndexSchema = publicLearningCatalogSchema.extend({
  vocabulary: z.array(z.object({ id: z.number().int().positive(), level: vocabularyLevelSchema.nullable(), cefr: z.string().nullable().optional() }).strict())
}).strict();
export type PublicLearningIndex = z.infer<typeof publicLearningIndexSchema>;

export const PUBLIC_VOCABULARY_BATCH_LIMIT = 60;
export const publicVocabularyBrowseQuerySchema = learnerVocabularyBrowseQuerySchema.extend({
  learningSetId: z.number().int().positive().max(2147483647).optional(),
  topicId: z.number().int().positive().max(2147483647).optional()
}).refine((query) => !(query.learningSetId && query.topicId));
export type PublicVocabularyBrowseQuery = z.infer<typeof publicVocabularyBrowseQuerySchema>;
export const publicVocabularyMatchResponseSchema = z.object({ ids: z.array(z.number().int().positive()) }).strict();
