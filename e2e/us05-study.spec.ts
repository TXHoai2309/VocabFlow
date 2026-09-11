import { expect, test } from "@playwright/test";

const learner = {
  id: "00000000-0000-4000-8000-000000000010",
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

test("US-05 enters study from learner context, reads the first card and flips it", async ({ page }) => {
  let vocabularyReadCount = 0;
  const reviewWrites: string[] = [];
  const writeRequests: string[] = [];

  page.on("request", (request) => {
    if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method())) {
      writeRequests.push(request.url());
    }
  });

  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(session) });
  });
  await page.route("**/api/learners", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ learners: [learner] }) });
  });
  await page.route("**/api/vocabulary", async (route) => {
    if (route.request().method() !== "GET") {
      reviewWrites.push(route.request().method());
      await route.fulfill({ status: 405, contentType: "application/json", body: JSON.stringify({ error: { code: "INVALID_REQUEST" } }) });
      return;
    }
    vocabularyReadCount += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
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
          enabled: true,
          contentVersion: 1
        }]
      })
    });
  });

  await page.goto("/learners");
  await expect(page.getByTestId("learner-context-ready")).toContainText("An");
  await page.getByRole("link", { name: "Bắt đầu học" }).click();

  await expect(page).toHaveURL(/\/study$/);
  await expect(page.getByTestId("first-flashcard-ready")).toBeVisible();
  await expect(page.locator(".study-card-word")).toHaveText("apple");
  await expect(page.locator(".study-card-vietnamese")).not.toBeVisible();

  await page.getByRole("button", { name: "Lật để xem nghĩa" }).press("Space");

  await expect(page.getByRole("button", { name: "Lật về mặt trước" })).toBeVisible();
  await expect(page.locator(".study-card-vietnamese")).toHaveText("quả táo");
  expect(vocabularyReadCount).toBe(1);
  expect(reviewWrites).toEqual([]);
  expect(writeRequests).toEqual([]);
});

test("US-05 sends direct or reload study entry without context back through learner resolution", async ({ page }) => {
  let vocabularyReadCount = 0;

  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(session) });
  });
  await page.route("**/api/learners", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ learners: [learner] }) });
  });
  await page.route("**/api/vocabulary", async (route) => {
    vocabularyReadCount += 1;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ vocabulary: [] }) });
  });

  await page.goto("/study");

  await expect(page).toHaveURL(/\/learners$/);
  await expect(page.getByTestId("learner-context-ready")).toContainText("An");
  expect(vocabularyReadCount).toBe(0);
});
