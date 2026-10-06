import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import type { LearnerDto } from "@vocabflow/contracts";
import { useActiveLearner } from "./learner-context-hook";
import { ACTIVE_LEARNER_STORAGE_KEY } from "./learner-context";
import { ActiveLearnerProvider } from "./learner-context-provider";

const learnerA: LearnerDto = {
  id: "00000000-0000-4000-8000-000000000021",
  householdId: "00000000-0000-4000-8000-000000000001",
  displayName: "Hoài",
  avatarKey: null,
  enabled: true,
  createdAt: "2026-09-10T00:00:00.000Z",
  updatedAt: "2026-09-10T00:00:00.000Z"
};
const learnerB: LearnerDto = { ...learnerA, id: "00000000-0000-4000-8000-000000000022", displayName: "Ngọc" };

function LearnerProbe() {
  const { activeLearner, setActiveLearner, clearActiveLearner } = useActiveLearner();
  return (
    <>
      <output data-testid="active-learner">{activeLearner?.id ?? "none"}</output>
      <button type="button" onClick={() => setActiveLearner(learnerA)}>Select Hoài</button>
      <button type="button" onClick={() => setActiveLearner(learnerB)}>Select Ngọc</button>
      <button type="button" onClick={clearActiveLearner}>Clear selection</button>
    </>
  );
}

function renderProvider(userId = "parent-a") {
  return render(<ActiveLearnerProvider userId={userId}><LearnerProbe /></ActiveLearnerProvider>);
}

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("active learner persistence", () => {
  it("persists the selected learner scoped to its parent", () => {
    renderProvider();
    fireEvent.click(screen.getByRole("button", { name: "Select Hoài" }));

    expect(screen.getByTestId("active-learner")).toHaveTextContent(learnerA.id);
    expect(JSON.parse(window.localStorage.getItem(ACTIVE_LEARNER_STORAGE_KEY) ?? "{}")).toEqual({ userId: "parent-a", learner: learnerA });
  });

  it("restores the learner after the provider is remounted", () => {
    const firstMount = renderProvider();
    fireEvent.click(screen.getByRole("button", { name: "Select Hoài" }));
    firstMount.unmount();

    renderProvider();

    expect(screen.getByTestId("active-learner")).toHaveTextContent(learnerA.id);
  });

  it("ignores and removes malformed stored data", () => {
    window.localStorage.setItem(ACTIVE_LEARNER_STORAGE_KEY, "{not-json");
    renderProvider();

    expect(screen.getByTestId("active-learner")).toHaveTextContent("none");
    expect(window.localStorage.getItem(ACTIVE_LEARNER_STORAGE_KEY)).toBeNull();
  });

  it("does not restore another parent's learner and removes the mismatched record", () => {
    window.localStorage.setItem(ACTIVE_LEARNER_STORAGE_KEY, JSON.stringify({ userId: "parent-a", learner: learnerA }));
    renderProvider("parent-b");

    expect(screen.getByTestId("active-learner")).toHaveTextContent("none");
    expect(window.localStorage.getItem(ACTIVE_LEARNER_STORAGE_KEY)).toBeNull();
  });

  it("clears the persisted selection with the active learner", () => {
    renderProvider();
    fireEvent.click(screen.getByRole("button", { name: "Select Hoài" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear selection" }));

    expect(screen.getByTestId("active-learner")).toHaveTextContent("none");
    expect(window.localStorage.getItem(ACTIVE_LEARNER_STORAGE_KEY)).toBeNull();
  });

  it("replaces the persisted learner when the user selects another learner", () => {
    renderProvider();
    fireEvent.click(screen.getByRole("button", { name: "Select Hoài" }));
    fireEvent.click(screen.getByRole("button", { name: "Select Ngọc" }));

    expect(screen.getByTestId("active-learner")).toHaveTextContent(learnerB.id);
    expect(JSON.parse(window.localStorage.getItem(ACTIVE_LEARNER_STORAGE_KEY) ?? "{}")).toEqual({ userId: "parent-a", learner: learnerB });
  });

  it("clears a persisted selection when canonical validation returns forbidden", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ error: { code: "HOUSEHOLD_ACCESS_DENIED" } }), { status: 403 }));
    window.localStorage.setItem(ACTIVE_LEARNER_STORAGE_KEY, JSON.stringify({ userId: "parent-a", learner: learnerA }));
    render(<ActiveLearnerProvider userId="parent-a" validateStoredSelection><LearnerProbe /></ActiveLearnerProvider>);

    await waitFor(() => expect(screen.getByTestId("active-learner")).toHaveTextContent("none"));
    expect(window.localStorage.getItem(ACTIVE_LEARNER_STORAGE_KEY)).toBeNull();
  });
});
