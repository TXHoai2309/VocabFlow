import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginPage } from "./login-page";

const { signInEmail, useSession, refetch } = vi.hoisted(() => ({
  signInEmail: vi.fn(),
  useSession: vi.fn(),
  refetch: vi.fn()
}));

vi.mock("./auth-client", () => ({
  authClient: {
    signIn: { email: signInEmail },
    useSession
  }
}));

function renderPage() {
  return render(<MemoryRouter initialEntries={["/login"]}><Routes><Route path="/login" element={<LoginPage />} /><Route path="/" element={<p data-testid="home-route">Home</p>} /></Routes></MemoryRouter>);
}

function bootstrapResponse(ok: boolean, payload: unknown = {
  household: {
    id: "00000000-0000-4000-8000-000000000001",
    name: "Gia đình VocabFlow",
    timezone: "Asia/Ho_Chi_Minh"
  }
}) {
  return { ok, status: ok ? 200 : 503, json: async () => payload };
}

function fillValidForm() {
  fireEvent.change(screen.getByLabelText("Địa chỉ email"), { target: { value: "parent@example.com" } });
  fireEvent.change(screen.getByLabelText("Mật khẩu"), { target: { value: "secret" } });
  fireEvent.submit(screen.getByRole("button", { name: "Đăng nhập" }).closest("form")!);
}

