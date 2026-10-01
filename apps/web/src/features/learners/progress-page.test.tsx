import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import type {
  ActivitySummaryResponse,
  GamificationResponse,
  LearnerDto,
  ProgressHistoryResponse,
  ProgressSummaryResponse,
  TopicProgressResponse
} from "@vocabflow/contracts";
import { ActiveLearnerProvider } from "./learner-context-provider";
import { useActiveLearner } from "./learner-context-hook";
import { ProgressPage } from "./progress-page";

const { requestResetLearnerProgress, requestProgressHistory, requestTopicProgress, requestGamification } = vi.hoisted(() => ({
  requestResetLearnerProgress: vi.fn(),
  requestProgressHistory: vi.fn(),
  requestTopicProgress: vi.fn(),
  requestGamification: vi.fn()
}));

vi.mock("./reset-progress-client", async () => {
  const actual = await vi.importActual<typeof import("./reset-progress-client")>("./reset-progress-client");
  return { ...actual, requestResetLearnerProgress };
});

vi.mock("./progress-insights-client", async () => {
  const actual = await vi.importActual<typeof import("./progress-insights-client")>("./progress-insights-client");
  return { ...actual, requestProgressHistory, requestTopicProgress };
});

vi.mock("./gamification-client", async () => {
  const actual = await vi.importActual<typeof import("./gamification-client")>("./gamification-client");
  return { ...actual, requestGamification };
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
    learnedCount: values.learnedCount ?? 5
  };
}

function activity(learnerId: string, values: Partial<ActivitySummaryResponse["dailyGoal"]> = {}): ActivitySummaryResponse {
  return {
    learnerId,
    localDate: "2026-09-20",
    dailyGoal: {
      goal: values.goal ?? 10,
      reviewedUnique: values.reviewedUnique ?? 0,
      remaining: values.remaining ?? Math.max(0, (values.goal ?? 10) - (values.reviewedUnique ?? 0)),
      completed: values.completed ?? false
    },
    streak: { currentStreak: 0, longestStreak: 0, todayActive: false }
  };
}

function history(learnerId: string): ProgressHistoryResponse {
  return {
    learnerId,
    timezone: "Asia/Ho_Chi_Minh",
    from: "2026-09-14",
    to: "2026-09-20",
    days: Array.from({ length: 7 }, (_, index) => ({
      date: `2026-09-${String(index + 14).padStart(2, "0")}`,
      reviews: index === 6 ? 2 : 0,
      uniqueWords: index === 6 ? 1 : 0,
      remembered: index === 6 ? 1 : 0,
      forgotten: index === 6 ? 1 : 0,
      newLearned: index === 6 ? 1 : 0
    }))
  };
}

function topicProgress(learnerId: string): TopicProgressResponse {
  return {
    learnerId,
    localDate: "2026-09-20",
    topics: [{ topicId: 1, slug: "family", name: "Gia đình", total: 2, newCount: 1, learningCount: 1, masteredCount: 0, dueCount: 1 }]
  };
}

function gamification(learnerId: string): GamificationResponse {
  return {
    learnerId,
    xp: { total: 100, level: 2, xpIntoLevel: 0, xpPerLevel: 100, xpToNextLevel: 100 },
    achievements: [{ code: "FIRST_REVIEW", name: "Bắt đầu học", description: "Hoàn thành lần ôn tập đầu tiên.", unlockedAt: null }]
  };
}

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function renderProgress(initialLearner: LearnerDto | null = learnerA) {
  return render(
    <MemoryRouter initialEntries={["/progress"]}>
      <ActiveLearnerProvider initialLearner={initialLearner}>
        <Routes>
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/learners" element={<p>learners-route</p>} />
        </Routes>
      </ActiveLearnerProvider>
    </MemoryRouter>
  );
}

function metric(label: string) {
  return screen.getByTestId("progress-summary").querySelector(".progress-grid")
    ?.querySelectorAll("dt")
    ? Array.from(screen.getByTestId("progress-summary").querySelectorAll(".progress-grid dt"))
      .find((element) => element.textContent === label)?.nextElementSibling
    : null;
}

