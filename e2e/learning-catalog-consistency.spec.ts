import { expect, test } from "@playwright/test";

const learnerId = "00000000-0000-4000-8000-000000000010";
const learner = { id: learnerId, householdId: learnerId, displayName: "An", avatarKey: null, enabled: true,
  createdAt: "2026-10-21T00:00:00.000Z", updatedAt: "2026-10-21T00:00:00.000Z" };
const topics = [{ id: 10, slug: "food", name: "Thực phẩm", description: "Từ vựng về thực phẩm.", enabled: true, sortOrder: 0, studyScopeAvailable: true }];
const words = [
  { id: 1, word: "apple", ipa: "/ˈæp.əl/", vietnamese: "quả táo", level: "GRADE_1", isSaved: true },
  { id: 2, word: "cake", ipa: "/keɪk/", vietnamese: "bánh ngọt", level: "GRADE_2", isSaved: false }
].map((word) => ({ ...word, cefr: "A1", topic: null, partOfSpeech: "NOUN", imageUrl: null, audioUrl: null,
  enabled: true, contentVersion: 1, status: "NEW", nextReviewDate: null }));

for (const width of [375, 1440]) {
  test(`catalog keeps grade/topic selection into study at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const requests: string[] = [];
    await page.route("**/api/**", async (route) => {
      const url = new URL(route.request().url()); requests.push(url.pathname + url.search);
      const send = (body: unknown) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
      if (url.pathname === "/api/auth/get-session") return send({ session: { id: "test-session", userId: "parent" }, user: { id: "parent", name: "An", email: "an@example.test" } });
      if (url.pathname === "/api/learners") return send({ learners: [learner] });
      if (url.pathname === "/api/topics") return send({ topics });
      if (url.pathname === "/api/learning-sets") return send({ learningSets: [] });
      if (url.pathname.endsWith("/vocabulary/browse")) {
        const items = words.filter((word) => !url.searchParams.has("level") || word.level === url.searchParams.get("level"));
        return send({ vocabulary: items, total: items.length, page: 1, pageSize: 30, totalPages: 1,
          filters: { cefrOptions: ["A1"], topicOptions: ["Thực phẩm"], topicChoices: [{ id: 10, name: "Thực phẩm", slug: "food", parentTopicId: null }] } });
      }
      if (url.pathname.endsWith("/review-queue")) {
        const { id, word, ipa, vietnamese, level, cefr } = words[0]!;
        return send({ learnerId, reviewDate: "2026-10-21", dueCount: 0, newCount: 1, dailyNewRemaining: 10,
          queue: [{ vocabulary: { id, word, ipa, vietnamese, level, cefr, definitionEn: null, exampleEn: null, imageUrl: null, audioUrl: null, topic: null, enabled: true, contentVersion: 1 }, queueType: "NEW", status: "NEW", nextReviewDate: null, expectedRevision: 0 }] });
      }
      return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: { code: "NOT_FOUND" } }) });
    });
    await page.goto("/vocabulary");
    await expect(page.getByTestId("vocabulary-row-2")).toBeVisible();
    await expect(page.getByRole("button", { name: "Bỏ lưu từ apple" })).toBeEnabled();
    expect(requests.some((url) => url.endsWith("/saved-vocabulary"))).toBe(false);
    expect(await page.locator(".vocabulary-card-link button").count()).toBe(0);
    await page.getByTestId("vocabulary-level-filter").selectOption("GRADE_1");
    await expect(page.getByTestId("vocabulary-row-2")).toHaveCount(0);
    await page.getByTestId("vocabulary-topic-filter").selectOption("10");
    await expect(page.getByRole("link", { name: "Học nội dung đã chọn" })).toHaveAttribute("href", /topicId=10.*level=GRADE_1/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: `test-results/us59-catalog-${width}.png`, fullPage: true });
    await page.getByRole("link", { name: "Học nội dung đã chọn" }).click();
    await expect(page.getByTestId("study-setup-page")).toBeVisible();
    await expect(page.getByText("Lớp 1", { exact: true })).toBeVisible();
    expect(requests.some((url) => url.includes("/review-queue?") && url.includes("topicId=10") && url.includes("level=GRADE_1"))).toBe(true);
  });
}
