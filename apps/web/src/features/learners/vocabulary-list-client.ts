import {
  learnerVocabularyListResponseSchema,
  type LearnerVocabularyDto
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

export async function requestLearnerVocabulary(learnerId: string): Promise<LearnerVocabularyDto[]> {
  let response: Response;
  try {
    response = await fetch(`/api/learners/${encodeURIComponent(learnerId)}/vocabulary`, {
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
