import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
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

function item(
  id: number,
  word: string,
  status: LearnerVocabularyDto["status"] = "NEW",
  level: VocabularyLevel | null = null,
  overrides: Partial<LearnerVocabularyDto> = {}
): LearnerVocabularyDto {
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
    nextReviewDate: status === "NEW" ? null : "2026-09-20",
    ...overrides
  };
}

function response(vocabulary: LearnerVocabularyDto[], status = 200) {
  return new Response(JSON.stringify({ vocabulary }), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function savedResponse(saved: LearnerVocabularyDto[] = []) {
  return new Response(JSON.stringify({ savedVocabulary: saved.map((vocabulary) => ({ vocabulary, savedAt: "2026-10-02T10:00:00.000Z" })) }), {
    headers: { "Content-Type": "application/json" }
  });
}

function LearnerRouteProbe() {
  const location = useLocation();
  const returnTo = (location.state as { returnTo?: unknown } | null)?.returnTo;
  return <div><span>learners-route</span><output data-testid="learner-return-to">{typeof returnTo === "string" ? returnTo : ""}</output></div>;
}

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="current-url">{location.pathname}{location.search}</output>;
}

function renderList(initialLearner: LearnerDto | null = learnerA, path = "/vocabulary") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ActiveLearnerProvider initialLearner={initialLearner}>
        <LocationProbe />
        <Routes>
          <Route path="/vocabulary" element={<VocabularyListPage />} />
          <Route path="/vocabulary/:vocabularyId" element={<div data-testid="detail-route">detail route</div>} />
          <Route path="/learners" element={<LearnerRouteProbe />} />
        </Routes>
      </ActiveLearnerProvider>
    </MemoryRouter>
  );
}

function mockVocabulary(items: LearnerVocabularyDto[]) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    return url.endsWith("/saved-vocabulary") ? savedResponse() : response(items);
  });
}

