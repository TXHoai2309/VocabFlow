import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { APP_SCHEMA } from "@vocabflow/contracts";
import { DEFAULT_DATASET_ROOT } from "./vocab-media-manifest";
import {
  loadCatalogValidation,
  SOURCE_DATASET_ID,
  type CatalogMediaAvailability,
  type CatalogMediaAvailabilityBySourceId
} from "./import-vocabulary-catalog";
import { openSql, readContext } from "./db-core";
import { assertResolvedTargetBeforeMutation, configuredDatabaseUrl } from "./runtime-validation";
import { getConnectionTarget } from "../config/database-targets";

export const CURATION_VERSION = "VOCABULARY_CURATION_V1" as const;
export const MANIFEST_PATH = join(process.cwd(), "config", "vocabulary-curation-v1.json");

export const CANONICAL_TOPIC_SLUGS = [
  "action", "body", "casual", "challenge", "clothing", "common-place", "communication",
  "computer-office-science", "emotion", "family", "food", "healthy", "miscellaneous", "nature",
  "object-in-house", "photography", "writing-numbers"
] as const;

export type Grade = "GRADE_1" | "GRADE_2" | "GRADE_3";
export type TopicSlug = typeof CANONICAL_TOPIC_SLUGS[number];

export type LearningSetDefinition = {
  slug: string;
  name: string;
  description: string;
  grade: Grade;
  sortOrder: number;
};

export type CurationManifestRecord = {
  sourceDataset: typeof SOURCE_DATASET_ID;
  sourceRecordId: number;
  expectedWord: string;
  grade: Grade;
  topicSlugs: TopicSlug[];
  learningSetSlugs: string[];
  activation: true;
  imagePolicy?: "QUARANTINED";
  vietnameseOverride?: string;
};

export type StarterTopicMapping = {
  vocabularyId: number;
  expectedWord: string;
  topicSlugs: TopicSlug[];
};

export type CurationManifest = {
  version: typeof CURATION_VERSION;
  sourceDataset: typeof SOURCE_DATASET_ID;
  selectionPolicy: {
    reviewedRows: string;
    gradePolicy: string;
    mediaPolicy: string;
    activationPolicy: string;
  };
  learningSets: LearningSetDefinition[];
  records: CurationManifestRecord[];
  starterTopicMappings: StarterTopicMapping[];
};

type CurationCandidateGroup = LearningSetDefinition & { words: string[] };

// These are the human-reviewed selections. Grade is assigned by the named
// group, never inferred from source id, word length, alphabetic order, or topic.
export const CURATION_GROUPS: readonly CurationCandidateGroup[] = [
  { slug: "grade-1-home", name: "Grade 1 Home", description: "Everyday rooms and objects used at home.", grade: "GRADE_1", sortOrder: 60, words: ["armchair", "basket", "bath mat", "bath towel", "bed", "bowl", "chair", "clock", "coffee table", "cup", "curtain", "cushion", "desk", "door", "floor lamp", "fridge", "kitchen", "mirror", "pillow", "sofa"] },
  { slug: "grade-1-family", name: "Grade 1 Family", description: "Core family relationships for first conversations.", grade: "GRADE_1", sortOrder: 70, words: ["aunt", "brother", "child", "cousin", "daughter", "father", "granddaughter", "grandfather", "grandmother", "grandson", "husband", "mother", "nephew", "niece", "parents", "siblings", "sister", "son", "uncle", "wife"] },
  { slug: "grade-1-school", name: "Grade 1 School", description: "A practical school-supplies and classroom routine set.", grade: "GRADE_1", sortOrder: 80, words: ["teacher", "chalkboard", "chalk", "book", "backpack", "pencil", "eraser", "pen", "pencil sharpener", "globe", "glue", "scissors", "ruler", "highlighter", "crayons", "marker", "piece of paper", "spiral notebook", "note pad", "student's desk"] },
  { slug: "grade-1-food", name: "Grade 1 Food", description: "Familiar foods and ingredients for daily life.", grade: "GRADE_1", sortOrder: 90, words: ["apple", "banana", "beans", "bread", "broccoli", "butter", "cake", "candy", "carrot", "cheese", "cherry", "chocolate", "coconut", "cookie", "corn", "cucumber", "donut", "eggplant", "garlic", "grapes"] },
  { slug: "grade-1-actions", name: "Grade 1 Actions", description: "High-frequency actions for simple instructions and stories.", grade: "GRADE_1", sortOrder: 100, words: ["kick", "walk", "run", "sit", "stand", "jump", "push", "pull", "lift", "throw", "catch", "hit", "punch", "dance", "sing", "laugh", "cry", "eat", "drink", "sleep"] },
  { slug: "grade-2-body", name: "Grade 2 Body", description: "Common body words for health and classroom language.", grade: "GRADE_2", sortOrder: 110, words: ["arm", "leg", "navel", "chest", "wrist", "thigh", "knee", "head", "neck", "hand", "thumb", "finger", "foot", "heel", "ankle", "shoulder", "elbow", "back", "hair", "nose"] },
  { slug: "grade-2-outdoors", name: "Grade 2 Outdoors", description: "Nature, places, and directions for everyday exploration.", grade: "GRADE_2", sortOrder: 120, words: ["acorn", "axe", "bamboo", "bark", "bay", "cabin", "cactus", "campfire", "canal", "canyon", "cave", "city", "cliff", "cloud", "compass", "dam", "desert", "directions", "dune", "east"] },
  { slug: "grade-2-clothing", name: "Grade 2 Clothing", description: "Clothing and accessories for practical descriptions.", grade: "GRADE_2", sortOrder: 130, words: ["belt", "boot", "bow tie", "coat", "collar", "earring", "gloves", "hat", "hoodie", "jeans", "necklace", "pocket", "purse", "ring", "scarf", "shoe", "shorts", "skirt", "sock", "sweater"] },
  { slug: "grade-2-feelings", name: "Grade 2 Feelings", description: "Useful emotions for personal expression and stories.", grade: "GRADE_2", sortOrder: 140, words: ["love", "alarm", "surprise", "liking", "anger", "happiness", "caring", "delight", "sadness", "fear", "dislike", "joy", "enjoyment"] },
  { slug: "grade-3-language", name: "Grade 3 Language", description: "Communication and writing terms that support independent reading.", grade: "GRADE_3", sortOrder: 150, words: ["accent", "learn", "approach", "bilingual", "blend", "cue", "dialect", "word", "phrase book", "slang", "question mark", "apostrophe", "comma", "colon", "exclamation mark", "letter", "page", "paragraph", "period", "sentence"] },
  { slug: "grade-3-tools", name: "Grade 3 Tools & Media", description: "Everyday technology, science, and image-making vocabulary.", grade: "GRADE_3", sortOrder: 160, words: ["laptop", "mouse", "keyboard", "printer", "hard drive", "memory", "robot", "scientist", "microscope", "atom", "camera", "film", "flash", "photo album", "projector", "screen", "slide", "tripod", "video camera", "zoom lens"] }
] as const;

