import { vocabularyProjectionTable } from "./vocabulary-dataset-version";
import { topicMembership } from "./topic-policy";
import { sql, type SQL } from "drizzle-orm";
import {
  APP_SCHEMA,
  globalSearchResponseSchema,
  type GlobalSearchResponse
} from "@vocabflow/contracts";
import { authorizeLearnerOwnership } from "./learners";
import { vocabularyDatasetPredicate, type VocabularyDatasetVersion } from "./vocabulary-dataset-version";

export type GlobalSearchDatabase = { execute: (query: SQL) => Promise<unknown> };
export type GlobalSearchQuery = { q: string; limit: number };

export type GlobalSearchServiceErrorCode = "HOUSEHOLD_ACCESS_DENIED" | "INTERNAL_ERROR";

export class GlobalSearchServiceError extends Error {
  readonly code: GlobalSearchServiceErrorCode;
  readonly status: 403 | 500;

  constructor(code: GlobalSearchServiceErrorCode, status: 403 | 500) {
    super(code);
    this.name = "GlobalSearchServiceError";
    this.code = code;
    this.status = status;
  }
}

type SearchRow = {
  entity_type: unknown;
  id: unknown;
  title: unknown;
  subtitle: unknown;
  subtitle_label: unknown;
  image_url: unknown;
  topic: unknown;
  level: unknown;
  description: unknown;
  vocabulary_count: unknown;
  grade: unknown;
};

function rowsOf<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === "object" && Array.isArray((result as { rows?: unknown }).rows)) {
    return (result as { rows: T[] }).rows;
  }
  throw new GlobalSearchServiceError("INTERNAL_ERROR", 500);
}

function safeInteger(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new GlobalSearchServiceError("INTERNAL_ERROR", 500);
  return parsed;
}

function nullableText(value: unknown): string | null {
  return value == null ? null : String(value);
}

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

export function parseGlobalSearchQuery(params: URLSearchParams): GlobalSearchQuery | null {
  const keys = [...params.keys()];
  if (new Set(keys).size !== keys.length || keys.some((key) => !["q", "limit"].includes(key))) return null;
  if (!params.has("q")) return null;
  const q = (params.get("q") ?? "").trim().normalize("NFC");
  if (!q || Array.from(q).length > 100) return null;

  const limitValue = params.get("limit");
  const limit = limitValue === null ? 5 : /^\d+$/.test(limitValue) ? Number(limitValue) : NaN;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 10) return null;
  return { q, limit };
}

