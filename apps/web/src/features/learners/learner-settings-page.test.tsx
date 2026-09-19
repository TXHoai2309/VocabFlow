import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import type { LearnerDto } from "@vocabflow/contracts";
import { LearnerSettingsClientError } from "./learner-settings-client";
import { LearnerSettingsPage } from "./learner-settings-page";

const { requestLearnerSettings, updateLearnerSettings } = vi.hoisted(() => ({
  requestLearnerSettings: vi.fn(),
  updateLearnerSettings: vi.fn()
}));

vi.mock("./learner-context-hook", () => ({
  useActiveLearner: () => ({ activeLearner: learner })
}));
vi.mock("./learner-settings-client", async () => {
  const actual = await vi.importActual<typeof import("./learner-settings-client")>("./learner-settings-client");
  return { ...actual, requestLearnerSettings, updateLearnerSettings };
});

const learner: LearnerDto = {
  id: "00000000-0000-4000-8000-000000000010",
  householdId: "00000000-0000-4000-8000-000000000001",
  displayName: "An",
  avatarKey: null,
  enabled: true,
  createdAt: "2026-09-10T00:00:00.000Z",
  updatedAt: "2026-09-10T00:00:00.000Z"
};

function renderPage() {
  return render(
    <MemoryRouter>
      <LearnerSettingsPage />
    </MemoryRouter>
  );
}

describe("US-30 learner settings UI", () => {
  beforeEach(() => {
    requestLearnerSettings.mockReset();
    updateLearnerSettings.mockReset();
  });

  it("loads, edits, saves, and prevents duplicate submits", async () => {
    requestLearnerSettings.mockResolvedValue({ learnerId: learner.id, dailyNewWordLimit: 10, dailyLearningGoal: 10 });
    let resolveSave: ((value: { learnerId: string; dailyNewWordLimit: number; dailyLearningGoal: number }) => void) | undefined;
    updateLearnerSettings.mockImplementation(() => new Promise((resolve) => { resolveSave = resolve; }));
    renderPage();

    expect(await screen.findByLabelText("Mục tiêu học mỗi ngày")).toHaveValue(10);
    const input = screen.getByLabelText("Số từ mới tối đa mỗi ngày");
    fireEvent.change(input, { target: { value: "5" } });
    const form = screen.getByRole("button", { name: "Lưu cài đặt" }).closest("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(updateLearnerSettings).toHaveBeenCalledTimes(1);
    expect(updateLearnerSettings).toHaveBeenCalledWith(learner.id, { dailyNewWordLimit: 5, dailyLearningGoal: 10 });
    expect(screen.getByRole("button", { name: "Đang lưu…" })).toBeDisabled();
    resolveSave?.({ learnerId: learner.id, dailyNewWordLimit: 5, dailyLearningGoal: 10 });
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Đã lưu cài đặt học của An."));
  });

  it("rejects invalid values before the API call and renders API errors", async () => {
    requestLearnerSettings.mockResolvedValue({ learnerId: learner.id, dailyNewWordLimit: 10, dailyLearningGoal: 10 });
    updateLearnerSettings.mockRejectedValue(new LearnerSettingsClientError("INTERNAL_ERROR", 503));
    renderPage();
    const input = await screen.findByLabelText("Số từ mới tối đa mỗi ngày");
    fireEvent.change(input, { target: { value: "101" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu cài đặt" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Nhập một số nguyên từ 0 đến 100.");
    expect(updateLearnerSettings).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu cài đặt" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Không thể tải cài đặt learner lúc này. Vui lòng thử lại.");
  });
});
