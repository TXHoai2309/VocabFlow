import { vocabularyProjectionTable } from "./vocabulary-dataset-version";
import { editorialPreviewDisplayForm, editorialPreviewWord, editorialPreviewExampleEn, editorialPreviewField, editorialPreviewMeaning, editorialPreviewMeaningStatus, editorialPreviewTags } from "./editorial-local-preview";
import { sql, type SQL } from "drizzle-orm";
import {
  APP_SCHEMA,
  vocabularyDtoSchema,
  weakWordsResponseSchema,
  type ReviewQueueItem,
  type VocabularyDto,
  type WeakWordsClassification,
  type WeakWordsItem,
  type WeakWordsResponse,
  type WeakWordsStatus
} from "@vocabflow/contracts";
import { authorizeLearnerOwnership } from "./learners";
import { householdLocalDate } from "./reviews";
import { jsonArray, jsonObject, vocabularyDatasetPredicate, type VocabularyDatasetVersion } from "./vocabulary-dataset-version";

export type WeakWordsDatabase = { execute: (query: SQL) => Promise<unknown> };
export type WeakWordsQuery = { q: string; status: WeakWordsStatus | null; page: number; pageSize: number };

export type WeakWordsServiceErrorCode = "HOUSEHOLD_ACCESS_DENIED" | "INVALID_REQUEST" | "INTERNAL_ERROR";

export class WeakWordsServiceError extends Error {
  readonly code: WeakWordsServiceErrorCode;
  readonly status: 400 | 403 | 500;

  constructor(code: WeakWordsServiceErrorCode, status: 400 | 403 | 500) {
    super(code);
    this.name = "WeakWordsServiceError";
    this.code = code;
    this.status = status;
  }
}

type QueryRow = {
  summary_review_count: unknown;
  summary_remembered_count: unknown;
  id: unknown;
  word: unknown;
  ipa: unknown;
  vietnamese: unknown;
  source_meaning_vi?: unknown;
  short_meaning_vi?: unknown;
  short_meaning_status?: unknown;
  definition_en: unknown;
  example_en: unknown;
  image_url: unknown;
  audio_url: unknown;
  topic: unknown;
  level: unknown;
  enabled: unknown;
  content_version: unknown;
  learning_state: unknown;
  next_review_date: unknown;
  revision: unknown;
  review_count: unknown;
  remembered_count: unknown;
  forgotten_count: unknown;
  master_sense_identity?: unknown;
  display_form?: unknown;
  part_of_speech?: unknown;
  cefr?: unknown;
  tags?: unknown;
  examples?: unknown;
  content_sha256?: unknown;
  content_review_decision?: unknown;
  editorial_status?: unknown;
  rights_status?: unknown;
  development_media?: unknown;
};

type Candidate = WeakWordsItem & { queueType: ReviewQueueItem["queueType"] };

function rowsOf<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === "object" && Array.isArray((result as { rows?: unknown }).rows)) {
    return (result as { rows: T[] }).rows;
  }
  throw new WeakWordsServiceError("INTERNAL_ERROR", 500);
}

