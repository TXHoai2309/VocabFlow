import { sql, type SQL } from "drizzle-orm";
import {
  APP_SCHEMA,
  learnerSavedVocabularyDtoSchema,
  learnerSavedVocabularyMutationResponseSchema,
  type LearnerSavedVocabularyDto,
  type LearnerSavedVocabularyMutationResponse
} from "@vocabflow/contracts";
import { authorizeLearnerOwnership } from "./learners";
import { jsonArray, jsonObject, vocabularyDatasetPredicate, type VocabularyDatasetVersion } from "./vocabulary-dataset-version";

export type LearnerSavedVocabularyDatabase = {
  execute: (query: SQL) => Promise<unknown>;
};

export type LearnerSavedVocabularyServiceErrorCode =
  | "HOUSEHOLD_ACCESS_DENIED"
  | "VOCABULARY_NOT_FOUND"
  | "INTERNAL_ERROR";

export class LearnerSavedVocabularyServiceError extends Error {
  readonly code: LearnerSavedVocabularyServiceErrorCode;
  readonly status: 403 | 404 | 500;

  constructor(code: LearnerSavedVocabularyServiceErrorCode, status: 403 | 404 | 500) {
    super(code);
    this.name = "LearnerSavedVocabularyServiceError";
    this.code = code;
    this.status = status;
  }
}

type SavedVocabularyRow = {
  id: number | string;
  word: unknown;
  ipa: unknown;
  vietnamese: unknown;
  source_meaning_vi?: unknown;
  definition_en: unknown;
  example_en: unknown;
  image_url: unknown;
  audio_url: unknown;
  topic: unknown;
  level: unknown;
  enabled: unknown;
  content_version: number | string;
  progress_status: unknown;
  next_review_date: unknown;
  saved_at: unknown;
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

function rowsOf<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === "object" && Array.isArray((result as { rows?: unknown }).rows)) {
    return (result as { rows: T[] }).rows;
  }
  throw new LearnerSavedVocabularyServiceError("INTERNAL_ERROR", 500);
}

function safeInteger(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) throw new LearnerSavedVocabularyServiceError("INTERNAL_ERROR", 500);
  return parsed;
}

function nullableText(value: unknown): string | null {
  return value == null ? null : String(value);
}

function timestampToIso(value: unknown): string {
  const parsed = value instanceof Date ? value : typeof value === "string" ? new Date(value) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) throw new LearnerSavedVocabularyServiceError("INTERNAL_ERROR", 500);
  return parsed.toISOString();
}

function toDto(row: SavedVocabularyRow): LearnerSavedVocabularyDto {
  const media = jsonObject(row.development_media);
  const images = jsonArray(media?.images);
  const singleImage = images?.length === 1 ? jsonObject(images[0]) : undefined;
  const wordAudio = jsonArray(media?.wordAudio);
  const exampleAudio = jsonArray(media?.exampleAudio);
  const parsed = learnerSavedVocabularyDtoSchema.safeParse({
    vocabulary: {
      id: safeInteger(row.id),
      word: String(row.word),
      ipa: nullableText(row.ipa),
      vietnamese: String(row.vietnamese),
      ...(typeof row.source_meaning_vi === "string" && row.source_meaning_vi.trim() ? { sourceMeaningVi: row.source_meaning_vi.trim() } : {}),
      definitionEn: nullableText(row.definition_en),
      exampleEn: nullableText(row.example_en),
      imageUrl: images ? (singleImage ? nullableText(singleImage.url) : null) : nullableText(row.image_url),
      audioUrl: media ? null : nullableText(row.audio_url),
      topic: nullableText(row.topic),
      level: row.level == null ? null : String(row.level),
      enabled: row.enabled === true,
      contentVersion: safeInteger(row.content_version),
      status: row.progress_status == null ? "NEW" : String(row.progress_status),
      nextReviewDate: row.next_review_date == null ? null : String(row.next_review_date),
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
    },
    savedAt: timestampToIso(row.saved_at)
  });
  if (!parsed.success) throw new LearnerSavedVocabularyServiceError("INTERNAL_ERROR", 500);
  return parsed.data;
}

function toMutationResponse(value: {
  learnerId: string;
  vocabularyId: number;
  saved: boolean;
  savedAt: string | null;
}): LearnerSavedVocabularyMutationResponse {
  const parsed = learnerSavedVocabularyMutationResponseSchema.safeParse(value);
  if (!parsed.success) throw new LearnerSavedVocabularyServiceError("INTERNAL_ERROR", 500);
  return parsed.data;
}

export type LearnerSavedVocabularyService = {
  list: (userId: string, learnerId: string) => Promise<LearnerSavedVocabularyDto[]>;
  save: (userId: string, learnerId: string, vocabularyId: number) => Promise<LearnerSavedVocabularyMutationResponse>;
  unsave: (userId: string, learnerId: string, vocabularyId: number) => Promise<LearnerSavedVocabularyMutationResponse>;
};

