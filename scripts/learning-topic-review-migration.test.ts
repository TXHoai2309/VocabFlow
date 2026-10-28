import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(resolve("drizzle/migrations/0020_learning_topic_review.sql"), "utf8");
const snapshot = JSON.parse(readFileSync(resolve("drizzle/migrations/meta/0020_snapshot.json"), "utf8"));

describe("topic publication migration", () => {
  it("preserves content and defaults unknown nodes and memberships to review-needed", () => {
    expect(migration).not.toMatch(/\bDROP\b|\bTRUNCATE\b|DELETE\s+FROM/i);
    for (const table of ["topics", "vocabulary_topics"]) {
      expect(snapshot.tables[`vocabflow_app.${table}`].columns.review_status).toMatchObject({ default: "'UNREVIEWED'", notNull: true });
    }
    expect(migration).toContain('"master_vocabulary_topic_memberships"');
    expect(migration).toContain("t.source_topic = v.topic");
    expect(migration).toContain("v.source_dataset IS DISTINCT FROM 'VOCABFLOW_MASTER_V2_DEV'");
  });
  it("retains stable topic identity and adds a self-parent guard and indexed relation", () => {
    const topics = snapshot.tables["vocabflow_app.topics"];
    expect(topics.columns.parent_topic_id).toMatchObject({ type: "integer", notNull: false });
    expect(topics.checkConstraints.topics_not_self_parent_check).toBeDefined();
    expect(topics.indexes.topics_parent_topic_idx).toBeDefined();
    expect(migration).toContain("child.parent_topic_id IS NULL");
  });
});
