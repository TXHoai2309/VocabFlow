import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Link, MemoryRouter, Route, Routes } from "react-router";
import { ToastProvider } from "./toast-provider";
import { useToast } from "./toast-context";

function ToastControls() {
  const toast = useToast();
  return (
    <div>
      <button type="button" onClick={() => toast.success("Đã lưu")}>Success</button>
      <button type="button" onClick={() => toast.info("Đã cập nhật")}>Info</button>
      <button type="button" onClick={() => toast.error("Không thể lưu")}>Error</button>
      <button type="button" onClick={() => toast.success("Trùng")}>Duplicate</button>
      <button type="button" onClick={() => toast.success("Khác")}>Other</button>
      <button type="button" onClick={() => toast.success("Thứ ba")}>Third</button>
    </div>
  );
}

afterEach(() => vi.useRealTimers());

describe("shared toast feedback", () => {
  it("renders success and info with polite status semantics", () => {
    render(<ToastProvider><ToastControls /></ToastProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Success" }));
    fireEvent.click(screen.getByRole("button", { name: "Info" }));

    expect(screen.getByTestId("toast-success")).toHaveAttribute("role", "status");
    expect(screen.getByTestId("toast-success")).toHaveAttribute("aria-live", "polite");
    expect(screen.getByTestId("toast-info")).toHaveAttribute("role", "status");
    expect(screen.getByTestId("toast-info")).toHaveAttribute("aria-live", "polite");
    expect(screen.getByTestId("toast-success")).toHaveTextContent("Đã lưu");
  });

  it("renders errors as assertive alerts", () => {
    render(<ToastProvider><ToastControls /></ToastProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Error" }));

    expect(screen.getByTestId("toast-error")).toHaveAttribute("role", "alert");
    expect(screen.getByTestId("toast-error")).toHaveAttribute("aria-live", "assertive");
    expect(screen.getByTestId("toast-error")).toHaveTextContent("Không thể lưu");
  });

  it("dismisses a toast with its accessible close button", () => {
    render(<ToastProvider><ToastControls /></ToastProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Success" }));
    fireEvent.click(screen.getByRole("button", { name: "Đóng thông báo" }));

    expect(screen.queryByTestId("toast-success")).not.toBeInTheDocument();
  });

  it("automatically dismisses success after four seconds", () => {
    vi.useFakeTimers();
    render(<ToastProvider><ToastControls /></ToastProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Success" }));
    expect(screen.getByTestId("toast-success")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(4000));

    expect(screen.queryByTestId("toast-success")).not.toBeInTheDocument();
  });

  it("bounds the stack to three items and replaces a duplicate message", () => {
    render(<ToastProvider><ToastControls /></ToastProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Duplicate" }));
    fireEvent.click(screen.getByRole("button", { name: "Other" }));
    fireEvent.click(screen.getByRole("button", { name: "Third" }));
    fireEvent.click(screen.getByRole("button", { name: "Duplicate" }));

    expect(screen.getAllByTestId("toast-success")).toHaveLength(3);
    expect(screen.getAllByTestId("toast-success").filter((toast) => toast.textContent?.includes("Trùng"))).toHaveLength(1);
  });

  it("keeps a toast visible when the route changes", () => {
    function Home() {
      const toast = useToast();
      return <><button type="button" onClick={() => toast.success("Đã tạo hồ sơ người học")}>Create</button><Link to="/next">Next</Link></>;
    }
    render(
      <MemoryRouter initialEntries={["/"]}>
        <ToastProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/next" element={<p>Trang tiếp theo</p>} />
          </Routes>
        </ToastProvider>
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    fireEvent.click(screen.getByRole("link", { name: "Next" }));

    expect(screen.getByText("Trang tiếp theo")).toBeInTheDocument();
    expect(screen.getByTestId("toast-success")).toHaveTextContent("Đã tạo hồ sơ người học");
  });
});
