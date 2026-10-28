import { learningFetch } from "../guest/learning-fetch";
import {
  learnerVocabularyBrowseResponseSchema,
  learnerVocabularyListResponseSchema,
  type LearnerVocabularyBrowseResponse,
  type VocabularyBrowsePageSize,
  type LearnerVocabularyDto,
  type VocabularyLevel
} from "@vocabflow/contracts";

export class LearnerVocabularyClientError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, status: number) {
    super(code);
    this.name = "LearnerVocabularyClientError";
    this.code = code;
    this.status = status;
  }
}

async function readError(response: Response): Promise<LearnerVocabularyClientError> {
  let code = "INTERNAL_ERROR";
  try {
    const payload = await response.json() as { error?: { code?: unknown } };
    if (typeof payload.error?.code === "string") code = payload.error.code;
  } catch {
    // Keep the safe generic code when the response is not JSON.
  }
  return new LearnerVocabularyClientError(code, response.status);
}

export async function requestLearnerVocabulary(learnerId: string, level?: VocabularyLevel, vocabularyId?: number): Promise<LearnerVocabularyDto[]> {
  const params = new URLSearchParams();
  if (level) params.set("level", level);
  if (vocabularyId !== undefined) params.set("id", String(vocabularyId));
  const queryString = params.toString();
  const query = queryString ? `?${queryString}` : "";
  let response: Response;
  try {
    response = await learningFetch(`/api/learners/${encodeURIComponent(learnerId)}/vocabulary${query}`, {
      credentials: "include"
    });
  } catch {
    throw new LearnerVocabularyClientError("NETWORK_ERROR", 0);
  }
  if (!response.ok) throw await readError(response);

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new LearnerVocabularyClientError("INVALID_RESPONSE", response.status);
  }
  const parsed = learnerVocabularyListResponseSchema.safeParse(payload);
  if (!parsed.success) throw new LearnerVocabularyClientError("INVALID_RESPONSE", response.status);
  return parsed.data.vocabulary;
}

export type LearnerVocabularyBrowseRequest = {
  page: number;
  pageSize: VocabularyBrowsePageSize;
  q?: string;
  level?: VocabularyLevel;
  cefr?: string;
  topic?: string;
  topicId?: number;
};

export async function requestLearnerVocabularyBrowse(
  learnerId: string,
  query: LearnerVocabularyBrowseRequest,
  signal?: AbortSignal
): Promise<LearnerVocabularyBrowseResponse> {
  const params = new URLSearchParams({ page: String(query.page), pageSize: String(query.pageSize) });
  if (query.q?.trim()) params.set("q", query.q.trim());
  if (query.level) params.set("level", query.level);
  if (query.cefr) params.set("cefr", query.cefr);
  if (query.topic) params.set("topic", query.topic);
  if (query.topicId) params.set("topicId", String(query.topicId));

  let response: Response;
  try {
    response = await learningFetch(`/api/learners/${encodeURIComponent(learnerId)}/vocabulary/browse?${params}`, {
      credentials: "include",
      signal
    });
  } catch {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    throw new LearnerVocabularyClientError("NETWORK_ERROR", 0);
  }
  if (!response.ok) throw await readError(response);

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new LearnerVocabularyClientError("INVALID_RESPONSE", response.status);
  }
  const parsed = learnerVocabularyBrowseResponseSchema.safeParse(payload);
  if (!parsed.success) throw new LearnerVocabularyClientError("INVALID_RESPONSE", response.status);
  return parsed.data;
}
