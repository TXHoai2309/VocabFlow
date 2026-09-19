import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router";
import { DAILY_NEW_WORD_LIMIT_MAX, DAILY_NEW_WORD_LIMIT_MIN, type LearnerDto } from "@vocabflow/contracts";
import { useActiveLearner } from "./learner-context-hook";
import {
  LearnerSettingsClientError,
  requestLearnerSettings,
  updateLearnerSettings
} from "./learner-settings-client";

type LoadState = "loading" | "ready" | "error";

function errorMessage(error: unknown) {
  if (error instanceof LearnerSettingsClientError && error.status === 401) return "Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.";
  if (error instanceof LearnerSettingsClientError && error.status === 403) return "Bạn không có quyền thay đổi learner này.";
  return "Không thể tải cài đặt learner lúc này. Vui lòng thử lại.";
}

function validateDraft(value: string): string | null {
  if (!/^\d+$/.test(value)) return "Nhập một số nguyên từ 0 đến 100.";
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < DAILY_NEW_WORD_LIMIT_MIN || parsed > DAILY_NEW_WORD_LIMIT_MAX) {
    return "Nhập một số nguyên từ 0 đến 100.";
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
  const [draft, setDraft] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void requestLearnerSettings(activeLearner.id)
      .then((settings) => {
        if (cancelled) return;
        setDraft(String(settings.dailyNewWordLimit));
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
    const validation = validateDraft(draft);
    setFieldError(validation);
    setMessage(null);
    setSuccess(null);
    if (validation) return;
    setSaving(true);
    try {
      const saved = await updateLearnerSettings(activeLearner.id, Number(draft));
      setDraft(String(saved.dailyNewWordLimit));
      setSuccess(`Đã lưu giới hạn từ mới của ${activeLearner.displayName}.`);
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
          <Link className="back-link" to="/learners">← Về learner home</Link>
          <p className="study-learner">Learner: <strong>{activeLearner.displayName}</strong></p>
        </div>
        <p className="auth-eyebrow">Daily learning</p>
        <h1 className="auth-title" id="learner-settings-title">Cài đặt học của {activeLearner.displayName}</h1>
        <p className="auth-copy">Giới hạn này chỉ áp dụng cho từ mới trong ngày. Từ đến hạn vẫn luôn được ưu tiên và không bị giới hạn.</p>

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
            <div className="field-group">
              <label className="form-label" htmlFor="daily-new-word-limit">Số từ mới tối đa mỗi ngày</label>
              <input
                className="text-input"
                id="daily-new-word-limit"
                type="number"
                min={DAILY_NEW_WORD_LIMIT_MIN}
                max={DAILY_NEW_WORD_LIMIT_MAX}
                step="1"
                inputMode="numeric"
                value={draft}
                onChange={(event) => {
                  setDraft(event.target.value);
                  setFieldError(null);
                  setMessage(null);
                  setSuccess(null);
                }}
                aria-invalid={Boolean(fieldError)}
                aria-describedby={fieldError ? "daily-new-word-limit-error" : undefined}
                disabled={saving}
              />
              {fieldError ? <p className="form-error" id="daily-new-word-limit-error" role="alert">{fieldError}</p> : null}
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
