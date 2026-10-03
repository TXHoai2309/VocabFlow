import { afterEach, describe, expect, it, vi } from "vitest";
import { requestContinueLearningSummary } from "./continue-learning-client";

describe("continue learning client", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("requests one learner summary without fetching the vocabulary catalog", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({
      learnerId: "00000000-0000-4000-8000-000000000010",
      candidate: null
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(requestContinueLearningSummary("00000000-0000-4000-8000-000000000010"))
      .resolves.toMatchObject({ candidate: null });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/learners/00000000-0000-4000-8000-000000000010/continue-learning");
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ credentials: "include" });
  });
});
