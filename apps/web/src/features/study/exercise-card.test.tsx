import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { ExerciseCard } from "./exercise-card";
import { EXERCISE_TYPE, TYPE_WORD_CUE, TYPE_WORD_SUBMISSION, type ExerciseInstance } from "./exercise-generator";
import type { VocabularyDto } from "@vocabflow/contracts";

const vocabulary: VocabularyDto = {
  id: 1, word: "apple", ipa: "/ˈæp.əl/", vietnamese: "quả táo", definitionEn: null, exampleEn: null,
  imageUrl: null, audioUrl: null, topic: null, level: null, enabled: true, contentVersion: 1
};

const meaningExercise: ExerciseInstance = {
  exerciseId: "meaning:1:1",
  exerciseType: EXERCISE_TYPE.MULTIPLE_CHOICE_MEANING,
  vocabularyId: 1,
  audioUrl: null,
  imageUrl: null,
  prompt: "apple",
  cueType: null,
  cueText: null,
  options: [
    { optionId: "MULTIPLE_CHOICE_MEANING:1", vocabularyId: 1, label: "quả táo" },
    { optionId: "MULTIPLE_CHOICE_MEANING:2", vocabularyId: 2, label: "quyển sách" },
    { optionId: "MULTIPLE_CHOICE_MEANING:3", vocabularyId: 3, label: "ngôi nhà" },
    { optionId: "MULTIPLE_CHOICE_MEANING:4", vocabularyId: 4, label: "nước" }
  ],
  correctOptionId: "MULTIPLE_CHOICE_MEANING:1",
  correctAnswer: null
};

const listeningExercise: ExerciseInstance = {
  ...meaningExercise,
  exerciseId: "listening:1:1",
  exerciseType: EXERCISE_TYPE.LISTENING_CHOICE,
  audioUrl: "/audio/apple.mp3",
  prompt: "Nghe phát âm rồi chọn từ đúng.",
  options: meaningExercise.options.map((option) => ({
    ...option,
    optionId: `LISTENING_CHOICE:${option.vocabularyId}`,
    label: ["apple", "book", "house", "water"][option.vocabularyId - 1]!
  })),
  correctOptionId: "LISTENING_CHOICE:1"
};

const imageExercise: ExerciseInstance = {
  ...listeningExercise,
  exerciseId: "image_to_word:1:1",
  exerciseType: EXERCISE_TYPE.IMAGE_TO_WORD,
  audioUrl: null,
  imageUrl: "/images/apple.jpg",
  prompt: "Nhìn hình rồi chọn từ tiếng Anh đúng.",
  options: listeningExercise.options.map((option) => ({ ...option, optionId: `IMAGE_TO_WORD:${option.vocabularyId}` })),
  correctOptionId: "IMAGE_TO_WORD:1"
};

const typingExercise: ExerciseInstance = {
  ...meaningExercise,
  exerciseId: "typing:1:1:vietnamese",
  exerciseType: EXERCISE_TYPE.TYPE_WORD,
  prompt: "Gõ từ tiếng Anh tương ứng.",
  cueType: TYPE_WORD_CUE.VIETNAMESE,
  cueText: "quả táo",
  options: [],
  correctOptionId: TYPE_WORD_SUBMISSION,
  correctAnswer: "apple"
};

function audioMock(play = vi.fn().mockResolvedValue(undefined)) {
  const listeners = new Map<string, EventListener>();
  const audio = {
    src: "",
    preload: "",
    currentTime: 0,
    play,
    pause: vi.fn(),
    load: vi.fn(),
    addEventListener: (type: string, listener: EventListener) => listeners.set(type, listener),
    removeEventListener: vi.fn()
  } as unknown as HTMLAudioElement;
  vi.stubGlobal("Audio", vi.fn(() => audio));
  return { audio, emit: (type: string) => listeners.get(type)?.(new Event(type)) };
}

