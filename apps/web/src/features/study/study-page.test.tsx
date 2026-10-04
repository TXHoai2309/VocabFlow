import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import type { LearnerDto, ReviewQueueItem, ReviewQueueResponse, VocabularyDto } from "@vocabflow/contracts";
import { ActiveLearnerProvider } from "../learners/learner-context-provider";
import { StudyPage } from "./study-page";
import { formatStudyDuration } from "./study-session-result";
import type { ExerciseType } from "./exercise-generator";

const { requestActivitySummaryMock } = vi.hoisted(() => ({ requestActivitySummaryMock: vi.fn() }));
vi.mock("../learners/activity-summary-client", () => ({ requestActivitySummary: requestActivitySummaryMock }));

const learner: LearnerDto = {
  id: "00000000-0000-4000-8000-000000000010",
  householdId: "00000000-0000-4000-8000-000000000001",
  displayName: "An",
  avatarKey: null,
  enabled: true,
  createdAt: "2026-09-10T00:00:00.000Z",
  updatedAt: "2026-09-10T00:00:00.000Z"
};

function vocabulary(id: number, word: string, vietnamese: string): VocabularyDto {
  return {
    id,
    word,
    ipa: null,
    vietnamese,
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

function queueItem(id: number, word: string, queueType: ReviewQueueItem["queueType"] = "NEW", expectedRevision = 0, progressStatus?: ReviewQueueItem["status"]): ReviewQueueItem {
  return {
    vocabulary: vocabulary(id, word, `${word}-nghĩa`),
    queueType,
    status: progressStatus ?? (queueType === "DUE" ? "LEARNING" : queueType === "VOLUNTARY" ? "MASTERED" : "NEW"),
    nextReviewDate: queueType === "DUE" ? "2026-09-15" : queueType === "VOLUNTARY" ? "2026-10-15" : null,
    expectedRevision
  };
}

function queueResponse(queue: ReviewQueueItem[]): ReviewQueueResponse {
  return {
    learnerId: learner.id,
    reviewDate: "2026-09-15",
    dueCount: queue.filter((item) => item.queueType === "DUE").length,
    newCount: queue.filter((item) => item.queueType === "NEW").length,
    queue
  };
}

function reviewResponse(item: ReviewQueueItem, result: "REMEMBERED" | "FORGOTTEN") {
  return {
    reviewId: "00000000-0000-4000-8000-000000000099",
    learnerId: learner.id,
    vocabularyId: item.vocabulary.id,
    result,
    progress: {
      status: "LEARNING",
      consecutiveCorrect: result === "REMEMBERED" ? 1 : 0,
      intervalDays: 1,
      firstLearnedDate: "2026-09-15",
      lastReviewedDate: "2026-09-15",
      nextReviewDate: "2026-09-16",
      totalCorrect: result === "REMEMBERED" ? 1 : 0,
      totalIncorrect: result === "FORGOTTEN" ? 1 : 0,
      revision: item.expectedRevision + 1
    }
  };
}

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function renderStudy(initialLearner: LearnerDto | null = learner, mode: "flashcard" | "exercise" = "flashcard", path = "/study", exercisePreference?: ExerciseType) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ActiveLearnerProvider initialLearner={initialLearner}>
        <Routes>
          <Route path="/study" element={<StudyPage mode={mode} exercisePreference={exercisePreference} />} />
          <Route path="/study/setup" element={<p data-testid="study-setup-route">study-setup-route</p>} />
          <Route path="/vocabulary/:vocabularyId" element={<p data-testid="vocabulary-detail-route">vocabulary-detail-route</p>} />
          <Route path="/" element={<p data-testid="home-route">home-route</p>} />
          <Route path="/learners" element={<p>learners-route</p>} />
          <Route path="/login" element={<p>login-route</p>} />
        </Routes>
      </ActiveLearnerProvider>
    </MemoryRouter>
  );
}

