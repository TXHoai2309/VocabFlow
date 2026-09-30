import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import App from "./App";

const { useSession } = vi.hoisted(() => ({ useSession: vi.fn() }));

vi.mock("./features/auth/auth-client", () => ({ authClient: { useSession } }));

beforeEach(() => {
  useSession.mockReturnValue({ data: null, isPending: false, error: null, refetch: vi.fn() });
});

describe("application routing", () => {
  it("routes an unauthenticated Home visit through the existing login page", () => {
    render(<MemoryRouter initialEntries={["/"]}><App /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "Đăng nhập" })).toBeInTheDocument();
  });

  it("renders the nested foundation route", () => {
    render(<MemoryRouter initialEntries={["/foundation"]}><App /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: /foundation route is working/i })).toBeInTheDocument();
  });
});

describe("register route", () => {
  it("renders the parent registration screen without app navigation", () => {
    render(<MemoryRouter initialEntries={["/register"]}><App /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "Tạo tài khoản" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Tên phụ huynh" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Email" })).toBeInTheDocument();
    expect(screen.getByLabelText("Mật khẩu")).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Foundation navigation" })).not.toBeInTheDocument();
  });
});

describe("login route", () => {
  it("renders the parent login screen without app navigation", () => {
    render(<MemoryRouter initialEntries={["/login"]}><App /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "Đăng nhập" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Email" })).toBeInTheDocument();
    expect(screen.getByLabelText("Mật khẩu")).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Foundation navigation" })).not.toBeInTheDocument();
  });
});
