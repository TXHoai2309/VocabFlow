import { sql, type SQL } from "drizzle-orm";
import { householdBootstrapResponseSchema, type HouseholdBootstrapResponse } from "@vocabflow/contracts";

export const DEFAULT_HOUSEHOLD_NAME = "Gia đình VocabFlow";
export const DEFAULT_HOUSEHOLD_TIMEZONE = "Asia/Ho_Chi_Minh";

export type BootstrapDatabase = {
  execute: (query: SQL) => Promise<unknown>;
};

export type BootstrapService = {
  ensureDefaultHousehold: (userId: string) => Promise<HouseholdBootstrapResponse["household"]>;
};

type BootstrapRow = {
  id: string;
  name: string;
  timezone: string;
};

/**
 * Resolve the owner's one canonical household and OWNER membership in one
 * data-modifying statement. The unique owner key is the concurrency barrier;
 * the no-op conflict update returns the row created by a competing request.
 */
export function createBootstrapService(database: BootstrapDatabase): BootstrapService {
  return {
    async ensureDefaultHousehold(userId: string) {
      if (!userId) throw new Error("BOOTSTRAP_USER_REQUIRED");

      const householdId = crypto.randomUUID();
      const result = await database.execute(sql`
        WITH household AS (
          INSERT INTO "vocabflow_app"."households"
            ("id", "primary_owner_user_id", "name", "timezone")
          VALUES (
            ${householdId}::uuid,
            ${userId}::text,
            ${DEFAULT_HOUSEHOLD_NAME}::text,
            ${DEFAULT_HOUSEHOLD_TIMEZONE}::text
          )
          ON CONFLICT ("primary_owner_user_id") DO UPDATE
            SET "primary_owner_user_id" = EXCLUDED."primary_owner_user_id"
          RETURNING "id", "name", "timezone"
        ), membership AS (
          INSERT INTO "vocabflow_app"."household_members"
            ("household_id", "user_id", "role")
          SELECT "id", ${userId}::text, 'OWNER'::"vocabflow_app"."household_role"
          FROM household
          ON CONFLICT ("household_id", "user_id") DO NOTHING
          RETURNING "household_id"
        ), membership_result AS (
          SELECT count(*)::int AS inserted_count FROM membership
        )
        SELECT household."id", household."name", household."timezone"
        FROM household CROSS JOIN membership_result
      `);

      const row = (result as BootstrapRow[])[0];
      const parsed = householdBootstrapResponseSchema.safeParse({ household: row });
      if (!parsed.success) throw new Error("BOOTSTRAP_RESULT_INVALID");
      return parsed.data.household;
    }
  };
}
