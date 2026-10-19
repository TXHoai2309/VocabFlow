import { learningFetch } from "../guest/learning-fetch";
import {
  vocabularyListResponseSchema,
  type VocabularyDto
} from "@vocabflow/contracts";

export class VocabularyClientError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, status: number) {
    super(code);
    this.name = "VocabularyClientError";
    this.code = code;
    this.status = status;
  }
}

async function readError(response: Response): Promise<VocabularyClientError> {
  let code = "INTERNAL_ERROR";
  try {
    const payload = await response.json() as { error?: { code?: unknown } };
    if (typeof payload.error?.code === "string") code = payload.error.code;
  } catch {
    // Keep the safe generic code when the response is not JSON.
  }
  return new VocabularyClientError(code, response.status);
}

export async function requestVocabulary(): Promise<VocabularyDto[]> {
  let response: Response;
  try {
    response = await learningFetch("/api/vocabulary", { credentials: "include" });
  } catch {
    throw new VocabularyClientError("NETWORK_ERROR", 0);
  }
  if (!response.ok) throw await readError(response);

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new VocabularyClientError("INVALID_RESPONSE", response.status);
  }

  const parsed = vocabularyListResponseSchema.safeParse(payload);
  if (!parsed.success) throw new VocabularyClientError("INVALID_RESPONSE", response.status);
  return parsed.data.vocabulary;
}
