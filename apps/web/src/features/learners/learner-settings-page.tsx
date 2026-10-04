import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router";
import {
  DAILY_WORD_GOAL_MAX,
  DAILY_WORD_GOAL_MIN,
  DAILY_NEW_WORD_LIMIT_MAX,
  DAILY_NEW_WORD_LIMIT_MIN,
  type LearnerDto
} from "@vocabflow/contracts";
import { useActiveLearner } from "./learner-context-hook";
import {
  LearnerSettingsClientError,
  requestLearnerSettings,
  updateLearnerSettings
} from "./learner-settings-client";

type LoadState = "loading" | "ready" | "error";
type SettingsField = "dailyNewWordLimit" | "dailyNewWordGoal" | "dailyReviewWordGoal";

function errorMessage(error: unknown) {
  if (error instanceof LearnerSettingsClientError && error.status === 401) return "Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.";
  if (error instanceof LearnerSettingsClientError && error.status === 403) return "Bạn không có quyền thay đổi hồ sơ người học này.";
  return "Không thể tải cài đặt người học lúc này. Vui lòng thử lại.";
}

function validateDraft(value: string, min: number, max: number): string | null {
  if (!/^\d+$/.test(value)) return `Nhập một số nguyên từ ${min} đến ${max}.`;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    return `Nhập một số nguyên từ ${min} đến ${max}.`;
  }
  return null;
}

export function LearnerSettingsPage() {
  const { activeLearner } = useActiveLearner();
  if (!activeLearner) return <Navigate to="/learners" replace />;
  return <LearnerSettingsExperience key={activeLearner.id} activeLearner={activeLearner} />;
}

