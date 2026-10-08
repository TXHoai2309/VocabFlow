import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
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
    expect(within(dialog).getAllByRole("checkbox")).toHaveLength(2);
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
    fireEvent.click(screen.getByRole("checkbox", { name: "Chọn tất cả" }));
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
  it("selects every enabled set, shows mixed state, then deselects all without duplicates", () => {
    const apply = vi.fn();
    render(<LearningSetPickerDialog sets={[...sets, { ...sets[0]!, id: 4, enabled: false }]} selected={[1, 1]} onCancel={() => {}} onApply={apply} />);
    const bulk = screen.getByRole("checkbox", { name: "Chọn tất cả" });
    expect(bulk).toBePartiallyChecked();
    fireEvent.click(bulk);
    expect(screen.getByRole("checkbox", { name: "Bỏ chọn tất cả" })).toBeChecked();
    expect(screen.getByText("3 bộ từ đã chọn")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Áp dụng (3)" })); expect(apply).toHaveBeenCalledExactlyOnceWith([1, 2, 3]);
    fireEvent.click(screen.getByRole("checkbox", { name: "Bỏ chọn tất cả" }));
    expect(screen.getByRole("checkbox", { name: "Chọn tất cả" })).not.toBeChecked();
    expect(screen.getByText("0 bộ từ đã chọn")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Áp dụng (0)" })).toBeDisabled();
  });
  it("adds/removes only search matches and keeps hidden selections in both counts", () => {
    const apply = vi.fn();
    render(<LearningSetPickerDialog sets={sets} selected={[1]} onCancel={() => {}} onApply={apply} />);
    const search = screen.getByRole("searchbox");
    fireEvent.change(search, { target: { value: "Bộ 2" } });
    expect(screen.getByRole("checkbox", { name: "Chọn tất cả kết quả" })).not.toBeChecked();
    fireEvent.click(screen.getByRole("checkbox", { name: "Chọn tất cả kết quả" }));
    expect(screen.getByText("2 bộ từ đã chọn")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Áp dụng (2)" })).toBeEnabled();
    fireEvent.click(screen.getByRole("checkbox", { name: "Bỏ chọn kết quả" }));
    expect(screen.getByText("1 bộ từ đã chọn")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Áp dụng (1)" })); expect(apply).toHaveBeenCalledExactlyOnceWith([1]);
    fireEvent.change(search, { target: { value: "missing" } });
    const emptyBulk = screen.getByRole("checkbox", { name: "Chọn tất cả kết quả" });
    expect(emptyBulk).toBeDisabled(); expect(emptyBulk).not.toBeChecked(); expect(emptyBulk).not.toBePartiallyChecked();
    expect(screen.getByText("Không tìm thấy bộ từ.")).toBeInTheDocument();
  });
  it.each([0, 47])("rejects over-limit bulk selection atomically with %i already selected", (count) => {
    const catalog = Array.from({ length: 52 }, (_, i) => ({ ...sets[0]!, id: i + 1, name: i < 47 ? `Existing ${i}` : `Extra ${i}` }));
    const selected = catalog.slice(0, count).map((set) => set.id); const apply = vi.fn();
    render(<LearningSetPickerDialog sets={catalog} selected={selected} onCancel={() => {}} onApply={apply} />);
    if (count) fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Extra" } });
    fireEvent.click(screen.getByRole("checkbox", { name: count ? "Chọn tất cả kết quả" : "Chọn tất cả" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Tối đa 50 bộ từ.");
    expect(screen.getByText(`${count} bộ từ đã chọn`)).toBeInTheDocument();
    const button = screen.getByRole("button", { name: `Áp dụng (${count})` });
    if (count) { fireEvent.click(button); expect(apply).toHaveBeenCalledExactlyOnceWith(selected); }
    else expect(button).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: "Extra 47" })).not.toBeChecked();
  });
  it("allows reaching 50 individually and always allows deselecting at the limit", () => {
    const catalog = Array.from({ length: 51 }, (_, i) => ({ ...sets[0]!, id: i + 1, name: `Set ${i + 1}` }));
    render(<LearningSetPickerDialog sets={catalog} selected={catalog.slice(0, 49).map((set) => set.id)} onCancel={() => {}} onApply={() => {}} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Set 50" }));
    expect(screen.getByRole("button", { name: "Áp dụng (50)" })).toBeEnabled();
    expect(screen.getByRole("checkbox", { name: "Set 51" })).toBeDisabled();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Set 50" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "Bỏ chọn kết quả" }));
    expect(screen.getByText("49 bộ từ đã chọn")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "" } });
    expect(screen.getByRole("checkbox", { name: "Set 51" })).toBeEnabled();
  });
  it("bulk Apply commits once and reopening reflects the committed IDs", () => {
    render(<Harness />); fireEvent.click(screen.getByRole("button", { name: "Thay đổi" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Chọn tất cả" }));
    fireEvent.click(screen.getByRole("button", { name: "Áp dụng (3)" }));
    expect(screen.getByRole("status")).toHaveTextContent("1,2,3");
    fireEvent.click(screen.getByRole("button", { name: "Thay đổi" }));
    expect(screen.getByRole("checkbox", { name: "Bỏ chọn tất cả" })).toBeChecked();
  });
});
