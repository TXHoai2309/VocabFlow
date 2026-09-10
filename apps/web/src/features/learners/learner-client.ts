import {
  createLearnerRequestSchema,
  learnerDtoSchema,
  learnerListResponseSchema,
  type CreateLearnerRequest,
  type LearnerDto
} from "@vocabflow/contracts";

export class LearnerClientError extends Error {
  readonly code: string;
  readonly status: number;
  readonly uncertain: boolean;

  constructor(code: string, status: number, uncertain = false) {
    super(code);
    this.name = "LearnerClientError";
    this.code = code;
    this.status = status;
    this.uncertain = uncertain;
  }
}

async function readError(response: Response): Promise<LearnerClientError> {
  let code = "INTERNAL_ERROR";
  try {
    const payload = await response.json() as { error?: { code?: unknown } };
    if (typeof payload.error?.code === "string") code = payload.error.code;
  } catch {
    // Keep the safe generic code when the response is not JSON.
  }
  return new LearnerClientError(code, response.status);
}

export async function requestLearners(): Promise<LearnerDto[]> {
  let response: Response;
  try {
    response = await fetch("/api/learners", { credentials: "include" });
  } catch {
    throw new LearnerClientError("NETWORK_ERROR", 0);
  }
  if (!response.ok) throw await readError(response);
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new LearnerClientError("INVALID_RESPONSE", response.status);
  }
  const parsed = learnerListResponseSchema.safeParse(payload);
  if (!parsed.success) throw new LearnerClientError("INVALID_RESPONSE", response.status);
  return parsed.data.learners;
}

export async function createLearner(input: CreateLearnerRequest): Promise<LearnerDto> {
  const request = createLearnerRequestSchema.safeParse(input);
  if (!request.success) throw new LearnerClientError("INVALID_REQUEST", 400);
  let response: Response;
  try {
    response = await fetch("/api/learners", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request.data)
    });
  } catch {
    throw new LearnerClientError("NETWORK_ERROR", 0, true);
  }
  if (!response.ok) throw await readError(response);
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new LearnerClientError("INVALID_RESPONSE", response.status, true);
  }
  const parsed = learnerDtoSchema.safeParse(payload);
  if (!parsed.success) throw new LearnerClientError("INVALID_RESPONSE", response.status, true);
  return parsed.data;
}
