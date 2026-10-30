import { vocabularyProjectionTable, OWNER_LOCAL_CATALOG_ID, OWNER_PRODUCTION_CATALOG_ID, OWNER_PRODUCTION_SOURCE } from "./vocabulary-dataset-version";
import { localEditorialPilot } from "./editorial-local-preview";
import { topicMembership } from "./topic-policy";
import { performance } from "node:perf_hooks";
import { sql } from "drizzle-orm";
import { APP_SCHEMA, publicLearningIndexSchema, type PublicLearningIndex } from "@vocabflow/contracts";
import type { VocabularyDatabase } from "./vocabulary";
import { vocabularyDatasetPredicate, type VocabularyDatasetVersion } from "./vocabulary-dataset-version";

function rows<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === "object" && "rows" in value && Array.isArray(value.rows)) return value.rows as T[];
  throw new Error("INVALID_PUBLIC_INDEX");
}
type CollectionRow = { id: number; slug: string; name: string; description: string; grade?: string | null; sort_order: number; parent_topic_id?: number | null; vocabulary_ids: number[] | string };

export async function readPublicLearningIndex(database: VocabularyDatabase, datasetVersion: VocabularyDatasetVersion, timings: Record<string, number> = {}): Promise<PublicLearningIndex> {
  const query = async (name: string, statement: Parameters<VocabularyDatabase["execute"]>[0]) => {
    const started = performance.now();
    try { return await database.execute(statement); } finally { timings[name] = performance.now() - started; }
  };
  const [vocabularyResult, setsResult, topicsResult] = await Promise.all([
    query("index_words", sql`
      SELECT v.id, v.level, v.source_dataset, md.cefr, ${datasetVersion === "owner-local" || datasetVersion === "owner-production" ? sql`md.tags` : sql`CASE WHEN ${localEditorialPilot} THEN '["EDITORIAL:FIRST_WORDS"]'::jsonb ELSE '[]'::jsonb END`} AS tags FROM "${sql.raw(APP_SCHEMA)}".vocabularies v
      LEFT JOIN ${vocabularyProjectionTable(datasetVersion)} md ON md.vocabulary_id = v.id
      WHERE v.enabled = true AND ${vocabularyDatasetPredicate("v", datasetVersion)} ORDER BY v.id
    `),
    query("index_sets", sql`
      SELECT ls.id, ls.slug, ls.name, ls.description, ls.grade, ls.sort_order,
        json_agg(v.id ORDER BY lsi.sort_order, v.id) AS vocabulary_ids
      FROM "${sql.raw(APP_SCHEMA)}".learning_sets ls
      JOIN "${sql.raw(APP_SCHEMA)}".learning_set_items lsi ON lsi.learning_set_id = ls.id
      JOIN "${sql.raw(APP_SCHEMA)}".vocabularies v ON v.id = lsi.vocabulary_id
      WHERE ls.enabled = true AND v.enabled = true AND ${vocabularyDatasetPredicate("v", datasetVersion)}
      GROUP BY ls.id ORDER BY ls.sort_order, ls.id
    `),
    query("index_topics", sql`
      SELECT t.id, t.slug, t.name, t.description, t.sort_order, t.parent_topic_id,
        COALESCE(json_agg(DISTINCT v.id ORDER BY v.id) FILTER (WHERE v.id IS NOT NULL), '[]') AS vocabulary_ids
      FROM "${sql.raw(APP_SCHEMA)}".topics t
      LEFT JOIN "${sql.raw(APP_SCHEMA)}".vocabularies v
        ON v.enabled = true AND ${topicMembership(sql`v.id`, sql`t.id`)}
      WHERE t.enabled = true AND t.review_status = 'APPROVED'
      GROUP BY t.id ORDER BY t.sort_order, t.id
    `)
  ]);
  const wordRows = rows<{ id: number; level: string | null; source_dataset?: string; cefr?: string | null; tags?: string[] }>(vocabularyResult);
  const vocabulary = wordRows.map((row) => ({ id: Number(row.id), level: row.level, ...(row.cefr ? { cefr: row.cefr } : {}), ...(row.tags?.length ? { tags: row.tags } : {}) }));
  const enabledIds = new Set(vocabulary.map((word) => word.id));
  const collection = (row: CollectionRow) => ({
    id: Number(row.id), slug: row.slug, name: row.name, description: row.description,
    enabled: true, sortOrder: Number(row.sort_order), studyScopeAvailable: true,
    ...(row.parent_topic_id ? { parentTopicId: Number(row.parent_topic_id) } : {}),
    vocabularyIds: [...new Set((typeof row.vocabulary_ids === "string" ? JSON.parse(row.vocabulary_ids) as number[] : row.vocabulary_ids).map(Number))].filter((id) => enabledIds.has(id))
  });
  return publicLearningIndexSchema.parse({ vocabulary,
    ...(datasetVersion === "owner-local" ? { catalogIdentity: OWNER_LOCAL_CATALOG_ID } : {}),
    ...(datasetVersion === "owner-production" && wordRows.length === 1547 && wordRows.every(row => row.source_dataset === OWNER_PRODUCTION_SOURCE)
      ? { catalogIdentity: OWNER_PRODUCTION_CATALOG_ID } : {}),
    learningSets: rows<CollectionRow>(setsResult).map((row) => {
      const set = collection(row);
      return { ...set, grade: row.grade ?? null, vocabularyCount: set.vocabularyIds.length };
    }).filter((set) => set.vocabularyCount > 0),
    topics: rows<CollectionRow>(topicsResult).map(collection).filter((topic) => topic.vocabularyIds.length > 0)
  });
}
