import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RegisterPage } from "./register-page";

const { signUpEmail } = vi.hoisted(() => ({ signUpEmail: vi.fn() }));

vi.mock("./auth-client", () => ({
  authClient: { signUp: { email: signUpEmail } }
}));

function renderPage() {
  return render(<MemoryRouter><RegisterPage /></MemoryRouter>);
}

function fillValidForm() {
  fireEvent.change(screen.getByLabelText("Tên phụ huynh"), { target: { value: "  Nguyễn An  " } });
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "parent@example.com" } });
  fireEvent.change(screen.getByLabelText("Mật khẩu"), { target: { value: "secret" } });
  fireEvent.submit(screen.getByRole("button", { name: "Tạo tài khoản" }).closest("form")!);
}

function bootstrapResponse(ok: boolean, payload: unknown = { household: { id: "00000000-0000-4000-8000-000000000001", name: "Gia đình VocabFlow", timezone: "Asia/Ho_Chi_Minh" } }) {
  return { ok, status: ok ? 200 : 503, json: async () => payload };
}

describe("RegisterPage integration pipeline", () => {
  beforeEach(() => {
    signUpEmail.mockReset();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("passes the direct Better Auth signup contract and bootstraps once", async () => {
    signUpEmail.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    vi.mocked(fetch).mockResolvedValue(bootstrapResponse(true) as Response);
    renderPage();

    fillValidForm();

    await waitFor(() => expect(signUpEmail).toHaveBeenCalledTimes(1));
    expect(signUpEmail).toHaveBeenCalledWith({ name: "Nguyễn An", email: "parent@example.com", password: "secret" });
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect(fetch).toHaveBeenCalledWith("/api/bootstrap", expect.objectContaining({ method: "POST", credentials: "include", body: "{}" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Tài khoản và gia đình đã được thiết lập.");
  });

  it("maps the verified account-exists code without calling bootstrap", async () => {
    signUpEmail.mockResolvedValue({ data: null, error: { code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL", message: "internal detail" } });
    renderPage();
    fillValidForm();

    expect(await screen.findByRole("alert")).toHaveTextContent("Email này đã được đăng ký. Hãy đăng nhập để tiếp tục.");
    expect(screen.getByRole("link", { name: "Đăng nhập" })).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("keeps name and email after signup failure and hides raw details", async () => {
    signUpEmail.mockRejectedValue(new Error("secret stack trace"));
    renderPage();
    fillValidForm();

    expect(await screen.findByRole("alert")).toHaveTextContent("Không thể tạo tài khoản lúc này. Vui lòng thử lại.");
    expect(screen.getByRole("alert")).not.toHaveTextContent("secret stack trace");
    expect(screen.getByLabelText("Tên phụ huynh")).toHaveValue("  Nguyễn An  ");
    expect(screen.getByLabelText("Email")).toHaveValue("parent@example.com");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("enters bootstrap recovery and retries only bootstrap", async () => {
    signUpEmail.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    const bootstrap = vi.mocked(fetch);
    bootstrap.mockResolvedValueOnce(bootstrapResponse(false) as Response).mockResolvedValueOnce(bootstrapResponse(true) as Response);
    renderPage();
    fillValidForm();

    expect(await screen.findByRole("alert")).toHaveTextContent("Đã tạo tài khoản nhưng chưa hoàn tất thiết lập gia đình.");
    fireEvent.click(screen.getByRole("button", { name: "Thử lại thiết lập" }));
    await waitFor(() => expect(bootstrap).toHaveBeenCalledTimes(2));
    expect(signUpEmail).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole("status")).toHaveTextContent("Tài khoản và gia đình đã được thiết lập.");
  });

  it("keeps the submit action disabled across signup and bootstrap", async () => {
    let resolveSignup: ((value: unknown) => void) | undefined;
    signUpEmail.mockImplementation(() => new Promise((resolve) => { resolveSignup = resolve; }));
    renderPage();
    fillValidForm();

    const submit = screen.getByRole("button", { name: "Đang xử lý…" });
    expect(submit).toBeDisabled();
    resolveSignup?.({ data: { user: { id: "user-1" } }, error: null });
    vi.mocked(fetch).mockResolvedValue(bootstrapResponse(true) as Response);
    await waitFor(() => expect(screen.getByRole("status")).toBeInTheDocument());
  });
});
