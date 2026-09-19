import {
  learnerSettingsResponseSchema,
  updateLearnerSettingsRequestSchema,
  type LearnerSettingsResponse
} from "@vocabflow/contracts";

export class LearnerSettingsClientError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, status: number) {
    super(code);
    this.name = "LearnerSettingsClientError";
    this.code = code;
    this.status = status;
  }
}

async function readError(response: Response): Promise<LearnerSettingsClientError> {
  let code = "INTERNAL_ERROR";
  try {
    const payload = await response.json() as { error?: { code?: unknown } };
    if (typeof payload.error?.code === "string") code = payload.error.code;
  } catch {
    // Keep the safe generic code when the response is not JSON.
  }
  return new LearnerSettingsClientError(code, response.status);
}

async function readResponse(response: Response): Promise<LearnerSettingsResponse> {
  if (!response.ok) throw await readError(response);
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new LearnerSettingsClientError("INVALID_RESPONSE", response.status);
  }
  const parsed = learnerSettingsResponseSchema.safeParse(payload);
  if (!parsed.success) throw new LearnerSettingsClientError("INVALID_RESPONSE", response.status);
  return parsed.data;
}

export async function requestLearnerSettings(learnerId: string): Promise<LearnerSettingsResponse> {
  let response: Response;
  try {
    response = await fetch(`/api/learners/${encodeURIComponent(learnerId)}/settings`, { credentials: "include" });
  } catch {
    throw new LearnerSettingsClientError("NETWORK_ERROR", 0);
  }
  return readResponse(response);
}

export async function updateLearnerSettings(
  learnerId: string,
  dailyNewWordLimit: number
): Promise<LearnerSettingsResponse> {
  const request = updateLearnerSettingsRequestSchema.safeParse({ dailyNewWordLimit });
  if (!request.success) throw new LearnerSettingsClientError("INVALID_REQUEST", 400);
  let response: Response;
  try {
    response = await fetch(`/api/learners/${encodeURIComponent(learnerId)}/settings`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request.data)
    });
  } catch {
    throw new LearnerSettingsClientError("NETWORK_ERROR", 0);
  }
  return readResponse(response);
}
