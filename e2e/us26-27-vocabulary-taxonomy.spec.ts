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

const vocabulary = [
  {
    id: 1,
    word: "apple",
    ipa: null,
    vietnamese: "táo",
    definitionEn: null,
    exampleEn: null,
    imageUrl: null,
    audioUrl: null,
    topic: "Food",
    level: "GRADE_1",
    enabled: true,
    contentVersion: 1,
    status: "NEW",
    nextReviewDate: null
  },
  {
    id: 2,
    word: "book",
    ipa: null,
    vietnamese: "sách",
    definitionEn: null,
    exampleEn: null,
    imageUrl: null,
    audioUrl: null,
    topic: "ObjectInHouse",
    level: null,
    enabled: true,
    contentVersion: 1,
    status: "NEW",
    nextReviewDate: null
  }
];

test("US-26 filters vocabulary by nullable grade level without changing the learner flow", async ({ page }) => {
  const vocabularyRequests: string[] = [];
  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(session) });
  });
  await page.route("**/api/learners", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ learners: [learner] }) });
  });
  await page.route("**/api/learners/" + learnerId + "/vocabulary**", async (route) => {
    vocabularyRequests.push(route.request().url());
    const filtered = new URL(route.request().url()).searchParams.get("level") === "GRADE_1"
      ? vocabulary.filter((item) => item.level === "GRADE_1")
      : vocabulary;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ vocabulary: filtered }) });
  });

  await page.goto("/learners");
  await expect(page.locator(".app-layout")).toBeVisible();
  await page.getByRole("navigation", { name: "Điều hướng chính", exact: true }).getByRole("link", { name: "Từ vựng", exact: true }).click();
  await expect(page.getByTestId("vocabulary-row-2")).toBeVisible();
  await page.getByTestId("vocabulary-level-filter").selectOption("GRADE_1");

  await expect(page.getByTestId("vocabulary-row-1")).toBeVisible();
  await expect(page.getByTestId("vocabulary-row-2")).toHaveCount(0);
  expect(vocabularyRequests.at(-1)).toContain("level=GRADE_1");
});

test("US-27 browses canonical topics and enabled vocabulary through the topic route", async ({ page }) => {
  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(session) });
  });
  await page.route("**/api/topics", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ topics: [{ id: 11, slug: "food", name: "Food", description: "Imported Food topic", sortOrder: 11, enabled: true }] })
    });
  });
  await page.route("**/api/topics/11/vocabulary", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ vocabulary: [vocabulary[0]] }) });
  });

  await page.goto("/topics");
  await expect(page.getByRole("heading", { name: "Học theo chủ đề" })).toBeVisible();
  await page.getByTestId("topic-food").click();
  await expect(page.getByTestId("topic-vocabulary-list")).toContainText("apple");
  await expect(page.getByTestId("topic-vocabulary-list")).toContainText("táo");
});