function LearnerSettingsExperience({ activeLearner }: { activeLearner: LearnerDto }) {
  const [state, setState] = useState<LoadState>("loading");
  const [dailyNewWordLimit, setDailyNewWordLimit] = useState("");
  const [dailyNewWordGoal, setDailyNewWordGoal] = useState("");
  const [dailyReviewWordGoal, setDailyReviewWordGoal] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<SettingsField, string | null>>({
    dailyNewWordLimit: null,
    dailyNewWordGoal: null,
    dailyReviewWordGoal: null
  });
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void requestLearnerSettings(activeLearner.id)
      .then((settings) => {
        if (cancelled) return;
        setDailyNewWordLimit(String(settings.dailyNewWordLimit));
        setDailyNewWordGoal(String(settings.dailyNewWordGoal));
        setDailyReviewWordGoal(String(settings.dailyReviewWordGoal));
        setState("ready");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState("error");
        setMessage(errorMessage(error));
      });
    return () => { cancelled = true; };
  }, [activeLearner.id]);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const newLimitError = validateDraft(dailyNewWordLimit, DAILY_NEW_WORD_LIMIT_MIN, DAILY_NEW_WORD_LIMIT_MAX);
    const newGoalError = validateDraft(dailyNewWordGoal, DAILY_WORD_GOAL_MIN, DAILY_WORD_GOAL_MAX);
    const reviewGoalError = validateDraft(dailyReviewWordGoal, DAILY_WORD_GOAL_MIN, DAILY_WORD_GOAL_MAX);
    const nextErrors = {
      dailyNewWordLimit: newLimitError,
      dailyNewWordGoal: newGoalError,
      dailyReviewWordGoal: reviewGoalError
    };
    setFieldErrors(nextErrors);
    setMessage(null);
    setSuccess(null);
    if (newLimitError || newGoalError || reviewGoalError) return;
    setSaving(true);
    try {
      const saved = await updateLearnerSettings(activeLearner.id, {
        dailyNewWordLimit: Number(dailyNewWordLimit),
        dailyNewWordGoal: Number(dailyNewWordGoal),
        dailyReviewWordGoal: Number(dailyReviewWordGoal)
      });
      setDailyNewWordLimit(String(saved.dailyNewWordLimit));
      setDailyNewWordGoal(String(saved.dailyNewWordGoal));
      setDailyReviewWordGoal(String(saved.dailyReviewWordGoal));
      setSuccess(`Đã lưu cài đặt học của ${activeLearner.displayName}.`);
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="learner-page" aria-labelledby="learner-settings-title">
      <section className="learner-card progress-card">
        <div className="progress-topbar">
          <Link className="back-link" to="/learners">← Về trang người học</Link>
          <p className="study-learner">Người học: <strong>{activeLearner.displayName}</strong></p>
        </div>
        <p className="auth-eyebrow">Học tập mỗi ngày</p>
        <h1 className="auth-title" id="learner-settings-title">Cài đặt học của {activeLearner.displayName}</h1>
        <p className="auth-copy">Mục tiêu là kế hoạch học trong ngày. Giới hạn từ mới chỉ kiểm soát số từ mới scheduler được giới thiệu; không giới hạn số từ ôn đến hạn.</p>

        {state === "loading" ? <div className="progress-state" data-testid="learner-settings-loading" role="status">Đang tải cài đặt…</div> : null}
        {state === "error" ? (
          <div className="progress-state progress-error" data-testid="learner-settings-error" role="alert">
            <p>{message}</p>
            <button className="auth-retry" type="button" onClick={() => window.location.reload()}>Thử lại</button>
          </div>
        ) : null}
        {success ? <p className="progress-success" role="status">{success}</p> : null}

        {state === "ready" ? (
          <form className="learner-settings-form" onSubmit={(event) => void handleSave(event)} noValidate>
            <section className="learner-daily-goals" aria-labelledby="learner-daily-goals-title">
              <h2 id="learner-daily-goals-title">Mục tiêu hằng ngày</h2>
              <p>Đặt số từ mới và số từ đã có tiến trình bạn muốn hoàn thành mỗi ngày.</p>
              <div className="field-group">
                <label className="form-label" htmlFor="daily-new-word-goal">Từ mới mỗi ngày</label>
                <input
                  className="text-input"
                  id="daily-new-word-goal"
                  type="number"
                  min={DAILY_WORD_GOAL_MIN}
                  max={DAILY_WORD_GOAL_MAX}
                  step="1"
                  inputMode="numeric"
                  value={dailyNewWordGoal}
                  onChange={(event) => {
                    setDailyNewWordGoal(event.target.value);
                    setFieldErrors((current) => ({ ...current, dailyNewWordGoal: null }));
                    setMessage(null);
                    setSuccess(null);
                  }}
                  aria-invalid={Boolean(fieldErrors.dailyNewWordGoal)}
                  aria-describedby={fieldErrors.dailyNewWordGoal ? "daily-new-word-goal-error" : undefined}
                  disabled={saving}
                />
                {fieldErrors.dailyNewWordGoal ? <p className="form-error" id="daily-new-word-goal-error" role="alert">{fieldErrors.dailyNewWordGoal}</p> : null}
              </div>
              <div className="field-group">
                <label className="form-label" htmlFor="daily-review-word-goal">Từ ôn tập mỗi ngày</label>
                <input
                  className="text-input"
                  id="daily-review-word-goal"
                  type="number"
                  min={DAILY_WORD_GOAL_MIN}
                  max={DAILY_WORD_GOAL_MAX}
                  step="1"
                  inputMode="numeric"
                  value={dailyReviewWordGoal}
                  onChange={(event) => {
                    setDailyReviewWordGoal(event.target.value);
                    setFieldErrors((current) => ({ ...current, dailyReviewWordGoal: null }));
                    setMessage(null);
                    setSuccess(null);
                  }}
                  aria-invalid={Boolean(fieldErrors.dailyReviewWordGoal)}
                  aria-describedby={fieldErrors.dailyReviewWordGoal ? "daily-review-word-goal-error" : undefined}
                  disabled={saving}
                />
                {fieldErrors.dailyReviewWordGoal ? <p className="form-error" id="daily-review-word-goal-error" role="alert">{fieldErrors.dailyReviewWordGoal}</p> : null}
              </div>
            </section>
            <div className="field-group">
              <label className="form-label" htmlFor="daily-new-word-limit">Giới hạn từ mới scheduler mỗi ngày</label>
              <input
                className="text-input"
                id="daily-new-word-limit"
                type="number"
                min={DAILY_NEW_WORD_LIMIT_MIN}
                max={DAILY_NEW_WORD_LIMIT_MAX}
                step="1"
                inputMode="numeric"
                value={dailyNewWordLimit}
                onChange={(event) => {
                  setDailyNewWordLimit(event.target.value);
                  setFieldErrors((current) => ({ ...current, dailyNewWordLimit: null }));
                  setMessage(null);
                  setSuccess(null);
                }}
                aria-invalid={Boolean(fieldErrors.dailyNewWordLimit)}
                aria-describedby={fieldErrors.dailyNewWordLimit ? "daily-new-word-limit-error" : undefined}
                disabled={saving}
              />
              {fieldErrors.dailyNewWordLimit ? <p className="form-error" id="daily-new-word-limit-error" role="alert">{fieldErrors.dailyNewWordLimit}</p> : null}
            </div>
            {message ? <p className="form-error" role="alert">{message}</p> : null}
            <button className="register-submit" type="submit" disabled={saving} aria-busy={saving}>
              {saving ? "Đang lưu…" : "Lưu cài đặt"}
            </button>
          </form>
        ) : null}
      </section>
    </main>
  );
}
