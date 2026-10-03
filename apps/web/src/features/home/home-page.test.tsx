import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import type { ContinueLearningCandidate, LearnerDto } from "@vocabflow/contracts";
import { ActiveLearnerProvider } from "../learners/learner-context-provider";
import { LearnerPage } from "../learners/learner-page";
import { AppShell } from "../../components/app-shell";
import { HomePage } from "./home-page";

const {
  useSession,
  requestReviewQueue,
  requestContinueLearningSummary,
  requestProgressSummary,
  requestActivitySummary,
  requestGamification,
  requestLearnerLearningSets,
  requestProgressHistory,
  requestLearners,
  createLearner
} = vi.hoisted(() => ({
  useSession: vi.fn(),
  requestReviewQueue: vi.fn(),
  requestContinueLearningSummary: vi.fn(),
  requestProgressSummary: vi.fn(),
  requestActivitySummary: vi.fn(),
  requestGamification: vi.fn(),
  requestLearnerLearningSets: vi.fn(),
  requestProgressHistory: vi.fn(),
  requestLearners: vi.fn(),
  createLearner: vi.fn()
}));

vi.mock("../auth/auth-client", () => ({ authClient: { useSession } }));
vi.mock("../study/review-queue-client", async () => ({
  ...(await vi.importActual<typeof import("../study/review-queue-client")>("../study/review-queue-client")),
  requestReviewQueue
}));
vi.mock("./continue-learning-client", async () => ({
  ...(await vi.importActual<typeof import("./continue-learning-client")>("./continue-learning-client")),
  requestContinueLearningSummary
}));
vi.mock("../learners/progress-summary-client", async () => ({
  ...(await vi.importActual<typeof import("../learners/progress-summary-client")>("../learners/progress-summary-client")),
  requestProgressSummary
}));
vi.mock("../learners/activity-summary-client", async () => ({
  ...(await vi.importActual<typeof import("../learners/activity-summary-client")>("../learners/activity-summary-client")),
  requestActivitySummary
}));
vi.mock("../learners/gamification-client", async () => ({
  ...(await vi.importActual<typeof import("../learners/gamification-client")>("../learners/gamification-client")),
  requestGamification
}));
vi.mock("../learners/progress-insights-client", async () => ({
  ...(await vi.importActual<typeof import("../learners/progress-insights-client")>("../learners/progress-insights-client")),
  requestProgressHistory
}));
vi.mock("../learning-sets/learning-sets-client", async () => ({
  ...(await vi.importActual<typeof import("../learning-sets/learning-sets-client")>("../learning-sets/learning-sets-client")),
  requestLearnerLearningSets
}));
vi.mock("../learners/learner-client", async () => ({
  ...(await vi.importActual<typeof import("../learners/learner-client")>("../learners/learner-client")),
  requestLearners,
  createLearner
}));

const learner: LearnerDto = {
  id: "00000000-0000-4000-8000-000000000021",
  householdId: "00000000-0000-4000-8000-000000000001",
  displayName: "Avery Nguyen",
  avatarKey: null,
  enabled: true,
  createdAt: "2026-09-10T00:00:00.000Z",
  updatedAt: "2026-09-10T00:00:00.000Z"
};

const queue = {
  learnerId: learner.id,
  reviewDate: "2026-09-30",
  dueCount: 3,
  newCount: 2,
  queue: [{
    vocabulary: {
      id: 1,
      word: "carrot",
      ipa: null,
      vietnamese: "cà rốt",
      definitionEn: null,
      exampleEn: null,
      imageUrl: null,
      audioUrl: null,
      topic: "food",
      level: "GRADE_1" as const,
      enabled: true,
      contentVersion: 1
    },
    queueType: "DUE" as const,
    status: "LEARNING" as const,
    nextReviewDate: "2026-09-30",
    expectedRevision: 2
  }]
};

const summary = {
  learnerId: learner.id,
  newCount: 8,
  learningCount: 4,
  masteredCount: 12,
  dueCount: 3,
  learnedCount: 16
};

const activity = {
  learnerId: learner.id,
  localDate: "2026-09-30",
  dailyGoal: { goal: 10, reviewedUnique: 3, remaining: 7, completed: false },
  streak: { currentStreak: 4, longestStreak: 8, todayActive: true }
};

const gamification = {
  learnerId: learner.id,
  xp: { total: 245, level: 3, xpIntoLevel: 45, xpPerLevel: 100 as const, xpToNextLevel: 55 },
  achievements: []
};

