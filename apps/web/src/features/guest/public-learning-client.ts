import {
  PUBLIC_VOCABULARY_BATCH_LIMIT, publicLearningIndexSchema, vocabularyListResponseSchema,
  learnerVocabularyBrowseResponseSchema, publicVocabularyMatchResponseSchema, type PublicLearningIndex, type VocabularyDto,
  type LearnerVocabularyBrowseItem
} from "@vocabflow/contracts";

let indexPromise: Promise<PublicLearningIndex> | undefined;
const wordPromises = new Map<number, Promise<VocabularyDto | undefined>>();
let activeDetailBatches = 0;
const pendingDetailBatches: (() => void)[] = [];
async function fetchDetailBatch(ids: number[]) {
  if (activeDetailBatches < 2) activeDetailBatches += 1;
  else await new Promise<void>((resolve) => pendingDetailBatches.push(resolve));
  try {
    const response = await fetch(`/api/public/vocabulary?ids=${ids.join(",")}`, { credentials: "omit" });
    if (!response.ok) throw new Error("PUBLIC_WORDS_UNAVAILABLE");
    const words = vocabularyListResponseSchema.parse(await response.json()).vocabulary;
    return new Map(words.map((word) => [word.id, word]));
  }
  finally {
    const next = pendingDetailBatches.shift();
    if (next) next(); else activeDetailBatches -= 1;
  }
}
export function clearPublicLearningCache() { indexPromise = undefined; wordPromises.clear(); }
export function requestPublicLearningIndex(): Promise<PublicLearningIndex> {
  indexPromise ??= fetch("/api/public/learning-index", { credentials: "omit" }).then(async (response) => {
    if (!response.ok) throw new Error("PUBLIC_INDEX_UNAVAILABLE");
    return publicLearningIndexSchema.parse(await response.json());
  }).catch((error: unknown) => { indexPromise = undefined; throw error; });
  return indexPromise;
}

/** Each detail request is bounded; concurrent consumers share per-word promises. */
export async function requestPublicWords(ids: number[]): Promise<VocabularyDto[]> {
  const unique = [...new Set(ids)];
  const missing = unique.filter((id) => !wordPromises.has(id));
  for (let offset = 0; offset < missing.length; offset += PUBLIC_VOCABULARY_BATCH_LIMIT) {
    const batch = missing.slice(offset, offset + PUBLIC_VOCABULARY_BATCH_LIMIT);
    const request = fetchDetailBatch(batch);
    for (const id of batch) wordPromises.set(id, request.then((words) => words.get(id)).catch((error: unknown) => { wordPromises.delete(id); throw error; }));
  }
  const words = await Promise.all(unique.map((id) => wordPromises.get(id)!));
  return words.filter((word): word is VocabularyDto => word !== undefined);
}

export async function requestPublicBrowse(params: URLSearchParams, signal?: AbortSignal) {
  const response = await fetch(`/api/public/vocabulary/browse?${params}`, { credentials: "omit", signal });
  if (!response.ok) throw new Error("PUBLIC_BROWSE_UNAVAILABLE");
  return learnerVocabularyBrowseResponseSchema.parse(await response.json());
}

export async function requestPublicMatchingIds(query: string, signal?: AbortSignal) {
  const response = await fetch(`/api/public/vocabulary/matches?${new URLSearchParams({ q: query })}`, { credentials: "omit", signal });
  if (!response.ok) throw new Error("PUBLIC_SEARCH_UNAVAILABLE");
  return new Set(publicVocabularyMatchResponseSchema.parse(await response.json()).ids);
}

/** List cards deliberately omit full examples/definitions; detail uses its ID. */
export function publicCardVocabulary({ status: _status, nextReviewDate: _date, ...card }: LearnerVocabularyBrowseItem): VocabularyDto {
  return { ...card, definitionEn: null, exampleEn: null };
}
