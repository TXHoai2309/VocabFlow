import { useState } from "react";
import { Link, Navigate } from "react-router";
import { authClient } from "./auth-client";
import { requestBootstrap } from "./bootstrap-client";
import { RegisterForm } from "./register-form";
import type { RegisterFormValues } from "./register-schema";

export type RegistrationState =
  | "idle"
  | "signup-pending"
  | "bootstrap-pending"
  | "bootstrap-recovery"
  | "completed"
  | "auth-error";

const ACCOUNT_EXISTS_CODE = "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL";
const ACCOUNT_EXISTS_MESSAGE = "Địa chỉ email này đã được đăng ký. Hãy đăng nhập để tiếp tục.";
const AUTH_ERROR_MESSAGE = "Không thể tạo tài khoản lúc này. Vui lòng thử lại.";
const BOOTSTRAP_ERROR_MESSAGE = "Đã tạo tài khoản nhưng chưa hoàn tất thiết lập tài khoản.";

function safeAuthErrorMessage(error: { code?: string } | null | undefined) {
  return error?.code === ACCOUNT_EXISTS_CODE ? ACCOUNT_EXISTS_MESSAGE : AUTH_ERROR_MESSAGE;
}

export function RegisterPage() {
  const [state, setState] = useState<RegistrationState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function bootstrapFamily() {
    setState("bootstrap-pending");
    setMessage(null);
    try {
      await requestBootstrap();
      setState("completed");
    } catch {
      setState("bootstrap-recovery");
      setMessage(BOOTSTRAP_ERROR_MESSAGE);
    }
  }

  async function handleValidSubmit(values: RegisterFormValues) {
    setState("signup-pending");
    setMessage(null);
    try {
      const result = await authClient.signUp.email({
        name: values.name,
        email: values.email,
        password: values.password
      });
      if (result.error || !result.data?.user?.id) {
        setState("auth-error");
        setMessage(safeAuthErrorMessage(result.error));
        return;
      }
    } catch {
      setState("auth-error");
      setMessage(AUTH_ERROR_MESSAGE);
      return;
    }

    await bootstrapFamily();
  }

  const isCompleted = state === "completed";

  if (state === "completed") return <Navigate to="/" replace />;

  return (
    <main className="auth-page" aria-labelledby="register-title">
      <section className="auth-card">
        <Link className="auth-brand" to="/" aria-label="Trang chủ VocabFlow">
          <span className="auth-brand-mark" aria-hidden="true">V</span>
          <span>VocabFlow</span>
        </Link>
        <p className="auth-eyebrow">Học từ vựng mỗi ngày</p>
        <h1 className="auth-title" id="register-title">Tạo tài khoản</h1>
        <p className="auth-copy">Tạo tài khoản để bắt đầu học từ vựng và lưu tiến trình của bạn.</p>
        <RegisterForm onValidSubmit={handleValidSubmit} submitDisabled={isCompleted} />
        <div className="auth-status" aria-live="polite">
          {state === "signup-pending" ? <p>Đang tạo tài khoản…</p> : null}
          {state === "bootstrap-pending" ? <p>Đang thiết lập tài khoản…</p> : null}
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
        <p className="auth-switch"><Link className="auth-link" to="/">Học ngay không cần tài khoản</Link></p>
        <p className="auth-switch">
          Đã có tài khoản? <Link className="auth-link" to="/login">Đăng nhập</Link>
        </p>
      </section>
    </main>
  );
}
