import {
  learnerLearningSetListResponseSchema,
  learnerLearningSetMutationResponseSchema,
  learningSetDetailResponseSchema,
  learningSetListResponseSchema,
  type LearnerLearningSetDto,
  type LearnerLearningSetMutationResponse,
  type LearningSetDetail,
  type LearningSetSummary
} from "@vocabflow/contracts";

export class LearningSetsClientError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, status: number) {
    super(code);
    this.name = "LearningSetsClientError";
    this.code = code;
    this.status = status;
  }
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new LearningSetsClientError("INVALID_RESPONSE", response.status);
  }
}

async function readError(response: Response): Promise<never> {
  let code = "REQUEST_FAILED";
  try {
    const payload = await response.json() as { error?: { code?: unknown } };
    if (typeof payload.error?.code === "string") code = payload.error.code;
  } catch {
    // Keep a safe client error when the response is not JSON.
  }
  throw new LearningSetsClientError(code, response.status);
}

export async function requestLearningSets(): Promise<LearningSetSummary[]> {
  let response: Response;
  try {
    response = await fetch("/api/learning-sets", { credentials: "include" });
  } catch {
    throw new LearningSetsClientError("NETWORK_ERROR", 0);
  }
  if (!response.ok) return readError(response);
  const parsed = learningSetListResponseSchema.safeParse(await readJson(response));
  if (!parsed.success) throw new LearningSetsClientError("INVALID_RESPONSE", response.status);
  return parsed.data.learningSets;
}

export async function requestLearningSet(learningSetId: number): Promise<LearningSetDetail> {
  let response: Response;
  try {
    response = await fetch(`/api/learning-sets/${learningSetId}`, { credentials: "include" });
  } catch {
    throw new LearningSetsClientError("NETWORK_ERROR", 0);
  }
  if (!response.ok) return readError(response);
  const parsed = learningSetDetailResponseSchema.safeParse(await readJson(response));
  if (!parsed.success) throw new LearningSetsClientError("INVALID_RESPONSE", response.status);
  return parsed.data.learningSet;
}

export async function requestLearnerLearningSets(learnerId: string): Promise<LearnerLearningSetDto[]> {
  let response: Response;
  try {
    response = await fetch(`/api/learners/${learnerId}/learning-sets`, { credentials: "include" });
  } catch {
    throw new LearningSetsClientError("NETWORK_ERROR", 0);
  }
  if (!response.ok) return readError(response);
  const parsed = learnerLearningSetListResponseSchema.safeParse(await readJson(response));
  if (!parsed.success) throw new LearningSetsClientError("INVALID_RESPONSE", response.status);
  return parsed.data.learningSets;
}

async function mutateLearnerSet(learnerId: string, learningSetId: number, method: "PUT" | "DELETE") {
  let response: Response;
  try {
    response = await fetch(`/api/learners/${learnerId}/learning-sets/${learningSetId}`, {
      method,
      credentials: "include"
    });
  } catch {
    throw new LearningSetsClientError("NETWORK_ERROR", 0);
  }
  if (!response.ok) return readError(response);
  const parsed = learnerLearningSetMutationResponseSchema.safeParse(await readJson(response));
  if (!parsed.success) throw new LearningSetsClientError("INVALID_RESPONSE", response.status);
  return parsed.data;
}

export function assignLearningSet(learnerId: string, learningSetId: number): Promise<LearnerLearningSetMutationResponse> {
  return mutateLearnerSet(learnerId, learningSetId, "PUT");
}

export function unassignLearningSet(learnerId: string, learningSetId: number): Promise<LearnerLearningSetMutationResponse> {
  return mutateLearnerSet(learnerId, learningSetId, "DELETE");
}