function safeCount(value: unknown): number {
  try {
    const parsed = typeof value === "number" ? BigInt(value) : BigInt(String(value));
    if (parsed < 0n || parsed > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("UNSAFE_COUNT");
    return Number(parsed);
  } catch {
    throw new WeakWordsServiceError("INTERNAL_ERROR", 500);
  }
}

function percentage(remembered: number, total: number): number | null {
  return total === 0 ? null : Math.round((remembered / total) * 100);
}

export function classifyWeakWord(
  learningState: "LEARNING" | "MASTERED",
  reviewCount: number,
  rememberedCount: number
): WeakWordsClassification {
  if (reviewCount >= 2 && rememberedCount * 100 < reviewCount * 60) return "WEAK";
  return learningState === "LEARNING" ? "LEARNING" : "STABLE";
}

function localDateOrdinal(date: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new WeakWordsServiceError("INTERNAL_ERROR", 500);
  const value = Date.parse(`${date}T00:00:00.000Z`);
  if (!Number.isFinite(value)) throw new WeakWordsServiceError("INTERNAL_ERROR", 500);
  return value / 86_400_000;
}

function dueData(nextReviewDate: string | null, reviewDate: string) {
  if (nextReviewDate === null) return { dueStatus: "NOT_SCHEDULED" as const, daysUntilDue: null };
  const daysUntilDue = localDateOrdinal(nextReviewDate) - localDateOrdinal(reviewDate);
  return {
    dueStatus: daysUntilDue < 0 ? "OVERDUE" as const
      : daysUntilDue === 0 ? "DUE_TODAY" as const
        : "UPCOMING" as const,
    daysUntilDue
  };
}

function vocabularyFromRow(row: QueryRow): VocabularyDto {
  const media = jsonObject(row.development_media);
  const images = jsonArray(media?.images);
  const singleImage = images?.length === 1 ? jsonObject(images[0]) : undefined;
  const wordAudio = jsonArray(media?.wordAudio);
  const exampleAudio = jsonArray(media?.exampleAudio);
  const parsed = vocabularyDtoSchema.safeParse({
    id: safeCount(row.id),
    word: row.word,
    ipa: row.ipa,
    vietnamese: row.vietnamese,
    ...(typeof row.source_meaning_vi === "string" && row.source_meaning_vi.trim() ? { sourceMeaningVi: row.source_meaning_vi.trim() } : {}),
    ...(row.short_meaning_status === "VERIFIED" && typeof row.short_meaning_vi === "string" && row.short_meaning_vi.trim() ? { shortMeaningVi: row.short_meaning_vi.trim(), shortMeaningStatus: "VERIFIED" as const } : {}),
    definitionEn: row.definition_en,
    exampleEn: row.example_en,
    imageUrl: images ? (singleImage ? String(singleImage.url ?? "") : null) : row.image_url,
    audioUrl: media ? null : row.audio_url,
    topic: row.topic,
    level: row.level,
    enabled: row.enabled,
    contentVersion: safeCount(row.content_version),
    ...(row.master_sense_identity ? { masterSenseIdentity: String(row.master_sense_identity) } : {}),
    ...(row.display_form ? { displayForm: String(row.display_form) } : {}),
    ...(row.part_of_speech ? { partOfSpeech: String(row.part_of_speech) } : {}),
    ...(row.cefr ? { cefr: String(row.cefr) } : {}),
    ...(Array.isArray(row.tags) ? { tags: row.tags } : {}),
    ...(Array.isArray(row.examples) ? { examples: row.examples } : {}),
    ...(row.content_sha256 ? { contentHash: String(row.content_sha256) } : {}),
    ...(row.content_review_decision === "PASS" ? { contentReviewStatus: "PASS" as const } : {}),
    ...(row.editorial_status === "DRAFT" ? { editorialStatus: "DRAFT" as const } : {}),
    ...(row.rights_status === "UNKNOWN_REVIEW_REQUIRED" ? { rightsStatus: "UNKNOWN_REVIEW_REQUIRED" as const } : {}),
    ...(images || wordAudio || exampleAudio ? { developmentMedia: {
      ...(images ? { images } : {}),
      ...(wordAudio ? { wordAudio } : {}),
      ...(exampleAudio ? { exampleAudio } : {})
    } } : {}),
    ...(singleImage?.reviewStatus ? { imageMediaStatus: singleImage.reviewStatus === "ACCEPTED_MAPPING" ? "ACCEPTED_MAPPING" as const : singleImage.reviewStatus === "AMBIGUOUS" ? "AMBIGUOUS" as const : "PROPOSED" as const } : {})
  });
  if (!parsed.success) throw new WeakWordsServiceError("INTERNAL_ERROR", 500);
  return parsed.data;
}

function candidateFromRow(row: QueryRow, reviewDate: string): Candidate {
  if (row.learning_state !== "LEARNING" && row.learning_state !== "MASTERED") {
    throw new WeakWordsServiceError("INTERNAL_ERROR", 500);
  }
  const learningState = row.learning_state;
  const reviewCount = safeCount(row.review_count);
  const rememberedCount = safeCount(row.remembered_count);
  const forgottenCount = safeCount(row.forgotten_count);
  if (rememberedCount + forgottenCount !== reviewCount || rememberedCount > reviewCount) {
    throw new WeakWordsServiceError("INTERNAL_ERROR", 500);
  }
  const nextReviewDate = row.next_review_date === null ? null : String(row.next_review_date);
  if (nextReviewDate !== null) localDateOrdinal(nextReviewDate);
  const { dueStatus, daysUntilDue } = dueData(nextReviewDate, reviewDate);
  const queueType = daysUntilDue !== null && daysUntilDue <= 0 ? "DUE" : "VOLUNTARY";
  return {
    vocabulary: vocabularyFromRow(row),
    learningState,
    weaknessStatus: classifyWeakWord(learningState, reviewCount, rememberedCount),
    recentAccuracy: percentage(rememberedCount, reviewCount),
    reviewCount,
    rememberedCount,
    forgottenCount,
    nextReviewDate,
    dueStatus,
    daysUntilDue,
    expectedRevision: safeCount(row.revision),
    queueType
  };
}

function priority(candidate: Candidate): number {
  const statusOffset = candidate.weaknessStatus === "WEAK" ? 0 : candidate.weaknessStatus === "LEARNING" ? 3 : 7;
  if (candidate.weaknessStatus === "WEAK") {
    return candidate.dueStatus === "OVERDUE" ? 0 : candidate.dueStatus === "DUE_TODAY" ? 1 : 2;
  }
  const dueOffset = candidate.dueStatus === "OVERDUE" ? 0
    : candidate.dueStatus === "DUE_TODAY" ? 1
      : candidate.dueStatus === "UPCOMING" ? 2 : 3;
  return statusOffset + dueOffset;
}

function sortCandidates(candidates: Candidate[]): Candidate[] {
  return candidates.sort((left, right) => {
    const group = priority(left) - priority(right);
    if (group !== 0) return group;
    if (left.recentAccuracy !== right.recentAccuracy) {
      if (left.recentAccuracy === null) return 1;
      if (right.recentAccuracy === null) return -1;
      return left.recentAccuracy - right.recentAccuracy;
    }
    if (left.nextReviewDate !== right.nextReviewDate) {
      if (left.nextReviewDate === null) return 1;
      if (right.nextReviewDate === null) return -1;
      const dateOrder = left.nextReviewDate.localeCompare(right.nextReviewDate);
      if (dateOrder !== 0) return dateOrder;
    }
    return left.vocabulary.id - right.vocabulary.id;
  });
}

export function parseWeakWordsQuery(params: URLSearchParams): WeakWordsQuery | null {
  const keys = [...params.keys()];
  if (new Set(keys).size !== keys.length || keys.some((key) => !["q", "status", "page", "pageSize"].includes(key))) return null;
  const qValue = params.get("q") ?? "";
  const q = qValue.trim();
  if (q.length > 100) return null;
  const statusValue = params.get("status");
  if (statusValue !== null && !["weak", "learning", "stable"].includes(statusValue)) return null;
  const pageValue = params.get("page");
  const page = pageValue === null ? 1 : /^\d+$/.test(pageValue) ? Number(pageValue) : NaN;
  const pageSizeValue = params.get("pageSize");
  const pageSize = pageSizeValue === null ? 20 : /^\d+$/.test(pageSizeValue) ? Number(pageSizeValue) : NaN;
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 50) return null;
  return {
    q,
    status: statusValue ? statusValue as WeakWordsStatus : null,
    page,
    pageSize
  };
}

