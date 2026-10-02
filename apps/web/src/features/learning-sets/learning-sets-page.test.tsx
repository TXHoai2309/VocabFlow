import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import type { LearnerDto, LearnerVocabularyDto, VocabularyDto } from "@vocabflow/contracts";
import { ActiveLearnerProvider } from "../learners/learner-context-provider";
import { LearnerLearningSetsPage } from "./learner-learning-sets-page";
import { LearningSetDetailPage, LearningSetsPage } from "./learning-sets-page";

const learner: LearnerDto = {
  id: "00000000-0000-4000-8000-000000000010",
  householdId: "00000000-0000-4000-8000-000000000001",
  displayName: "An",
  avatarKey: null,
  enabled: true,
  createdAt: "2026-09-10T00:00:00.000Z",
  updatedAt: "2026-09-10T00:00:00.000Z"
};

const learningSet = {
  id: 1,
  slug: "starter-vocabulary",
  name: "Bộ từ khởi đầu VocabFlow",
  description: "Bộ từ khởi đầu giúp người học làm quen với những từ vựng cơ bản.",
  grade: "GRADE_1" as const,
  enabled: true,
  sortOrder: 10,
  vocabularyCount: 2
};

function vocabulary(id: number, word: string): VocabularyDto {
  return {
    id,
    word,
    ipa: `/${word}/`,
    vietnamese: `nghĩa ${word}`,
    definitionEn: null,
    exampleEn: null,
    imageUrl: null,
    audioUrl: null,
    topic: "Food",
    level: "GRADE_1",
    enabled: true,
    contentVersion: 1
  };
}

function learnerVocabulary(item: VocabularyDto, status: LearnerVocabularyDto["status"]): LearnerVocabularyDto {
  return { ...item, status, nextReviewDate: null };
}

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function detailResponse(items: VocabularyDto[]) {
  return {
    learningSet: {
      ...learningSet,
      vocabularyCount: items.length,
      items: items.map((item, index) => ({ sortOrder: index, vocabulary: item }))
    }
  };
}

function mockDetail(
  items: VocabularyDto[],
  statuses: LearnerVocabularyDto[] = items.map((item) => learnerVocabulary(item, "NEW")),
  assigned = true,
  options: { failDetailOnce?: boolean; detailStatus?: number } = {}
) {
  const fetchMock = vi.spyOn(globalThis, "fetch");
  let failDetailOnce = options.failDetailOnce ?? false;
  fetchMock.mockImplementation(async (input) => {
    const path = String(input);
    if (path === `/api/learning-sets/${learningSet.id}`) {
      if (failDetailOnce) {
        failDetailOnce = false;
        throw new Error("offline");
      }
      if (options.detailStatus && options.detailStatus !== 200) {
        return response({ error: { code: options.detailStatus === 404 ? "NOT_FOUND" : "INTERNAL_ERROR" } }, options.detailStatus);
      }
      return response(detailResponse(items));
    }
    if (path === `/api/learners/${learner.id}/vocabulary`) return response({ vocabulary: statuses });
    if (path === `/api/learners/${learner.id}/learning-sets`) {
      return response({ learningSets: [{ learningSet, active: assigned }] });
    }
    return response({ error: { code: "NOT_FOUND" } }, 404);
  });
  return fetchMock;
}

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="current-url">{location.pathname}{location.search}</output>;
}

function ReturnToProbe() {
  const location = useLocation();
  const returnTo = (location.state as { returnTo?: string } | null)?.returnTo;
  return <output data-testid="learner-return-to">{returnTo}</output>;
}

function renderDetail(path = `/learning-sets/${learningSet.id}`, initialLearner: LearnerDto | null = learner) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ActiveLearnerProvider initialLearner={initialLearner}>
        <LocationProbe />
        <Routes>
          <Route path="/learning-sets/:learningSetId" element={<LearningSetDetailPage />} />
          <Route path="/learning-sets/assign" element={<div data-testid="assignment-route">Assign</div>} />
          <Route path="/learning-sets" element={<div data-testid="learning-sets-route">List</div>} />
          <Route path="/learners" element={<ReturnToProbe />} />
          <Route path="/study" element={<div data-testid="study-route">Study</div>} />
          <Route path="/study/setup" element={<div data-testid="study-route">Study Setup</div>} />
          <Route path="/vocabulary/:vocabularyId" element={<div data-testid="vocabulary-route">Vocabulary</div>} />
        </Routes>
      </ActiveLearnerProvider>
    </MemoryRouter>
  );
}

