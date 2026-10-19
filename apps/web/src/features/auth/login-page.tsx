import { useState } from "react";
import { Link, Navigate } from "react-router";
import { authClient } from "./auth-client";
import { LoginForm } from "./login-form";
import type { LoginFormValues } from "./login-schema";

export type LoginState =
  | "idle"
  | "login-pending"
  | "completed"
  | "auth-error";

const AUTH_ERROR_MESSAGE = "Địa chỉ email hoặc mật khẩu không đúng. Vui lòng thử lại.";
const NETWORK_ERROR_MESSAGE = "Không thể đăng nhập lúc này. Vui lòng thử lại.";
const SESSION_CHECK_ERROR_MESSAGE = "Không thể kiểm tra phiên hiện tại. Vui lòng thử lại.";

function safeAuthErrorMessage(error: { code?: string } | null | undefined) {
  if (error?.code) return AUTH_ERROR_MESSAGE;
  return NETWORK_ERROR_MESSAGE;
}

export function LoginPage() {
  const sessionState = authClient.useSession();
  const [state, setState] = useState<LoginState>("idle");
  const [message, setMessage] = useState<string | null>(null);

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

      setState("completed");
    } catch {
      setState("auth-error");
      setMessage(NETWORK_ERROR_MESSAGE);
      return;
    }
  }

  const isSessionPending = sessionState.isPending && state === "idle";
  const isSessionError = Boolean(sessionState.error) && state === "idle";

  if (sessionState.data?.user?.id || state === "completed") return <Navigate to="/" replace />;

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

        <LoginForm onValidSubmit={handleValidSubmit} submitDisabled={isSessionPending || state === "login-pending"} />

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
          {state === "auth-error" ? <p role="alert">{message ?? AUTH_ERROR_MESSAGE}</p> : null}
        </div>

        <p className="auth-switch"><Link className="auth-link" to="/">Học ngay không cần tài khoản</Link></p>
        <p className="auth-switch">
          Chưa có tài khoản? <Link className="auth-link" to="/register">Tạo tài khoản</Link>
        </p>
      </section>
    </main>
  );
}
