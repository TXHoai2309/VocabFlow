import { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router";
import type {
  ActivitySummaryResponse,
  LearnerDto,
  GamificationResponse,
  ProgressHistoryResponse,
  ProgressSummaryResponse,
  TopicProgressResponse
} from "@vocabflow/contracts";
import { useActiveLearner } from "./learner-context-hook";
import { ProgressSummaryClientError, requestProgressSummary } from "./progress-summary-client";
import { ActivitySummaryClientError, requestActivitySummary } from "./activity-summary-client";
import {
  requestProgressHistory,
  requestTopicProgress
} from "./progress-insights-client";
import { requestGamification } from "./gamification-client";
import {
  requestResetLearnerProgress,
  ResetLearnerProgressClientError
} from "./reset-progress-client";

type ProgressState = "loading" | "ready" | "error";
type InsightState = "loading" | "ready" | "error";

function dateMinus(value: string, days: number): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day - days)).toISOString().slice(0, 10);
}

function weekday(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", { weekday: "short", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

function progressErrorMessage(error: unknown) {
  if (
    (error instanceof ProgressSummaryClientError || error instanceof ActivitySummaryClientError)
    && (error.status === 401 || error.code === "UNAUTHORIZED")
  ) {
    return "Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.";
  }
  if (
    (error instanceof ProgressSummaryClientError || error instanceof ActivitySummaryClientError)
    && (error.status === 403 || error.code === "HOUSEHOLD_ACCESS_DENIED")
  ) {
    return "Không thể xem tiến trình của người học này.";
  }
  return "Không thể tải tiến trình lúc này. Vui lòng thử lại.";
}

function resetErrorMessage(error: unknown) {
  if (error instanceof ResetLearnerProgressClientError && (error.status === 401 || error.code === "UNAUTHORIZED")) {
    return "Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.";
  }
  if (error instanceof ResetLearnerProgressClientError && (error.status === 403 || error.code === "HOUSEHOLD_ACCESS_DENIED")) {
    return "Không thể đặt lại tiến trình của người học này.";
  }
  return "Không thể đặt lại tiến trình lúc này. Vui lòng thử lại.";
}

export function ProgressPage() {
  const { activeLearner } = useActiveLearner();
  if (!activeLearner) return <Navigate to="/learners" replace />;
  return <ProgressExperience key={activeLearner.id} activeLearner={activeLearner} />;
}

function ProgressExperience({ activeLearner }: { activeLearner: LearnerDto }) {
  const [state, setState] = useState<ProgressState>("loading");
  const [summary, setSummary] = useState<ProgressSummaryResponse | null>(null);
  const [activity, setActivity] = useState<ActivitySummaryResponse | null>(null);
  const [history, setHistory] = useState<ProgressHistoryResponse | null>(null);
  const [topicProgress, setTopicProgress] = useState<TopicProgressResponse | null>(null);
  const [gamification, setGamification] = useState<GamificationResponse | null>(null);
  const [gamificationState, setGamificationState] = useState<InsightState>("loading");
  const [insightState, setInsightState] = useState<InsightState>("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    setState("loading");
    setSummary(null);
    setActivity(null);
    setHistory(null);
    setTopicProgress(null);
    setGamification(null);
    setMessage(null);
    try {
      const [response, activityResponse] = await Promise.all([
        requestProgressSummary(activeLearner.id),
        requestActivitySummary(activeLearner.id)
      ]);
      setSummary(response);
      setActivity(activityResponse);
      setState("ready");
      const from = dateMinus(activityResponse.localDate, 6);
      setInsightState("loading");
      void Promise.all([
        requestProgressHistory(activeLearner.id, from, activityResponse.localDate),
        requestTopicProgress(activeLearner.id)
      ]).then(([historyResponse, topicResponse]) => {
        setHistory(historyResponse);
        setTopicProgress(topicResponse);
        setInsightState("ready");
      }).catch(() => setInsightState("error"));
      setGamificationState("loading");
      void requestGamification(activeLearner.id).then((response) => {
        setGamification(response);
        setGamificationState("ready");
      }).catch(() => setGamificationState("error"));
    } catch (error) {
      setState("error");
      setMessage(progressErrorMessage(error));
    }
  }, [activeLearner.id]);

  async function handleReset() {
    if (resetSubmitting) return;
    setResetSubmitting(true);
    setResetError(null);
    setResetSuccess(null);
    try {
      await requestResetLearnerProgress(activeLearner.id);
      setResetOpen(false);
          setResetSuccess(`Đã đặt lại tiến trình của ${activeLearner.displayName}.`);
      // Reload the canonical summary immediately; vocabulary and queue are
      // likewise fetched fresh when their learner-scoped pages open.
      await loadSummary();
    } catch (error) {
      setResetError(resetErrorMessage(error));
    } finally {
      setResetSubmitting(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      requestProgressSummary(activeLearner.id),
      requestActivitySummary(activeLearner.id)
    ])
      .then(([response, activityResponse]) => {
        if (cancelled) return;
        setSummary(response);
        setActivity(activityResponse);
        setState("ready");
        const from = dateMinus(activityResponse.localDate, 6);
        setInsightState("loading");
        void Promise.all([
          requestProgressHistory(activeLearner.id, from, activityResponse.localDate),
          requestTopicProgress(activeLearner.id)
        ]).then((insights) => {
          if (cancelled) return;
          setHistory(insights[0]);
          setTopicProgress(insights[1]);
          setInsightState("ready");
        }).catch(() => {
          if (!cancelled) setInsightState("error");
        });
        setGamificationState("loading");
        void requestGamification(activeLearner.id).then((gamificationResponse) => {
          if (cancelled) return;
          setGamification(gamificationResponse);
          setGamificationState("ready");
        }).catch(() => {
          if (!cancelled) setGamificationState("error");
        });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState("error");
        setMessage(progressErrorMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, [activeLearner.id]);

  return (
    <main className="learner-page" aria-labelledby="progress-title">
      <section className="learner-card progress-card">
        <div className="progress-topbar">
          <Link className="back-link" to="/learners">← Về trang người học</Link>
          <p className="study-learner">Người học: <strong>{activeLearner.displayName}</strong></p>
        </div>
        <p className="auth-eyebrow">Tiến trình</p>
        <h1 className="auth-title" id="progress-title">Tiến trình của {activeLearner.displayName}</h1>

        {resetSuccess ? <p className="progress-success" role="status">{resetSuccess}</p> : null}

        {state === "loading" ? (
          <div className="progress-state" data-testid="progress-loading" role="status">Đang tải tiến trình…</div>
        ) : null}

        {state === "error" ? (
          <div className="progress-state progress-error" data-testid="progress-error" role="alert">
            <p>{message}</p>
            <button className="auth-retry" type="button" onClick={() => void loadSummary()}>Thử lại</button>
          </div>
        ) : null}

        {state === "ready" && summary ? (
          <div className="progress-content" data-testid="progress-summary">
            {summary.learnedCount === 0 ? (
              <div className="progress-empty" data-testid="progress-empty-state" role="status">
                <h2>Chưa học từ nào</h2>
                <p>Bắt đầu phiên học để tạo tiến trình đầu tiên.</p>
              </div>
            ) : null}
            <dl className="progress-grid">
              <div><dt>Từ mới</dt><dd>{summary.newCount}</dd></div>
              <div><dt>Đang học</dt><dd>{summary.learningCount}</dd></div>
              <div><dt>Đã thành thạo</dt><dd>{summary.masteredCount}</dd></div>
              <div><dt>Cần ôn tập</dt><dd>{summary.dueCount}</dd></div>
              <div><dt>Đã học</dt><dd>{summary.learnedCount}</dd></div>
            </dl>
            {activity ? (
              <section className="progress-activity" data-testid="activity-summary" aria-labelledby="activity-summary-title">
                <h2 id="activity-summary-title">Hoạt động hôm nay</h2>
                <div className="progress-activity-grid">
                  <div data-testid="daily-goal">
                    <span>Mục tiêu hôm nay · {activity.dailyGoal.overallPercent}%</span>
                    <strong>{activity.dailyGoal.newWords.completed} / {activity.dailyGoal.newWords.goal} từ mới · {activity.dailyGoal.reviews.completed} / {activity.dailyGoal.reviews.goal} ôn tập</strong>
                    <small>{activity.dailyGoal.completed ? "Đã hoàn thành mục tiêu hôm nay" : `Còn ${activity.dailyGoal.newWords.remaining} từ mới và ${activity.dailyGoal.reviews.remaining} từ ôn tập`}</small>
                  </div>
                  <div data-testid="streak-summary">
                    <span>Chuỗi hiện tại</span>
                    <strong>{activity.streak.currentStreak} ngày liên tiếp</strong>
                    <small>Kỷ lục: {activity.streak.longestStreak} ngày</small>
                  </div>
                </div>
              </section>
            ) : null}
            <section className="progress-insights" aria-labelledby="weekly-progress-title">
              <div className="progress-insights-heading">
                <div>
                  <h2 id="weekly-progress-title">7 ngày gần đây</h2>
                  <p>Gồm hôm nay và 6 ngày trước theo lịch của gia đình.</p>
                </div>
              </div>
              {insightState === "loading" ? <p data-testid="progress-insights-loading" role="status">Đang tải tiến trình theo ngày…</p> : null}
              {insightState === "error" ? <p data-testid="progress-insights-error" className="progress-inline-error" role="alert">Không thể tải chi tiết theo ngày và chủ đề lúc này.</p> : null}
              {insightState === "ready" && history ? (
                <div className="weekly-progress" data-testid="weekly-progress">
                  {history.days.map((day) => (
                    <details className="weekly-progress-day" key={day.date}>
                      <summary><span>{weekday(day.date)}</span><strong>{day.uniqueWords} từ</strong><small>{day.reviews} lượt ôn tập</small></summary>
                      <dl>
                        <div><dt>Đã nhớ</dt><dd>{day.remembered}</dd></div>
                        <div><dt>Chưa nhớ</dt><dd>{day.forgotten}</dd></div>
                        <div><dt>Từ mới học</dt><dd>{day.newLearned}</dd></div>
                      </dl>
                    </details>
                  ))}
                </div>
              ) : null}
            </section>
            <section className="progress-insights" aria-labelledby="topic-progress-title">
              <h2 id="topic-progress-title">Tiến trình theo chủ đề</h2>
              {insightState === "ready" && topicProgress?.topics.length === 0 ? <p data-testid="topic-progress-empty">Chưa có chủ đề khả dụng.</p> : null}
              {insightState === "ready" && topicProgress && topicProgress.topics.length > 0 ? (
                <div className="topic-progress-list" data-testid="topic-progress-list">
                  {topicProgress.topics.map((topic) => (
                    <article className="topic-progress-row" key={topic.topicId}>
                      <div><h3>{topic.name}</h3><p>{topic.masteredCount} / {topic.total} đã thành thạo</p></div>
                      <dl><div><dt>Từ mới</dt><dd>{topic.newCount}</dd></div><div><dt>Đang học</dt><dd>{topic.learningCount}</dd></div><div><dt>Đã thành thạo</dt><dd>{topic.masteredCount}</dd></div><div><dt>Cần ôn tập</dt><dd>{topic.dueCount}</dd></div></dl>
                    </article>
                  ))}
                </div>
              ) : null}
              {insightState === "ready" && topicProgress?.topics.every((topic) => topic.total === 0) ? <p className="topic-progress-note">Các từ đang học hiện chưa được phân loại theo chủ đề.</p> : null}
            </section>
            <section className="progress-insights" aria-labelledby="gamification-title">
              <h2 id="gamification-title">Cấp độ và huy hiệu</h2>
              {gamificationState === "loading" ? <p data-testid="gamification-loading" role="status">Đang tải điểm kinh nghiệm và huy hiệu…</p> : null}
              {gamificationState === "error" ? <p data-testid="gamification-error" className="progress-inline-error" role="alert">Không thể tải điểm kinh nghiệm và huy hiệu lúc này.</p> : null}
              {gamificationState === "ready" && gamification ? <>
                <div className="xp-summary" data-testid="xp-summary">
                  <div><span>Cấp độ</span><strong>{gamification.xp.level}</strong></div>
                  <div><span>Tổng điểm kinh nghiệm</span><strong>{gamification.xp.total}</strong></div>
                  <p>{gamification.xp.xpIntoLevel} / {gamification.xp.xpPerLevel} điểm kinh nghiệm để lên cấp độ {gamification.xp.level + 1}</p>
                </div>
                <div className="achievement-list" data-testid="achievement-list">
                  {gamification.achievements.map((achievement) => <article className="achievement-row" key={achievement.code}>
                    <div><h3>{achievement.name}</h3><p>{achievement.description}</p></div>
                    {achievement.unlockedAt ? <time dateTime={achievement.unlockedAt}>Đã mở khóa</time> : <span>Chưa mở khóa</span>}
                  </article>)}
                </div>
              </> : null}
            </section>
          </div>
        ) : null}

        <div className="progress-danger-zone">
          <h2>Quản lý tiến trình</h2>
          <p>Việc đặt lại chỉ xóa tiến trình hiện tại của người học này. Lịch sử ôn tập vẫn được giữ lại.</p>
          <button
            className="progress-reset-button"
            type="button"
            onClick={() => {
              setResetError(null);
              setResetSuccess(null);
              setResetOpen(true);
            }}
            disabled={resetSubmitting}
          >
            Đặt lại tiến trình
          </button>
        </div>
      </section>

      {resetOpen ? (
        <div className="reset-dialog-backdrop">
          <section
            className="reset-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-progress-title"
            aria-describedby="reset-progress-description"
          >
            <h2 id="reset-progress-title">Đặt lại tiến trình của {activeLearner.displayName}?</h2>
            <p id="reset-progress-description">
              Tiến trình học hiện tại của người học này sẽ được đưa về trạng thái từ mới. Chỉ người học này bị ảnh hưởng;
              lịch sử ôn tập vẫn được giữ lại.
            </p>
            {resetError ? <p className="reset-dialog-error" role="alert">{resetError}</p> : null}
            <div className="reset-dialog-actions">
              <button
                className="auth-retry reset-dialog-cancel"
                type="button"
                onClick={() => setResetOpen(false)}
                disabled={resetSubmitting}
              >
                Hủy
              </button>
              <button
                className="progress-reset-button"
                type="button"
                onClick={() => void handleReset()}
                disabled={resetSubmitting}
                aria-busy={resetSubmitting}
              >
                {resetSubmitting ? "Đang đặt lại…" : "Xác nhận đặt lại"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
