import { boolean, check, foreignKey, integer, jsonb, pgSchema, primaryKey, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { APP_SCHEMA } from "@vocabflow/contracts";
import { learnerProfiles } from "./schema";

const foundationSchema = pgSchema(APP_SCHEMA);
export const foundationTargets = foundationSchema.table("foundation_targets", {
  id: uuid("id").primaryKey(), itemType: text("item_type").notNull(), parentLetterId: uuid("parent_letter_id"), kind: text("kind").notNull(),
  content: jsonb("content").notNull(), pins: jsonb("pins").notNull(), contentSha256: text("content_sha256").notNull(), enabled: boolean("enabled").notNull().default(false)
}, t => [unique("foundation_targets_id_type_unique").on(t.id, t.itemType), check("foundation_targets_type_check", sql`${t.itemType} IN ('LETTER_ACTIVITY','UTTERANCE')`), check("foundation_targets_kind_check", sql`(${t.itemType}='UTTERANCE' AND ${t.kind}='UTTERANCE' AND ${t.parentLetterId} IS NULL) OR (${t.itemType}='LETTER_ACTIVITY' AND ${t.kind} IN ('LETTER_NAME','LETTER_SOUND') AND ${t.parentLetterId} IS NOT NULL)`), check("foundation_targets_hash_check", sql`${t.contentSha256} ~ '^[a-f0-9]{64}$'`)]);
export const foundationCollections = foundationSchema.table("foundation_collections", {
  code: text("code").primaryKey(), title: text("title").notNull(), module: text("module").notNull(), sortOrder: integer("sort_order").notNull()
}, t => [check("foundation_collections_module_check", sql`${t.module} IN ('letters','utterances')`)]);
export const foundationMemberships = foundationSchema.table("foundation_memberships", {
  collection: text("collection").notNull().references(() => foundationCollections.code, { onDelete: "no action" }),
  targetId: uuid("target_id").notNull().references(() => foundationTargets.id, { onDelete: "no action" }), sortOrder: integer("sort_order").notNull()
}, t => [primaryKey({ columns: [t.collection, t.targetId] })]);
export const foundationProgress = foundationSchema.table("foundation_progress", {
  learnerId: uuid("learner_id").notNull().references(() => learnerProfiles.id, { onDelete: "no action" }),
  targetId: uuid("target_id").notNull(), itemType: text("item_type").notNull(), revision: integer("revision").notNull(), state: jsonb("state").notNull()
}, t => [primaryKey({ columns: [t.learnerId, t.targetId, t.itemType] }), foreignKey({ columns: [t.targetId, t.itemType], foreignColumns: [foundationTargets.id, foundationTargets.itemType] }), check("foundation_progress_revision_check", sql`${t.revision} > 0`)]);
export const foundationAttempts = foundationSchema.table("foundation_attempts", {
  id: uuid("id").primaryKey(), ownerKey: text("owner_key").notNull(), targetId: uuid("target_id").notNull().references(() => foundationTargets.id, { onDelete: "no action" }),
  payload: jsonb("payload").notNull(), phase: text("phase").notNull(), expiresAt: timestamp("expires_at", { withTimezone: true }).notNull()
}, t => [check("foundation_attempts_phase_check", sql`${t.phase} IN ('ASSESS','REVEALED','CONSUMED')`)]);
export const foundationReviews = foundationSchema.table("foundation_reviews", {
  learnerId: uuid("learner_id").notNull().references(() => learnerProfiles.id, { onDelete: "no action" }), reviewId: uuid("review_id").notNull(),
  targetId: uuid("target_id").notNull().references(() => foundationTargets.id, { onDelete: "no action" }), requestSha256: text("request_sha256").notNull(), response: jsonb("response").notNull()
}, t => [primaryKey({ columns: [t.learnerId, t.reviewId] })]);
