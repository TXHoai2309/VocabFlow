import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import type { LearnerDto } from "@vocabflow/contracts";
import { LearnerClientError } from "./learner-client";
import { ActiveLearnerProvider } from "./learner-context-provider";
import { ACTIVE_LEARNER_STORAGE_KEY } from "./learner-context";
import { LearnerPage } from "./learner-page";
import { VocabularyDetailPage } from "./vocabulary-detail-page";
import { ToastProvider } from "../../components/toast/toast-provider";

const { useSession, requestLearners, createLearner, requestBootstrap } = vi.hoisted(() => ({
  useSession: vi.fn(),
  requestLearners: vi.fn(),
  createLearner: vi.fn(),
  requestBootstrap: vi.fn()
}));

vi.mock("../auth/bootstrap-client", () => ({ requestBootstrap }));
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

function RouteProbe() {
  const location = useLocation();
  return <output data-testid="current-route" data-state-null={String(location.state === null)}>{`${location.pathname}${location.search}`}</output>;
}

function renderPage(returnTo?: unknown, userId?: string) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: "/learners", state: returnTo === undefined ? null : { returnTo } }]}>
      <ToastProvider>
        <ActiveLearnerProvider userId={userId}>
          <RouteProbe />
          <Routes>
            <Route path="/learners" element={<LearnerPage />} />
            <Route path="/vocabulary/:vocabularyId" element={<VocabularyDetailPage />} />
            <Route path="/vocabulary" element={<p data-testid="returned-vocabulary-list">Từ vựng</p>} />
            <Route path="/progress" element={<p>Tiến trình</p>} />
            <Route path="/study/setup" element={<p>Thiết lập buổi học</p>} />
          </Routes>
        </ActiveLearnerProvider>
      </ToastProvider>
    </MemoryRouter>
  );
}

