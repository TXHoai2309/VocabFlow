import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import type { VocabularyDto } from "@vocabflow/contracts";
import { Flashcard } from "./flashcard";

const vocabulary: VocabularyDto = {
  id: 1,
  word: "power",
  ipa: "/ˈpaʊər/",
  vietnamese: "sức mạnh; quyền lực",
  definitionEn: "the ability to control or influence",
  exampleEn: "Power can be shared.",
  imageUrl: "/images/power.jpg",
  audioUrl: "/audio/power.mp3",
  topic: "people",
  level: null,
  enabled: true,
  contentVersion: 1
};

describe("US-11 Flashcard back state", () => {
  it("renders only the allowed front content and no answer-bearing DOM", () => {
    render(<Flashcard vocabulary={vocabulary} isFlipped={false} onFlip={vi.fn()} />);

    expect(screen.getByTestId("flashcard")).toHaveClass("flashcard");
    expect(screen.getByTestId("flashcard").querySelector(".flashcard-front")).toBeInTheDocument();
    expect(screen.getByText("power")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nghe phát âm power" })).toBeInTheDocument();
    expect(screen.queryByText("sức mạnh; quyền lực")).not.toBeInTheDocument();
    expect(screen.getByText("/ˈpaʊər/")).toBeInTheDocument();
    expect(screen.queryByText("the ability to control or influence")).not.toBeInTheDocument();
    expect(screen.queryByText("Power can be shared.")).not.toBeInTheDocument();
    expect(screen.queryByText("people")).not.toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByTestId("flashcard").querySelector(".flashcard-back")).not.toBeInTheDocument();
  });

  it("reveals meaning and optional content only after flip", () => {
    const onFlip = vi.fn();
    const { rerender } = render(<Flashcard vocabulary={vocabulary} isFlipped={false} onFlip={onFlip} />);

    fireEvent.click(screen.getByRole("button", { name: "Lật để xem nghĩa" }));
    expect(onFlip).toHaveBeenCalledTimes(1);

    rerender(<Flashcard vocabulary={vocabulary} isFlipped onFlip={onFlip} />);
    expect(screen.getByTestId("flashcard").querySelector(".flashcard-back")).toBeInTheDocument();
    expect(screen.getByText("Nghĩa tiếng Việt")).toBeInTheDocument();
    expect(screen.getByText("sức mạnh; quyền lực")).toBeInTheDocument();
    expect(screen.getByText("/ˈpaʊər/")).toBeInTheDocument();
    expect(screen.getByText("the ability to control or influence")).toBeInTheDocument();
    expect(screen.getByText("Power can be shared.")).toBeInTheDocument();
    expect(screen.getByText("people")).toBeInTheDocument();
    expect(screen.getByTestId("flashcard").querySelector(".flashcard-image"))
      .toHaveAttribute("src", "/images/power.jpg");
    expect(screen.getByTestId("flashcard").querySelector(".flashcard-image"))
      .toHaveAttribute("alt", "Minh họa cho power");
  });

  it("omits absent optional content and uses a compact image fallback", () => {
    const sparseVocabulary: VocabularyDto = {
      ...vocabulary,
      ipa: null,
      definitionEn: "",
      exampleEn: null,
      imageUrl: null,
      audioUrl: null,
      topic: null
    };

    render(<Flashcard vocabulary={sparseVocabulary} isFlipped onFlip={vi.fn()} />);

    expect(screen.getByText("sức mạnh; quyền lực")).toBeInTheDocument();
    expect(screen.queryByText("/ˈpaʊər/")).not.toBeInTheDocument();
    expect(screen.queryByText("the ability to control or influence")).not.toBeInTheDocument();
    expect(screen.queryByText("Power can be shared.")).not.toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /hình minh họa/i })).not.toBeInTheDocument();
    expect(screen.queryByText("Chưa có hình minh họa")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Nghe phát âm power" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Phát âm thanh" })).not.toBeInTheDocument();
  });

  it("renders a structured English-Vietnamese example as two labeled lines", () => {
    const { container } = render(<Flashcard vocabulary={{
      ...vocabulary,
      exampleEn: null,
      examples: [{ en: "I recognized her regional accent immediately.", vi: "Tôi nhận ra ngay giọng vùng miền của cô ấy." }]
    }} isFlipped onFlip={vi.fn()} />);

    const english = screen.getByText("I recognized her regional accent immediately.");
    const vietnamese = screen.getByText("Tôi nhận ra ngay giọng vùng miền của cô ấy.");
    expect(english.closest(".flashcard-example-line")).toHaveTextContent("EN");
    expect(vietnamese.closest(".flashcard-example-line")).toHaveTextContent("VI");
    expect(english.closest(".flashcard-example-line")).not.toBe(vietnamese.closest(".flashcard-example-line"));
    expect(container.querySelectorAll(".flashcard-example-line")).toHaveLength(2);
  });

  it("plays an example clip only when the matching example includes its URL, outside the flip control", () => {
    const exampleUrl = "https://res.cloudinary.com/vocabflow/video/authenticated/s--Exmpl_12--/Vocab/v2/audio/example.mp3";
    const onFlip = vi.fn();
    const { container } = render(<Flashcard vocabulary={{
      ...vocabulary,
      exampleEn: null,
      examples: [{ exampleKey: "power-example-1", en: "Power can be shared.", audioUrl: exampleUrl }]
    }} isFlipped onFlip={onFlip} />);

    expect(container.querySelector("audio.vocabulary-example-audio-control")).toHaveAttribute("src", exampleUrl);
    expect(container.querySelector("audio.vocabulary-example-audio-control")).toHaveAttribute("preload", "none");
    expect(container.querySelector("audio.vocabulary-example-audio-control")?.closest("button")).toBeNull();
    fireEvent.click(container.querySelector("audio.vocabulary-example-audio-control")!);
    expect(onFlip).not.toHaveBeenCalled();
  });

  it("keeps the about adverb Sense meaning and example separate from the preposition Sense", () => {
    const about = {
      ...vocabulary,
      id: 29285,
      word: "about",
      ipa: "/əˈbaʊt/",
      partOfSpeech: "ADVERB",
      vietnamese: "quanh quẩn hoặc ở nhiều chỗ trong một khu vực gần đó",
      definitionEn: "In various places within or near an area.",
      exampleEn: "The children wandered about while we packed the bags.",
      examples: [{ en: "The children wandered about while we packed the bags.", vi: "Bọn trẻ đi quanh quẩn trong lúc chúng tôi xếp đồ vào túi." }]
    } satisfies VocabularyDto;
    render(<Flashcard vocabulary={about} isFlipped onFlip={vi.fn()} />);

    expect(screen.getByText("/əˈbaʊt/ · Trạng từ")).toBeInTheDocument();
    expect(screen.getByText("quanh quẩn hoặc ở nhiều chỗ trong một khu vực gần đó")).toBeInTheDocument();
    expect(screen.getByText("In various places within or near an area.")).toBeInTheDocument();
    expect(screen.getByText("The children wandered about while we packed the bags.")).toBeInTheDocument();
    expect(screen.getByText("Bọn trẻ đi quanh quẩn trong lúc chúng tôi xếp đồ vào túi.")).toBeInTheDocument();
    expect(screen.queryByText("về một chủ đề hoặc vấn đề")).not.toBeInTheDocument();
  });

  it("prioritizes a supplied source meaning without replacing the identity-specific Sense meaning", () => {
    render(<Flashcard vocabulary={{ ...vocabulary, sourceMeaningVi: "nghĩa nguồn ngắn" }} isFlipped onFlip={vi.fn()} />);

    expect(screen.getByText("nghĩa nguồn ngắn")).toBeInTheDocument();
  });

  it("does not expose a quarantined teacher poster image or its printed answer text", () => {
    render(<Flashcard
      vocabulary={{ ...vocabulary, word: "teacher", vietnamese: "giáo viên", imageUrl: null }}
      isFlipped
      onFlip={vi.fn()}
    />);

    expect(screen.queryByRole("img", { name: /hình minh họa/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/A TEACHER/i)).not.toBeInTheDocument();
  });

  it("supports Space flip and preserves responsive/accessibility structure", () => {
    const onFlip = vi.fn();
    render(<Flashcard vocabulary={vocabulary} isFlipped={false} onFlip={onFlip} />);
    const flip = screen.getByRole("button", { name: "Lật để xem nghĩa" });

    expect(flip).toHaveClass("flashcard-flip");
    expect(screen.getByTestId("flashcard").querySelector(".flashcard-face")).toHaveClass("flashcard-front");
    fireEvent.keyDown(flip, { key: " " });
    expect(onFlip).toHaveBeenCalledTimes(1);
  });

  it("hides failed optional image content without affecting the back", () => {
    const { container } = render(<Flashcard vocabulary={vocabulary} isFlipped onFlip={vi.fn()} />);

    const image = container.querySelector(".flashcard-image");
    expect(image).toBeInTheDocument();
    fireEvent.error(image!);
    expect(container.querySelector(".flashcard-image")).not.toBeInTheDocument();
    expect(screen.getByText("Ảnh minh họa chưa tải được.")).toHaveAttribute("role", "status");
    expect(screen.getByText("sức mạnh; quyền lực")).toBeInTheDocument();
  });

  it("does not put the word pronunciation control inside the flip button", () => {
    const onFlip = vi.fn();
    render(<Flashcard vocabulary={vocabulary} isFlipped={false} onFlip={onFlip} />);
    const audioButton = screen.getByRole("button", { name: "Nghe phát âm power" });
    expect(audioButton.closest(".flashcard-flip")).toBeNull();
    fireEvent.click(audioButton);
    expect(onFlip).not.toHaveBeenCalled();
  });
});

