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

const learningSet = {
  id: 1,
  slug: "starter-vocabulary",
  name: "Bộ từ khởi đầu VocabFlow",
  description: "Bộ từ khởi đầu giúp người học làm quen với những từ vựng cơ bản.",
  grade: null,
  enabled: true,
  sortOrder: 10,
  vocabularyCount: 1
};

const session = {
  session: { id: "session-1", userId: "parent-1" },
  user: { id: "parent-1", email: "parent@example.com" }
};

test("US-28 browses an ordered learning-set catalog and detail", async ({ page }) => {
  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(session) });
  });
  await page.route("**/api/learning-sets", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ learningSets: [learningSet] }) });
  });
  await page.route("**/api/learning-sets/1", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ learningSet: {
      ...learningSet,
      items: [{ sortOrder: 0, vocabulary: {
        id: 1, word: "apple", ipa: null, vietnamese: "quả táo", definitionEn: null,
        exampleEn: null, imageUrl: null, audioUrl: null, topic: null, level: null, enabled: true, contentVersion: 1
      } }]
    } }) });
  });
  await page.goto("/learning-sets");
  await expect(page.getByTestId("learning-sets-list")).toContainText("Bộ từ khởi đầu VocabFlow");
  await page.getByRole("link", { name: "Xem bộ từ" }).click();
  await expect(page.getByTestId("learning-set-detail-items")).toContainText("apple");
});

test("US-29 assigns a set to the active learner and shows success", async ({ page }) => {
  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(session) });
  });
  await page.route("**/api/learners", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ learners: [learner] }) });
  });
  await page.route(`**/api/learners/${learnerId}/learning-sets`, async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ learningSets: [{ learningSet, active: false }] }) });
  });
  await page.route(`**/api/learners/${learnerId}/learning-sets/1`, async (route) => {
    if (route.request().method() === "PUT") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ learnerId, learningSetId: 1, active: true }) });
      return;
    }
    await route.continue();
  });
  await page.goto("/learners");
  await expect(page.getByTestId("learner-context-ready")).toContainText("An");
  await page.getByRole("link", { name: "Quản lý bộ từ của người học" }).click();
  await expect(page.getByTestId("learner-learning-sets-list")).toBeVisible();
  await page.getByRole("button", { name: "Gán bộ từ" }).click();
  await expect(page.getByRole("button", { name: "Đã gán" })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Đã gán Bộ từ khởi đầu VocabFlow.");
});

test("US-30 edits the active learner daily NEW-word limit", async ({ page }) => {
  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(session) });
  });
  await page.route("**/api/learners", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ learners: [learner] }) });
  });
  await page.route(`**/api/learners/${learnerId}/settings`, async (route) => {
    if (route.request().method() === "PATCH") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ learnerId, dailyNewWordLimit: 5, dailyLearningGoal: 10 }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ learnerId, dailyNewWordLimit: 10, dailyLearningGoal: 10 }) });
  });
  await page.goto("/learners");
  await expect(page.getByTestId("learner-context-ready")).toContainText("An");
  await page.getByRole("link", { name: "Cài đặt số từ mới mỗi ngày" }).click();
  await expect(page.getByLabel("Số từ mới tối đa mỗi ngày")).toHaveValue("10");
  await page.getByLabel("Số từ mới tối đa mỗi ngày").fill("5");
  await page.getByRole("button", { name: "Lưu cài đặt" }).click();
  await expect(page.getByRole("status")).toContainText("Đã lưu cài đặt học của An.");
});
