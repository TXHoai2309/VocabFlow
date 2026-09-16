import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import type { LearnerDto, ReviewQueueItem, ReviewQueueResponse, VocabularyDto } from "@vocabflow/contracts";
import { ActiveLearnerProvider } from "../learners/learner-context-provider";
import { StudyPage } from "./study-page";

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
    enabled: true,
    contentVersion: 1
  };
}

function queueItem(id: number, word: string, queueType: ReviewQueueItem["queueType"] = "NEW", expectedRevision = 0): ReviewQueueItem {
  return {
    vocabulary: vocabulary(id, word, `${word}-nghĩa`),
    queueType,
    status: queueType === "DUE" ? "LEARNING" : "NEW",
    nextReviewDate: queueType === "DUE" ? "2026-09-15" : null,
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

function renderStudy(initialLearner: LearnerDto | null = learner) {
  return render(
    <MemoryRouter initialEntries={["/study"]}>
      <ActiveLearnerProvider initialLearner={initialLearner}>
        <Routes>
          <Route path="/study" element={<StudyPage />} />
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
    expect(screen.getByTestId("session-counter")).toHaveTextContent("0 / 2");
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

  it("persists a scheduled answer and advances only after server confirmation", async () => {
    const first = queueItem(1, "apple", "DUE", 3);
    const second = queueItem(2, "book");
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response(queueResponse([first, second])))
      .mockResolvedValueOnce(response(reviewResponse(first, "REMEMBERED"), 201));
    renderStudy();

    await screen.findByTestId("study-session-ready");
    fireEvent.click(screen.getByRole("button", { name: "Lật để xem nghĩa" }));
    fireEvent.click(screen.getByRole("button", { name: "Đã nhớ" }));

    await waitFor(() => expect(screen.getByText("book")).toBeInTheDocument());
    expect(screen.getByTestId("session-counter")).toHaveTextContent("1 / 2");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const request = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));
    expect(request).toMatchObject({ learnerId: learner.id, vocabularyId: 1, result: "REMEMBERED", expectedRevision: 3 });
    expect(request.reviewId).toMatch(/^[0-9a-f-]{36}$/);
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

    await screen.findByText("Ôn lại");
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
    expect(screen.getByText("Chưa lưu tiến trình")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Chưa nhớ" })).toBeDisabled();

    const confirmMock = vi.fn(() => false);
    vi.stubGlobal("confirm", confirmMock);
    fireEvent.click(screen.getByRole("link", { name: "← Thoát" }));
    expect(confirmMock).toHaveBeenCalledWith("Câu trả lời chưa được lưu. Bạn vẫn muốn thoát?");
    expect(screen.getByTestId("study-session-ready")).toBeInTheDocument();

    const firstBody = String(fetchMock.mock.calls[1]?.[1]?.body);
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    await waitFor(() => expect(screen.getByTestId("study-session-summary")).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[2]?.[1]?.body).toBe(firstBody);
    expect(screen.getByText("Đã review").nextElementSibling).toHaveTextContent("1");
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
    expect(screen.getByTestId("session-counter")).toHaveTextContent("0 / 1");

    fireEvent.click(screen.getByRole("button", { name: "Lật để xem nghĩa" }));
    fireEvent.click(screen.getByRole("button", { name: "Đã nhớ" }));
    await waitFor(() => expect(screen.getByTestId("study-session-summary")).toBeInTheDocument());
    expect(screen.getByText("Đã review").nextElementSibling).toHaveTextContent("1");
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
    await screen.findByText("Ôn lại");
    expect(screen.getByTestId("session-counter")).toHaveTextContent("1 / 1");

    fireEvent.click(screen.getByRole("button", { name: "Lật để xem nghĩa" }));
    fireEvent.click(screen.getByRole("button", { name: "Chưa nhớ" }));
    await screen.findByText("Ôn lại");
    fireEvent.click(screen.getByRole("button", { name: "Lật để xem nghĩa" }));
    fireEvent.click(screen.getByRole("button", { name: "Đã nhớ" }));

    await waitFor(() => expect(screen.getByTestId("study-session-summary")).toBeInTheDocument());
    expect(screen.getByText("Lượt ôn lại").nextElementSibling).toHaveTextContent("2");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("shows a valid empty state and redirects without learner context", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(response(queueResponse([])));
    renderStudy();
    expect(await screen.findByTestId("study-empty-state")).toBeInTheDocument();
    expect(screen.getByText("Về learner")).toBeInTheDocument();

    renderStudy(null);
    await waitFor(() => expect(screen.getByText("learners-route")).toBeInTheDocument());
  });

  it("leaves without confirmation when all work is already settled", async () => {
    const item = queueItem(1, "apple");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(response(queueResponse([item])));
    const confirmMock = vi.fn(() => true);
    vi.stubGlobal("confirm", confirmMock);
    renderStudy();

    await screen.findByTestId("study-session-ready");
    fireEvent.click(screen.getByRole("link", { name: "← Thoát" }));

    expect(confirmMock).not.toHaveBeenCalled();
    expect(await screen.findByText("learners-route")).toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});