export const STARTER_TOPIC_MAPPINGS: readonly StarterTopicMapping[] = [
  { vocabularyId: 1, expectedWord: "apple", topicSlugs: ["food"] },
  { vocabularyId: 2, expectedWord: "book", topicSlugs: ["casual", "common-place"] },
  { vocabularyId: 3, expectedWord: "cat", topicSlugs: ["nature"] },
  { vocabularyId: 4, expectedWord: "dog", topicSlugs: ["nature"] },
  { vocabularyId: 5, expectedWord: "family", topicSlugs: ["family"] },
  { vocabularyId: 6, expectedWord: "friend", topicSlugs: ["emotion"] },
  { vocabularyId: 7, expectedWord: "home", topicSlugs: ["object-in-house", "common-place"] },
  { vocabularyId: 8, expectedWord: "school", topicSlugs: ["casual", "common-place"] },
  { vocabularyId: 9, expectedWord: "teacher", topicSlugs: ["casual", "common-place"] },
  { vocabularyId: 10, expectedWord: "student", topicSlugs: ["casual", "common-place"] },
  { vocabularyId: 11, expectedWord: "water", topicSlugs: ["food", "nature"] },
  { vocabularyId: 12, expectedWord: "food", topicSlugs: ["food"] },
  { vocabularyId: 13, expectedWord: "morning", topicSlugs: ["casual"] },
  { vocabularyId: 14, expectedWord: "night", topicSlugs: ["casual"] },
  { vocabularyId: 15, expectedWord: "today", topicSlugs: ["casual"] },
  { vocabularyId: 16, expectedWord: "go", topicSlugs: ["action"] },
  { vocabularyId: 17, expectedWord: "come", topicSlugs: ["action"] },
  { vocabularyId: 18, expectedWord: "eat", topicSlugs: ["action"] },
  { vocabularyId: 19, expectedWord: "drink", topicSlugs: ["action"] },
  { vocabularyId: 20, expectedWord: "read", topicSlugs: ["casual", "communication"] },
  { vocabularyId: 21, expectedWord: "write", topicSlugs: ["writing-numbers", "communication"] },
  { vocabularyId: 22, expectedWord: "speak", topicSlugs: ["communication"] },
  { vocabularyId: 23, expectedWord: "listen", topicSlugs: ["communication"] },
  { vocabularyId: 24, expectedWord: "happy", topicSlugs: ["emotion"] },
  { vocabularyId: 25, expectedWord: "sad", topicSlugs: ["emotion"] },
  { vocabularyId: 26, expectedWord: "big", topicSlugs: ["miscellaneous"] },
  { vocabularyId: 27, expectedWord: "small", topicSlugs: ["miscellaneous"] },
  { vocabularyId: 28, expectedWord: "good", topicSlugs: ["emotion"] },
  { vocabularyId: 29, expectedWord: "bad", topicSlugs: ["emotion"] },
  { vocabularyId: 30, expectedWord: "new", topicSlugs: ["miscellaneous"] }
] as const;

const OWNER_APPROVED_SOURCE_IDS: Readonly<Record<string, number>> = {
  "question mark": 555,
  learn: 937,
  word: 570,
  love: 938,
  surprise: 1005,
  liking: 989,
  anger: 953,
  happiness: 980,
  sadness: 998,
  fear: 969,
  joy: 987
};

export class CurationError extends Error {
  readonly code: string;
  constructor(code: string) {
    super(code);
    this.name = "CurationError";
    this.code = code;
  }
}

function normalizeWord(word: string) {
  return word.normalize("NFKC").trim().toLocaleLowerCase("en-US");
}

function assert(condition: unknown, code: string): asserts condition {
  if (!condition) throw new CurationError(code);
}

export type CuratedMediaClassification = "PASS" | "WARN_MISSING_IMAGE" | "WARN_QUARANTINED_IMAGE" | "BLOCK";

