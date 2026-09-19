import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import type { LearnerDto, ReviewQueueItem, ReviewQueueResponse, VocabularyDto } from "@vocabflow/contracts";
import { ActiveLearnerProvider } from "../learners/learner-context-provider";
import { ExerciseStudyPage } from "./study-page";

const learner: LearnerDto = {
  id: "00000000-0000-4000-8000-000000000010",
  householdId: "00000000-0000-4000-8000-000000000001",
  displayName: "An",
  avatarKey: null,
  enabled: true,
  createdAt: "2026-09-10T00:00:00.000Z",
  updatedAt: "2026-09-10T00:00:00.000Z"
};

function queueItem(id: number, word: string, vietnamese: string, audioUrl: string | null = null): ReviewQueueItem {
  const vocabulary: VocabularyDto = {
    id,
    word,
    ipa: null,
    vietnamese,
    definitionEn: null,
    exampleEn: null,
    imageUrl: null,
    audioUrl,
    topic: null,
    level: null,
    enabled: true,
    contentVersion: 1
  };
  return { vocabulary, queueType: "NEW", status: "NEW", nextReviewDate: null, expectedRevision: 0 };
}

function queueResponse(queue: ReviewQueueItem[]): ReviewQueueResponse {
  return { learnerId: learner.id, reviewDate: "2026-09-15", dueCount: 0, newCount: queue.length, queue };
}

function reviewResponse(item: ReviewQueueItem, result: "REMEMBERED" | "FORGOTTEN") {
  return {
    reviewId: "00000000-0000-4000-8000-000000000099",
    learnerId: learner.id,
    vocabularyId: item.vocabulary.id,
    result,
    progress: {
      status: "LEARNING" as const,
      consecutiveCorrect: result === "REMEMBERED" ? 1 : 0,
      intervalDays: 1,
      firstLearnedDate: "2026-09-15",
      lastReviewedDate: "2026-09-15",
      nextReviewDate: "2026-09-16",
      totalCorrect: result === "REMEMBERED" ? 1 : 0,
      totalIncorrect: result === "FORGOTTEN" ? 1 : 0,
      revision: 1
    }
  };
}

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function renderExercise() {
  return render(
    <MemoryRouter initialEntries={["/study/exercises"]}>
      <ActiveLearnerProvider initialLearner={learner}>
        <Routes>
          <Route path="/study/exercises" element={<ExerciseStudyPage />} />
          <Route path="/learners" element={<p>learners-route</p>} />
        </Routes>
      </ActiveLearnerProvider>
    </MemoryRouter>
  );
}

