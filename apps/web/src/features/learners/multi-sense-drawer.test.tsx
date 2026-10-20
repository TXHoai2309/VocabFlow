import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { MultiSenseDrawer } from "./multi-sense-drawer";
import type { GroupedVocabularyItem } from "./grouped-vocabulary";
import type { LearnerVocabularyBrowseItem } from "@vocabflow/contracts";

function mockBrowseItem(id: number, word: string, partOfSpeech: string, vietnamese: string): LearnerVocabularyBrowseItem {
  return {
    id,
    word,
    ipa: "/əˈbjuːs/",
    vietnamese,
    imageUrl: "/mock-abuse.jpg",
    audioUrl: "/mock-abuse.mp3",
    topic: null,
    level: "GENERAL",
    enabled: true,
    contentVersion: 1,
    status: "NEW",
    nextReviewDate: null,
    partOfSpeech
  };
}

describe("MultiSenseDrawer", () => {
  const mockGroup: GroupedVocabularyItem = {
    headword: "abuse",
    primaryItem: mockBrowseItem(29304, "abuse", "VERB", "đối xử tàn nhẫn"),
    senses: [
      mockBrowseItem(29304, "abuse", "VERB", "đối xử tàn nhẫn hoặc gây tổn hại"),
      mockBrowseItem(29308, "abuse", "VERB", "sử dụng quyền lực sai mục đích"),
      mockBrowseItem(29303, "abuse", "NOUN", "sự đối xử tàn nhẫn hoặc gây hại"),
      mockBrowseItem(29307, "abuse", "NOUN", "việc sử dụng quyền hạn sai mục đích")
    ],
    partOfSpeechLabels: ["Động từ", "Danh từ"],
    senseCount: 4
  };

  it("renders nothing when group is null", () => {
    const { container } = render(
      <MemoryRouter>
        <MultiSenseDrawer
          group={null}
          onClose={vi.fn()}
          savedIds={new Set()}
          savingIds={new Set()}
          bookmarkDisabled={false}
        />
      </MemoryRouter>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders headword, sense count, IPA, and groups senses by part of speech", () => {
    render(
      <MemoryRouter>
        <MultiSenseDrawer
          group={mockGroup}
          onClose={vi.fn()}
          savedIds={new Set()}
          savingIds={new Set()}
          bookmarkDisabled={false}
        />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "abuse" })).toBeInTheDocument();
    expect(screen.getByText("4 nét nghĩa")).toBeInTheDocument();
    expect(screen.getByText("/əˈbjuːs/")).toBeInTheDocument();

    // Senses grouped by part of speech
    expect(screen.getByText("Động từ")).toBeInTheDocument();
    expect(screen.getByText("Danh từ")).toBeInTheDocument();

    // Senses listed
    expect(screen.getByTestId("drawer-sense-29304")).toBeInTheDocument();
    expect(screen.getByTestId("drawer-sense-29308")).toBeInTheDocument();
    expect(screen.getByTestId("drawer-sense-29303")).toBeInTheDocument();
    expect(screen.getByTestId("drawer-sense-29307")).toBeInTheDocument();
  });

  it("triggers onClose when close button is clicked or Escape is pressed", () => {
    const onClose = vi.fn();
    render(
      <MemoryRouter>
        <MultiSenseDrawer
          group={mockGroup}
          onClose={onClose}
          savedIds={new Set()}
          savingIds={new Set()}
          bookmarkDisabled={false}
        />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByTestId("multi-sense-drawer-close"));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("allows saving an individual sense", () => {
    const onToggleSaved = vi.fn();
    render(
      <MemoryRouter>
        <MultiSenseDrawer
          group={mockGroup}
          onClose={vi.fn()}
          savedIds={new Set([29304])}
          savingIds={new Set()}
          bookmarkDisabled={false}
          onToggleSaved={onToggleSaved}
        />
      </MemoryRouter>
    );

    const bookmarkButtons = screen.getAllByRole("button", { name: /nghĩa này/i });
    expect(bookmarkButtons).toHaveLength(4);

    fireEvent.click(bookmarkButtons[1]);
    expect(onToggleSaved).toHaveBeenCalledWith(mockGroup.senses[1]);
  });
});
