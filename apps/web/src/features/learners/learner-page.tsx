import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router";
import { authClient } from "../auth/auth-client";
import type { LearnerDto } from "@vocabflow/contracts";
import { createLearner, LearnerClientError, requestLearners } from "./learner-client";

type ResolutionState =
  | "loading"
  | "empty"
  | "auto-resolving"
  | "selector"
  | "creating"
  | "reconciling"
  | "completed"
  | "error";

const SAFE_LIST_ERROR = "Không thể tải danh sách learner lúc này. Vui lòng thử lại.";
const SAFE_CREATE_ERROR = "Không thể tạo learner lúc này. Vui lòng thử lại.";

function localNameError(value: string) {
  const trimmed = value.trim();
  return trimmed.length < 1 || trimmed.length > 80 ? "Tên learner cần từ 1 đến 80 ký tự." : null;
}

export function LearnerPage() {
  const sessionState = authClient.useSession();
  const [state, setState] = useState<ResolutionState>("loading");
  const [learners, setLearners] = useState<LearnerDto[]>([]);
  const [activeLearner, setActiveLearner] = useState<LearnerDto | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const loadedUserId = useRef<string | null>(null);
  const requestInFlight = useRef(false);

  const classifyLearners = useCallback((next: LearnerDto[]) => {
    // The API is canonical and already filters enabled rows. Keep the UI
    // defensive as well so a stale/malformed response cannot expose a
    // soft-disabled profile or make it selectable.
    const enabledLearners = next.filter((learner) => learner.enabled);
    setLearners(enabledLearners);
    if (enabledLearners.length === 0) {
      setActiveLearner(null);
      setState("empty");
    } else if (enabledLearners.length === 1) {
      setState("auto-resolving");
      setActiveLearner(enabledLearners[0] ?? null);
      setState("completed");
    } else {
      setActiveLearner(null);
      setState("selector");
    }
  }, []);

  const loadLearners = useCallback(async (reconciliation = false) => {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    setState(reconciliation ? "reconciling" : "loading");
    setMessage(null);
    try {
      classifyLearners(await requestLearners());
    } catch {
      setState("error");
      setMessage(SAFE_LIST_ERROR);
    } finally {
      requestInFlight.current = false;
    }
  }, [classifyLearners]);

  useEffect(() => {
    const userId = sessionState.data?.user?.id;
    if (!userId || loadedUserId.current === userId) return;
    loadedUserId.current = userId;
    void loadLearners();
  }, [loadLearners, sessionState.data?.user?.id]);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (requestInFlight.current) return;
    const error = localNameError(displayName);
    setFieldError(error);
    if (error) return;
    requestInFlight.current = true;
    setState("creating");
    setMessage(null);
    try {
      const created = await createLearner({ displayName: displayName.trim() });
      setDisplayName("");
      setFieldError(null);
      setLearners((current) => [...current, created].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)));
      setActiveLearner(created);
      setState("completed");
    } catch (error) {
      if (error instanceof LearnerClientError && error.uncertain) {
        requestInFlight.current = false;
        setMessage("Đang đối chiếu kết quả tạo learner…");
        await loadLearners(true);
        setMessage((current) => current ?? "Danh sách đã được đồng bộ. Kiểm tra trước khi tạo lại.");
        return;
      }
      setState("error");
      setMessage(error instanceof LearnerClientError && error.code === "LEARNER_DISPLAY_NAME_INVALID"
        ? "Tên learner không hợp lệ."
        : SAFE_CREATE_ERROR);
    } finally {
      requestInFlight.current = false;
    }
  }

  if (sessionState.isPending) {
    return <main className="learner-page"><p role="status">Đang kiểm tra phiên…</p></main>;
  }
  if (!sessionState.data?.user?.id) return <Navigate to="/login" replace />;

  const isBusy = state === "creating" || state === "reconciling" || state === "loading" || state === "auto-resolving";
  const showCreate = state === "empty" || state === "selector" || state === "creating" || state === "error";

  return (
    <main className="learner-page" aria-labelledby="learner-title">
      <section className="learner-card">
        <Link className="auth-brand" to="/" aria-label="VocabFlow home">
          <span className="auth-brand-mark" aria-hidden="true">V</span>
          <span>VocabFlow</span>
        </Link>
        <p className="auth-eyebrow">Learning context</p>
        <h1 className="auth-title" id="learner-title">Chọn người học</h1>
        <p className="auth-copy">Chọn hồ sơ để tiếp tục đúng tiến trình của từng learner.</p>

        <div className="learner-status" aria-live="polite">
          {state === "loading" ? <p role="status">Đang tải hồ sơ learner…</p> : null}
          {state === "auto-resolving" ? <p role="status">Đang mở hồ sơ learner…</p> : null}
          {state === "reconciling" ? <p role="status">Đang đối chiếu danh sách canonical…</p> : null}
          {state === "error" ? <p role="alert">{message ?? SAFE_LIST_ERROR}</p> : null}
          {message && state !== "error" ? <p role="status">{message}</p> : null}
        </div>

        {state === "empty" ? (
          <div className="learner-empty" data-testid="learner-empty-state">
            <h2>Chưa có hồ sơ học</h2>
            <p>Tạo hồ sơ đầu tiên để bắt đầu learning context.</p>
          </div>
        ) : null}

        {state === "selector" ? (
          <div className="learner-selector" aria-label="Danh sách learner">
            {learners.map((learner) => (
              <button
                className="learner-option"
                type="button"
                key={learner.id}
                disabled={isBusy}
                onClick={() => {
                  if (requestInFlight.current) return;
                  setActiveLearner(learner);
                  setState("completed");
                }}
              >
                <span>{learner.displayName}</span>
                <span aria-hidden="true">→</span>
              </button>
            ))}
          </div>
        ) : null}

        {showCreate ? (
          <form className="learner-create-form" onSubmit={handleCreate} noValidate aria-busy={state === "creating"}>
            <div className="field-group">
              <label className="form-label" htmlFor="learner-display-name">Tên learner</label>
              <input
                id="learner-display-name"
                name="displayName"
                className="text-input"
                type="text"
                value={displayName}
                maxLength={80}
                onChange={(event) => setDisplayName(event.target.value)}
                onBlur={() => setFieldError(localNameError(displayName))}
                aria-invalid={Boolean(fieldError)}
                aria-describedby={fieldError ? "learner-display-name-error" : undefined}
                disabled={isBusy}
                required
              />
              {fieldError ? <p className="form-error" id="learner-display-name-error" role="alert">{fieldError}</p> : null}
            </div>
            <button className="register-submit learner-create-submit" type="submit" disabled={isBusy}>
              {state === "creating" ? "Đang tạo…" : "Tạo hồ sơ học"}
            </button>
          </form>
        ) : null}

        {state === "error" ? (
          <button className="auth-retry" type="button" onClick={() => void loadLearners()} disabled={isBusy}>
            Thử lại tải danh sách
          </button>
        ) : null}

        {state === "completed" && activeLearner ? (
          <div className="learner-ready" data-testid="learner-context-ready" role="status">
            <p>Đã chọn learner: <strong>{activeLearner.displayName}</strong></p>
            <p className="learner-handoff-note">Learner Home sẽ được mở ở story tiếp theo.</p>
          </div>
        ) : null}
      </section>
    </main>
  );
}
