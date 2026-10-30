import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import type { LearnerDto, LearnerVocabularyDto, VocabularyLevel } from "@vocabflow/contracts";
import { ActiveLearnerProvider } from "./learner-context-provider";
import { useActiveLearner } from "./learner-context-hook";
import { ToastProvider } from "../../components/toast/toast-provider";
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

function response(vocabulary: LearnerVocabularyDto[], status = 200, total = vocabulary.length, page = 1, pageSize = 30) {
  const compactVocabulary = vocabulary.map((item) => ({
    id: item.id,
    word: item.word,
    ipa: item.ipa,
    vietnamese: item.vietnamese,
    imageUrl: item.imageUrl,
    audioUrl: item.audioUrl,
    topic: item.topic,
    level: item.level,
    enabled: item.enabled,
    contentVersion: item.contentVersion,
    status: item.status,
    nextReviewDate: item.nextReviewDate,
    ...(item.masterSenseIdentity ? { masterSenseIdentity: item.masterSenseIdentity } : {}),
    ...(item.displayForm ? { displayForm: item.displayForm } : {}),
    ...(item.partOfSpeech ? { partOfSpeech: item.partOfSpeech } : {}),
    ...(item.cefr ? { cefr: item.cefr } : {}),
    ...(item.tags ? { tags: item.tags } : {}),
    ...(item.developmentMedia ? {
      developmentMedia: {
        ...(item.developmentMedia.images ? { images: item.developmentMedia.images } : {}),
        ...(item.developmentMedia.wordAudio ? { wordAudio: item.developmentMedia.wordAudio } : {})
      }
    } : {})
  }));
  return new Response(JSON.stringify({
    vocabulary: compactVocabulary,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    filters: { cefrOptions: ["A1", "A2", "B1"], topicOptions: ["Animals", "Food", "topic-inferred:computer-science", "topic-inferred:travel"] }
  }), {
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
    <MemoryRouter initialEntries={[path]}><AccountRouteProbe />
      <ToastProvider>
        <ActiveLearnerProvider initialLearner={initialLearner}>
          <LocationProbe />
          <Routes>
            <Route path="/vocabulary" element={<VocabularyListPage />} />
              <Route path="/foundation/learn" element={<div>foundation-route</div>} />
            <Route path="/vocabulary/:vocabularyId" element={<div data-testid="detail-route">detail route</div>} />
            <Route path="/learners" element={<LearnerRouteProbe />} />
          </Routes>
        </ActiveLearnerProvider>
      </ToastProvider>
    </MemoryRouter>
  );
}

function mockVocabulary(items: LearnerVocabularyDto[]) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    if (url.endsWith("/saved-vocabulary")) return savedResponse();
    const params = new URL(url, "http://localhost").searchParams;
    const query = params.get("q")?.trim().toLocaleLowerCase() ?? "";
    const level = params.get("level") ?? "";
    const cefr = params.get("cefr") ?? "";
    const topic = params.get("topic")?.toLocaleLowerCase() ?? "";
    const filtered = items.filter((item) =>
      (!query || item.word.toLocaleLowerCase().includes(query) || item.vietnamese.toLocaleLowerCase().includes(query))
      && (!level || item.level === level)
      && (!cefr || (cefr === "UNCLASSIFIED" ? !item.cefr?.trim() : item.cefr === cefr))
      && (!topic || [...(item.tags ?? []), ...(item.topic ? [item.topic] : [])].some((value) => value.toLocaleLowerCase() === topic))
    );
    const page = Number(params.get("page") ?? 1);
    const pageSize = Number(params.get("pageSize") ?? 30);
    const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);
    return response(pageItems, 200, filtered.length, page, pageSize);
  });
}

