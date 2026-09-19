import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { ActiveLearnerProvider } from "../learners/learner-context-provider";
import { LearnerLearningSetsPage } from "./learner-learning-sets-page";
import { LearningSetDetailPage, LearningSetsPage } from "./learning-sets-page";

const learningSet = {
  id: 1,
  slug: "starter-vocabulary",
  name: "VocabFlow Starter",
  description: "The original starter words.",
  grade: null,
  enabled: true,
  sortOrder: 10,
  vocabularyCount: 1
};

const learner = {
  id: "00000000-0000-4000-8000-000000000010",
  householdId: "00000000-0000-4000-8000-000000000001",
  displayName: "An",
  avatarKey: null,
  enabled: true,
  createdAt: "2026-09-10T00:00:00.000Z",
  updatedAt: "2026-09-10T00:00:00.000Z"
};

describe("US-28/29 learning set UI", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("loads a catalog and ordered detail vocabulary", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ learningSets: [learningSet] }), { status: 200 }));
    render(<MemoryRouter initialEntries={["/learning-sets"]}><Routes><Route path="/learning-sets" element={<LearningSetsPage />} /></Routes></MemoryRouter>);
    expect(await screen.findByTestId("learning-sets-list")).toHaveTextContent("VocabFlow Starter");
    expect(fetchMock).toHaveBeenCalledWith("/api/learning-sets", { credentials: "include" });
    cleanup();
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ learningSet: {
        ...learningSet,
        items: [{ sortOrder: 0, vocabulary: {
          id: 1, word: "apple", ipa: null, vietnamese: "quả táo", definitionEn: null,
          exampleEn: null, imageUrl: null, audioUrl: null, topic: null, level: null, enabled: true, contentVersion: 1
        } }]
      } }), { status: 200 }));
    render(<MemoryRouter initialEntries={["/learning-sets/1"]}><Routes><Route path="/learning-sets/:learningSetId" element={<LearningSetDetailPage />} /></Routes></MemoryRouter>);
    expect(await screen.findByTestId("learning-set-detail-items")).toHaveTextContent("apple");
  });

  it("shows current assignment and refreshes only the selected toggle after save", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ learningSets: [{ learningSet, active: false }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ learnerId: learner.id, learningSetId: 1, active: true }), { status: 200 }));
    render(<ActiveLearnerProvider initialLearner={learner}><MemoryRouter initialEntries={["/learning-sets/assign"]}><Routes><Route path="/learning-sets/assign" element={<LearnerLearningSetsPage />} /></Routes></MemoryRouter></ActiveLearnerProvider>);
    const button = await screen.findByRole("button", { name: "Gán bộ từ" });
    fireEvent.click(button);
    expect(await screen.findByRole("button", { name: "Đã gán" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenNthCalledWith(2, `/api/learners/${learner.id}/learning-sets/1`, { method: "PUT", credentials: "include" });
  });
});
