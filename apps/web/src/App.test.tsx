import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigate } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LearnerDto } from "@vocabflow/contracts";
import { AppRoutes } from "./App";
import { ACTIVE_LEARNER_STORAGE_KEY } from "./features/learners/learner-context";
import { LearnerClientError } from "./features/learners/learner-client";
const { useSession, requestLearners, createLearner, signOut, requestBootstrap, replacePage } = vi.hoisted(() => ({ useSession: vi.fn(), requestLearners: vi.fn(), createLearner: vi.fn(), signOut: vi.fn(), requestBootstrap: vi.fn(), replacePage: vi.fn() }));
vi.mock("./features/auth/auth-client", () => ({ authClient: { useSession, signOut } }));
vi.mock("./features/auth/auth-navigation", () => ({ replacePage }));
vi.mock("./features/auth/bootstrap-client", () => ({ requestBootstrap }));
vi.mock("./features/learners/learner-client", async () => ({ ...await vi.importActual<typeof import("./features/learners/learner-client")>("./features/learners/learner-client"), requestLearners, createLearner }));
const learner: LearnerDto = { id: "00000000-0000-4000-8000-000000000021", householdId: "00000000-0000-4000-8000-000000000001", displayName: "Avery Nguyen", avatarKey: null, enabled: true, createdAt: "2026-09-10T00:00:00.000Z", updatedAt: "2026-09-10T00:00:00.000Z" };
function Probe() {
  const location = useLocation(); const navigate = useNavigate();
  return <><output data-testid="location">{location.pathname}{location.search}</output><button onClick={() => navigate(-1)}>Back</button></>;
}
function mount(path = "/", entries = [path]) {
  return render(<MemoryRouter initialEntries={entries}><Probe /><AppRoutes /></MemoryRouter>);
}
async function readyShell() { await waitFor(() => expect(document.querySelector(".app-layout")).toBeInTheDocument()); }
function account(placement = "sidebar") { return within(document.querySelector(`.app-account-menu-wrap.is-${placement}`) as HTMLElement); }
function openMenu(placement = "sidebar") { fireEvent.click(account(placement).getByRole("button", { name: placement === "sidebar" ? "Tài khoản của Jordan Nguyen" : "Mở menu tài khoản" })); return account(placement); }
beforeEach(() => {
  window.localStorage.clear();
  useSession.mockReset().mockReturnValue({ data: { user: { id: "account-a", name: "Jordan Nguyen" } }, isPending: false, error: null, refetch: vi.fn() });
  requestLearners.mockReset().mockResolvedValue([learner]); createLearner.mockReset().mockResolvedValue(learner); requestBootstrap.mockReset().mockResolvedValue({});
  replacePage.mockReset();
  signOut.mockReset().mockImplementation(async () => { useSession.mockReturnValue({ data: null, isPending: false, error: null, refetch: vi.fn() }); return { data: { success: true }, error: null }; });
  vi.spyOn(globalThis, "fetch").mockImplementation(async () => new Response(JSON.stringify({ error: { code: "INTERNAL_ERROR" } }), { status: 503, headers: { "Content-Type": "application/json" } }));
});
afterEach(() => vi.restoreAllMocks());
describe("single-account routing and navigation", () => {
  it("redirects unauthenticated requests to login", () => { useSession.mockReturnValue({ data: null, isPending: false }); mount("/progress"); expect(screen.getByRole("heading", { name: "Đăng nhập" })).toBeInTheDocument(); expect(requestLearners).not.toHaveBeenCalled(); });
  it("shows session check and safe retry error", () => {
    const refetch = vi.fn(); useSession.mockReturnValue({ data: null, isPending: false, error: new Error("offline"), refetch }); mount();
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" })); expect(refetch).toHaveBeenCalledOnce(); expect(requestLearners).not.toHaveBeenCalled();
  });
  it("shows provisioning skeleton while preserving the requested query", async () => {
    requestLearners.mockImplementation(() => new Promise(() => undefined)); mount("/study/setup?weak=1");
    expect(await screen.findByRole("status", { name: "Đang chuẩn bị học tập…" })).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("/study/setup?weak=1");
    expect(document.querySelector(".app-layout")).toBeNull();
  });
  it("shows ErrorState and retries provisioning without route bounce", async () => {
    requestLearners.mockRejectedValueOnce(new LearnerClientError("NETWORK_ERROR", 0)).mockResolvedValueOnce([learner]); mount("/progress");
    expect(await screen.findByRole("heading", { name: "Không thể mở dữ liệu học tập" })).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("/progress"); fireEvent.click(screen.getByRole("button", { name: "Thử lại" })); await readyShell(); expect(requestBootstrap).not.toHaveBeenCalled();
  });
  it.each(["/", "/progress", "/vocabulary", "/vocabulary/1", "/saved", "/weak-words", "/topics", "/topics/7", "/learning-sets", "/learning-sets/7", "/learning-sets/assign", "/learner-settings", "/study/setup?weak=1", "/study", "/study/exercises"])("resolves internal context on %s without visiting /learners", async (path) => {
    const routes: string[] = []; function Track() { routes.push(useLocation().pathname); return null; }
    render(<MemoryRouter initialEntries={[path]}><Track /><Probe /><AppRoutes /></MemoryRouter>); await readyShell();
    expect(screen.getByTestId("location")).toHaveTextContent(path); expect(routes).not.toContain("/learners"); expect(createLearner).not.toHaveBeenCalled();
  });
  it("reloads with same-user stored identity", async () => {
    window.localStorage.setItem(ACTIVE_LEARNER_STORAGE_KEY, JSON.stringify({ userId: "account-a", learner })); mount("/progress"); await readyShell();
    expect(screen.getByTestId("location")).toHaveTextContent("/progress"); expect(requestLearners).toHaveBeenCalledTimes(1);
  });
  it("auto provisions on a direct protected route and keeps its query", async () => {
    requestLearners.mockResolvedValue([]); mount("/study/setup?weak=1"); await readyShell();
    expect(createLearner).toHaveBeenCalledExactlyOnceWith({ displayName: "Jordan Nguyen" }); expect(screen.getByTestId("location")).toHaveTextContent("/study/setup?weak=1"); expect(screen.queryByText("Đã tạo hồ sơ người học")).not.toBeInTheDocument();
  });
  it("replaces the retired /learners bookmark with Home", async () => { mount("/learners"); await readyShell(); await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/")); expect(screen.queryByRole("heading", { name: "Chọn người học" })).not.toBeInTheDocument(); });
  it("retains exactly six desktop and five mobile primary destinations", async () => {
    mount(); await readyShell();
    expect(within(screen.getByRole("navigation", { name: "Điều hướng chính" })).getAllByRole("link").map((link) => link.textContent)).toEqual(["Trang chủ", "Từ vựng", "Học tập", "Tiến trình", "Yêu thích", "Cài đặt"]);
    expect(within(screen.getByRole("navigation", { name: "Điều hướng chính trên di động" })).getAllByRole("link")).toHaveLength(5);
  });
  it("preserves desktop search and study focus shell", async () => { mount(); await readyShell(); expect(screen.getByRole("button", { name: "Tìm từ vựng, chủ đề hoặc bộ từ" })).toBeEnabled(); });
  it.each(["sidebar", "mobile"])("offers Settings and Logout with keyboard navigation in %s", async (placement) => {
    mount(); await readyShell(); const menu = openMenu(placement);
    expect(menu.getAllByRole("menuitem").map((item) => item.textContent)).toEqual(["Cài đặt", "Đăng xuất"]);
    const settings = menu.getByRole("menuitem", { name: "Cài đặt" }); expect(settings).toHaveFocus(); fireEvent.keyDown(settings, { key: "ArrowDown" }); expect(menu.getByRole("menuitem", { name: "Đăng xuất" })).toHaveFocus();
    fireEvent.keyDown(document, { key: "Escape" }); expect(menu.queryByRole("menu")).not.toBeInTheDocument();
    openMenu(placement); fireEvent.click(menu.getByRole("menuitem", { name: "Cài đặt" })); await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/learner-settings"));
  });
  it("logout calls Better Auth once, clears storage and replaces the document with login", async () => {
    const removeItem = vi.spyOn(Storage.prototype, "removeItem");
    mount("/", ["/foundation", "/"]); await readyShell(); fireEvent.click(openMenu().getByRole("menuitem", { name: "Đăng xuất" }));
    await waitFor(() => expect(replacePage).toHaveBeenCalledExactlyOnceWith("/login")); expect(signOut).toHaveBeenCalledTimes(1); expect(window.localStorage.getItem(ACTIVE_LEARNER_STORAGE_KEY)).toBeNull();
    expect(removeItem).toHaveBeenCalledWith(ACTIVE_LEARNER_STORAGE_KEY);
    expect(removeItem.mock.invocationCallOrder[0]).toBeLessThan(replacePage.mock.invocationCallOrder[0]);
  });
  it.each(["returned", "thrown"])("keeps session and storage on %s logout failure", async (kind) => {
    if (kind === "returned") signOut.mockResolvedValue({ error: { code: "INTERNAL_ERROR" } }); else signOut.mockRejectedValue(new Error("offline"));
    mount(); await readyShell(); fireEvent.click(openMenu().getByRole("menuitem", { name: "Đăng xuất" }));
    expect(await screen.findByTestId("toast-error")).toHaveTextContent("Không thể đăng xuất. Vui lòng thử lại."); expect(replacePage).not.toHaveBeenCalled(); expect(screen.getByTestId("location")).toHaveTextContent("/"); expect(window.localStorage.getItem(ACTIVE_LEARNER_STORAGE_KEY)).not.toBeNull(); expect(document.querySelector(".app-layout")).toBeInTheDocument();
  });
  it("locks rapid logout clicks across both account menus", async () => {
    let resolveLogout: ((value: { error: null }) => void) | undefined; signOut.mockImplementation(() => new Promise((resolve) => { resolveLogout = resolve; })); mount(); await readyShell();
    const button = openMenu().getByRole("menuitem", { name: "Đăng xuất" }); fireEvent.click(button); fireEvent.click(button); const mobile = openMenu("mobile"); expect(mobile.getByRole("menuitem", { name: "Đang đăng xuất…" })).toBeDisabled(); expect(signOut).toHaveBeenCalledTimes(1);
    resolveLogout?.({ error: null }); await waitFor(() => expect(replacePage).toHaveBeenCalledWith("/login")); expect(window.localStorage.getItem(ACTIVE_LEARNER_STORAGE_KEY)).toBeNull();
  });
});
