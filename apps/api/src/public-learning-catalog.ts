import { sql } from "drizzle-orm";
import { APP_SCHEMA, publicLearningCatalogSchema, type PublicLearningCatalog } from "@vocabflow/contracts";
import { readPublicVocabulary, type VocabularyDatabase } from "./vocabulary";
import type { VocabularyDatasetVersion } from "./vocabulary-dataset-version";

function rows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === "object" && "rows" in result && Array.isArray(result.rows)) return result.rows as T[];
  throw new Error("INVALID_CATALOG_RESULT");
}

export async function readPublicLearningCatalog(database: VocabularyDatabase, datasetVersion: VocabularyDatasetVersion): Promise<PublicLearningCatalog> {
  const vocabulary = await readPublicVocabulary(database, { datasetVersion });
  const enabledIds = new Set(vocabulary.map((word) => word.id));
  const [setResult, topicResult] = await Promise.all([
    database.execute(sql`
      SELECT ls.id, ls.slug, ls.name, ls.description, ls.grade, ls.sort_order,
        COALESCE(json_agg(lsi.vocabulary_id ORDER BY lsi.sort_order, lsi.vocabulary_id)
          FILTER (WHERE lsi.vocabulary_id IS NOT NULL), '[]') AS vocabulary_ids
      FROM "${sql.raw(APP_SCHEMA)}".learning_sets ls
      LEFT JOIN "${sql.raw(APP_SCHEMA)}".learning_set_items lsi ON lsi.learning_set_id = ls.id
      WHERE ls.enabled = true GROUP BY ls.id ORDER BY ls.sort_order, ls.id
    `),
    database.execute(sql`
      SELECT t.id, t.slug, t.name, t.description, t.sort_order,
        COALESCE(json_agg(vt.vocabulary_id ORDER BY vt.vocabulary_id)
          FILTER (WHERE vt.vocabulary_id IS NOT NULL), '[]') AS vocabulary_ids
      FROM "${sql.raw(APP_SCHEMA)}".topics t
      LEFT JOIN "${sql.raw(APP_SCHEMA)}".vocabulary_topics vt ON vt.topic_id = t.id
      WHERE t.enabled = true GROUP BY t.id ORDER BY t.sort_order, t.id
    `)
  ]);
  type Row = { id: number; slug: string; name: string; description: string; grade?: string | null; sort_order: number; vocabulary_ids: number[] | string };
  const project = (row: Row) => ({
    id: Number(row.id), slug: row.slug, name: row.name, description: row.description,
    sortOrder: Number(row.sort_order), enabled: true, studyScopeAvailable: true,
    vocabularyIds: [...new Set((typeof row.vocabulary_ids === "string" ? JSON.parse(row.vocabulary_ids) as number[] : row.vocabulary_ids).map(Number))].filter((id) => enabledIds.has(id))
  });
  const learningSets = rows<Row>(setResult).map((row) => {
    const item = project(row);
    return { ...item, grade: row.grade ?? null, vocabularyCount: item.vocabularyIds.length };
  }).filter((set) => set.vocabularyCount > 0);
  const topics = rows<Row>(topicResult).map(project).filter((topic) => topic.vocabularyIds.length > 0);
  return publicLearningCatalogSchema.parse({ vocabulary, learningSets, topics });
}
