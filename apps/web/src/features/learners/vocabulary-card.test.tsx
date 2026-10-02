import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { VocabularyCard, type VocabularyCardItem } from "./vocabulary-card";
import { usePronunciationAudio } from "../study/pronunciation-audio";

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

  it.each(["loading", "error"] as const)("disables audio while playback is %s", (state) => {
    setupAudio(state);
    renderCard();

    expect(screen.getByRole("button", { name: "Nghe phát âm apple" })).toBeDisabled();
    expect(screen.getByText("Đang học")).toBeInTheDocument();
  });

  it("disables audio when the vocabulary has no available audio URL", () => {
    setupAudio("idle", false);
    renderCard();

    expect(screen.getByRole("button", { name: "Nghe phát âm apple" })).toBeDisabled();
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
