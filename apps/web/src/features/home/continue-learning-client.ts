import {
  continueLearningSummaryResponseSchema,
  type ContinueLearningSummaryResponse
} from "@vocabflow/contracts";

export class ContinueLearningClientError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, status: number) {
    super(code);
    this.name = "ContinueLearningClientError";
    this.code = code;
    this.status = status;
  }
}

async function readError(response: Response): Promise<ContinueLearningClientError> {
  let code = "INTERNAL_ERROR";
  try {
    const payload = await response.json() as { error?: { code?: unknown } };
    if (typeof payload.error?.code === "string") code = payload.error.code;
  } catch {
    // Retain a safe error when the response is not JSON.
  }
  return new ContinueLearningClientError(code, response.status);
}

export async function requestContinueLearningSummary(learnerId: string): Promise<ContinueLearningSummaryResponse> {
  let response: Response;
  try {
    response = await fetch(`/api/learners/${encodeURIComponent(learnerId)}/continue-learning`, {
      credentials: "include"
    });
  } catch {
    throw new ContinueLearningClientError("NETWORK_ERROR", 0);
  }
  if (!response.ok) throw await readError(response);
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ContinueLearningClientError("INVALID_RESPONSE", response.status);
  }
  const parsed = continueLearningSummaryResponseSchema.safeParse(payload);
  if (!parsed.success) throw new ContinueLearningClientError("INVALID_RESPONSE", response.status);
  return parsed.data;
}
