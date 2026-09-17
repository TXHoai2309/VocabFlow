import { expect, test } from "@playwright/test";

const learnerId = "00000000-0000-4000-8000-000000000010";
const learner = {
  id: learnerId,
  householdId: "00000000-0000-4000-8000-000000000001",
  displayName: "An",
  avatarKey: null,
  enabled: true,
  createdAt: "2026-09-10T00:00:00.000Z",
  updatedAt: "2026-09-10T00:00:00.000Z"
};

const session = {
  session: { id: "session-1", userId: "parent-1" },
  user: { id: "parent-1", email: "parent@example.com" }
};

test("US-24 confirms a learner-scoped reset and refreshes the progress summary", async ({ page }) => {
  let summaryCalls = 0;
  let resetCalls = 0;
  let finishReset!: () => void;
  const resetPending = new Promise<void>((resolve) => { finishReset = resolve; });

  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(session) });
  });
  await page.route("**/api/learners", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ learners: [learner] }) });
  });
  await page.route("**/api/learners/" + learnerId + "/progress-summary", async (route) => {
    summaryCalls += 1;
    const reset = summaryCalls > 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        learnerId,
        newCount: reset ? 30 : 25,
        learningCount: reset ? 0 : 2,
        masteredCount: reset ? 0 : 3,
        dueCount: reset ? 0 : 4,
        learnedCount: reset ? 0 : 5
      })
    });
  });
  await page.route("**/api/learners/" + learnerId + "/reset-progress", async (route) => {
    resetCalls += 1;
    await resetPending;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ learnerId, deletedProgressCount: 2 })
    });
  });

  await page.goto("/learners");
  await page.getByRole("link", { name: "Xem tiến trình" }).click();
  await expect(page.getByTestId("progress-summary")).toBeVisible();

  await page.getByRole("button", { name: "Reset tiến trình" }).click();
  await expect(page.getByRole("dialog")).toContainText("Reset tiến trình của An?");
  await page.getByRole("button", { name: "Hủy" }).click();
  expect(resetCalls).toBe(0);

  await page.getByRole("button", { name: "Reset tiến trình" }).click();
  await page.getByRole("button", { name: "Xác nhận reset" }).click();
  await expect(page.getByRole("button", { name: "Đang reset…" })).toBeDisabled();
  expect(resetCalls).toBe(1);
  finishReset();

  await expect(page.getByTestId("progress-empty-state")).toBeVisible();
  await expect(page.getByText("Đã reset tiến trình của An.")).toBeVisible();
  await expect(page.getByText("Learned").locator("..")).toContainText("0");
  expect(summaryCalls).toBe(2);
});