describe("US-22 vocabulary list UI", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the vocabulary skeleton until the paged request resolves", async () => {
    let resolveBrowse: ((response: Response) => void) | undefined;
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      if (String(input).endsWith("/saved-vocabulary")) return Promise.resolve(savedResponse());
      return new Promise<Response>((resolve) => { resolveBrowse = resolve; });
    });
    renderList();

    expect(screen.getByTestId("vocabulary-loading")).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByTestId("vocabulary-grid")).not.toBeInTheDocument();
    await act(async () => { resolveBrowse?.(response([item(1, "apple")])); });
    expect(await screen.findByTestId("vocabulary-row-1")).toBeInTheDocument();
    expect(screen.queryByTestId("vocabulary-loading")).not.toBeInTheDocument();
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
    expect(screen.getByRole("heading", { name: "Từ vựng của bạn" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Duyệt theo chủ đề" })).not.toBeInTheDocument();
    expect(screen.getByTestId("vocabulary-row-1")).toHaveTextContent("apple");
    expect(screen.getByTestId("vocabulary-row-1")).toHaveTextContent("/ˈæp.əl/");
    expect(screen.getByTestId("vocabulary-row-1")).toHaveTextContent("Lớp 1");
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes("/vocabulary/browse?")).length).toBe(1);
    expect(fetchMock).toHaveBeenCalledWith(`/api/learners/${learnerA.id}/vocabulary/browse?page=1&pageSize=30`, expect.objectContaining({ credentials: "include", signal: expect.any(AbortSignal) }));
    expect(screen.getByTestId("vocabulary-page-size")).toHaveValue("30");
  });

  it("filters by an English word on the server after the debounce", async () => {
    const fetchMock = mockVocabulary([item(1, "apple"), item(2, "book")]);
    renderList();
    await screen.findByTestId("vocabulary-row-2");

    fireEvent.change(screen.getByTestId("vocabulary-search"), { target: { value: "apple" } });

    await waitFor(() => expect(screen.queryByTestId("vocabulary-row-2")).not.toBeInTheDocument());
    expect(await screen.findByTestId("vocabulary-row-1")).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("q=apple"))).toBe(true);
  });

  it("filters by Vietnamese meaning", async () => {
    mockVocabulary([item(1, "apple", "NEW", null, { vietnamese: "quả táo" }), item(2, "book", "NEW", null, { vietnamese: "quyển sách" })]);
    renderList();
    await screen.findByTestId("vocabulary-row-2");

    fireEvent.change(screen.getByTestId("vocabulary-search"), { target: { value: "quả táo" } });

    await waitFor(() => expect(screen.queryByTestId("vocabulary-row-2")).not.toBeInTheDocument());
    expect(await screen.findByTestId("vocabulary-row-1")).toBeInTheDocument();
  });

  it("matches English searches without case sensitivity", async () => {
    mockVocabulary([item(1, "apple"), item(2, "book")]);
    renderList();
    await screen.findByTestId("vocabulary-row-2");

    fireEvent.change(screen.getByTestId("vocabulary-search"), { target: { value: "APPLE" } });

    await waitFor(() => expect(screen.queryByTestId("vocabulary-row-2")).not.toBeInTheDocument());
    expect(await screen.findByTestId("vocabulary-row-1")).toBeInTheDocument();
  });

  it("trims whitespace before matching", async () => {
    mockVocabulary([item(1, "apple"), item(2, "book")]);
    renderList();
    await screen.findByTestId("vocabulary-row-2");

    fireEvent.change(screen.getByTestId("vocabulary-search"), { target: { value: "  APPLE  " } });

    await waitFor(() => expect(screen.queryByTestId("vocabulary-row-2")).not.toBeInTheDocument());
    expect(await screen.findByTestId("vocabulary-row-1")).toBeInTheDocument();
  });

  it("shows a distinct no-results state and clears the search", async () => {
    mockVocabulary([item(1, "apple")]);
    renderList();
    await screen.findByTestId("vocabulary-row-1");
    fireEvent.change(screen.getByTestId("vocabulary-search"), { target: { value: "kiwi" } });

    expect(await screen.findByRole("heading", { name: "Không tìm thấy từ vựng" })).toBeInTheDocument();
    expect(screen.getByTestId("vocabulary-no-results")).toHaveTextContent("Thử từ khóa khác hoặc thay đổi bộ lọc.");
    fireEvent.click(screen.getByTestId("vocabulary-empty-clear"));

    expect(await screen.findByTestId("vocabulary-row-1")).toBeInTheDocument();
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

  it("combines the level filter and search in paged API requests", async () => {
    const fetchMock = mockVocabulary([
      item(1, "apple", "NEW", "GRADE_1"),
      item(2, "apple juice", "NEW", "GRADE_2"),
      item(3, "book", "NEW", "GRADE_1")
    ]);
    renderList();
    await screen.findByTestId("vocabulary-row-3");
    fireEvent.change(screen.getByTestId("vocabulary-search"), { target: { value: "apple" } });
    fireEvent.change(screen.getByTestId("vocabulary-level-filter"), { target: { value: "GRADE_1" } });

    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => String(url).includes("q=apple") && String(url).includes("level=GRADE_1"))).toBe(true));
    expect(screen.getByTestId("vocabulary-row-1")).toBeInTheDocument();
    expect(screen.queryByTestId("vocabulary-row-2")).not.toBeInTheDocument();
    expect(screen.queryByTestId("vocabulary-row-3")).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes("/vocabulary/browse?")).length).toBeGreaterThan(1);
  });

  it("offers nine named levels with available local foundation routes and preserves unpublished word levels", async () => {
    mockVocabulary([item(1, "apple", "NEW", null, { cefr: "A1" })]);
    renderList();
    await screen.findByTestId("vocabulary-row-1");
    const levels = screen.getByRole("combobox", { name: "Mức học" });
    expect(within(levels).getByRole("option", { name: "1. Làm quen chữ và âm — 6 tên chữ local" })).toBeEnabled();
    expect(within(levels).getByRole("option", { name: "2. Từ đầu tiên — Chưa có nội dung" })).toBeDisabled();
    expect(within(levels).getByRole("option", { name: "3. Câu đầu tiên — 12 câu local" })).toBeEnabled();
    expect(within(levels).getByRole("option", { name: "4. Sơ cấp (A1)" })).toHaveValue("A1");
    expect(within(levels).getByRole("option", { name: /9\. Chuyên sâu \(C2\)/ })).toBeDisabled();
    expect(within(levels).getAllByRole("option")).toHaveLength(11);
    expect(screen.getByText("Lọc bổ sung").closest("details")).not.toHaveAttribute("open");
  });

  it("routes typed foundation content without inventing a lexical CEFR filter", async () => {
    const fetchMock = mockVocabulary([item(1, "apple", "NEW", null, { cefr: "A1" })]);
    renderList();await screen.findByTestId("vocabulary-row-1");
    fireEvent.change(screen.getByRole("combobox", { name: "Mức học" }), { target: { value: "intro-first-utterances" } });
    await waitFor(()=>expect(screen.getByTestId("current-url")).toHaveTextContent("/foundation/learn?module=utterances"));
    expect(fetchMock.mock.calls.some(([url])=>String(url).includes("cefr=intro-first-utterances"))).toBe(false);
  });

  it("does not widen a grade-filtered lexical scope into foundation content", async () => {
    mockVocabulary([item(1, "apple", "NEW", "GRADE_1", { cefr: "A1" })]);
    renderList(learnerA,"/vocabulary?level=GRADE_1");await screen.findByTestId("vocabulary-row-1");
    const levels=screen.getByRole("combobox",{name:"Mức học"});
    expect(within(levels).getByRole("option",{name:/1\. Làm quen chữ và âm/})).toBeDisabled();
    expect(within(levels).getByRole("option",{name:/3\. Câu đầu tiên/})).toBeDisabled();
  });

  it("does not claim CEFR content is missing when initial metadata cannot load", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(response([], 503));
    renderList();
    await screen.findByTestId("vocabulary-error");
    const levels = screen.getByRole("combobox", { name: "Mức học" });
    expect(within(levels).getByRole("option", { name: "4. Sơ cấp (A1) — Chưa tải được dữ liệu" })).toBeDisabled();
    expect(within(levels).queryByRole("option", { name: "4. Sơ cấp (A1) — Chưa có nội dung" })).not.toBeInTheDocument();
  });

  it("keeps unclassified separate from A1 and carries its scope into study", async () => {
    const fetchMock = mockVocabulary([
      item(1, "apple", "NEW", null, { cefr: "A1" }),
      item(2, "unclassified")
    ]);
    renderList();
    await screen.findByTestId("vocabulary-row-1");
    fireEvent.change(screen.getByRole("combobox", { name: "Mức học" }), { target: { value: "UNCLASSIFIED" } });
    expect(await screen.findByTestId("vocabulary-row-2")).toBeInTheDocument();
    expect(screen.queryByTestId("vocabulary-row-1")).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("cefr=UNCLASSIFIED"))).toBe(true);
    expect(screen.getByRole("link", { name: "Học nội dung đã chọn" })).toHaveAttribute("href", "/study/setup?source=all&cefr=UNCLASSIFIED");
  });

  it("applies CEFR and topic filters through the server and resets pagination", async () => {
    const fetchMock = mockVocabulary([
      item(1, "apple", "NEW", "GRADE_1", { cefr: "A1", topic: "Food" }),
      item(2, "book", "NEW", "GRADE_1", { cefr: "A2", topic: "Animals" })
    ]);
    renderList(learnerA, "/vocabulary?page=2");
    await screen.findByTestId("vocabulary-row-2");

    fireEvent.change(screen.getByTestId("vocabulary-cefr-filter"), { target: { value: "A1" } });
    expect(await screen.findByTestId("vocabulary-row-1")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId("current-url")).not.toHaveTextContent("page="));
    fireEvent.change(screen.getByTestId("vocabulary-topic-filter"), { target: { value: "Animals" } });
    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => String(url).includes("cefr=A1") && String(url).includes("topic=Animals"))).toBe(true));
    expect(screen.queryByTestId("vocabulary-row-1")).not.toBeInTheDocument();
  });

  it("shows friendly inferred topic names while keeping the API filter identity unchanged", async () => {
    const identity = "topic-inferred:computer-science";
    const fetchMock = mockVocabulary([item(1, "algorithm", "NEW", null, { tags: [identity] })]);
    renderList();

    const topicSelect = await screen.findByTestId("vocabulary-topic-filter");
    const option = within(topicSelect).getByRole("option", { name: "Chủ đề · Tin học và khoa học máy tính" });
    expect(option).toHaveValue(identity);
    expect(screen.queryByText(identity)).not.toBeInTheDocument();

    fireEvent.change(topicSelect, { target: { value: identity } });
    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => new URL(String(url), "http://localhost").searchParams.get("topic") === identity)).toBe(true));
    expect(screen.getByTestId("vocabulary-row-1")).toBeInTheDocument();
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

  it("waits for internal identity at the original route without learner selection", async () => {
    renderList(null, "/vocabulary?q=apple&level=GRADE_1");

    expect(await screen.findByRole("status", { name: "Đang chuẩn bị học tập…" })).toBeInTheDocument();
    expect(screen.getByTestId("account-route")).toHaveTextContent("/vocabulary?q=apple&level=GRADE_1");
    expect(screen.queryByText("learners-route")).not.toBeInTheDocument();
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

    expect(within(card).getByRole("img", { name: "Ảnh minh họa apple chưa tải được" })).toBeInTheDocument();
    expect(card.querySelector("svg")).toBeInTheDocument();
  });

  it("hides audio without a real URL and enables the real save control", async () => {
    mockVocabulary([item(1, "apple")]);
    renderList();
    const card = await screen.findByTestId("vocabulary-row-1");

    expect(within(card).queryByRole("button", { name: "Nghe phát âm apple" })).not.toBeInTheDocument();
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
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith("/saved-vocabulary"))).toBe(false);
    expect(screen.queryByTestId("detail-route")).not.toBeInTheDocument();
    expect(screen.getByText("Đã thêm vào Yêu thích")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(within(card).getByRole("button", { name: "Bỏ lưu từ apple" }));
    expect(await screen.findByText("Đã bỏ khỏi Yêu thích")).toBeInTheDocument();
  });

  it("rolls back a failed save with an accessible message", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      if (String(input).endsWith("/saved-vocabulary/1") && init?.method === "POST") return response([], 503);
      return String(input).endsWith("/saved-vocabulary") ? savedResponse() : response([item(1, "apple")]);
    });
    renderList();
    const card = await screen.findByTestId("vocabulary-row-1");

    fireEvent.click(within(card).getByRole("button", { name: "Lưu từ apple" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Không thể cập nhật Yêu thích. Vui lòng thử lại.");
    expect(within(card).getByRole("button", { name: "Lưu từ apple" })).toHaveAttribute("aria-pressed", "false");
  });

  it("shows a separate empty state when the API returns no vocabulary", async () => {
    mockVocabulary([]);
    renderList();

    expect(await screen.findByTestId("vocabulary-empty-state")).toHaveTextContent("Chưa có từ vựng");
    expect(screen.queryByTestId("vocabulary-no-results")).not.toBeInTheDocument();
  });

  it("paginates 30-item server pages and resets to page one when search changes", async () => {
    mockVocabulary(Array.from({ length: 31 }, (_, index) => item(index + 1, `word-${index + 1}`)));
    renderList();

    expect(await screen.findByTestId("vocabulary-row-30")).toBeInTheDocument();
    expect(screen.queryByTestId("vocabulary-row-31")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Trang sau" }));
    expect(await screen.findByTestId("vocabulary-row-31")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId("current-url")).toHaveTextContent("page=2"));

    fireEvent.change(screen.getByTestId("vocabulary-search"), { target: { value: "word" } });
    await waitFor(() => expect(screen.getByTestId("current-url")).toHaveTextContent("q=word"));
    expect(await screen.findByTestId("vocabulary-row-1")).toBeInTheDocument();
    expect(screen.getByTestId("current-url")).not.toHaveTextContent("page=");
  });

  it("supports the 20/30/50 page-size choices without fetching other pages", async () => {
    const fetchMock = mockVocabulary(Array.from({ length: 51 }, (_, index) => item(index + 1, `word-${index + 1}`)));
    renderList();
    await screen.findByTestId("vocabulary-row-30");
    fireEvent.change(screen.getByTestId("vocabulary-page-size"), { target: { value: "50" } });

    expect(await screen.findByTestId("vocabulary-row-50")).toBeInTheDocument();
    expect(screen.queryByTestId("vocabulary-row-51")).not.toBeInTheDocument();
    expect(screen.getByTestId("current-url")).toHaveTextContent("pageSize=50");
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("pageSize=50"))).toBe(true);
  });

  it("aborts a superseded browse request when a committed search replaces it", async () => {
    let firstSignal: AbortSignal | undefined;
    let browseCount = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);
      if (url.endsWith("/saved-vocabulary")) return Promise.resolve(savedResponse());
      browseCount += 1;
      if (browseCount === 1) {
        firstSignal = init?.signal as AbortSignal;
        return new Promise<Response>((_resolve, reject) => firstSignal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true }));
      }
      return Promise.resolve(response([item(1, "apple")], 200, 1));
    });
    renderList();
    fireEvent.change(screen.getByTestId("vocabulary-search"), { target: { value: "apple" } });

    expect(await screen.findByTestId("vocabulary-row-1")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId("current-url")).toHaveTextContent("q=apple"));
    expect(firstSignal?.aborted).toBe(true);
  });

  it("restores a valid page URL after the full list has loaded", async () => {
    mockVocabulary(Array.from({ length: 31 }, (_, index) => item(index + 1, `word-${index + 1}`)));
    renderList(learnerA, "/vocabulary?page=2");

    expect(await screen.findByTestId("vocabulary-row-31")).toBeInTheDocument();
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
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes("/vocabulary/browse?")).length).toBe(2);
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
      <MemoryRouter initialEntries={["/vocabulary"]}><AccountRouteProbe />
        <ToastProvider><ActiveLearnerProvider initialLearner={learnerA}><SwitchHarness /></ActiveLearnerProvider></ToastProvider>
      </MemoryRouter>
    );

    expect(await screen.findByTestId("vocabulary-row-1")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Switch learner" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Từ vựng của bạn" })).toBeInTheDocument());
    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => String(url).includes(`/api/learners/${learnerB.id}/vocabulary/browse?`))).toBe(true));
    expect(fetchMock).toHaveBeenNthCalledWith(1, `/api/learners/${learnerA.id}/vocabulary/browse?page=1&pageSize=30`, expect.objectContaining({ credentials: "include", signal: expect.any(AbortSignal) }));
    expect(fetchMock).toHaveBeenCalledWith(`/api/learners/${learnerB.id}/vocabulary/browse?page=1&pageSize=30`, expect.objectContaining({ credentials: "include", signal: expect.any(AbortSignal) }));
  });
});

function AccountRouteProbe() { const route = useLocation(); return <output data-testid="account-route">{route.pathname}{route.search}</output>; }
