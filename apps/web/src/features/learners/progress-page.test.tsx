import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import type {
  ActivitySummaryResponse,
  LearnerDto,
  ProgressHistoryDay,
  ProgressHistoryResponse,
  ProgressSummaryResponse,
  TopicProgressResponse
} from "@vocabflow/contracts";
import { ActiveLearnerProvider } from "./learner-context-provider";
import { useActiveLearner } from "./learner-context-hook";
import { ProgressPage } from "./progress-page";
import { ToastProvider } from "../../components/toast/toast-provider";

const { requestResetLearnerProgress, requestProgressHistory, requestTopicProgress } = vi.hoisted(() => ({
  requestResetLearnerProgress: vi.fn(),
  requestProgressHistory: vi.fn(),
  requestTopicProgress: vi.fn()
}));

vi.mock("./reset-progress-client", async () => {
  const actual = await vi.importActual<typeof import("./reset-progress-client")>("./reset-progress-client");
  return { ...actual, requestResetLearnerProgress };
});

vi.mock("./progress-insights-client", async () => {
  const actual = await vi.importActual<typeof import("./progress-insights-client")>("./progress-insights-client");
  return { ...actual, requestProgressHistory, requestTopicProgress };
});

const learner = (id: string, displayName: string): LearnerDto => ({
  id,
  householdId: "00000000-0000-4000-8000-000000000001",
  displayName,
  avatarKey: null,
  enabled: true,
  createdAt: "2026-09-10T00:00:00.000Z",
  updatedAt: "2026-09-10T00:00:00.000Z"
});

const learnerA = learner("00000000-0000-4000-8000-000000000010", "An");
const learnerB = learner("00000000-0000-4000-8000-000000000011", "Bình");

function summary(learnerId: string, values: Partial<Omit<ProgressSummaryResponse, "learnerId">> = {}): ProgressSummaryResponse {
  return {
    learnerId,
    newCount: values.newCount ?? 30,
    learningCount: values.learningCount ?? 2,
    masteredCount: values.masteredCount ?? 3,
    dueCount: values.dueCount ?? 4,
    learnedCount: values.learnedCount ?? 5,
    progressByLevel: values.progressByLevel ?? [
      { level: "GENERAL", total: 10, learnedCount: 4, masteredCount: 2 },
      { level: "GRADE_2", total: 5, learnedCount: 1, masteredCount: 0 },
      { level: null, total: 2, learnedCount: 0, masteredCount: 0 },
      { level: "GRADE_1", total: 8, learnedCount: 3, masteredCount: 1 }
    ]
  };
}

function activity(
  learnerId: string,
  values: { newCompleted?: number; reviewCompleted?: number; streak?: number } = {}
): ActivitySummaryResponse {
  const newCompleted = values.newCompleted ?? 0;
  const reviewCompleted = values.reviewCompleted ?? 0;
  return {
    learnerId,
    localDate: "2026-09-20",
    dailyGoal: {
      newWords: { goal: 10, completed: newCompleted, remaining: Math.max(0, 10 - newCompleted), percent: Math.min(100, Math.round(newCompleted / 10 * 100)) },
      reviews: { goal: 20, completed: reviewCompleted, remaining: Math.max(0, 20 - reviewCompleted), percent: Math.min(100, Math.round(reviewCompleted / 20 * 100)) },
      overallPercent: Math.min(100, Math.round((Math.min(10, newCompleted) + Math.min(20, reviewCompleted)) / 30 * 100)),
      completed: newCompleted >= 10 && reviewCompleted >= 20
    },
    streak: { currentStreak: values.streak ?? 0, longestStreak: values.streak ?? 0, todayActive: (values.streak ?? 0) > 0 }
  };
}

function historyDay(date: string, values: Partial<ProgressHistoryDay> = {}): ProgressHistoryDay {
  return {
    date,
    reviews: 0,
    uniqueWords: 0,
    remembered: 0,
    forgotten: 0,
    newLearned: 0,
    ...values
  };
}

function history(learnerId: string, days = 7): ProgressHistoryResponse {
  const to = new Date("2026-09-20T00:00:00.000Z");
  const dates = Array.from({ length: days }, (_, index) => {
    const date = new Date(to);
    date.setUTCDate(date.getUTCDate() - (days - index - 1));
    return date.toISOString().slice(0, 10);
  });
  return {
    learnerId,
    timezone: "Asia/Ho_Chi_Minh",
    from: dates[0] ?? "2026-09-20",
    to: dates.at(-1) ?? "2026-09-20",
    days: dates.map((date, index) => index === days - 1
      ? historyDay(date, { reviews: 2, uniqueWords: 1, remembered: 1, forgotten: 1, newLearned: 1 })
      : historyDay(date))
  };
}

