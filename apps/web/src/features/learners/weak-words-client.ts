import {
  weakWordsResponseSchema,
  type WeakWordsResponse,
  type WeakWordsStatus
} from "@vocabflow/contracts";

export class WeakWordsClientError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, status: number) {
    super(code);
    this.name = "WeakWordsClientError";
    this.code = code;
    this.status = status;
  }
}

async function readError(response: Response) {
  let code = "INTERNAL_ERROR";
  try {
    const payload = await response.json() as { error?: { code?: unknown } };
    if (typeof payload.error?.code === "string") code = payload.error.code;
  } catch {
    // Keep a safe generic error for non-JSON responses.
  }
  return new WeakWordsClientError(code, response.status);
}

export async function requestWeakWords(learnerId: string, options: {
  q: string;
  status: WeakWordsStatus | null;
  page: number;
  pageSize?: number;
}): Promise<WeakWordsResponse> {
  const params = new URLSearchParams();
  if (options.q.trim()) params.set("q", options.q.trim());
  if (options.status) params.set("status", options.status);
  params.set("page", String(options.page));
  params.set("pageSize", String(options.pageSize ?? 20));
  let response: Response;
  try {
    response = await fetch(`/api/learners/${encodeURIComponent(learnerId)}/weak-words?${params.toString()}`, {
      credentials: "include"
    });
  } catch {
    throw new WeakWordsClientError("NETWORK_ERROR", 0);
  }
  if (!response.ok) throw await readError(response);
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new WeakWordsClientError("INVALID_RESPONSE", response.status);
  }
  const parsed = weakWordsResponseSchema.safeParse(payload);
  if (!parsed.success) throw new WeakWordsClientError("INVALID_RESPONSE", response.status);
  return parsed.data;
}
