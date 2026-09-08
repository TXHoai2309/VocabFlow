import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { RegisterForm } from "./register-form";

function renderForm(onValidSubmit = vi.fn()) {
  return render(
    <MemoryRouter>
      <RegisterForm onValidSubmit={onValidSubmit} />
    </MemoryRouter>
  );
}

describe("RegisterForm", () => {
  it("shows visible labels and registration autocomplete values", () => {
    renderForm();
    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Email")).toHaveAttribute("autocomplete", "email");
    expect(screen.getByLabelText("Mật khẩu")).toHaveAttribute("type", "password");
    expect(screen.getByLabelText("Mật khẩu")).toHaveAttribute("autocomplete", "new-password");
  });

  it("reports required errors for an empty submit", () => {
    renderForm();
    fireEvent.submit(screen.getByRole("button", { name: "Tạo tài khoản" }).closest("form")!);
    expect(screen.getByText("Vui lòng nhập email.")).toBeInTheDocument();
    expect(screen.getByText("Vui lòng nhập mật khẩu.")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Mật khẩu")).toHaveAttribute("aria-invalid", "true");
  });

  it("distinguishes invalid email format", () => {
    renderForm();
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "not-an-email" } });
    fireEvent.change(screen.getByLabelText("Mật khẩu"), { target: { value: "secret" } });
    fireEvent.submit(screen.getByRole("button", { name: "Tạo tài khoản" }).closest("form")!);
    expect(screen.getByText("Vui lòng nhập email hợp lệ.")).toBeInTheDocument();
  });

  it("passes normalized valid values to the Phase-1 submission seam", () => {
    const onValidSubmit = vi.fn();
    renderForm(onValidSubmit);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "  parent@example.com  " } });
    fireEvent.change(screen.getByLabelText("Mật khẩu"), { target: { value: "secret" } });
    fireEvent.submit(screen.getByRole("button", { name: "Tạo tài khoản" }).closest("form")!);
    expect(onValidSubmit).toHaveBeenCalledWith({ email: "parent@example.com", password: "secret" });
  });

  it("preserves the password while toggling visibility", () => {
    renderForm();
    const password = screen.getByLabelText("Mật khẩu");
    fireEvent.change(password, { target: { value: "secret" } });
    fireEvent.click(screen.getByRole("button", { name: "Hiện mật khẩu" }));
    expect(screen.getByLabelText("Mật khẩu")).toHaveAttribute("type", "text");
    expect(screen.getByLabelText("Mật khẩu")).toHaveValue("secret");
    fireEvent.click(screen.getByRole("button", { name: "Ẩn mật khẩu" }));
    expect(screen.getByLabelText("Mật khẩu")).toHaveAttribute("type", "password");
    expect(screen.getByLabelText("Mật khẩu")).toHaveValue("secret");
  });

  it("submits through the semantic form when Enter submits", () => {
    const onValidSubmit = vi.fn();
    renderForm(onValidSubmit);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "parent@example.com" } });
    fireEvent.change(screen.getByLabelText("Mật khẩu"), { target: { value: "secret" } });
    const form = screen.getByLabelText("Email").closest("form")!;
    fireEvent.keyDown(screen.getByLabelText("Email"), { key: "Enter", code: "Enter" });
    fireEvent.submit(form);
    expect(onValidSubmit).toHaveBeenCalledTimes(1);
  });

  it("associates inline errors with fields", () => {
    renderForm();
    fireEvent.submit(screen.getByRole("button", { name: "Tạo tài khoản" }).closest("form")!);
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-describedby", "register-email-error");
    expect(screen.getByLabelText("Mật khẩu")).toHaveAttribute("aria-describedby", "register-password-error");
    expect(screen.getAllByRole("alert")[0]).toHaveTextContent("Vui lòng nhập email.");
    expect(screen.getAllByRole("alert")[1]).toHaveTextContent("Vui lòng nhập mật khẩu.");
  });

  it("blocks duplicate async submits while the seam is pending", async () => {
    let resolveSubmit: (() => void) | undefined;
    const onValidSubmit = vi.fn(() => new Promise<void>((resolve) => { resolveSubmit = resolve; }));
    renderForm(onValidSubmit);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "parent@example.com" } });
    fireEvent.change(screen.getByLabelText("Mật khẩu"), { target: { value: "secret" } });
    const form = screen.getByLabelText("Email").closest("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(onValidSubmit).toHaveBeenCalledTimes(1);
    resolveSubmit?.();
  });
});
