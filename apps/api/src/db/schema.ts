import {
  boolean,
  pgSchema,
  text,
  timestamp,
  unique,
  uuid
} from "drizzle-orm/pg-core";
import { APP_SCHEMA } from "@vocabflow/contracts";

export const vocabflowApp = pgSchema(APP_SCHEMA);
export const householdRole = vocabflowApp.enum("household_role", ["OWNER", "PARENT"]);

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

export const authSchema = { user, session, account, verification };
export const applicationSchema = { households, householdMembers };

export type AuthUser = typeof user.$inferSelect;
export type AuthSession = typeof session.$inferSelect;