describe("LoginPage integration pipeline", () => {
  beforeEach(() => {
    signInEmail.mockReset();
    useSession.mockReset();
    refetch.mockReset();
    useSession.mockReturnValue({ data: null, isPending: false, isRefetching: false, error: null, refetch });
    vi.stubGlobal("fetch", vi.fn());
  });

  it("renders the labeled login form with native autocomplete fields", () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "Đăng nhập" })).toBeInTheDocument();
    expect(screen.getByLabelText("Địa chỉ email")).toHaveAttribute("autocomplete", "email");
    expect(screen.getByLabelText("Mật khẩu")).toHaveAttribute("autocomplete", "current-password");
    expect(screen.getByRole("link", { name: "Tạo tài khoản" })).toHaveAttribute("href", "/register");
  });

  it("toggles password visibility without clearing the value", () => {
    renderPage();
    const password = screen.getByLabelText("Mật khẩu");

    fireEvent.change(password, { target: { value: "secret" } });
    fireEvent.click(screen.getByRole("button", { name: "Hiện mật khẩu" }));
    expect(password).toHaveAttribute("type", "text");
    expect(password).toHaveValue("secret");
    fireEvent.click(screen.getByRole("button", { name: "Ẩn mật khẩu" }));
    expect(password).toHaveAttribute("type", "password");
  });

  it("signs in with Better Auth and reaches the household-ready handoff", async () => {
    signInEmail.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    vi.mocked(fetch).mockResolvedValue(bootstrapResponse(true) as Response);
    renderPage();

    fillValidForm();

    await waitFor(() => expect(signInEmail).toHaveBeenCalledTimes(1));
    expect(signInEmail).toHaveBeenCalledWith({ email: "parent@example.com", password: "secret" });
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect(fetch).toHaveBeenCalledWith("/api/bootstrap", expect.objectContaining({
      method: "POST",
      credentials: "include",
      body: "{}"
    }));
    expect(await screen.findByTestId("home-route")).toBeInTheDocument();
  });

  it("maps invalid credentials to a safe inline error", async () => {
    signInEmail.mockResolvedValue({ data: null, error: { code: "INVALID_EMAIL_OR_PASSWORD", message: "secret provider detail" } });
    renderPage();

    fillValidForm();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Địa chỉ email hoặc mật khẩu không đúng. Vui lòng thử lại.");
    expect(alert).not.toHaveTextContent("secret provider detail");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("validates required fields before calling Better Auth", async () => {
    renderPage();
    fireEvent.submit(screen.getByRole("button", { name: "Đăng nhập" }).closest("form")!);

    expect(await screen.findAllByRole("alert")).toHaveLength(2);
    expect(signInEmail).not.toHaveBeenCalled();
  });

  it("keeps a network failure safe and retryable", async () => {
    signInEmail.mockRejectedValue(new Error("secret stack trace"));
    renderPage();

    fillValidForm();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Không thể đăng nhập lúc này. Vui lòng thử lại.");
    expect(alert).not.toHaveTextContent("secret stack trace");
    expect(screen.getByLabelText("Địa chỉ email")).toHaveValue("parent@example.com");
  });

  it("retries bootstrap without repeating password submission", async () => {
    signInEmail.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    const bootstrap = vi.mocked(fetch);
    bootstrap.mockResolvedValueOnce(bootstrapResponse(false) as Response).mockResolvedValueOnce(bootstrapResponse(true) as Response);
    renderPage();

    fillValidForm();
    expect(await screen.findByRole("alert")).toHaveTextContent("Đã đăng nhập nhưng chưa hoàn tất thiết lập tài khoản.");
    fireEvent.click(screen.getByRole("button", { name: "Thử lại thiết lập" }));

    await waitFor(() => expect(bootstrap).toHaveBeenCalledTimes(2));
    expect(signInEmail).toHaveBeenCalledTimes(1);
    expect(await screen.findByTestId("home-route")).toBeInTheDocument();
  });

  it.each([
    ["session expiration", { ok: false, status: 401, payload: { error: { code: "UNAUTHORIZED", message: "internal detail" } } }],
    ["invalid response", { ok: true, status: 200, payload: { household: { id: "not-a-household" } } }]
  ])("keeps bootstrap %s in safe recovery", async (_name, response) => {
    signInEmail.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    vi.mocked(fetch).mockResolvedValue({
      ok: response.ok,
      status: response.status,
      json: async () => response.payload
    } as Response);
    renderPage();

    fillValidForm();

    expect(await screen.findByRole("alert")).toHaveTextContent("Đã đăng nhập nhưng chưa hoàn tất thiết lập tài khoản.");
    expect(screen.getByRole("button", { name: "Đăng nhập" })).toBeDisabled();
    expect(signInEmail).toHaveBeenCalledTimes(1);
  });

  it("prevents duplicate login requests while pending", async () => {
    let resolveSignIn: ((value: unknown) => void) | undefined;
    signInEmail.mockImplementation(() => new Promise((resolve) => { resolveSignIn = resolve; }));
    renderPage();

    fillValidForm();
    fireEvent.submit(screen.getByRole("button", { name: "Đang đăng nhập…" }).closest("form")!);

    expect(signInEmail).toHaveBeenCalledTimes(1);
    resolveSignIn?.({ data: { user: { id: "user-1" } }, error: null });
    vi.mocked(fetch).mockResolvedValue(bootstrapResponse(true) as Response);
    await waitFor(() => expect(screen.getByTestId("home-route")).toBeInTheDocument());
  });

  it("uses the existing session without asking for credentials again", async () => {
    useSession.mockReturnValue({
      data: { user: { id: "existing-user" }, session: { id: "session-1" } },
      isPending: false,
      isRefetching: false,
      error: null,
      refetch
    });
    vi.mocked(fetch).mockResolvedValue(bootstrapResponse(true) as Response);
    renderPage();

    expect(await screen.findByTestId("home-route")).toBeInTheDocument();
    expect(signInEmail).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("offers a safe retry when the existing-session check fails", async () => {
    useSession.mockReturnValue({
      data: null,
      isPending: false,
      isRefetching: false,
      error: { message: "internal session detail" },
      refetch
    });
    renderPage();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Không thể kiểm tra phiên hiện tại. Vui lòng thử lại.");
    expect(alert).not.toHaveTextContent("internal session detail");
    fireEvent.click(screen.getByRole("button", { name: "Thử lại kiểm tra phiên" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