describe("US-22 vocabulary list UI", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the page heading, labelled search and real vocabulary cards", async () => {
    const fetchMock = mockVocabulary([
      item(1, "apple", "NEW", "GRADE_1", { ipa: "/ˈæp.əl/", vietnamese: "quả táo" }),
      item(2, "book", "LEARNING", "GENERAL", { vietnamese: "quyển sách" }),
      item(3, "cat", "MASTERED")
    ]);
    renderList();

    expect(screen.getByRole("searchbox", { name: "Tìm từ tiếng Anh hoặc nghĩa tiếng Việt" })).toBeInTheDocument();
    expect(await screen.findByTestId("vocabulary-grid")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Từ vựng của An" })).toBeInTheDocument();
    expect(screen.getByTestId("vocabulary-row-1")).toHaveTextContent("apple");
    expect(screen.getByTestId("vocabulary-row-1")).toHaveTextContent("/ˈæp.əl/");
    expect(screen.getByTestId("vocabulary-row-1")).toHaveTextContent("Lớp 1");
    expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/vocabulary"))).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(`/api/learners/${learnerA.id}/vocabulary`, { credentials: "include" });
  });

  it("filters by an English word on the client", async () => {
    mockVocabulary([item(1, "apple"), item(2, "book")]);
    renderList();
    await screen.findByTestId("vocabulary-row-2");

    fireEvent.change(screen.getByTestId("vocabulary-search"), { target: { value: "apple" } });

    expect(screen.getByTestId("vocabulary-row-1")).toBeInTheDocument();
    expect(screen.queryByTestId("vocabulary-row-2")).not.toBeInTheDocument();
  });

  it("filters by Vietnamese meaning", async () => {
    mockVocabulary([item(1, "apple", "NEW", null, { vietnamese: "quả táo" }), item(2, "book", "NEW", null, { vietnamese: "quyển sách" })]);
    renderList();
    await screen.findByTestId("vocabulary-row-2");

    fireEvent.change(screen.getByTestId("vocabulary-search"), { target: { value: "quả táo" } });

    expect(screen.getByTestId("vocabulary-row-1")).toBeInTheDocument();
    expect(screen.queryByTestId("vocabulary-row-2")).not.toBeInTheDocument();
  });

  it("matches English searches without case sensitivity", async () => {
    mockVocabulary([item(1, "apple"), item(2, "book")]);
    renderList();
    await screen.findByTestId("vocabulary-row-2");

    fireEvent.change(screen.getByTestId("vocabulary-search"), { target: { value: "APPLE" } });

    expect(screen.getByTestId("vocabulary-row-1")).toBeInTheDocument();
    expect(screen.queryByTestId("vocabulary-row-2")).not.toBeInTheDocument();
  });

  it("trims whitespace before matching", async () => {
    mockVocabulary([item(1, "apple"), item(2, "book")]);
    renderList();
    await screen.findByTestId("vocabulary-row-2");

    fireEvent.change(screen.getByTestId("vocabulary-search"), { target: { value: "  APPLE  " } });

    expect(screen.getByTestId("vocabulary-row-1")).toBeInTheDocument();
    expect(screen.queryByTestId("vocabulary-row-2")).not.toBeInTheDocument();
  });

  it("shows a distinct no-results state and clears the search", async () => {
    mockVocabulary([item(1, "apple")]);
    renderList();
    await screen.findByTestId("vocabulary-row-1");
    fireEvent.change(screen.getByTestId("vocabulary-search"), { target: { value: "kiwi" } });

    expect(screen.getByTestId("vocabulary-no-results")).toHaveTextContent("Không tìm thấy từ phù hợp");
    expect(screen.getByTestId("vocabulary-no-results")).toHaveTextContent("Thử từ khóa khác hoặc thay đổi bộ lọc.");
    fireEvent.click(screen.getByTestId("vocabulary-empty-clear"));

    expect(screen.getByTestId("vocabulary-row-1")).toBeInTheDocument();
    expect(screen.getByTestId("vocabulary-search")).toHaveValue("");
  });

  it("clears the search with its trailing clear button", async () => {
    mockVocabulary([item(1, "apple")]);
    renderList();
    await screen.findByTestId("vocabulary-row-1");
    fireEvent.change(screen.getByTestId("vocabulary-search"), { target: { value: "apple" } });
    fireEvent.click(screen.getByTestId("vocabulary-clear-search"));

    expect(screen.getByTestId("vocabulary-search")).toHaveValue("");
    expect(screen.getByTestId("vocabulary-row-1")).toBeInTheDocument();
  });

  it("combines the level filter and search without another API request", async () => {
    const fetchMock = mockVocabulary([
      item(1, "apple", "NEW", "GRADE_1"),
      item(2, "apple juice", "NEW", "GRADE_2"),
      item(3, "book", "NEW", "GRADE_1")
    ]);
    renderList();
    await screen.findByTestId("vocabulary-row-3");
    fireEvent.change(screen.getByTestId("vocabulary-search"), { target: { value: "apple" } });
    fireEvent.change(screen.getByTestId("vocabulary-level-filter"), { target: { value: "GRADE_1" } });

    expect(screen.getByTestId("vocabulary-row-1")).toBeInTheDocument();
    expect(screen.queryByTestId("vocabulary-row-2")).not.toBeInTheDocument();
    expect(screen.queryByTestId("vocabulary-row-3")).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/vocabulary"))).toHaveLength(1);
  });

  it("initializes the search input and results from the q URL parameter", async () => {
    mockVocabulary([item(1, "apple"), item(2, "book")]);
    renderList(learnerA, "/vocabulary?q=book");

    expect(await screen.findByTestId("vocabulary-row-2")).toBeInTheDocument();
    expect(screen.getByTestId("vocabulary-search")).toHaveValue("book");
    expect(screen.queryByTestId("vocabulary-row-1")).not.toBeInTheDocument();
  });

  it("initializes the level filter and results from the level URL parameter", async () => {
    mockVocabulary([item(1, "apple", "NEW", "GRADE_1"), item(2, "book", "NEW", "GENERAL")]);
    renderList(learnerA, "/vocabulary?level=GRADE_1");

    expect(await screen.findByTestId("vocabulary-row-1")).toBeInTheDocument();
    expect(screen.getByTestId("vocabulary-level-filter")).toHaveValue("GRADE_1");
    expect(screen.queryByTestId("vocabulary-row-2")).not.toBeInTheDocument();
  });

  it("updates q in the URL without reloading and removes it when cleared", async () => {
    mockVocabulary([item(1, "apple")]);
    renderList();
    await screen.findByTestId("vocabulary-row-1");
    fireEvent.change(screen.getByTestId("vocabulary-search"), { target: { value: "apple" } });

    await waitFor(() => expect(screen.getByTestId("current-url")).toHaveTextContent("/vocabulary?q=apple"));
    fireEvent.click(screen.getByTestId("vocabulary-clear-search"));
    await waitFor(() => expect(screen.getByTestId("current-url")).toHaveTextContent("/vocabulary"));
  });

  it("redirects without a learner and preserves the complete search URL", async () => {
    renderList(null, "/vocabulary?q=apple&level=GRADE_1");

    expect(await screen.findByText("learners-route")).toBeInTheDocument();
    expect(screen.getByTestId("learner-return-to")).toHaveTextContent("/vocabulary?q=apple&level=GRADE_1");
  });

  it("navigates to the vocabulary detail when a card link is activated", async () => {
    mockVocabulary([item(27, "apple", "NEW", "GRADE_1", { vietnamese: "quả táo" })]);
    renderList();
    await screen.findByTestId("vocabulary-row-27");

    fireEvent.click(screen.getByRole("link", { name: /apple.*quả táo.*xem chi tiết/i }));

    expect(await screen.findByTestId("detail-route")).toBeInTheDocument();
    expect(screen.getByTestId("current-url")).toHaveTextContent("/vocabulary/27");
  });

  it("shows the image placeholder when a real image URL fails", async () => {
    mockVocabulary([item(1, "apple", "NEW", null, { imageUrl: "https://cdn.example.test/apple.webp" })]);
    renderList();
    const card = await screen.findByTestId("vocabulary-row-1");
    fireEvent.error(within(card).getByRole("img", { name: "Hình minh họa apple" }));

    expect(within(card).queryByRole("img")).not.toBeInTheDocument();
    expect(card.querySelector("svg")).toBeInTheDocument();
  });

  it("disables audio without a real audio URL and enables the real save control", async () => {
    mockVocabulary([item(1, "apple")]);
    renderList();
    const card = await screen.findByTestId("vocabulary-row-1");

    expect(within(card).getByRole("button", { name: "Nghe phát âm apple" })).toBeDisabled();
    expect(within(card).getByRole("button", { name: "Lưu từ apple" })).toBeEnabled();
  });

  it("saves optimistically and does not navigate when the bookmark is clicked", async () => {
    const saved = new Set<number>();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      const match = url.match(/saved-vocabulary\/(\d+)$/);
      if (match) {
        const id = Number(match[1]);
        if (init?.method === "POST") saved.add(id);
        else if (init?.method === "DELETE") saved.delete(id);
        return new Response(JSON.stringify({ learnerId: learnerA.id, vocabularyId: id, saved: init?.method === "POST", savedAt: init?.method === "POST" ? "2026-10-02T10:00:00.000Z" : null }), { headers: { "Content-Type": "application/json" } });
      }
      return url.endsWith("/saved-vocabulary")
        ? savedResponse([...saved].map((id) => item(id, "apple")))
        : response([item(1, "apple", "NEW", "GRADE_1", { audioUrl: "/apple.mp3" })]);
    });
    renderList();
    const card = await screen.findByTestId("vocabulary-row-1");

    fireEvent.click(within(card).getByRole("button", { name: "Lưu từ apple" }));

    await waitFor(() => expect(within(card).getByRole("button", { name: "Bỏ lưu từ apple" })).toHaveAttribute("aria-pressed", "true"));
    expect(screen.getByTestId("current-url")).toHaveTextContent("/vocabulary");
    expect(fetchMock.mock.calls.some(([url, init]) => String(url).endsWith("/saved-vocabulary/1") && init?.method === "POST")).toBe(true);
    expect(screen.queryByTestId("detail-route")).not.toBeInTheDocument();
  });

  it("rolls back a failed save with an accessible message", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      if (String(input).endsWith("/saved-vocabulary/1") && init?.method === "POST") return response([], 503);
      return String(input).endsWith("/saved-vocabulary") ? savedResponse() : response([item(1, "apple")]);
    });
    renderList();
    const card = await screen.findByTestId("vocabulary-row-1");

    fireEvent.click(within(card).getByRole("button", { name: "Lưu từ apple" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Không thể lưu từ. Vui lòng thử lại.");
    expect(within(card).getByRole("button", { name: "Lưu từ apple" })).toHaveAttribute("aria-pressed", "false");
  });

  it("shows a separate empty state when the API returns no vocabulary", async () => {
    mockVocabulary([]);
    renderList();

    expect(await screen.findByTestId("vocabulary-empty-state")).toHaveTextContent("Chưa có từ vựng");
    expect(screen.queryByTestId("vocabulary-no-results")).not.toBeInTheDocument();
  });

  it("paginates larger real data at 12 items and resets page when search changes", async () => {
    mockVocabulary(Array.from({ length: 13 }, (_, index) => item(index + 1, `word-${index + 1}`)));
    renderList();

    expect(await screen.findByTestId("vocabulary-row-12")).toBeInTheDocument();
    expect(screen.queryByTestId("vocabulary-row-13")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Trang sau" }));
    expect(await screen.findByTestId("vocabulary-row-13")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId("current-url")).toHaveTextContent("page=2"));

    fireEvent.change(screen.getByTestId("vocabulary-search"), { target: { value: "word" } });
    expect(await screen.findByTestId("vocabulary-row-1")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId("current-url")).toHaveTextContent("q=word"));
    expect(screen.getByTestId("current-url")).not.toHaveTextContent("page=");
  });

  it("restores a valid page URL after the full list has loaded", async () => {
    mockVocabulary(Array.from({ length: 13 }, (_, index) => item(index + 1, `word-${index + 1}`)));
    renderList(learnerA, "/vocabulary?page=2");

    expect(await screen.findByTestId("vocabulary-row-13")).toBeInTheDocument();
    expect(screen.queryByTestId("vocabulary-row-1")).not.toBeInTheDocument();
    expect(screen.getByTestId("current-url")).toHaveTextContent("/vocabulary?page=2");
  });

  it("shows a retry action after a list request fails", async () => {
    let vocabularyCalls = 0;
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      if (String(input).endsWith("/saved-vocabulary")) return savedResponse();
      vocabularyCalls += 1;
      return vocabularyCalls === 1 ? response([], 503) : response([item(1, "apple")]);
    });
    renderList();

    expect(await screen.findByTestId("vocabulary-error")).toHaveTextContent("Không thể tải từ vựng lúc này. Vui lòng thử lại.");
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(await screen.findByTestId("vocabulary-row-1")).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/vocabulary"))).toHaveLength(2);
  });

  it("refreshes the vocabulary using the newly selected learner", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      if (String(input).endsWith("/saved-vocabulary")) return savedResponse();
      return String(input).includes(learnerA.id) ? response([item(1, "apple", "LEARNING")]) : response([item(1, "apple", "NEW")]);
    });

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
        <ActiveLearnerProvider initialLearner={learnerA}><SwitchHarness /></ActiveLearnerProvider>
      </MemoryRouter>
    );

    expect(await screen.findByTestId("vocabulary-row-1")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Switch learner" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Từ vựng của Bình" })).toBeInTheDocument());
    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => String(url) === `/api/learners/${learnerB.id}/vocabulary`)).toBe(true));
    expect(fetchMock).toHaveBeenNthCalledWith(1, `/api/learners/${learnerA.id}/vocabulary`, { credentials: "include" });
    expect(fetchMock).toHaveBeenCalledWith(`/api/learners/${learnerB.id}/vocabulary`, { credentials: "include" });
  });
});
