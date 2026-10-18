import { sql, type SQL } from "drizzle-orm";
import {
  APP_SCHEMA,
  learnerVocabularyDtoSchema,
  type VocabularyLevel,
  type LearnerVocabularyDto
} from "@vocabflow/contracts";
import { authorizeLearnerOwnership } from "./learners";
import { jsonArray, jsonObject, vocabularyDatasetPredicate, type VocabularyDatasetVersion } from "./vocabulary-dataset-version";

export type LearnerVocabularyDatabase = {
  execute: (query: SQL) => Promise<unknown>;
};

export type LearnerVocabularyServiceErrorCode =
  | "HOUSEHOLD_ACCESS_DENIED"
  | "INTERNAL_ERROR";

export class LearnerVocabularyServiceError extends Error {
  readonly code: LearnerVocabularyServiceErrorCode;
  readonly status: 403 | 500;

  constructor(code: LearnerVocabularyServiceErrorCode, status: 403 | 500) {
    super(code);
    this.name = "LearnerVocabularyServiceError";
    this.code = code;
    this.status = status;
  }
}

type LearnerVocabularyRow = {
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
  throw new LearnerVocabularyServiceError("INTERNAL_ERROR", 500);
}

function safeInteger(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(parsed)) throw new LearnerVocabularyServiceError("INTERNAL_ERROR", 500);
  return parsed;
}

function nullableText(value: unknown): string | null {
  return value == null ? null : String(value);
}

function toLearnerVocabularyDto(row: LearnerVocabularyRow): LearnerVocabularyDto {
  const media = jsonObject(row.development_media);
  const images = jsonArray(media?.images);
  const singleImage = images?.length === 1 ? jsonObject(images[0]) : undefined;
  const wordAudio = jsonArray(media?.wordAudio);
  const exampleAudio = jsonArray(media?.exampleAudio);
  const parsed = learnerVocabularyDtoSchema.safeParse({
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
  });
  if (!parsed.success) throw new LearnerVocabularyServiceError("INTERNAL_ERROR", 500);
  return parsed.data;
}

export type LearnerVocabularyService = {
  list: (userId: string, learnerId: string, level?: VocabularyLevel, vocabularyId?: number) => Promise<LearnerVocabularyDto[]>;
};

export function createLearnerVocabularyService(database: LearnerVocabularyDatabase, options: { datasetVersion?: VocabularyDatasetVersion } = {}): LearnerVocabularyService {
  const datasetVersion = options.datasetVersion ?? "legacy";
  return {
    async list(userId, learnerId, level, vocabularyId) {
      const ownership = await authorizeLearnerOwnership(database, userId, learnerId);
      if (ownership.decision === "FORBIDDEN") {
        throw new LearnerVocabularyServiceError("HOUSEHOLD_ACCESS_DENIED", 403);
      }

      try {
        const result = await database.execute(sql`
          SELECT
            v.id,
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
            md.proposal_key AS master_sense_identity,
            md.source_provenance->'masterV2Identity'->>'sourceMeaningVi' AS source_meaning_vi,
            md.source_provenance->'masterV2Identity'->>'displayForm' AS display_form,
            md.part_of_speech, md.cefr, md.tags, md.examples, md.content_sha256,
            md.content_review_decision, md.editorial_status, md.rights_status, md.development_media,
            lp.status::text AS progress_status,
            lp.next_review_date
          FROM "${sql.raw(APP_SCHEMA)}"."vocabularies" v
          LEFT JOIN "${sql.raw(APP_SCHEMA)}"."master_v2_development_projections" md ON md.vocabulary_id = v.id
          LEFT JOIN "${sql.raw(APP_SCHEMA)}"."learner_progress" lp
            ON lp.vocabulary_id = v.id
           AND lp.learner_id = ${ownership.learnerId}::uuid
          WHERE v.enabled = true
            AND ${vocabularyDatasetPredicate("v", datasetVersion)}
            ${level ? sql`AND v.level = ${level}` : sql``}
            ${datasetVersion === "v2" && vocabularyId ? sql`AND v.id = ${vocabularyId}` : sql``}
          ORDER BY v.id ASC
        `);
        return rowsOf<LearnerVocabularyRow>(result).map(toLearnerVocabularyDto);
      } catch (error) {
        if (error instanceof LearnerVocabularyServiceError) throw error;
        throw new LearnerVocabularyServiceError("INTERNAL_ERROR", 500);
      }
    }
  };
}