const assignedSets = [{
  active: true,
  learningSet: {
    id: 7,
    slug: "grade-1-actions",
    name: "Hành động lớp 1",
    description: "Các hành động thường gặp trong chỉ dẫn và câu chuyện đơn giản.",
    grade: "GRADE_1" as const,
    enabled: true,
    sortOrder: 0,
    vocabularyCount: 20
  }
}];

const history = {
  learnerId: learner.id,
  timezone: "Asia/Ho_Chi_Minh",
  from: "2026-09-24",
  to: "2026-09-30",
  days: [
    { date: "2026-09-24", reviews: 0, uniqueWords: 0, remembered: 0, forgotten: 0, newLearned: 0 },
    { date: "2026-09-25", reviews: 5, uniqueWords: 4, remembered: 4, forgotten: 1, newLearned: 1 },
    { date: "2026-09-26", reviews: 3, uniqueWords: 3, remembered: 3, forgotten: 0, newLearned: 0 },
    { date: "2026-09-27", reviews: 0, uniqueWords: 0, remembered: 0, forgotten: 0, newLearned: 0 },
    { date: "2026-09-28", reviews: 0, uniqueWords: 0, remembered: 0, forgotten: 0, newLearned: 0 },
    { date: "2026-09-29", reviews: 0, uniqueWords: 0, remembered: 0, forgotten: 0, newLearned: 0 },
    { date: "2026-09-30", reviews: 6, uniqueWords: 5, remembered: 5, forgotten: 1, newLearned: 2 }
  ]
};

function LocationProbe() {
  const location = useLocation();
  const navigate = useNavigate();
  return <><output data-testid="current-location">{location.pathname}</output><button type="button" onClick={() => navigate(-1)}>Go back</button></>;
}

