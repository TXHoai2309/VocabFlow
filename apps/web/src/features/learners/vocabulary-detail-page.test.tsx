import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import type { LearnerDto, LearnerVocabularyDto } from "@vocabflow/contracts";
import { ActiveLearnerProvider } from "./learner-context-provider";
import { ToastProvider } from "../../components/toast/toast-provider";
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

function LearnerRouteProbe() {
  const location = useLocation();
  const returnTo = (location.state as { returnTo?: unknown } | null)?.returnTo;
  return <div><span>learners-route</span><output data-testid="learner-return-to">{typeof returnTo === "string" ? returnTo : ""}</output></div>;
}

function savedResponse(items: LearnerVocabularyDto[] = []) {
  return new Response(JSON.stringify({ savedVocabulary: items.map((vocabulary) => ({ vocabulary, savedAt: "2026-10-02T10:00:00.000Z" })) }), {
    headers: { "Content-Type": "application/json" }
  });
}

function mockDetailApi(items: LearnerVocabularyDto[], initiallySaved: number[] = []) {
  const saved = new Set(initiallySaved);
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = String(input);
    const match = url.match(/saved-vocabulary\/(\d+)$/);
    if (match) {
      const id = Number(match[1]);
      if (init?.method === "POST") saved.add(id);
      if (init?.method === "DELETE") saved.delete(id);
      return new Response(JSON.stringify({ learnerId: learner.id, vocabularyId: id, saved: init?.method === "POST", savedAt: init?.method === "POST" ? "2026-10-02T10:00:00.000Z" : null }), { headers: { "Content-Type": "application/json" } });
    }
    return url.endsWith("/saved-vocabulary") ? savedResponse(items.filter((item) => saved.has(item.id))) : response(items);
  });
}

function renderDetail(id = "1", initialLearner: LearnerDto | null = learner) {
  return render(
    <MemoryRouter initialEntries={[`/vocabulary/${id}`]}><AccountRouteProbe />
      <ToastProvider>
        <ActiveLearnerProvider initialLearner={initialLearner}>
          <Routes>
            <Route path="/vocabulary/:vocabularyId" element={<VocabularyDetailPage />} />
            <Route path="/vocabulary" element={<p>vocabulary-list-route</p>} />
            <Route path="/learners" element={<LearnerRouteProbe />} />
          </Routes>
        </ActiveLearnerProvider>
      </ToastProvider>
    </MemoryRouter>
  );
}

