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

async function mockVocabularyPage(page: import("@playwright/test").Page) {
  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(session) });
  });
  await page.route("**/api/learners", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ learners: [learner] }) });
  });
  await page.route("**/api/learners/" + learnerId + "/vocabulary", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        vocabulary: [
          {
            id: 1,
            word: "apple",
            ipa: null,
            vietnamese: "táo",
            definitionEn: null,
            exampleEn: null,
            imageUrl: null,
            audioUrl: null,
            topic: null,
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
            topic: null,
            enabled: true,
            contentVersion: 1,
            status: "LEARNING",
            nextReviewDate: "2026-09-20"
          },
          {
            id: 3,
            word: "cat",
            ipa: null,
            vietnamese: "mèo",
            definitionEn: null,
            exampleEn: null,
            imageUrl: null,
            audioUrl: null,
            topic: null,
            enabled: true,
            contentVersion: 1,
            status: "MASTERED",
            nextReviewDate: "2026-09-20"
          }
        ]
      })
    });
  });
}

test("US-22 opens vocabulary list and shows learner-scoped statuses", async ({ page }) => {
  await mockVocabularyPage(page);
  await page.goto("/learners");

  await expect(page.getByTestId("learner-context-ready")).toContainText("An");
  await page.getByRole("link", { name: "Từ vựng" }).click();
  await expect(page).toHaveURL(/\/vocabulary$/);
  await expect(page.getByRole("heading", { name: "Từ vựng của An" })).toBeVisible();
  await expect(page.getByTestId("vocabulary-row-1")).toContainText("New");
  await expect(page.getByTestId("vocabulary-row-2")).toContainText("Learning");
  await expect(page.getByTestId("vocabulary-row-3")).toContainText("Mastered");
});

test("US-22 keeps the vocabulary list within a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await mockVocabularyPage(page);
  await page.goto("/learners");
  await page.getByRole("link", { name: "Từ vựng" }).click();

  await expect(page.getByTestId("vocabulary-list")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});