export function classifyCuratedMedia(
  availability: { image: CatalogMediaAvailability; audio: CatalogMediaAvailability },
  imagePolicy?: CurationManifestRecord["imagePolicy"]
) {
  const blockingReasons: string[] = [];
  if (availability.image === "UNUSABLE") blockingReasons.push("UNUSABLE_IMAGE");
  if (availability.audio !== "READY") {
    blockingReasons.push(availability.audio === "MISSING" ? "MISSING_AUDIO" : "UNUSABLE_AUDIO");
  }
  const classification: CuratedMediaClassification = blockingReasons.length > 0
    ? "BLOCK"
    : imagePolicy === "QUARANTINED" ? "WARN_QUARANTINED_IMAGE"
      : availability.image === "MISSING" ? "WARN_MISSING_IMAGE" : "PASS";
  return {
    classification,
    activationAllowed: classification !== "BLOCK",
    imageExerciseEligible: classification === "PASS",
    blockingReasons
  };
}

function assertManifestMediaAllowed(manifest: CurationManifest, mediaAvailabilityBySourceId: CatalogMediaAvailabilityBySourceId) {
  for (const record of manifest.records) {
    const availability = mediaAvailabilityBySourceId[record.sourceRecordId];
    assert(availability, `CURATED_MEDIA_STATUS_MISSING_${record.sourceRecordId}`);
    const media = classifyCuratedMedia(availability, record.imagePolicy);
    assert(media.activationAllowed, `CURATED_MEDIA_GATE_FAILED_${record.expectedWord}_${media.blockingReasons.join("_")}`);
  }
}

export function validateManifest(input: unknown): CurationManifest {
  assert(input && typeof input === "object" && !Array.isArray(input), "MANIFEST_INVALID");
  const manifest = input as Partial<CurationManifest>;
  assert(manifest.version === CURATION_VERSION, "MANIFEST_VERSION_INVALID");
  assert(manifest.sourceDataset === SOURCE_DATASET_ID, "MANIFEST_SOURCE_INVALID");
  assert(Array.isArray(manifest.learningSets), "LEARNING_SETS_INVALID");
  assert(Array.isArray(manifest.records), "CURATION_RECORDS_INVALID");
  assert(Array.isArray(manifest.starterTopicMappings), "STARTER_TOPIC_MAPPINGS_INVALID");
  const setSlugs = new Set<string>();
  for (const set of manifest.learningSets) {
    assert(set && typeof set === "object" && typeof set.slug === "string" && set.slug.trim() !== "", "LEARNING_SET_INVALID");
    assert(!setSlugs.has(set.slug), "LEARNING_SET_DUPLICATE");
    setSlugs.add(set.slug);
    assert(["GRADE_1", "GRADE_2", "GRADE_3"].includes(set.grade ?? ""), "LEARNING_SET_GRADE_INVALID");
  }
  assert(manifest.records.length >= 200 && manifest.records.length <= 300, "CURATION_RECORD_COUNT_OUT_OF_RANGE");
  const sourceIds = new Set<number>();
  const words = new Set<string>();
  for (const record of manifest.records) {
    assert(record && record.sourceDataset === SOURCE_DATASET_ID, "CURATION_RECORD_SOURCE_INVALID");
    assert(Number.isSafeInteger(record.sourceRecordId) && (record.sourceRecordId ?? 0) > 0, "CURATION_RECORD_ID_INVALID");
    assert(!sourceIds.has(record.sourceRecordId), "CURATION_RECORD_ID_DUPLICATE");
    sourceIds.add(record.sourceRecordId);
    assert(typeof record.expectedWord === "string" && record.expectedWord.trim() !== "", "CURATION_RECORD_WORD_INVALID");
    const normalized = normalizeWord(record.expectedWord);
    assert(!words.has(normalized), "CURATION_RECORD_WORD_DUPLICATE");
    words.add(normalized);
    assert(["GRADE_1", "GRADE_2", "GRADE_3"].includes(record.grade), "CURATION_RECORD_GRADE_INVALID");
    assert(record.activation === true, "CURATION_RECORD_NOT_ACTIVATED");
    assert(Array.isArray(record.topicSlugs) && record.topicSlugs.length > 0, "CURATION_RECORD_TOPICS_INVALID");
    for (const slug of record.topicSlugs) assert((CANONICAL_TOPIC_SLUGS as readonly string[]).includes(slug), "CURATION_RECORD_TOPIC_UNKNOWN");
    assert(Array.isArray(record.learningSetSlugs) && record.learningSetSlugs.length > 0, "CURATION_RECORD_SETS_INVALID");
    for (const slug of record.learningSetSlugs) assert(setSlugs.has(slug), "CURATION_RECORD_SET_UNKNOWN");
    for (const slug of record.learningSetSlugs) {
      const set = manifest.learningSets.find((candidate) => candidate.slug === slug);
      assert(set?.grade === record.grade, "CURATION_RECORD_SET_GRADE_MISMATCH");
    }
    assert(record.imagePolicy === undefined || record.imagePolicy === "QUARANTINED", "CURATION_RECORD_IMAGE_POLICY_INVALID");
    assert(record.vietnameseOverride === undefined || (typeof record.vietnameseOverride === "string" && record.vietnameseOverride.trim() !== ""), "CURATION_RECORD_VIETNAMESE_OVERRIDE_INVALID");
  }
  const starterIds = new Set<number>();
  assert(manifest.starterTopicMappings.length === 30, "STARTER_TOPIC_MAPPING_COUNT_INVALID");
  for (const mapping of manifest.starterTopicMappings) {
    assert(Number.isSafeInteger(mapping.vocabularyId) && mapping.vocabularyId >= 1 && mapping.vocabularyId <= 30, "STARTER_TOPIC_MAPPING_ID_INVALID");
    assert(!starterIds.has(mapping.vocabularyId), "STARTER_TOPIC_MAPPING_ID_DUPLICATE");
    starterIds.add(mapping.vocabularyId);
    assert(typeof mapping.expectedWord === "string" && mapping.expectedWord.trim() !== "", "STARTER_TOPIC_MAPPING_WORD_INVALID");
    assert(Array.isArray(mapping.topicSlugs) && mapping.topicSlugs.length > 0, "STARTER_TOPIC_MAPPING_TOPICS_INVALID");
    for (const slug of mapping.topicSlugs) assert((CANONICAL_TOPIC_SLUGS as readonly string[]).includes(slug), "STARTER_TOPIC_MAPPING_TOPIC_UNKNOWN");
  }
  return manifest as CurationManifest;
}

