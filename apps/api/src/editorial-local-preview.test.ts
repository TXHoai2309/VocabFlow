import { describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { matchesCefrFilter, publicLearningIndexSchema } from "@vocabflow/contracts";
import { editorialPreviewField } from "./editorial-local-preview";
import { catalogCefrFilter } from "./catalog-cefr-filter";
import { studyScopeFromParams, studyScopeParams } from "../../web/src/features/study/study-queue";

describe("local editorial pilot scope", () => {
  it("never infers first words from CEFR or missing CEFR", () => {
    for (const cefr of [undefined, null, "", "A1", "C2"]) {
      expect(matchesCefrFilter(cefr, "intro-first-words")).toBe(false);
      expect(matchesCefrFilter(cefr, "intro-first-words", ["EDITORIAL:FIRST_WORDS"])).toBe(true);
    }
    expect(matchesCefrFilter("A1", "A2", ["EDITORIAL:FIRST_WORDS"])).toBe(false);
  });
  it("retains the collection and discovery token through setup", () => {
    const scope = studyScopeFromParams(new URLSearchParams("learningSetId=26&cefr=intro-first-words"));
    expect(scope).toEqual({ type: "learning-set", id: 26, cefr: "intro-first-words" });
    expect(studyScopeFromParams(studyScopeParams(scope))).toEqual(scope);
  });
  it("requires the dedicated database and matching source hash for SQL reads", () => {
    const dialect = new PgDialect();
    for (const query of [catalogCefrFilter("intro-first-words"), editorialPreviewField("examples", sql`md.examples`)]) {
      const result = dialect.sqlToQuery(query);
      expect(result.sql).toContain("current_database() = 'vocabflow_dev'");
      expect(result.sql).toContain("'sourceContentSha256' = md.content_sha256");
      expect(result.params).toEqual([]);
    }
  });
  it("carries only discovery tags in the lightweight guest index", () => {
    const index = publicLearningIndexSchema.parse({ vocabulary: [{ id: 1, level: null, tags: ["EDITORIAL:FIRST_WORDS"] }], topics: [], learningSets: [] });
    expect(matchesCefrFilter(index.vocabulary[0]?.cefr, "intro-first-words", index.vocabulary[0]?.tags)).toBe(true);
  });
});
