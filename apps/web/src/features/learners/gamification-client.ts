import { gamificationResponseSchema, type GamificationResponse } from "@vocabflow/contracts";

export class GamificationClientError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, status: number) {
    super(code);
    this.name = "GamificationClientError";
    this.code = code;
    this.status = status;
  }
}

export async function requestGamification(learnerId: string): Promise<GamificationResponse> {
  let response: Response;
  try {
    response = await fetch(`/api/learners/${encodeURIComponent(learnerId)}/gamification`, { credentials: "include" });
  } catch {
    throw new GamificationClientError("NETWORK_ERROR", 0);
  }
  if (!response.ok) {
    let code = "INTERNAL_ERROR";
    try {
      const body = await response.json() as { error?: { code?: unknown } };
      if (typeof body.error?.code === "string") code = body.error.code;
    } catch {
      // Keep a safe generic code for malformed error responses.
    }
    throw new GamificationClientError(code, response.status);
  }
  try {
    const parsed = gamificationResponseSchema.safeParse(await response.json());
    if (!parsed.success) throw new Error("INVALID_RESPONSE");
    return parsed.data;
  } catch {
    throw new GamificationClientError("INVALID_RESPONSE", response.status);
  }
}
