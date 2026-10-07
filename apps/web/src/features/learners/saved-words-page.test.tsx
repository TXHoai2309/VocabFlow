import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import type { LearnerDto, LearnerSavedVocabularyDto, LearnerVocabularyDto } from "@vocabflow/contracts";
import { ActiveLearnerProvider } from "./learner-context-provider";
import { useActiveLearner } from "./learner-context-hook";
import { ToastProvider } from "../../components/toast/toast-provider";
import { SavedWordsPage } from "./saved-words-page";

const learnerA: LearnerDto = {
  id: "00000000-0000-4000-8000-000000000010",
  householdId: "00000000-0000-4000-8000-000000000001",
  displayName: "An",
  avatarKey: null,
  enabled: true,
  createdAt: "2026-09-10T00:00:00.000Z",
  updatedAt: "2026-09-10T00:00:00.000Z"
};
const learnerB: LearnerDto = { ...learnerA, id: "00000000-0000-4000-8000-000000000011", displayName: "Bình" };

function vocabulary(id: number, word: string, overrides: Partial<LearnerVocabularyDto> = {}): LearnerVocabularyDto {
  return {
    id,
    word,
    ipa: `/${word}/`,
    vietnamese: `nghĩa ${word}`,
    definitionEn: null,
    exampleEn: null,
    imageUrl: null,
    audioUrl: null,
    topic: "Food",
    level: "GRADE_1",
    enabled: true,
    contentVersion: 1,
    status: "NEW",
    nextReviewDate: null,
    ...overrides
  };
}

function entry(id: number, word: string, overrides: Partial<LearnerVocabularyDto> = {}): LearnerSavedVocabularyDto {
  return { vocabulary: vocabulary(id, word, overrides), savedAt: `2026-10-0${id}T10:00:00.000Z` };
}

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}{location.search}</output>;
}

function LearnerRouteProbe() {
  const location = useLocation();
  const returnTo = (location.state as { returnTo?: unknown } | null)?.returnTo;
  return <output data-testid="learner-return-to">{typeof returnTo === "string" ? returnTo : ""}</output>;
}

function renderSaved(initialLearner: LearnerDto | null = learnerA, path = "/saved") {
  return render(
    <MemoryRouter initialEntries={[path]}><AccountRouteProbe />
      <ToastProvider>
        <ActiveLearnerProvider initialLearner={initialLearner}>
          <LocationProbe />
          <Routes>
            <Route path="/saved" element={<SavedWordsPage />} />
            <Route path="/learners" element={<LearnerRouteProbe />} />
            <Route path="/vocabulary" element={<p>Vocabulary catalog</p>} />
            <Route path="/vocabulary/:vocabularyId" element={<p>Vocabulary detail</p>} />
            <Route path="/study/setup" element={<p>Study setup</p>} />
          </Routes>
        </ActiveLearnerProvider>
      </ToastProvider>
    </MemoryRouter>
  );
}

function savedResponse(savedVocabulary: LearnerSavedVocabularyDto[], status = 200) {
  return response({ savedVocabulary }, status);
}