describe("US-09 flashcard session UX", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    requestActivitySummaryMock.mockReset().mockResolvedValue({
      learnerId: learner.id,
      localDate: "2026-09-15",
      dailyGoal: {
        newWords: { goal: 10, completed: 1, remaining: 9, percent: 10 },
        reviews: { goal: 20, completed: 0, remaining: 20, percent: 0 },
        overallPercent: 3,
        completed: false
      },
      streak: { currentStreak: 7, longestStreak: 7, todayActive: true }
    });
  });

  it("loads the canonical due-first queue and keeps Vietnamese off the front", async () => {
    const due = queueItem(1, "apple", "DUE", 3);
    due.vocabulary.audioUrl = "/audio/apple.mp3";
    const fresh = queueItem(2, "book");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(response(queueResponse([due, fresh])));
    renderStudy();

    expect(await screen.findByTestId("study-session-ready")).toBeInTheDocument();
    expect(screen.getByText("apple")).toBeInTheDocument();
    expect(screen.queryByText("apple-nghĩa")).not.toBeInTheDocument();
    expect(screen.getByTestId("session-counter")).toHaveTextContent("Câu 1 / 2");
    expect(screen.getByTestId("flashcard")).toHaveClass("flashcard");
    expect(screen.getByTestId("flashcard").querySelector(".flashcard-front")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nghe phát âm apple" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Chưa nhớ" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Đã nhớ" })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(`/api/learners/${learner.id}/review-queue`, { credentials: "include" });

    fireEvent.click(screen.getByRole("button", { name: "Lật để xem nghĩa" }));
    expect(screen.getByText("apple-nghĩa")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Chưa nhớ" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Đã nhớ" })).toBeInTheDocument();
  });

  it("renders a compact session and persists once before automatically advancing", async () => {
    const first = queueItem(1, "apple", "DUE", 3);
    const second = queueItem(2, "book");
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response(queueResponse([first, second])))
      .mockResolvedValueOnce(response(reviewResponse(first, "REMEMBERED"), 201));
    renderStudy();

    await screen.findByTestId("study-session-ready");
    expect(document.querySelector(".study-shell")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Lật để xem nghĩa" }));
    const rememberButton = screen.getByRole("button", { name: "Đã nhớ" });
    act(() => {
      fireEvent.click(rememberButton);
      fireEvent.click(rememberButton);
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("button", { name: "Câu tiếp theo" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Hoàn tác/ })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId("session-counter")).toHaveTextContent("Câu 2 / 2"));
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "2");
    expect(screen.getByText("apple")).toBeInTheDocument();
    await screen.findByText("book");
    expect(screen.getByTestId("session-counter")).toHaveTextContent("Câu 2 / 2");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const request = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));
    expect(request).toMatchObject({ learnerId: learner.id, vocabularyId: 1, result: "REMEMBERED", expectedRevision: 3 });
    expect(request.reviewId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("submits flashcard shortcuts once and ignores Enter and Z", async () => {
    const first = queueItem(1, "apple");
    const second = queueItem(2, "book");
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response(queueResponse([first, second])))
      .mockResolvedValueOnce(response(reviewResponse(first, "REMEMBERED"), 201));
    renderStudy();

    await screen.findByTestId("study-session-ready");
    fireEvent.click(screen.getByRole("button", { name: "Lật để xem nghĩa" }));
    fireEvent.keyDown(document.body, { key: "Enter" });
    fireEvent.keyDown(document.body, { key: "z" });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(document.body, { key: "2" });
    fireEvent.keyDown(document.body, { key: "2" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await screen.findByText("book");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("session-counter")).toHaveTextContent("Câu 2 / 2");
  });

  it("sends exercise evidence instead of a client correctness boolean", async () => {
    const first = queueItem(1, "apple");
    first.vocabulary.audioUrl = "/audio/apple.mp3";
    const queue = [first, queueItem(2, "book"), queueItem(3, "cat"), queueItem(4, "dog")];
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response(queueResponse(queue)))
      .mockResolvedValueOnce(response(reviewResponse(first, "REMEMBERED"), 201));
    renderStudy(learner, "exercise");

    await screen.findByTestId("exercise-card");
    fireEvent.click(screen.getByRole("button", { name: "apple" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const request = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));
    expect(request).toMatchObject({
      vocabularyId: 1,
      result: "REMEMBERED",
      exerciseSubmission: { type: "LISTENING_CHOICE", selectedVocabularyId: 1 }
    });
    expect(request.exerciseSubmission.correct).toBeUndefined();
  });

  it("submits immediately and holds the current item until a canonical response arrives", async () => {
    const item = queueItem(1, "apple");
    let resolveReview!: (value: Response) => void;
    const pendingReview = new Promise<Response>((resolve) => {
      resolveReview = resolve;
    });
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response(queueResponse([item])))
      .mockReturnValueOnce(pendingReview);
    renderStudy();

    await screen.findByTestId("study-session-ready");
    fireEvent.click(screen.getByRole("button", { name: "Lật để xem nghĩa" }));
    fireEvent.click(screen.getByRole("button", { name: "Đã nhớ" }));

    expect(screen.getByTestId("session-counter")).toHaveTextContent("Câu 1 / 1");
    expect(screen.queryByTestId("study-session-summary")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Đã nhớ" })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.getByText("Đang lưu kết quả…")).toBeInTheDocument();
    resolveReview(response(reviewResponse(item, "REMEMBERED"), 201));
    expect(await screen.findByTestId("study-feedback")).toHaveTextContent("Đã ghi nhận");
    await screen.findByTestId("study-session-summary");
  });

  it("shows a real session summary, scope-safe setup action, current streak and home navigation", async () => {
    const item = queueItem(1, "apple");
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response(queueResponse([item])))
      .mockResolvedValueOnce(response(reviewResponse(item, "REMEMBERED"), 201));
    renderStudy();

    await screen.findByTestId("study-session-ready");
    fireEvent.click(screen.getByRole("button", { name: "Lật để xem nghĩa" }));
    fireEvent.click(screen.getByRole("button", { name: "Đã nhớ" }));

    await waitFor(() => expect(screen.getByTestId("study-session-summary")).toBeInTheDocument());
    expect(screen.getByTestId("summary-answered-total")).toHaveTextContent("1 / 1");
    expect(screen.getByRole("heading", { name: "Đúng" }).parentElement).toHaveTextContent("1 từ");
    expect(screen.getByRole("heading", { name: "Sai" }).parentElement).toHaveTextContent("0 từ");
    expect(screen.getByRole("heading", { name: "Từ mới" }).parentElement).toHaveTextContent("1 từ");
    expect(screen.getByRole("heading", { name: "Từ đã ôn" }).parentElement).toHaveTextContent("0 từ");
    expect(await screen.findByRole("heading", { name: "Chuỗi ngày" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Chuỗi ngày" }).parentElement).toHaveTextContent("7 ngày");
    expect(screen.getByRole("heading", { name: "Thời gian học" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Học tiếp/ })).toHaveAttribute("href", "/study/setup");
    expect(screen.getByRole("link", { name: "Về trang chủ" })).toHaveAttribute("href", "/");
    expect(screen.queryByRole("button", { name: "Ôn từ sai" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Các từ cần ôn lại" })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Bạn không có từ nào trả lời sai trong buổi học này.");
    expect(screen.queryByText(/XP/)).not.toBeInTheDocument();
    expect(screen.getByText("Kết quả này chỉ được giữ trong phiên hiện tại.")).toBeInTheDocument();
    expect(requestActivitySummaryMock).toHaveBeenCalledWith(learner.id);
    fireEvent.click(screen.getByRole("link", { name: "Về trang chủ" }));
    expect(await screen.findByTestId("home-route")).toBeInTheDocument();
  });

  it("summarizes only the confirmed answers and queue classifications, and reviews only unique wrong words", async () => {
    const apple = queueItem(1, "apple", "NEW");
    apple.vocabulary.ipa = "/ˈæp.əl/";
    apple.vocabulary.imageUrl = "/images/apple.png";
    const book = queueItem(2, "book", "DUE", 2);
    const cat = queueItem(3, "cat", "NEW");
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response(queueResponse([apple, book, cat])))
      .mockResolvedValueOnce(response(reviewResponse(apple, "FORGOTTEN"), 201))
      .mockResolvedValueOnce(response(reviewResponse(book, "REMEMBERED"), 201))
      .mockResolvedValueOnce(response(reviewResponse(cat, "REMEMBERED"), 201));
    renderStudy();

    await screen.findByTestId("study-session-ready");
    fireEvent.click(screen.getByRole("button", { name: "Lật để xem nghĩa" }));
    fireEvent.click(screen.getByRole("button", { name: "Chưa nhớ" }));
    await screen.findByText("book");
    fireEvent.click(screen.getByRole("button", { name: "Lật để xem nghĩa" }));
    fireEvent.click(screen.getByRole("button", { name: "Đã nhớ" }));
    await screen.findByText("cat");
    fireEvent.click(screen.getByRole("button", { name: "Lật để xem nghĩa" }));
    fireEvent.click(screen.getByRole("button", { name: "Đã nhớ" }));
    await waitFor(() => expect(screen.getByText("apple")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Lật để xem nghĩa" }));
    fireEvent.click(screen.getByRole("button", { name: "Đã nhớ" }));

    await screen.findByTestId("study-session-summary");
    expect(screen.getByTestId("summary-answered-total")).toHaveTextContent("3 / 3");
    expect(screen.getByRole("heading", { name: "Đúng" }).parentElement).toHaveTextContent("2 từ");
    expect(screen.getByRole("heading", { name: "Sai" }).parentElement).toHaveTextContent("1 từ");
    expect(screen.getByRole("heading", { name: "Từ mới" }).parentElement).toHaveTextContent("2 từ");
    expect(screen.getByRole("heading", { name: "Từ đã ôn" }).parentElement).toHaveTextContent("1 từ");
    expect(screen.getByRole("heading", { name: "Cần ôn lại" }).parentElement).toHaveTextContent("1 từ");
    expect(screen.getAllByRole("link", { name: "apple" })).toHaveLength(1);
    expect(screen.queryByRole("link", { name: "book" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "cat" })).not.toBeInTheDocument();
    expect(screen.getByText("/ˈæp.əl/")).toBeInTheDocument();
    expect(screen.getByAltText("apple")).toHaveAttribute("src", "/images/apple.png");

    fireEvent.click(screen.getByRole("button", { name: "Ôn từ sai" }));
    expect(await screen.findByTestId("study-session-ready")).toBeInTheDocument();
    expect(screen.getByTestId("session-counter")).toHaveTextContent("Câu 1 / 1");
    expect(screen.getByText("apple")).toBeInTheDocument();
    expect(screen.queryByText("book")).not.toBeInTheDocument();
    expect(screen.queryByText("cat")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(4);
    fireEvent.click(screen.getByRole("button", { name: "Lật để xem nghĩa" }));
    fireEvent.click(screen.getByRole("button", { name: "Đã nhớ" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(5));
    const wrongReviewRequest = JSON.parse(String(fetchMock.mock.calls[4]?.[1]?.body));
    expect(wrongReviewRequest).toMatchObject({ vocabularyId: 1, expectedRevision: 1, result: "REMEMBERED" });
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("reset"))).toBe(false);
  });

  it("preserves a topic scope on continue and uses client-side navigation for vocabulary details", async () => {
    const item = queueItem(1, "apple");
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url === `/api/learners/${learner.id}/review-queue`) return response(queueResponse([item]));
      if (url === "/api/topics/42/vocabulary") return response({ vocabulary: [item.vocabulary] });
      return response(reviewResponse(item, "FORGOTTEN"), 201);
    });
    renderStudy(learner, "flashcard", "/study?topicId=42");

    await screen.findByTestId("study-session-ready");
    fireEvent.click(screen.getByRole("button", { name: "Lật để xem nghĩa" }));
    fireEvent.click(screen.getByRole("button", { name: "Chưa nhớ" }));
    await screen.findByText("Ôn tập lại");
    fireEvent.click(screen.getByRole("button", { name: "Lật để xem nghĩa" }));
    fireEvent.click(screen.getByRole("button", { name: "Đã nhớ" }));
    await screen.findByTestId("study-session-summary");

    expect(screen.getByRole("link", { name: /Học tiếp/ })).toHaveAttribute("href", "/study/setup?topicId=42");
    fireEvent.click(screen.getByRole("link", { name: "apple" }));
    expect(await screen.findByTestId("vocabulary-detail-route")).toBeInTheDocument();
  });

  it("preserves a learning set scope on the continue action", async () => {
    const apple = queueItem(1, "apple");
    const bread = queueItem(2, "bread");
    const learningSet = {
      id: 4,
      slug: "food",
      name: "Food",
      description: "Food words",
      grade: null,
      enabled: true,
      sortOrder: 1,
      vocabularyCount: 1,
      items: [{ sortOrder: 0, vocabulary: apple.vocabulary }]
    };
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url === `/api/learners/${learner.id}/review-queue`) return response(queueResponse([apple, bread]));
      if (url === "/api/learning-sets/4") return response({ learningSet });
      return response(reviewResponse(apple, "REMEMBERED"), 201);
    });
    renderStudy(learner, "flashcard", "/study?learningSetId=4");

    await screen.findByTestId("study-session-ready");
    fireEvent.click(screen.getByRole("button", { name: "Lật để xem nghĩa" }));
    fireEvent.click(screen.getByRole("button", { name: "Đã nhớ" }));
    await screen.findByTestId("study-session-summary");

    expect(screen.getByRole("link", { name: /Học tiếp/ })).toHaveAttribute("href", "/study/setup?learningSetId=4");
  });

  it("preserves the saved vocabulary scope through a completed session summary", async () => {
    const apple = queueItem(1, "apple");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url === `/api/learners/${learner.id}/review-queue?scope=saved`) return response(queueResponse([apple]));
      if (url.endsWith("/reviews")) return response(reviewResponse(apple, "REMEMBERED"), 201);
      return response({ error: { code: "NOT_FOUND" } }, 404);
    });
    renderStudy(learner, "flashcard", "/study?saved=1&count=1&content=new");

    expect(await screen.findByTestId("study-session-ready")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Lật để xem nghĩa" }));
    fireEvent.click(screen.getByRole("button", { name: "Đã nhớ" }));
    await screen.findByTestId("study-session-summary");

    expect(screen.getByRole("link", { name: /Học tiếp/ })).toHaveAttribute("href", "/study/setup?saved=1");
    expect(fetchMock).toHaveBeenCalledWith(`/api/learners/${learner.id}/review-queue?scope=saved`, { credentials: "include" });
    expect(fetchMock.mock.calls.some(([url]) => String(url) === `/api/learners/${learner.id}/review-queue`)).toBe(false);
  });

  it("studies only the saved-all queue through the canonical review API and preserves intent on summary", async () => {
    const apple = queueItem(1, "apple", "VOLUNTARY", 5, "LEARNING");
    let submittedRequest: Record<string, unknown> | undefined;
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      if (url === `/api/learners/${learner.id}/review-queue?scope=saved&content=all`) return response(queueResponse([apple]));
      if (url === "/api/reviews") {
        submittedRequest = JSON.parse(String(init?.body)) as Record<string, unknown>;
        return response(reviewResponse(apple, "REMEMBERED"), 201);
      }
      return response({ error: { code: "NOT_FOUND" } }, 404);
    });
    renderStudy(learner, "flashcard", "/study?saved=1&content=all&count=10");

    expect(await screen.findByTestId("study-session-ready")).toBeInTheDocument();
    expect(screen.getByTestId("session-counter")).toHaveTextContent("Câu 1 / 1");
    expect(screen.getByText("apple")).toBeInTheDocument();
    expect(screen.queryByText("book")).not.toBeInTheDocument();
    expect(screen.getByText("Từ đã lưu")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Lật để xem nghĩa" }));
    fireEvent.click(screen.getByRole("button", { name: "Đã nhớ" }));
    await screen.findByTestId("study-session-summary");

    expect(submittedRequest).toMatchObject({ learnerId: learner.id, vocabularyId: 1, expectedRevision: 5, result: "REMEMBERED" });
    expect(submittedRequest).not.toHaveProperty("status");
    expect(submittedRequest).not.toHaveProperty("nextReviewDate");
    expect(screen.getByRole("link", { name: /Học tiếp/ })).toHaveAttribute("href", "/study/setup?saved=1&content=all");
    expect(fetchMock).toHaveBeenCalledWith(`/api/learners/${learner.id}/review-queue?scope=saved&content=all`, { credentials: "include" });
    expect(fetchMock.mock.calls.some(([url]) => String(url) === `/api/learners/${learner.id}/review-queue`)).toBe(false);
  });

  it("hides the current streak when the summary read fails", async () => {
    requestActivitySummaryMock.mockRejectedValueOnce(new Error("unavailable"));
    const item = queueItem(1, "apple");
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response(queueResponse([item])))
      .mockResolvedValueOnce(response(reviewResponse(item, "REMEMBERED"), 201));
    renderStudy();

    await screen.findByTestId("study-session-ready");
    fireEvent.click(screen.getByRole("button", { name: "Lật để xem nghĩa" }));
    fireEvent.click(screen.getByRole("button", { name: "Đã nhớ" }));
    await screen.findByTestId("study-session-summary");
    await waitFor(() => expect(requestActivitySummaryMock).toHaveBeenCalledOnce());

    expect(screen.queryByRole("heading", { name: "Chuỗi ngày" })).not.toBeInTheDocument();
  });

  it("keeps the learner answer and correct answer from exercise data on wrong rows", async () => {
    const apple = queueItem(1, "apple");
    const book = queueItem(2, "book");
    const cat = queueItem(3, "cat");
    const dog = queueItem(4, "dog");
    const pool = [apple, book, cat, dog];
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response(queueResponse(pool)))
      .mockResolvedValueOnce(response(reviewResponse(apple, "FORGOTTEN"), 201))
      .mockResolvedValueOnce(response(reviewResponse(book, "REMEMBERED"), 201))
      .mockResolvedValueOnce(response(reviewResponse(cat, "REMEMBERED"), 201))
      .mockResolvedValueOnce(response(reviewResponse(dog, "REMEMBERED"), 201));
    renderStudy(learner, "exercise", "/study", "MULTIPLE_CHOICE_MEANING");

    await screen.findByTestId("exercise-card");
    fireEvent.click(screen.getByRole("button", { name: "book-nghĩa" }));
    await waitFor(() => expect(screen.getByTestId("exercise-word")).toHaveTextContent("book"));
    fireEvent.click(screen.getByRole("button", { name: "book-nghĩa" }));
    await waitFor(() => expect(screen.getByTestId("flashcard")).toHaveTextContent("cat"));
    fireEvent.click(screen.getByRole("button", { name: "Lật để xem nghĩa" }));
    fireEvent.click(screen.getByRole("button", { name: "Đã nhớ" }));
    await waitFor(() => expect(screen.getByTestId("flashcard")).toHaveTextContent("dog"));
    fireEvent.click(screen.getByRole("button", { name: "Lật để xem nghĩa" }));
    fireEvent.click(screen.getByRole("button", { name: "Đã nhớ" }));
    await waitFor(() => expect(screen.getByTestId("flashcard")).toHaveTextContent("apple"));
    fireEvent.click(screen.getByRole("button", { name: "Lật để xem nghĩa" }));
    fireEvent.click(screen.getByRole("button", { name: "Đã nhớ" }));
    await screen.findByTestId("study-session-summary");

    expect(screen.getByText("Câu trả lời của bạn").nextElementSibling).toHaveTextContent("book-nghĩa");
    expect(screen.getByText("Đáp án đúng").nextElementSibling).toHaveTextContent("apple-nghĩa");
  });

  it("formats measured session duration without substituting a default", () => {
    expect(formatStudyDuration(1_000, 1_000)).toBe("0 giây");
    expect(formatStudyDuration(1_000, 205_000)).toBe("3 phút 24 giây");
    expect(formatStudyDuration(10_000, 730_000)).toBe("12 phút");
  });

  it("uses the canonical server response when deciding the next session state", async () => {
    const item = queueItem(1, "apple");
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response(queueResponse([item])))
      .mockResolvedValueOnce(response(reviewResponse(item, "FORGOTTEN"), 201));
    renderStudy();

    await screen.findByTestId("study-session-ready");
    fireEvent.click(screen.getByRole("button", { name: "Lật để xem nghĩa" }));
    fireEvent.click(screen.getByRole("button", { name: "Đã nhớ" }));

    await screen.findByText("Ôn tập lại");
    expect(screen.queryByTestId("study-session-summary")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("passes queue audio into Flashcard and stops it when Study advances", async () => {
    const first = queueItem(1, "apple", "DUE", 3);
    first.vocabulary.audioUrl = "/audio/apple.mp3";
    const second = queueItem(2, "book");
    const audio = {
      src: "",
      preload: "",
      currentTime: 0,
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      load: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    } as unknown as HTMLAudioElement;
    vi.stubGlobal("Audio", vi.fn(function Audio() {
      return audio;
    }));
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response(queueResponse([first, second])))
      .mockResolvedValueOnce(response(reviewResponse(first, "REMEMBERED"), 201));
    renderStudy();

    await screen.findByTestId("study-session-ready");
    fireEvent.click(screen.getByRole("button", { name: "Nghe phát âm apple" }));
    await waitFor(() => expect(audio.play).toHaveBeenCalledTimes(1));
    await screen.findByRole("button", { name: "Tạm dừng phát âm apple" });
    expect(audio.src).toBe("/audio/apple.mp3");

    fireEvent.click(screen.getByRole("button", { name: "Lật để xem nghĩa" }));
    fireEvent.click(screen.getByRole("button", { name: "Đã nhớ" }));
    await waitFor(() => expect(screen.getByText("book")).toBeInTheDocument());
    expect(audio.pause).toHaveBeenCalledTimes(1);
    expect(audio.currentTime).toBe(0);
  });

  it("keeps the same reviewId on retry after save failure", async () => {
    const item = queueItem(1, "apple");
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response(queueResponse([item])))
      .mockResolvedValueOnce(response({ error: { code: "INTERNAL_ERROR" } }, 503))
      .mockResolvedValueOnce(response(reviewResponse(item, "REMEMBERED"), 201));
    renderStudy();

    await screen.findByTestId("study-session-ready");
    fireEvent.click(screen.getByRole("button", { name: "Lật để xem nghĩa" }));
    fireEvent.click(screen.getByRole("button", { name: "Đã nhớ" }));
    expect(await screen.findByTestId("study-save-failed")).toBeInTheDocument();
    expect(screen.getByTestId("study-save-failed")).toHaveTextContent("Chưa lưu tiến trình.");
    expect(screen.getByRole("button", { name: "Chưa nhớ" })).toBeDisabled();
    expect(screen.queryByTestId("study-session-summary")).not.toBeInTheDocument();

    const confirmMock = vi.fn(() => false);
    vi.stubGlobal("confirm", confirmMock);
    fireEvent.click(screen.getByRole("link", { name: "Thoát buổi học" }));
    expect(confirmMock).toHaveBeenCalledWith("Câu trả lời chưa được lưu. Bạn vẫn muốn thoát?");
    expect(screen.getByTestId("study-session-ready")).toBeInTheDocument();

    const firstBody = String(fetchMock.mock.calls[1]?.[1]?.body);
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    await waitFor(() => expect(screen.getByTestId("study-session-summary")).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[2]?.[1]?.body).toBe(firstBody);
    expect(screen.getByRole("heading", { name: "Đúng" }).parentElement).toHaveTextContent("1 từ");
    vi.unstubAllGlobals();
  });

  it("reconciles stale revision without counting the rejected answer", async () => {
    const item = queueItem(1, "apple", "DUE", 1);
    const refreshed = queueItem(1, "apple", "DUE", 2);
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response(queueResponse([item])))
      .mockResolvedValueOnce(response({ error: { code: "STALE_REVISION" } }, 409))
      .mockResolvedValueOnce(response(queueResponse([refreshed])))
      .mockResolvedValueOnce(response(reviewResponse(refreshed, "REMEMBERED"), 201));
    renderStudy();

    await screen.findByTestId("study-session-ready");
    fireEvent.click(screen.getByRole("button", { name: "Lật để xem nghĩa" }));
    fireEvent.click(screen.getByRole("button", { name: "Đã nhớ" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(await screen.findByText("Tiến trình đã thay đổi. Hãy đánh giá lại thẻ này.")).toBeInTheDocument();
    expect(screen.getByTestId("session-counter")).toHaveTextContent("Câu 1 / 1");

    fireEvent.click(screen.getByRole("button", { name: "Lật để xem nghĩa" }));
    fireEvent.click(screen.getByRole("button", { name: "Đã nhớ" }));
    await waitFor(() => expect(screen.getByTestId("study-session-summary")).toBeInTheDocument());
    expect(screen.getByRole("heading", { name: "Đúng" }).parentElement).toHaveTextContent("1 từ");
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("reinserts Forgotten only as session-local reinforcement and caps it at two", async () => {
    const item = queueItem(1, "apple");
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response(queueResponse([item])))
      .mockResolvedValueOnce(response(reviewResponse(item, "FORGOTTEN"), 201));
    renderStudy();

    await screen.findByTestId("study-session-ready");
    fireEvent.click(screen.getByRole("button", { name: "Lật để xem nghĩa" }));
    fireEvent.click(screen.getByRole("button", { name: "Chưa nhớ" }));
    await screen.findByText("Ôn tập lại");
    expect(screen.getByTestId("session-counter")).toHaveTextContent("Câu 1 / 1");

    fireEvent.click(screen.getByRole("button", { name: "Lật để xem nghĩa" }));
    fireEvent.click(screen.getByRole("button", { name: "Chưa nhớ" }));
    await screen.findByText("Ôn tập lại");
    fireEvent.click(screen.getByRole("button", { name: "Lật để xem nghĩa" }));
    fireEvent.click(screen.getByRole("button", { name: "Đã nhớ" }));

    await waitFor(() => expect(screen.getByTestId("study-session-summary")).toBeInTheDocument());
    expect(screen.getByTestId("summary-answered-total")).toHaveTextContent("1 / 1");
    expect(screen.getByRole("heading", { name: "Sai" }).parentElement).toHaveTextContent("1 từ");
    expect(screen.getByRole("heading", { name: "Cần ôn lại" }).parentElement).toHaveTextContent("1 từ");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("shows a valid empty state and redirects without learner context", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(response(queueResponse([])));
    renderStudy();
    expect(await screen.findByTestId("study-empty-state")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Quay lại thiết lập" })).toHaveAttribute("href", "/study/setup");

    renderStudy(null);
    await waitFor(() => expect(screen.getByText("learners-route")).toBeInTheDocument());
  });

  it("continues a topic session from only its vocabulary in the canonical queue", async () => {
    const queue = [queueItem(1, "apple"), queueItem(2, "bread"), queueItem(3, "water", "DUE", 4)];
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const path = String(input);
      if (path === `/api/learners/${learner.id}/review-queue`) return response(queueResponse(queue));
      if (path === "/api/topics/7/vocabulary") return response({ vocabulary: [queue[0]!.vocabulary, queue[2]!.vocabulary] });
      return response({ error: { code: "NOT_FOUND" } }, 404);
    });
    renderStudy(learner, "flashcard", "/study?topicId=7");

    expect(await screen.findByTestId("study-session-ready")).toBeInTheDocument();
    expect(screen.getByTestId("session-counter")).toHaveTextContent("Câu 1 / 2");
    expect(screen.getByText("apple")).toBeInTheDocument();
    expect(screen.queryByText("bread")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/topics/7/vocabulary", { credentials: "include" });
    expect(fetchMock.mock.calls.every(([, init]) => !init?.method || init.method === "GET")).toBe(true);
  });

  it("continues a learning set session using its ordered vocabulary IDs", async () => {
    const queue = [queueItem(1, "apple"), queueItem(2, "bread"), queueItem(3, "water")];
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const path = String(input);
      if (path === `/api/learners/${learner.id}/review-queue`) return response(queueResponse(queue));
      if (path === "/api/learning-sets/4") {
        return response({ learningSet: {
          id: 4,
          slug: "food",
          name: "Food",
          description: "Food words",
          grade: null,
          enabled: true,
          sortOrder: 1,
          vocabularyCount: 2,
          items: [
            { sortOrder: 0, vocabulary: queue[1]!.vocabulary },
            { sortOrder: 1, vocabulary: queue[2]!.vocabulary }
          ]
        } });
      }
      return response({ error: { code: "NOT_FOUND" } }, 404);
    });
    renderStudy(learner, "flashcard", "/study?learningSetId=4");

    expect(await screen.findByTestId("study-session-ready")).toBeInTheDocument();
    expect(screen.getByTestId("session-counter")).toHaveTextContent("Câu 1 / 2");
    expect(screen.getByText("bread")).toBeInTheDocument();
    expect(screen.queryByText("apple")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/learning-sets/4", { credentials: "include" });
    expect(fetchMock.mock.calls.every(([, init]) => !init?.method || init.method === "GET")).toBe(true);
  });

  it("leaves without confirmation when all work is already settled", async () => {
    const item = queueItem(1, "apple");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(response(queueResponse([item])));
    const confirmMock = vi.fn(() => true);
    vi.stubGlobal("confirm", confirmMock);
    renderStudy();

    await screen.findByTestId("study-session-ready");
    fireEvent.click(screen.getByRole("link", { name: "Thoát buổi học" }));

    expect(confirmMock).not.toHaveBeenCalled();
    expect(await screen.findByText("study-setup-route")).toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});
