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
    expect(screen.getByLabelText("Tên của bạn")).toHaveAttribute("type", "text");
    expect(screen.getByLabelText("Tên của bạn")).toHaveAttribute("autocomplete", "name");
    expect(screen.getByLabelText("Địa chỉ email")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Địa chỉ email")).toHaveAttribute("autocomplete", "email");
    expect(screen.getByLabelText("Mật khẩu")).toHaveAttribute("type", "password");
    expect(screen.getByLabelText("Mật khẩu")).toHaveAttribute("autocomplete", "new-password");
  });

  it("reports required errors for an empty submit", () => {
    renderForm();
    fireEvent.submit(screen.getByRole("button", { name: "Tạo tài khoản" }).closest("form")!);
    expect(screen.getByText("Vui lòng nhập tên của bạn.")).toBeInTheDocument();
    expect(screen.getByText("Vui lòng nhập địa chỉ email.")).toBeInTheDocument();
    expect(screen.getByText("Vui lòng nhập mật khẩu.")).toBeInTheDocument();
    expect(screen.getByLabelText("Tên của bạn")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Địa chỉ email")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Mật khẩu")).toHaveAttribute("aria-invalid", "true");
  });

  it("distinguishes invalid email format", () => {
    renderForm();
    fireEvent.change(screen.getByLabelText("Tên của bạn"), { target: { value: "Phụ huynh" } });
    fireEvent.change(screen.getByLabelText("Địa chỉ email"), { target: { value: "not-an-email" } });
    fireEvent.change(screen.getByLabelText("Mật khẩu"), { target: { value: "secret" } });
    fireEvent.submit(screen.getByRole("button", { name: "Tạo tài khoản" }).closest("form")!);
    expect(screen.getByText("Vui lòng nhập địa chỉ email hợp lệ.")).toBeInTheDocument();
  });

  it("passes normalized valid values to the Phase-1 submission seam", () => {
    const onValidSubmit = vi.fn();
    renderForm(onValidSubmit);
    fireEvent.change(screen.getByLabelText("Tên của bạn"), { target: { value: "  Nguyễn Thị Lan  " } });
    fireEvent.change(screen.getByLabelText("Địa chỉ email"), { target: { value: "  parent@example.com  " } });
    fireEvent.change(screen.getByLabelText("Mật khẩu"), { target: { value: "secret" } });
    fireEvent.submit(screen.getByRole("button", { name: "Tạo tài khoản" }).closest("form")!);
    expect(onValidSubmit).toHaveBeenCalledWith({ name: "Nguyễn Thị Lan", email: "parent@example.com", password: "secret" });
  });

  it("rejects an empty or whitespace-only parent name", () => {
    renderForm();
    fireEvent.change(screen.getByLabelText("Tên của bạn"), { target: { value: "   " } });
    fireEvent.submit(screen.getByRole("button", { name: "Tạo tài khoản" }).closest("form")!);
    expect(screen.getByText("Vui lòng nhập tên của bạn.")).toBeInTheDocument();
  });

  it("accepts Vietnamese Unicode names", () => {
    const onValidSubmit = vi.fn();
    renderForm(onValidSubmit);
    fireEvent.change(screen.getByLabelText("Tên của bạn"), { target: { value: "Đặng Thùy Trang" } });
    fireEvent.change(screen.getByLabelText("Địa chỉ email"), { target: { value: "parent@example.com" } });
    fireEvent.change(screen.getByLabelText("Mật khẩu"), { target: { value: "secret" } });
    fireEvent.submit(screen.getByRole("button", { name: "Tạo tài khoản" }).closest("form")!);
    expect(onValidSubmit).toHaveBeenCalledWith({ name: "Đặng Thùy Trang", email: "parent@example.com", password: "secret" });
  });

  it("keeps the entered parent name after validation failure", () => {
    renderForm();
    fireEvent.change(screen.getByLabelText("Tên của bạn"), { target: { value: "Nguyễn An" } });
    fireEvent.submit(screen.getByRole("button", { name: "Tạo tài khoản" }).closest("form")!);
    expect(screen.getByLabelText("Tên của bạn")).toHaveValue("Nguyễn An");
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
    fireEvent.change(screen.getByLabelText("Tên của bạn"), { target: { value: "Parent" } });
    fireEvent.change(screen.getByLabelText("Địa chỉ email"), { target: { value: "parent@example.com" } });
    fireEvent.change(screen.getByLabelText("Mật khẩu"), { target: { value: "secret" } });
    const form = screen.getByLabelText("Địa chỉ email").closest("form")!;
    fireEvent.keyDown(screen.getByLabelText("Địa chỉ email"), { key: "Enter", code: "Enter" });
    fireEvent.submit(form);
    expect(onValidSubmit).toHaveBeenCalledTimes(1);
  });

  it("associates inline errors with fields", () => {
    renderForm();
    fireEvent.submit(screen.getByRole("button", { name: "Tạo tài khoản" }).closest("form")!);
    expect(screen.getByLabelText("Tên của bạn")).toHaveAttribute("aria-describedby", "register-name-error");
    expect(screen.getByLabelText("Địa chỉ email")).toHaveAttribute("aria-describedby", "register-email-error");
    expect(screen.getByLabelText("Mật khẩu")).toHaveAttribute("aria-describedby", "register-password-error");
    expect(screen.getAllByRole("alert")[0]).toHaveTextContent("Vui lòng nhập tên của bạn.");
    expect(screen.getAllByRole("alert")[1]).toHaveTextContent("Vui lòng nhập địa chỉ email.");
    expect(screen.getAllByRole("alert")[2]).toHaveTextContent("Vui lòng nhập mật khẩu.");
  });

  it("blocks duplicate async submits while the seam is pending", async () => {
    let resolveSubmit: (() => void) | undefined;
    const onValidSubmit = vi.fn(() => new Promise<void>((resolve) => { resolveSubmit = resolve; }));
    renderForm(onValidSubmit);
    fireEvent.change(screen.getByLabelText("Tên của bạn"), { target: { value: "Parent" } });
    fireEvent.change(screen.getByLabelText("Địa chỉ email"), { target: { value: "parent@example.com" } });
    fireEvent.change(screen.getByLabelText("Mật khẩu"), { target: { value: "secret" } });
    const form = screen.getByLabelText("Địa chỉ email").closest("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(onValidSubmit).toHaveBeenCalledTimes(1);
    resolveSubmit?.();
  });
});
