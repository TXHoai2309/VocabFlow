import {
  learnerSavedVocabularyMutationResponseSchema,
  learnerSavedVocabularyResponseSchema,
  type LearnerSavedVocabularyDto,
  type LearnerSavedVocabularyMutationResponse
} from "@vocabflow/contracts";

export class SavedVocabularyClientError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, status: number) {
    super(code);
    this.name = "SavedVocabularyClientError";
    this.code = code;
    this.status = status;
  }
}

async function readError(response: Response): Promise<SavedVocabularyClientError> {
  let code = "INTERNAL_ERROR";
  try {
    const payload = await response.json() as { error?: { code?: unknown } };
    if (typeof payload.error?.code === "string") code = payload.error.code;
  } catch {
    // Keep a safe generic error for non-JSON responses.
  }
  return new SavedVocabularyClientError(code, response.status);
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new SavedVocabularyClientError("INVALID_RESPONSE", response.status);
  }
}

export async function requestSavedVocabulary(learnerId: string): Promise<LearnerSavedVocabularyDto[]> {
  let response: Response;
  try {
    response = await fetch(`/api/learners/${encodeURIComponent(learnerId)}/saved-vocabulary`, { credentials: "include" });
  } catch {
    throw new SavedVocabularyClientError("NETWORK_ERROR", 0);
  }
  if (!response.ok) throw await readError(response);
  const parsed = learnerSavedVocabularyResponseSchema.safeParse(await readJson(response));
  if (!parsed.success) throw new SavedVocabularyClientError("INVALID_RESPONSE", response.status);
  return parsed.data.savedVocabulary;
}

async function mutateSavedVocabulary(learnerId: string, vocabularyId: number, method: "POST" | "DELETE"): Promise<LearnerSavedVocabularyMutationResponse> {
  let response: Response;
  try {
    response = await fetch(`/api/learners/${encodeURIComponent(learnerId)}/saved-vocabulary/${vocabularyId}`, {
      method,
      credentials: "include"
    });
  } catch {
    throw new SavedVocabularyClientError("NETWORK_ERROR", 0);
  }
  if (!response.ok) throw await readError(response);
  const parsed = learnerSavedVocabularyMutationResponseSchema.safeParse(await readJson(response));
  if (!parsed.success) throw new SavedVocabularyClientError("INVALID_RESPONSE", response.status);
  return parsed.data;
}

export function saveVocabulary(learnerId: string, vocabularyId: number) {
  return mutateSavedVocabulary(learnerId, vocabularyId, "POST");
}

export function unsaveVocabulary(learnerId: string, vocabularyId: number) {
  return mutateSavedVocabulary(learnerId, vocabularyId, "DELETE");
}
