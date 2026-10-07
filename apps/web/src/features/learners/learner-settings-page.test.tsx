import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import type { LearnerDto } from "@vocabflow/contracts";
import { LearnerSettingsClientError } from "./learner-settings-client";
import { LearnerSettingsPage } from "./learner-settings-page";
import { ToastProvider } from "../../components/toast/toast-provider";

const { requestLearnerSettings, updateLearnerSettings } = vi.hoisted(() => ({
  requestLearnerSettings: vi.fn(),
  updateLearnerSettings: vi.fn()
}));

vi.mock("./learner-context-hook", () => ({
  useActiveLearner: () => ({ activeLearner })
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

let activeLearner: LearnerDto | null = learner;

function renderPage() {
  return render(
    <MemoryRouter>
      <ToastProvider><LearnerSettingsPage /></ToastProvider>
    </MemoryRouter>
  );
}

describe("US-30 learner settings UI", () => {
  beforeEach(() => {
    activeLearner = learner;
    requestLearnerSettings.mockReset();
    updateLearnerSettings.mockReset();
  });

  it("loads, edits, saves, and prevents duplicate submits", async () => {
    requestLearnerSettings.mockResolvedValue({ learnerId: learner.id, dailyNewWordLimit: 10, dailyNewWordGoal: 10, dailyReviewWordGoal: 20 });
    let resolveSave: ((value: { learnerId: string; dailyNewWordLimit: number; dailyNewWordGoal: number; dailyReviewWordGoal: number }) => void) | undefined;
    updateLearnerSettings.mockImplementation(() => new Promise((resolve) => { resolveSave = resolve; }));
    renderPage();

    expect(await screen.findByLabelText("Từ mới mỗi ngày")).toHaveValue(10);
    expect(screen.getByLabelText("Từ ôn tập mỗi ngày")).toHaveValue(20);
    const input = screen.getByLabelText("Giới hạn từ mới scheduler mỗi ngày");
    fireEvent.change(input, { target: { value: "5" } });
    fireEvent.change(screen.getByLabelText("Từ mới mỗi ngày"), { target: { value: "5" } });
    fireEvent.change(screen.getByLabelText("Từ ôn tập mỗi ngày"), { target: { value: "15" } });
    const form = screen.getByRole("button", { name: "Lưu cài đặt" }).closest("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(updateLearnerSettings).toHaveBeenCalledTimes(1);
    expect(updateLearnerSettings).toHaveBeenCalledWith(learner.id, { dailyNewWordLimit: 5, dailyNewWordGoal: 5, dailyReviewWordGoal: 15 });
    expect(screen.getByRole("button", { name: "Đang lưu…" })).toBeDisabled();
    resolveSave?.({ learnerId: learner.id, dailyNewWordLimit: 5, dailyNewWordGoal: 5, dailyReviewWordGoal: 15 });
    await waitFor(() => expect(screen.getByTestId("toast-success")).toHaveTextContent("Đã lưu cài đặt"));
    expect(screen.queryByText("Đã lưu cài đặt học của An.")).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("retries a failed settings load using the same learner", async () => {
    requestLearnerSettings
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ learnerId: learner.id, dailyNewWordLimit: 10, dailyNewWordGoal: 10, dailyReviewWordGoal: 20 });
    renderPage();

    expect(await screen.findByTestId("learner-settings-error")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));

    expect(await screen.findByLabelText("Từ mới mỗi ngày")).toHaveValue(10);
    expect(requestLearnerSettings).toHaveBeenNthCalledWith(1, learner.id);
    expect(requestLearnerSettings).toHaveBeenNthCalledWith(2, learner.id);
  });

  it("rejects invalid values before the API call and renders API errors", async () => {
    requestLearnerSettings.mockResolvedValue({ learnerId: learner.id, dailyNewWordLimit: 10, dailyNewWordGoal: 10, dailyReviewWordGoal: 20 });
    updateLearnerSettings.mockRejectedValue(new LearnerSettingsClientError("INTERNAL_ERROR", 503));
    renderPage();
    const input = await screen.findByLabelText("Giới hạn từ mới scheduler mỗi ngày");
    fireEvent.change(input, { target: { value: "101" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu cài đặt" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Nhập một số nguyên từ 0 đến 100.");
    expect(updateLearnerSettings).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: "10" } });
    const newGoalInput = screen.getByLabelText("Từ mới mỗi ngày");
    for (const value of ["0", "-1", "101", "1.5", ""]) {
      fireEvent.change(newGoalInput, { target: { value } });
      fireEvent.click(screen.getByRole("button", { name: "Lưu cài đặt" }));
      expect(await screen.findByText("Nhập một số nguyên từ 1 đến 100.")).toHaveAttribute("role", "alert");
      expect(updateLearnerSettings).not.toHaveBeenCalled();
    }
    const reviewGoalInput = screen.getByLabelText("Từ ôn tập mỗi ngày");
    fireEvent.change(reviewGoalInput, { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu cài đặt" }));
    expect(await screen.findAllByText("Nhập một số nguyên từ 1 đến 100.")).toHaveLength(2);
    expect(updateLearnerSettings).not.toHaveBeenCalled();

    fireEvent.change(newGoalInput, { target: { value: "10" } });
    fireEvent.change(reviewGoalInput, { target: { value: "20" } });
    fireEvent.change(input, { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu cài đặt" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Không thể lưu cài đặt. Vui lòng thử lại.");
    expect(input).toHaveValue(5);
  });

  it("persists changed goals across a fresh Settings load", async () => {
    let saved = { learnerId: learner.id, dailyNewWordLimit: 10, dailyNewWordGoal: 10, dailyReviewWordGoal: 20 };
    requestLearnerSettings.mockImplementation(async () => ({ ...saved }));
    updateLearnerSettings.mockImplementation(async (_id: string, update: Partial<typeof saved>) => {
      saved = { ...saved, ...update };
      return { ...saved };
    });

    const firstView = renderPage();
    fireEvent.change(await screen.findByLabelText("Từ mới mỗi ngày"), { target: { value: "5" } });
    fireEvent.change(screen.getByLabelText("Từ ôn tập mỗi ngày"), { target: { value: "15" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu cài đặt" }));
    expect(await screen.findByTestId("toast-success")).toHaveTextContent("Đã lưu cài đặt");
    firstView.unmount();

    renderPage();
    expect(await screen.findByLabelText("Từ mới mỗi ngày")).toHaveValue(5);
    expect(screen.getByLabelText("Từ ôn tập mỗi ngày")).toHaveValue(15);
  });

  it("loads goals belonging to the newly active learner", async () => {
    const learnerB = { ...learner, id: "00000000-0000-4000-8000-000000000011", displayName: "Bình" };
    requestLearnerSettings.mockImplementation(async (id: string) => id === learner.id
      ? { learnerId: learner.id, dailyNewWordLimit: 10, dailyNewWordGoal: 10, dailyReviewWordGoal: 20 }
      : { learnerId: learnerB.id, dailyNewWordLimit: 4, dailyNewWordGoal: 5, dailyReviewWordGoal: 10 });

    const view = renderPage();
    expect(await screen.findByLabelText("Từ mới mỗi ngày")).toHaveValue(10);
    activeLearner = learnerB;
    view.rerender(<MemoryRouter><ToastProvider><LearnerSettingsPage /></ToastProvider></MemoryRouter>);
    expect(await screen.findByLabelText("Từ mới mỗi ngày")).toHaveValue(5);
    expect(screen.getByLabelText("Từ ôn tập mỗi ngày")).toHaveValue(10);
    expect(requestLearnerSettings).toHaveBeenLastCalledWith(learnerB.id);
  });
});
