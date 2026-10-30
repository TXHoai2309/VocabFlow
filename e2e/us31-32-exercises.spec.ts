import { expect, test, type Page, type Route } from "@playwright/test";

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

function vocabulary(id: number, word: string, vietnamese: string, audioUrl: string | null = null, imageUrl: string | null = null) {
  return {
    id,
    word,
    ipa: null,
    vietnamese,
    definitionEn: null,
    exampleEn: null,
    imageUrl,
    audioUrl,
    topic: null,
    level: null,
    enabled: true,
    contentVersion: 1
  };
}

function queueItem(id: number, word: string, vietnamese: string, audioUrl: string | null = null, imageUrl: string | null = null) {
  return {
    vocabulary: vocabulary(id, word, vietnamese, audioUrl, imageUrl),
    queueType: "NEW",
    status: "NEW",
    nextReviewDate: null,
    expectedRevision: 0
  };
}

async function preparePage(page: Page) {
  await page.route("**/api/auth/get-session", async (route: Route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(session) });
  });
  await page.route("**/api/learners", async (route: Route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ learners: [learner] }) });
  });
}

test("US-31 runs a multiple-choice meaning exercise through the canonical review API", async ({ page }) => {
  await preparePage(page);
  const target = queueItem(1, "apple", "quả táo");
  const queue = [target, queueItem(2, "book", "quyển sách"), queueItem(3, "house", "ngôi nhà"), queueItem(4, "water", "nước")];
  await page.route("**/api/learners/*/review-queue", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ learnerId: learner.id, reviewDate: "2026-09-15", dueCount: 0, newCount: queue.length, queue })
    });
  });
  let reviewBody: Record<string, unknown> | undefined;
  await page.route("**/api/reviews", async (route: Route) => {
    const requestBody = route.request().postDataJSON() as Record<string, unknown>;
    reviewBody = requestBody;
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        reviewId: requestBody.reviewId,
        learnerId: learner.id,
        vocabularyId: target.vocabulary.id,
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
  await page.goto("/study/exercises?type=MULTIPLE_CHOICE_MEANING");
  await expect(page).toHaveURL(/\/study\/exercises\?/);
  await expect(page.getByTestId("exercise-card")).toHaveAttribute("data-exercise-type", "MULTIPLE_CHOICE_MEANING");
  await page.getByRole("button", { name: "quả táo" }).click();
  await expect.poll(() => reviewBody).toMatchObject({ learnerId: learner.id, vocabularyId: 1, result: "REMEMBERED", expectedRevision: 0 });
  await expect(page.locator(".flashcard-word, .exercise-word")).toHaveText("book");
});

test("US-32 hides the listening prompt target and maps a wrong choice to FORGOTTEN", async ({ page }) => {
  await preparePage(page);
  const target = queueItem(1, "apple", "quả táo", "/audio/apple.mp3");
  const queue = [target, queueItem(2, "book", "quyển sách"), queueItem(3, "house", "ngôi nhà"), queueItem(4, "water", "nước")];
  await page.route("**/api/learners/*/review-queue", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ learnerId: learner.id, reviewDate: "2026-09-15", dueCount: 0, newCount: queue.length, queue })
    });
  });
  let reviewBody: Record<string, unknown> | undefined;
  await page.route("**/api/reviews", async (route: Route) => {
    const requestBody = route.request().postDataJSON() as Record<string, unknown>;
    reviewBody = requestBody;
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        reviewId: requestBody.reviewId,
        learnerId: learner.id,
        vocabularyId: target.vocabulary.id,
        result: "FORGOTTEN",
        progress: {
          status: "LEARNING",
          consecutiveCorrect: 0,
          intervalDays: 1,
          firstLearnedDate: "2026-09-15",
          lastReviewedDate: "2026-09-15",
          nextReviewDate: "2026-09-16",
          totalCorrect: 0,
          totalIncorrect: 1,
          revision: 1
        }
      })
    });
  });

  await page.goto("/learners");
  await page.goto("/study/exercises?type=LISTENING_CHOICE");
  await expect(page.getByTestId("exercise-card")).toHaveAttribute("data-exercise-type", "LISTENING_CHOICE");
  await expect(page.getByTestId("exercise-prompt")).not.toContainText("apple");
  await expect(page.getByTestId("exercise-audio-button")).toHaveAccessibleName("Nghe phát âm");
  await page.getByRole("button", { name: "book" }).click();
  await expect(page.getByText("Chưa đúng.", { exact: true })).toBeVisible();
  expect(reviewBody).toMatchObject({ learnerId: learner.id, vocabularyId: 1, result: "FORGOTTEN", expectedRevision: 0 });
});

