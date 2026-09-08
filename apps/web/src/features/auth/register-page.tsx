import { useState } from "react";
import { Link } from "react-router";
import { householdBootstrapResponseSchema, type HouseholdBootstrapResponse } from "@vocabflow/contracts";
import { authClient } from "./auth-client";
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
const ACCOUNT_EXISTS_MESSAGE = "Email này đã được đăng ký. Hãy đăng nhập để tiếp tục.";
const AUTH_ERROR_MESSAGE = "Không thể tạo tài khoản lúc này. Vui lòng thử lại.";
const BOOTSTRAP_ERROR_MESSAGE = "Đã tạo tài khoản nhưng chưa hoàn tất thiết lập gia đình.";

function safeAuthErrorMessage(error: { code?: string } | null | undefined) {
  return error?.code === ACCOUNT_EXISTS_CODE ? ACCOUNT_EXISTS_MESSAGE : AUTH_ERROR_MESSAGE;
}

async function requestBootstrap(): Promise<HouseholdBootstrapResponse> {
  const response = await fetch("/api/bootstrap", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: "{}"
  });
  if (!response.ok) throw new Error("BOOTSTRAP_REQUEST_FAILED");
  const payload: unknown = await response.json();
  const parsed = householdBootstrapResponseSchema.safeParse(payload);
  if (!parsed.success) throw new Error("BOOTSTRAP_RESPONSE_INVALID");
  return parsed.data;
}

export function RegisterPage() {
  const [state, setState] = useState<RegistrationState>("idle");
  const [household, setHousehold] = useState<HouseholdBootstrapResponse["household"] | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function bootstrapFamily() {
    setState("bootstrap-pending");
    setMessage(null);
    try {
      const result = await requestBootstrap();
      setHousehold(result.household);
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

  return (
    <main className="auth-page" aria-labelledby="register-title">
      <section className="auth-card">
        <Link className="auth-brand" to="/" aria-label="VocabFlow home">
          <span className="auth-brand-mark" aria-hidden="true">V</span>
          <span>VocabFlow</span>
        </Link>
        <p className="auth-eyebrow">Dành cho gia đình</p>
        <h1 className="auth-title" id="register-title">Tạo tài khoản</h1>
        <p className="auth-copy">Tạo tài khoản để bắt đầu quản lý việc học từ vựng của gia đình.</p>
        <RegisterForm onValidSubmit={handleValidSubmit} submitDisabled={isCompleted} />
        <div className="auth-status" aria-live="polite">
          {state === "signup-pending" ? <p>Đang tạo tài khoản…</p> : null}
          {state === "bootstrap-pending" ? <p>Đang thiết lập gia đình…</p> : null}
          {state === "auth-error" ? <p role="alert">{message ?? AUTH_ERROR_MESSAGE}</p> : null}
          {state === "bootstrap-recovery" ? (
            <div role="alert">
              <p>{message ?? BOOTSTRAP_ERROR_MESSAGE}</p>
              <button className="auth-retry" type="button" onClick={() => void bootstrapFamily()}>
                Thử lại thiết lập
              </button>
            </div>
          ) : null}
          {state === "completed" ? (
            <p role="status">
              Tài khoản và gia đình đã được thiết lập.
              {household ? ` ${household.name}` : ""}
            </p>
          ) : null}
        </div>
        <p className="auth-switch">
          Đã có tài khoản? <Link className="auth-link" to="/login">Đăng nhập</Link>
        </p>
      </section>
    </main>
  );
}
