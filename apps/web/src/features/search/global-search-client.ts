import { learningFetch } from "../guest/learning-fetch";
import { globalSearchResponseSchema, type GlobalSearchResponse } from "@vocabflow/contracts";

export class GlobalSearchClientError extends Error {
  readonly status: number;

  constructor(status: number) {
    super("GLOBAL_SEARCH_REQUEST_FAILED");
    this.name = "GlobalSearchClientError";
    this.status = status;
  }
}

export async function requestGlobalSearch(learnerId: string, query: string, signal: AbortSignal): Promise<GlobalSearchResponse> {
  const normalized = query.trim().normalize("NFC");
  if (!normalized || Array.from(normalized).length > 100) throw new GlobalSearchClientError(400);
  const params = new URLSearchParams({ q: normalized, limit: "5" });
  let response: Response;
  try {
    response = await learningFetch(`/api/learners/${encodeURIComponent(learnerId)}/search?${params}`, {
      credentials: "include",
      signal
    });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new GlobalSearchClientError(0);
  }
  if (!response.ok) throw new GlobalSearchClientError(response.status);

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new GlobalSearchClientError(response.status);
  }
  const parsed = globalSearchResponseSchema.safeParse(payload);
  if (!parsed.success) throw new GlobalSearchClientError(response.status);
  return parsed.data;
}