describe("US-20 learner progress UI", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    requestResetLearnerProgress.mockReset();
    requestProgressHistory.mockResolvedValue(history(learnerA.id));
    requestTopicProgress.mockResolvedValue(topicProgress(learnerA.id));
    requestGamification.mockResolvedValue(gamification(learnerA.id));
  });

  it("shows loading and then all canonical progress cards", async () => {
    let resolveProgress!: (value: Response) => void;
    let resolveActivity!: (value: Response) => void;
    const pendingProgress = new Promise<Response>((resolve) => { resolveProgress = resolve; });
    const pendingActivity = new Promise<Response>((resolve) => { resolveActivity = resolve; });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input) =>
      String(input).includes("activity-summary") ? pendingActivity : pendingProgress
    );
    renderProgress();

    expect(screen.getByTestId("progress-loading")).toBeInTheDocument();
    resolveProgress(response(summary(learnerA.id)));
    resolveActivity(response(activity(learnerA.id, { reviewedUnique: 7, remaining: 3 })));

    expect(await screen.findByTestId("progress-summary")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Tiến trình của An" })).toBeInTheDocument();
    expect(metric("Từ mới")).toHaveTextContent("30");
    expect(metric("Đang học")).toHaveTextContent("2");
    expect(metric("Đã thành thạo")).toHaveTextContent("3");
    expect(metric("Cần ôn tập")).toHaveTextContent("4");
    expect(metric("Đã học")).toHaveTextContent("5");
    expect(screen.getByTestId("daily-goal")).toHaveTextContent("7 / 10");
    expect(screen.getByTestId("streak-summary")).toHaveTextContent("0 ngày liên tiếp");
    expect(fetchMock).toHaveBeenCalledWith("/api/learners/" + learnerA.id + "/progress-summary", { credentials: "include" });
    expect(fetchMock).toHaveBeenCalledWith("/api/learners/" + learnerA.id + "/activity-summary", { credentials: "include" });
  });

  it("shows the explicit empty state without inventing learned words", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => Promise.resolve(
      String(input).includes("activity-summary")
        ? response(activity(learnerA.id))
        : response(summary(learnerA.id, {
          newCount: 30,
          learningCount: 0,
          masteredCount: 0,
          dueCount: 0,
          learnedCount: 0
        }))
    ));
    renderProgress();

    expect(await screen.findByTestId("progress-empty-state")).toHaveTextContent("Chưa học từ nào");
    expect(metric("Từ mới")).toHaveTextContent("30");
    expect(metric("Đã học")).toHaveTextContent("0");
  });

  it("renders the seven local days and learner-scoped topic progress", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => Promise.resolve(
      String(input).includes("activity-summary") ? response(activity(learnerA.id)) : response(summary(learnerA.id))
    ));
    renderProgress();

    expect(await screen.findByTestId("weekly-progress")).toBeInTheDocument();
    expect(screen.getAllByText("0 từ")).toHaveLength(6);
    expect(screen.getByTestId("topic-progress-list")).toHaveTextContent("Gia đình");
    expect(requestProgressHistory).toHaveBeenCalledWith(learnerA.id, "2026-09-14", "2026-09-20");
    expect(requestTopicProgress).toHaveBeenCalledWith(learnerA.id);
    expect(screen.getByTestId("xp-summary")).toHaveTextContent("Tổng điểm kinh nghiệm");
    expect(screen.getByTestId("xp-summary")).toHaveTextContent("100");
    expect(screen.getByTestId("xp-summary")).not.toHaveTextContent("XP");
    expect(screen.getByTestId("achievement-list")).toHaveTextContent("Chưa mở khóa");
  });

  it("shows a safe retry state after a progress request failure", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      if (!String(input).includes("activity-summary") && fetchMock.mock.calls.length === 1) {
        return Promise.resolve(response({ error: { code: "INTERNAL_ERROR" } }, 503));
      }
      return Promise.resolve(String(input).includes("activity-summary") ? response(activity(learnerA.id)) : response(summary(learnerA.id)));
    });
    renderProgress();

    expect(await screen.findByTestId("progress-error")).toHaveTextContent("Không thể tải tiến trình lúc này. Vui lòng thử lại.");
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    await waitFor(() => expect(screen.getByTestId("progress-summary")).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("refreshes by learner id and never keeps the previous learner summary", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      const id = url.includes(learnerB.id) ? learnerB.id : learnerA.id;
      return Promise.resolve(url.includes("activity-summary") ? response(activity(id)) : response(summary(id, { learnedCount: id === learnerA.id ? 1 : 9 })));
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
      <MemoryRouter initialEntries={["/progress"]}>
        <ActiveLearnerProvider initialLearner={learnerA}>
          <SwitchHarness />
        </ActiveLearnerProvider>
      </MemoryRouter>
    );

    expect(await screen.findByRole("heading", { name: "Tiến trình của An" })).toBeInTheDocument();
    expect(metric("Đã học")).toHaveTextContent("1");
    fireEvent.click(screen.getByRole("button", { name: "Switch learner" }));
    expect(await screen.findByRole("heading", { name: "Tiến trình của Bình" })).toBeInTheDocument();
    await waitFor(() => expect(metric("Đã học")).toHaveTextContent("9"));
    expect(screen.queryByText("Tiến trình của An")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/learners/" + learnerA.id + "/progress-summary", { credentials: "include" });
    expect(fetchMock).toHaveBeenNthCalledWith(3, "/api/learners/" + learnerB.id + "/progress-summary", { credentials: "include" });
  });

  it("redirects to learner home when no active learner exists", async () => {
    renderProgress(null);
    expect(await screen.findByText("learners-route")).toBeInTheDocument();
  });

  it("requires confirmation, locks duplicate reset submits, and refreshes the summary", async () => {
    const resetResponse = { learnerId: learnerA.id, deletedProgressCount: 2 };
    let resolveReset!: (value: typeof resetResponse) => void;
    requestResetLearnerProgress.mockReturnValue(new Promise((resolve) => { resolveReset = resolve; }));
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      const isActivity = url.includes("activity-summary");
      const isAfterReset = fetchMock.mock.calls.filter(([value]) => String(value).includes("progress-summary")).length > 1;
      return Promise.resolve(isActivity ? response(activity(learnerA.id)) : response(summary(learnerA.id, isAfterReset
        ? { newCount: 30, learningCount: 0, masteredCount: 0, dueCount: 0, learnedCount: 0 }
        : { learnedCount: 2 })));
    });
    renderProgress();

    await screen.findByTestId("progress-summary");
    fireEvent.click(screen.getByRole("button", { name: "Đặt lại tiến trình" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Đặt lại tiến trình của An?");
    expect(screen.getByRole("dialog")).toHaveTextContent("lịch sử ôn tập vẫn được giữ lại");
    fireEvent.click(screen.getByRole("button", { name: "Hủy" }));
    expect(requestResetLearnerProgress).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Đặt lại tiến trình" }));
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận đặt lại" }));
    fireEvent.click(screen.getByRole("button", { name: "Đang đặt lại…" }));
    expect(requestResetLearnerProgress).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Đang đặt lại…" })).toBeDisabled();
    resolveReset(resetResponse);

    await waitFor(() => expect(screen.getByTestId("progress-empty-state")).toBeInTheDocument());
    expect(screen.getByText("Đã đặt lại tiến trình của An.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("keeps the dialog open and usable after reset failure", async () => {
    requestResetLearnerProgress.mockRejectedValue(new Error("network"));
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => Promise.resolve(
      String(input).includes("activity-summary") ? response(activity(learnerA.id)) : response(summary(learnerA.id))
    ));
    renderProgress();
    await screen.findByTestId("progress-summary");
    fireEvent.click(screen.getByRole("button", { name: "Đặt lại tiến trình" }));
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận đặt lại" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Không thể đặt lại tiến trình lúc này. Vui lòng thử lại.");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Xác nhận đặt lại" })).toBeEnabled();
  });
});
