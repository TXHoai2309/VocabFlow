import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import "@testing-library/jest-dom/vitest";
import { LearningSetPickerDialog } from "./learning-set-picker-dialog";

const sets = [1, 2, 3].map((id) => ({ id, name: `Bộ ${id}`, slug: `set-${id}`, description: "Test words", enabled: true, sortOrder: id, grade: null, vocabularyCount: id * 10 }));
function Harness() {
  const [selected, setSelected] = useState<number[]>([]);
  const [open, setOpen] = useState(false);
  return <><button onClick={() => setOpen(true)}>Thay đổi</button><output>{selected.join(",")}</output>{open ? <LearningSetPickerDialog sets={sets} selected={selected} onCancel={() => setOpen(false)} onApply={(ids) => { setSelected(ids); setOpen(false); }} /> : null}</>;
}
describe("Learning set draft picker", () => {
  it("searches, validates zero, applies multiple IDs and restores committed selection", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Thay đổi" }));
    const dialog = screen.getByRole("dialog", { name: "Chọn bộ từ" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    const search = screen.getByRole("searchbox", { name: "Tìm bộ từ..." });
    expect(search).toHaveFocus();
    expect(screen.getByRole("button", { name: "Áp dụng (0)" })).toBeDisabled();
    expect(within(dialog).getByRole("status")).toHaveTextContent("Chọn ít nhất một bộ từ.");
    fireEvent.change(search, { target: { value: "Bộ 2" } });
    expect(within(dialog).getAllByRole("checkbox")).toHaveLength(1);
    fireEvent.click(screen.getByRole("checkbox", { name: "Bộ 2" }));
    fireEvent.change(search, { target: { value: "" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "Bộ 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Áp dụng (2)" }));
    expect(screen.getByRole("status")).toHaveTextContent("1,2");
    fireEvent.click(screen.getByRole("button", { name: "Thay đổi" }));
    expect(screen.getByRole("checkbox", { name: "Bộ 1" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Bộ 2" })).toBeChecked();
  });
  it.each(["Hủy", "Đóng chọn bộ từ", "Escape", "backdrop"])("%s discards draft and restores focus", (action) => {
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Thay đổi" }); trigger.focus(); fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("checkbox", { name: "Bộ 3" }));
    if (action === "Escape") fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    else if (action === "backdrop") fireEvent.mouseDown(screen.getByRole("dialog").parentElement!);
    else fireEvent.click(screen.getByRole("button", { name: action }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(); expect(trigger).toHaveFocus();
    fireEvent.click(trigger); expect(screen.getByRole("checkbox", { name: "Bộ 3" })).not.toBeChecked();
  });
  it("cycles Tab and Shift Tab within enabled dialog controls", () => {
    render(<Harness />); fireEvent.click(screen.getByRole("button", { name: "Thay đổi" }));
    const close = screen.getByRole("button", { name: "Đóng chọn bộ từ" });
    const cancel = screen.getByRole("button", { name: "Hủy" });
    close.focus(); fireEvent.keyDown(close, { key: "Tab", shiftKey: true }); expect(cancel).toHaveFocus();
    fireEvent.keyDown(cancel, { key: "Tab" }); expect(close).toHaveFocus();
  });
});
