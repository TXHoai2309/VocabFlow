import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router";
import { authClient } from "./auth-client";
import { requestBootstrap } from "./bootstrap-client";
import { LoginForm } from "./login-form";
import type { LoginFormValues } from "./login-schema";

export type LoginState =
  | "idle"
  | "login-pending"
  | "bootstrap-pending"
  | "bootstrap-recovery"
  | "completed"
  | "auth-error";

const AUTH_ERROR_MESSAGE = "Địa chỉ email hoặc mật khẩu không đúng. Vui lòng thử lại.";
const NETWORK_ERROR_MESSAGE = "Không thể đăng nhập lúc này. Vui lòng thử lại.";
const BOOTSTRAP_ERROR_MESSAGE = "Đã đăng nhập nhưng chưa hoàn tất thiết lập tài khoản.";
const SESSION_CHECK_ERROR_MESSAGE = "Không thể kiểm tra phiên hiện tại. Vui lòng thử lại.";

function safeAuthErrorMessage(error: { code?: string } | null | undefined) {
  if (error?.code) return AUTH_ERROR_MESSAGE;
  return NETWORK_ERROR_MESSAGE;
}

export function LoginPage() {
  const sessionState = authClient.useSession();
  const handledSessionUserId = useRef<string | null>(null);
  const [state, setState] = useState<LoginState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const bootstrapFamily = useCallback(async () => {
    setState("bootstrap-pending");
    setMessage(null);
    try {
      await requestBootstrap();
      setState("completed");
    } catch {
      setState("bootstrap-recovery");
      setMessage(BOOTSTRAP_ERROR_MESSAGE);
    }
  }, []);

  useEffect(() => {
    const userId = sessionState.data?.user?.id;
    if (sessionState.isPending || sessionState.error || !userId || handledSessionUserId.current === userId) {
      return;
    }

    handledSessionUserId.current = userId;
    void bootstrapFamily();
  }, [bootstrapFamily, sessionState.data?.user?.id, sessionState.error, sessionState.isPending]);

  async function handleValidSubmit(values: LoginFormValues) {
    setState("login-pending");
    setMessage(null);
    try {
      const result = await authClient.signIn.email({
        email: values.email,
        password: values.password
      });
      if (result.error || !result.data?.user?.id) {
        setState("auth-error");
        setMessage(safeAuthErrorMessage(result.error));
        return;
      }

      handledSessionUserId.current = result.data.user.id;
    } catch {
      setState("auth-error");
      setMessage(NETWORK_ERROR_MESSAGE);
      return;
    }

    await bootstrapFamily();
  }

  const isSessionPending = sessionState.isPending && state === "idle";
  const isSessionError = Boolean(sessionState.error) && state === "idle";
  const isFormDisabled = isSessionPending
    || state === "bootstrap-pending"
    || state === "bootstrap-recovery"
    || state === "completed";

  if (state === "completed") return <Navigate to="/" replace />;

  return (
    <main className="auth-page" aria-labelledby="login-title">
      <section className="auth-card">
        <Link className="auth-brand" to="/" aria-label="Trang chủ VocabFlow">
          <span className="auth-brand-mark" aria-hidden="true">V</span>
          <span>VocabFlow</span>
        </Link>
        <p className="auth-eyebrow">Học từ vựng mỗi ngày</p>
        <h1 className="auth-title" id="login-title">Đăng nhập</h1>
        <p className="auth-copy">Đăng nhập để tiếp tục học từ vựng và theo dõi tiến trình của bạn.</p>

        <LoginForm onValidSubmit={handleValidSubmit} submitDisabled={isFormDisabled} />

        <div className="auth-status" aria-live="polite">
          {isSessionPending ? <p role="status">Đang kiểm tra phiên…</p> : null}
          {isSessionError ? (
            <div role="alert">
              <p>{SESSION_CHECK_ERROR_MESSAGE}</p>
              <button className="auth-retry" type="button" onClick={() => void sessionState.refetch()}>
                Thử lại kiểm tra phiên
              </button>
            </div>
          ) : null}
          {state === "login-pending" ? <p role="status">Đang đăng nhập…</p> : null}
          {state === "bootstrap-pending" ? <p role="status">Đang xác nhận tài khoản…</p> : null}
          {state === "auth-error" ? <p role="alert">{message ?? AUTH_ERROR_MESSAGE}</p> : null}
          {state === "bootstrap-recovery" ? (
            <div role="alert">
              <p>{message ?? BOOTSTRAP_ERROR_MESSAGE}</p>
              <button className="auth-retry" type="button" onClick={() => void bootstrapFamily()}>
                Thử lại thiết lập
              </button>
            </div>
          ) : null}
        </div>

        <p className="auth-switch">
          Chưa có tài khoản? <Link className="auth-link" to="/register">Tạo tài khoản</Link>
        </p>
      </section>
    </main>
  );
}