test("US-33 shows a neutral image prompt and maps the correct choice to REMEMBERED", async ({ page }) => {
  await preparePage(page);
  await page.route("**/images/apple.jpg", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "image/svg+xml",
      body: "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"8\" height=\"8\"><rect width=\"8\" height=\"8\" fill=\"#0ea5e9\"/></svg>"
    });
  });
  const target = queueItem(1, "apple", "quả táo", null, "/images/apple.jpg");
  const queue = [target, queueItem(2, "book", "quyển sách"), queueItem(3, "house", "ngôi nhà"), queueItem(4, "water", "nước")];
  await page.route("**/api/learners/*/review-queue", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ learnerId: learner.id, reviewDate: "2026-09-15", dueCount: 0, newCount: queue.length, queue })
    });
  });
  let reviewBody: Record<string, unknown> | undefined;
  await page.route("**/api/reviews", async (route: Route) => {
    const requestBody = route.request().postDataJSON() as Record<string, unknown>;
    reviewBody = requestBody;
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        reviewId: requestBody.reviewId,
        learnerId: learner.id,
        vocabularyId: target.vocabulary.id,
        result: "REMEMBERED",
        progress: {
          status: "LEARNING", consecutiveCorrect: 1, intervalDays: 1,
          firstLearnedDate: "2026-09-15", lastReviewedDate: "2026-09-15", nextReviewDate: "2026-09-16",
          totalCorrect: 1, totalIncorrect: 0, revision: 1
        }
      })
    });
  });

  await page.goto("/learners");
  await page.goto("/study/exercises?type=IMAGE_TO_WORD");
  await expect(page).toHaveURL(/\/study\/exercises\?type=IMAGE_TO_WORD$/);
  await expect(page.getByTestId("exercise-card")).toHaveAttribute("data-exercise-type", "IMAGE_TO_WORD");
  await expect(page.getByTestId("exercise-image")).toHaveAttribute("alt", "Hình ảnh gợi ý cho bài tập từ vựng");
  await expect(page.getByTestId("exercise-prompt")).not.toContainText("apple");
  await page.getByRole("button", { name: "apple" }).click();
  await expect(page.getByText("Chính xác!", { exact: true })).toBeVisible();
  expect(reviewBody).toMatchObject({ learnerId: learner.id, vocabularyId: 1, result: "REMEMBERED" });
});

test("US-34 accepts normalized exact spelling without persisting raw input", async ({ page }) => {
  await preparePage(page);
  const target = queueItem(1, "apple", "quả táo");
  const queue = [target, queueItem(2, "book", "quyển sách"), queueItem(3, "house", "ngôi nhà"), queueItem(4, "water", "nước")];
  await page.route("**/api/learners/*/review-queue", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ learnerId: learner.id, reviewDate: "2026-09-15", dueCount: 0, newCount: queue.length, queue })
    });
  });
  let reviewBody: Record<string, unknown> | undefined;
  await page.route("**/api/reviews", async (route: Route) => {
    const requestBody = route.request().postDataJSON() as Record<string, unknown>;
    reviewBody = requestBody;
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        reviewId: requestBody.reviewId,
        learnerId: learner.id,
        vocabularyId: target.vocabulary.id,
        result: "REMEMBERED",
        progress: {
          status: "LEARNING", consecutiveCorrect: 1, intervalDays: 1,
          firstLearnedDate: "2026-09-15", lastReviewedDate: "2026-09-15", nextReviewDate: "2026-09-16",
          totalCorrect: 1, totalIncorrect: 0, revision: 1
        }
      })
    });
  });

  await page.goto("/learners");
  await page.goto("/study/exercises?type=TYPE_WORD");
  await expect(page.getByTestId("exercise-card")).toHaveAttribute("data-exercise-type", "TYPE_WORD");
  await expect(page.getByTestId("exercise-prompt")).not.toContainText("apple");
  await page.getByLabel("Từ tiếng Anh").fill(" ＡＰＰＬＥ ");
  await page.getByLabel("Từ tiếng Anh").press("Enter");
  await expect(page.getByText("Chính xác!", { exact: true })).toBeVisible();
  expect(reviewBody).toMatchObject({ learnerId: learner.id, vocabularyId: 1, result: "REMEMBERED" });
  expect(reviewBody).not.toHaveProperty("answer");
  expect(JSON.stringify(reviewBody)).not.toContain("APPLE");
});
