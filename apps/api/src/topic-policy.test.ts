import { describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { topicMembership } from "./topic-policy";

describe("canonical topic membership boundary", () => {
  it("uses cycle-safe descendant closure and reviewed links without multiplying vocabulary rows", () => {
    const query = new PgDialect().sqlToQuery(topicMembership(sql`v.id`, sql`${7}`));
    expect(query.sql).toContain("WITH RECURSIVE");
    expect(query.sql).toContain("child.parent_topic_id = tree.descendant_id");
    expect(query.sql).toContain("UNION");
    expect(query.sql).not.toContain("UNION ALL");
    expect(query.sql).toContain("vt.review_status = 'APPROVED'");
    expect(query.sql).toContain("child.review_status = 'APPROVED'");
    expect(query.sql).toContain("EXISTS");
    expect(query.params).toEqual([7]);
  });
});
