import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import type { LearnerDto, LearnerVocabularyDto, VocabularyDto } from "@vocabflow/contracts";
import { ActiveLearnerProvider } from "./learner-context-provider";
import { TopicDetailPage } from "./topics-page";

const learner: LearnerDto = {
  id: "00000000-0000-4000-8000-000000000010",
  householdId: "00000000-0000-4000-8000-000000000001",
  displayName: "An",
  avatarKey: null,
  enabled: true,
  createdAt: "2026-09-10T00:00:00.000Z",
  updatedAt: "2026-09-10T00:00:00.000Z"
};

const topic = { id: 7, slug: "food", name: "Food", description: "Từ vựng về thực phẩm và đồ ăn.", sortOrder: 1, enabled: true };

function vocabulary(id: number, word: string): VocabularyDto {
  return { id, word, ipa: `/${word}/`, vietnamese: `nghĩa ${word}`, definitionEn: null, exampleEn: null, imageUrl: null, audioUrl: null, topic: "Food", level: "GRADE_1", enabled: true, contentVersion: 1 };
}

function learnerVocabulary(id: number, word: string, status: LearnerVocabularyDto["status"]): LearnerVocabularyDto {
  return { ...vocabulary(id, word), status, nextReviewDate: null };
}

function topicProgress(total: number, newCount: number, learningCount: number, masteredCount: number) {
  return { learnerId: learner.id, localDate: "2026-10-02", topics: [{ topicId: topic.id, slug: topic.slug, name: topic.name, total, newCount, learningCount, masteredCount, dueCount: 0 }] };
}

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="current-url">{location.pathname}{location.search}</output>;
}

function LearnerRedirectProbe() {
  const location = useLocation();
  const returnTo = (location.state as { returnTo?: string } | null)?.returnTo;
  return <output data-testid="learner-return-to">{returnTo}</output>;
}

function mockDetail(items: VocabularyDto[], progress = topicProgress(2, 1, 0, 1), statuses: LearnerVocabularyDto[] = [learnerVocabulary(1, "apple", "MASTERED"), learnerVocabulary(2, "bread", "NEW")]) {
  const fetchMock = vi.spyOn(globalThis, "fetch");
  fetchMock.mockImplementation(async (input) => {
    const path = String(input);
    if (path === "/api/topics") return response({ topics: [topic] });
    if (path === `/api/topics/${topic.id}/vocabulary`) return response({ vocabulary: items });
    if (path === `/api/learners/${learner.id}/vocabulary`) return response({ vocabulary: statuses });
    if (path === `/api/learners/${learner.id}/topic-progress`) return response(progress);
    return response({ error: { code: "NOT_FOUND" } }, 404);
  });
  return fetchMock;
}

function renderTopic(path = `/topics/${topic.id}`, initialLearner: LearnerDto | null = learner) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ActiveLearnerProvider initialLearner={initialLearner}>
        <LocationProbe />
        <Routes>
          <Route path="/topics/:topicId" element={<TopicDetailPage />} />
          <Route path="/learners" element={<LearnerRedirectProbe />} />
          <Route path="/study" element={<div data-testid="study-route">Study</div>} />
          <Route path="/vocabulary/:vocabularyId" element={<div data-testid="vocabulary-route">Vocabulary</div>} />
        </Routes>
      </ActiveLearnerProvider>
    </MemoryRouter>
  );
}