describe("Saved Words page", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("waits for internal identity at the original route without learner selection", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    renderSaved(null, "/saved?q=apple&level=GRADE_1&topic=Food");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(await screen.findByRole("status", { name: "Đang chuẩn bị học tập…" })).toBeInTheDocument();
    expect(screen.getByTestId("account-route")).toHaveTextContent("/saved?q=apple&level=GRADE_1&topic=Food");
    expect(screen.queryByText("learners-route")).not.toBeInTheDocument();
  });

  it("shows a dedicated empty state without filters or a study action", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(savedResponse([]));
    renderSaved();

    expect(await screen.findByRole("heading", { name: "Chưa có từ yêu thích" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Khám phá từ vựng" })).toHaveAttribute("href", "/vocabulary");
    expect(screen.queryByTestId("saved-words-search")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Học tất cả từ đã lưu/ })).not.toBeInTheDocument();
  });

  it("retries a failed saved vocabulary request without losing the current route", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(savedResponse([entry(1, "apple")]));
    renderSaved();

    expect(await screen.findByRole("heading", { name: "Không thể tải từ đã lưu" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));

    expect(await screen.findByTestId("vocabulary-row-1")).toHaveTextContent("apple");
    expect(screen.getByTestId("location")).toHaveTextContent("/saved");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("renders real saved rows, saved count, audio control and scoped Study Setup CTA", async () => {
    const saved = [entry(1, "apple", { vietnamese: "quả táo", audioUrl: "/apple.mp3" }), entry(2, "banana", { vietnamese: "quả chuối" })];
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(savedResponse(saved));
    renderSaved();

    expect(await screen.findByTestId("vocabulary-row-1")).toHaveTextContent("apple");
    expect(screen.getByTestId("vocabulary-row-1")).toHaveTextContent("quả táo");
    expect(screen.getByTestId("vocabulary-row-1")).toHaveTextContent("Đã lưu 01/10/2026");
    expect(within(screen.getByTestId("vocabulary-row-1")).getByRole("link")).toHaveAttribute("href", "/vocabulary/1");
    expect(screen.getAllByTestId(/vocabulary-row-/)).toHaveLength(2);
    expect(screen.getByRole("link", { name: /Học tất cả từ đã lưu \(2\)/ })).toHaveAttribute("href", "/study/setup?saved=1&content=all");
    expect(within(screen.getByTestId("vocabulary-row-2")).getByRole("button", { name: "Bỏ lưu từ banana" })).toHaveAttribute("aria-pressed", "true");
    expect(within(screen.getByTestId("vocabulary-row-1")).getByRole("button", { name: "Nghe phát âm apple" })).toBeEnabled();
    expect(fetchMock).toHaveBeenCalledWith(`/api/learners/${learnerA.id}/saved-vocabulary`, { credentials: "include" });
  });

  it.each([
    ["English", "apple", "q=apple"],
    ["Vietnamese", "quả chuối", "q=qu%E1%BA%A3+chu%E1%BB%91i"]
  ])("searches saved vocabulary by %s and updates URL state", async (_label, query, encoded) => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(savedResponse([
      entry(1, "apple", { vietnamese: "quả táo" }),
      entry(2, "banana", { vietnamese: "quả chuối" })
    ]));
    renderSaved();
    await screen.findByTestId("vocabulary-row-2");

    fireEvent.change(screen.getByTestId("saved-words-search"), { target: { value: query } });

    const matchingId = query === "apple" ? 1 : 2;
    const excludedId = matchingId === 1 ? 2 : 1;
    expect(screen.getByTestId(`vocabulary-row-${matchingId}`)).toBeInTheDocument();
    expect(screen.queryByTestId(`vocabulary-row-${excludedId}`)).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent(encoded));
  });

  it("trims whitespace and ignores case when matching the English word", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(savedResponse([entry(1, "apple"), entry(2, "book")]));
    renderSaved();
    await screen.findByTestId("vocabulary-row-2");

    fireEvent.change(screen.getByTestId("saved-words-search"), { target: { value: "  APPLE  " } });

    expect(screen.getByTestId("vocabulary-row-1")).toBeInTheDocument();
    expect(screen.queryByTestId("vocabulary-row-2")).not.toBeInTheDocument();
  });

  it("combines URL-backed level and topic filters with search using AND", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(savedResponse([
      entry(1, "apple", { vietnamese: "quả táo", topic: "Food", level: "GRADE_1" }),
      entry(2, "apple pie", { vietnamese: "bánh táo", topic: "Food", level: "GRADE_2" }),
      entry(3, "apple tree", { vietnamese: "cây táo", topic: "Nature", level: "GRADE_1" })
    ]));
    renderSaved(learnerA, "/saved?q=apple&level=GRADE_1&topic=Food");

    expect(await screen.findByTestId("vocabulary-row-1")).toBeInTheDocument();
    expect(screen.queryByTestId("vocabulary-row-2")).not.toBeInTheDocument();
    expect(screen.queryByTestId("vocabulary-row-3")).not.toBeInTheDocument();
    expect(screen.getByTestId("saved-words-level")).toHaveValue("GRADE_1");
    expect(screen.getByTestId("saved-words-topic")).toHaveValue("Food");
  });

  it("shows no-results separately from empty favorites and clears the filters", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(savedResponse([entry(1, "apple")]));
    renderSaved(learnerA, "/saved?q=kiwi&level=GRADE_1&topic=Food");

    expect(await screen.findByRole("heading", { name: "Không tìm thấy từ phù hợp" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Xóa bộ lọc" }));

    expect(await screen.findByTestId("vocabulary-row-1")).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("/saved");
  });

  it("removes a saved word optimistically and restores it with feedback if unsave fails", async () => {
    const saved = [entry(1, "apple")];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.endsWith("/saved-vocabulary/1") && init?.method === "DELETE") return response({ error: { code: "INTERNAL_ERROR" } }, 503);
      if (url.endsWith("/saved-vocabulary")) return savedResponse(saved);
      return response({ error: { code: "NOT_FOUND" } }, 404);
    });
    renderSaved();
    const row = await screen.findByTestId("vocabulary-row-1");

    fireEvent.click(within(row).getByRole("button", { name: "Bỏ lưu từ apple" }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Không thể cập nhật Yêu thích. Vui lòng thử lại."));
    expect(screen.getByTestId("vocabulary-row-1")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Học tất cả từ đã lưu \(1\)/ })).toBeInTheDocument();
  });

  it("removes the last row without reload and enters the empty state after a successful unsave", async () => {
    let isSaved = true;
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.endsWith("/saved-vocabulary/1") && init?.method === "DELETE") {
        isSaved = false;
        return response({ learnerId: learnerA.id, vocabularyId: 1, saved: false, savedAt: null });
      }
      if (url.endsWith("/saved-vocabulary")) return savedResponse(isSaved ? [entry(1, "apple")] : []);
      return response({ error: { code: "NOT_FOUND" } }, 404);
    });
    renderSaved();

    const row = await screen.findByTestId("vocabulary-row-1");
    fireEvent.click(within(row).getByRole("button", { name: "Bỏ lưu từ apple" }));

    expect(await screen.findByRole("heading", { name: "Chưa có từ yêu thích" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Học tất cả từ đã lưu/ })).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url, init]) => String(url).endsWith("/saved-vocabulary/1") && init?.method === "DELETE")).toBe(true);
    expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/saved-vocabulary") && !String(url).includes("/1"))).toHaveLength(1);
  });

  it("loads a different learner's own saved state after switching learners", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => String(input).includes(learnerA.id)
      ? savedResponse([entry(1, "apple")])
      : savedResponse([entry(2, "banana")]));

    function SwitchHarness() {
      const { setActiveLearner } = useActiveLearner();
      return <><button type="button" onClick={() => setActiveLearner(learnerB)}>Switch learner</button><SavedWordsPage /></>;
    }
    render(<MemoryRouter initialEntries={["/saved"]}><AccountRouteProbe /><ToastProvider><ActiveLearnerProvider initialLearner={learnerA}><SwitchHarness /></ActiveLearnerProvider></ToastProvider></MemoryRouter>);

    expect(await screen.findByTestId("vocabulary-row-1")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Switch learner" }));
    expect(await screen.findByTestId("vocabulary-row-2")).toBeInTheDocument();
    expect(screen.queryByTestId("vocabulary-row-1")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(`/api/learners/${learnerB.id}/saved-vocabulary`, { credentials: "include" });
  });
});

function AccountRouteProbe() { const route = useLocation(); return <output data-testid="account-route">{route.pathname}{route.search}</output>; }
