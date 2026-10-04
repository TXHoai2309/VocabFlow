import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import type { LearnerDto, ReviewQueueItem, ReviewQueueResponse, VocabularyDto } from "@vocabflow/contracts";
import { ActiveLearnerProvider } from "../learners/learner-context-provider";
import { StudyPage } from "./study-page";
import { StudySetupPage } from "./study-setup-page";

const learner: LearnerDto = {
  id: "00000000-0000-4000-8000-000000000010",
  householdId: "00000000-0000-4000-8000-000000000001",
  displayName: "An",
  avatarKey: null,
  enabled: true,
  createdAt: "2026-09-10T00:00:00.000Z",
  updatedAt: "2026-09-10T00:00:00.000Z"
};

function vocabulary(id: number, word = `word-${id}`): VocabularyDto {
  return {
    id,
    word,
    ipa: null,
    vietnamese: `nghĩa ${word}`,
    definitionEn: null,
    exampleEn: null,
    imageUrl: null,
    audioUrl: null,
    topic: null,
    level: null,
    enabled: true,
    contentVersion: 1
  };
}

function item(id: number, queueType: ReviewQueueItem["queueType"] = "NEW", status?: ReviewQueueItem["status"]): ReviewQueueItem {
  const resolvedStatus = status ?? (queueType === "NEW" ? "NEW" : queueType === "DUE" ? "LEARNING" : "MASTERED");
  return {
    vocabulary: vocabulary(id),
    queueType,
    status: resolvedStatus,
    nextReviewDate: queueType === "DUE" ? "2026-09-15" : queueType === "VOLUNTARY" ? "2026-09-20" : null,
    expectedRevision: queueType === "NEW" ? 0 : queueType === "DUE" ? 2 : 8
  };
}

function queueResponse(queue: ReviewQueueItem[]): ReviewQueueResponse {
  return {
    learnerId: learner.id,
    reviewDate: "2026-09-15",
    dueCount: queue.filter((entry) => entry.queueType === "DUE").length,
    newCount: queue.filter((entry) => entry.queueType === "NEW").length,
    queue
  };
}

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const topicVocabulary = [vocabulary(1, "apple"), vocabulary(3, "water")];
const topic = { id: 7, slug: "food", name: "Food", description: "Food words", sortOrder: 1, enabled: true };
const learningSetVocabulary = [vocabulary(2, "bread"), vocabulary(3, "water")];
const learningSet = {
  id: 4,
  slug: "starter-words",
  name: "Starter Words",
  description: "A starter set",
  grade: null,
  enabled: true,
  sortOrder: 1,
  vocabularyCount: learningSetVocabulary.length,
  items: learningSetVocabulary.map((entry, index) => ({ sortOrder: index, vocabulary: entry }))
};

function mockStudyData(queue: ReviewQueueItem[]) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const path = String(input);
    if (path === `/api/learners/${learner.id}/review-queue` || path === `/api/learners/${learner.id}/review-queue?scope=saved` || path === `/api/learners/${learner.id}/review-queue?scope=saved&content=all` || path === `/api/learners/${learner.id}/review-queue?scope=weak`) return response(queueResponse(queue));
    if (path === "/api/topics") return response({ topics: [topic] });
    if (path === "/api/topics/7/vocabulary") return response({ vocabulary: topicVocabulary });
    if (path === "/api/learning-sets/4") return response({ learningSet });
    return response({ error: { code: "NOT_FOUND" } }, 404);
  });
}

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}{location.search}</output>;
}

function LearnerReturnProbe() {
  const location = useLocation();
  const returnTo = (location.state as { returnTo?: unknown } | null)?.returnTo;
  return <output data-testid="learner-return-to">{typeof returnTo === "string" ? returnTo : ""}</output>;
}

