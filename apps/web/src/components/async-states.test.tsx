import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EmptyState, ErrorState, LoadingState } from "./async-states";

describe("shared asynchronous states", () => {
  it("announces loading while hiding the decorative skeleton", () => {
    render(<LoadingState label="Đang tải từ vựng…" pattern="cards" testId="async-loading" />);
    const state = screen.getByRole("status", { name: "Đang tải từ vựng…" });
    expect(state).toHaveAttribute("aria-busy", "true");
    expect(state).toHaveTextContent("Đang tải từ vựng…");
    expect(state.querySelector(".async-skeleton-cards")).toHaveAttribute("aria-hidden", "true");
  });

  it("renders a guided empty state with an optional action", () => {
    render(<EmptyState icon="bookmark" title="Chưa có từ yêu thích" description="Hãy lưu từ để học lại sau." action={<button>Khám phá từ vựng</button>} />);
    expect(screen.getByRole("status")).toHaveTextContent("Chưa có từ yêu thích");
    expect(screen.getByText("Hãy lưu từ để học lại sau.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Khám phá từ vựng" })).toBeInTheDocument();
  });

  it("allows empty states without an unnecessary action", () => {
    render(<EmptyState title="Không có nội dung" description="Thử lại sau." />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("calls retry once and can disable retry while a request is pending", () => {
    const onRetry = vi.fn();
    const { rerender } = render(<ErrorState description="Vui lòng thử lại." onRetry={onRetry} />);
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    rerender(<ErrorState description="Vui lòng thử lại." onRetry={onRetry} retrying />);
    expect(screen.getByRole("button", { name: "Đang thử lại…" })).toBeDisabled();
  });
});
