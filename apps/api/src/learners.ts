import { sql, type SQL } from "drizzle-orm";
import {
  APP_SCHEMA,
  createLearnerRequestSchema,
  learnerDtoSchema,
  type CreateLearnerRequest,
  type LearnerDto
} from "@vocabflow/contracts";

export type LearnerDatabase = {
  execute: (query: SQL) => Promise<unknown>;
};

export type LearnerServiceErrorCode =
  | "HOUSEHOLD_ACCESS_DENIED"
  | "LEARNER_DISPLAY_NAME_INVALID"
  | "INVALID_REQUEST"
  | "INTERNAL_ERROR";

export class LearnerServiceError extends Error {
  readonly code: LearnerServiceErrorCode;
  readonly status: 400 | 403 | 500;

  constructor(code: LearnerServiceErrorCode, status: 400 | 403 | 500) {
    super(code);
    this.name = "LearnerServiceError";
    this.code = code;
    this.status = status;
  }
}

function rowsOf<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === "object" && Array.isArray((result as { rows?: unknown }).rows)) {
    return (result as { rows: T[] }).rows;
  }
  throw new LearnerServiceError("INTERNAL_ERROR", 500);
}

function timestampToIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  throw new LearnerServiceError("INTERNAL_ERROR", 500);
}

type LearnerRow = {
  id: string;
  household_id: string;
  display_name: string;
  avatar_key: string | null;
  enabled: boolean;
  created_at: string | Date;
  updated_at: string | Date;
};

function toLearnerDto(row: LearnerRow): LearnerDto {
  const dto = {
    id: String(row.id),
    householdId: String(row.household_id),
    displayName: String(row.display_name),
    avatarKey: row.avatar_key == null ? null : String(row.avatar_key),
    enabled: row.enabled === true,
    createdAt: timestampToIso(row.created_at),
    updatedAt: timestampToIso(row.updated_at)
  };
  const parsed = learnerDtoSchema.safeParse(dto);
  if (!parsed.success) throw new LearnerServiceError("INTERNAL_ERROR", 500);
  return parsed.data;
}

export function parseCreateLearnerRequest(payload: unknown): CreateLearnerRequest {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new LearnerServiceError("INVALID_REQUEST", 400);
  }
  const candidate = payload as Record<string, unknown>;
  const keys = Object.keys(candidate);
  if (keys.length !== 1 || keys[0] !== "displayName" || typeof candidate.displayName !== "string") {
    throw new LearnerServiceError("INVALID_REQUEST", 400);
  }
  const normalized = candidate.displayName.trim();
  if (normalized.length < 1 || normalized.length > 80) {
    throw new LearnerServiceError("LEARNER_DISPLAY_NAME_INVALID", 400);
  }
  const parsed = createLearnerRequestSchema.safeParse({ displayName: normalized });
  if (!parsed.success) throw new LearnerServiceError("INVALID_REQUEST", 400);
  return parsed.data;
}

async function resolveHouseholdId(database: LearnerDatabase, userId: string): Promise<string> {
  const result = await database.execute(sql`
    SELECT h.id::text AS household_id
    FROM "${sql.raw(APP_SCHEMA)}"."households" h
    JOIN "${sql.raw(APP_SCHEMA)}"."household_members" hm ON hm.household_id = h.id
    WHERE hm.user_id = ${userId}::text
    ORDER BY (h.primary_owner_user_id = ${userId}::text) DESC, h.id ASC
    LIMIT 1
  `);
  const [row] = rowsOf<{ household_id: string }>(result);
  if (!row?.household_id) throw new LearnerServiceError("HOUSEHOLD_ACCESS_DENIED", 403);
  return row.household_id;
}

export type LearnerOwnershipResult =
  | { decision: "ALLOW"; learnerId: string; householdId: string }
  | { decision: "FORBIDDEN" };

/**
 * Reusable learner ownership seam. The learner UUID is only a lookup key;
 * authorization is granted by the authenticated user's household membership.
 */
export async function authorizeLearnerOwnership(
  database: LearnerDatabase,
  userId: string,
  learnerId: string,
): Promise<LearnerOwnershipResult> {
  // Treat malformed identifiers as a non-match at the authorization seam;
  // never let an untrusted path value become a database cast failure.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(learnerId)) {
    return { decision: "FORBIDDEN" };
  }
  const result = await database.execute(sql`
    SELECT lp.id::text AS learner_id, lp.household_id::text AS household_id
    FROM "${sql.raw(APP_SCHEMA)}"."learner_profiles" lp
    JOIN "${sql.raw(APP_SCHEMA)}"."household_members" hm ON hm.household_id = lp.household_id
    WHERE lp.id = ${learnerId}::uuid
      AND hm.user_id = ${userId}::text
      AND lp.enabled = true
    LIMIT 1
  `);
  const [row] = rowsOf<{ learner_id: string; household_id: string }>(result);
  return row
    ? { decision: "ALLOW", learnerId: row.learner_id, householdId: row.household_id }
    : { decision: "FORBIDDEN" };
}

export async function requireLearnerOwnership(
  database: LearnerDatabase,
  userId: string,
  learnerId: string,
) {
  const result = await authorizeLearnerOwnership(database, userId, learnerId);
  if (result.decision === "FORBIDDEN") {
    throw new LearnerServiceError("HOUSEHOLD_ACCESS_DENIED", 403);
  }
  return result;
}

export type LearnerService = {
  list: (userId: string) => Promise<LearnerDto[]>;
  create: (userId: string, payload: unknown) => Promise<LearnerDto>;
  authorize: (userId: string, learnerId: string) => Promise<LearnerOwnershipResult>;
};

export function createLearnerService(database: LearnerDatabase): LearnerService {
  return {
    async list(userId) {
      const householdId = await resolveHouseholdId(database, userId);
      const result = await database.execute(sql`
        SELECT id::text, household_id::text, display_name, avatar_key, enabled,
               created_at, updated_at
        FROM "${sql.raw(APP_SCHEMA)}"."learner_profiles"
        WHERE household_id = ${householdId}::uuid
          AND enabled = true
        ORDER BY created_at ASC, id ASC
      `);
      return rowsOf<LearnerRow>(result).map(toLearnerDto);
    },
    async create(userId, payload) {
      const input = parseCreateLearnerRequest(payload);
      const householdId = await resolveHouseholdId(database, userId);
      const learnerId = crypto.randomUUID();
      const result = await database.execute(sql`
        INSERT INTO "${sql.raw(APP_SCHEMA)}"."learner_profiles"
          (id, household_id, display_name, avatar_key, enabled)
        VALUES (${learnerId}::uuid, ${householdId}::uuid, ${input.displayName}::text, NULL, true)
        RETURNING id::text, household_id::text, display_name, avatar_key, enabled,
                  created_at, updated_at
      `);
      const [row] = rowsOf<LearnerRow>(result);
      if (!row) throw new LearnerServiceError("INTERNAL_ERROR", 500);
      return toLearnerDto(row);
    },
    authorize(userId, learnerId) {
      return authorizeLearnerOwnership(database, userId, learnerId);
    }
  };
}
