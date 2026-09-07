import { describe, expect, it } from "vitest";
import { parseRoleCredential } from "./db-credentials";

describe("database role credentials", () => {
  it("parses a purpose-specific URL in memory", () => {
    expect(parseRoleCredential(
      "postgresql://vocabflow_runtime:p%40ssword%2F1@ep-example-pooler.neon.tech/neondb",
      "vocabflow_runtime"
    )).toEqual({ roleName: "vocabflow_runtime", password: "p@ssword/1" });
  });

  it("rejects a URL whose username is for another purpose", () => {
    const uri = "postgresql://vocabflow_runtime:secret@ep-example-pooler.neon.tech/neondb";
    expect(() => parseRoleCredential(uri, "vocabflow_migration")).toThrow("CONNECTION_TARGET_MISMATCH");
    try {
      parseRoleCredential(uri, "vocabflow_migration");
    } catch (error) {
      expect(String(error)).not.toContain(uri);
      expect(String(error)).not.toContain("secret");
    }
  });

  it("fails closed without exposing malformed URI details", () => {
    const uri = "not-a-database-uri-with-a-secret";
    expect(() => parseRoleCredential(uri, "vocabflow_runtime")).toThrow("INVALID_DATABASE_URL");
    try {
      parseRoleCredential(uri, "vocabflow_runtime");
    } catch (error) {
      expect(String(error)).not.toContain(uri);
    }
  });
});
