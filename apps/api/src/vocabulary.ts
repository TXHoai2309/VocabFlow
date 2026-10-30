import { vocabularyProjectionTable } from "./vocabulary-dataset-version";
import { editorialPreviewDisplayForm, editorialPreviewWord, editorialPreviewExampleEn, editorialPreviewField, editorialPreviewMeaning, editorialPreviewMeaningStatus, editorialPreviewTags } from "./editorial-local-preview";
import { sql, type SQL } from "drizzle-orm";
import {
  APP_SCHEMA,
  vocabularyDtoSchema,
  type VocabularyLevel,
  type VocabularyDto
} from "@vocabflow/contracts";
import { LearnerServiceError, resolveHouseholdId } from "./learners";
import { jsonArray, jsonObject, vocabularyDatasetPredicate, type VocabularyDatasetVersion } from "./vocabulary-dataset-version";

export type VocabularyDatabase = {
  execute: (query: SQL) => Promise<unknown>;
};

export type VocabularyServiceErrorCode =
  | "HOUSEHOLD_ACCESS_DENIED"
  | "INTERNAL_ERROR";

export class VocabularyServiceError extends Error {
  readonly code: VocabularyServiceErrorCode;
  readonly status: 403 | 500;

  constructor(code: VocabularyServiceErrorCode, status: 403 | 500) {
    super(code);
    this.name = "VocabularyServiceError";
    this.code = code;
    this.status = status;
  }
}

function rowsOf<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === "object" && Array.isArray((result as { rows?: unknown }).rows)) {
    return (result as { rows: T[] }).rows;
  }
  throw new VocabularyServiceError("INTERNAL_ERROR", 500);
}

type VocabularyRow = {
  id: number | string;
  word: string;
  ipa: string | null;
  vietnamese: string;
  source_meaning_vi?: string | null;
  short_meaning_vi?: string | null;
  short_meaning_status?: string | null;
  definition_en: string | null;
  example_en: string | null;
  image_url: string | null;
  audio_url: string | null;
  topic: string | null;
  level: string | null;
  enabled: boolean;
  content_version: number | string;
  master_sense_identity?: string | null;
  display_form?: string | null;
  part_of_speech?: string | null;
  cefr?: string | null;
  tags?: unknown;
  examples?: unknown;
  content_sha256?: string | null;
  content_review_decision?: "PASS" | null;
  editorial_status?: "DRAFT" | null;
  rights_status?: "UNKNOWN_REVIEW_REQUIRED" | null;
  development_media?: unknown;
};

function nullableText(value: unknown) {
  return value == null ? null : String(value);
}

function toVocabularyDto(row: VocabularyRow): VocabularyDto {
  const id = Number(row.id);
  const contentVersion = Number(row.content_version);
  const media = jsonObject(row.development_media);
  const images = jsonArray(media?.images);
  const wordAudio = jsonArray(media?.wordAudio);
  const exampleAudio = jsonArray(media?.exampleAudio);
  const singleImage = images?.length === 1 ? jsonObject(images[0]) : undefined;
  const dto = {
    id,
    word: String(row.word),
    ipa: nullableText(row.ipa),
    vietnamese: String(row.vietnamese),
    ...(row.source_meaning_vi?.trim() ? { sourceMeaningVi: row.source_meaning_vi.trim() } : {}),
    ...(row.short_meaning_status === "VERIFIED" && row.short_meaning_vi?.trim() ? { shortMeaningVi: row.short_meaning_vi.trim(), shortMeaningStatus: "VERIFIED" as const } : {}),
    definitionEn: nullableText(row.definition_en),
    exampleEn: nullableText(row.example_en),
    imageUrl: images ? (singleImage ? nullableText(singleImage.url) : null) : nullableText(row.image_url),
    audioUrl: media ? null : nullableText(row.audio_url),
    topic: nullableText(row.topic),
    level: row.level == null ? null : String(row.level),
    enabled: row.enabled === true,
    contentVersion,
    ...(row.master_sense_identity ? { masterSenseIdentity: String(row.master_sense_identity) } : {}),
    ...(row.display_form ? { displayForm: String(row.display_form) } : {}),
    ...(row.part_of_speech ? { partOfSpeech: String(row.part_of_speech) } : {}),
    ...(row.cefr ? { cefr: String(row.cefr) } : {}),
    ...(Array.isArray(row.tags) ? { tags: row.tags as string[] } : {}),
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
  };
  const parsed = vocabularyDtoSchema.safeParse(dto);
  if (!parsed.success) throw new VocabularyServiceError("INTERNAL_ERROR", 500);
  return parsed.data;
}

