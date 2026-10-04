import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import type { LearnerDto } from "@vocabflow/contracts";
import App, { AppRoutes } from "./App";
import { ActiveLearnerProvider } from "./features/learners/learner-context-provider";

const { useSession, requestLearners } = vi.hoisted(() => ({ useSession: vi.fn(), requestLearners: vi.fn() }));

vi.mock("./features/auth/auth-client", () => ({ authClient: { useSession } }));
vi.mock("./features/learners/learner-client", async () => ({
  ...(await vi.importActual<typeof import("./features/learners/learner-client")>("./features/learners/learner-client")),
  requestLearners
}));

const learner: LearnerDto = {
  id: "00000000-0000-4000-8000-000000000021",
  householdId: "00000000-0000-4000-8000-000000000001",
  displayName: "Avery Nguyen",
  avatarKey: null,
  enabled: true,
  createdAt: "2026-09-10T00:00:00.000Z",
  updatedAt: "2026-09-10T00:00:00.000Z"
};

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="current-location">{location.pathname}</output>;
}

function renderAppRoutes(path: string, initialLearner: LearnerDto | null = learner) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ActiveLearnerProvider initialLearner={initialLearner}>
        <LocationProbe />
        <AppRoutes />
      </ActiveLearnerProvider>
    </MemoryRouter>
  );
}

function expectActiveNav(label: string) {
  expect(screen.getAllByRole("link", { name: label }).some((link) => link.getAttribute("aria-current") === "page")).toBe(true);
}

beforeEach(() => {
  useSession.mockReset().mockReturnValue({
    data: { user: { id: "parent-id", name: "Jordan Nguyen" } },
    isPending: false,
    error: null,
    refetch: vi.fn()
  });
  requestLearners.mockReset().mockResolvedValue([learner]);
});

describe("application routing", () => {
  it("routes an unauthenticated Home visit through the existing login page", () => {
    useSession.mockReturnValue({ data: null, isPending: false, error: null, refetch: vi.fn() });
    render(<MemoryRouter initialEntries={["/"]}><App /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "Đăng nhập" })).toBeInTheDocument();
    expect(document.querySelector(".app-layout")).toBeNull();
  });

  it("renders the nested foundation route", () => {
    render(<MemoryRouter initialEntries={["/foundation"]}><App /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "Trang nền tảng đang hoạt động." })).toBeInTheDocument();
  });

  it("keeps the shared shell hidden while a protected route checks the session", () => {
    useSession.mockReturnValue({ data: null, isPending: true, error: null, refetch: vi.fn() });
    renderAppRoutes("/study");

    expect(screen.getByText("Đang kiểm tra phiên đăng nhập…")).toHaveAttribute("role", "status");
    expect(document.querySelector(".app-layout")).toBeNull();
  });

  it.each(["/study", "/vocabulary"])("redirects unauthenticated %s to login without rendering the shared shell", (path) => {
    useSession.mockReturnValue({ data: null, isPending: false, error: null, refetch: vi.fn() });
    renderAppRoutes(path);

    expect(screen.getByRole("heading", { name: "Đăng nhập" })).toBeInTheDocument();
    expect(document.querySelector(".app-layout")).toBeNull();
  });

  it("keeps the shared shell hidden on session error and retries the session check", () => {
    const refetch = vi.fn();
    useSession.mockReturnValue({ data: null, isPending: false, error: new Error("session unavailable"), refetch });
    renderAppRoutes("/study");

    expect(screen.getByRole("alert")).toHaveTextContent("Không thể xác minh phiên đăng nhập");
    expect(document.querySelector(".app-layout")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(refetch).toHaveBeenCalledOnce();
  });
});

describe("register route", () => {
  it("renders the parent registration screen without the shared app shell", () => {
    render(<MemoryRouter initialEntries={["/register"]}><App /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "Tạo tài khoản" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Tên phụ huynh" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Địa chỉ email" })).toBeInTheDocument();
    expect(screen.getByLabelText("Mật khẩu")).toBeInTheDocument();
    expect(document.querySelector(".app-layout")).toBeNull();
  });
});

