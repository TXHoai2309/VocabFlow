import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router";
import { authClient } from "../auth/auth-client";
import type { LearnerDto } from "@vocabflow/contracts";
import { createLearner, LearnerClientError, requestLearners } from "./learner-client";
import { useActiveLearner } from "./learner-context-hook";
import { EmptyState, ErrorState, LoadingState } from "../../components/async-states";
import { useToast } from "../../components/toast/toast-context";

type ResolutionState =
  | "loading"
  | "empty"
  | "auto-resolving"
  | "selector"
  | "creating"
  | "reconciling"
  | "completed"
  | "error";

const SAFE_LIST_ERROR = "Không thể tải danh sách người học lúc này. Vui lòng thử lại.";
const SAFE_CREATE_ERROR = "Không thể tạo hồ sơ người học lúc này. Vui lòng thử lại.";

function parseReturnTo(value: unknown): string | null {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || /[\u0000-\u001f\u007f]/.test(value)) {
    return null;
  }
  try {
    return new URL(value, window.location.origin).origin === window.location.origin ? value : null;
  } catch {
    return null;
  }
}

function localNameError(value: string) {
  const trimmed = value.trim();
  return trimmed.length < 1 || trimmed.length > 80 ? "Tên người học cần từ 1 đến 80 ký tự." : null;
}

export function LearnerPage() {
  const toast = useToast();
  const sessionState = authClient.useSession();
  const { activeLearner, setActiveLearner, clearActiveLearner } = useActiveLearner();
  const location = useLocation();
  const navigate = useNavigate();
  const returnTo = parseReturnTo((location.state as { returnTo?: unknown } | null)?.returnTo);
  const [state, setState] = useState<ResolutionState>("loading");
  const [learners, setLearners] = useState<LearnerDto[]>([]);
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
      clearActiveLearner();
      setState("empty");
    } else if (enabledLearners.length === 1) {
      setState("auto-resolving");
      setActiveLearner(enabledLearners[0] ?? null);
      setState("completed");
    } else {
      const selectedLearner = enabledLearners.find((learner) => learner.id === activeLearner?.id);
      if (selectedLearner) setActiveLearner(selectedLearner);
      else if (activeLearner) clearActiveLearner();
      setState("selector");
    }
  }, [activeLearner, clearActiveLearner, setActiveLearner]);

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
    if (!userId) {
      clearActiveLearner();
      return;
    }
    if (!userId || loadedUserId.current === userId) return;
    loadedUserId.current = userId;
    void loadLearners();
  }, [clearActiveLearner, loadLearners, sessionState.data?.user?.id]);

  useEffect(() => {
    if (returnTo && state === "completed" && activeLearner) {
      navigate(returnTo, { replace: true, state: null });
    }
  }, [activeLearner, navigate, returnTo, state]);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (requestInFlight.current) return;
    const error = localNameError(displayName);
    const previousState = state;
    const previousMessage = message;
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
      toast.success("Đã tạo hồ sơ người học");
    } catch (error) {
      if (error instanceof LearnerClientError && error.uncertain) {
        requestInFlight.current = false;
        setMessage("Đang kiểm tra kết quả tạo hồ sơ người học…");
        await loadLearners(true);
        setMessage((current) => current ?? "Danh sách đã được cập nhật. Vui lòng kiểm tra trước khi tạo lại.");
        return;
      }
      setState(previousState);
      setMessage(previousMessage);
      if (error instanceof LearnerClientError && error.code === "LEARNER_DISPLAY_NAME_INVALID") {
        setFieldError("Tên người học không hợp lệ.");
      } else {
        toast.error(SAFE_CREATE_ERROR);
      }
    } finally {
      requestInFlight.current = false;
    }
  }

  if (sessionState.isPending) {
    return <main className="learner-page" aria-busy="true"><LoadingState className="learner-session-loading" label="Đang kiểm tra phiên…" pattern="form" /></main>;
  }
  if (!sessionState.data?.user?.id) return <Navigate to="/login" replace />;

  const isBusy = state === "creating" || state === "reconciling" || state === "loading" || state === "auto-resolving";
  const showCreate = state === "empty" || state === "selector" || state === "creating" || state === "error";

  return (
    <main className="learner-page" aria-labelledby="learner-title">
      <section className="learner-card">
        <Link className="auth-brand" to="/" aria-label="Trang chủ VocabFlow">
          <span className="auth-brand-mark" aria-hidden="true">V</span>
          <span>VocabFlow</span>
        </Link>
        <p className="auth-eyebrow">Hồ sơ học tập</p>
        <h1 className="auth-title" id="learner-title">Chọn người học</h1>
        <p className="auth-copy">Chọn hồ sơ để tiếp tục đúng tiến trình của từng người học.</p>

        <div className="learner-status" aria-live="polite">
          {state === "loading" ? <LoadingState className="learner-list-loading" label="Đang tải hồ sơ người học…" pattern="rows" /> : null}
          {state === "auto-resolving" ? <p role="status">Đang mở hồ sơ người học…</p> : null}
          {state === "reconciling" ? <p role="status">Đang đồng bộ danh sách người học…</p> : null}
          {state === "error" ? <ErrorState className="learner-list-error" title="Không thể tải hồ sơ người học" description={message ?? SAFE_LIST_ERROR} onRetry={() => void loadLearners()} retrying={isBusy} /> : null}
          {message && state !== "error" ? <p role="status">{message}</p> : null}
        </div>

        {state === "empty" ? (
          <EmptyState className="learner-empty" icon="learners" title="Chưa có hồ sơ học" description="Tạo hồ sơ đầu tiên bên dưới để bắt đầu học." testId="learner-empty-state" />
        ) : null}

        {state === "selector" ? (
          <div className="learner-selector" aria-label="Danh sách người học">
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
              <label className="form-label" htmlFor="learner-display-name">Tên người học</label>
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


        {state === "completed" && activeLearner ? (
          <div className="learner-ready" data-testid="learner-context-ready" role="status">
            <p>Đã chọn người học: <strong>{activeLearner.displayName}</strong></p>
            <p className="learner-handoff-note">Sẵn sàng cho thẻ học đầu tiên.</p>
            <Link className="learner-progress-link" to="/vocabulary">Từ vựng</Link>
            <Link aria-label="Bộ từ" className="learner-progress-link" to="/learning-sets">Bộ từ</Link>
            <Link className="learner-progress-link" to="/learning-sets/assign">Quản lý bộ từ của người học</Link>
            <Link className="learner-progress-link" to="/learner-settings">Cài đặt số từ mới mỗi ngày</Link>
            <Link className="learner-progress-link" to="/progress">Xem tiến trình</Link>
            <Link className="register-submit learner-study-submit" to="/study/setup">Bắt đầu học</Link>
            <div className="learner-exercise-links" aria-label="Các bài tập">
              <Link className="learner-exercise-submit" to="/study/exercises">Luyện bài tập trắc nghiệm</Link>
              <Link className="learner-exercise-submit" to="/study/exercises?type=IMAGE_TO_WORD">Luyện qua hình ảnh</Link>
              <Link className="learner-exercise-submit" to="/study/exercises?type=TYPE_WORD">Luyện gõ từ</Link>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