function topicProgress(learnerId: string): TopicProgressResponse {
  return {
    learnerId,
    localDate: "2026-09-20",
    topics: [
      { topicId: 1, slug: "family", name: "Gia đình", total: 10, newCount: 8, learningCount: 2, masteredCount: 0, dueCount: 1 },
      { topicId: 2, slug: "nature", name: "Thiên nhiên", total: 10, newCount: 9, learningCount: 1, masteredCount: 0, dueCount: 1 },
      { topicId: 3, slug: "school", name: "Trường học", total: 10, newCount: 0, learningCount: 2, masteredCount: 8, dueCount: 0 },
      { topicId: 4, slug: "untouched", name: "Chưa bắt đầu", total: 10, newCount: 10, learningCount: 0, masteredCount: 0, dueCount: 0 }
    ]
  };
}

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function renderProgress(initialLearner: LearnerDto | null = learnerA, initialPath = "/progress") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}><AccountRouteProbe />
      <ToastProvider>
        <ActiveLearnerProvider initialLearner={initialLearner}>
          <Routes>
            <Route path="/progress" element={<ProgressPage />} />
            <Route path="/learners" element={<p>learners-route</p>} />
          </Routes>
        </ActiveLearnerProvider>
      </ToastProvider>
    </MemoryRouter>
  );
}

function metric(testId: string) {
  return screen.getByTestId(testId).querySelector("dd");
}

function mockDashboardFetch(options: {
  summaryFor?: (calls: number) => ProgressSummaryResponse;
  activityFor?: () => ActivitySummaryResponse;
  failFirstSummary?: boolean;
} = {}) {
  let summaryCalls = 0;
  const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
    const url = String(input);
    if (url.includes("progress-summary")) {
      summaryCalls += 1;
      if (options.failFirstSummary && summaryCalls === 1) {
        return Promise.resolve(response({ error: { code: "INTERNAL_ERROR" } }, 503));
      }
      return Promise.resolve(response(options.summaryFor?.(summaryCalls) ?? summary(learnerA.id)));
    }
    return Promise.resolve(response(options.activityFor?.() ?? activity(learnerA.id)));
  });
  return fetchMock;
}

function LocationCapture() {
  const location = useLocation();
  return <output data-testid="current-location">{location.pathname}{location.search}</output>;
}