async function searchRows(
  database: GlobalSearchDatabase,
  learnerId: string,
  query: GlobalSearchQuery,
  datasetVersion: VocabularyDatasetVersion
): Promise<SearchRow[]> {
  const literalQuery = escapeLike(query.q);
  const containsPattern = `%${literalQuery}%`;
  const prefixPattern = `${literalQuery}%`;
  const escapeCharacter = "\\";
  const eligibleMembership = datasetVersion !== "legacy"
    ? vocabularyDatasetPredicate("v", datasetVersion)
    : sql`EXISTS (
          SELECT 1
          FROM "${sql.raw(APP_SCHEMA)}"."learner_learning_sets" lls
          JOIN "${sql.raw(APP_SCHEMA)}"."learning_sets" ls ON ls.id = lls.learning_set_id AND ls.enabled = true
          JOIN "${sql.raw(APP_SCHEMA)}"."learning_set_items" lsi ON lsi.learning_set_id = ls.id AND lsi.vocabulary_id = v.id
          WHERE lls.learner_id = ${learnerId}::uuid AND lls.active = true
        )`;
  const collectionSearchEnabled = datasetVersion === "v2" ? sql`false` : sql`true`;
  const result = await database.execute(sql`
    WITH eligible_vocabulary AS (
      SELECT DISTINCT v.id
      FROM "${sql.raw(APP_SCHEMA)}"."vocabularies" v
      WHERE v.enabled = true
        AND ${eligibleMembership}
    ),
    vocabulary_matches AS (
      SELECT
        'VOCABULARY'::text AS entity_type,
        v.id,
        v.word AS title,
        COALESCE(sm.short_meaning_vi, v.vietnamese_override, v.vietnamese) AS subtitle,
        CASE WHEN sm.short_meaning_vi IS NOT NULL THEN 'Nghĩa tiếng Việt' ELSE 'Giải thích nghĩa' END::text AS subtitle_label,
        CASE WHEN v.image_quarantined THEN NULL ELSE v.image_url END AS image_url,
        v.topic,
        v.level::text AS level,
        NULL::text AS description,
        NULL::bigint AS vocabulary_count,
        NULL::text AS grade,
        CASE
          WHEN lower(v.word) = lower(${query.q}) THEN 0
          WHEN lower(v.word) LIKE lower(${prefixPattern}) ESCAPE ${escapeCharacter} THEN 1
          WHEN lower(v.word) LIKE lower(${containsPattern}) ESCAPE ${escapeCharacter} THEN 2
          ELSE 3
        END::integer AS match_rank,
        0::integer AS stable_order
      FROM eligible_vocabulary ev
      JOIN "${sql.raw(APP_SCHEMA)}"."vocabularies" v ON v.id = ev.id
      LEFT JOIN ${vocabularyProjectionTable(datasetVersion)} md ON md.vocabulary_id = v.id
      LEFT JOIN "${sql.raw(APP_SCHEMA)}"."master_v2_short_meanings" sm
        ON sm.vocabulary_id = v.id AND sm.source_content_hash = md.content_sha256 AND sm.validation_status = 'VERIFIED'
      WHERE lower(v.word) LIKE lower(${containsPattern}) ESCAPE ${escapeCharacter}
         OR lower(COALESCE(md.source_provenance->'masterV2Identity'->>'sourceMeaningVi', '')) LIKE lower(${containsPattern}) ESCAPE ${escapeCharacter}
         OR lower(COALESCE(v.vietnamese_override, v.vietnamese)) LIKE lower(${containsPattern}) ESCAPE ${escapeCharacter}
    ),
    topic_matches AS (
      SELECT
        'TOPIC'::text AS entity_type,
        t.id,
        t.name AS title,
        NULL::text AS subtitle,
        NULL::text AS subtitle_label,
        NULL::text AS image_url,
        NULL::text AS topic,
        NULL::text AS level,
        t.description,
        NULL::bigint AS vocabulary_count,
        NULL::text AS grade,
        CASE
          WHEN lower(t.name) = lower(${query.q}) THEN 0
          WHEN lower(t.name) LIKE lower(${prefixPattern}) ESCAPE ${escapeCharacter} THEN 1
          WHEN lower(t.name) LIKE lower(${containsPattern}) ESCAPE ${escapeCharacter} THEN 2
          ELSE 3
        END::integer AS match_rank,
        t.sort_order AS stable_order
      FROM "${sql.raw(APP_SCHEMA)}"."topics" t
      WHERE t.enabled = true AND t.review_status = 'APPROVED'
        AND (
          lower(t.name) LIKE lower(${containsPattern}) ESCAPE ${escapeCharacter}
          OR lower(t.description) LIKE lower(${containsPattern}) ESCAPE ${escapeCharacter}
        )
        AND EXISTS (
          SELECT 1
          FROM eligible_vocabulary ev
          JOIN "${sql.raw(APP_SCHEMA)}"."vocabularies" v ON v.id = ev.id
          WHERE ${topicMembership(sql`v.id`, sql`t.id`)}
        )
    ),
    learning_set_matches AS (
      SELECT
        'LEARNING_SET'::text AS entity_type,
        ls.id,
        ls.name AS title,
        NULL::text AS subtitle,
        NULL::text AS subtitle_label,
        NULL::text AS image_url,
        NULL::text AS topic,
        NULL::text AS level,
        ls.description,
        COUNT(DISTINCT v.id) FILTER (WHERE v.enabled = true)::bigint AS vocabulary_count,
        ls.grade::text AS grade,
        CASE
          WHEN lower(ls.name) = lower(${query.q}) THEN 0
          WHEN lower(ls.name) LIKE lower(${prefixPattern}) ESCAPE ${escapeCharacter} THEN 1
          WHEN lower(ls.name) LIKE lower(${containsPattern}) ESCAPE ${escapeCharacter} THEN 2
          ELSE 3
        END::integer AS match_rank,
        ls.sort_order AS stable_order
      FROM "${sql.raw(APP_SCHEMA)}"."learning_sets" ls
      LEFT JOIN "${sql.raw(APP_SCHEMA)}"."learning_set_items" lsi ON lsi.learning_set_id = ls.id
      LEFT JOIN "${sql.raw(APP_SCHEMA)}"."vocabularies" v ON v.id = lsi.vocabulary_id
      WHERE ls.enabled = true
        AND ${collectionSearchEnabled}
        AND (
          lower(ls.name) LIKE lower(${containsPattern}) ESCAPE ${escapeCharacter}
          OR lower(ls.description) LIKE lower(${containsPattern}) ESCAPE ${escapeCharacter}
        )
      GROUP BY ls.id, ls.name, ls.description, ls.grade, ls.sort_order
    ),
    all_matches AS (
      SELECT * FROM vocabulary_matches
      UNION ALL SELECT * FROM topic_matches
      UNION ALL SELECT * FROM learning_set_matches
    ),
    ranked_matches AS (
      SELECT *, row_number() OVER (
        PARTITION BY entity_type
        ORDER BY match_rank ASC, stable_order ASC, lower(title) COLLATE "C" ASC, id ASC
      ) AS entity_rank
      FROM all_matches
    )
    SELECT entity_type, id, title, subtitle, subtitle_label, image_url, topic, level, description, vocabulary_count, grade
    FROM ranked_matches
    WHERE entity_rank <= ${query.limit}
    ORDER BY
      CASE entity_type WHEN 'VOCABULARY' THEN 0 WHEN 'TOPIC' THEN 1 ELSE 2 END ASC,
      entity_rank ASC
  `);
  return rowsOf<SearchRow>(result);
}