async function householdTimezone(database: WeakWordsDatabase, householdId: string): Promise<string> {
  const result = await database.execute(sql`
    SELECT timezone FROM "${sql.raw(APP_SCHEMA)}"."households"
    WHERE id = ${householdId}::uuid LIMIT 1
  `);
  const [row] = rowsOf<{ timezone: unknown }>(result);
  if (!row || typeof row.timezone !== "string" || row.timezone.length === 0) {
    throw new WeakWordsServiceError("INTERNAL_ERROR", 500);
  }
  return row.timezone;
}

type WeakWordsData = {
  summary: WeakWordsResponse["summary"];
  reviewDate: string;
  candidates: Candidate[];
};

async function loadWeakWordsData(database: WeakWordsDatabase, learnerId: string, reviewDate: string, datasetVersion: VocabularyDatasetVersion): Promise<WeakWordsData> {
  const result = await database.execute(sql`
    WITH eligible_vocabulary AS (
      SELECT DISTINCT v.id, ${editorialPreviewWord} AS word, v.ipa,
             COALESCE(v.vietnamese_override, v.vietnamese) AS vietnamese,
             md.source_provenance->'masterV2Identity'->>'sourceMeaningVi' AS source_meaning_vi,
             ${editorialPreviewMeaning} AS short_meaning_vi, ${editorialPreviewMeaningStatus} AS short_meaning_status,
             v.definition_en, ${editorialPreviewExampleEn} AS example_en,
             CASE WHEN v.image_quarantined THEN NULL ELSE v.image_url END AS image_url,
             v.audio_url, v.topic, v.level, v.enabled, v.content_version,
             md.proposal_key AS master_sense_identity,
             ${editorialPreviewDisplayForm} AS display_form,
             md.part_of_speech, md.cefr, ${editorialPreviewTags} AS tags, ${editorialPreviewField("examples", sql`md.examples`)} AS examples, md.content_sha256,
             md.content_review_decision, md.editorial_status, md.rights_status, ${editorialPreviewField("media", sql`md.development_media`)} AS development_media
      FROM "${sql.raw(APP_SCHEMA)}"."vocabularies" v
      LEFT JOIN ${vocabularyProjectionTable(datasetVersion)} md ON md.vocabulary_id = v.id
      LEFT JOIN "${sql.raw(APP_SCHEMA)}"."master_v2_short_meanings" sm
        ON sm.vocabulary_id = v.id AND sm.source_content_hash = md.content_sha256 AND sm.validation_status = 'VERIFIED'
      WHERE v.enabled = true
        AND ${vocabularyDatasetPredicate("v", datasetVersion)}
        AND (${datasetVersion !== "legacy" ? sql`true` : sql`EXISTS (
          SELECT 1
          FROM "${sql.raw(APP_SCHEMA)}"."learner_learning_sets" lls
          JOIN "${sql.raw(APP_SCHEMA)}"."learning_sets" ls
            ON ls.id = lls.learning_set_id AND ls.enabled = true
          JOIN "${sql.raw(APP_SCHEMA)}"."learning_set_items" lsi
            ON lsi.learning_set_id = ls.id AND lsi.vocabulary_id = v.id
          WHERE lls.learner_id = ${learnerId}::uuid AND lls.active = true
        )`})
    ),
    review_window AS (
      SELECT re.vocabulary_id, re.result::text AS result, re.review_id, re.reviewed_at
      FROM "${sql.raw(APP_SCHEMA)}"."review_events" re
      JOIN eligible_vocabulary ev ON ev.id = re.vocabulary_id
      WHERE re.learner_id = ${learnerId}::uuid
        AND re.review_date >= (${reviewDate}::date - INTERVAL '29 days')::date
        AND re.review_date <= ${reviewDate}::date
    ),
    ranked_reviews AS (
      SELECT vocabulary_id, result,
             ROW_NUMBER() OVER (
               PARTITION BY vocabulary_id
               ORDER BY reviewed_at DESC, review_id DESC
             ) AS review_rank
      FROM review_window
    ),
    per_vocabulary_reviews AS (
      SELECT vocabulary_id,
             COUNT(*) AS review_count,
             COUNT(*) FILTER (WHERE result = 'REMEMBERED') AS remembered_count,
             COUNT(*) FILTER (WHERE result = 'FORGOTTEN') AS forgotten_count
      FROM ranked_reviews
      WHERE review_rank <= 10
      GROUP BY vocabulary_id
    ),
    recent_summary AS (
      SELECT COUNT(*) AS review_count,
             COUNT(*) FILTER (WHERE result = 'REMEMBERED') AS remembered_count
      FROM review_window
    ),
    candidates AS (
      SELECT ev.*, lp.status::text AS learning_state,
             lp.next_review_date::text AS next_review_date, lp.revision,
             COALESCE(pvr.review_count, 0) AS review_count,
             COALESCE(pvr.remembered_count, 0) AS remembered_count,
             COALESCE(pvr.forgotten_count, 0) AS forgotten_count
      FROM eligible_vocabulary ev
      JOIN "${sql.raw(APP_SCHEMA)}"."learner_progress" lp
        ON lp.vocabulary_id = ev.id AND lp.learner_id = ${learnerId}::uuid
      LEFT JOIN per_vocabulary_reviews pvr ON pvr.vocabulary_id = ev.id
      WHERE lp.status::text IN ('LEARNING', 'MASTERED')
    )
    SELECT rs.review_count AS summary_review_count,
           rs.remembered_count AS summary_remembered_count,
           c.id, c.word, c.ipa, c.vietnamese, c.source_meaning_vi, c.short_meaning_vi, c.short_meaning_status, c.definition_en, c.example_en,
           c.image_url, c.audio_url, c.topic, c.level, c.enabled,
           c.content_version, c.learning_state, c.next_review_date,
           c.revision, c.review_count, c.remembered_count, c.forgotten_count,
           c.master_sense_identity, c.display_form, c.part_of_speech, c.cefr, c.tags, c.examples,
           c.content_sha256, c.content_review_decision, c.editorial_status, c.rights_status, c.development_media
    FROM recent_summary rs
    LEFT JOIN candidates c ON true
    ORDER BY c.id ASC NULLS FIRST
  `);
  const rows = rowsOf<QueryRow>(result);
  const first = rows[0];
  if (!first) throw new WeakWordsServiceError("INTERNAL_ERROR", 500);
  const recentReviewCount = safeCount(first.summary_review_count);
  const recentRememberedCount = safeCount(first.summary_remembered_count);
  if (recentRememberedCount > recentReviewCount) throw new WeakWordsServiceError("INTERNAL_ERROR", 500);
  const candidates = rows.filter((row) => row.id !== null).map((row) => candidateFromRow(row, reviewDate));
  const dueCount = candidates.filter((candidate) => candidate.queueType === "DUE").length;
  const weakCount = candidates.filter((candidate) => candidate.weaknessStatus === "WEAK").length;
  return {
    reviewDate,
    candidates: sortCandidates(candidates),
    summary: {
      weakCount,
      dueCount,
      recentAccuracy: percentage(recentRememberedCount, recentReviewCount),
      recentReviewCount
    }
  };
}

