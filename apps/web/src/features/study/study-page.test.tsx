import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import type { LearnerDto, VocabularyDto } from "@vocabflow/contracts";
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

const vocabulary: VocabularyDto = {
  id: 1,
  word: "apple",
  ipa: null,
  vietnamese: "quả táo",
  definitionEn: null,
  exampleEn: null,
  imageUrl: null,
  audioUrl: null,
  topic: null,
  enabled: true,
  contentVersion: 1
};

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
        </Routes>
      </ActiveLearnerProvider>
    </MemoryRouter>
  );
}

describe("US-05 first real flashcard", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("loads vocabulary[0] and keeps the Vietnamese meaning off the front", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(response({ vocabulary: [vocabulary] }));
    renderStudy();

    expect(await screen.findByTestId("first-flashcard-ready")).toBeInTheDocument();
    expect(screen.getByText("apple")).toBeInTheDocument();
    expect(screen.queryByText("quả táo")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/vocabulary", { credentials: "include" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("flips by click and exposes the word plus Vietnamese on the back", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(response({ vocabulary: [vocabulary] }));
    renderStudy();
    const card = await screen.findByRole("button", { name: "Lật để xem nghĩa" });

    fireEvent.click(card);

    expect(screen.getByRole("button", { name: "Lật về mặt trước" })).toBeInTheDocument();
    expect(screen.getByText("apple")).toBeInTheDocument();
    expect(screen.getByText("quả táo")).toBeInTheDocument();
  });

  it("prevents Space page scrolling while leaving the flip to the focused button", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(response({ vocabulary: [vocabulary] }));
    renderStudy();
    const card = await screen.findByRole("button", { name: "Lật để xem nghĩa" });

    fireEvent.keyDown(card, { key: " ", code: "Space" });
    expect(screen.getByRole("button", { name: "Lật về mặt trước" })).toBeInTheDocument();
  });

  it("renders the NULL optional-field card without placeholder controls", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(response({ vocabulary: [vocabulary] }));
    renderStudy();
    const card = await screen.findByRole("button", { name: "Lật để xem nghĩa" });

    fireEvent.click(card);

    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.queryByText(/definition|example|audio|image|ipa/i)).not.toBeInTheDocument();
  });

  it("shows loading without fabricating a card and handles an empty response", async () => {
    let resolveRequest: ((value: Response) => void) | undefined;
    vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise((resolve) => {
      resolveRequest = resolve;
    }));
    renderStudy();

    expect(screen.getByTestId("study-loading")).toBeInTheDocument();
    expect(screen.queryByTestId("first-flashcard-ready")).not.toBeInTheDocument();

    resolveRequest?.(response({ vocabulary: [] }));
    expect(await screen.findByTestId("study-empty-state")).toBeInTheDocument();
    expect(screen.queryByTestId("first-flashcard-ready")).not.toBeInTheDocument();
  });

  it("offers a safe retry after an API failure", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response({ error: { code: "INTERNAL_ERROR", message: "secret detail" } }, 503))
      .mockResolvedValueOnce(response({ vocabulary: [vocabulary] }));
    renderStudy();

    expect(await screen.findByRole("alert")).toHaveTextContent("Không thể tải nội dung học lúc này. Vui lòng thử lại.");
    expect(screen.getByRole("alert")).not.toHaveTextContent("secret detail");
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(await screen.findByTestId("first-flashcard-ready")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("handles an authenticated household denial without exposing server details", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      response({ error: { code: "HOUSEHOLD_ACCESS_DENIED", message: "private detail" } }, 403)
    );
    renderStudy();

    expect(await screen.findByRole("alert")).toHaveTextContent("Không thể tiếp tục với learner này. Vui lòng chọn lại learner.");
    expect(screen.getByRole("alert")).not.toHaveTextContent("private detail");
  });

  it("returns to learner resolution when opened without an in-memory learner context", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    renderStudy(null);
    await waitFor(() => expect(screen.getByText("learners-route")).toBeInTheDocument());
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