export type GlobalSearchService = {
  search: (userId: string, learnerId: string, query: GlobalSearchQuery) => Promise<GlobalSearchResponse>;
};

export function createGlobalSearchService(database: GlobalSearchDatabase, options: { datasetVersion?: VocabularyDatasetVersion } = {}): GlobalSearchService {
  const datasetVersion = options.datasetVersion ?? "legacy";
  return {
    async search(userId, learnerId, query) {
      const ownership = await authorizeLearnerOwnership(database, userId, learnerId);
      if (ownership.decision === "FORBIDDEN") throw new GlobalSearchServiceError("HOUSEHOLD_ACCESS_DENIED", 403);
      try {
        const rows = await searchRows(database, ownership.learnerId, query, datasetVersion);
        const vocabulary = [] as GlobalSearchResponse["vocabulary"];
        const topics = [] as GlobalSearchResponse["topics"];
        const learningSets = [] as GlobalSearchResponse["learningSets"];

        for (const row of rows) {
          const id = safeInteger(row.id);
          const title = String(row.title);
          if (row.entity_type === "VOCABULARY") {
            if (vocabulary.length >= query.limit) continue;
            vocabulary.push({
              type: "VOCABULARY",
              id,
              title,
              subtitle: String(row.subtitle),
              subtitleLabel: row.subtitle_label === "Nghĩa tiếng Việt" ? "Nghĩa tiếng Việt" : "Giải thích nghĩa",
              imageUrl: nullableText(row.image_url),
              topic: nullableText(row.topic),
              level: nullableText(row.level) as GlobalSearchResponse["vocabulary"][number]["level"]
            });
          } else if (row.entity_type === "TOPIC") {
            if (topics.length >= query.limit) continue;
            topics.push({ type: "TOPIC", id, title, description: String(row.description) });
          } else if (row.entity_type === "LEARNING_SET") {
            if (learningSets.length >= query.limit) continue;
            learningSets.push({
              type: "LEARNING_SET",
              id,
              title,
              description: String(row.description),
              vocabularyCount: safeInteger(row.vocabulary_count),
              grade: nullableText(row.grade) as GlobalSearchResponse["learningSets"][number]["grade"]
            });
          } else {
            throw new GlobalSearchServiceError("INTERNAL_ERROR", 500);
          }
        }

        const response = { query: query.q, vocabulary, topics, learningSets };
        const parsed = globalSearchResponseSchema.safeParse(response);
        if (!parsed.success) throw new GlobalSearchServiceError("INTERNAL_ERROR", 500);
        return parsed.data;
      } catch (error) {
        if (error instanceof GlobalSearchServiceError) throw error;
        throw new GlobalSearchServiceError("INTERNAL_ERROR", 500);
      }
    }
  };
}