export function buildManifestFromCatalog(validation = loadCatalogValidation()): CurationManifest {
  const priorRecordsById = existsSync(MANIFEST_PATH)
    ? new Map(readManifest().records.map((record) => [record.sourceRecordId, record]))
    : new Map<number, CurationManifestRecord>();
  const byWord = new Map<string, typeof validation.validRecords[number][]>();
  for (const record of validation.validRecords) {
    const normalized = normalizeWord(record.word);
    const candidates = byWord.get(normalized) ?? [];
    candidates.push(record);
    byWord.set(normalized, candidates);
  }
  const records: CurationManifestRecord[] = [];
  for (const group of CURATION_GROUPS) {
    for (const word of group.words) {
      const source = byWord.get(normalizeWord(word))?.slice().sort((left, right) => left.sourceRecordId - right.sourceRecordId)[0];
      assert(source, `CURATED_WORD_NOT_FOUND_${word}`);
      const approvedSourceId = OWNER_APPROVED_SOURCE_IDS[word];
      if (approvedSourceId !== undefined) assert(source.sourceRecordId === approvedSourceId, `CURATED_OWNER_SOURCE_ID_MISMATCH_${word}`);
      const availability = validation.mediaAvailabilityBySourceId[source.sourceRecordId];
      assert(availability, `CURATED_MEDIA_STATUS_MISSING_${source.sourceRecordId}`);
      const media = classifyCuratedMedia(availability);
      assert(media.activationAllowed, `CURATED_MEDIA_GATE_FAILED_${word}_${media.blockingReasons.join("_")}`);
      const topic = source.topic;
      const topicSlug = topic ? rawTopicToSlug(topic) : null;
      assert(topicSlug, `CURATED_TOPIC_MISSING_${word}`);
      const prior = priorRecordsById.get(source.sourceRecordId);
      assert(!prior || prior.expectedWord === source.word, `CURATED_PRIOR_OWNER_OVERRIDE_IDENTITY_MISMATCH_${source.sourceRecordId}`);
      records.push({
        sourceDataset: SOURCE_DATASET_ID,
        sourceRecordId: source.sourceRecordId,
        expectedWord: source.word,
        grade: group.grade,
        topicSlugs: [topicSlug],
        learningSetSlugs: [group.slug],
        activation: true,
        ...(prior?.imagePolicy ? { imagePolicy: prior.imagePolicy } : {}),
        ...(prior?.vietnameseOverride ? { vietnameseOverride: prior.vietnameseOverride } : {})
      });
    }
  }
  return validateManifest({
    version: CURATION_VERSION,
    sourceDataset: SOURCE_DATASET_ID,
    selectionPolicy: {
      reviewedRows: "Human-reviewed allow-list in scripts/vocabulary-curation.ts; source identity and expected word are emitted into this manifest.",
      gradePolicy: "Grade is explicitly assigned by the named curation group; it is not inferred from id, length, alphabetic order, topic, or frequency.",
      mediaPolicy: "A missing image is WARN and may activate; an owner-quarantined image is WARN and is hidden from learners. Both remain ineligible for IMAGE_TO_WORD; usable audio is required and known unusable/corrupt media blocks activation.",
      activationPolicy: "Only manifest rows are enabled; existing starter rows, learner assignments, progress, reviews, XP, and achievements are preserved."
    },
    learningSets: CURATION_GROUPS.map(({ words: _words, ...definition }) => definition),
    records,
    starterTopicMappings: [...STARTER_TOPIC_MAPPINGS]
  });
}

const RAW_TOPIC_BY_SLUG: Record<TopicSlug, string> = {
  action: "Action", body: "body", casual: "casual", challenge: "Challenge", clothing: "Clothing",
  "common-place": "CommonPlace", communication: "Communication", "computer-office-science": "Computer_office_science",
  emotion: "Emotion", family: "Family", food: "Food", healthy: "Healthy", miscellaneous: "Miscellaneous",
  nature: "nature", "object-in-house": "ObjectInHouse", photography: "Photography", "writing-numbers": "writing_number"
};

function rawTopicToSlug(rawTopic: string): TopicSlug | null {
  const entry = (Object.entries(RAW_TOPIC_BY_SLUG) as [TopicSlug, string][]).find(([, raw]) => raw === rawTopic);
  return entry?.[0] ?? null;
}

export function readManifest(path = MANIFEST_PATH): CurationManifest {
  try {
    return validateManifest(JSON.parse(readFileSync(path, "utf8")) as unknown);
  } catch (error) {
    if (error instanceof CurationError) throw error;
    throw new CurationError("MANIFEST_UNREADABLE");
  }
}