describe("vocabulary detail page", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("renders current-learner vocabulary content and links related words from the same topic", async () => {
    const items = [
      item({ sourceMeaningVi: "quả táo, trái táo" }),
      item({ id: 2, word: "banana", vietnamese: "quả chuối", ipa: "/bəˈnɑː.nə/", imageUrl: null }),
      item({ id: 3, word: "book", topic: "Trường học" })
    ];
    const fetchMock = mockDetailApi(items);

    renderDetail();

    expect(await screen.findByRole("heading", { name: "apple" })).toBeInTheDocument();
    expect(screen.getByText("Nghĩa tiếng Việt theo nguồn")).toBeInTheDocument();
    expect(screen.getByText("Nghĩa của sense đang học")).toBeInTheDocument();
    expect(screen.getByText("quả táo, trái táo")).toBeInTheDocument();
    expect(screen.getByText("quả táo")).toBeInTheDocument();
    expect(screen.getByText("/ˈæp.əl/")).toBeInTheDocument();
    expect(screen.getByText("A round fruit with firm white flesh and a green, red, or yellow skin.")).toBeInTheDocument();
    expect(screen.getByText("I eat an apple every day.")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Minh họa cho từ apple" })).toHaveAttribute("src", "https://images.example/apple.jpg");
    expect(screen.getAllByText("Đang học")).toHaveLength(2);
    expect(screen.getByText("3 tháng 10, 2026")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /banana/ })).toHaveAttribute("href", "/vocabulary/2");
    expect(screen.queryByRole("link", { name: /book/ })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(`/api/learners/${learner.id}/vocabulary?id=1`, { credentials: "include" });
  });

  it("shows POS next to IPA and keeps bilingual examples on distinct lines", async () => {
    mockDetailApi([item({
      partOfSpeech: "NOUN",
      exampleEn: null,
      examples: [{ exampleKey: "accent-ex-1", en: "I recognized her regional accent immediately.", vi: "Tôi nhận ra ngay giọng vùng miền của cô ấy." }]
    })]);

    const { container } = renderDetail();

    expect(await screen.findByText("/ˈæp.əl/ · Danh từ")).toBeInTheDocument();
    const english = screen.getByText("I recognized her regional accent immediately.");
    const vietnamese = screen.getByText("Tôi nhận ra ngay giọng vùng miền của cô ấy.");
    expect(english.closest(".vocabulary-detail-example-line")).toHaveTextContent("EN");
    expect(vietnamese.closest(".vocabulary-detail-example-line")).toHaveTextContent("VI");
    expect(english.closest(".vocabulary-detail-example-line")).not.toBe(vietnamese.closest(".vocabulary-detail-example-line"));
    expect(container.querySelectorAll(".vocabulary-detail-example-line")).toHaveLength(2);
  });

  it("shows the player only for an exact example audio URL supplied on that example", async () => {
    const exampleUrl = "https://res.cloudinary.com/vocabflow/video/authenticated/s--Exmpl_12--/Vocab/v2/audio/example.mp3";
    mockDetailApi([item({
      exampleEn: null,
      examples: [{ exampleKey: "accent-ex-1", en: "I recognized her accent.", audioUrl: exampleUrl }]
    })]);

    const { container } = renderDetail();

    expect(await screen.findByText("I recognized her accent.")).toBeInTheDocument();
    expect(container.querySelector("audio.vocabulary-example-audio-control")).toHaveAttribute("src", exampleUrl);
  });

  it("uses explicit empty states for unavailable content and does not invent learning metrics", async () => {
    mockDetailApi([item({
      ipa: null,
      definitionEn: null,
      exampleEn: null,
      imageUrl: null,
      audioUrl: null,
      topic: null,
      level: null,
      status: "NEW",
      nextReviewDate: null
    })]);

    renderDetail();

    expect(await screen.findByRole("heading", { name: "apple" })).toBeInTheDocument();
    expect(screen.getByText("Chưa có hình minh họa")).toBeInTheDocument();
    expect(screen.getByText("Chưa có tệp phát âm")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /phát âm apple/i })).not.toBeInTheDocument();
    expect(screen.getByText("Chưa có định nghĩa chi tiết cho từ này.")).toBeInTheDocument();
    expect(screen.getByText("Chưa có câu ví dụ cho từ này.")).toBeInTheDocument();
    expect(screen.getByText("Chưa có dữ liệu từ đồng nghĩa.")).toBeInTheDocument();
    expect(screen.getByText("Chưa có dữ liệu từ trái nghĩa.")).toBeInTheDocument();
    expect(screen.getByText("Chưa có lịch ôn")).toBeInTheDocument();
    expect(screen.getByText(/Số lượt học và độ thành thạo riêng/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lưu từ apple" })).toBeEnabled();
    expect(screen.queryByText(/80%|5 lần/)).not.toBeInTheDocument();
  });

  it("shows a not-found state for an invalid or unavailable vocabulary id", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    renderDetail("not-an-id");
    expect(await screen.findByTestId("vocabulary-detail-not-found")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("waits for internal identity at the original route without learner selection", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    renderDetail("1", null);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(await screen.findByRole("status", { name: "Đang chuẩn bị học tập…" })).toBeInTheDocument();
    expect(screen.getByTestId("account-route")).toHaveTextContent("/vocabulary/1");
    expect(screen.queryByText("learners-route")).not.toBeInTheDocument();
  });

  it("shows a recoverable request error", async () => {
    let vocabularyCalls = 0;
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      if (String(input).endsWith("/saved-vocabulary")) return savedResponse();
      vocabularyCalls += 1;
      return vocabularyCalls === 1 ? response([], 503) : response([item()]);
    });

    renderDetail();

    expect(await screen.findByTestId("vocabulary-detail-error")).toHaveTextContent("Không thể tải chi tiết từ vựng lúc này.");
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "apple" })).toBeInTheDocument());
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes("/vocabulary") && !String(url).includes("saved-vocabulary"))).toHaveLength(2);
  });

  it("saves and unsaves from detail with immediate accessible state and no page reload", async () => {
    const fetchMock = mockDetailApi([item()]);
    renderDetail();
    await screen.findByRole("heading", { name: "apple" });
    const saveButton = await screen.findByRole("button", { name: "Lưu từ apple" });

    fireEvent.click(saveButton);
    expect(await screen.findByRole("button", { name: "Bỏ lưu từ apple" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Bỏ lưu từ apple" })).toHaveTextContent("Đã lưu");
    fireEvent.click(screen.getByRole("button", { name: "Bỏ lưu từ apple" }));
    expect(await screen.findByRole("button", { name: "Lưu từ apple" })).toHaveAttribute("aria-pressed", "false");
    expect(fetchMock.mock.calls.some(([url, init]) => String(url).endsWith("/saved-vocabulary/1") && init?.method === "POST")).toBe(true);
    expect(fetchMock.mock.calls.some(([url, init]) => String(url).endsWith("/saved-vocabulary/1") && init?.method === "DELETE")).toBe(true);
    expect(screen.getByText("Đã bỏ khỏi Yêu thích")).toBeInTheDocument();
  });

  it("hydrates the bookmark state from the learner's saved list", async () => {
    mockDetailApi([item()], [1]);
    renderDetail();

    expect(await screen.findByRole("button", { name: "Bỏ lưu từ apple" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Bỏ lưu từ apple" })).toHaveTextContent("Đã lưu");
  });

  it("rolls back a failed detail save", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      if (String(input).endsWith("/saved-vocabulary/1") && init?.method === "POST") return response([], 503);
      return String(input).endsWith("/saved-vocabulary") ? savedResponse() : response([item()]);
    });
    renderDetail();
    await screen.findByRole("heading", { name: "apple" });

    fireEvent.click(await screen.findByRole("button", { name: "Lưu từ apple" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Không thể cập nhật Yêu thích. Vui lòng thử lại.");
    expect(screen.getByRole("button", { name: "Lưu từ apple" })).toHaveAttribute("aria-pressed", "false");
  });
});

function AccountRouteProbe() { const route = useLocation(); return <output data-testid="account-route">{route.pathname}{route.search}</output>; }
