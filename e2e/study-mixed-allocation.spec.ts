import { expect, test } from "@playwright/test";
import { mockAccount, profile } from "./account-learning-fixture";

function word(id: number, queueType: "NEW" | "DUE") {
  return { vocabulary: { id, word: `word-${id}`, ipa: null, vietnamese: "nghĩa", definitionEn: null, exampleEn: null, imageUrl: null, audioUrl: null, topic: null, level: null, enabled: true, contentVersion: 1 }, queueType, status: queueType === "NEW" ? "NEW" : "LEARNING", nextReviewDate: queueType === "NEW" ? null : "2026-10-08", expectedRevision: queueType === "NEW" ? 0 : 4 };
}

for (const [content, amount, expectedDue, expectedNew] of [
  ["mixed", 5, 3, 2], ["mixed", 10, 5, 5], ["mixed", 20, 10, 10], ["mixed", 30, 15, 15],
  ["new", 30, 0, 30], ["review", 30, 30, 0]
] as const) {
  test(`${content} ${amount} uses ${expectedDue} Due / ${expectedNew} New and preserves custom continuation`, async ({ page }) => {
    test.setTimeout(60_000);
    await mockAccount(page);
    const ids = [1, 2, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
    await page.route("**/api/learning-sets", (route) => route.fulfill({ json: { learningSets: ids.map((id) => ({ id, slug: `set-${id}`, name: `Set ${id}`, description: "Test", enabled: true, sortOrder: id, grade: null, vocabularyCount: 60 })) } }));
    const queueReads: URL[] = []; const answers: number[] = [];
    await page.route("**/review-queue**", (route) => {
      const url = new URL(route.request().url()); queueReads.push(url);
      const capacity = Number(url.searchParams.get("capacity"));
      const queue = [...Array.from({ length: capacity }, (_, i) => word(i + 1, "DUE")), ...Array.from({ length: capacity }, (_, i) => word(i + 100, "NEW"))];
      return route.fulfill({ json: { learnerId: profile().id, reviewDate: "2026-10-08", dueCount: 45, newCount: 147, queue } });
    });
    await page.route("**/api/reviews", (route) => {
      const body = route.request().postDataJSON(); answers.push(body.vocabularyId);
      return route.fulfill({ status: 201, json: { reviewId: body.reviewId, learnerId: profile().id, vocabularyId: body.vocabularyId, result: "REMEMBERED", progress: { status: "LEARNING", consecutiveCorrect: 1, intervalDays: 1, firstLearnedDate: "2026-10-08", lastReviewedDate: "2026-10-08", nextReviewDate: "2026-10-09", totalCorrect: 1, totalIncorrect: 0, revision: body.expectedRevision + 1 } } });
    });
    await page.goto(`/study/setup?source=custom&setIds=${ids.join(",")}&content=${content}`);
    await expect(page.getByTestId("study-setup-page")).toBeVisible();
    await page.getByRole("button", { name: new RegExp(`^${amount}\\s*từ$`) }).click();
    await expect(page.getByTestId("study-setup-summary-count")).toHaveText(`${amount} từ`);
    await page.getByRole("button", { name: /Bắt đầu học/ }).click();
    await expect(page.getByTestId("session-counter")).toHaveText(`Câu 1 / ${amount}`);
    for (let i = 0; i < amount; i += 1) {
      await page.getByRole("button", { name: "Lật để xem nghĩa" }).click();
      await page.getByRole("button", { name: "Đã nhớ" }).click();
      await expect(page.getByTestId(i === amount - 1 ? "study-session-summary" : "session-counter")).toContainText(i === amount - 1 ? "Kết quả" : `Câu ${i + 2} / ${amount}`);
    }
    expect(answers).toEqual([...Array.from({ length: expectedDue }, (_, i) => i + 1), ...Array.from({ length: expectedNew }, (_, i) => i + 100)]);
    expect(queueReads.map((url) => url.searchParams.get("capacity"))).toEqual(["30", String(amount)]);
    expect(queueReads.every((url) => url.searchParams.get("source") === "custom" && url.searchParams.get("setIds") === ids.join(","))).toBe(true);
    await expect(page.getByRole("link", { name: /Học tiếp/ })).toHaveAttribute("href", `/study/setup?source=custom&setIds=${ids.join("%2C")}`);
  });
}