function matchesStatus(item: Candidate, status: WeakWordsStatus | null) {
  if (status !== null) return item.weaknessStatus.toLocaleLowerCase() === status;
  return item.weaknessStatus === "WEAK"
    || item.dueStatus === "OVERDUE"
    || item.dueStatus === "DUE_TODAY";
}

function matchesSearch(item: Candidate, query: string) {
  if (!query) return true;
  const normalized = query.toLocaleLowerCase("vi-VN");
  return item.vocabulary.word.toLocaleLowerCase("vi-VN").includes(normalized)
    || item.vocabulary.vietnamese.toLocaleLowerCase("vi-VN").includes(normalized);
}

export type WeakWordsService = {
  list: (userId: string, learnerId: string, query?: WeakWordsQuery) => Promise<WeakWordsResponse>;
};

export function createWeakWordsService(database: WeakWordsDatabase, options: { now?: () => Date; datasetVersion?: VocabularyDatasetVersion } = {}): WeakWordsService {
  const now = options.now ?? (() => new Date());
  const datasetVersion = options.datasetVersion ?? "legacy";
  return {
    async list(userId, learnerId, query = { q: "", status: null, page: 1, pageSize: 20 }) {
      const ownership = await authorizeLearnerOwnership(database, userId, learnerId);
      if (ownership.decision === "FORBIDDEN") throw new WeakWordsServiceError("HOUSEHOLD_ACCESS_DENIED", 403);
      try {
        const timezone = await householdTimezone(database, ownership.householdId);
        const reviewDate = householdLocalDate(now(), timezone);
        const data = await loadWeakWordsData(database, ownership.learnerId, reviewDate, datasetVersion);
        const filtered = data.candidates.filter((item) => matchesStatus(item, query.status) && matchesSearch(item, query.q));
        const totalItems = filtered.length;
        const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize);
        const page = totalPages === 0 ? 1 : Math.min(query.page, totalPages);
        const offset = (page - 1) * query.pageSize;
        const items = filtered.slice(offset, offset + query.pageSize).map(({ queueType: _queueType, ...item }) => item);
        const response = {
          learnerId: ownership.learnerId,
          reviewDate: data.reviewDate,
          summary: data.summary,
          items,
          pagination: { page, pageSize: query.pageSize, totalItems, totalPages }
        };
        const parsed = weakWordsResponseSchema.safeParse(response);
        if (!parsed.success) throw new WeakWordsServiceError("INTERNAL_ERROR", 500);
        return parsed.data;
      } catch (error) {
        if (error instanceof WeakWordsServiceError) throw error;
        throw new WeakWordsServiceError("INTERNAL_ERROR", 500);
      }
    }
  };
}

export async function resolveWeakReviewQueue(
  database: WeakWordsDatabase,
  learnerId: string,
  reviewDate: string,
  datasetVersion: VocabularyDatasetVersion = "legacy"
): Promise<{ queue: ReviewQueueItem[]; dueCount: number }> {
  try {
    const { candidates } = await loadWeakWordsData(database, learnerId, reviewDate, datasetVersion);
    const weakCandidates = candidates.filter((item) => item.weaknessStatus === "WEAK");
    const dueCount = weakCandidates.filter((item) => item.queueType === "DUE").length;
    const weak = weakCandidates.slice(0, 30);
    const queue = weak.map(({ vocabulary, learningState, nextReviewDate, expectedRevision, queueType }) => ({
      vocabulary,
      status: learningState,
      nextReviewDate,
      expectedRevision,
      queueType
    }));
    return { queue, dueCount };
  } catch (error) {
    if (error instanceof WeakWordsServiceError) throw error;
    throw new WeakWordsServiceError("INTERNAL_ERROR", 500);
  }
}