export type VocabularyService = {
  list: (userId: string, level?: VocabularyLevel) => Promise<VocabularyDto[]>;
};

export function createVocabularyService(database: VocabularyDatabase, options: { datasetVersion?: VocabularyDatasetVersion } = {}): VocabularyService {
  return {
    async list(userId, level) {
      try {
        // Household membership is an authorization gate only. The vocabulary
        // query below intentionally has no household_id or learner_id scope.
        await resolveHouseholdId(database, userId);
      } catch (error) {
        if (error instanceof LearnerServiceError && error.code === "HOUSEHOLD_ACCESS_DENIED") {
          throw new VocabularyServiceError("HOUSEHOLD_ACCESS_DENIED", 403);
        }
        throw new VocabularyServiceError("INTERNAL_ERROR", 500);
      }

      return readPublicVocabulary(database, options, level);
    }
  };
}

/** Enabled catalog content only; never reads household or learner data. */
export async function readPublicVocabulary(database: VocabularyDatabase, options: { datasetVersion?: VocabularyDatasetVersion; ids?: number[] } = {}, level?: VocabularyLevel): Promise<VocabularyDto[]> {
  const datasetVersion = options.datasetVersion ?? "legacy";
  if (options.ids?.length === 0) return [];
  try {
    const result = await database.execute(sql`
      SELECT id, ${editorialPreviewWord} AS word, ipa, COALESCE(vietnamese_override, vietnamese) AS vietnamese,
             definition_en, ${editorialPreviewExampleEn} AS example_en,
             CASE WHEN image_quarantined THEN NULL ELSE image_url END AS image_url,
             audio_url, topic, enabled, content_version, level,
             md.proposal_key AS master_sense_identity,
             md.source_provenance->'masterV2Identity'->>'sourceMeaningVi' AS source_meaning_vi,
             ${editorialPreviewMeaning} AS short_meaning_vi, ${editorialPreviewMeaningStatus} AS short_meaning_status,
             ${editorialPreviewDisplayForm} AS display_form,
             md.part_of_speech, md.cefr, ${editorialPreviewTags} AS tags, ${editorialPreviewField("examples", sql`md.examples`)} AS examples, md.content_sha256,
             md.content_review_decision, md.editorial_status, md.rights_status, ${editorialPreviewField("media", sql`md.development_media`)} AS development_media
      FROM "${sql.raw(APP_SCHEMA)}"."vocabularies" v
      LEFT JOIN ${vocabularyProjectionTable(datasetVersion)} md ON md.vocabulary_id = v.id
      LEFT JOIN "${sql.raw(APP_SCHEMA)}"."master_v2_short_meanings" sm
        ON sm.vocabulary_id = v.id AND sm.source_content_hash = md.content_sha256 AND sm.validation_status = 'VERIFIED'
      WHERE enabled = true
        AND ${vocabularyDatasetPredicate("v", datasetVersion)}
        ${options.ids ? sql`AND v.id IN (${sql.join(options.ids.map((id) => sql`${id}`), sql`, `)})` : sql``}
        ${level ? sql`AND level = ${level}` : sql``}
      ORDER BY v.id ASC
    `);
    return rowsOf<VocabularyRow>(result).map(toVocabularyDto);
  } catch (error) {
    if (error instanceof VocabularyServiceError) throw error;
    throw new VocabularyServiceError("INTERNAL_ERROR", 500);
  }
}
