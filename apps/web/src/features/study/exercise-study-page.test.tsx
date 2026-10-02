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

function queueItem(id: number, word: string, vietnamese: string, audioUrl: string | null = null, imageUrl: string | null = null): ReviewQueueItem {
  const vocabulary: VocabularyDto = {
    id,
    word,
    ipa: null,
    vietnamese,
    definitionEn: null,
    exampleEn: null,
    imageUrl,
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

function renderExercise(path = "/study/exercises") {
  return render(
    <MemoryRouter initialEntries={[path]}>
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

  it("maps a meaning answer to REMEMBERED and automatically advances after saving", async () => {
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
    expect(await screen.findByText("Chính xác!")).toBeInTheDocument();
    expect(screen.getByTestId("exercise-word")).toHaveTextContent("apple");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(screen.getByText("book")).toBeInTheDocument());
    expect(screen.queryByTestId("study-session-summary")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toMatchObject({
      learnerId: learner.id,
      vocabularyId: target.vocabulary.id,
      result: "REMEMBERED",
      expectedRevision: 0
    });

    await waitFor(() => expect(screen.getByTestId("session-counter")).toHaveTextContent("Câu 2 / 4"));
  });

  it("supports desktop option shortcuts without Enter-next or duplicate review writes", async () => {
    const target = queueItem(1, "apple", "quả táo");
    const queue = [target, queueItem(2, "book", "quyển sách"), queueItem(3, "house", "ngôi nhà"), queueItem(4, "water", "nước")];
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response(queueResponse(queue)))
      .mockResolvedValueOnce(response(reviewResponse(target, "REMEMBERED"), 201));
    renderExercise();

    await screen.findByTestId("exercise-card");
    const options = screen.getByTestId("exercise-card").querySelectorAll<HTMLButtonElement>(".exercise-option");
    const correctIndex = Array.from(options).findIndex((option) => option.textContent?.includes("quả táo"));
    expect(correctIndex).toBeGreaterThanOrEqual(0);
    options[correctIndex]!.focus();
    fireEvent.keyDown(options[correctIndex]!, { key: String(correctIndex + 1) });
    expect(options[correctIndex]).toHaveAttribute("aria-pressed", "false");

    fireEvent.keyDown(document.body, { key: String(correctIndex + 1) });
    fireEvent.keyDown(document.body, { key: String(correctIndex + 1) });
    expect(options[correctIndex]).toHaveAttribute("aria-pressed", "true");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(document.body, { key: "Enter" });
    await screen.findByText("book");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not apply keyboard answer shortcuts below desktop width", async () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false }) as MediaQueryList));
    const target = queueItem(1, "apple", "quả táo");
    const queue = [target, queueItem(2, "book", "quyển sách"), queueItem(3, "house", "ngôi nhà"), queueItem(4, "water", "nước")];
    vi.spyOn(globalThis, "fetch").mockResolvedValue(response(queueResponse(queue)));
    renderExercise();

    await screen.findByTestId("exercise-card");
    const options = screen.getByTestId("exercise-card").querySelectorAll<HTMLButtonElement>(".exercise-option");
    const correctIndex = Array.from(options).findIndex((option) => option.textContent?.includes("quả táo"));
    expect(correctIndex).toBeGreaterThanOrEqual(0);
    fireEvent.keyDown(document.body, { key: String(correctIndex + 1) });
    expect(options[correctIndex]).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(options[correctIndex]!);
    expect(options[correctIndex]).toHaveAttribute("aria-pressed", "true");
  });

  it("persists a correct answer immediately and exposes neither Undo nor Next", async () => {
    const target = queueItem(1, "apple", "quả táo");
    const queue = [target, queueItem(2, "book", "quyển sách"), queueItem(3, "house", "ngôi nhà"), queueItem(4, "water", "nước")];
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response(queueResponse(queue)))
      .mockResolvedValueOnce(response(reviewResponse(target, "REMEMBERED"), 201));
    renderExercise();
    await screen.findByTestId("exercise-card");

    fireEvent.click(screen.getByRole("button", { name: "quả táo" }));
    expect(screen.getByText("Chính xác!")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("button", { name: /Hoàn tác/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Câu tiếp theo" })).not.toBeInTheDocument();
    await screen.findByText("book");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("persists an incorrect answer without Undo, Next, or Z behavior", async () => {
    const target = queueItem(1, "apple", "quả táo");
    const queue = [target, queueItem(2, "book", "quyển sách"), queueItem(3, "house", "ngôi nhà"), queueItem(4, "water", "nước")];
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response(queueResponse(queue)))
      .mockResolvedValueOnce(response(reviewResponse(target, "REMEMBERED"), 201));
    renderExercise();
    await screen.findByTestId("exercise-card");

    fireEvent.click(screen.getByRole("button", { name: "quyển sách" }));
    expect(screen.getByText("Chưa đúng.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "quả táo" })).toHaveClass("is-correct");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(document.body, { key: "z" });
    fireEvent.keyDown(document.body, { key: "Enter" });
    expect(screen.queryByRole("button", { name: /Hoàn tác/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Câu tiếp theo" })).not.toBeInTheDocument();
    await screen.findByText("book");
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toMatchObject({ result: "FORGOTTEN" });
  });

  it("does not route answer shortcuts into the typing field", async () => {
    const target = queueItem(4, "desk", "bàn học");
    const queue = [target, queueItem(1, "apple", "quả táo"), queueItem(2, "book", "quyển sách"), queueItem(3, "house", "ngôi nhà")];
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(response(queueResponse(queue)));
    renderExercise("/study/exercises?type=TYPE_WORD");
    await screen.findByLabelText("Từ tiếng Anh");
    const input = screen.getByLabelText("Từ tiếng Anh");
    input.focus();
    fireEvent.keyDown(input, { key: "1" });
    expect(screen.queryByText("Chính xác!")).not.toBeInTheDocument();
    expect(screen.getByTestId("study-session-ready")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
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
    expect(await screen.findByText("Chưa đúng.")).toBeInTheDocument();
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toMatchObject({ result: "FORGOTTEN" });

    await waitFor(() => expect(screen.getByTestId("session-counter")).toHaveTextContent("Câu 2 / 4"));
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
    expect(screen.getByText("Âm thanh không khả dụng. Đã chuyển sang thẻ học.")).toBeInTheDocument();
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
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(await screen.findByTestId("study-save-failed")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Câu tiếp theo" })).not.toBeInTheDocument();
    const firstBody = String(fetchMock.mock.calls[1]?.[1]?.body);
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    await waitFor(() => expect(screen.getByTestId("session-counter")).toHaveTextContent("Câu 2 / 4"));
    expect(fetchMock.mock.calls[2]?.[1]?.body).toBe(firstBody);
  });
});

describe("US-33 + US-34 image and typing Study mode", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("shows an image-to-word prompt without answer leakage and saves a correct image answer", async () => {
    const target = queueItem(1, "apple", "quả táo", null, "/images/apple.jpg");
    const queue = [target, queueItem(2, "book", "quyển sách"), queueItem(3, "house", "ngôi nhà"), queueItem(4, "water", "nước")];
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response(queueResponse(queue)))
      .mockResolvedValueOnce(response(reviewResponse(target, "REMEMBERED"), 201));
    renderExercise("/study/exercises?type=IMAGE_TO_WORD");

    await screen.findByTestId("exercise-card");
    expect(screen.getByTestId("exercise-card")).toHaveAttribute("data-exercise-type", "IMAGE_TO_WORD");
    expect(screen.getByTestId("exercise-image")).toHaveAttribute("alt", "Hình ảnh gợi ý cho bài tập từ vựng");
    expect(screen.getByTestId("exercise-prompt")).not.toHaveTextContent("apple");
    fireEvent.click(screen.getByRole("button", { name: "apple" }));
    await screen.findByText("Chính xác!");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toMatchObject({ result: "REMEMBERED", vocabularyId: 1 });
  });

  it("moves a broken image to one safe alternative without creating a review", async () => {
    const target = queueItem(1, "apple", "quả táo", null, "/images/apple.jpg");
    const queue = [target, queueItem(2, "book", "quyển sách"), queueItem(3, "house", "ngôi nhà"), queueItem(4, "water", "nước")];
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(response(queueResponse(queue)));
    renderExercise("/study/exercises?type=IMAGE_TO_WORD");

    await screen.findByTestId("exercise-image");
    fireEvent.error(screen.getByTestId("exercise-image"));
    expect(await screen.findByTestId("exercise-card")).toHaveAttribute("data-exercise-type", "TYPE_WORD");
    expect(screen.queryByTestId("exercise-image")).not.toBeInTheDocument();
    expect(screen.getByTestId("exercise-cue")).toHaveTextContent("quả táo");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("accepts a normalized exact spelling and sends transient server-verifiable evidence", async () => {
    const target = queueItem(1, "apple", "quả táo");
    const queue = [target, queueItem(2, "book", "quyển sách"), queueItem(3, "house", "ngôi nhà"), queueItem(4, "water", "nước")];
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response(queueResponse(queue)))
      .mockResolvedValueOnce(response(reviewResponse(target, "REMEMBERED"), 201));
    renderExercise("/study/exercises?type=TYPE_WORD");

    await screen.findByTestId("exercise-card");
    expect(screen.getByTestId("exercise-card")).toHaveAttribute("data-exercise-type", "TYPE_WORD");
    expect(screen.getByTestId("exercise-prompt")).not.toHaveTextContent("apple");
    fireEvent.change(screen.getByLabelText("Từ tiếng Anh"), { target: { value: " APPLE " } });
    fireEvent.submit(screen.getByRole("button", { name: "Gửi câu trả lời" }).closest("form")!);
    await screen.findByText("Chính xác!");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const body = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body)) as Record<string, unknown>;
    expect(body).toMatchObject({ result: "REMEMBERED", vocabularyId: 1 });
    expect(body).toMatchObject({ exerciseSubmission: { type: "TYPE_WORD", answer: " APPLE " } });
    expect((body.exerciseSubmission as Record<string, unknown>).correct).toBeUndefined();
  });

  it("maps an exact spelling error to FORGOTTEN", async () => {
    const target = queueItem(1, "apple", "quả táo");
    const queue = [target, queueItem(2, "book", "quyển sách"), queueItem(3, "house", "ngôi nhà"), queueItem(4, "water", "nước")];
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response(queueResponse(queue)))
      .mockResolvedValueOnce(response(reviewResponse(target, "FORGOTTEN"), 201));
    renderExercise("/study/exercises?type=TYPE_WORD");

    await screen.findByTestId("exercise-card");
    fireEvent.change(screen.getByLabelText("Từ tiếng Anh"), { target: { value: "aple" } });
    fireEvent.submit(screen.getByRole("button", { name: "Gửi câu trả lời" }).closest("form")!);
    await screen.findByText("Chưa đúng.");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toMatchObject({ result: "FORGOTTEN" });
  });
});
