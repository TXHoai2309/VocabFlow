import { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router";
import type { ActivitySummaryResponse, LearnerDto, ProgressSummaryResponse } from "@vocabflow/contracts";
import { useActiveLearner } from "./learner-context-hook";
import { ProgressSummaryClientError, requestProgressSummary } from "./progress-summary-client";
import { ActivitySummaryClientError, requestActivitySummary } from "./activity-summary-client";
import {
  requestResetLearnerProgress,
  ResetLearnerProgressClientError
} from "./reset-progress-client";

type ProgressState = "loading" | "ready" | "error";

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
    return "Không thể xem tiến trình của learner này.";
  }
  return "Không thể tải tiến trình lúc này. Vui lòng thử lại.";
}

function resetErrorMessage(error: unknown) {
  if (error instanceof ResetLearnerProgressClientError && (error.status === 401 || error.code === "UNAUTHORIZED")) {
    return "Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.";
  }
  if (error instanceof ResetLearnerProgressClientError && (error.status === 403 || error.code === "HOUSEHOLD_ACCESS_DENIED")) {
    return "Không thể reset tiến trình của learner này.";
  }
  return "Không thể reset tiến trình lúc này. Vui lòng thử lại.";
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
  const [message, setMessage] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    setState("loading");
    setSummary(null);
    setActivity(null);
    setMessage(null);
    try {
      const [response, activityResponse] = await Promise.all([
        requestProgressSummary(activeLearner.id),
        requestActivitySummary(activeLearner.id)
      ]);
      setSummary(response);
      setActivity(activityResponse);
      setState("ready");
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
      setResetSuccess(`Đã reset tiến trình của ${activeLearner.displayName}.`);
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
          <Link className="back-link" to="/learners">← Về learner home</Link>
          <p className="study-learner">Learner: <strong>{activeLearner.displayName}</strong></p>
        </div>
        <p className="auth-eyebrow">Progress</p>
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
              <div><dt>New</dt><dd>{summary.newCount}</dd></div>
              <div><dt>Learning</dt><dd>{summary.learningCount}</dd></div>
              <div><dt>Mastered</dt><dd>{summary.masteredCount}</dd></div>
              <div><dt>Due</dt><dd>{summary.dueCount}</dd></div>
              <div><dt>Learned</dt><dd>{summary.learnedCount}</dd></div>
            </dl>
            {activity ? (
              <section className="progress-activity" data-testid="activity-summary" aria-labelledby="activity-summary-title">
                <h2 id="activity-summary-title">Hoạt động hôm nay</h2>
                <div className="progress-activity-grid">
                  <div data-testid="daily-goal">
                    <span>Mục tiêu học</span>
                    <strong>{activity.dailyGoal.reviewedUnique} / {activity.dailyGoal.goal}</strong>
                    <small>{activity.dailyGoal.completed ? "Đã hoàn thành mục tiêu hôm nay" : `Còn ${activity.dailyGoal.remaining} từ`}</small>
                  </div>
                  <div data-testid="streak-summary">
                    <span>Chuỗi hiện tại</span>
                    <strong>{activity.streak.currentStreak} ngày liên tiếp</strong>
                    <small>Kỷ lục: {activity.streak.longestStreak} ngày</small>
                  </div>
                </div>
              </section>
            ) : null}
          </div>
        ) : null}

        <div className="progress-danger-zone">
          <h2>Quản lý tiến trình</h2>
          <p>Reset chỉ xóa tiến trình hiện tại của learner này. Lịch sử review vẫn được giữ lại.</p>
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
            Reset tiến trình
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
            <h2 id="reset-progress-title">Reset tiến trình của {activeLearner.displayName}?</h2>
            <p id="reset-progress-description">
              Tiến trình học hiện tại của learner này sẽ được đưa về từ mới. Chỉ learner này bị ảnh hưởng;
              lịch sử review vẫn được giữ lại.
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
                {resetSubmitting ? "Đang reset…" : "Xác nhận reset"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