function renderHome(initialLearner: LearnerDto | null = learner, initialEntries = ["/"]) {
  return render(
    <MemoryRouter initialEntries={initialEntries} initialIndex={initialEntries.length - 1}>
      <ActiveLearnerProvider initialLearner={initialLearner}>
        <LocationProbe />
        <Routes>
          <Route element={<AppShell parentName="Jordan Nguyen" />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/learners" element={<LearnerPage />} />
          </Route>
          <Route path="/login" element={<p data-testid="login-route">Login route</p>} />
          <Route path="/previous" element={<p data-testid="previous-route">Previous page</p>} />
          <Route path="*" element={<p>Not found</p>} />
        </Routes>
      </ActiveLearnerProvider>
    </MemoryRouter>
  );
}

function continueCandidate(overrides: Partial<ContinueLearningCandidate> = {}): ContinueLearningCandidate {
  return {
    scope: "TOPIC",
    scopeId: 7,
    title: "School",
    totalCount: 5,
    learnedCount: 3,
    progressPercent: 60,
    lastActivityAt: "2026-10-02T08:30:00.000Z",
    ...overrides
  };
}

describe("Home dashboard", () => {
  beforeEach(() => {
    useSession.mockReset();
    requestReviewQueue.mockReset().mockResolvedValue(queue);
    requestContinueLearningSummary.mockReset().mockResolvedValue({ learnerId: learner.id, candidate: null });
    requestProgressSummary.mockReset().mockResolvedValue(summary);
    requestActivitySummary.mockReset().mockResolvedValue(activity);
    requestGamification.mockReset().mockResolvedValue(gamification);
    requestLearnerLearningSets.mockReset().mockResolvedValue(assignedSets);
    requestProgressHistory.mockReset().mockResolvedValue(history);
    requestLearners.mockReset().mockResolvedValue([learner]);
    createLearner.mockReset();
    useSession.mockReturnValue({
      data: { user: { id: "parent-id", name: "Jordan Nguyen" } },
      isPending: false,
      error: null,
      refetch: vi.fn()
    });
  });

  it("renders the active learner, live dashboard metrics, learning set, and weekly aggregates", async () => {
    renderHome();

    expect(await screen.findByRole("heading", { name: /chào buổi (sáng|chiều|tối), jordan nguyen/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Đổi người học. Người học hiện tại: Avery Nguyen, Cấp độ 3" })).toHaveAttribute("href", "/learners");
    expect(screen.getAllByRole("link", { name: "Trang chủ" }).some((link) => link.getAttribute("aria-current") === "page")).toBe(true);
    expect(screen.getByText("Avery Nguyen")).toBeInTheDocument();
    expect(screen.queryByText("Sarah")).not.toBeInTheDocument();
    expect(screen.queryByText("Emma")).not.toBeInTheDocument();
    expect(document.querySelector(".home-notification-visual i")).toBeNull();
    expect(document.querySelector(".home-chevron")).toBeNull();
    expect(screen.getByRole("link", { name: "Cần ôn tập: 3" })).toHaveAttribute("href", "/study");
    expect(screen.getByRole("link", { name: "Từ mới: 2" })).toHaveAttribute("href", "/study");
    expect(screen.getByRole("link", { name: "Đã học: 16" })).toHaveAttribute("href", "/progress");
    expect(screen.getByRole("link", { name: "Chuỗi ngày học: 4" })).toHaveAttribute("href", "/progress");
    expect(screen.getByRole("link", { name: /bắt đầu học/i })).toHaveAttribute("href", "/study/setup");
    expect(await screen.findByText("Hành động lớp 1")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Xem tất cả" }).some((link) => link.getAttribute("href") === "/learning-sets")).toBe(true);
    expect(screen.getByText("20 từ · Lớp 1")).toBeInTheDocument();
    expect(await screen.findByText(/5 từ khác nhau đã học vào ngày/)).toBeInTheDocument();
    expect(screen.getByText("6 lượt ôn tập")).toBeInTheDocument();
    expect(requestReviewQueue).toHaveBeenCalledWith(learner.id);
    expect(requestContinueLearningSummary).toHaveBeenCalledWith(learner.id);
    expect(requestContinueLearningSummary).toHaveBeenCalledOnce();
    expect(requestProgressSummary).toHaveBeenCalledWith(learner.id);
    expect(requestActivitySummary).toHaveBeenCalledWith(learner.id);
    expect(requestGamification).toHaveBeenCalledWith(learner.id);
    expect(requestLearnerLearningSets).toHaveBeenCalledWith(learner.id);
    await waitFor(() => expect(requestProgressHistory).toHaveBeenCalledWith(learner.id, "2026-09-24", "2026-09-30"));
  });

  it("shows a loading state while dashboard data is pending", async () => {
    requestReviewQueue.mockImplementation(() => new Promise(() => undefined));
    renderHome();
    expect(await screen.findByRole("status", { name: "Đang tải danh sách học hiện tại" })).toBeInTheDocument();
  });

  it("renders independent sections while the review queue is still pending", async () => {
    requestReviewQueue.mockImplementation(() => new Promise(() => undefined));
    renderHome();

    expect(await screen.findByRole("link", { name: "Đã học: 16" })).toBeInTheDocument();
    expect(await screen.findByText("Hành động lớp 1")).toBeInTheDocument();
    expect(await screen.findByText(/5 từ khác nhau đã học vào ngày/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Đổi người học. Người học hiện tại: Avery Nguyen, Cấp độ 3" })).toBeInTheDocument();

    expect(screen.getByRole("status", { name: "Đang tải danh sách học hiện tại" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cần ôn tập: …" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Từ mới: …" })).toBeInTheDocument();
    expect(requestReviewQueue).toHaveBeenCalledOnce();
    expect(requestProgressSummary).toHaveBeenCalledOnce();
    expect(requestActivitySummary).toHaveBeenCalledOnce();
    expect(requestGamification).toHaveBeenCalledOnce();
    expect(requestLearnerLearningSets).toHaveBeenCalledOnce();
    expect(requestContinueLearningSummary).toHaveBeenCalledOnce();
  });

  it("continues a real in-progress topic with scoped progress and activity", async () => {
    requestContinueLearningSummary.mockResolvedValue({ learnerId: learner.id, candidate: continueCandidate() });
    renderHome();

    const card = await screen.findByRole("region", { name: "Tiếp tục học" });
    expect(card).toHaveTextContent("Chủ đề");
    expect(card).toHaveTextContent("School");
    expect(card).toHaveTextContent("Đã học 3 / 5 từ");
    expect(card).toHaveTextContent("60%");
    const progress = screen.getByRole("progressbar", { name: "Tiến trình School" });
    expect(progress).toHaveAttribute("aria-valuenow", "60");
    const progressCopy = card.querySelector(".home-continue-progress-copy");
    expect(progressCopy).toHaveTextContent("Đã học 3 / 5 từ60%");
    expect(progressCopy?.nextElementSibling).toBe(progress);
    expect(card.querySelector("time")).toHaveAttribute("dateTime", "2026-10-02T08:30:00.000Z");
    expect(card.querySelector("time")).toHaveTextContent(/^Hoạt động gần nhất:/);
    expect(screen.getByRole("link", { name: "Tiếp tục học School" })).toHaveAttribute("href", "/study/setup?topicId=7");
    expect(screen.queryByText(/mode/i)).not.toBeInTheDocument();
  });

  it("continues a learning set at the exact set scope", async () => {
    requestContinueLearningSummary.mockResolvedValue({
      learnerId: learner.id,
      candidate: continueCandidate({ scope: "LEARNING_SET", scopeId: 12, title: "School basics", totalCount: 8, learnedCount: 3, progressPercent: 38, lastActivityAt: null })
    });
    renderHome();

    expect(await screen.findByRole("link", { name: "Tiếp tục học School basics" })).toHaveAttribute("href", "/study/setup?learningSetId=12");
    expect(screen.getByRole("region", { name: "Tiếp tục học" })).toHaveTextContent("Đã học 3 / 8 từ");
    expect(screen.queryByText(/Hoạt động gần nhất:/)).not.toBeInTheDocument();
  });

  it("continues saved vocabulary with its explicit all-saved setup scope", async () => {
    requestContinueLearningSummary.mockResolvedValue({
      learnerId: learner.id,
      candidate: continueCandidate({ scope: "SAVED", scopeId: null, title: "Từ đã lưu", totalCount: 5, learnedCount: 2, progressPercent: 40, lastActivityAt: null })
    });
    renderHome();

    expect(await screen.findByRole("link", { name: "Tiếp tục học Từ đã lưu" })).toHaveAttribute("href", "/study/setup?saved=1&content=all");
    expect(screen.getByRole("region", { name: "Tiếp tục học" })).toHaveTextContent("Đã học 2 / 5 từ");
  });

  it("does not show an arbitrary item as a saved session when no collection is in progress", async () => {
    requestContinueLearningSummary.mockResolvedValue({ learnerId: learner.id, candidate: null });
    renderHome();

    expect(await screen.findByRole("link", { name: "Bắt đầu phiên học" })).toHaveAttribute("href", "/study/setup");
    expect(screen.queryByRole("link", { name: /Tiếp tục học/ })).not.toBeInTheDocument();
    expect(requestContinueLearningSummary).toHaveBeenCalledOnce();
  });

  it("retries only the Continue Learning summary inside its card", async () => {
    requestContinueLearningSummary
      .mockRejectedValueOnce(new Error("summary unavailable"))
      .mockResolvedValueOnce({ learnerId: learner.id, candidate: continueCandidate() });
    renderHome();

    fireEvent.click(await screen.findByRole("button", { name: "Thử lại" }));
    expect(await screen.findByRole("link", { name: "Tiếp tục học School" })).toHaveAttribute("href", "/study/setup?topicId=7");
    expect(requestContinueLearningSummary).toHaveBeenCalledTimes(2);
    expect(requestReviewQueue).toHaveBeenCalledOnce();
    expect(requestProgressSummary).toHaveBeenCalledOnce();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("refreshes Continue Learning for the newly selected learner", async () => {
    const secondLearner = { ...learner, id: "00000000-0000-4000-8000-000000000022", displayName: "Morgan Nguyen" };
    requestLearners.mockResolvedValue([learner, secondLearner]);
    requestContinueLearningSummary.mockImplementation(async (id: string) => ({
      learnerId: id,
      candidate: id === secondLearner.id
        ? continueCandidate({ scope: "LEARNING_SET", scopeId: 12, title: "Morgan's set" })
        : continueCandidate()
    }));
    renderHome(null);

    fireEvent.click(await screen.findByRole("button", { name: "Morgan Nguyen" }));
    expect(await screen.findByRole("link", { name: "Tiếp tục học Morgan's set" })).toHaveAttribute("href", "/study/setup?learningSetId=12");
    expect(requestContinueLearningSummary).toHaveBeenCalledWith(secondLearner.id);
  });

  it("keeps a long parent name in the greeting without substituting a mock identity", async () => {
    const parentName = "Alexandria-Worthington-Supercalifragilistic-Parent";
    useSession.mockReturnValue({
      data: { user: { id: "parent-id", name: parentName } },
      isPending: false,
      error: null,
      refetch: vi.fn()
    });
    renderHome();

    expect(await screen.findByRole("heading", { name: /chào buổi (sáng|chiều|tối)/i })).toHaveTextContent(parentName);
  });

  it("shows an honest queue error and retries the dashboard requests", async () => {
    requestReviewQueue.mockRejectedValueOnce(new Error("fixture failure")).mockResolvedValueOnce(queue);
    renderHome();

    expect(await screen.findByRole("alert")).toHaveTextContent("Không thể tải một số thông tin trên trang chủ.");
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(await screen.findByRole("link", { name: "Cần ôn tập: 3" })).toBeInTheDocument();
    await waitFor(() => expect(requestReviewQueue).toHaveBeenCalledTimes(2));
  });

  it("uses the established learner-selection route when there is no active learner", () => {
    renderHome(null);
    expect(screen.getByRole("heading", { name: "Chọn người học" })).toBeInTheDocument();
    expect(screen.getByTestId("current-location")).toHaveTextContent("/learners");
  });

  it("auto-selects one enabled learner and returns to Home", async () => {
    requestLearners.mockResolvedValue([
      learner,
      { ...learner, id: "disabled-learner", displayName: "Disabled", enabled: false }
    ]);
    renderHome(null);

    expect(await screen.findByRole("main", { name: "Trang chủ học tập của Avery Nguyen" })).toBeInTheDocument();
    expect(screen.getByTestId("current-location")).toHaveTextContent("/");
  });

  it("waits for an explicit choice when multiple learners exist, then returns Home", async () => {
    requestLearners.mockResolvedValue([learner, { ...learner, id: "learner-2", displayName: "Morgan Nguyen" }]);
    renderHome(null);

    expect(await screen.findByRole("button", { name: "Avery Nguyen" })).toBeInTheDocument();
    expect(screen.getByTestId("current-location")).toHaveTextContent("/learners");
    fireEvent.click(screen.getByRole("button", { name: "Morgan Nguyen" }));
    expect(await screen.findByRole("main", { name: "Trang chủ học tập của Morgan Nguyen" })).toBeInTheDocument();
    expect(screen.getByTestId("current-location")).toHaveTextContent("/");
  });

  it("keeps a direct learner-page visit visible without a Home return intent", async () => {
    renderHome(null, ["/learners"]);

    expect(await screen.findByTestId("learner-context-ready")).toHaveTextContent("Avery Nguyen");
    expect(screen.getByTestId("current-location")).toHaveTextContent("/learners");
  });

  it("keeps zero-learner users on the creation page", async () => {
    requestLearners.mockResolvedValue([]);
    renderHome(null);

    expect(await screen.findByTestId("learner-empty-state")).toBeInTheDocument();
    expect(screen.getByTestId("current-location")).toHaveTextContent("/learners");
  });

  it("returns to Home after creating the first learner from a Home handoff", async () => {
    requestLearners.mockResolvedValue([]);
    createLearner.mockResolvedValue(learner);
    renderHome(null);

    expect(await screen.findByTestId("learner-empty-state")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Tên người học"), { target: { value: "Avery Nguyen" } });
    fireEvent.submit(screen.getByRole("button", { name: "Tạo hồ sơ học" }).closest("form")!);

    expect(await screen.findByRole("main", { name: "Trang chủ học tập của Avery Nguyen" })).toBeInTheDocument();
    expect(screen.getByTestId("current-location")).toHaveTextContent("/");
  });

  it("replaces the Home handoff history so Back does not loop through learner selection", async () => {
    renderHome(null, ["/previous", "/"]);

    expect(await screen.findByRole("main", { name: "Trang chủ học tập của Avery Nguyen" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Go back" }));
    expect(await screen.findByTestId("previous-route")).toBeInTheDocument();
    expect(screen.getByTestId("current-location")).toHaveTextContent("/previous");
  });

  it("shows a non-blank loading skeleton while the parent session is pending", () => {
    useSession.mockReturnValue({ data: null, isPending: true, error: null, refetch: vi.fn() });
    renderHome();
    expect(screen.getByText("Đang tải trang học tập…")).toBeInTheDocument();
  });

  it("provides a retry action when session validation fails", () => {
    const refetch = vi.fn();
    useSession.mockReturnValue({ data: null, isPending: false, error: new Error("session failure"), refetch });
    renderHome();
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(refetch).toHaveBeenCalledOnce();
  });
});
