import postgres from "postgres";
import { describe, expect, it } from "vitest";
import { createPostgresMasterImportStore } from "./master-vocabulary-v2-import-store";

type CapturedQuery = { text: string; values: unknown[] };
type FakeSqlTag = {
  <T extends readonly Record<string, unknown>[] = Record<string, unknown>[]>(parts: TemplateStringsArray, ...values: unknown[]): Promise<T>;
  unsafe(query: string): Promise<Record<string, unknown>[]>;
  begin<T>(operation: (transaction: FakeSqlTag) => Promise<T>): Promise<T>;
};

function createFakeSql() {
  const queries: CapturedQuery[] = [];
  const tag = (async <T extends readonly Record<string, unknown>[] = Record<string, unknown>[]>(parts: TemplateStringsArray, ...values: unknown[]) => {
    const text = parts.reduce((query, part, index) => query + part + (index < values.length ? `$${index + 1}` : ""), "");
    queries.push({ text, values });
    if (text.includes("RETURNING topic_id")) return [{ topic_id: values[1] }] as unknown as T;
    if (text.includes("RETURNING master_sense_id")) return [{ master_sense_id: values[0] }] as unknown as T;
    return [] as unknown as T;
  }) as FakeSqlTag;
  tag.unsafe = async (text) => { queries.push({ text, values: [] }); return []; };
  tag.begin = async (operation) => operation(tag);
  return { sql: tag as unknown as ReturnType<typeof postgres>, queries };
}

describe("Postgres Master V2 import approval writes", () => {
  it("approves adopted topic and membership rows after the owner mappings are recorded", async () => {
    const { sql, queries } = createFakeSql();
    const store = createPostgresMasterImportStore(sql);

    await store.transaction(async (transaction) => {
      await transaction.writeTopicMapping({
        masterId: "0195f85c-7b2a-7d10-8c01-000000000005",
        appId: 9,
        sourceDatasetId: "0195f85c-7b2a-7d10-8c01-000000000001",
        releaseHash: "a".repeat(64),
        runId: "0195f85c-7b2a-7d10-8c01-000000000008"
      });
      await transaction.writeVocabularyTopicMembership({
        masterSenseId: "0195f85c-7b2a-7d10-8c01-000000000003",
        masterTopicId: "0195f85c-7b2a-7d10-8c01-000000000005",
        vocabularyId: 123,
        topicId: 9,
        releaseHash: "a".repeat(64)
      });
    });

    const statements = queries.map(({ text }) => text);
    const topicMappingIndex = statements.findIndex((text) => text.includes('INSERT INTO "vocabflow_app"."master_topic_mappings"'));
    const topicApprovalIndex = statements.findIndex((text) => text.includes('UPDATE "vocabflow_app"."topics" SET review_status = \'APPROVED\''));
    const membershipLedgerIndex = statements.findIndex((text) => text.includes('INSERT INTO "vocabflow_app"."master_vocabulary_topic_memberships"'));
    const membershipApprovalIndex = statements.findIndex((text) => text.includes('UPDATE "vocabflow_app"."vocabulary_topics" SET review_status = \'APPROVED\''));

    expect(topicMappingIndex).toBeGreaterThan(-1);
    expect(topicApprovalIndex).toBeGreaterThan(topicMappingIndex);
    expect(membershipLedgerIndex).toBeGreaterThan(topicApprovalIndex);
    expect(membershipApprovalIndex).toBeGreaterThan(membershipLedgerIndex);
    expect(statements[topicMappingIndex]).toContain("ON CONFLICT (master_topic_id) DO UPDATE");
    expect(statements[membershipLedgerIndex]).toContain("ON CONFLICT (master_sense_id, master_topic_id) DO UPDATE");
    expect(statements[membershipApprovalIndex]).toContain("WHERE vocabulary_id = $1 AND topic_id = $2");
  });
});
