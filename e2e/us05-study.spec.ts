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

test("US-09 enters the queue-backed study session and flips the first card", async ({ page }) => {
  let queueReadCount = 0;
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
  await page.route("**/api/learners/*/review-queue", async (route) => {
    if (route.request().method() !== "GET") {
      reviewWrites.push(route.request().method());
      await route.fulfill({ status: 405, contentType: "application/json", body: JSON.stringify({ error: { code: "INVALID_REQUEST" } }) });
      return;
    }
    queueReadCount += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        learnerId: learner.id,
        reviewDate: "2026-09-15",
        dueCount: 1,
        newCount: 0,
        queue: [{
          vocabulary: {
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
          },
          queueType: "DUE",
          status: "LEARNING",
          nextReviewDate: "2026-09-15",
          expectedRevision: 1
        }]
      })
    });
  });

  await page.goto("/learners");
  await expect(page.getByTestId("learner-context-ready")).toContainText("An");
  await page.getByRole("link", { name: "Bắt đầu học" }).click();

  await expect(page).toHaveURL(/\/study$/);
  await expect(page.getByTestId("study-session-ready")).toBeVisible();
  await expect(page.locator(".study-card-word")).toHaveText("apple");
  await expect(page.locator(".study-card-vietnamese")).not.toBeVisible();

  await page.getByRole("button", { name: "Lật để xem nghĩa" }).press("Space");

  await expect(page.getByRole("button", { name: "Lật về mặt trước" })).toBeVisible();
  await expect(page.locator(".study-card-vietnamese")).toHaveText("quả táo");
  expect(queueReadCount).toBe(1);
  expect(reviewWrites).toEqual([]);
  expect(writeRequests).toEqual([]);
});

test("US-09 sends direct or reload study entry without context back through learner resolution", async ({ page }) => {
  let queueReadCount = 0;

  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(session) });
  });
  await page.route("**/api/learners", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ learners: [learner] }) });
  });
  await page.route("**/api/learners/*/review-queue", async (route) => {
    queueReadCount += 1;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ queue: [] }) });
  });

  await page.goto("/study");

  await expect(page).toHaveURL(/\/learners$/);
  await expect(page.getByTestId("learner-context-ready")).toContainText("An");
  expect(queueReadCount).toBe(0);
});

test("US-09 persists a confirmed evaluation and shows the session summary", async ({ page }) => {
  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(session) });
  });
  await page.route("**/api/learners", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ learners: [learner] }) });
  });
  await page.route("**/api/learners/*/review-queue", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        learnerId: learner.id,
        reviewDate: "2026-09-15",
        dueCount: 0,
        newCount: 1,
        queue: [{
          vocabulary: {
            id: 2,
            word: "book",
            ipa: "/bʊk/",
            vietnamese: "quyển sách",
            definitionEn: "a set of written pages",
            exampleEn: null,
            imageUrl: null,
            audioUrl: null,
            topic: "study",
            enabled: true,
            contentVersion: 1
          },
          queueType: "NEW",
          status: "NEW",
          nextReviewDate: null,
          expectedRevision: 0
        }]
      })
    });
  });
  await page.route("**/api/reviews", async (route) => {
    const body = route.request().postDataJSON();
    expect(body).toMatchObject({ learnerId: learner.id, vocabularyId: 2, result: "REMEMBERED", expectedRevision: 0 });
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        reviewId: body.reviewId,
        learnerId: learner.id,
        vocabularyId: 2,
        result: "REMEMBERED",
        progress: {
          status: "LEARNING",
          consecutiveCorrect: 1,
          intervalDays: 1,
          firstLearnedDate: "2026-09-15",
          lastReviewedDate: "2026-09-15",
          nextReviewDate: "2026-09-16",
          totalCorrect: 1,
          totalIncorrect: 0,
          revision: 1
        }
      })
    });
  });

  await page.goto("/learners");
  await page.getByRole("link", { name: "Bắt đầu học" }).click();
  await expect(page.getByTestId("study-session-ready")).toBeVisible();
  await page.getByRole("button", { name: "Lật để xem nghĩa" }).click();
  await expect(page.getByRole("button", { name: "Đã nhớ" })).toBeVisible();
  await page.getByRole("button", { name: "Đã nhớ" }).click();
  await expect(page.getByTestId("study-session-summary")).toBeVisible();
  await expect(page.getByTestId("study-session-summary")).toContainText("Đã review");
  await expect(page.getByTestId("study-session-summary")).toContainText("Lượt ôn lại");
});
