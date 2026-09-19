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

async function mockProgressPage(page: import("@playwright/test").Page) {
  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(session) });
  });
  await page.route("**/api/learners", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ learners: [learner] }) });
  });
  await page.route("**/api/learners/" + learnerId + "/progress-summary", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        learnerId,
        newCount: 30,
        learningCount: 2,
        masteredCount: 3,
        dueCount: 4,
        learnedCount: 5
      })
    });
  });
  await page.route("**/api/learners/" + learnerId + "/activity-summary", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        learnerId,
        localDate: "2026-09-20",
        dailyGoal: { goal: 10, reviewedUnique: 7, remaining: 3, completed: false },
        streak: { currentStreak: 3, longestStreak: 7, todayActive: true }
      })
    });
  });
}

test("US-20 opens learner progress and renders all summary metrics", async ({ page }) => {
  await mockProgressPage(page);
  await page.goto("/learners");

  await expect(page.getByTestId("learner-context-ready")).toContainText("An");
  await page.getByRole("link", { name: "Xem tiến trình" }).click();
  await expect(page).toHaveURL(/\/progress$/);
  await expect(page.getByRole("heading", { name: "Tiến trình của An" })).toBeVisible();
  await expect(page.getByText("New").locator("..")).toContainText("30");
  await expect(page.getByText("Learning").locator("..")).toContainText("2");
  await expect(page.getByText("Mastered").locator("..")).toContainText("3");
  await expect(page.getByText("Due").locator("..")).toContainText("4");
  await expect(page.getByText("Learned").locator("..")).toContainText("5");
  await expect(page.getByTestId("daily-goal")).toContainText("7 / 10");
  await expect(page.getByTestId("streak-summary")).toContainText("3 ngày liên tiếp");
});

test("US-20 keeps the progress dashboard within a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await mockProgressPage(page);
  await page.goto("/learners");
  await page.getByRole("link", { name: "Xem tiến trình" }).click();

  await expect(page.getByTestId("progress-summary")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});
