import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import type { LearnerDto } from "@vocabflow/contracts";
import { LearnerClientError } from "./learner-client";
import { LearnerPage } from "./learner-page";

const { useSession, requestLearners, createLearner } = vi.hoisted(() => ({
  useSession: vi.fn(),
  requestLearners: vi.fn(),
  createLearner: vi.fn()
}));

vi.mock("../auth/auth-client", () => ({ authClient: { useSession } }));
vi.mock("./learner-client", async () => {
  const actual = await vi.importActual<typeof import("./learner-client")>("./learner-client");
  return { ...actual, requestLearners, createLearner };
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

function renderPage() {
  return render(<MemoryRouter><LearnerPage /></MemoryRouter>);
}

describe("US-03 learner resolution UI", () => {
  beforeEach(() => {
    useSession.mockReset();
    requestLearners.mockReset();
    createLearner.mockReset();
    useSession.mockReturnValue({ data: { user: { id: "parent-1" } }, isPending: false, error: null });
  });

  it("shows the zero-learner empty state and creates the first learner", async () => {
    const first = learner("00000000-0000-4000-8000-000000000010", "An");
    requestLearners.mockResolvedValue([]);
    createLearner.mockResolvedValue(first);
    renderPage();

    expect(await screen.findByTestId("learner-empty-state")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Tên learner"), { target: { value: "  An  " } });
    fireEvent.submit(screen.getByRole("button", { name: "Tạo hồ sơ học" }).closest("form")!);

    await waitFor(() => expect(createLearner).toHaveBeenCalledWith({ displayName: "An" }));
    expect(await screen.findByTestId("learner-context-ready")).toHaveTextContent("An");
  });

  it("auto-resolves exactly one learner", async () => {
    requestLearners.mockResolvedValue([learner("00000000-0000-4000-8000-000000000010", "An")]);
    renderPage();
    expect(await screen.findByTestId("learner-context-ready")).toHaveTextContent("An");
    expect(screen.queryByRole("button", { name: "Tạo hồ sơ học" })).not.toBeInTheDocument();
  });

  it("does not expose disabled learners even if a stale response includes one", async () => {
    requestLearners.mockResolvedValue([
      learner("00000000-0000-4000-8000-000000000010", "An"),
      { ...learner("00000000-0000-4000-8000-000000000011", "Bình"), enabled: false }
    ]);
    renderPage();

    expect(await screen.findByTestId("learner-context-ready")).toHaveTextContent("An");
    expect(screen.queryByText("Bình")).not.toBeInTheDocument();
  });

  it("requires explicit selection when two or more learners exist", async () => {
    requestLearners.mockResolvedValue([
      learner("00000000-0000-4000-8000-000000000010", "An"),
      learner("00000000-0000-4000-8000-000000000011", "Bình")
    ]);
    renderPage();
    expect(await screen.findByRole("button", { name: /An/ })).toBeInTheDocument();
    expect(screen.queryByTestId("learner-context-ready")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Bình/ }));
    expect(await screen.findByTestId("learner-context-ready")).toHaveTextContent("Bình");
  });

  it("reconciles an uncertain create failure before allowing another create", async () => {
    requestLearners.mockResolvedValue([]);
    createLearner.mockRejectedValue(new LearnerClientError("NETWORK_ERROR", 0, true));
    renderPage();
    await screen.findByTestId("learner-empty-state");
    fireEvent.change(screen.getByLabelText("Tên learner"), { target: { value: "An" } });
    fireEvent.submit(screen.getByRole("button", { name: "Tạo hồ sơ học" }).closest("form")!);

    await waitFor(() => expect(requestLearners).toHaveBeenCalledTimes(2));
    expect(createLearner).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Danh sách đã được đồng bộ. Kiểm tra trước khi tạo lại.")).toBeInTheDocument();
  });

  it("locks duplicate create submits while the first request is pending", async () => {
    requestLearners.mockResolvedValue([]);
    let resolveCreate: ((value: LearnerDto) => void) | undefined;
    createLearner.mockImplementation(() => new Promise((resolve) => { resolveCreate = resolve; }));
    renderPage();
    await screen.findByTestId("learner-empty-state");
    fireEvent.change(screen.getByLabelText("Tên learner"), { target: { value: "An" } });
    const form = screen.getByRole("button", { name: "Tạo hồ sơ học" }).closest("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(createLearner).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Đang tạo…" })).toBeDisabled();
    resolveCreate?.(learner("00000000-0000-4000-8000-000000000012", "An"));
    await waitFor(() => expect(screen.getByTestId("learner-context-ready")).toBeInTheDocument());
  });

  it("keeps the create form usable after a safe server failure", async () => {
    requestLearners.mockResolvedValue([]);
    createLearner.mockRejectedValue(new LearnerClientError("INTERNAL_ERROR", 503));
    renderPage();
    await screen.findByTestId("learner-empty-state");
    const input = screen.getByLabelText("Tên learner");
    fireEvent.change(input, { target: { value: "An" } });
    fireEvent.submit(input.closest("form")!);

    expect(await screen.findByRole("alert")).toHaveTextContent("Không thể tạo learner lúc này. Vui lòng thử lại.");
    expect(input).toHaveValue("An");
    expect(screen.getByRole("button", { name: "Tạo hồ sơ học" })).toBeEnabled();
  });

  it("redirects an unauthenticated parent to login", async () => {
    useSession.mockReturnValue({ data: null, isPending: false, error: null });
    renderPage();
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Chọn người học" })).not.toBeInTheDocument());
  });
});
