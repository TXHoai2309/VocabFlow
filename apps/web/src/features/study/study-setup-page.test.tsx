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
const learningSetSummary = { id: 4, slug: "starter-words", name: "Starter Words", description: "A starter set", grade: null, enabled: true, sortOrder: 1, vocabularyCount: 2 };
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
    if (path === "/api/learners") return response({ learners: [learner] });
    if (path === "/api/learning-sets") return response({ learningSets: [learningSetSummary, { ...learningSetSummary, id: 5, name: "Family" }] });
    if (path === `/api/learners/${learner.id}/review-queue?topicId=7`) return response(queueResponse(queue.filter((entry) => topicVocabulary.some((v) => v.id === entry.vocabulary.id))));
    if (path === `/api/learners/${learner.id}/review-queue?learningSetId=4`) return response(queueResponse(queue.filter((entry) => learningSetVocabulary.some((v) => v.id === entry.vocabulary.id))));
    if (path.includes("review-queue?source=")) return response(queueResponse(queue));
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

function renderSetup(path = "/study/setup", activeLearner: LearnerDto | null = learner, userId?: string) {
  return render(
    <MemoryRouter initialEntries={[path]}><AccountRouteProbe />
      <ActiveLearnerProvider initialLearner={activeLearner} userId={userId}>
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
  beforeEach(() => { vi.restoreAllMocks(); localStorage.clear(); });

  it.each(["Hủy", "Đóng chọn bộ từ", "Escape", "backdrop"])("%s keeps source, URL, amount/mode and mounted background without queue/catalog reads", async (action) => {
    const fetchMock = mockStudyData([item(1, "DUE"), item(2)]); renderSetup();
    const page = await screen.findByTestId("study-setup-page");
    fireEvent.click(screen.getByRole("button", { name: /30\s*từ/ }));
    fireEvent.click(screen.getByRole("button", { name: /Ôn tập/ }));
    const before = fetchMock.mock.calls.length;
    screen.getByRole("combobox").focus();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "custom" } });
    const dialog = screen.getByRole("dialog");
    fireEvent.click(screen.getByRole("checkbox", { name: "Family" }));
    if (action === "Escape") fireEvent.keyDown(dialog, { key: "Escape" });
    else if (action === "backdrop") fireEvent.mouseDown(dialog.parentElement!);
    else fireEvent.click(screen.getByRole("button", { name: action }));
    expect(screen.getByRole("combobox")).toHaveValue("pathway");
    expect(screen.getByTestId("study-setup-page")).toBe(page);
    expect(screen.queryByTestId("study-setup-loading")).not.toBeInTheDocument();
    expect(screen.getByTestId("account-route")).toHaveTextContent(/^\/study\/setup$/);
    expect(screen.getByRole("button", { name: /30\s*từ/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /Ôn tập/ })).toHaveAttribute("aria-pressed", "true");
    expect(fetchMock.mock.calls).toHaveLength(before);
    expect(screen.getByRole("combobox")).toHaveFocus();
  });

  it("opens a loading shell before catalog finishes, reuses its pending GET and keeps direct topic intent on cancel", async () => {
    const fetchMock = mockStudyData([item(1, "DUE"), item(3)]);
    const base = fetchMock.getMockImplementation()!;
    let resolveCatalog!: (value: Response) => void;
    const pending = new Promise<Response>((resolve) => { resolveCatalog = resolve; });
    fetchMock.mockImplementation((input, init) => String(input) === "/api/learning-sets" ? pending : base(input, init));
    renderSetup("/study/setup?topicId=7"); const page = await screen.findByTestId("study-setup-page");
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "custom" } });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Đang tải bộ từ…" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Hủy" }));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "custom" } });
    resolveCatalog(response({ learningSets: [learningSetSummary] }));
    await screen.findByRole("checkbox", { name: "Starter Words" });
    fireEvent.click(screen.getByRole("button", { name: "Hủy" }));
    expect(screen.getByTestId("study-setup-page")).toBe(page);
    expect(screen.getByTestId("account-route")).toHaveTextContent("/study/setup?topicId=7");
    expect(screen.getByTestId("study-setup-summary-scope")).toHaveTextContent("Food");
    expect(fetchMock.mock.calls.filter(([url]) => String(url) === "/api/learning-sets")).toHaveLength(1);
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes("review-queue"))).toHaveLength(1);
  });

  it("Apply persists once, keeps amount/mode and URL, then Start serializes committed Custom", async () => {
    const fetchMock = mockStudyData([item(1, "DUE"), item(2)]);
    const storage = vi.spyOn(Storage.prototype, "setItem");
    renderSetup("/study/setup", learner, "account-a"); await screen.findByTestId("study-setup-page");
    fireEvent.click(screen.getByRole("button", { name: /30\s*từ/ })); fireEvent.click(screen.getByRole("button", { name: /Ôn tập/ }));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "custom" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "Family" })); fireEvent.click(screen.getByRole("button", { name: "Hủy" }));
    expect(storage.mock.calls.filter(([key]) => key.startsWith("vocabflow.study-source"))).toHaveLength(0);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "custom" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "Starter Words" })); fireEvent.click(screen.getByRole("button", { name: "Áp dụng (1)" }));
    await waitFor(() => expect(screen.getByRole("button", { name: /Bắt đầu học/ })).toBeEnabled());
    expect(storage.mock.calls.filter(([key]) => key.startsWith("vocabflow.study-source"))).toHaveLength(1);
    expect(screen.getByRole("button", { name: /30\s*từ/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /Ôn tập/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("account-route")).toHaveTextContent(/^\/study\/setup$/);
    const before = fetchMock.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: "Thay đổi" })); fireEvent.click(screen.getByRole("button", { name: "Áp dụng (1)" }));
    expect(fetchMock.mock.calls).toHaveLength(before);
    fireEvent.click(screen.getByRole("button", { name: /Bắt đầu học/ })); await screen.findByTestId("study-session-ready");
    expect(screen.getByTestId("account-route")).toHaveTextContent("source=custom&setIds=4&count=30&content=review");
  });

  it("defaults to exactly three compact sources and omits verbose helpers", async () => {
    mockStudyData([item(101)]); renderSetup(); await screen.findByTestId("study-setup-page");
    expect(screen.getByRole("combobox", { name: "Nguồn học" })).toHaveValue("pathway");
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual(["Học theo lộ trình", "Bộ từ tôi chọn", "Tất cả bộ từ"]);
    expect(screen.queryByText("Gợi ý")).not.toBeInTheDocument(); expect(screen.queryByText("Lộ trình hiện tại")).not.toBeInTheDocument();
    expect(screen.queryByText("Bạn có thể thay đổi thiết lập bất cứ lúc nào.")).not.toBeInTheDocument();
  });

  it("Custom opens the picker, commits multiple sets and starts the exact source without assignment writes", async () => {
    const fetchMock = mockStudyData([item(101), item(202)]); renderSetup(); await screen.findByTestId("study-setup-page");
    fireEvent.change(screen.getByRole("combobox", { name: "Nguồn học" }), { target: { value: "custom" } });
    await screen.findByRole("dialog", { name: "Chọn bộ từ" });
    expect(screen.getByRole("button", { name: /Áp dụng \(0\)/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Bắt đầu học/ })).toBeEnabled();
    fireEvent.click(screen.getByRole("checkbox", { name: "Starter Words" })); fireEvent.click(screen.getByRole("checkbox", { name: "Family" }));
    fireEvent.click(screen.getByRole("button", { name: "Áp dụng (2)" }));
    await screen.findByText("2 bộ từ đã chọn");
    expect(await screen.findByTestId("study-setup-summary-scope")).toHaveTextContent("2 bộ từ");
    fireEvent.click(screen.getByRole("button", { name: "Thay đổi" }));
    expect(screen.getByRole("checkbox", { name: "Family" })).toBeChecked(); fireEvent.click(screen.getByRole("button", { name: "Hủy" }));
    fireEvent.click(screen.getByRole("button", { name: /Bắt đầu học/ })); await screen.findByTestId("study-session-ready");
    expect(screen.getByTestId("account-route")).toHaveTextContent("source=custom&setIds=4%2C5");
    expect(fetchMock.mock.calls.every(([, init]) => !init?.method || init.method === "GET")).toBe(true);
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/learning-sets/") && String(url).includes("/learners/"))).toBe(false);
  });

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
    expect(screen.getByRole("link", { name: "Thoát buổi học" })).toHaveAttribute("href", "/study/setup?source=pathway");
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
    expect(fetchMock).toHaveBeenCalledWith(`/api/learners/${learner.id}/review-queue?topicId=7`, { credentials: "include" });
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
    expect(screen.getByRole("link", { name: "Thoát buổi học" })).toHaveAttribute("href", "/study/setup?source=pathway");
    expect(fetchMock.mock.calls.filter(([path]) => String(path).includes("review-queue")).every(([path]) => String(path) === `/api/learners/${learner.id}/review-queue?source=pathway`)).toBe(true);
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

  it("defaults to read-only pathway study and does not create a session or mutate progress before Start", async () => {
    const fetchMock = mockStudyData([item(1), item(2, "DUE")]);
    renderSetup();

    expect(await screen.findByTestId("study-setup-page")).toBeInTheDocument();
    expect(screen.queryByTestId("study-session-ready")).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.map(([path]) => String(path))).toEqual(["/api/learning-sets", `/api/learners/${learner.id}/review-queue?source=pathway`]);
    expect(fetchMock.mock.calls.every(([, init]) => !init?.method || init.method === "GET")).toBe(true);
  });

  it("shows an empty state without inventing words when the canonical queue is empty", async () => {
    mockStudyData([]);
    renderSetup();

    expect(await screen.findByTestId("study-setup-page")).toBeInTheDocument();
    expect(screen.getByText("Nguồn học này chưa có từ mới hoặc từ đến hạn phù hợp.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Bắt đầu học/ })).toBeDisabled();
    expect(screen.getByRole("link", { name: "Quay lại" })).toHaveAttribute("href", "/");
  });

  it("retries the canonical queue request after a setup load error", async () => {
    let failed = false;
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      if (String(input) === "/api/learning-sets") return response({ learningSets: [learningSetSummary] });
      if (!failed) { failed = true; throw new Error("offline"); }
      return response(queueResponse([item(1)]));
    });
    renderSetup();

    expect(await screen.findByTestId("study-setup-error")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));

    expect(await screen.findByTestId("study-setup-page")).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes("review-queue"))).toHaveLength(2);

  });

  it("waits for internal identity at the original route without learner selection", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    renderSetup("/study/setup?topicId=7&continue=1", null);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(await screen.findByRole("status", { name: "Đang chuẩn bị học tập…" })).toBeInTheDocument();
    expect(screen.getByTestId("account-route")).toHaveTextContent("/study/setup?topicId=7&continue=1");
    expect(screen.queryByText("learners-route")).not.toBeInTheDocument();
  });
});

function AccountRouteProbe() { const route = useLocation(); return <output data-testid="account-route">{route.pathname}{route.search}</output>; }