function renderSetup(path = "/study/setup", activeLearner: LearnerDto | null = learner) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ActiveLearnerProvider initialLearner={activeLearner}>
        <Routes>
          <Route path="/study/setup" element={<StudySetupPage />} />
          <Route path="/study" element={<StudyPage />} />
          <Route path="/learners" element={<LearnerReturnProbe />} />
          <Route path="/topics/:topicId" element={<LocationProbe />} />
          <Route path="/learning-sets/:learningSetId" element={<LocationProbe />} />
        </Routes>
      </ActiveLearnerProvider>
    </MemoryRouter>
  );
}

describe("Study Setup", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("renders the 10 word preset and prefers mixed when both queue types are available", async () => {
    mockStudyData([item(1, "DUE"), item(2), item(3, "DUE")]);
    renderSetup();

    expect(await screen.findByRole("heading", { name: "Thiết lập buổi học" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /10\s*từ/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /Kết hợp/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("study-setup-summary-count")).toHaveTextContent("3 từ");
    expect(screen.getByTestId("study-setup-summary-mode")).toHaveTextContent("Kết hợp");
    fireEvent.click(screen.getByRole("button", { name: /Bắt đầu học/ }));
    expect(await screen.findByTestId("study-session-ready")).toBeInTheDocument();
    expect(screen.getByTestId("session-counter")).toHaveTextContent("Câu 1 / 3");
    expect(screen.getByText("Kết hợp")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Thoát buổi học" })).toHaveAttribute("href", "/study/setup");
  });

  it("allows each requested amount and New, Review, and Mixed mode selection", async () => {
    mockStudyData([item(1, "DUE"), item(2), item(3, "DUE"), item(4)]);
    renderSetup();
    await screen.findByTestId("study-setup-page");

    for (const amount of [5, 10, 20, 30]) {
      const option = screen.getByRole("button", { name: new RegExp(`${amount}\\s*từ`) });
      fireEvent.click(option);
      expect(option).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByTestId("study-setup-summary-count")).toHaveTextContent("4 từ");
    }

    for (const [mode, label] of [["new", "Từ mới"], ["review", "Ôn tập"], ["mixed", "Kết hợp"]] as const) {
      const option = screen.getByRole("button", { name: new RegExp(label) });
      fireEvent.click(option);
      expect(option).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByTestId("study-setup-summary-mode")).toHaveTextContent(label);
      const expectedCount = mode === "new" ? 2 : mode === "review" ? 2 : 4;
      expect(screen.getByTestId("study-setup-summary-count")).toHaveTextContent(`${expectedCount} từ`);
    }
  });

  it("disables empty modes and falls back to New when only new words are available", async () => {
    mockStudyData([item(1), item(2)]);
    renderSetup();

    expect(await screen.findByRole("button", { name: /Từ mới/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /Ôn tập/ })).toBeDisabled();
    expect(screen.getByText("Hiện chưa có từ cần ôn")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Kết hợp/ })).toBeEnabled();
  });

  it("disables empty new content and defaults to Review when only due words exist", async () => {
    mockStudyData([item(1, "DUE"), item(2, "DUE")]);
    renderSetup();

    expect(await screen.findByRole("button", { name: /Ôn tập/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /Từ mới/ })).toBeDisabled();
    expect(screen.getByText("Hiện chưa có từ mới cần học")).toBeInTheDocument();
  });

  it("keeps New enabled beside Due and starts a New-only session when selected", async () => {
    mockStudyData([item(1, "DUE"), item(2, "DUE"), item(3), item(4)]);
    renderSetup();

    await screen.findByTestId("study-setup-page");
    const newMode = screen.getByRole("button", { name: /Từ mới/ });
    expect(newMode).toBeEnabled();
    expect(screen.getByRole("button", { name: /Ôn tập/ })).toBeEnabled();
    expect(screen.getByRole("button", { name: /Kết hợp/ })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(newMode);
    expect(screen.getByTestId("study-setup-summary-count")).toHaveTextContent("2 từ");
    fireEvent.click(screen.getByRole("button", { name: /Bắt đầu học/ }));

    expect(await screen.findByTestId("study-session-ready")).toBeInTheDocument();
    expect(screen.getByTestId("session-counter")).toHaveTextContent("Câu 1 / 2");
    expect(screen.getByText("word-3")).toBeInTheDocument();
    expect(screen.queryByText("word-1")).not.toBeInTheDocument();
  });

  it("uses only topic vocabulary and keeps the scope in the session URL", async () => {
    const queue = [item(1, "DUE"), item(2), item(3), item(4, "DUE")];
    const fetchMock = mockStudyData(queue);
    renderSetup("/study/setup?topicId=7");

    expect(await screen.findByTestId("study-setup-summary-scope")).toHaveTextContent("Food");
    fireEvent.click(screen.getByRole("button", { name: /Từ mới/ }));
    fireEvent.click(screen.getByRole("button", { name: /30\s*từ/ }));
    expect(screen.getByTestId("study-setup-summary-count")).toHaveTextContent("1 từ");
    expect(await screen.findByRole("button", { name: /Bắt đầu học/ })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: /Bắt đầu học/ }));

    expect(await screen.findByTestId("study-session-ready")).toBeInTheDocument();
    expect(screen.getByTestId("session-counter")).toHaveTextContent("Câu 1 / 1");
    expect(screen.getByRole("link", { name: "Thoát buổi học" })).toHaveAttribute("href", "/study/setup?topicId=7");
    expect(screen.getByText("word-3")).toBeInTheDocument();
    expect(screen.queryByText("word-2")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/topics/7/vocabulary", { credentials: "include" });
  });

  it("starts exactly the selected number of due Review words", async () => {
    mockStudyData(Array.from({ length: 7 }, (_, index) => item(index + 1, "DUE")).concat(Array.from({ length: 8 }, (_, index) => item(index + 8))));
    renderSetup();

    await screen.findByTestId("study-setup-page");
    fireEvent.click(screen.getByRole("button", { name: /5\s*từ/ }));
    fireEvent.click(screen.getByRole("button", { name: /Ôn tập/ }));
    expect(screen.getByTestId("study-setup-summary-count")).toHaveTextContent("5 từ");
    fireEvent.click(screen.getByRole("button", { name: /Bắt đầu học/ }));

    expect(await screen.findByTestId("study-session-ready")).toBeInTheDocument();
    expect(screen.getByTestId("session-counter")).toHaveTextContent("Câu 1 / 5");
    expect(screen.getByText("Ôn tập")).toBeInTheDocument();
  });

  it("honors the Review setup URL and starts only canonical due queue items", async () => {
    const fetchMock = mockStudyData([item(1, "DUE"), item(2), item(3, "VOLUNTARY")]);
    renderSetup("/study/setup?content=review");

    await screen.findByTestId("study-setup-page");
    expect(screen.getByRole("button", { name: /Ôn tập/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("study-setup-summary-mode")).toHaveTextContent("Ôn tập");
    expect(screen.getByTestId("study-setup-summary-count")).toHaveTextContent("1 từ");
    fireEvent.click(screen.getByRole("button", { name: /Bắt đầu học/ }));

    expect(await screen.findByTestId("study-session-ready")).toBeInTheDocument();
    expect(screen.getByTestId("session-counter")).toHaveTextContent("Câu 1 / 1");
    expect(screen.getByText("word-1")).toBeInTheDocument();
    expect(screen.queryByText("word-2")).not.toBeInTheDocument();
    expect(screen.queryByText("word-3")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Thoát buổi học" })).toHaveAttribute("href", "/study/setup?content=review");
    expect(fetchMock.mock.calls.every(([path]) => String(path) === `/api/learners/${learner.id}/review-queue`)).toBe(true);
  });

  it("uses only learning set vocabulary and displays the real set name", async () => {
    mockStudyData([item(1), item(2, "DUE"), item(3), item(4, "DUE")]);
    renderSetup("/study/setup?learningSetId=4");

    expect(await screen.findByTestId("study-setup-summary-scope")).toHaveTextContent("Starter Words");
    expect(screen.getByTestId("study-setup-summary-count")).toHaveTextContent("2 từ");
    fireEvent.click(screen.getByRole("button", { name: /Từ mới/ }));
    expect(screen.getByTestId("study-setup-summary-count")).toHaveTextContent("1 từ");
  });

  it("keeps the explicit saved New/Review/Mixed choices separate from saved-all", async () => {
    const savedQueue = [item(1, "DUE"), item(2)];
    const fetchMock = mockStudyData(savedQueue);
    renderSetup("/study/setup?saved=1");

    expect(await screen.findByTestId("study-setup-summary-scope")).toHaveTextContent("Từ đã lưu");
    expect(screen.getByTestId("study-setup-summary-count")).toHaveTextContent("2 từ");
    fireEvent.click(screen.getByRole("button", { name: /Từ mới/ }));
    expect(screen.getByTestId("study-setup-summary-count")).toHaveTextContent("1 từ");
    fireEvent.click(screen.getByRole("button", { name: /Ôn tập/ }));
    expect(screen.getByTestId("study-setup-summary-count")).toHaveTextContent("1 từ");
    fireEvent.click(screen.getByRole("button", { name: /Kết hợp/ }));
    expect(screen.getByTestId("study-setup-summary-count")).toHaveTextContent("2 từ");
    fireEvent.click(screen.getByRole("button", { name: /Từ mới/ }));
    fireEvent.click(screen.getByRole("button", { name: /Bắt đầu học/ }));

    expect(await screen.findByTestId("study-session-ready")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Thoát buổi học" })).toHaveAttribute("href", "/study/setup?saved=1");
    expect(fetchMock).toHaveBeenCalledWith(`/api/learners/${learner.id}/review-queue?scope=saved`, { credentials: "include" });
    expect(fetchMock.mock.calls.some(([url]) => String(url) === `/api/learners/${learner.id}/review-queue`)).toBe(false);
  });

  it.each([
    ["NEW", "NEW", "NEW"],
    ["DUE", "DUE", "LEARNING"],
    ["LEARNING", "VOLUNTARY", "LEARNING"],
    ["MASTERED", "VOLUNTARY", "MASTERED"]
  ] as const)("shows one saved %s item in saved-all without recasting it as %s/%s", async (_status, queueType, progressStatus) => {
    const fetchMock = mockStudyData([item(1, queueType, progressStatus)]);
    renderSetup("/study/setup?saved=1&content=all");

    expect(await screen.findByTestId("study-setup-saved-all-count")).toHaveTextContent("1 từ có thể học");
    expect(screen.getByTestId("study-setup-summary-scope")).toHaveTextContent("Từ đã lưu");
    expect(screen.getByTestId("study-setup-summary-count")).toHaveTextContent("1 từ");
    expect(screen.getByTestId("study-setup-summary-mode")).toHaveTextContent("Từ đã lưu");
    expect(screen.queryByText("Chưa có từ để học")).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Chế độ học" })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(`/api/learners/${learner.id}/review-queue?scope=saved&content=all`, { credentials: "include" });
  });

  it("starts a one-word saved-all session with only the saved candidate and keeps the intent on exit", async () => {
    const fetchMock = mockStudyData([item(1, "VOLUNTARY")]);
    renderSetup("/study/setup?saved=1&content=all");

    expect(await screen.findByTestId("study-setup-saved-all-count")).toHaveTextContent("1 từ có thể học");
    fireEvent.click(screen.getByRole("button", { name: /30\s*từ/ }));
    expect(screen.getByTestId("study-setup-summary-count")).toHaveTextContent("1 từ");
    fireEvent.click(screen.getByRole("button", { name: /Bắt đầu học/ }));

    expect(await screen.findByTestId("study-session-ready")).toBeInTheDocument();
    expect(screen.getByTestId("session-counter")).toHaveTextContent("Câu 1 / 1");
    expect(screen.getByText("word-1")).toBeInTheDocument();
    expect(screen.getByText("Từ đã lưu")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Thoát buổi học" })).toHaveAttribute("href", "/study/setup?saved=1&content=all");
    expect(fetchMock.mock.calls.some(([path]) => String(path) === `/api/learners/${learner.id}/review-queue`)).toBe(false);
  });

  it("shows an empty state for an actually empty saved-all collection", async () => {
    mockStudyData([]);
    renderSetup("/study/setup?saved=1&content=all");

    expect(await screen.findByTestId("study-setup-empty")).toHaveTextContent("Chưa có từ để học");
    expect(screen.queryByTestId("study-setup-saved-all-count")).not.toBeInTheDocument();
  });

  it("starts a weak-only review scope with due and voluntary candidates and preserves it on exit", async () => {
    const fetchMock = mockStudyData([item(1, "DUE", "LEARNING"), item(2, "VOLUNTARY", "MASTERED")]);
    renderSetup("/study/setup?weak=1");

    expect(await screen.findByTestId("study-setup-weak-count")).toHaveTextContent("2 từ có thể ôn");
    expect(screen.getByTestId("study-setup-summary-scope")).toHaveTextContent("Từ yếu");
    expect(screen.getByTestId("study-setup-summary-mode")).toHaveTextContent("Ôn tập từ yếu");
    expect(screen.queryByRole("group", { name: "Chế độ học" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Bắt đầu học/ }));

    expect(await screen.findByTestId("study-session-ready")).toBeInTheDocument();
    expect(screen.getByTestId("session-counter")).toHaveTextContent("Câu 1 / 2");
    expect(screen.getByText("Ôn từ yếu")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Thoát buổi học" })).toHaveAttribute("href", "/study/setup?weak=1");
    expect(fetchMock).toHaveBeenCalledWith(`/api/learners/${learner.id}/review-queue?scope=weak`, { credentials: "include" });
    expect(fetchMock.mock.calls.some(([path]) => String(path) === `/api/learners/${learner.id}/review-queue`)).toBe(false);
  });

  it("shows a specific empty state when no weak candidates remain", async () => {
    const fetchMock = mockStudyData([]);
    renderSetup("/study/setup?weak=1");

    expect(await screen.findByTestId("study-setup-empty")).toHaveTextContent("Không còn từ yếu cần ôn");
    expect(screen.getByRole("link", { name: "Quay lại" })).toHaveAttribute("href", "/weak-words");
    expect(fetchMock).toHaveBeenCalledWith(`/api/learners/${learner.id}/review-queue?scope=weak`, { credentials: "include" });
  });

  it("keeps global study unscoped and does not create a session or mutate progress before Start", async () => {
    const fetchMock = mockStudyData([item(1), item(2, "DUE")]);
    renderSetup();

    expect(await screen.findByTestId("study-setup-page")).toBeInTheDocument();
    expect(screen.queryByTestId("study-session-ready")).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.map(([path]) => String(path))).toEqual([`/api/learners/${learner.id}/review-queue`]);
    expect(fetchMock.mock.calls.every(([, init]) => !init?.method || init.method === "GET")).toBe(true);
  });

  it("shows an empty state without inventing words when the canonical queue is empty", async () => {
    mockStudyData([]);
    renderSetup();

    expect(await screen.findByTestId("study-setup-empty")).toHaveTextContent("Chưa có từ để học");
    expect(screen.getByText("Nội dung này hiện chưa có từ phù hợp cho buổi học.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Quay lại" })).toHaveAttribute("href", "/learners");
  });

  it("preserves setup path and query when redirecting a learner without an active profile", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    renderSetup("/study/setup?topicId=7&continue=1", null);

    await waitFor(() => expect(screen.getByTestId("learner-return-to")).toHaveTextContent("/study/setup?topicId=7&continue=1"));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
