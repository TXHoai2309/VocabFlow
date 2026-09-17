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
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [
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

export const authSchema = { user, session, account, verification };
export const applicationSchema = {
  households,
  householdMembers,
  learnerProfiles,
  vocabularies,
  learnerProgress,
  reviewEvents
};

export type AuthUser = typeof user.$inferSelect;
export type AuthSession = typeof session.$inferSelect;