describe("US-03 learner resolution UI", () => {
  beforeEach(() => {
    useSession.mockReset();
    requestLearners.mockReset();
    createLearner.mockReset();
    requestBootstrap.mockReset();
    window.localStorage.clear();
    useSession.mockReturnValue({ data: { user: { id: "parent-1" } }, isPending: false, error: null });
  });

  it("shows the zero-learner empty state and creates the first learner", async () => {
    const first = learner("00000000-0000-4000-8000-000000000010", "An");
    requestLearners.mockResolvedValue([]);
    createLearner.mockResolvedValue(first);
    renderPage();

    expect(await screen.findByTestId("learner-empty-state")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Tên người học"), { target: { value: "  An  " } });
    fireEvent.submit(screen.getByRole("button", { name: "Tạo hồ sơ học" }).closest("form")!);

    await waitFor(() => expect(createLearner).toHaveBeenCalledWith({ displayName: "An" }));
    expect(await screen.findByRole("button", { name: "An Đang dùng" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByTestId("toast-success")).toHaveTextContent("Đã tạo hồ sơ người học");
    expect(screen.getByLabelText("Tên người học")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Tạo hồ sơ học" })).toBeEnabled();
    expect(screen.queryByTestId("learner-context-ready")).not.toBeInTheDocument();
    expect(screen.queryByText("Sẵn sàng cho thẻ học đầu tiên.")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Bắt đầu học" })).not.toBeInTheDocument();
    expect(screen.getByTestId("current-route")).toHaveTextContent("/learners");
  });

  it("keeps one learner and the create form visible, then creates and selects the second learner", async () => {
    const first = learner("00000000-0000-4000-8000-000000000010", "An");
    const second = learner("00000000-0000-4000-8000-000000000011", "Bình");
    requestLearners.mockResolvedValue([first]);
    createLearner.mockResolvedValue(second);
    renderPage(undefined, "parent-1");
    expect(await screen.findByRole("button", { name: "An Đang dùng" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: "Tạo hồ sơ học" })).toBeEnabled();
    expect(screen.queryByText("Sẵn sàng cho thẻ học đầu tiên.")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Tên người học"), { target: { value: "Bình" } });
    fireEvent.submit(screen.getByLabelText("Tên người học").closest("form")!);
    expect(await screen.findByRole("button", { name: "Bình Đang dùng" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: "An" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("button", { name: "Tạo hồ sơ học" })).toBeEnabled();
    expect(screen.getByLabelText("Tên người học")).toHaveValue("");
    expect(JSON.parse(window.localStorage.getItem(ACTIVE_LEARNER_STORAGE_KEY) ?? "{}")).toMatchObject({ learner: { id: second.id } });
  });

  it("returns to an internal route after selecting one learner and clears router state", async () => {
    requestLearners.mockResolvedValue([learner("00000000-0000-4000-8000-000000000010", "An")]);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ vocabulary: [{
      id: 1,
      word: "apple",
      ipa: null,
      vietnamese: "quả táo",
      definitionEn: null,
      exampleEn: null,
      imageUrl: null,
      audioUrl: null,
      topic: null,
      level: null,
      enabled: true,
      contentVersion: 1,
      status: "NEW",
      nextReviewDate: null
    }] }), { headers: { "Content-Type": "application/json" } }));

    renderPage("/vocabulary/1");
    fireEvent.click(await screen.findByRole("button", { name: /An/ }));

    expect(await screen.findByRole("heading", { name: "apple" })).toBeInTheDocument();
    expect(screen.getByTestId("current-route")).toHaveTextContent("/vocabulary/1");
    expect(screen.getByTestId("current-route")).toHaveAttribute("data-state-null", "true");
    expect(requestLearners).toHaveBeenCalledTimes(1);
  });

  it("returns to the saved route after the user selects a learner", async () => {
    requestLearners.mockResolvedValue([
      learner("00000000-0000-4000-8000-000000000010", "An"),
      learner("00000000-0000-4000-8000-000000000011", "Bình")
    ]);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ vocabulary: [] }), {
      headers: { "Content-Type": "application/json" }
    }));

    renderPage("/vocabulary?level=GRADE_1");
    fireEvent.click(await screen.findByRole("button", { name: /An/ }));

    expect(await screen.findByTestId("returned-vocabulary-list")).toBeInTheDocument();
    expect(screen.getByTestId("current-route")).toHaveTextContent("/vocabulary?level=GRADE_1");
  });

  it("returns to the saved detail route after creating the first learner", async () => {
    const first = learner("00000000-0000-4000-8000-000000000010", "An");
    requestLearners.mockResolvedValue([]);
    createLearner.mockResolvedValue(first);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ vocabulary: [{
      id: 1,
      word: "apple",
      ipa: null,
      vietnamese: "quả táo",
      definitionEn: null,
      exampleEn: null,
      imageUrl: null,
      audioUrl: null,
      topic: null,
      level: null,
      enabled: true,
      contentVersion: 1,
      status: "NEW",
      nextReviewDate: null
    }] }), { headers: { "Content-Type": "application/json" } }));

    renderPage("/vocabulary/1");
    expect(await screen.findByTestId("learner-empty-state")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Tên người học"), { target: { value: "An" } });
    fireEvent.submit(screen.getByRole("button", { name: "Tạo hồ sơ học" }).closest("form")!);

    expect(await screen.findByRole("heading", { name: "apple" })).toBeInTheDocument();
    expect(screen.getByTestId("toast-success")).toHaveTextContent("Đã tạo hồ sơ người học");
    expect(screen.getByTestId("current-route")).toHaveTextContent("/vocabulary/1");
    expect(createLearner).toHaveBeenCalledTimes(1);
  });

  it.each(["//evil.com", "https://evil.com", "javascript:alert(1)", "relative/path"])(
    "ignores an external or invalid returnTo value %s",
    async (returnTo) => {
      requestLearners.mockResolvedValue([learner("00000000-0000-4000-8000-000000000010", "An")]);
      renderPage(returnTo);

      expect(await screen.findByRole("button", { name: "An Đang dùng" })).toBeInTheDocument();
      expect(screen.getByTestId("current-route")).toHaveTextContent("/learners");
    }
  );

  it("does not expose disabled learners even if a stale response includes one", async () => {
    requestLearners.mockResolvedValue([
      learner("00000000-0000-4000-8000-000000000010", "An"),
      { ...learner("00000000-0000-4000-8000-000000000011", "Bình"), enabled: false }
    ]);
    renderPage();

    expect(await screen.findByRole("button", { name: "An Đang dùng" })).toBeInTheDocument();
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
    expect(await screen.findByRole("button", { name: "Bình Đang dùng" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: "Tạo hồ sơ học" })).toBeEnabled();
  });

  it("keeps a valid stored learner while showing the selector and persists a replacement selection", async () => {
    const an = learner("00000000-0000-4000-8000-000000000010", "An");
    const binh = learner("00000000-0000-4000-8000-000000000011", "Bình");
    requestLearners.mockResolvedValue([an, binh]);
    window.localStorage.setItem(ACTIVE_LEARNER_STORAGE_KEY, JSON.stringify({ userId: "parent-1", learner: an }));
    renderPage(undefined, "parent-1");

    expect(await screen.findByRole("button", { name: "An Đang dùng" })).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem(ACTIVE_LEARNER_STORAGE_KEY) ?? "{}")).toMatchObject({ userId: "parent-1", learner: { id: an.id } });
    fireEvent.click(screen.getByRole("button", { name: "Bình" }));

    expect(await screen.findByRole("button", { name: "Bình Đang dùng" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: "Tạo hồ sơ học" })).toBeEnabled();
    expect(JSON.parse(window.localStorage.getItem(ACTIVE_LEARNER_STORAGE_KEY) ?? "{}")).toMatchObject({ userId: "parent-1", learner: { id: binh.id } });
  });

  it("reconciles an uncertain create failure before allowing another create", async () => {
    requestLearners.mockResolvedValue([]);
    createLearner.mockRejectedValue(new LearnerClientError("NETWORK_ERROR", 0, true));
    renderPage();
    await screen.findByTestId("learner-empty-state");
    fireEvent.change(screen.getByLabelText("Tên người học"), { target: { value: "An" } });
    fireEvent.submit(screen.getByRole("button", { name: "Tạo hồ sơ học" }).closest("form")!);

    await waitFor(() => expect(requestLearners).toHaveBeenCalledTimes(2));
    expect(createLearner).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Danh sách đã được cập nhật. Vui lòng kiểm tra trước khi tạo lại.")).toBeInTheDocument();
  });

  it("locks duplicate create submits while the first request is pending", async () => {
    requestLearners.mockResolvedValue([]);
    let resolveCreate: ((value: LearnerDto) => void) | undefined;
    createLearner.mockImplementation(() => new Promise((resolve) => { resolveCreate = resolve; }));
    renderPage();
    await screen.findByTestId("learner-empty-state");
    fireEvent.change(screen.getByLabelText("Tên người học"), { target: { value: "An" } });
    const form = screen.getByRole("button", { name: "Tạo hồ sơ học" }).closest("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(createLearner).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Đang tạo…" })).toBeDisabled();
    resolveCreate?.(learner("00000000-0000-4000-8000-000000000012", "An"));
    expect(await screen.findByRole("button", { name: "An Đang dùng" })).toBeInTheDocument();
  });

  it("keeps the create form usable after a safe server failure", async () => {
    requestLearners.mockResolvedValue([]);
    createLearner.mockRejectedValue(new LearnerClientError("INTERNAL_ERROR", 503));
    renderPage();
    await screen.findByTestId("learner-empty-state");
    const input = screen.getByLabelText("Tên người học");
    fireEvent.change(input, { target: { value: "An" } });
    fireEvent.submit(input.closest("form")!);

    expect(await screen.findByRole("alert")).toHaveTextContent("Không thể tạo hồ sơ người học lúc này. Vui lòng thử lại.");
    expect(input).toHaveValue("An");
    expect(screen.getByRole("button", { name: "Tạo hồ sơ học" })).toBeEnabled();
  });

  it("redirects an unauthenticated parent to login", async () => {
    useSession.mockReturnValue({ data: null, isPending: false, error: null });
    renderPage();
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Chọn người học" })).not.toBeInTheDocument());
  });

  it.each(["/progress", "/study/setup?weak=1"])("preserves returnTo %s after selection", async (returnTo) => {
    requestLearners.mockResolvedValue([learner("00000000-0000-4000-8000-000000000010", "An")]);
    renderPage(returnTo);
    fireEvent.click(await screen.findByRole("button", { name: /An/ }));
    await waitFor(() => expect(screen.getByTestId("current-route")).toHaveTextContent(returnTo));
    expect(screen.getByTestId("current-route")).toHaveAttribute("data-state-null", "true");
  });

  it("preserves the study query after creating a learner", async () => {
    requestLearners.mockResolvedValue([]);
    createLearner.mockResolvedValue(learner("00000000-0000-4000-8000-000000000010", "An"));
    renderPage("/study/setup?weak=1");
    await screen.findByTestId("learner-empty-state");
    fireEvent.change(screen.getByLabelText("Tên người học"), { target: { value: "An" } });
    fireEvent.submit(screen.getByLabelText("Tên người học").closest("form")!);
    await waitFor(() => expect(screen.getByTestId("current-route")).toHaveTextContent("/study/setup?weak=1"));
  });

  it("reconciles the persisted learner with the canonical response", async () => {
    const stored = learner("00000000-0000-4000-8000-000000000010", "Old name");
    window.localStorage.setItem(ACTIVE_LEARNER_STORAGE_KEY, JSON.stringify({ userId: "parent-1", learner: stored }));
    requestLearners.mockResolvedValue([{ ...stored, displayName: "An" }, learner("00000000-0000-4000-8000-000000000011", "Bình")]);
    renderPage(undefined, "parent-1");
    expect(await screen.findByRole("button", { name: "An Đang dùng" })).toHaveAttribute("aria-current", "true");
    expect(JSON.parse(window.localStorage.getItem(ACTIVE_LEARNER_STORAGE_KEY) ?? "{}")).toMatchObject({ learner: { displayName: "An" } });
  });

  it("recovers a missing household once, then creates the first learner", async () => {
    requestLearners.mockRejectedValueOnce(new LearnerClientError("HOUSEHOLD_ACCESS_DENIED", 403)).mockResolvedValueOnce([]);
    requestBootstrap.mockResolvedValue({});
    createLearner.mockResolvedValue(learner("00000000-0000-4000-8000-000000000010", "An"));
    renderPage();
    expect(await screen.findByTestId("learner-empty-state")).toBeInTheDocument();
    expect(requestBootstrap).toHaveBeenCalledTimes(1);
    expect(requestLearners).toHaveBeenCalledTimes(2);
    fireEvent.change(screen.getByLabelText("Tên người học"), { target: { value: "An" } });
    fireEvent.submit(screen.getByLabelText("Tên người học").closest("form")!);
    expect(await screen.findByRole("button", { name: "An Đang dùng" })).toBeInTheDocument();
    expect(screen.getByTestId("toast-success")).toHaveTextContent("Đã tạo hồ sơ người học");
    expect(requestBootstrap).toHaveBeenCalledTimes(1);
  });

  it.each(["bootstrap", "retry"])("shows ErrorState without a loop when %s fails", async (failure) => {
    requestLearners.mockRejectedValue(new LearnerClientError("HOUSEHOLD_ACCESS_DENIED", 403));
    if (failure === "bootstrap") requestBootstrap.mockRejectedValue(new Error("BOOTSTRAP_REQUEST_FAILED"));
    else requestBootstrap.mockResolvedValue({});
    renderPage();
    expect(await screen.findByRole("heading", { name: "Không thể tải hồ sơ người học" })).toBeInTheDocument();
    expect(requestBootstrap).toHaveBeenCalledTimes(1);
    expect(requestLearners).toHaveBeenCalledTimes(failure === "bootstrap" ? 1 : 2);
    requestLearners.mockResolvedValue([]);
    fireEvent.click(screen.getByRole("button", { name: /Thử lại/ }));
    expect(await screen.findByTestId("learner-empty-state")).toBeInTheDocument();
  });

  it("does not bootstrap ordinary network failures", async () => {
    requestLearners.mockRejectedValue(new LearnerClientError("NETWORK_ERROR", 0));
    renderPage();
    expect(await screen.findByRole("heading", { name: "Không thể tải hồ sơ người học" })).toBeInTheDocument();
    expect(requestBootstrap).not.toHaveBeenCalled();
  });

  it.each(["success", "bootstrap", "retry"])("bounds create recovery on %s", async (outcome) => {
    requestLearners.mockResolvedValue([]);
    createLearner.mockRejectedValueOnce(new LearnerClientError("HOUSEHOLD_ACCESS_DENIED", 403));
    if (outcome === "bootstrap") requestBootstrap.mockRejectedValue(new Error("BOOTSTRAP_REQUEST_FAILED"));
    else requestBootstrap.mockResolvedValue({});
    if (outcome === "success") createLearner.mockResolvedValueOnce(learner("00000000-0000-4000-8000-000000000010", "An"));
    else createLearner.mockRejectedValueOnce(new LearnerClientError("HOUSEHOLD_ACCESS_DENIED", 403));
    renderPage();
    await screen.findByTestId("learner-empty-state");
    fireEvent.change(screen.getByLabelText("Tên người học"), { target: { value: "An" } });
    fireEvent.submit(screen.getByLabelText("Tên người học").closest("form")!);
    if (outcome === "success") expect(await screen.findByTestId("toast-success")).toBeInTheDocument();
    else {
      expect(await screen.findByTestId("toast-error")).toBeInTheDocument();
      expect(screen.getAllByTestId("toast-error")).toHaveLength(1);
      expect(screen.getByLabelText("Tên người học")).toHaveValue("An");
    }
    expect(createLearner).toHaveBeenCalledTimes(outcome === "bootstrap" ? 1 : 2);
    expect(requestBootstrap).toHaveBeenCalledTimes(1);
  });

  it("keeps invalid names inline without bootstrap or error toasts", async () => {
    requestLearners.mockResolvedValue([]);
    createLearner.mockRejectedValue(new LearnerClientError("LEARNER_DISPLAY_NAME_INVALID", 400));
    renderPage();
    await screen.findByTestId("learner-empty-state");
    fireEvent.submit(screen.getByLabelText("Tên người học").closest("form")!);
    expect(createLearner).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Tên người học"), { target: { value: "An" } });
    fireEvent.submit(screen.getByLabelText("Tên người học").closest("form")!);
    expect(await screen.findByText("Tên người học không hợp lệ.")).toBeInTheDocument();
    expect(screen.queryByTestId("toast-error")).not.toBeInTheDocument();
    expect(requestBootstrap).not.toHaveBeenCalled();
  });
});