type MockAudio = {
  audio: HTMLAudioElement;
  play: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  emit: (type: string) => void;
};

function createMockAudio(): MockAudio {
  const listeners = new Map<string, Set<EventListener>>();
  const play = vi.fn().mockResolvedValue(undefined);
  const pause = vi.fn();
  const audio = {
    src: "",
    preload: "",
    currentTime: 0,
    play,
    pause,
    load: vi.fn(),
    addEventListener(type: string, listener: EventListener) {
      const handlers = listeners.get(type) ?? new Set<EventListener>();
      handlers.add(listener);
      listeners.set(type, handlers);
    },
    removeEventListener(type: string, listener: EventListener) {
      listeners.get(type)?.delete(listener);
    }
  } as unknown as HTMLAudioElement;

  return {
    audio,
    play,
    pause,
    emit: (type) => listeners.get(type)?.forEach((listener) => listener(new Event(type)))
  };
}

function stubAudio(...mocks: MockAudio[]) {
  let index = 0;
  const AudioMock = vi.fn(function AudioMock() {
    return mocks[index++]?.audio ?? createMockAudio().audio;
  });
  vi.stubGlobal("Audio", AudioMock);
  return AudioMock;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("US-12 pronunciation audio", () => {
  it("uses audioUrl, plays a valid pronunciation and supports replay after ended", async () => {
    const mock = createMockAudio();
    const AudioMock = stubAudio(mock);
    render(<Flashcard vocabulary={vocabulary} isFlipped={false} onFlip={vi.fn()} />);

    const button = screen.getByRole("button", { name: "Nghe phát âm power" });
    expect(button).toHaveAttribute("type", "button");
    fireEvent.click(button);

    await waitFor(() => expect(mock.play).toHaveBeenCalledTimes(1));
    expect(AudioMock).toHaveBeenCalledTimes(1);
    expect(mock.audio.src).toBe("/audio/power.mp3");
    expect(button).toHaveAttribute("data-audio-state", "playing");

    mock.emit("ended");
    await waitFor(() => expect(screen.getByRole("button", { name: "Nghe lại phát âm power" })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Nghe lại phát âm power" }));
    await waitFor(() => expect(mock.play).toHaveBeenCalledTimes(2));
    expect(mock.audio.currentTime).toBe(0);
  });

  it("shows loading and prevents duplicate play requests until playback starts", async () => {
    const mock = createMockAudio();
    let resolvePlay!: () => void;
    mock.play.mockImplementation(() => new Promise<void>((resolve) => {
      resolvePlay = resolve;
    }));
    stubAudio(mock);
    render(<Flashcard vocabulary={vocabulary} isFlipped={false} onFlip={vi.fn()} />);

    const button = screen.getByRole("button", { name: "Nghe phát âm power" });
    fireEvent.click(button);
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("data-audio-state", "loading");
    fireEvent.click(button);
    expect(mock.play).toHaveBeenCalledTimes(1);

    resolvePlay();
    await waitFor(() => expect(button).toHaveAttribute("data-audio-state", "playing"));
  });

  it("stops the previous audio before starting another vocabulary", async () => {
    const first = createMockAudio();
    const second = createMockAudio();
    stubAudio(first, second);
    render(
      <>
        <Flashcard vocabulary={vocabulary} isFlipped={false} onFlip={vi.fn()} />
        <Flashcard vocabulary={{ ...vocabulary, id: 2, word: "book", audioUrl: "/audio/book.mp3" }} isFlipped={false} onFlip={vi.fn()} />
      </>
    );

    fireEvent.click(screen.getByRole("button", { name: "Nghe phát âm power" }));
    await waitFor(() => expect(first.play).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "Nghe phát âm book" }));
    await waitFor(() => expect(second.play).toHaveBeenCalledTimes(1));

    expect(first.pause).toHaveBeenCalledTimes(1);
    expect(first.audio.currentTime).toBe(0);
    expect(second.play).toHaveBeenCalledTimes(1);
  });

  it("stops active audio on unmount and keeps flip available after playback error", async () => {
    const mock = createMockAudio();
    mock.play.mockRejectedValue(new Error("blocked"));
    stubAudio(mock);
    const onFlip = vi.fn();
    const { unmount } = render(<Flashcard vocabulary={vocabulary} isFlipped={false} onFlip={onFlip} />);

    fireEvent.click(screen.getByRole("button", { name: "Nghe phát âm power" }));
    expect(await screen.findByText("Âm thanh không khả dụng.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /phát âm power/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Lật để xem nghĩa" }));
    expect(onFlip).toHaveBeenCalledTimes(1);
    unmount();
    expect(mock.pause).toHaveBeenCalled();
  });

  it("hides missing audio, including an empty URL, and never uses SpeechSynthesis", () => {
    const speak = vi.fn();
    vi.stubGlobal("speechSynthesis", { speak });
    const { unmount } = render(<Flashcard vocabulary={{ ...vocabulary, audioUrl: null }} isFlipped={false} onFlip={vi.fn()} />);
    expect(screen.queryByTestId("flashcard-audio-control")).not.toBeInTheDocument();
    unmount();

    render(<Flashcard vocabulary={{ ...vocabulary, audioUrl: "" }} isFlipped={false} onFlip={vi.fn()} />);
    expect(screen.queryByTestId("flashcard-audio-control")).not.toBeInTheDocument();
    expect(speak).not.toHaveBeenCalled();
  });
});
