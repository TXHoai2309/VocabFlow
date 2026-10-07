import { AccountLearningState } from "./account-learning-state";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  DAILY_WORD_GOAL_MAX,
  DAILY_WORD_GOAL_MIN,
  DAILY_NEW_WORD_LIMIT_MAX,
  DAILY_NEW_WORD_LIMIT_MIN,
  type LearnerDto
} from "@vocabflow/contracts";
import { useActiveLearner } from "./learner-context-hook";
import { ErrorState, LoadingState } from "../../components/async-states";
import { useToast } from "../../components/toast/toast-context";
import {
  LearnerSettingsClientError,
  requestLearnerSettings,
  updateLearnerSettings
} from "./learner-settings-client";

type LoadState = "loading" | "ready" | "error";
type SettingsField = "dailyNewWordLimit" | "dailyNewWordGoal" | "dailyReviewWordGoal";

function errorMessage(error: unknown) {
  if (error instanceof LearnerSettingsClientError && error.status === 401) return "Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.";
  if (error instanceof LearnerSettingsClientError && error.status === 403) return "Bạn không có quyền thay đổi dữ liệu học tập này.";
  return "Không thể tải cài đặt học tập lúc này. Vui lòng thử lại.";
}

function saveErrorMessage(error: unknown) {
  if (error instanceof LearnerSettingsClientError && error.status === 401) return "Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.";
  if (error instanceof LearnerSettingsClientError && error.status === 403) return "Bạn không có quyền thay đổi dữ liệu học tập này.";
  return "Không thể lưu cài đặt. Vui lòng thử lại.";
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
  if (!activeLearner) return <AccountLearningState />;
  return <LearnerSettingsExperience key={activeLearner.id} activeLearner={activeLearner} />;
}

function LearnerSettingsExperience({ activeLearner }: { activeLearner: LearnerDto }) {
  const toast = useToast();
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
  const [saving, setSaving] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

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
  }, [activeLearner.id, retryCount]);

  function retrySettings() {
    setState("loading");
    setMessage(null);
    setRetryCount((value) => value + 1);
  }

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
      toast.success("Đã lưu cài đặt");
    } catch (error) {
      toast.error(saveErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="learner-page" aria-labelledby="learner-settings-title">
      <section className="learner-card progress-card">
        <div className="progress-topbar">
          <Link className="back-link" to="/">← Về trang chủ</Link>
        </div>
        <p className="auth-eyebrow">Học tập mỗi ngày</p>
        <h1 className="auth-title" id="learner-settings-title">Cài đặt học tập</h1>
        <p className="auth-copy">Mục tiêu là kế hoạch học trong ngày. Giới hạn từ mới chỉ kiểm soát số từ mới scheduler được giới thiệu; không giới hạn số từ ôn đến hạn.</p>

        {state === "loading" ? <LoadingState className="progress-state" label="Đang tải cài đặt học…" pattern="form" testId="learner-settings-loading" /> : null}
        {state === "error" ? (
          <ErrorState className="progress-state progress-error" title="Không thể tải cài đặt học" description={message ?? "Vui lòng thử lại."} onRetry={retrySettings} testId="learner-settings-error" />
        ) : null}

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
                }}
                aria-invalid={Boolean(fieldErrors.dailyNewWordLimit)}
                aria-describedby={fieldErrors.dailyNewWordLimit ? "daily-new-word-limit-error" : undefined}
                disabled={saving}
              />
              {fieldErrors.dailyNewWordLimit ? <p className="form-error" id="daily-new-word-limit-error" role="alert">{fieldErrors.dailyNewWordLimit}</p> : null}
            </div>
            <button className="register-submit" type="submit" disabled={saving} aria-busy={saving}>
              {saving ? "Đang lưu…" : "Lưu cài đặt"}
            </button>
          </form>
        ) : null}
      </section>
    </main>
  );
}
