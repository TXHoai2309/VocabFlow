import { learningFetch } from "../guest/learning-fetch";
import {
  reviewQueueResponseSchema,
  type CatalogStudyScope,
  type StudyQueueCapacity,
  type ReviewQueueResponse
} from "@vocabflow/contracts";

export class ReviewQueueClientError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, status: number) {
    super(code);
    this.name = "ReviewQueueClientError";
    this.code = code;
    this.status = status;
  }
}

async function readError(response: Response): Promise<ReviewQueueClientError> {
  let code = "INTERNAL_ERROR";
  try {
    const payload = await response.json() as { error?: { code?: unknown } };
    if (typeof payload.error?.code === "string") code = payload.error.code;
  } catch {
    // Keep the safe generic code when the response is not JSON.
  }
  return new ReviewQueueClientError(code, response.status);
}

export async function requestReviewQueue(learnerId: string, scope?: "saved" | "saved-all" | "weak" | CatalogStudyScope, capacity?: StudyQueueCapacity): Promise<ReviewQueueResponse> {
  let response: Response;
  try {
    const params = new URLSearchParams();
    if (typeof scope === "object") {
      if (scope.type === "topic" || scope.type === "learning-set") params.set(scope.type === "topic" ? "topicId" : "learningSetId", String(scope.id));
      else { params.set("source", scope.type); if (scope.type === "custom") params.set("setIds", scope.ids.join(",")); }
    }
    const scopeQuery = typeof scope === "object" ? `?${params}` : scope === "saved-all"
      ? "?scope=saved&content=all"
      : scope === "saved" ? "?scope=saved"
        : scope === "weak" ? "?scope=weak" : "";
    const query = capacity === undefined ? scopeQuery : `${scopeQuery}${scopeQuery ? "&" : "?"}capacity=${capacity}`;
    response = await learningFetch(`/api/learners/${encodeURIComponent(learnerId)}/review-queue${query}`, {
      credentials: "include"
    });
  } catch {
    throw new ReviewQueueClientError("NETWORK_ERROR", 0);
  }
  if (!response.ok) throw await readError(response);

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ReviewQueueClientError("INVALID_RESPONSE", response.status);
  }

  const parsed = reviewQueueResponseSchema.safeParse(payload);
  if (!parsed.success) throw new ReviewQueueClientError("INVALID_RESPONSE", response.status);
  return parsed.data;
}