export function validateManifestAgainstCatalog(manifest: CurationManifest, validation = loadCatalogValidation()) {
  const byId = new Map(validation.validRecords.map((record) => [record.sourceRecordId, record]));
  const missing: string[] = [];
  const mediaFailures: string[] = [];
  const wordMismatches: string[] = [];
  const missingImageWords: string[] = [];
  const quarantinedImageWords: string[] = [];
  const selectedIds = new Set(manifest.records.map((record) => record.sourceRecordId));
  const missingRequiredMeanings = validation.invalidRecords.filter((record) =>
    record.sourceRecordId !== null
      && selectedIds.has(record.sourceRecordId)
      && record.codes.includes("VIETNAMESE_INVALID")
  ).length;
  let mediaPass = 0;
  let mediaWarnMissingImage = 0;
  let mediaWarnQuarantinedImage = 0;
  for (const record of manifest.records) {
    const source = byId.get(record.sourceRecordId);
    if (!source) { missing.push(String(record.sourceRecordId)); continue; }
    if (source.sourceDataset !== record.sourceDataset || source.word !== record.expectedWord) wordMismatches.push(String(record.sourceRecordId));
    const availability = validation.mediaAvailabilityBySourceId[record.sourceRecordId];
    if (!availability) { mediaFailures.push(`${record.expectedWord}(MEDIA_STATUS_MISSING)`); continue; }
    if (availability.image === "MISSING") missingImageWords.push(record.expectedWord);
    if (record.imagePolicy === "QUARANTINED") quarantinedImageWords.push(record.expectedWord);
    const media = classifyCuratedMedia(availability, record.imagePolicy);
    if (media.classification === "BLOCK") {
      mediaFailures.push(`${record.expectedWord}(${media.blockingReasons.join(",")})`);
    } else if (media.classification === "WARN_MISSING_IMAGE") {
      mediaWarnMissingImage += 1;
    } else if (media.classification === "WARN_QUARANTINED_IMAGE") {
      mediaWarnQuarantinedImage += 1;
    } else {
      mediaPass += 1;
    }
  }
  assert(missing.length === 0, `CURATED_SOURCE_RECORDS_MISSING_${missing.join(",")}`);
  assert(wordMismatches.length === 0, `CURATED_SOURCE_WORD_MISMATCH_${wordMismatches.join(",")}`);
  assert(mediaFailures.length === 0, `CURATED_MEDIA_GATE_FAILED_${mediaFailures.join(",")}`);
  return {
    sourceRecords: validation.sourceRecords,
    selectedRecords: manifest.records.length,
    mediaChecked: manifest.records.length,
    mediaPass,
    mediaWarnings: mediaWarnMissingImage + mediaWarnQuarantinedImage,
    mediaWarnMissingImage,
    mediaWarnQuarantinedImage,
    mediaBlocked: mediaFailures.length,
    missingImageWords,
    quarantinedImageWords,
    effectiveImageIneligibleCount: new Set([...missingImageWords, ...quarantinedImageWords]).size,
    meaningOverrides: manifest.records.filter((record) => record.vietnameseOverride !== undefined).length,
    meaningOverrideWords: manifest.records.filter((record) => record.vietnameseOverride !== undefined).map((record) => record.expectedWord),
    imageQuarantines: manifest.records.filter((record) => record.imagePolicy === "QUARANTINED").length,
    duplicateSourceIdentities: manifest.records.length - new Set(manifest.records.map((record) => `${record.sourceDataset}:${record.sourceRecordId}`)).size,
    duplicateNormalizedWords: manifest.records.length - new Set(manifest.records.map((record) => normalizeWord(record.expectedWord))).size,
    expectedWordMismatches: wordMismatches.length,
    missingRequiredMeanings
  };
}

type SqlClient = ReturnType<typeof openSql>;
const q = (schema: string, table: string) => `"${schema}"."${table}"`;
const VOCABULARIES = q(APP_SCHEMA, "vocabularies");
const TOPICS = q(APP_SCHEMA, "topics");
const MEMBERSHIPS = q(APP_SCHEMA, "vocabulary_topics");
const SETS = q(APP_SCHEMA, "learning_sets");
const ITEMS = q(APP_SCHEMA, "learning_set_items");

export type CurationApplyReport = {
  selectedRecords: number;
  newlyActivatedRecords: number;
  alreadyActiveRecords: number;
  learningSets: number;
  setMemberships: number;
  starterTopicMappings: number;
  meaningOverrides: number;
  imageQuarantines: number;
};

type Queryable = {
  <T extends Record<string, unknown> = Record<string, unknown>>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T[]>;
  unsafe: (value: string) => unknown;
};

async function count(sqlInput: unknown, table: string) {
  const sql = sqlInput as Queryable;
  const [row] = await sql<{ count: string }>`SELECT count(*)::text AS count FROM ${sql.unsafe(table)}`;
  return Number(row?.count ?? 0);
}