describe("Topic Detail", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("shows the topic name, exact vocabulary list, level and partial aggregate progress", async () => {
    const fetchMock = mockDetail(
      [vocabulary(1, "apple"), vocabulary(2, "bread")],
      topicProgress(2, 1, 0, 1),
      [learnerVocabulary(1, "apple", "MASTERED"), learnerVocabulary(2, "bread", "NEW"), learnerVocabulary(99, "water", "NEW")]
    );
    renderTopic();

    expect(await screen.findByRole("heading", { name: "Food" })).toBeInTheDocument();
    expect(screen.getByTestId("collection-vocabulary-list")).toHaveTextContent("apple");
    expect(screen.getByTestId("collection-vocabulary-list")).toHaveTextContent("bread");
    expect(screen.getByTestId("collection-vocabulary-list")).not.toHaveTextContent("water");
    expect(screen.getByTestId("collection-detail-hero")).toHaveTextContent("2 từ");
    expect(screen.getByTestId("collection-detail-hero")).toHaveTextContent("Lớp 1");
    expect(screen.getByTestId("collection-vocabulary-list")).toHaveTextContent("Đã học");
    expect(screen.getByRole("progressbar", { name: "Tiến độ học Food" })).toHaveAttribute("aria-valuetext", "1 / 2 từ, 50%");
    expect(fetchMock).toHaveBeenCalledWith(`/api/topics/${topic.id}/vocabulary`, { credentials: "include" });
    expect(fetchMock).toHaveBeenCalledWith(`/api/learners/${learner.id}/topic-progress`, { credentials: "include" });
  });

  it("uses zero progress and offers the topic study action", async () => {
    mockDetail([vocabulary(1, "apple"), vocabulary(2, "bread")], topicProgress(2, 2, 0, 0), [learnerVocabulary(1, "apple", "NEW"), learnerVocabulary(2, "bread", "NEW")]);
    renderTopic();

    expect(await screen.findByRole("progressbar", { name: "Tiến độ học Food" })).toHaveAttribute("aria-valuetext", "0 / 2 từ, 0%");
    expect(screen.getByRole("link", { name: "Học chủ đề này" })).toHaveAttribute("href", "/study?topicId=7");
  });

  it("offers continue for partial progress and navigates without writing learner progress", async () => {
    const fetchMock = mockDetail([vocabulary(1, "apple"), vocabulary(2, "bread")], topicProgress(2, 0, 1, 1));
    renderTopic();

    fireEvent.click(await screen.findByRole("link", { name: "Tiếp tục học" }));

    expect(await screen.findByTestId("study-route")).toBeInTheDocument();
    expect(screen.getByTestId("current-url")).toHaveTextContent("/study?topicId=7");
    expect(fetchMock.mock.calls.every(([, init]) => !init?.method || init.method === "GET")).toBe(true);
  });

  it("offers review again only when the aggregate says every topic word is mastered", async () => {
    mockDetail([vocabulary(1, "apple"), vocabulary(2, "bread")], topicProgress(2, 0, 0, 2), [learnerVocabulary(1, "apple", "MASTERED"), learnerVocabulary(2, "bread", "MASTERED")]);
    renderTopic();

    expect(await screen.findByRole("link", { name: "Ôn tập lại" })).toHaveAttribute("href", "/study?topicId=7");
  });

  it("links a vocabulary card to its detail route", async () => {
    mockDetail([vocabulary(42, "apple")], topicProgress(1, 1, 0, 0), [learnerVocabulary(42, "apple", "NEW")]);
    renderTopic();

    fireEvent.click(await screen.findByRole("link", { name: /apple.*nghĩa apple.*xem chi tiết/i }));

    expect(await screen.findByTestId("vocabulary-route")).toBeInTheDocument();
    expect(screen.getByTestId("current-url")).toHaveTextContent("/vocabulary/42");
  });

  it("shows the scoped empty state and does not enable study when the topic has no vocabulary", async () => {
    mockDetail([], topicProgress(0, 0, 0, 0), []);
    renderTopic();

    expect(await screen.findByTestId("collection-detail-empty")).toHaveTextContent("Chưa có từ vựng trong nội dung này.");
    expect(screen.getByRole("button", { name: "Chưa có từ để học" })).toBeDisabled();
  });

  it("shows an API error with a retry action", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
    renderTopic();

    expect(await screen.findByTestId("topic-detail-error")).toHaveTextContent("Không thể tải chi tiết chủ đề");
    mockDetail([vocabulary(1, "apple"), vocabulary(2, "bread")]);
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(await screen.findByRole("heading", { name: "Food" })).toBeInTheDocument();
  });

  it("shows not-found for an unavailable topic id", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(response({ topics: [] }));
    renderTopic("/topics/999");

    expect(await screen.findByTestId("topic-detail-not-found")).toHaveTextContent("Chủ đề này hiện không khả dụng.");
  });

  it("redirects direct visits through learner selection and preserves the full detail URL", async () => {
    renderTopic("/topics/7?from=link", null);

    expect(await screen.findByTestId("learner-return-to")).toHaveTextContent("/topics/7?from=link");
  });
});
