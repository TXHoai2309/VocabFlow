import { learningFetch } from "../guest/learning-fetch";
import {
  resetLearnerProgressResponseSchema,
  type ResetLearnerProgressResponse
} from "@vocabflow/contracts";

export class ResetLearnerProgressClientError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, status: number) {
    super(code);
    this.name = "ResetLearnerProgressClientError";
    this.code = code;
    this.status = status;
  }
}

async function readError(response: Response): Promise<ResetLearnerProgressClientError> {
  let code = "INTERNAL_ERROR";
  try {
    const payload = await response.json() as { error?: { code?: unknown } };
    if (typeof payload.error?.code === "string") code = payload.error.code;
  } catch {
    // Keep the safe generic code when the response is not JSON.
  }
  return new ResetLearnerProgressClientError(code, response.status);
}

export async function requestResetLearnerProgress(learnerId: string): Promise<ResetLearnerProgressResponse> {
  let response: Response;
  try {
    response = await learningFetch(`/api/learners/${encodeURIComponent(learnerId)}/reset-progress`, {
      method: "POST",
      credentials: "include"
    });
  } catch {
    throw new ResetLearnerProgressClientError("NETWORK_ERROR", 0);
  }
  if (!response.ok) throw await readError(response);

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ResetLearnerProgressClientError("INVALID_RESPONSE", response.status);
  }
  const parsed = resetLearnerProgressResponseSchema.safeParse(payload);
  if (!parsed.success) throw new ResetLearnerProgressClientError("INVALID_RESPONSE", response.status);
  return parsed.data;
}
