import { fireEvent, render, screen, within } from "@testing-library/react";
import { Route, Routes, MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import "@testing-library/jest-dom/vitest";
import { AppShell } from "../../components/app-shell";
import { ActiveLearnerProvider } from "../learners/learner-context-provider";
import type { LearnerDto } from "@vocabflow/contracts";

const learner: LearnerDto = {
  id: "00000000-0000-4000-8000-000000000021",
  householdId: "00000000-0000-4000-8000-000000000001",
  displayName: "Avery Nguyen",
  avatarKey: null,
  enabled: true,
  createdAt: "2026-09-10T00:00:00.000Z",
  updatedAt: "2026-09-10T00:00:00.000Z"
};

function renderShell(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ActiveLearnerProvider initialLearner={learner}>
        <Routes>
          <Route element={<AppShell parentName="Jordan Nguyen" />}>
            <Route path="*" element={<div />} />
          </Route>
        </Routes>
      </ActiveLearnerProvider>
    </MemoryRouter>
  );
}

describe("global search AppShell integration", () => {
  it("keeps six desktop nav items, five mobile nav items and one mobile account trigger", () => {
    renderShell("/");
    expect(within(screen.getByRole("navigation", { name: "Điều hướng chính" })).getAllByRole("link")).toHaveLength(6);
    expect(within(screen.getByRole("navigation", { name: "Điều hướng chính trên di động" })).getAllByRole("link")).toHaveLength(5);
    expect(document.querySelectorAll(".app-account-menu-wrap.is-mobile .app-account-trigger")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Tìm từ vựng, chủ đề hoặc bộ từ" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mở tìm kiếm toàn cục" })).toBeInTheDocument();
  });

  it.each([
    ["Ctrl", { ctrlKey: true }],
    ["Cmd", { metaKey: true }]
  ])("%s+K opens the search dialog", (_modifier, modifiers) => {
    renderShell("/");
    fireEvent.keyDown(document, { key: "k", ...modifiers });

    expect(screen.getByRole("dialog", { name: "Tìm kiếm toàn cục" })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Tìm từ vựng, chủ đề hoặc bộ từ" })).toHaveFocus();
  });

  it("does not open the global search in focused Study routes", () => {
    renderShell("/study");
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });

    expect(screen.queryByRole("button", { name: "Tìm từ vựng, chủ đề hoặc bộ từ" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mở tìm kiếm toàn cục" })).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Tìm kiếm toàn cục" })).not.toBeInTheDocument();
  });

  it("does not steal Ctrl+K from a textarea or editable content", () => {
    renderShell("/");
    const textarea = document.createElement("textarea");
    document.body.appendChild(textarea);
    textarea.focus();
    fireEvent.keyDown(textarea, { key: "k", ctrlKey: true });

    expect(screen.queryByRole("dialog", { name: "Tìm kiếm toàn cục" })).not.toBeInTheDocument();
    textarea.remove();
  });
});
