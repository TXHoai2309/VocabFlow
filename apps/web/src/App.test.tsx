import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
  const navigations = [
    screen.getByRole("navigation", { name: "Điều hướng chính" }),
    screen.getByRole("navigation", { name: "Điều hướng chính trên di động" })
  ];
  expect(navigations.some((navigation) => within(navigation).getByRole("link", { name: label }).getAttribute("aria-current") === "page")).toBe(true);
}

function expectNoActivePrimaryNav() {
  expect(screen.getByRole("navigation", { name: "Điều hướng chính" }).querySelector('[aria-current="page"]')).toBeNull();
  expect(screen.getByRole("navigation", { name: "Điều hướng chính trên di động" }).querySelector('[aria-current="page"]')).toBeNull();
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

afterEach(() => vi.restoreAllMocks());

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
  it("keeps the desktop primary navigation to its six destinations", () => {
    renderAppRoutes("/");
    const navigation = screen.getByRole("navigation", { name: "Điều hướng chính" });
    expect(within(navigation).getAllByRole("link").map((link) => link.textContent)).toEqual([
      "Trang chủ", "Từ vựng", "Học tập", "Tiến trình", "Yêu thích", "Cài đặt"
    ]);
    expect(within(navigation).getByRole("link", { name: "Cài đặt" }).closest("li")).toHaveClass("app-nav-divider");
    expect(screen.getByRole("button", { name: "Tài khoản phụ huynh của Jordan Nguyen" })).toBeInTheDocument();
  });

  it("keeps the mobile primary navigation to its five core destinations", () => {
    renderAppRoutes("/");
    const navigation = screen.getByRole("navigation", { name: "Điều hướng chính trên di động" });
    expect(within(navigation).getAllByRole("link").map((link) => link.textContent)).toEqual([
      "Trang chủ", "Từ vựng", "Học tập", "Tiến trình", "Yêu thích"
    ]);
    expect(screen.queryByRole("button", { name: "Mở điều hướng" })).not.toBeInTheDocument();
  });

  it("routes Weak Words in the shared shell without a primary-navigation destination", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ error: { code: "INTERNAL_ERROR" } }), {
      status: 503,
      headers: { "Content-Type": "application/json" }
    }));
    renderAppRoutes("/weak-words");

    expect(await screen.findByRole("heading", { name: "Từ yếu / Cần ôn lại" })).toBeInTheDocument();
    expectNoActivePrimaryNav();
    expect(screen.getByRole("alert")).toHaveTextContent("Không thể tải danh sách từ cần ôn lúc này.");
    expect(document.querySelector(".app-layout")).toBeInTheDocument();
  });

  it("renders the Home dashboard inside the shared shell", async () => {
    renderAppRoutes("/");
    const dashboard = await screen.findByRole("main", { name: "Trang chủ học tập của Avery Nguyen" });
    expect(document.querySelector(".app-layout")?.contains(dashboard)).toBe(true);
    expect(document.querySelector(".app-account-menu-wrap.is-sidebar .app-parent-copy strong")).toHaveTextContent("Jordan Nguyen");
    expect(screen.getAllByRole("link", { name: "Trang chủ VocabFlow" }).length).toBeGreaterThan(0);
    expectActiveNav("Trang chủ");
  });

  it.each([
    ["/study", "Buổi học", "Học tập"],
    ["/study/exercises", "Buổi học", "Học tập"],
    ["/vocabulary", "Từ vựng của Avery Nguyen", "Từ vựng"],
    ["/topics", "Học theo chủ đề", null],
    ["/progress", "Tiến trình học tập", "Tiến trình"],
    ["/learning-sets", "Bộ từ", null],
    ["/learning-sets/assign", "Bộ từ của Avery Nguyen", null],
    ["/learner-settings", "Cài đặt học của Avery Nguyen", "Cài đặt"]
  ] as const)("keeps %s in the shared shell with the expected active state", async (path, heading, nav) => {
    renderAppRoutes(path);
    const pageHeading = await screen.findByRole("heading", { name: heading });
    expect(document.querySelector(".app-layout")?.contains(pageHeading)).toBe(true);
    if (nav) expectActiveNav(nav);
    else expectNoActivePrimaryNav();
  });

  it("keeps Learning Set detail inside the shared shell without selecting an unrelated destination", async () => {
    renderAppRoutes("/learning-sets/7");
    const detailState = await screen.findByRole("alert");
    expect(document.querySelector(".app-layout")?.contains(detailState)).toBe(true);
    expectNoActivePrimaryNav();
  });

  it.each([
    ["/", "Trang chủ"],
    ["/study/setup", "Học tập"],
    ["/saved", "Yêu thích"]
  ] as const)("marks %s as the active destination %s", (path, nav) => {
    renderAppRoutes(path);
    expectActiveNav(nav);
  });

  it.each(["/topics", "/topics/7", "/learning-sets", "/learning-sets/7", "/learning-sets/assign", "/learners"]) (
    "keeps auxiliary route %s outside primary navigation selection", (path) => {
      renderAppRoutes(path);
      expectNoActivePrimaryNav();
      expect(document.querySelector(".app-layout")).toBeInTheDocument();
    }
  );

  it("provides auxiliary destinations from the account menu and closes it on Escape", async () => {
    renderAppRoutes("/learners");
    expect(await screen.findByRole("heading", { name: "Chọn người học" })).toBeInTheDocument();
    const accountMenu = document.querySelector(".app-account-menu-wrap.is-sidebar");
    expect(accountMenu).not.toBeNull();
    const accountButton = within(accountMenu as HTMLElement).getByRole("button", { name: "Tài khoản phụ huynh của Jordan Nguyen" });
    expect(accountButton).toHaveAttribute("aria-haspopup", "menu");
    fireEvent.keyDown(accountButton, { key: "ArrowDown" });
    expect(accountButton).toHaveAttribute("aria-expanded", "true");
    const menu = screen.getByRole("menu", { name: "Tài khoản" });
    expect(accountButton).toHaveAttribute("aria-controls", menu.id);
    const learnersItem = within(menu).getByRole("menuitem", { name: "Người học" });
    const settingsItem = within(menu).getByRole("menuitem", { name: "Cài đặt" });
    expect(learnersItem).toHaveAttribute("href", "/learners");
    expect(settingsItem).toHaveAttribute("href", "/learner-settings");
    expect(learnersItem).toHaveFocus();
    fireEvent.keyDown(learnersItem, { key: "ArrowDown" });
    expect(settingsItem).toHaveFocus();
    fireEvent.keyDown(settingsItem, { key: "ArrowDown" });
    expect(learnersItem).toHaveFocus();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu", { name: "Tài khoản" })).not.toBeInTheDocument();
    expect(accountButton).toHaveFocus();
  });

  it("follows the Settings link from the desktop account menu", async () => {
    renderAppRoutes("/learners");
    expect(await screen.findByRole("heading", { name: "Chọn người học" })).toBeInTheDocument();
    const accountMenu = document.querySelector(".app-account-menu-wrap.is-sidebar");
    expect(accountMenu).not.toBeNull();
    const menuScope = within(accountMenu as HTMLElement);
    fireEvent.click(menuScope.getByRole("button", { name: "Tài khoản phụ huynh của Jordan Nguyen" }));
    fireEvent.click(menuScope.getByRole("menuitem", { name: "Cài đặt" }));
    await waitFor(() => expect(screen.getByTestId("current-location")).toHaveTextContent("/learner-settings"));
    expect(menuScope.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("opens the mobile account menu and follows the Settings link", async () => {
    renderAppRoutes("/learners");
    expect(await screen.findByRole("heading", { name: "Chọn người học" })).toBeInTheDocument();
    const accountMenu = document.querySelector(".app-account-menu-wrap.is-mobile");
    expect(accountMenu).not.toBeNull();
    const mobileMenu = within(accountMenu as HTMLElement);
    const accountButton = mobileMenu.getByRole("button", { name: "Mở menu tài khoản" });
    expect(accountButton.querySelectorAll(".app-parent-avatar")).toHaveLength(1);
    expect(accountButton.querySelector(".app-parent-copy")).toBeNull();
    expect(accountButton.querySelector(".app-account-chevron")).toBeNull();
    expect(mobileMenu.getByRole("menu", { hidden: true })).toHaveAttribute("aria-label", "Tài khoản");
    expect(accountButton).toHaveAttribute("aria-haspopup", "menu");
    expect(accountButton).toHaveAttribute("aria-controls", "app-account-menu-mobile");
    fireEvent.click(accountButton);
    expect(accountButton).toHaveAttribute("aria-expanded", "true");
    expect(mobileMenu.getByRole("menuitem", { name: "Người học" })).toHaveAttribute("href", "/learners");
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(mobileMenu.queryByRole("menu")).not.toBeInTheDocument());
    expect(accountButton).toHaveAttribute("aria-expanded", "false");
    expect(accountButton).toHaveFocus();
    fireEvent.click(accountButton);
    fireEvent.click(mobileMenu.getByRole("menuitem", { name: "Cài đặt" }));
    await waitFor(() => expect(screen.getByTestId("current-location")).toHaveTextContent("/learner-settings"));
    expect(mobileMenu.queryByRole("menu")).not.toBeInTheDocument();
    expect(accountButton).toHaveFocus();
  });

  it("closes an open account menu after an outside pointer action", async () => {
    renderAppRoutes("/learners");
    expect(await screen.findByRole("heading", { name: "Chọn người học" })).toBeInTheDocument();
    const accountMenu = document.querySelector(".app-account-menu-wrap.is-sidebar");
    expect(accountMenu).not.toBeNull();
    const menuScope = within(accountMenu as HTMLElement);
    fireEvent.click(menuScope.getByRole("button", { name: "Tài khoản phụ huynh của Jordan Nguyen" }));
    expect(menuScope.getByRole("menu", { name: "Tài khoản" })).toBeInTheDocument();
    fireEvent.pointerDown(document.body);
    await waitFor(() => expect(menuScope.queryByRole("menu")).not.toBeInTheDocument());
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
    expectNoActivePrimaryNav();
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

  it("navigates from the mobile bottom navigation to Study Setup", async () => {
    renderAppRoutes("/learners");
    expect(await screen.findByRole("heading", { name: "Chọn người học" })).toBeInTheDocument();
    const mobileNavigation = screen.getByRole("navigation", { name: "Điều hướng chính trên di động" });
    fireEvent.click(within(mobileNavigation).getByRole("link", { name: "Học tập" }));
    await waitFor(() => expect(screen.getByTestId("current-location")).toHaveTextContent("/study/setup"));
    expect(screen.getByRole("main", { name: "Thiết lập buổi học" })).toBeInTheDocument();
    expectActiveNav("Học tập");
  });

  it("navigates from the mobile bottom navigation to Favorites", async () => {
    renderAppRoutes("/learners");
    expect(await screen.findByRole("heading", { name: "Chọn người học" })).toBeInTheDocument();
    const mobileNavigation = screen.getByRole("navigation", { name: "Điều hướng chính trên di động" });
    fireEvent.click(within(mobileNavigation).getByRole("link", { name: "Yêu thích" }));
    await waitFor(() => expect(screen.getByTestId("current-location")).toHaveTextContent("/saved"));
    expectActiveNav("Yêu thích");
  });
});
