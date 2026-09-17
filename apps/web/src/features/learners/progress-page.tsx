import { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router";
import type { LearnerDto, ProgressSummaryResponse } from "@vocabflow/contracts";
import { useActiveLearner } from "./learner-context-hook";
import { ProgressSummaryClientError, requestProgressSummary } from "./progress-summary-client";

type ProgressState = "loading" | "ready" | "error";

function progressErrorMessage(error: unknown) {
  if (error instanceof ProgressSummaryClientError && (error.status === 401 || error.code === "UNAUTHORIZED")) {
    return "Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.";
  }
  if (error instanceof ProgressSummaryClientError && (error.status === 403 || error.code === "HOUSEHOLD_ACCESS_DENIED")) {
    return "Không thể xem tiến trình của learner này.";
  }
  return "Không thể tải tiến trình lúc này. Vui lòng thử lại.";
}

export function ProgressPage() {
  const { activeLearner } = useActiveLearner();
  if (!activeLearner) return <Navigate to="/learners" replace />;
  return <ProgressExperience key={activeLearner.id} activeLearner={activeLearner} />;
}

function ProgressExperience({ activeLearner }: { activeLearner: LearnerDto }) {
  const [state, setState] = useState<ProgressState>("loading");
  const [summary, setSummary] = useState<ProgressSummaryResponse | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    setState("loading");
    setSummary(null);
    setMessage(null);
    try {
      const response = await requestProgressSummary(activeLearner.id);
      setSummary(response);
      setState("ready");
    } catch (error) {
      setState("error");
      setMessage(progressErrorMessage(error));
    }
  }, [activeLearner.id]);

  useEffect(() => {
    let cancelled = false;
    void requestProgressSummary(activeLearner.id)
      .then((response) => {
        if (cancelled) return;
        setSummary(response);
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
          </div>
        ) : null}
      </section>
    </main>
  );
}