describe("login route", () => {
  it("renders the parent login screen without the shared app shell", () => {
    render(<MemoryRouter initialEntries={["/login"]}><App /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "Đăng nhập" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Địa chỉ email" })).toBeInTheDocument();
    expect(screen.getByLabelText("Mật khẩu")).toBeInTheDocument();
    expect(document.querySelector(".app-layout")).toBeNull();
  });
});

describe("shared authenticated app shell", () => {
  it("routes Weak Words in the shared shell with its navigation item active", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ error: { code: "INTERNAL_ERROR" } }), {
      status: 503,
      headers: { "Content-Type": "application/json" }
    }));
    renderAppRoutes("/weak-words");

    expect(await screen.findByRole("heading", { name: "Từ yếu / Cần ôn lại" })).toBeInTheDocument();
    expectActiveNav("Cần ôn lại");
    expect(screen.getByRole("alert")).toHaveTextContent("Không thể tải danh sách từ cần ôn lúc này.");
    expect(document.querySelector(".app-layout")).toBeInTheDocument();
  });

  it("renders the Home dashboard inside the shared shell", async () => {
    renderAppRoutes("/");
    const dashboard = await screen.findByRole("main", { name: "Trang chủ học tập của Avery Nguyen" });
    expect(document.querySelector(".app-layout")?.contains(dashboard)).toBe(true);
    expect(document.querySelector(".app-parent-account strong")).toHaveTextContent("Jordan Nguyen");
    expect(screen.getAllByRole("link", { name: "Trang chủ VocabFlow" }).length).toBeGreaterThan(0);
    expectActiveNav("Trang chủ");
  });

  it.each([
    ["/study", "Phiên học hôm nay", "Học tập"],
    ["/study/exercises", "Phiên học hôm nay", "Học tập"],
    ["/vocabulary", "Từ vựng của Avery Nguyen", "Từ vựng"],
    ["/topics", "Học theo chủ đề", "Chủ đề"],
    ["/progress", "Tiến trình của Avery Nguyen", "Tiến trình"],
    ["/learning-sets", "Bộ từ", "Bộ từ"],
    ["/learning-sets/assign", "Bộ từ của Avery Nguyen", "Bộ từ"],
    ["/learner-settings", "Cài đặt học của Avery Nguyen", "Cài đặt"]
  ] as const)("keeps %s inside the shared shell with %s active", async (path, heading, nav) => {
    renderAppRoutes(path);
    const pageHeading = await screen.findByRole("heading", { name: heading });
    expect(document.querySelector(".app-layout")?.contains(pageHeading)).toBe(true);
    expectActiveNav(nav);
  });

  it("activates Bộ từ on a learning-set detail route", async () => {
    renderAppRoutes("/learning-sets/7");
    const detailState = await screen.findByRole("alert");
    expect(document.querySelector(".app-layout")?.contains(detailState)).toBe(true);
    expectActiveNav("Bộ từ");
  });

  it("renders vocabulary detail inside the shared shell with Từ vựng active", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      vocabulary: [{
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
      }]
    }), { headers: { "Content-Type": "application/json" } }));
    renderAppRoutes("/vocabulary/1");

    const detail = await screen.findByRole("heading", { name: "apple" });
    expect(document.querySelector(".app-layout")?.contains(detail)).toBe(true);
    expectActiveNav("Từ vựng");
  });

  it("keeps a direct Learners visit visible after resolving one learner", async () => {
    renderAppRoutes("/learners", null);
    expect(await screen.findByTestId("learner-context-ready")).toHaveTextContent("Avery Nguyen");
    expect(screen.getByTestId("current-location")).toHaveTextContent("/learners");
    expectActiveNav("Người học");
  });

  it("returns a Home learner handoff without a redirect loop", async () => {
    renderAppRoutes("/", null);
    expect(await screen.findByRole("main", { name: "Trang chủ học tập của Avery Nguyen" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId("current-location")).toHaveTextContent("/"));
  });

  it("keeps the same navigation shell while changing routes", async () => {
    renderAppRoutes("/learners");
    expect(await screen.findByRole("heading", { name: "Chọn người học" })).toBeInTheDocument();
    const shell = document.querySelector(".app-layout");
    fireEvent.click(screen.getAllByRole("link", { name: "Từ vựng" })[0]!);
    expect(await screen.findByRole("heading", { name: "Từ vựng của Avery Nguyen" })).toBeInTheDocument();
    expect(document.querySelector(".app-layout")).toBe(shell);
    expectActiveNav("Từ vựng");
  });

  it("opens and closes the compact mobile navigation after a route is chosen", async () => {
    renderAppRoutes("/learners");
    expect(await screen.findByRole("heading", { name: "Chọn người học" })).toBeInTheDocument();
    const menuButton = screen.getByRole("button", { name: "Mở điều hướng" });
    fireEvent.click(menuButton);
    expect(menuButton).toHaveAttribute("aria-expanded", "true");

    const studyLinks = screen.getAllByRole("link", { name: "Học tập" });
    fireEvent.click(studyLinks[studyLinks.length - 1]!);
    expect(await screen.findByRole("heading", { name: "Phiên học hôm nay" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mở điều hướng" })).toHaveAttribute("aria-expanded", "false");
  });
});