export function createLearnerSavedVocabularyService(database: LearnerSavedVocabularyDatabase, options: { datasetVersion?: VocabularyDatasetVersion } = {}): LearnerSavedVocabularyService {
  const datasetVersion = options.datasetVersion ?? "legacy";
  async function requireOwnership(userId: string, learnerId: string) {
    const ownership = await authorizeLearnerOwnership(database, userId, learnerId);
    if (ownership.decision === "FORBIDDEN") {
      throw new LearnerSavedVocabularyServiceError("HOUSEHOLD_ACCESS_DENIED", 403);
    }
    return ownership;
  }

  return {
    async list(userId, learnerId) {
      const ownership = await requireOwnership(userId, learnerId);
      try {
        const result = await database.execute(sql`
          SELECT v.id,
                 v.word,
                 v.ipa,
                 COALESCE(v.vietnamese_override, v.vietnamese) AS vietnamese,
                 v.definition_en,
                 v.example_en,
                 CASE WHEN v.image_quarantined THEN NULL ELSE v.image_url END AS image_url,
                 v.audio_url,
                 v.topic,
                 v.level,
                 v.enabled,
                 v.content_version,
                 lp.status::text AS progress_status,
                 lp.next_review_date::text AS next_review_date,
                 saved.created_at AS saved_at,
                 md.proposal_key AS master_sense_identity,
                 md.source_provenance->'masterV2Identity'->>'sourceMeaningVi' AS source_meaning_vi,
                 md.source_provenance->'masterV2Identity'->>'displayForm' AS display_form,
                 md.part_of_speech, md.cefr, md.tags, md.examples, md.content_sha256,
                 md.content_review_decision, md.editorial_status, md.rights_status, md.development_media
          FROM "${sql.raw(APP_SCHEMA)}"."learner_saved_vocabulary" saved
          JOIN "${sql.raw(APP_SCHEMA)}"."vocabularies" v ON v.id = saved.vocabulary_id
          LEFT JOIN "${sql.raw(APP_SCHEMA)}"."master_v2_development_projections" md ON md.vocabulary_id = v.id
          LEFT JOIN "${sql.raw(APP_SCHEMA)}"."learner_progress" lp
            ON lp.vocabulary_id = v.id
           AND lp.learner_id = saved.learner_id
          WHERE saved.learner_id = ${ownership.learnerId}::uuid
            AND v.enabled = true
            AND ${vocabularyDatasetPredicate("v", datasetVersion)}
          ORDER BY saved.created_at DESC, v.id ASC
        `);
        return rowsOf<SavedVocabularyRow>(result).map(toDto);
      } catch (error) {
        if (error instanceof LearnerSavedVocabularyServiceError) throw error;
        throw new LearnerSavedVocabularyServiceError("INTERNAL_ERROR", 500);
      }
    },

    async save(userId, learnerId, vocabularyId) {
      const ownership = await requireOwnership(userId, learnerId);
      try {
        const result = await database.execute(sql`
          INSERT INTO "${sql.raw(APP_SCHEMA)}"."learner_saved_vocabulary" (learner_id, vocabulary_id)
          SELECT ${ownership.learnerId}::uuid, v.id
          FROM "${sql.raw(APP_SCHEMA)}"."vocabularies" v
          WHERE v.id = ${vocabularyId}::integer
            AND v.enabled = true
            AND ${vocabularyDatasetPredicate("v", datasetVersion)}
          ON CONFLICT (learner_id, vocabulary_id)
          DO UPDATE SET created_at = "learner_saved_vocabulary".created_at
          RETURNING learner_id::text AS learner_id, vocabulary_id, created_at AS saved_at
        `);
        const [row] = rowsOf<{ learner_id: string; vocabulary_id: number | string; saved_at: unknown }>(result);
        if (!row) throw new LearnerSavedVocabularyServiceError("VOCABULARY_NOT_FOUND", 404);
        return toMutationResponse({
          learnerId: row.learner_id,
          vocabularyId: safeInteger(row.vocabulary_id),
          saved: true,
          savedAt: timestampToIso(row.saved_at)
        });
      } catch (error) {
        if (error instanceof LearnerSavedVocabularyServiceError) throw error;
        throw new LearnerSavedVocabularyServiceError("INTERNAL_ERROR", 500);
      }
    },

    async unsave(userId, learnerId, vocabularyId) {
      const ownership = await requireOwnership(userId, learnerId);
      try {
        await database.execute(sql`
          DELETE FROM "${sql.raw(APP_SCHEMA)}"."learner_saved_vocabulary"
          WHERE learner_id = ${ownership.learnerId}::uuid
            AND vocabulary_id = ${vocabularyId}::integer
            AND vocabulary_id IN (SELECT id FROM "${sql.raw(APP_SCHEMA)}"."vocabularies" v WHERE ${vocabularyDatasetPredicate("v", datasetVersion)})
        `);
        return toMutationResponse({ learnerId: ownership.learnerId, vocabularyId, saved: false, savedAt: null });
      } catch (error) {
        if (error instanceof LearnerSavedVocabularyServiceError) throw error;
        throw new LearnerSavedVocabularyServiceError("INTERNAL_ERROR", 500);
      }
    }
  };
}