describe("US-28/29 learning set UI", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("loads the catalog", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(response({ learningSets: [learningSet] }));
    render(<MemoryRouter initialEntries={["/learning-sets"]}><Routes><Route path="/learning-sets" element={<LearningSetsPage />} /></Routes></MemoryRouter>);
    expect(await screen.findByTestId("learning-sets-list")).toHaveTextContent("Bộ từ khởi đầu VocabFlow");
    expect(fetchMock).toHaveBeenCalledWith("/api/learning-sets", { credentials: "include" });
  });

  it("renders ordered vocabulary and real partial progress", async () => {
    const items = [vocabulary(1, "apple"), vocabulary(2, "bread")];
    const fetchMock = mockDetail(items, [learnerVocabulary(items[0]!, "MASTERED"), learnerVocabulary(items[1]!, "NEW"), learnerVocabulary(vocabulary(99, "water"), "NEW")]);
    renderDetail();

    expect(await screen.findByRole("heading", { name: learningSet.name })).toBeInTheDocument();
    const list = screen.getByTestId("collection-vocabulary-list");
    expect(list).toHaveTextContent("apple");
    expect(list).toHaveTextContent("bread");
    expect(list).not.toHaveTextContent("water");
    expect(list.querySelectorAll("li")).toHaveLength(2);
    expect(list).toHaveTextContent("Đã học");
    expect(screen.getByTestId("collection-detail-hero")).toHaveTextContent("Lớp 1");
    expect(screen.getByRole("progressbar", { name: `Tiến độ học ${learningSet.name}` })).toHaveAttribute("aria-valuetext", "1 / 2 từ, 50%");
    expect(screen.getByRole("link", { name: "Tiếp tục học" })).toHaveAttribute("href", "/study/setup?learningSetId=1");
    expect(fetchMock).toHaveBeenCalledWith(`/api/learning-sets/${learningSet.id}`, { credentials: "include" });
    expect(fetchMock.mock.calls.every(([, init]) => !init?.method || init.method === "GET")).toBe(true);
  });

  it("offers a study link for a new assigned set", async () => {
    mockDetail([vocabulary(1, "apple")]);
    renderDetail();

    expect(await screen.findByRole("link", { name: "Học bộ này" })).toHaveAttribute("href", "/study/setup?learningSetId=1");
  });

  it("shows zero progress for a set with only new words", async () => {
    const items = [vocabulary(1, "apple")];
    mockDetail(items, [learnerVocabulary(items[0]!, "NEW")]);
    renderDetail();

    expect(await screen.findByRole("progressbar", { name: `Tiến độ học ${learningSet.name}` })).toHaveAttribute("aria-valuetext", "0 / 1 từ, 0%");
  });

  it("offers review again when every set word is mastered", async () => {
    const items = [vocabulary(1, "apple")];
    mockDetail(items, [learnerVocabulary(items[0]!, "MASTERED")]);
    renderDetail();

    expect(await screen.findByRole("link", { name: "Ôn tập lại" })).toHaveAttribute("href", "/study/setup?learningSetId=1");
  });

  it("routes an unassigned set to assignment instead of starting an empty session", async () => {
    mockDetail([vocabulary(1, "apple")], [learnerVocabulary(vocabulary(1, "apple"), "NEW")], false);
    renderDetail();

    fireEvent.click(await screen.findByRole("link", { name: "Gán bộ từ cho người học" }));
    expect(await screen.findByTestId("assignment-route")).toBeInTheDocument();
    expect(screen.getByTestId("current-url")).toHaveTextContent("/learning-sets/assign");
  });

  it("links real vocabulary cards to their existing detail route", async () => {
    mockDetail([vocabulary(42, "apple")]);
    renderDetail();

    fireEvent.click(await screen.findByRole("link", { name: /apple.*nghĩa apple.*xem chi tiết/i }));
    expect(await screen.findByTestId("vocabulary-route")).toBeInTheDocument();
    expect(screen.getByTestId("current-url")).toHaveTextContent("/vocabulary/42");
  });

  it("shows an explicit empty state and disables study for an empty set", async () => {
    mockDetail([]);
    renderDetail();

    expect(await screen.findByTestId("collection-detail-empty")).toHaveTextContent("Chưa có từ vựng trong nội dung này.");
    expect(screen.getByRole("button", { name: "Chưa có từ để học" })).toBeDisabled();
  });

  it("retries an API error and resolves the same detail", async () => {
    mockDetail([vocabulary(1, "apple")], undefined, true, { failDetailOnce: true });
    renderDetail();

    expect(await screen.findByTestId("learning-set-detail-error")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(await screen.findByRole("heading", { name: learningSet.name })).toBeInTheDocument();
  });

  it("shows not-found for an unavailable set", async () => {
    mockDetail([], [], true, { detailStatus: 404 });
    renderDetail();

    expect(await screen.findByTestId("learning-set-detail-not-found")).toHaveTextContent("Bộ từ này hiện không khả dụng.");
  });

  it("preserves the complete returnTo URL when a learner must be selected", async () => {
    renderDetail("/learning-sets/1?from=link", null);
    expect(await screen.findByTestId("learner-return-to")).toHaveTextContent("/learning-sets/1?from=link");
  });

  it("shows current assignment and refreshes only the selected toggle after save", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response({ learningSets: [{ learningSet: { ...learningSet, grade: null, vocabularyCount: 1 }, active: false }] }))
      .mockResolvedValueOnce(response({ learnerId: learner.id, learningSetId: 1, active: true }));
    render(
      <ActiveLearnerProvider initialLearner={learner}>
        <MemoryRouter initialEntries={["/learning-sets/assign"]}>
          <Routes><Route path="/learning-sets/assign" element={<LearnerLearningSetsPage />} /></Routes>
        </MemoryRouter>
      </ActiveLearnerProvider>
    );
    fireEvent.click(await screen.findByRole("button", { name: "Gán bộ từ" }));
    expect(await screen.findByRole("button", { name: "Đã gán" })).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock).toHaveBeenNthCalledWith(2, `/api/learners/${learner.id}/learning-sets/1`, { method: "PUT", credentials: "include" });
  });
});
