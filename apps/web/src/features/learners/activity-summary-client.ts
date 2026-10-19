import { learningFetch } from "../guest/learning-fetch";
import {
  activitySummaryResponseSchema,
  type ActivitySummaryResponse
} from "@vocabflow/contracts";

export class ActivitySummaryClientError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, status: number) {
    super(code);
    this.name = "ActivitySummaryClientError";
    this.code = code;
    this.status = status;
  }
}

async function readError(response: Response): Promise<ActivitySummaryClientError> {
  try {
    const body = await response.json() as { error?: { code?: string } };
    return new ActivitySummaryClientError(body.error?.code ?? "INTERNAL_ERROR", response.status);
  } catch {
    return new ActivitySummaryClientError("INTERNAL_ERROR", response.status);
  }
}

export async function requestActivitySummary(learnerId: string): Promise<ActivitySummaryResponse> {
  let response: Response;
  try {
    response = await learningFetch(`/api/learners/${encodeURIComponent(learnerId)}/activity-summary`, {
      credentials: "include"
    });
  } catch {
    throw new ActivitySummaryClientError("NETWORK_ERROR", 0);
  }
  if (!response.ok) throw await readError(response);
  const parsed = activitySummaryResponseSchema.safeParse(await response.json());
  if (!parsed.success) throw new ActivitySummaryClientError("INVALID_RESPONSE", response.status);
  return parsed.data;
}
