import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { VocabularyCard, type VocabularyCardItem } from "./vocabulary-card";
import { usePronunciationAudio } from "../study/pronunciation-audio";
import { shortMeaningV2OfflineFixtures } from "../vocabulary/short-meaning-v2-offline-fixtures";

vi.mock("../study/pronunciation-audio", () => ({ usePronunciationAudio: vi.fn() }));

const item: VocabularyCardItem = {
  id: 1,
  word: "apple",
  ipa: "/ˈæp.əl/",
  vietnamese: "quả táo",
  imageUrl: null,
  audioUrl: "/audio/apple.mp3",
  level: "GRADE_1",
  topic: "Hoa quả",
  status: "LEARNING"
};

function setupAudio(state: "idle" | "loading" | "playing" | "ended" | "error", hasAudio = true) {
  const play = vi.fn();
  const pause = vi.fn();
  vi.mocked(usePronunciationAudio).mockReturnValue({ hasAudio, state, word: item.word, play, pause });
  return { play, pause };
}

function PathProbe() {
  const location = useLocation();
  return <output data-testid="card-test-path">{location.pathname}</output>;
}

function renderCard(showStatus = true) {
  return render(<MemoryRouter initialEntries={["/"]}><PathProbe /><ul><VocabularyCard item={item} showStatus={showStatus} /></ul></MemoryRouter>);
}

describe("VocabularyCard shared UI", () => {
  beforeEach(() => vi.clearAllMocks());

  it("disables audio while playback is loading", () => {
    setupAudio("loading");
    renderCard();

    expect(screen.getByRole("button", { name: "Nghe phát âm apple" })).toBeDisabled();
    expect(screen.getByText("Đang học")).toBeInTheDocument();
  });

  it("replaces a failed player control with a non-interactive status", () => {
    setupAudio("error");
    renderCard();

    expect(screen.queryByRole("button", { name: /phát âm apple/i })).not.toBeInTheDocument();
    expect(screen.getByText("Âm thanh không khả dụng")).toHaveAttribute("role", "status");
  });

  it("does not render an audio button without a usable source", () => {
    setupAudio("idle", false);
    renderCard();

    expect(screen.queryByRole("button", { name: "Nghe phát âm apple" })).not.toBeInTheDocument();
  });

  it("labels the Vietnamese gloss, POS and inferred topics for learners", () => {
    setupAudio("idle", false);
    render(<MemoryRouter><ul><VocabularyCard item={{
      ...item,
      partOfSpeech: "NOUN",
      tags: ["topic-inferred:travel"]
    }} showTopic /></ul></MemoryRouter>);

    expect(screen.getByText("Giải thích nghĩa")).toBeInTheDocument();
    expect(screen.getByText("/ˈæp.əl/ · Danh từ")).toBeInTheDocument();
    expect(screen.getByText("Chủ đề · Du lịch")).toBeInTheDocument();
    expect(screen.queryByText("topic-inferred:travel")).not.toBeInTheDocument();
  });

  it("shows a named image fallback after a broken image URL", () => {
    setupAudio("idle", false);
    const { container } = render(<MemoryRouter><ul><VocabularyCard item={{ ...item, imageUrl: "/broken.jpg" }} /></ul></MemoryRouter>);
    fireEvent.error(container.querySelector("img")!);

    expect(screen.getByRole("img", { name: "Ảnh minh họa apple chưa tải được" })).toBeInTheDocument();
    expect(container.querySelector(".vocabulary-card-thumbnail")).not.toBeInTheDocument();
    expect(container.querySelector(".vocabulary-card-image-fallback")).toBeInTheDocument();
  });

  it("omits the image area entirely when there is no image URL", () => {
    setupAudio("idle", false);
    const { container } = renderCard();

    expect(container.querySelector(".vocabulary-card-thumbnail")).not.toBeInTheDocument();
    expect(container.querySelector(".vocabulary-card-image-fallback")).not.toBeInTheDocument();
    expect(container.querySelector(".vocabulary-card")).toHaveClass("is-text-first");
    expect(screen.queryByRole("img", { name: /hình minh họa/i })).not.toBeInTheDocument();
  });

  it("resets an image failure when the card identity or URL changes", () => {
    setupAudio("idle", false);
    const { container, rerender } = render(<MemoryRouter><ul><VocabularyCard item={{ ...item, imageUrl: "/broken.jpg" }} /></ul></MemoryRouter>);
    fireEvent.error(container.querySelector("img")!);
    expect(container.querySelector(".vocabulary-card-image-fallback")).toBeInTheDocument();

    rerender(<MemoryRouter><ul><VocabularyCard item={{ ...item, id: 2, word: "pear", imageUrl: "/pear.jpg" }} /></ul></MemoryRouter>);
    expect(container.querySelector(".vocabulary-card-thumbnail img")).toHaveAttribute("src", "/pear.jpg");
    expect(container.querySelector(".vocabulary-card-image-fallback")).not.toBeInTheDocument();
  });

  it("uses only a verified short meaning and otherwise shows the full Sense explanation", () => {
    setupAudio("idle", false);
    const { rerender } = render(<MemoryRouter><ul><VocabularyCard item={{ ...item, sourceMeaningVi: " nghĩa ngắn " }} /></ul></MemoryRouter>);
    expect(screen.getByText("quả táo")).toBeInTheDocument();
    expect(screen.queryByText("nghĩa ngắn")).not.toBeInTheDocument();

    rerender(<MemoryRouter><ul><VocabularyCard item={{ ...item, shortMeaningVi: "quả táo", shortMeaningStatus: "VERIFIED" }} /></ul></MemoryRouter>);
    expect(screen.getByText("Nghĩa tiếng Việt")).toBeInTheDocument();
    expect(screen.getByText("quả táo")).toBeInTheDocument();

    rerender(<MemoryRouter><ul><VocabularyCard item={{ ...item, sourceMeaningVi: "   " }} /></ul></MemoryRouter>);
    expect(screen.getByText("quả táo")).toBeInTheDocument();
  });

  it("renders the offline PASS banana gloss from the exact V2 Sense fixture", () => {
    setupAudio("idle", false);
    const fixture = shortMeaningV2OfflineFixtures.banana;
    render(<MemoryRouter><ul><VocabularyCard item={fixture.vocabulary} /></ul></MemoryRouter>);

    expect(fixture.proposalIdentity).toBe("EDITORIAL_2H2B:banana:fruit");
    expect(fixture.vocabulary.contentHash).toBe(fixture.contentHash);
    expect(screen.getByText("Nghĩa tiếng Việt")).toBeInTheDocument();
    expect(screen.getByText("quả chuối")).toBeInTheDocument();
    expect(screen.getByText(/Giải thích: quả chuối dài/)).toBeInTheDocument();
  });

  it("reuses the audio playback hook when audio is available", () => {
    const { play } = setupAudio("idle");
    renderCard();

    fireEvent.click(screen.getByRole("button", { name: "Nghe phát âm apple" }));
    expect(play).toHaveBeenCalledOnce();
    expect(screen.getByTestId("card-test-path")).toHaveTextContent("/");
    expect(screen.getByRole("link", { name: /apple.*quả táo.*xem chi tiết/i })).toHaveAttribute("href", "/vocabulary/1");
  });
});