describe("exercise interaction layer", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("locks options after one answer and gives visible feedback", () => {
    const onAnswer = vi.fn();
    const { rerender } = render(<ExerciseCard exercise={meaningExercise} vocabulary={vocabulary} answer={null} saveState="ready" onAnswer={onAnswer} onAudioFailure={vi.fn()} />);

    expect(screen.getByTestId("exercise-card")).toHaveAttribute("data-exercise-type", "MULTIPLE_CHOICE_MEANING");
    expect(screen.getByTestId("exercise-word")).toHaveTextContent("apple");
    expect(screen.getByText("/ˈæp.əl/")).toBeInTheDocument();
    expect(screen.getByTestId("exercise-prompt")).toHaveTextContent("Chọn nghĩa đúng của từ này.");
    expect(screen.getByTestId("exercise-audio-button")).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "quyển sách" }));
    expect(onAnswer).toHaveBeenCalledTimes(1);
    expect(onAnswer).toHaveBeenCalledWith("MULTIPLE_CHOICE_MEANING:2", {
      type: "MULTIPLE_CHOICE_MEANING",
      answer: "quyển sách"
    });

    const answer = { optionId: "MULTIPLE_CHOICE_MEANING:2", result: "FORGOTTEN" as const };
    rerender(<ExerciseCard exercise={meaningExercise} vocabulary={vocabulary} answer={answer} saveState="feedback" onAnswer={onAnswer} onAudioFailure={vi.fn()} />);
    expect(screen.getByText("Chưa đúng.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "quả táo" })).toHaveClass("is-correct");
    expect(screen.getByRole("button", { name: "quyển sách" })).toBeDisabled();
    expect(onAnswer).toHaveBeenCalledTimes(1);
  });

  it("disables optional pronunciation audio while loading and after an audio error", async () => {
    const withAudio = { ...vocabulary, audioUrl: "/audio/apple.mp3" };
    let resolvePlay!: () => void;
    const pendingPlay = new Promise<void>((resolve) => { resolvePlay = resolve; });
    audioMock(vi.fn(() => pendingPlay));
    const { unmount } = render(<ExerciseCard exercise={meaningExercise} vocabulary={withAudio} answer={null} saveState="ready" onAnswer={vi.fn()} onAudioFailure={vi.fn()} />);
    const button = screen.getByTestId("exercise-audio-button");
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(button).toBeDisabled();
    resolvePlay();
    unmount();

    audioMock(vi.fn().mockRejectedValue(new Error("media failed")));
    render(<ExerciseCard exercise={meaningExercise} vocabulary={withAudio} answer={null} saveState="ready" onAnswer={vi.fn()} onAudioFailure={vi.fn()} />);
    fireEvent.click(screen.getByTestId("exercise-audio-button"));
    await waitFor(() => expect(screen.getByTestId("exercise-audio-button")).toBeDisabled());
  });

  it("does not reveal the target word in the listening prompt and exposes an accessible audio control", () => {
    audioMock();
    render(<ExerciseCard exercise={listeningExercise} vocabulary={vocabulary} answer={null} saveState="ready" onAnswer={vi.fn()} onAudioFailure={vi.fn()} />);

    expect(screen.getByTestId("exercise-prompt")).not.toHaveTextContent("apple");
    expect(screen.getByTestId("exercise-audio-button")).toHaveAccessibleName("Nghe phát âm");
    expect(screen.getByRole("button", { name: "apple" })).toBeInTheDocument();
  });

  it("reports broken audio for a parent fallback without creating a review", async () => {
    const failedPlay = vi.fn().mockRejectedValue(new Error("media failed"));
    audioMock(failedPlay);
    const onAudioFailure = vi.fn();
    render(<ExerciseCard exercise={listeningExercise} vocabulary={vocabulary} answer={null} saveState="ready" onAnswer={vi.fn()} onAudioFailure={onAudioFailure} />);

    fireEvent.click(screen.getByTestId("exercise-audio-button"));
    await waitFor(() => expect(onAudioFailure).toHaveBeenCalledTimes(1));
    expect(screen.queryByText("Chưa đúng.")).not.toBeInTheDocument();
  });

  it("renders a neutral image prompt and reports a broken image without answering", () => {
    const onImageFailure = vi.fn();
    render(<ExerciseCard exercise={imageExercise} vocabulary={vocabulary} answer={null} saveState="ready" onAnswer={vi.fn()} onAudioFailure={vi.fn()} onImageFailure={onImageFailure} />);

    expect(screen.getByTestId("exercise-image")).toHaveAttribute("alt", "Hình ảnh gợi ý cho bài tập từ vựng");
    expect(screen.getByTestId("exercise-prompt")).not.toHaveTextContent("apple");
    fireEvent.error(screen.getByTestId("exercise-image"));
    expect(onImageFailure).toHaveBeenCalledTimes(1);
  });

  it("submits raw typing evidence once and locks the input after submit", () => {
    const onAnswer = vi.fn();
    const { rerender } = render(<ExerciseCard exercise={typingExercise} vocabulary={vocabulary} answer={null} saveState="ready" onAnswer={onAnswer} onAudioFailure={vi.fn()} />);

    expect(screen.getByTestId("exercise-prompt")).not.toHaveTextContent("apple");
    expect(screen.getByTestId("exercise-cue")).toHaveTextContent("quả táo");
    fireEvent.change(screen.getByLabelText("Từ tiếng Anh"), { target: { value: " ＡＰＰＬＥ " } });
    fireEvent.submit(screen.getByRole("button", { name: "Gửi câu trả lời" }).closest("form")!);
    expect(onAnswer).toHaveBeenCalledWith(TYPE_WORD_SUBMISSION, { type: "TYPE_WORD", answer: " ＡＰＰＬＥ " });

    rerender(<ExerciseCard exercise={typingExercise} vocabulary={vocabulary} answer={{ optionId: TYPE_WORD_SUBMISSION, result: "REMEMBERED" }} saveState="feedback" onAnswer={onAnswer} onAudioFailure={vi.fn()} />);
    expect(screen.getByLabelText("Từ tiếng Anh")).toBeDisabled();
    expect(onAnswer).toHaveBeenCalledTimes(1);
  });

  it("submits a spelling error for server-side verification", () => {
    const onAnswer = vi.fn();
    render(<ExerciseCard exercise={typingExercise} vocabulary={vocabulary} answer={null} saveState="ready" onAnswer={onAnswer} onAudioFailure={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Từ tiếng Anh"), { target: { value: "aple" } });
    fireEvent.submit(screen.getByRole("button", { name: "Gửi câu trả lời" }).closest("form")!);
    expect(onAnswer).toHaveBeenCalledWith(TYPE_WORD_SUBMISSION, { type: "TYPE_WORD", answer: "aple" });
  });
});
