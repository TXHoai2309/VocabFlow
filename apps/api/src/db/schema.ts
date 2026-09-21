import {
  boolean,
  check,
  date,
  index,
  integer,
  bigint,
  jsonb,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { APP_SCHEMA } from "@vocabflow/contracts";

export const vocabflowApp = pgSchema(APP_SCHEMA);
export const householdRole = vocabflowApp.enum("household_role", ["OWNER", "PARENT"]);
export const learningStatus = vocabflowApp.enum("learning_status", ["NEW", "LEARNING", "MASTERED"]);
export const reviewResult = vocabflowApp.enum("review_result", ["REMEMBERED", "FORGOTTEN"]);
export const vocabularyLevel = vocabflowApp.enum("vocabulary_level", [
  "GRADE_1",
  "GRADE_2",
  "GRADE_3",
  "GRADE_4",
  "GRADE_5",
  "GENERAL"
]);

// Better Auth owns these tables. BATCH 0 does not introduce competing auth tables.
export const user = vocabflowApp.table("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const session = vocabflowApp.table("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" })
});

export const account = vocabflowApp.table("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const verification = vocabflowApp.table("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const households = vocabflowApp.table("households", {
  id: uuid("id").primaryKey(),
  primaryOwnerUserId: text("primary_owner_user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "no action" }),
  name: text("name").notNull(),
  timezone: text("timezone").notNull().default("Asia/Ho_Chi_Minh"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const householdMembers = vocabflowApp.table("household_members", {
  householdId: uuid("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "no action" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "no action" }),
  role: householdRole("role").notNull().default("OWNER"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  unique("household_members_household_user_unique").on(table.householdId, table.userId)
]);

export const learnerProfiles = vocabflowApp.table("learner_profiles", {
  id: uuid("id").primaryKey(),
  householdId: uuid("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "restrict" }),
  displayName: text("display_name").notNull(),
  avatarKey: text("avatar_key"),
  dailyNewWordLimit: integer("daily_new_word_limit").notNull().default(10),
  dailyLearningGoal: integer("daily_learning_goal").notNull().default(10),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  check("learner_profiles_daily_new_word_limit_check", sql`${table.dailyNewWordLimit} >= 0 AND ${table.dailyNewWordLimit} <= 100`),
  check("learner_profiles_daily_learning_goal_check", sql`${table.dailyLearningGoal} >= 1 AND ${table.dailyLearningGoal} <= 100`),
  index("learner_profiles_household_enabled_created_id_idx").on(
    table.householdId,
    table.enabled,
    table.createdAt,
    table.id
  )
]);

export const vocabularies = vocabflowApp.table("vocabularies", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  word: text("word").notNull(),
  ipa: text("ipa"),
  vietnamese: text("vietnamese").notNull(),
  definitionEn: text("definition_en"),
  exampleEn: text("example_en"),
  imageUrl: text("image_url"),
  audioUrl: text("audio_url"),
  topic: text("topic"),
  level: vocabularyLevel("level"),
  enabled: boolean("enabled").notNull().default(false),
  contentVersion: integer("content_version").notNull().default(1),
  sourceDataset: text("source_dataset"),
  sourceRecordId: integer("source_record_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  check("vocabularies_content_version_check", sql`${table.contentVersion} >= 1`),
  unique("vocabularies_source_identity_unique").on(table.sourceDataset, table.sourceRecordId)
]);

export const topics = vocabflowApp.table("topics", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  sortOrder: integer("sort_order").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  sourceTopic: text("source_topic").unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  check("topics_sort_order_check", sql`${table.sortOrder} >= 0`),
  index("topics_enabled_sort_order_id_idx").on(table.enabled, table.sortOrder, table.id)
]);

export const learningSets = vocabflowApp.table("learning_sets", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  grade: vocabularyLevel("grade"),
  enabled: boolean("enabled").notNull().default(true),
  sortOrder: integer("sort_order").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  check("learning_sets_sort_order_check", sql`${table.sortOrder} >= 0`),
  index("learning_sets_enabled_sort_order_id_idx").on(table.enabled, table.sortOrder, table.id)
]);

export const vocabularyTopics = vocabflowApp.table("vocabulary_topics", {
  vocabularyId: integer("vocabulary_id")
    .notNull()
    .references(() => vocabularies.id, { onDelete: "cascade" }),
  topicId: integer("topic_id")
    .notNull()
    .references(() => topics.id, { onDelete: "cascade" })
}, (table) => [
  primaryKey({ columns: [table.vocabularyId, table.topicId], name: "vocabulary_topics_vocabulary_topic_pk" }),
  index("vocabulary_topics_topic_vocabulary_idx").on(table.topicId, table.vocabularyId)
]);

export const learningSetItems = vocabflowApp.table("learning_set_items", {
  learningSetId: integer("learning_set_id")
    .notNull()
    .references(() => learningSets.id, { onDelete: "cascade" }),
  vocabularyId: integer("vocabulary_id")
    .notNull()
    .references(() => vocabularies.id, { onDelete: "no action" }),
  sortOrder: integer("sort_order").notNull()
}, (table) => [
  primaryKey({ columns: [table.learningSetId, table.vocabularyId], name: "learning_set_items_set_vocabulary_pk" }),
  check("learning_set_items_sort_order_check", sql`${table.sortOrder} >= 0`),
  index("learning_set_items_set_sort_vocabulary_idx").on(table.learningSetId, table.sortOrder, table.vocabularyId),
  index("learning_set_items_vocabulary_set_idx").on(table.vocabularyId, table.learningSetId)
]);

export const learnerLearningSets = vocabflowApp.table("learner_learning_sets", {
  learnerId: uuid("learner_id")
    .notNull()
    .references(() => learnerProfiles.id, { onDelete: "no action" }),
  learningSetId: integer("learning_set_id")
    .notNull()
    .references(() => learningSets.id, { onDelete: "no action" }),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  primaryKey({ columns: [table.learnerId, table.learningSetId], name: "learner_learning_sets_learner_set_pk" }),
  index("learner_learning_sets_learner_active_set_idx").on(table.learnerId, table.active, table.learningSetId)
]);

export const learnerProgress = vocabflowApp.table("learner_progress", {
  learnerId: uuid("learner_id")
    .notNull()
    .references(() => learnerProfiles.id, { onDelete: "no action" }),
  vocabularyId: integer("vocabulary_id")
    .notNull()
    .references(() => vocabularies.id, { onDelete: "no action" }),
  status: learningStatus("status").notNull().default("NEW"),
  consecutiveCorrect: bigint("consecutive_correct", { mode: "bigint" }).notNull().default(sql`0`),
  intervalDays: bigint("interval_days", { mode: "bigint" }).notNull().default(sql`0`),
  firstLearnedDate: date("first_learned_date"),
  lastReviewedDate: date("last_reviewed_date"),
  nextReviewDate: date("next_review_date"),
  totalCorrect: bigint("total_correct", { mode: "bigint" }).notNull().default(sql`0`),
  totalIncorrect: bigint("total_incorrect", { mode: "bigint" }).notNull().default(sql`0`),
  revision: bigint("revision", { mode: "bigint" }).notNull().default(sql`0`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  unique("learner_progress_learner_vocabulary_unique").on(table.learnerId, table.vocabularyId),
  index("learner_progress_learner_next_review_idx").on(table.learnerId, table.nextReviewDate),
  check("learner_progress_consecutive_correct_check", sql`${table.consecutiveCorrect} >= 0 AND ${table.consecutiveCorrect} <= 9007199254740991`),
  check("learner_progress_interval_days_check", sql`${table.intervalDays} >= 0 AND ${table.intervalDays} <= 9007199254740991`),
  check("learner_progress_total_correct_check", sql`${table.totalCorrect} >= 0 AND ${table.totalCorrect} <= 9007199254740991`),
  check("learner_progress_total_incorrect_check", sql`${table.totalIncorrect} >= 0 AND ${table.totalIncorrect} <= 9007199254740991`),
  check("learner_progress_revision_check", sql`${table.revision} >= 0 AND ${table.revision} <= 9007199254740991`)
]);

export const reviewEvents = vocabflowApp.table("review_events", {
  householdId: uuid("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "no action" }),
  reviewId: uuid("review_id").notNull(),
  requestFingerprint: text("request_fingerprint").notNull(),
  learnerId: uuid("learner_id")
    .notNull()
    .references(() => learnerProfiles.id, { onDelete: "no action" }),
  vocabularyId: integer("vocabulary_id")
    .notNull()
    .references(() => vocabularies.id, { onDelete: "no action" }),
  result: reviewResult("result").notNull(),
  previousStatus: learningStatus("previous_status").notNull(),
  newStatus: learningStatus("new_status").notNull(),
  previousInterval: bigint("previous_interval", { mode: "bigint" }).notNull(),
  newInterval: bigint("new_interval", { mode: "bigint" }).notNull(),
  expectedRevision: bigint("expected_revision", { mode: "bigint" }).notNull(),
  resultingRevision: bigint("resulting_revision", { mode: "bigint" }).notNull(),
  reviewDate: date("review_date").notNull(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }).notNull().defaultNow(),
  responsePayload: jsonb("response_payload").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  primaryKey({ columns: [table.householdId, table.reviewId], name: "review_events_household_review_pk" }),
  index("review_events_learner_reviewed_at_idx").on(table.learnerId, table.reviewedAt),
  index("review_events_learner_vocabulary_reviewed_at_idx").on(table.learnerId, table.vocabularyId, table.reviewedAt),
  check("review_events_previous_interval_check", sql`${table.previousInterval} >= 0 AND ${table.previousInterval} <= 9007199254740991`),
  check("review_events_new_interval_check", sql`${table.newInterval} >= 0 AND ${table.newInterval} <= 9007199254740991`),
  check("review_events_expected_revision_check", sql`${table.expectedRevision} >= 0 AND ${table.expectedRevision} <= 9007199254740991`),
  check("review_events_resulting_revision_check", sql`${table.resultingRevision} > 0 AND ${table.resultingRevision} <= 9007199254740991`)
]);

export const xpEvents = vocabflowApp.table("xp_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  learnerId: uuid("learner_id")
    .notNull()
    .references(() => learnerProfiles.id, { onDelete: "no action" }),
  sourceType: text("source_type").notNull(),
  sourceKey: text("source_key").notNull(),
  points: integer("points").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  unique("xp_events_source_type_key_unique").on(table.sourceType, table.sourceKey),
  index("xp_events_learner_created_at_idx").on(table.learnerId, table.createdAt),
  check("xp_events_source_type_check", sql`${table.sourceType} IN ('REVIEW', 'DAILY_GOAL')`),
  check("xp_events_points_check", sql`${table.points} > 0 AND ${table.points} <= 1000`)
]);

export const achievements = vocabflowApp.table("achievements", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  sortOrder: integer("sort_order").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  check("achievements_sort_order_check", sql`${table.sortOrder} >= 0`),
  index("achievements_enabled_sort_order_id_idx").on(table.enabled, table.sortOrder, table.id)
]);

export const learnerAchievements = vocabflowApp.table("learner_achievements", {
  learnerId: uuid("learner_id")
    .notNull()
    .references(() => learnerProfiles.id, { onDelete: "no action" }),
  achievementId: integer("achievement_id")
    .notNull()
    .references(() => achievements.id, { onDelete: "no action" }),
  unlockedAt: timestamp("unlocked_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  primaryKey({ columns: [table.learnerId, table.achievementId], name: "learner_achievements_learner_achievement_pk" }),
  index("learner_achievements_learner_unlocked_at_idx").on(table.learnerId, table.unlockedAt)
]);

export const authSchema = { user, session, account, verification };
export const applicationSchema = {
  households,
  householdMembers,
  learnerProfiles,
  vocabularies,
  topics,
  learningSets,
  vocabularyTopics,
  learningSetItems,
  learnerLearningSets,
  learnerProgress,
  reviewEvents
};

export type AuthUser = typeof user.$inferSelect;
export type AuthSession = typeof session.$inferSelect;
