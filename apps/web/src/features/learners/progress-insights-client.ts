import {
  progressHistoryResponseSchema,
  topicProgressResponseSchema,
  type ProgressHistoryResponse,
  type TopicProgressResponse
} from "@vocabflow/contracts";

export class ProgressInsightsClientError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, status: number) {
    super(code);
    this.name = "ProgressInsightsClientError";
    this.code = code;
    this.status = status;
  }
}

async function errorFor(response: Response): Promise<ProgressInsightsClientError> {
  try {
    const body = await response.json() as { error?: { code?: unknown } };
    return new ProgressInsightsClientError(typeof body.error?.code === "string" ? body.error.code : "INTERNAL_ERROR", response.status);
  } catch {
    return new ProgressInsightsClientError("INTERNAL_ERROR", response.status);
  }
}

async function request<T>(path: string, schema: { safeParse: (value: unknown) => { success: boolean; data?: T } }): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, { credentials: "include" });
  } catch {
    throw new ProgressInsightsClientError("NETWORK_ERROR", 0);
  }
  if (!response.ok) throw await errorFor(response);
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ProgressInsightsClientError("INVALID_RESPONSE", response.status);
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success || !parsed.data) throw new ProgressInsightsClientError("INVALID_RESPONSE", response.status);
  return parsed.data;
}

export function requestProgressHistory(learnerId: string, from: string, to: string): Promise<ProgressHistoryResponse> {
  return request(
    `/api/learners/${encodeURIComponent(learnerId)}/progress-history?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    progressHistoryResponseSchema
  );
}

export function requestTopicProgress(learnerId: string): Promise<TopicProgressResponse> {
  return request(`/api/learners/${encodeURIComponent(learnerId)}/topic-progress`, topicProgressResponseSchema);
}