export async function applyCurationManifest(
  sql: SqlClient,
  manifest: CurationManifest,
  mediaAvailabilityBySourceId: CatalogMediaAvailabilityBySourceId
): Promise<CurationApplyReport> {
  assertManifestMediaAllowed(manifest, mediaAvailabilityBySourceId);
  return sql.begin(async (tx) => {
    const beforeProgress = await count(tx, q(APP_SCHEMA, "learner_progress"));
    const beforeReviews = await count(tx, q(APP_SCHEMA, "review_events"));
    const beforeXp = await count(tx, q(APP_SCHEMA, "xp_events"));
    const beforeAssignments = await count(tx, q(APP_SCHEMA, "learner_learning_sets"));
    const beforeAchievementDefinitions = await count(tx, q(APP_SCHEMA, "achievements"));
    const beforeAchievements = await count(tx, q(APP_SCHEMA, "learner_achievements"));
    const starterBefore = await tx<{ id: number; word: string; enabled: boolean; content_version: number }[]>`
      SELECT id, word, enabled, content_version FROM ${tx.unsafe(VOCABULARIES)} WHERE id BETWEEN 1 AND 30 ORDER BY id
    `;
    assert(starterBefore.length === 30, "STARTER_ROWS_NOT_READY");

    const topicRows = await tx<{ id: number; slug: string }[]>`
      SELECT id, slug FROM ${tx.unsafe(TOPICS)} WHERE slug = ANY(${tx.array([...CANONICAL_TOPIC_SLUGS])}::text[])
    `;
    const topicIds = new Map(topicRows.map((row) => [row.slug, Number(row.id)]));
    for (const slug of CANONICAL_TOPIC_SLUGS) assert(topicIds.has(slug), `CANONICAL_TOPIC_MISSING_${slug}`);

    const setIds = new Map<string, number>();
    for (const set of manifest.learningSets) {
      const [row] = await tx<{ id: number }[]>`
        INSERT INTO ${tx.unsafe(SETS)} (slug, name, description, grade, enabled, sort_order)
        VALUES (${set.slug}, ${set.name}, ${set.description}, ${set.grade}::${tx.unsafe(q(APP_SCHEMA, "vocabulary_level"))}, true, ${set.sortOrder})
        ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description,
          grade = EXCLUDED.grade, enabled = true, sort_order = EXCLUDED.sort_order, updated_at = now()
        RETURNING id
      `;
      assert(row?.id != null, "LEARNING_SET_UPSERT_FAILED");
      setIds.set(set.slug, Number(row.id));
    }

    const sourceRows = await tx<{
      id: number;
      source_record_id: number;
      word: string;
      enabled: boolean;
      image_url: string | null;
      audio_url: string | null;
    }[]>`
      SELECT id, source_record_id, word, enabled, image_url, audio_url
      FROM ${tx.unsafe(VOCABULARIES)}
      WHERE source_dataset = ${SOURCE_DATASET_ID}
        AND source_record_id = ANY(${tx.array(manifest.records.map((record) => record.sourceRecordId))}::integer[])
      FOR UPDATE
    `;
    const sourceById = new Map(sourceRows.map((row) => [Number(row.source_record_id), row]));
    let newlyActivatedRecords = 0;
    let alreadyActiveRecords = 0;
    for (const record of manifest.records) {
      const row = sourceById.get(record.sourceRecordId);
      assert(row, `CURATED_SOURCE_ROW_NOT_READY_${record.sourceRecordId}`);
      assert(row.word === record.expectedWord, `CURATED_SOURCE_WORD_MISMATCH_${record.sourceRecordId}`);
      const availability = mediaAvailabilityBySourceId[record.sourceRecordId];
      // The source media preflight carries READY/MISSING/UNUSABLE separately;
      // the database stores only nullable URLs and cannot distinguish missing
      // references from unusable source media on its own.
      assert((availability.image === "READY") === Boolean(row.image_url), `CURATED_IMAGE_STATUS_MISMATCH_${record.expectedWord}`);
      assert(Boolean(row.audio_url), `CURATED_MEDIA_GATE_FAILED_${record.expectedWord}_AUDIO`);
      if (row.enabled) alreadyActiveRecords += 1;
      else newlyActivatedRecords += 1;
    }
    assert(sourceRows.length === manifest.records.length, "CURATED_SOURCE_ROW_COUNT_INVALID");

    const ownerContentRows = await tx<{ source_record_id: number }[]>`
      UPDATE ${tx.unsafe(VOCABULARIES)} AS v
      SET vietnamese_override = owner.vietnamese_override,
          image_quarantined = owner.image_quarantined,
          updated_at = now()
      FROM unnest(
        ${tx.array(manifest.records.map((record) => record.sourceRecordId))}::integer[],
        ${tx.array(manifest.records.map((record) => record.expectedWord))}::text[],
        ${tx.array(manifest.records.map((record) => record.vietnameseOverride ?? null))}::text[],
        ${tx.array(manifest.records.map((record) => record.imagePolicy === "QUARANTINED"))}::boolean[]
      ) AS owner(source_record_id, expected_word, vietnamese_override, image_quarantined)
      WHERE v.source_dataset = ${SOURCE_DATASET_ID}
        AND v.source_record_id = owner.source_record_id
        AND v.word = owner.expected_word
      RETURNING v.source_record_id
    `;
    assert(ownerContentRows.length === manifest.records.length, "OWNER_CONTENT_IDENTITY_MISMATCH");

    for (const grade of ["GRADE_1", "GRADE_2", "GRADE_3"] as const) {
      const ids = manifest.records.filter((record) => record.grade === grade).map((record) => record.sourceRecordId);
      if (ids.length === 0) continue;
      await tx`
        UPDATE ${tx.unsafe(VOCABULARIES)} SET enabled = true,
          level = ${grade}::${tx.unsafe(q(APP_SCHEMA, "vocabulary_level"))}, updated_at = now()
        WHERE source_dataset = ${SOURCE_DATASET_ID}
          AND source_record_id = ANY(${tx.array(ids)}::integer[])
      `;
    }

    const vocabularyIds = manifest.records.map((record) => Number(sourceById.get(record.sourceRecordId)?.id));
    const topicPairs = manifest.records.flatMap((record) => record.topicSlugs.map((slug) => [
      Number(sourceById.get(record.sourceRecordId)?.id), topicIds.get(slug) as number
    ]));
    await tx`DELETE FROM ${tx.unsafe(MEMBERSHIPS)} WHERE vocabulary_id = ANY(${tx.array(vocabularyIds)}::integer[])`;
    await tx`
      INSERT INTO ${tx.unsafe(MEMBERSHIPS)} (vocabulary_id, topic_id)
      SELECT * FROM unnest(${tx.array(topicPairs.map(([vocabularyId]) => vocabularyId))}::integer[], ${tx.array(topicPairs.map(([, topicId]) => topicId))}::integer[])
      AS pair(vocabulary_id, topic_id)
      ON CONFLICT DO NOTHING
    `;

    const itemPairs = manifest.records.flatMap((record, index) => record.learningSetSlugs.map((setSlug) => {
      const setId = setIds.get(setSlug);
      assert(setId != null, "LEARNING_SET_ID_MISSING");
      return [setId, Number(sourceById.get(record.sourceRecordId)?.id), index];
    }));
    await tx`
      INSERT INTO ${tx.unsafe(ITEMS)} (learning_set_id, vocabulary_id, sort_order)
      SELECT * FROM unnest(${tx.array(itemPairs.map(([setId]) => setId))}::integer[], ${tx.array(itemPairs.map(([, vocabularyId]) => vocabularyId))}::integer[], ${tx.array(itemPairs.map(([, , sortOrder]) => sortOrder))}::integer[])
      AS item(learning_set_id, vocabulary_id, sort_order)
      ON CONFLICT (learning_set_id, vocabulary_id) DO UPDATE SET sort_order = EXCLUDED.sort_order
    `;

    const starterById = new Map(starterBefore.map((row) => [row.id, row]));
    const starterTopicPairs = manifest.starterTopicMappings.flatMap((mapping) => {
      assert(starterById.get(mapping.vocabularyId)?.word === mapping.expectedWord, `STARTER_TOPIC_WORD_MISMATCH_${mapping.vocabularyId}`);
      return mapping.topicSlugs.map((slug) => [mapping.vocabularyId, topicIds.get(slug) as number]);
    });
    await tx`DELETE FROM ${tx.unsafe(MEMBERSHIPS)} WHERE vocabulary_id BETWEEN 1 AND 30`;
    await tx`
      INSERT INTO ${tx.unsafe(MEMBERSHIPS)} (vocabulary_id, topic_id)
      SELECT * FROM unnest(${tx.array(starterTopicPairs.map(([vocabularyId]) => vocabularyId))}::integer[], ${tx.array(starterTopicPairs.map(([, topicId]) => topicId))}::integer[])
      AS pair(vocabulary_id, topic_id)
      ON CONFLICT DO NOTHING
    `;

    const starterAfter = await tx<{ id: number; word: string; enabled: boolean; content_version: number }[]>`
      SELECT id, word, enabled, content_version FROM ${tx.unsafe(VOCABULARIES)} WHERE id BETWEEN 1 AND 30 ORDER BY id
    `;
    assert(JSON.stringify(starterAfter) === JSON.stringify(starterBefore), "STARTER_ROWS_CHANGED");
    assert(await count(tx, q(APP_SCHEMA, "learner_progress")) === beforeProgress, "LEARNER_PROGRESS_CHANGED");
    assert(await count(tx, q(APP_SCHEMA, "review_events")) === beforeReviews, "REVIEW_EVENTS_CHANGED");
    assert(await count(tx, q(APP_SCHEMA, "xp_events")) === beforeXp, "XP_EVENTS_CHANGED");
    assert(await count(tx, q(APP_SCHEMA, "learner_learning_sets")) === beforeAssignments, "LEARNER_ASSIGNMENTS_CHANGED");
    assert(await count(tx, q(APP_SCHEMA, "achievements")) === beforeAchievementDefinitions, "ACHIEVEMENT_DEFINITIONS_CHANGED");
    assert(await count(tx, q(APP_SCHEMA, "learner_achievements")) === beforeAchievements, "ACHIEVEMENTS_CHANGED");
    return {
      selectedRecords: manifest.records.length,
      newlyActivatedRecords,
      alreadyActiveRecords,
      learningSets: manifest.learningSets.length,
      setMemberships: itemPairs.length,
      starterTopicMappings: manifest.starterTopicMappings.length,
      meaningOverrides: manifest.records.filter((record) => record.vietnameseOverride !== undefined).length,
      imageQuarantines: manifest.records.filter((record) => record.imagePolicy === "QUARANTINED").length
    };
  });
}