describe("US-31 + US-32 controlled exercise Study mode", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("maps a meaning answer to REMEMBERED, locks it, and waits for save before continue", async () => {
    const target = queueItem(1, "apple", "quả táo");
    const queue = [target, queueItem(2, "book", "quyển sách"), queueItem(3, "house", "ngôi nhà"), queueItem(4, "water", "nước")];
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response(queueResponse(queue)))
      .mockResolvedValueOnce(response(reviewResponse(target, "REMEMBERED"), 201));
    renderExercise();

    await screen.findByTestId("exercise-card");
    fireEvent.click(screen.getByRole("button", { name: "quả táo" }));
    expect(screen.getByTestId("exercise-card")).toHaveAttribute("data-exercise-type", "MULTIPLE_CHOICE_MEANING");
    expect(screen.getByRole("button", { name: /quả táo/ })).toBeDisabled();
    expect(await screen.findByText("Chính xác.")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Đã lưu. Bạn có thể tiếp tục.")).toBeInTheDocument());
    expect(screen.queryByTestId("study-session-summary")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toMatchObject({
      learnerId: learner.id,
      vocabularyId: target.vocabulary.id,
      result: "REMEMBERED",
      expectedRevision: 0
    });

    fireEvent.click(screen.getByRole("button", { name: "Tiếp tục" }));
    expect(await screen.findByText("book")).toBeInTheDocument();
  });

  it("keeps listening target out of the prompt, maps a wrong answer to FORGOTTEN, and preserves reinforcement", async () => {
    const target = queueItem(1, "apple", "quả táo", "/audio/apple.mp3");
    const queue = [target, queueItem(2, "book", "quyển sách"), queueItem(3, "house", "ngôi nhà"), queueItem(4, "water", "nước")];
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response(queueResponse(queue)))
      .mockResolvedValueOnce(response(reviewResponse(target, "FORGOTTEN"), 201));
    vi.stubGlobal("Audio", vi.fn(() => ({
      src: "",
      preload: "",
      currentTime: 0,
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      load: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    } as unknown as HTMLAudioElement)));
    renderExercise();

    await screen.findByTestId("exercise-card");
    expect(screen.getByTestId("exercise-prompt")).not.toHaveTextContent("apple");
    expect(screen.getByTestId("exercise-audio-button")).toHaveAccessibleName("Nghe phát âm");
    fireEvent.click(screen.getByRole("button", { name: "book" }));
    expect(await screen.findByText("Chưa đúng. Đáp án:")).toBeInTheDocument();
    await screen.findByText("Đã lưu. Bạn có thể tiếp tục.");
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toMatchObject({ result: "FORGOTTEN" });

    fireEvent.click(screen.getByRole("button", { name: "Tiếp tục" }));
    expect(await screen.findByText("book")).toBeInTheDocument();
    expect(screen.getByTestId("session-counter")).toHaveTextContent("1 / 4");
  });

  it("uses Flashcard when safe exercise distractors are insufficient", async () => {
    const target = queueItem(1, "apple", "quả táo");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(response(queueResponse([target, queueItem(2, "book", "quyển sách")])));
    renderExercise();

    await screen.findByTestId("flashcard");
    expect(screen.queryByTestId("exercise-card")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Lật để xem nghĩa" }));
    expect(screen.getByRole("button", { name: "Đã nhớ" })).toBeInTheDocument();
  });

  it("falls back to Flashcard after a broken audio URL without writing a review", async () => {
    const target = queueItem(1, "apple", "quả táo", "/audio/apple.mp3");
    const queue = [target, queueItem(2, "book", "quyển sách"), queueItem(3, "house", "ngôi nhà"), queueItem(4, "water", "nước")];
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(response(queueResponse(queue)));
    vi.stubGlobal("Audio", vi.fn(() => ({
      src: "",
      preload: "",
      currentTime: 0,
      play: vi.fn().mockRejectedValue(new Error("broken audio")),
      pause: vi.fn(),
      load: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    } as unknown as HTMLAudioElement)));
    renderExercise();

    await screen.findByTestId("exercise-card");
    fireEvent.click(screen.getByTestId("exercise-audio-button"));
    expect(await screen.findByTestId("flashcard")).toBeInTheDocument();
    expect(screen.getByText("Âm thanh không khả dụng. Đã chuyển thẻ này sang Flashcard.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not advance after a save failure and retries the same review request", async () => {
    const target = queueItem(1, "apple", "quả táo");
    const queue = [target, queueItem(2, "book", "quyển sách"), queueItem(3, "house", "ngôi nhà"), queueItem(4, "water", "nước")];
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response(queueResponse(queue)))
      .mockResolvedValueOnce(response({ error: { code: "INTERNAL_ERROR" } }, 503))
      .mockResolvedValueOnce(response(reviewResponse(target, "REMEMBERED"), 201));
    renderExercise();

    await screen.findByTestId("exercise-card");
    fireEvent.click(screen.getByRole("button", { name: "quả táo" }));
    expect(await screen.findByTestId("study-save-failed")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Tiếp tục" })).not.toBeInTheDocument();
    const firstBody = String(fetchMock.mock.calls[1]?.[1]?.body);
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    await screen.findByRole("button", { name: "Tiếp tục" });
    expect(fetchMock.mock.calls[2]?.[1]?.body).toBe(firstBody);
  });
});
