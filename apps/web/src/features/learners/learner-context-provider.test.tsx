import { StrictMode } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useActiveLearner } from "./learner-context-hook";
import { ACTIVE_LEARNER_STORAGE_KEY } from "./learner-context";
import { ActiveLearnerProvider } from "./learner-context-provider";
import { AccountLearningState } from "./account-learning-state";
import { LearnerClientError } from "./learner-client";
import type { LearnerDto } from "@vocabflow/contracts";
const { requestLearners, createLearner, requestBootstrap } = vi.hoisted(() => ({ requestLearners: vi.fn(), createLearner: vi.fn(), requestBootstrap: vi.fn() }));
vi.mock("./learner-client", async () => ({ ...await vi.importActual<typeof import("./learner-client")>("./learner-client"), requestLearners, createLearner }));
vi.mock("../auth/bootstrap-client", () => ({ requestBootstrap }));
const first: LearnerDto = { id: "00000000-0000-4000-8000-000000000021", householdId: "00000000-0000-4000-8000-000000000001", displayName: "Hoài", avatarKey: null, enabled: true, createdAt: "2026-09-10T00:00:00.000Z", updatedAt: "2026-09-10T00:00:00.000Z" };
const second = { ...first, id: "00000000-0000-4000-8000-000000000022", displayName: "XH" };
function Probe() {
  const { activeLearner, status, clearActiveLearner } = useActiveLearner();
  return <><output data-testid="identity">{status}:{activeLearner?.id ?? "none"}</output><button onClick={clearActiveLearner}>Clear</button>{status !== "ready" ? <AccountLearningState /> : null}</>;
}
function mount(name = "  Account Name  ") {
  return render(<ActiveLearnerProvider userId="account-a" userName={name}><Probe /></ActiveLearnerProvider>);
}
function store(learner: LearnerDto, userId = "account-a") {
  window.localStorage.setItem(ACTIVE_LEARNER_STORAGE_KEY, JSON.stringify({ userId, learner }));
}
async function ready(id = first.id) {
  await waitFor(() => expect(screen.getByTestId("identity")).toHaveTextContent(`ready:${id}`));
  expect(JSON.parse(window.localStorage.getItem(ACTIVE_LEARNER_STORAGE_KEY) ?? "{}")).toMatchObject({ userId: "account-a", learner: { id } });
}
beforeEach(() => {
  window.localStorage.clear();
  requestLearners.mockReset().mockResolvedValue([first]);
  createLearner.mockReset().mockResolvedValue(first);
  requestBootstrap.mockReset().mockResolvedValue({});
});
describe("single-account internal learning identity", () => {
  it("provisions exactly once for zero profiles, silently", async () => {
    requestLearners.mockResolvedValue([]); mount(); await ready();
    expect(createLearner).toHaveBeenCalledExactlyOnceWith({ displayName: "Account Name" });
    expect(screen.queryByText("Đã tạo hồ sơ người học")).not.toBeInTheDocument();
  });
  it.each(["", " ", "x".repeat(81)])("uses a bounded internal fallback for invalid name %s", async (name) => {
    requestLearners.mockResolvedValue([]); mount(name); await ready();
    expect(createLearner).toHaveBeenCalledWith({ displayName: "Người học" });
  });
  it("uses existing data without create", async () => { mount(); await ready(); expect(createLearner).not.toHaveBeenCalled(); });
  it("uses same-user legacy storage and refreshes the canonical DTO", async () => {
    store({ ...second, displayName: "Old" }); requestLearners.mockResolvedValue([first, second]); mount(); await ready(second.id);
    expect(JSON.parse(window.localStorage.getItem(ACTIVE_LEARNER_STORAGE_KEY)!)).toMatchObject({ learner: { displayName: "XH" } });
    expect(createLearner).not.toHaveBeenCalled();
  });
  it("chooses earliest instant then ID deterministically", async () => {
    requestLearners.mockResolvedValue([{ ...second, createdAt: "2026-09-11T00:00:00.000Z" }, second, { ...first, createdAt: "2026-09-10T07:00:00.000+07:00" }]); mount(); await ready();
    expect(createLearner).not.toHaveBeenCalled();
  });
  it.each(["other-user", "disabled", "missing", "malformed"])("ignores %s storage", async (kind) => {
    if (kind === "malformed") window.localStorage.setItem(ACTIVE_LEARNER_STORAGE_KEY, "{bad-json");
    else store(kind === "disabled" ? { ...second, enabled: false } : second, kind === "other-user" ? "account-b" : "account-a");
    requestLearners.mockResolvedValue(kind === "disabled" ? [first, { ...second, enabled: false }] : [first]); mount(); await ready();
  });
  it("bootstraps missing household once then provisions", async () => {
    requestLearners.mockRejectedValueOnce(new LearnerClientError("HOUSEHOLD_ACCESS_DENIED", 403)).mockResolvedValueOnce([]); mount(); await ready();
    expect(requestBootstrap).toHaveBeenCalledTimes(1); expect(requestLearners).toHaveBeenCalledTimes(2); expect(createLearner).toHaveBeenCalledTimes(1);
  });
  it.each(["bootstrap", "retry", "network"])("shows recoverable error on %s without looping", async (kind) => {
    requestLearners.mockRejectedValue(new LearnerClientError(kind === "network" ? "NETWORK_ERROR" : "HOUSEHOLD_ACCESS_DENIED", kind === "network" ? 0 : 403));
    if (kind === "bootstrap") requestBootstrap.mockRejectedValue(new Error("bootstrap failure")); mount();
    await waitFor(() => expect(screen.getByTestId("identity")).toHaveTextContent("error:none"));
    expect(requestBootstrap).toHaveBeenCalledTimes(kind === "network" ? 0 : 1); expect(requestLearners).toHaveBeenCalledTimes(kind === "retry" ? 2 : 1);
    requestLearners.mockResolvedValue([first]); fireEvent.click(screen.getByRole("button", { name: "Thử lại" })); await ready();
  });
  it("reconciles uncertain create without replay", async () => {
    requestLearners.mockResolvedValueOnce([]).mockResolvedValueOnce([first]); createLearner.mockRejectedValue(new LearnerClientError("NETWORK_ERROR", 0, true)); mount(); await ready();
    expect(createLearner).toHaveBeenCalledTimes(1); expect(requestLearners).toHaveBeenCalledTimes(2);
  });
  it("requires explicit retry and fresh empty read after uncertain create", async () => {
    requestLearners.mockResolvedValue([]); createLearner.mockRejectedValueOnce(new LearnerClientError("INVALID_RESPONSE", 201, true)).mockResolvedValueOnce(first); mount();
    await waitFor(() => expect(screen.getByTestId("identity")).toHaveTextContent("error:none")); expect(createLearner).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" })); await ready(); expect(requestLearners).toHaveBeenCalledTimes(3); expect(createLearner).toHaveBeenCalledTimes(2);
  });
  it("deduplicates StrictMode provisioning", async () => {
    requestLearners.mockResolvedValue([]); render(<StrictMode><ActiveLearnerProvider userId="account-a"><Probe /></ActiveLearnerProvider></StrictMode>); await ready();
    expect(createLearner).toHaveBeenCalledTimes(1); expect(requestLearners).toHaveBeenCalledTimes(1);
  });
  it("clears internal persistence", async () => {
    mount(); await ready(); fireEvent.click(screen.getByRole("button", { name: "Clear" })); expect(window.localStorage.getItem(ACTIVE_LEARNER_STORAGE_KEY)).toBeNull();
  });
  it("ignores an account A response after account B becomes current", async () => {
    let finishA!: (rows: LearnerDto[]) => void;
    requestLearners.mockImplementationOnce(() => new Promise<LearnerDto[]>((resolve) => { finishA = resolve; })).mockResolvedValueOnce([second]);
    const view = mount();
    await waitFor(() => expect(requestLearners).toHaveBeenCalledTimes(1));
    view.rerender(<ActiveLearnerProvider userId="account-b"><Probe /></ActiveLearnerProvider>);
    await waitFor(() => expect(screen.getByTestId("identity")).toHaveTextContent(`ready:${second.id}`));
    await act(async () => { finishA([]); });
    expect(screen.getByTestId("identity")).toHaveTextContent(`ready:${second.id}`);
    expect(JSON.parse(window.localStorage.getItem(ACTIVE_LEARNER_STORAGE_KEY)!)).toMatchObject({ userId: "account-b", learner: { id: second.id } });
    expect(createLearner).not.toHaveBeenCalled();
  });
  it("cannot repersist an in-flight response after logout clears identity", async () => {
    let finish!: (rows: LearnerDto[]) => void;
    requestLearners.mockImplementationOnce(() => new Promise<LearnerDto[]>((resolve) => { finish = resolve; }));
    mount();
    await waitFor(() => expect(requestLearners).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    await act(async () => { finish([first]); });
    expect(window.localStorage.getItem(ACTIVE_LEARNER_STORAGE_KEY)).toBeNull();
    expect(screen.getByTestId("identity")).toHaveTextContent("resolving:none");
  });
});
