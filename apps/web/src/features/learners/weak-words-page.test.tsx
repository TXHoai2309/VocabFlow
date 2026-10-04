import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import type { LearnerDto, WeakWordsItem, WeakWordsResponse } from "@vocabflow/contracts";
import { ActiveLearnerProvider } from "./learner-context-provider";
import { WeakWordsPage } from "./weak-words-page";

const learner: LearnerDto = {
  id: "00000000-0000-4000-8000-000000000010",
  householdId: "00000000-0000-4000-8000-000000000001",
  displayName: "An",
  avatarKey: null,
  enabled: true,
  createdAt: "2026-09-10T00:00:00.000Z",
  updatedAt: "2026-09-10T00:00:00.000Z"
};

function weakItem(id: number, word: string, status: WeakWordsItem["weaknessStatus"] = "WEAK"): WeakWordsItem {
  return {
    vocabulary: {
      id,
      word,
      ipa: "/wɜːd/",
      vietnamese: `${word}-nghĩa`,
      definitionEn: null,
      exampleEn: null,
      imageUrl: id === 1 ? "/images/school.png" : null,
      audioUrl: null,
      topic: "Education",
      level: "GRADE_2",
      enabled: true,
      contentVersion: 1
    },
    learningState: status === "STABLE" ? "MASTERED" : "LEARNING",
    weaknessStatus: status,
    recentAccuracy: status === "WEAK" ? 25 : 100,
    reviewCount: 4,
    rememberedCount: status === "WEAK" ? 1 : 4,
    forgottenCount: status === "WEAK" ? 3 : 0,
    nextReviewDate: "2026-10-02",
    dueStatus: "OVERDUE",
    daysUntilDue: -2,
    expectedRevision: 3
  };
}

function weakResponse(items: WeakWordsItem[], overrides: Partial<WeakWordsResponse["summary"]> = {}): WeakWordsResponse {
  return {
    learnerId: learner.id,
    reviewDate: "2026-10-04",
    summary: { weakCount: 1, dueCount: 2, recentAccuracy: 56, recentReviewCount: 9, ...overrides },
    items,
    pagination: { page: 1, pageSize: 20, totalItems: items.length, totalPages: items.length ? 1 : 0 }
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function renderPage(path = "/weak-words", activeLearner: LearnerDto | null = learner) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ActiveLearnerProvider initialLearner={activeLearner}>
        <Routes>
          <Route path="/weak-words" element={<WeakWordsPage />} />
          <Route path="/learners" element={<p>learners-route</p>} />
          <Route path="/study/setup" element={<p data-testid="study-setup-route">study-setup-route</p>} />
          <Route path="/vocabulary/:vocabularyId" element={<p data-testid="vocabulary-detail-route">vocabulary-detail-route</p>} />
        </Routes>
      </ActiveLearnerProvider>
    </MemoryRouter>
  );
}

describe("Weak Words page", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("renders API summaries, real review evidence, due state, media and bulk study scope", async () => {
    const payload = weakResponse([weakItem(1, "school"), weakItem(2, "family", "LEARNING"), weakItem(3, "book", "STABLE")], { dueCount: 3 });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(payload));
    renderPage();

    expect(await screen.findByTestId("weak-words-page")).toBeInTheDocument();
    expect(screen.getByTestId("weak-words-count")).toHaveTextContent("1");
    expect(screen.getByTestId("weak-words-due-count")).toHaveTextContent("3");
    expect(screen.getByTestId("weak-words-recent-accuracy")).toHaveTextContent("56%");
    expect(screen.getByText("school")).toBeInTheDocument();
    expect(screen.getByText("Độ chính xác 25% · Quên 3 trong 4 lượt gần đây")).toBeInTheDocument();
    expect(screen.getAllByText("Quá hạn 2 ngày")).toHaveLength(3);
    expect(screen.getByTestId("weak-word-2").querySelector(".weak-words-status")).toHaveTextContent("Learning");
    expect(screen.getByTestId("weak-word-3").querySelector(".weak-words-status")).toHaveTextContent("Stable");
    expect(screen.getByAltText("Hình minh họa school")).toHaveAttribute("src", "/images/school.png");
    expect(screen.getByRole("button", { name: "Nghe phát âm school" })).toBeDisabled();
    expect(screen.getByRole("link", { name: /Ôn các từ yếu ngay \(1\)/ })).toHaveAttribute("href", "/study/setup?weak=1");
    expect(fetchMock).toHaveBeenCalledWith(`/api/learners/${learner.id}/weak-words?page=1&pageSize=20`, { credentials: "include" });
  });

  it("updates search and status in the URL and requests the matching page", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (!url.includes("q=") || url.includes("q=school")) return jsonResponse(weakResponse([weakItem(1, "school")], { weakCount: 1 }));
      return jsonResponse(weakResponse([weakItem(2, "family", "LEARNING")]));
    });
    renderPage();
    await screen.findByText("school");

    fireEvent.change(screen.getByRole("searchbox", { name: "Tìm theo từ tiếng Anh hoặc nghĩa tiếng Việt" }), { target: { value: "school" } });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(`/api/learners/${learner.id}/weak-words?q=school&page=1&pageSize=20`, { credentials: "include" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Lọc theo trạng thái" }), { target: { value: "weak" } });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(`/api/learners/${learner.id}/weak-words?q=school&status=weak&page=1&pageSize=20`, { credentials: "include" }));
    expect(await screen.findByText("school")).toBeInTheDocument();
    expect(screen.queryByText("family")).not.toBeInTheDocument();
  });

  it("shows truthful no-data and empty states, and keeps the page mounted on API failure", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(weakResponse([], { weakCount: 0, dueCount: 0, recentAccuracy: null, recentReviewCount: 0 })))
      .mockResolvedValueOnce(jsonResponse({ error: { code: "INTERNAL_ERROR" } }, 503))
      .mockResolvedValueOnce(jsonResponse(weakResponse([], { weakCount: 0, dueCount: 0, recentAccuracy: null, recentReviewCount: 0 })));
    renderPage();

    expect(await screen.findByTestId("weak-words-page")).toBeInTheDocument();
    expect(screen.getByTestId("weak-words-recent-accuracy")).toHaveTextContent("Chưa đủ dữ liệu");
    expect(screen.getByText("✓ Chưa có từ nào cần chú ý đặc biệt 🎉")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ôn các từ yếu ngay (0)" })).toBeDisabled();
    fireEvent.change(screen.getByRole("searchbox", { name: "Tìm theo từ tiếng Anh hoặc nghĩa tiếng Việt" }), { target: { value: "none" } });
    expect(await screen.findByRole("alert")).toHaveTextContent("Không thể tải danh sách từ cần ôn lúc này.");
    expect(screen.getByTestId("weak-words-page")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(await screen.findByText("✓ Chưa có từ nào cần chú ý đặc biệt 🎉")).toBeInTheDocument();
  });
});
