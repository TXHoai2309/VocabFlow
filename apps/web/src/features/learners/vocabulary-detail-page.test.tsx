import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import type { LearnerDto, LearnerVocabularyDto } from "@vocabflow/contracts";
import { ActiveLearnerProvider } from "./learner-context-provider";
import { VocabularyDetailPage } from "./vocabulary-detail-page";

const learner: LearnerDto = {
  id: "00000000-0000-4000-8000-000000000021",
  householdId: "00000000-0000-4000-8000-000000000001",
  displayName: "Avery Nguyen",
  avatarKey: null,
  enabled: true,
  createdAt: "2026-09-10T00:00:00.000Z",
  updatedAt: "2026-09-10T00:00:00.000Z"
};

function item(overrides: Partial<LearnerVocabularyDto> = {}): LearnerVocabularyDto {
  return {
    id: 1,
    word: "apple",
    ipa: "/ˈæp.əl/",
    vietnamese: "quả táo",
    definitionEn: "A round fruit with firm white flesh and a green, red, or yellow skin.",
    exampleEn: "I eat an apple every day.",
    imageUrl: "https://images.example/apple.jpg",
    audioUrl: "https://audio.example/apple.mp3",
    topic: "Hoa quả",
    level: "GRADE_1",
    enabled: true,
    contentVersion: 1,
    status: "LEARNING",
    nextReviewDate: "2026-10-03",
    ...overrides
  };
}

function response(vocabulary: LearnerVocabularyDto[], status = 200) {
  return new Response(JSON.stringify({ vocabulary }), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function renderDetail(id = "1") {
  return render(
    <MemoryRouter initialEntries={[`/vocabulary/${id}`]}>
      <ActiveLearnerProvider initialLearner={learner}>
        <Routes>
          <Route path="/vocabulary/:vocabularyId" element={<VocabularyDetailPage />} />
          <Route path="/vocabulary" element={<p>vocabulary-list-route</p>} />
          <Route path="/learners" element={<p>learners-route</p>} />
        </Routes>
      </ActiveLearnerProvider>
    </MemoryRouter>
  );
}

describe("vocabulary detail page", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("renders current-learner vocabulary content and links related words from the same topic", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(response([
      item(),
      item({ id: 2, word: "banana", vietnamese: "quả chuối", ipa: "/bəˈnɑː.nə/", imageUrl: null }),
      item({ id: 3, word: "book", topic: "Trường học" })
    ]));

    renderDetail();

    expect(await screen.findByRole("heading", { name: "apple" })).toBeInTheDocument();
    expect(screen.getByText("quả táo")).toBeInTheDocument();
    expect(screen.getByText("/ˈæp.əl/")).toBeInTheDocument();
    expect(screen.getByText("A round fruit with firm white flesh and a green, red, or yellow skin.")).toBeInTheDocument();
    expect(screen.getByText("I eat an apple every day.")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Minh họa cho từ apple" })).toHaveAttribute("src", "https://images.example/apple.jpg");
    expect(screen.getAllByText("Đang học")).toHaveLength(2);
    expect(screen.getByText("3 tháng 10, 2026")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /banana/ })).toHaveAttribute("href", "/vocabulary/2");
    expect(screen.queryByRole("link", { name: /book/ })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(`/api/learners/${learner.id}/vocabulary`, { credentials: "include" });
  });

  it("uses explicit empty states for unavailable content and does not invent learning metrics", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(response([item({
      ipa: null,
      definitionEn: null,
      exampleEn: null,
      imageUrl: null,
      audioUrl: null,
      topic: null,
      level: null,
      status: "NEW",
      nextReviewDate: null
    })]));

    renderDetail();

    expect(await screen.findByRole("heading", { name: "apple" })).toBeInTheDocument();
    expect(screen.getByText("Chưa có hình minh họa")).toBeInTheDocument();
    expect(screen.getByText("Chưa có định nghĩa chi tiết cho từ này.")).toBeInTheDocument();
    expect(screen.getByText("Chưa có câu ví dụ cho từ này.")).toBeInTheDocument();
    expect(screen.getByText("Chưa có dữ liệu từ đồng nghĩa.")).toBeInTheDocument();
    expect(screen.getByText("Chưa có dữ liệu từ trái nghĩa.")).toBeInTheDocument();
    expect(screen.getByText("Chưa có lịch ôn")).toBeInTheDocument();
    expect(screen.getByText(/Số lượt học và độ thành thạo riêng/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lưu từ — hiện chưa hỗ trợ lưu từng từ" })).toBeDisabled();
    expect(screen.queryByText(/80%|5 lần/)).not.toBeInTheDocument();
  });

  it("shows a not-found state for an invalid or unavailable vocabulary id", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    renderDetail("not-an-id");
    expect(await screen.findByTestId("vocabulary-detail-not-found")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows a recoverable request error", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response([], 503))
      .mockResolvedValueOnce(response([item()]));

    renderDetail();

    expect(await screen.findByTestId("vocabulary-detail-error")).toHaveTextContent("Không thể tải chi tiết từ vựng lúc này.");
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "apple" })).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
