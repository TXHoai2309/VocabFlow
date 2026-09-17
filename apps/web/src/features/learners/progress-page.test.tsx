import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import type { LearnerDto, ProgressSummaryResponse } from "@vocabflow/contracts";
import { ActiveLearnerProvider } from "./learner-context-provider";
import { useActiveLearner } from "./learner-context-hook";
import { ProgressPage } from "./progress-page";

const { requestResetLearnerProgress } = vi.hoisted(() => ({ requestResetLearnerProgress: vi.fn() }));

vi.mock("./reset-progress-client", async () => {
  const actual = await vi.importActual<typeof import("./reset-progress-client")>("./reset-progress-client");
  return { ...actual, requestResetLearnerProgress };
});

const learner = (id: string, displayName: string): LearnerDto => ({
  id,
  householdId: "00000000-0000-4000-8000-000000000001",
  displayName,
  avatarKey: null,
  enabled: true,
  createdAt: "2026-09-10T00:00:00.000Z",
  updatedAt: "2026-09-10T00:00:00.000Z"
});

const learnerA = learner("00000000-0000-4000-8000-000000000010", "An");
const learnerB = learner("00000000-0000-4000-8000-000000000011", "Bình");

function summary(learnerId: string, values: Partial<Omit<ProgressSummaryResponse, "learnerId">> = {}): ProgressSummaryResponse {
  return {
    learnerId,
    newCount: values.newCount ?? 30,
    learningCount: values.learningCount ?? 2,
    masteredCount: values.masteredCount ?? 3,
    dueCount: values.dueCount ?? 4,
    learnedCount: values.learnedCount ?? 5
  };
}

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function renderProgress(initialLearner: LearnerDto | null = learnerA) {
  return render(
    <MemoryRouter initialEntries={["/progress"]}>
      <ActiveLearnerProvider initialLearner={initialLearner}>
        <Routes>
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/learners" element={<p>learners-route</p>} />
        </Routes>
      </ActiveLearnerProvider>
    </MemoryRouter>
  );
}

function metric(label: string) {
  return screen.getByText(label).nextElementSibling;
}

describe("US-20 learner progress UI", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    requestResetLearnerProgress.mockReset();
  });

  it("shows loading and then all canonical progress cards", async () => {
    let resolveResponse!: (value: Response) => void;
    const pending = new Promise<Response>((resolve) => { resolveResponse = resolve; });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockReturnValue(pending);
    renderProgress();

    expect(screen.getByTestId("progress-loading")).toBeInTheDocument();
    resolveResponse(response(summary(learnerA.id)));

    expect(await screen.findByTestId("progress-summary")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Tiến trình của An" })).toBeInTheDocument();
    expect(metric("New")).toHaveTextContent("30");
    expect(metric("Learning")).toHaveTextContent("2");
    expect(metric("Mastered")).toHaveTextContent("3");
    expect(metric("Due")).toHaveTextContent("4");
    expect(metric("Learned")).toHaveTextContent("5");
    expect(fetchMock).toHaveBeenCalledWith("/api/learners/" + learnerA.id + "/progress-summary", { credentials: "include" });
  });

  it("shows the explicit empty state without inventing learned words", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(response(summary(learnerA.id, {
      newCount: 30,
      learningCount: 0,
      masteredCount: 0,
      dueCount: 0,
      learnedCount: 0
    })));
    renderProgress();

    expect(await screen.findByTestId("progress-empty-state")).toHaveTextContent("Chưa học từ nào");
    expect(metric("New")).toHaveTextContent("30");
    expect(metric("Learned")).toHaveTextContent("0");
  });

  it("shows a safe retry state after a progress request failure", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response({ error: { code: "INTERNAL_ERROR" } }, 503))
      .mockResolvedValueOnce(response(summary(learnerA.id)));
    renderProgress();

    expect(await screen.findByTestId("progress-error")).toHaveTextContent("Không thể tải tiến trình lúc này. Vui lòng thử lại.");
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    await waitFor(() => expect(screen.getByTestId("progress-summary")).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("refreshes by learner id and never keeps the previous learner summary", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response(summary(learnerA.id, { learnedCount: 1 })))
      .mockResolvedValueOnce(response(summary(learnerB.id, { learnedCount: 9 })));

    function SwitchHarness() {
      const { setActiveLearner } = useActiveLearner();
      return (
        <>
          <button type="button" onClick={() => setActiveLearner(learnerB)}>Switch learner</button>
          <ProgressPage />
        </>
      );
    }

    render(
      <MemoryRouter initialEntries={["/progress"]}>
        <ActiveLearnerProvider initialLearner={learnerA}>
          <SwitchHarness />
        </ActiveLearnerProvider>
      </MemoryRouter>
    );

    expect(await screen.findByRole("heading", { name: "Tiến trình của An" })).toBeInTheDocument();
    expect(metric("Learned")).toHaveTextContent("1");
    fireEvent.click(screen.getByRole("button", { name: "Switch learner" }));
    expect(await screen.findByRole("heading", { name: "Tiến trình của Bình" })).toBeInTheDocument();
    await waitFor(() => expect(metric("Learned")).toHaveTextContent("9"));
    expect(screen.queryByText("Tiến trình của An")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/learners/" + learnerA.id + "/progress-summary", { credentials: "include" });
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/learners/" + learnerB.id + "/progress-summary", { credentials: "include" });
  });

  it("redirects to learner home when no active learner exists", async () => {
    renderProgress(null);
    expect(await screen.findByText("learners-route")).toBeInTheDocument();
  });

  it("requires confirmation, locks duplicate reset submits, and refreshes the summary", async () => {
    const resetResponse = { learnerId: learnerA.id, deletedProgressCount: 2 };
    let resolveReset!: (value: typeof resetResponse) => void;
    requestResetLearnerProgress.mockReturnValue(new Promise((resolve) => { resolveReset = resolve; }));
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response(summary(learnerA.id, { learnedCount: 2 })))
      .mockResolvedValueOnce(response(summary(learnerA.id, { newCount: 30, learningCount: 0, masteredCount: 0, dueCount: 0, learnedCount: 0 })));
    renderProgress();

    await screen.findByTestId("progress-summary");
    fireEvent.click(screen.getByRole("button", { name: "Reset tiến trình" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Reset tiến trình của An?");
    expect(screen.getByRole("dialog")).toHaveTextContent("lịch sử review vẫn được giữ lại");
    fireEvent.click(screen.getByRole("button", { name: "Hủy" }));
    expect(requestResetLearnerProgress).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Reset tiến trình" }));
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận reset" }));
    fireEvent.click(screen.getByRole("button", { name: "Đang reset…" }));
    expect(requestResetLearnerProgress).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Đang reset…" })).toBeDisabled();
    resolveReset(resetResponse);

    await waitFor(() => expect(screen.getByTestId("progress-empty-state")).toBeInTheDocument());
    expect(screen.getByText("Đã reset tiến trình của An.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("keeps the dialog open and usable after reset failure", async () => {
    requestResetLearnerProgress.mockRejectedValue(new Error("network"));
    vi.spyOn(globalThis, "fetch").mockResolvedValue(response(summary(learnerA.id)));
    renderProgress();
    await screen.findByTestId("progress-summary");
    fireEvent.click(screen.getByRole("button", { name: "Reset tiến trình" }));
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận reset" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Không thể reset tiến trình lúc này. Vui lòng thử lại.");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Xác nhận reset" })).toBeEnabled();
  });
});
