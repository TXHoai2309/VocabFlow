import {
  progressSummaryResponseSchema,
  type ProgressSummaryResponse
} from "@vocabflow/contracts";

export class ProgressSummaryClientError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, status: number) {
    super(code);
    this.name = "ProgressSummaryClientError";
    this.code = code;
    this.status = status;
  }
}

async function readError(response: Response): Promise<ProgressSummaryClientError> {
  let code = "INTERNAL_ERROR";
  try {
    const payload = await response.json() as { error?: { code?: unknown } };
    if (typeof payload.error?.code === "string") code = payload.error.code;
  } catch {
    // Keep the safe generic code when the response is not JSON.
  }
  return new ProgressSummaryClientError(code, response.status);
}

export async function requestProgressSummary(learnerId: string): Promise<ProgressSummaryResponse> {
  let response: Response;
  try {
    response = await fetch(`/api/learners/${encodeURIComponent(learnerId)}/progress-summary`, {
      credentials: "include"
    });
  } catch {
    throw new ProgressSummaryClientError("NETWORK_ERROR", 0);
  }
  if (!response.ok) throw await readError(response);

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ProgressSummaryClientError("INVALID_RESPONSE", response.status);
  }
  const parsed = progressSummaryResponseSchema.safeParse(payload);
  if (!parsed.success) throw new ProgressSummaryClientError("INVALID_RESPONSE", response.status);
  return parsed.data;
}
