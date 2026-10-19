import { learningFetch } from "../guest/learning-fetch";
import {
  reviewRequestSchema,
  reviewResponseSchema,
  type ReviewRequest,
  type ReviewResponse
} from "@vocabflow/contracts";

export class ReviewClientError extends Error {
  readonly code: string;
  readonly status: number;
  readonly uncertain: boolean;

  constructor(code: string, status: number, uncertain = false) {
    super(code);
    this.name = "ReviewClientError";
    this.code = code;
    this.status = status;
    this.uncertain = uncertain;
  }
}

async function readError(response: Response): Promise<ReviewClientError> {
  let code = "INTERNAL_ERROR";
  try {
    const payload = await response.json() as { error?: { code?: unknown } };
    if (typeof payload.error?.code === "string") code = payload.error.code;
  } catch {
    // Keep the safe generic code when the response is not JSON.
  }
  return new ReviewClientError(code, response.status, response.status >= 500);
}

export async function submitReview(input: ReviewRequest): Promise<ReviewResponse> {
  const parsedInput = reviewRequestSchema.safeParse(input);
  if (!parsedInput.success) throw new ReviewClientError("INVALID_REQUEST", 400);

  let response: Response;
  try {
    response = await learningFetch("/api/reviews", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsedInput.data)
    });
  } catch {
    throw new ReviewClientError("NETWORK_ERROR", 0, true);
  }
  if (!response.ok) throw await readError(response);

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ReviewClientError("INVALID_RESPONSE", response.status, true);
  }

  const parsed = reviewResponseSchema.safeParse(payload);
  if (!parsed.success) throw new ReviewClientError("INVALID_RESPONSE", response.status, true);
  return parsed.data;
}
