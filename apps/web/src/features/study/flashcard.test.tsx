import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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
  enabled: true,
  contentVersion: 1
};

describe("US-10 reusable Flashcard", () => {
  it("renders only the allowed front content and no answer-bearing DOM", () => {
    render(<Flashcard vocabulary={vocabulary} isFlipped={false} onFlip={vi.fn()} />);

    expect(screen.getByTestId("flashcard")).toHaveClass("flashcard");
    expect(screen.getByTestId("flashcard").querySelector(".flashcard-front")).toBeInTheDocument();
    expect(screen.getByText("power")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Phát âm thanh" })).toBeInTheDocument();
    expect(screen.queryByText("sức mạnh; quyền lực")).not.toBeInTheDocument();
    expect(screen.queryByText("/ˈpaʊər/")).not.toBeInTheDocument();
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
    expect(screen.getByText("sức mạnh; quyền lực")).toBeInTheDocument();
    expect(screen.getByText("/ˈpaʊər/")).toBeInTheDocument();
    expect(screen.getByText("the ability to control or influence")).toBeInTheDocument();
    expect(screen.getByText("Power can be shared.")).toBeInTheDocument();
    expect(screen.getByText("people")).toBeInTheDocument();
    expect(screen.getByTestId("flashcard").querySelector(".flashcard-image")).toHaveAttribute("src", "/images/power.jpg");
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
    expect(screen.getByText("sức mạnh; quyền lực")).toBeInTheDocument();
  });
});
