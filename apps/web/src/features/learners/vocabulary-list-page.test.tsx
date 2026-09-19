import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import type { LearnerDto, LearnerVocabularyDto, VocabularyLevel } from "@vocabflow/contracts";
import { ActiveLearnerProvider } from "./learner-context-provider";
import { useActiveLearner } from "./learner-context-hook";
import { VocabularyListPage } from "./vocabulary-list-page";

const learner = (id: string, displayName: string): LearnerDto => ({
  id,
  householdId: "00000000-0000-4000-8000-000000000001",
  displayName,
  avatarKey: null,
  enabled: true,
  createdAt: "2026-09-10T00:00:00.000Z",
  updatedAt: "2026-09-10T00:00:00.000Z"
});

const learnerA = learner("00000000-0000-4000-8000-000000000010", "An");
const learnerB = learner("00000000-0000-4000-8000-000000000011", "Bình");

function item(id: number, word: string, status: LearnerVocabularyDto["status"], level: VocabularyLevel | null = null): LearnerVocabularyDto {
  return {
    id,
    word,
    ipa: null,
    vietnamese: `nghĩa-${word}`,
    definitionEn: null,
    exampleEn: null,
    imageUrl: null,
    audioUrl: null,
    topic: null,
    level,
    enabled: true,
    contentVersion: 1,
    status,
    nextReviewDate: status === "NEW" ? null : "2026-09-20"
  };
}

function response(vocabulary: LearnerVocabularyDto[], status = 200) {
  return new Response(JSON.stringify({ vocabulary }), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function renderList(initialLearner: LearnerDto | null = learnerA) {
  return render(
    <MemoryRouter initialEntries={["/vocabulary"]}>
      <ActiveLearnerProvider initialLearner={initialLearner}>
        <Routes>
          <Route path="/vocabulary" element={<VocabularyListPage />} />
          <Route path="/learners" element={<p>learners-route</p>} />
        </Routes>
      </ActiveLearnerProvider>
    </MemoryRouter>
  );
}

describe("US-22 vocabulary list UI", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("shows loading and resolves New, Learning and Mastered statuses", async () => {
    let resolveResponse!: (value: Response) => void;
    const pending = new Promise<Response>((resolve) => { resolveResponse = resolve; });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockReturnValue(pending);
    renderList();

    expect(screen.getByTestId("vocabulary-loading")).toBeInTheDocument();
    resolveResponse(response([
      item(1, "apple", "NEW"),
      item(2, "book", "LEARNING"),
      item(3, "cat", "MASTERED")
    ]));

    expect(await screen.findByTestId("vocabulary-list")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Từ vựng của An" })).toBeInTheDocument();
    expect(screen.getByTestId("vocabulary-row-1")).toHaveTextContent("New");
    expect(screen.getByTestId("vocabulary-row-2")).toHaveTextContent("Learning");
    expect(screen.getByTestId("vocabulary-row-3")).toHaveTextContent("Mastered");
    expect(fetchMock).toHaveBeenCalledWith("/api/learners/" + learnerA.id + "/vocabulary", { credentials: "include" });
  });

  it("shows an explicit empty state when no enabled vocabulary is returned", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(response([]));
    renderList();
    expect(await screen.findByTestId("vocabulary-empty-state")).toHaveTextContent("Chưa có từ vựng");
  });

  it("shows a safe retry state after the list request fails", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response([], 503))
      .mockResolvedValueOnce(response([item(1, "apple", "NEW")]));
    renderList();

    expect(await screen.findByTestId("vocabulary-error")).toHaveTextContent("Không thể tải vocabulary lúc này. Vui lòng thử lại.");
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    await waitFor(() => expect(screen.getByTestId("vocabulary-list")).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("refreshes by learner id and removes the previous learner status", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response([item(1, "apple", "LEARNING")]))
      .mockResolvedValueOnce(response([item(1, "apple", "NEW")]));

    function SwitchHarness() {
      const { setActiveLearner } = useActiveLearner();
      return (
        <>
          <button type="button" onClick={() => setActiveLearner(learnerB)}>Switch learner</button>
          <VocabularyListPage />
        </>
      );
    }

    render(
      <MemoryRouter initialEntries={["/vocabulary"]}>
        <ActiveLearnerProvider initialLearner={learnerA}>
          <SwitchHarness />
        </ActiveLearnerProvider>
      </MemoryRouter>
    );

    expect(await screen.findByTestId("vocabulary-row-1")).toHaveTextContent("Learning");
    fireEvent.click(screen.getByRole("button", { name: "Switch learner" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Từ vựng của Bình" })).toBeInTheDocument());
    await waitFor(() => expect(screen.getByTestId("vocabulary-row-1")).toHaveTextContent("New"));
    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/learners/" + learnerA.id + "/vocabulary", { credentials: "include" });
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/learners/" + learnerB.id + "/vocabulary", { credentials: "include" });
  });

  it("filters the current learner list by level and returns to the unfiltered view", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response([item(1, "apple", "NEW", "GRADE_1"), item(2, "book", "NEW", "GENERAL")]))
      .mockResolvedValueOnce(response([item(1, "apple", "NEW", "GRADE_1")]));
    renderList();

    expect(await screen.findByTestId("vocabulary-row-2")).toBeInTheDocument();
    fireEvent.change(screen.getByTestId("vocabulary-level-filter"), { target: { value: "GRADE_1" } });
    await waitFor(() => expect(screen.queryByTestId("vocabulary-row-2")).not.toBeInTheDocument());
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/learners/" + learnerA.id + "/vocabulary?level=GRADE_1", { credentials: "include" });
    expect(screen.getByTestId("vocabulary-row-1")).toBeInTheDocument();
  });

  it("redirects to learner home when no active learner exists", async () => {
    renderList(null);
    expect(await screen.findByText("learners-route")).toBeInTheDocument();
  });
});