describe("Feature #11 learner progress dashboard", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    requestResetLearnerProgress.mockReset();
    requestProgressHistory.mockReset().mockImplementation((learnerId: string, from: string, to: string) => {
      const days = Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1;
      return Promise.resolve(history(learnerId, days));
    });
    requestTopicProgress.mockReset().mockImplementation((learnerId: string) => Promise.resolve(topicProgress(learnerId)));
  });

  it("loads real summary metrics, activity history, topic progress, and the existing streak", async () => {
    const fetchMock = mockDashboardFetch({ activityFor: () => activity(learnerA.id, { newCompleted: 7, reviewCompleted: 3, streak: 6 }) });
    let resolveHistory!: (value: ProgressHistoryResponse) => void;
    requestProgressHistory.mockReturnValue(new Promise((resolve) => { resolveHistory = resolve; }));
    renderProgress();

    const loadingState = screen.getByTestId("progress-loading");
    const dashboardSkeleton = loadingState.querySelector(".async-skeleton-dashboard");
    expect(loadingState).toHaveClass("async-loading", "progress-dashboard-state");
    expect(dashboardSkeleton).toBeInTheDocument();
    expect(dashboardSkeleton?.querySelectorAll(".async-skeleton-metrics > i")).toHaveLength(4);
    expect(dashboardSkeleton?.querySelectorAll(".async-skeleton-panels")).toHaveLength(2);
    expect(await screen.findByTestId("progress-summary")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Tiến trình học tập" })).toBeInTheDocument();
    expect(metric("progress-metric-learned")).toHaveTextContent("5");
    expect(metric("progress-metric-mastered")).toHaveTextContent("3");
    expect(screen.getByTestId("progress-metric-accuracy")).toHaveTextContent("Đang tải dữ liệu ôn tập");
    resolveHistory(history(learnerA.id));
    await waitFor(() => expect(metric("progress-metric-accuracy")).toHaveTextContent("50%"));
    expect(metric("progress-metric-streak")).toHaveTextContent("6 ngày");
    expect(screen.getByTestId("activity-chart").querySelector("svg")).toHaveAttribute("aria-label", expect.stringContaining("1 lượt từ vựng duy nhất"));
    expect(screen.getByTestId("accuracy-chart").querySelector("svg")).toHaveAttribute("aria-label", expect.stringContaining("50%"));
    expect(fetchMock).toHaveBeenCalledWith(`/api/learners/${learnerA.id}/progress-summary`, { credentials: "include" });
    expect(fetchMock).toHaveBeenCalledWith(`/api/learners/${learnerA.id}/activity-summary`, { credentials: "include" });
    expect(requestProgressHistory).toHaveBeenCalledWith(learnerA.id, "2026-09-14", "2026-09-20");
    expect(requestTopicProgress).toHaveBeenCalledWith(learnerA.id);
    expect(fetchMock.mock.calls.some(([input]) => String(input).includes("gamification"))).toBe(false);
  });

  it("uses review outcomes for aggregate accuracy and leaves days without reviews as gaps", async () => {
    mockDashboardFetch();
    const days = history(learnerA.id).days.map((day, index) => index === 2
      ? historyDay(day.date, { reviews: 4, uniqueWords: 3, remembered: 3, forgotten: 1 })
      : historyDay(day.date));
    requestProgressHistory.mockResolvedValue({ ...history(learnerA.id), days });
    renderProgress();

    expect(await screen.findByTestId("progress-summary")).toBeInTheDocument();
    await waitFor(() => expect(metric("progress-metric-accuracy")).toHaveTextContent("75%"));
    const chart = screen.getByTestId("accuracy-chart");
    expect(chart.querySelectorAll("circle")).toHaveLength(1);
    expect(chart).toHaveTextContent("không có lượt ôn");
    expect(chart).toHaveTextContent("4 lượt ôn hợp lệ trong 1 ngày có dữ liệu");
  });

  it("shows an honest empty accuracy state and no fabricated zero-percent chart", async () => {
    mockDashboardFetch({ summaryFor: () => summary(learnerA.id, { learnedCount: 0, masteredCount: 0 }) });
    requestProgressHistory.mockResolvedValue({
      ...history(learnerA.id),
      days: history(learnerA.id).days.map((day) => historyDay(day.date))
    });
    renderProgress();

    expect(await screen.findByTestId("progress-empty-state")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId("progress-metric-accuracy")).toHaveTextContent("Chưa có lượt ôn"));
    expect(metric("progress-metric-accuracy")).toHaveTextContent("—");
    expect(screen.queryByTestId("accuracy-chart")).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Độ chính xác ôn tập" })).toHaveTextContent("Chưa đủ dữ liệu");
  });

  it("supports 7-day default and URL-backed 30-day activity periods", async () => {
    mockDashboardFetch();
    render(
      <MemoryRouter initialEntries={["/progress?tab=overview"]}><AccountRouteProbe />
        <ToastProvider><ActiveLearnerProvider initialLearner={learnerA}><LocationCapture /><ProgressPage /></ActiveLearnerProvider></ToastProvider>
      </MemoryRouter>
    );

    expect(await screen.findByTestId("progress-summary")).toBeInTheDocument();
    expect(screen.getByTestId("progress-period")).toHaveValue("7d");
    expect(screen.getByTestId("current-location")).toHaveTextContent("/progress?tab=overview");
    fireEvent.change(screen.getByTestId("progress-period"), { target: { value: "30d" } });

    await waitFor(() => expect(requestProgressHistory).toHaveBeenCalledWith(learnerA.id, "2026-08-22", "2026-09-20"));
    expect(screen.getByTestId("current-location")).toHaveTextContent("/progress?tab=overview&period=30d");
    expect(screen.getByTestId("progress-period")).toHaveValue("30d");
    await waitFor(() => expect(screen.getByTestId("activity-chart").querySelector("svg")).toHaveAttribute("aria-label", expect.stringContaining("30 ngày gần đây")));
  });

  it("orders only real level classifications and shows accurate coverage and accessible bars", async () => {
    mockDashboardFetch();
    renderProgress();

    expect(await screen.findByTestId("level-progress-list")).toBeInTheDocument();
    const rows = Array.from(screen.getByTestId("level-progress-list").querySelectorAll("li"));
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining("Lớp 1"),
      expect.stringContaining("Lớp 2"),
      expect.stringContaining("Chung"),
      expect.stringContaining("Chưa phân cấp")
    ]);
    expect(rows[0]).toHaveTextContent("3 / 8");
    expect(rows[0]).toHaveTextContent("38%");
    const bars = screen.getByTestId("level-progress-list").querySelectorAll('[role="progressbar"]');
    expect(bars).toHaveLength(4);
    expect(bars[0]).toHaveAttribute("aria-valuenow", "38");
    expect(bars[0]).toHaveAttribute("aria-valuemin", "0");
    expect(bars[0]).toHaveAttribute("aria-valuemax", "100");
  });

  it("prioritizes partial active topics, omits untouched topics, and links to all topics", async () => {
    mockDashboardFetch();
    renderProgress();

    const topics = await screen.findByTestId("topic-progress-list");
    const rows = Array.from(topics.querySelectorAll("li"));
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining("Thiên nhiên"),
      expect.stringContaining("Gia đình"),
      expect.stringContaining("Trường học")
    ]);
    expect(rows[0]).toHaveTextContent("1 / 10");
    expect(rows[0]).toHaveTextContent("10%");
    expect(rows[0]).toHaveTextContent("Tiến độ thấp nhất");
    expect(topics).not.toHaveTextContent("Chưa bắt đầu");
    expect(screen.getByRole("link", { name: "Xem tất cả" })).toHaveAttribute("href", "/topics");
  });

  it("keeps summary errors recoverable", async () => {
    const fetchMock = mockDashboardFetch({ failFirstSummary: true });
    renderProgress();

    expect(await screen.findByTestId("progress-error")).toHaveTextContent("Không thể tải tiến trình lúc này. Vui lòng thử lại.");
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    await waitFor(() => expect(screen.getByTestId("progress-summary")).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("retries a failed Topic progress read without reloading dashboard summary", async () => {
    const fetchMock = mockDashboardFetch();
    requestTopicProgress
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(topicProgress(learnerA.id));
    renderProgress();

    expect(await screen.findByRole("heading", { name: "Không thể tải tiến độ chủ đề" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));

    await waitFor(() => expect(requestTopicProgress).toHaveBeenCalledTimes(2));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("topic-progress-list")).toBeInTheDocument();
  });

  it("retries only the selected-period history read after chart failure", async () => {
    const fetchMock = mockDashboardFetch();
    requestProgressHistory
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(history(learnerA.id));
    renderProgress();

    expect(await screen.findByRole("heading", { name: "Không thể tải hoạt động" })).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Thử lại" })[0]!);

    await waitFor(() => expect(requestProgressHistory).toHaveBeenCalledTimes(2));
    expect(requestProgressHistory).toHaveBeenLastCalledWith(learnerA.id, "2026-09-14", "2026-09-20");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(await screen.findByTestId("activity-chart")).toBeInTheDocument();
  });

  it("refreshes on learner changes without retaining the previous learner's data", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      const id = url.includes(learnerB.id) ? learnerB.id : learnerA.id;
      return Promise.resolve(url.includes("activity-summary")
        ? response(activity(id))
        : response(summary(id, { learnedCount: id === learnerA.id ? 1 : 9 })));
    });

    function SwitchHarness() {
      const { setActiveLearner } = useActiveLearner();
      return (
        <>
          <button type="button" onClick={() => setActiveLearner(learnerB)}>Switch learner</button>
          <ProgressPage />
        </>
      );
    }

    render(
      <MemoryRouter initialEntries={["/progress"]}><AccountRouteProbe />
        <ToastProvider><ActiveLearnerProvider initialLearner={learnerA}><SwitchHarness /></ActiveLearnerProvider></ToastProvider>
      </MemoryRouter>
    );

    expect(await screen.findByRole("heading", { name: "Tiến trình học tập" })).toBeInTheDocument();
    expect(screen.queryByText("Tiến trình của An")).not.toBeInTheDocument();
    expect(metric("progress-metric-learned")).toHaveTextContent("1");
    fireEvent.click(screen.getByRole("button", { name: "Switch learner" }));
    expect(await screen.findByRole("heading", { name: "Tiến trình học tập" })).toBeInTheDocument();
    expect(screen.queryByText("Tiến trình của Bình")).not.toBeInTheDocument();
    await waitFor(() => expect(metric("progress-metric-learned")).toHaveTextContent("9"));
    expect(screen.queryByText("Tiến trình của An")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenNthCalledWith(1, `/api/learners/${learnerA.id}/progress-summary`, { credentials: "include" });
    expect(fetchMock).toHaveBeenNthCalledWith(3, `/api/learners/${learnerB.id}/progress-summary`, { credentials: "include" });
  });

  it("waits for internal identity at the original route without learner selection", async () => {
    renderProgress(null);
    expect(await screen.findByRole("status", { name: "Đang chuẩn bị học tập…" })).toBeInTheDocument();
    expect(screen.getByTestId("account-route")).toHaveTextContent("/progress");
    expect(screen.queryByText("learners-route")).not.toBeInTheDocument();
  });

  it("retains reset confirmation, duplicate-submit protection, and refresh", async () => {
    const resetResponse = { learnerId: learnerA.id, deletedProgressCount: 2 };
    let resolveReset!: (value: typeof resetResponse) => void;
    requestResetLearnerProgress.mockReturnValue(new Promise((resolve) => { resolveReset = resolve; }));
    mockDashboardFetch({
      summaryFor: (calls) => calls > 1
        ? summary(learnerA.id, { newCount: 30, learningCount: 0, masteredCount: 0, dueCount: 0, learnedCount: 0, progressByLevel: [] })
        : summary(learnerA.id, { learnedCount: 2 })
    });
    renderProgress();
    await screen.findByTestId("progress-summary");

    fireEvent.click(screen.getByText("Quản lý tiến trình"));
    const resetTrigger = screen.getByRole("button", { name: "Đặt lại tiến trình" });
    fireEvent.click(resetTrigger);
    expect(screen.getByRole("dialog")).toHaveTextContent("Đặt lại tiến trình của bạn?");
    expect(screen.getByRole("dialog")).toHaveTextContent("lịch sử ôn tập vẫn được giữ lại");
    expect(screen.getByRole("button", { name: "Hủy" })).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Hủy" }));
    expect(requestResetLearnerProgress).not.toHaveBeenCalled();
    expect(resetTrigger).toHaveFocus();

    fireEvent.click(resetTrigger);
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận đặt lại" }));
    fireEvent.click(screen.getByRole("button", { name: "Đang đặt lại…" }));
    expect(requestResetLearnerProgress).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Đang đặt lại…" })).toBeDisabled();
    resolveReset(resetResponse);

    await waitFor(() => expect(screen.getByTestId("progress-empty-state")).toBeInTheDocument());
    expect(screen.getByTestId("toast-success")).toHaveTextContent("Đã đặt lại tiến trình");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(resetTrigger).toHaveFocus();
  });

  it("closes reset confirmation with Escape and traps keyboard focus", async () => {
    mockDashboardFetch();
    renderProgress();
    await screen.findByTestId("progress-summary");
    fireEvent.click(screen.getByText("Quản lý tiến trình"));
    const resetTrigger = screen.getByRole("button", { name: "Đặt lại tiến trình" });
    fireEvent.click(resetTrigger);
    const cancel = screen.getByRole("button", { name: "Hủy" });
    const confirm = screen.getByRole("button", { name: "Xác nhận đặt lại" });

    expect(cancel).toHaveFocus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(confirm).toHaveFocus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(cancel).toHaveFocus();
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(resetTrigger).toHaveFocus();
    expect(requestResetLearnerProgress).not.toHaveBeenCalled();
  });

  it("keeps reset dialog usable after a reset error", async () => {
    requestResetLearnerProgress.mockRejectedValue(new Error("network"));
    mockDashboardFetch();
    renderProgress();
    await screen.findByTestId("progress-summary");
    fireEvent.click(screen.getByText("Quản lý tiến trình"));
    fireEvent.click(screen.getByRole("button", { name: "Đặt lại tiến trình" }));
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận đặt lại" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Không thể đặt lại tiến trình lúc này. Vui lòng thử lại.");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Xác nhận đặt lại" })).toBeEnabled();
  });
});

function AccountRouteProbe() { const route = useLocation(); return <output data-testid="account-route">{route.pathname}{route.search}</output>; }