function loadRepositoryEnv() {
  const path = join(process.cwd(), ".env");
  if (existsSync(path)) loadEnvFile(path);
}

function printDryRun(
  manifest: CurationManifest,
  datasetStatus: string,
  mediaStatus: string,
  mediaReport?: ReturnType<typeof validateManifestAgainstCatalog>
) {
  const grades = new Map<Grade, number>();
  for (const record of manifest.records) grades.set(record.grade, (grades.get(record.grade) ?? 0) + 1);
  console.log(`CURATION_VERSION=${CURATION_VERSION}`);
  console.log(`SOURCE_DATASET_ID=${SOURCE_DATASET_ID}`);
  console.log(`MANIFEST_RECORDS=${manifest.records.length}`);
  console.log(`CURATED_IMPORTED_COUNT=${manifest.records.length}`);
  console.log(`GRADE_1_RECORDS=${grades.get("GRADE_1") ?? 0}`);
  console.log(`GRADE_2_RECORDS=${grades.get("GRADE_2") ?? 0}`);
  console.log(`GRADE_3_RECORDS=${grades.get("GRADE_3") ?? 0}`);
  console.log(`LEARNING_SET_COUNT=${manifest.learningSets.length}`);
  console.log(`STARTER_TOPIC_MAPPINGS=${manifest.starterTopicMappings.length}`);
  console.log(`DATASET_STATUS=${datasetStatus}`);
  console.log(`MEDIA_GATE=${mediaStatus} warn_missing=${mediaReport?.mediaWarnMissingImage ?? 0} warn_quarantined=${mediaReport?.mediaWarnQuarantinedImage ?? 0}`);
  console.log(`MEDIA_PASS=${mediaReport?.mediaPass ?? 0}`);
  console.log(`MEDIA_WARN=${mediaReport?.mediaWarnings ?? 0}`);
  console.log(`MEDIA_WARN_MISSING=${mediaReport?.mediaWarnMissingImage ?? 0}`);
  console.log(`MEDIA_WARN_QUARANTINED=${mediaReport?.mediaWarnQuarantinedImage ?? 0}`);
  console.log(`MEDIA_BLOCK=${mediaReport?.mediaBlocked ?? 0}`);
  console.log(`MISSING_IMAGE_SELECTED=${mediaReport?.missingImageWords.join(",") || "(none)"}`);
  console.log(`MISSING_IMAGES_EXISTING=${mediaReport?.missingImageWords.length ?? 0}`);
  console.log(`IMAGE_QUARANTINES=${mediaReport?.imageQuarantines ?? 0}`);
  console.log(`IMAGE_QUARANTINE_WORDS=${mediaReport?.quarantinedImageWords.join(",") || "(none)"}`);
  console.log(`MEANING_OVERRIDES=${mediaReport?.meaningOverrides ?? 0}`);
  console.log(`MEANING_OVERRIDE_WORDS=${mediaReport?.meaningOverrideWords.join(",") || "(none)"}`);
  console.log(`EFFECTIVE_IMAGE_INELIGIBLE_COUNT=${mediaReport?.effectiveImageIneligibleCount ?? 0}`);
  console.log(`DUPLICATE_SOURCE_IDENTITIES=${mediaReport?.duplicateSourceIdentities ?? 0}`);
  console.log(`DUPLICATE_NORMALIZED_WORDS=${mediaReport?.duplicateNormalizedWords ?? 0}`);
  console.log(`EXPECTED_WORD_MISMATCHES=${mediaReport?.expectedWordMismatches ?? 0}`);
  console.log(`MISSING_REQUIRED_MEANINGS=${mediaReport?.missingRequiredMeanings ?? 0}`);
  console.log("DRY_RUN=YES");
  console.log("DATABASE_MUTATIONS=0");
  console.log("LEARNER_ASSIGNMENTS_CHANGED=0");
  console.log("PROGRESS_REVIEW_XP_ACHIEVEMENT_MUTATIONS=0");
  console.log("DB_MUTATIONS=0");
  console.log("REAL_NEON_APPLY=NOT_RUN");
  console.log("STATUS=PASS");
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const generate = args.includes("--generate-manifest");
  if (args.some((arg) => !["--apply", "--generate-manifest"].includes(arg)) || (apply && generate)) throw new CurationError("CLI_ARGUMENT_INVALID");
  if (generate) {
    const manifest = buildManifestFromCatalog();
    writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    console.log(`MANIFEST_GENERATED=${MANIFEST_PATH}`);
    return;
  }
  const manifest = readManifest();
  if (!apply) {
    let datasetStatus = "SKIPPED_NO_LOCAL_DATASET";
    let mediaStatus = "SKIPPED_NO_LOCAL_DATASET";
    let mediaReport: ReturnType<typeof validateManifestAgainstCatalog> | undefined;
    const datasetPath = join(resolve(DEFAULT_DATASET_ROOT), "vocabulary.json");
    if (existsSync(datasetPath)) {
      mediaReport = validateManifestAgainstCatalog(manifest);
      datasetStatus = `PASS records=${mediaReport.sourceRecords}`;
      mediaStatus = `PASS checked=${mediaReport.mediaChecked} pass=${mediaReport.mediaPass} warn=${mediaReport.mediaWarnings} block=${mediaReport.mediaBlocked}`;
    }
    printDryRun(manifest, datasetStatus, mediaStatus, mediaReport);
    return;
  }
  const catalogValidation = loadCatalogValidation();
  validateManifestAgainstCatalog(manifest, catalogValidation);
  loadRepositoryEnv();
  const { context, environment } = readContext();
  if (context !== "ci-test" || environment !== "test") throw new CurationError("APPLY_REQUIRES_TRUSTED_CI_TEST_CONTEXT");
  const target = getConnectionTarget("test", "runtime");
  const connection = await assertResolvedTargetBeforeMutation({ context, source: "github-actions", environment, purpose: "runtime", operation: "db-enrich", target });
  const url = connection.url ?? configuredDatabaseUrl(context, "runtime");
  if (!url) throw new CurationError("RUNTIME_DATABASE_URL_REQUIRED");
  const sql = openSql(url);
  try {
    const report = await applyCurationManifest(sql, manifest, catalogValidation.mediaAvailabilityBySourceId);
    for (const [key, value] of Object.entries(report)) console.log(`${key.toUpperCase()}=${value}`);
    console.log("APPLY_MODE=APPLY");
    console.log("STATUS=PASS");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

const invokedScript = process.argv[1]?.replaceAll("\\", "/") ?? "";
if (invokedScript.endsWith("/vocabulary-curation.ts") || invokedScript.endsWith("/vocabulary-curation.js")) {
  main().catch((error: unknown) => {
    console.error(error instanceof CurationError ? `VOCABULARY_CURATION_STATUS=FAIL code=${error.code}` : "VOCABULARY_CURATION_STATUS=FAIL code=UNEXPECTED_ERROR");
    process.exitCode = 1;
  });
}
