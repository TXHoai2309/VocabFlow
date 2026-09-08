import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";
import { createBootstrapService, DEFAULT_HOUSEHOLD_NAME, DEFAULT_HOUSEHOLD_TIMEZONE } from "./bootstrap";

const HOUSEHOLD_ID = "00000000-0000-4000-8000-000000000001";

function successfulDatabase() {
  const execute = vi.fn().mockResolvedValue([{
    id: HOUSEHOLD_ID,
    name: DEFAULT_HOUSEHOLD_NAME,
    timezone: DEFAULT_HOUSEHOLD_TIMEZONE
  }]);
  return { execute };
}

describe("US-01 household bootstrap service", () => {
  it("returns the canonical household from one atomic idempotent statement", async () => {
    const database = successfulDatabase();
    const service = createBootstrapService(database);

    await expect(service.ensureDefaultHousehold("user-1")).resolves.toEqual({
      id: HOUSEHOLD_ID,
      name: DEFAULT_HOUSEHOLD_NAME,
      timezone: DEFAULT_HOUSEHOLD_TIMEZONE
    });
    expect(database.execute).toHaveBeenCalledTimes(1);
  });

  it("serializes every dynamic value as a typed bind and never interpolates it into SQL text", async () => {
    const database = successfulDatabase();
    await createBootstrapService(database).ensureDefaultHousehold("user-1");

    const query = database.execute.mock.calls[0]?.[0];
    const serialized = new PgDialect().sqlToQuery(query);
    expect(serialized.sql).toContain("$1::uuid");
    expect(serialized.sql).toContain("$2::text");
    expect(serialized.sql).toContain("$3::text");
    expect(serialized.sql).toContain("$4::text");
    expect(serialized.sql).toContain("$5::text");
    expect(serialized.sql).toContain("'OWNER'::\"vocabflow_app\".\"household_role\"");
    expect(serialized.params).toEqual([
      expect.any(String),
      "user-1",
      DEFAULT_HOUSEHOLD_NAME,
      DEFAULT_HOUSEHOLD_TIMEZONE,
      "user-1"
    ]);
    expect(serialized.sql).not.toContain("user-1");
  });

  it("rejects an empty authenticated user id before touching the database", async () => {
    const database = successfulDatabase();
    await expect(createBootstrapService(database).ensureDefaultHousehold("")).rejects.toThrow("BOOTSTRAP_USER_REQUIRED");
    expect(database.execute).not.toHaveBeenCalled();
  });

  it("fails closed when the database returns a malformed household row", async () => {
    const database = { execute: vi.fn().mockResolvedValue([{ id: "not-a-uuid", name: "", timezone: "" }]) };
    await expect(createBootstrapService(database).ensureDefaultHousehold("user-1")).rejects.toThrow("BOOTSTRAP_RESULT_INVALID");
  });
});
