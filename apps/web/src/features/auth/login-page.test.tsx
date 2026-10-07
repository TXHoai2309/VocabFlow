import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginPage } from "./login-page";
import { requestBootstrap } from "./bootstrap-client";

const { signInEmail, useSession, refetch, bootstrap } = vi.hoisted(() => ({
  signInEmail: vi.fn(),
  useSession: vi.fn(),
  refetch: vi.fn(),
  bootstrap: vi.fn()
}));

vi.mock("./auth-client", () => ({ authClient: { signIn: { email: signInEmail }, useSession } }));
vi.mock("./bootstrap-client", () => ({ requestBootstrap: bootstrap }));

function renderPage() {
  return render(<MemoryRouter initialEntries={["/login"]}><Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/" element={<p data-testid="home-route">Home</p>} />
  </Routes></MemoryRouter>);
}

function submitCredentials() {
  fireEvent.change(screen.getByLabelText("Địa chỉ email"), { target: { value: "parent@example.com" } });
  fireEvent.change(screen.getByLabelText("Mật khẩu"), { target: { value: "secret" } });
  fireEvent.submit(screen.getByRole("button", { name: "Đăng nhập" }).closest("form")!);
}

beforeEach(() => {
  signInEmail.mockReset();
  useSession.mockReset().mockReturnValue({ data: null, isPending: false, isRefetching: false, error: null, refetch });
  refetch.mockReset();
  bootstrap.mockReset();
});

describe("LoginPage session boundary", () => {
  it("keeps the unauthenticated form enabled and has no provisioning recovery UI", () => {
    renderPage();
    expect(screen.getByRole("button", { name: "Đăng nhập" })).toBeEnabled();
    expect(screen.queryByText("Đã đăng nhập nhưng chưa hoàn tất thiết lập tài khoản.")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Thử lại thiết lập" })).not.toBeInTheDocument();
    expect(requestBootstrap).not.toHaveBeenCalled();
  });

  it("redirects an authenticated session to Home without bootstrap", async () => {
    useSession.mockReturnValue({ data: { user: { id: "existing-user" } }, isPending: false, error: null, refetch });
    renderPage();
    expect(await screen.findByTestId("home-route")).toBeInTheDocument();
    expect(signInEmail).not.toHaveBeenCalled();
    expect(requestBootstrap).not.toHaveBeenCalled();
  });

  it("signs in and redirects straight to Home without bootstrap", async () => {
    signInEmail.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    renderPage();
    submitCredentials();
    expect(await screen.findByTestId("home-route")).toBeInTheDocument();
    expect(signInEmail).toHaveBeenCalledExactlyOnceWith({ email: "parent@example.com", password: "secret" });
    expect(requestBootstrap).not.toHaveBeenCalled();
  });

  it("keeps bad credentials safe and retryable", async () => {
    signInEmail.mockResolvedValueOnce({ data: null, error: { code: "INVALID_EMAIL_OR_PASSWORD", message: "secret detail" } })
      .mockResolvedValueOnce({ data: { user: { id: "user-1" } }, error: null });
    renderPage();
    submitCredentials();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Địa chỉ email hoặc mật khẩu không đúng. Vui lòng thử lại.");
    expect(alert).not.toHaveTextContent("secret detail");
    expect(screen.getByRole("button", { name: "Đăng nhập" })).toBeEnabled();
    submitCredentials();
    expect(await screen.findByTestId("home-route")).toBeInTheDocument();
    expect(requestBootstrap).not.toHaveBeenCalled();
  });

  it("keeps network login failures safe and retryable", async () => {
    signInEmail.mockRejectedValueOnce(new Error("secret stack trace"))
      .mockResolvedValueOnce({ data: { user: { id: "user-1" } }, error: null });
    renderPage();
    submitCredentials();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Không thể đăng nhập lúc này. Vui lòng thử lại.");
    expect(alert).not.toHaveTextContent("secret stack trace");
    expect(screen.getByRole("button", { name: "Đăng nhập" })).toBeEnabled();
    submitCredentials();
    expect(await screen.findByTestId("home-route")).toBeInTheDocument();
  });

  it("keeps session-check errors recoverable", async () => {
    useSession.mockReturnValue({ data: null, isPending: false, error: { message: "internal detail" }, refetch });
    renderPage();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Không thể kiểm tra phiên hiện tại. Vui lòng thử lại.");
    expect(alert).not.toHaveTextContent("internal detail");
    fireEvent.click(screen.getByRole("button", { name: "Thử lại kiểm tra phiên" }));
    await waitFor(() => expect(refetch).toHaveBeenCalledOnce());
  });
});
