import { expect, test } from "@playwright/test";
import { mockAccount, profile } from "./account-learning-fixture";

const sets = Array.from({ length: 35 }, (_, i) => ({ id: i + 1, slug: `set-${i + 1}`, name: `Bộ từ ${i + 1}`, description: "Bộ từ học tập", enabled: true, sortOrder: i, grade: null, vocabularyCount: 2 }));
function word(id: number) { return { vocabulary: { id, word: `word-${id}`, ipa: null, vietnamese: "nghĩa", definitionEn: null, exampleEn: null, imageUrl: null, audioUrl: null, topic: null, level: null, enabled: true, contentVersion: 1 }, queueType: "NEW", status: "NEW", nextReviewDate: null, expectedRevision: 0 }; }
async function fixture(page: import("@playwright/test").Page) {
  await mockAccount(page);
  const writes: string[] = [];
  page.on("request", (request) => { if (["PUT", "DELETE", "PATCH"].includes(request.method())) writes.push(request.url()); });
  await page.route("**/api/learning-sets", (route) => route.fulfill({ json: { learningSets: sets } }));
  await page.route("**/review-queue**", (route) => route.fulfill({ json: { learnerId: profile().id, reviewDate: "2026-10-08", dueCount: 0, newCount: 2, queue: [word(101), word(202)] } }));
  return writes;
}
for (const width of [320, 390, 768, 1440]) {
  test(`source picker fits ${width}px with visible footer, draft cancel and scoped start`, async ({ page }) => {
    await page.setViewportSize({ width, height: 812 }); const writes = await fixture(page);
    await page.goto("/study/setup"); const source = page.getByRole("combobox", { name: "Nguồn học" });
    await expect(source).toHaveValue("pathway"); await expect(source.locator("option")).toHaveText(["Học theo lộ trình", "Bộ từ tôi chọn", "Tất cả bộ từ"]);
    await expect(page.getByRole("heading", { name: "Gợi ý" })).toHaveCount(0);
    await source.selectOption("custom"); const dialog = page.getByRole("dialog", { name: "Chọn bộ từ" }); await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Áp dụng (0)" })).toBeDisabled();
    await expect(page.getByRole("button", { name: /Bắt đầu học/ })).toBeDisabled();
    const bounds = await dialog.boundingBox(); expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0); expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    if (width < 640) expect(Math.round(bounds!.y + bounds!.height)).toBe(812);
    else expect(bounds!.width).toBeGreaterThanOrEqual(520);
    const footer = await dialog.locator("footer").boundingBox(); expect(footer!.y + footer!.height).toBeLessThanOrEqual(812);
    await dialog.getByRole("searchbox").fill("Bộ từ 35"); await expect(dialog.getByRole("checkbox")).toHaveCount(1);
    await dialog.getByRole("checkbox", { name: "Bộ từ 35", exact: true }).check(); await dialog.getByRole("searchbox").fill("");
    await dialog.getByRole("checkbox", { name: "Bộ từ 1", exact: true }).check(); await dialog.getByRole("button", { name: "Áp dụng (2)" }).click();
    await expect(page.getByText("2 bộ từ đã chọn")).toBeVisible(); await expect(page.getByTestId("study-setup-summary-count")).toHaveText("2 từ");
    await page.getByRole("button", { name: "Thay đổi" }).click(); await dialog.getByRole("checkbox", { name: "Bộ từ 1", exact: true }).uncheck(); await page.keyboard.press("Escape");
    await expect(page.getByText("2 bộ từ đã chọn")).toBeVisible(); await page.getByRole("button", { name: "Thay đổi" }).click(); await expect(dialog.getByRole("checkbox", { name: "Bộ từ 1", exact: true })).toBeChecked();
    await dialog.getByRole("button", { name: "Hủy" }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    if (width < 1024) await expect(page.locator(".app-mobile-bottom-nav a")).toHaveCount(5);
    await page.reload(); await expect(source).toHaveValue("custom"); await expect(page.getByText("2 bộ từ đã chọn")).toBeVisible();
    await page.getByRole("button", { name: /Bắt đầu học/ }).click(); await expect(page).toHaveURL(/source=custom&setIds=1%2C35/); await expect(page.getByTestId("study-session-ready")).toBeVisible();
    expect(writes).toEqual([]);
  });
}
test("stored selection is validated against canonical sets and URL intent wins", async ({ page }) => {
  await fixture(page);
  await page.addInitScript(() => localStorage.setItem("vocabflow.study-source.v1:account-a", JSON.stringify({ source: "custom", ids: [1, 999] })));
  await page.goto("/study/setup"); await expect(page.getByText("1 bộ từ đã chọn")).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("vocabflow.study-source.v1:account-a")!).ids)).toEqual([1]);
  await page.goto("/study/setup?source=pathway"); await expect(page.getByRole("combobox")).toHaveValue("pathway");
});

test("account B does not inherit A's stored Custom source", async ({ page }) => {
  await fixture(page);
  await page.addInitScript(() => localStorage.setItem("vocabflow.study-source.v1:account-a", JSON.stringify({ source: "custom", ids: [1, 2] })));
  await page.route("**/api/auth/get-session", (route) => route.fulfill({ json: { session: { id: "B", userId: "account-b" }, user: { id: "account-b", name: "B", email: "b@example.com" } } }));
  await page.goto("/study/setup"); await expect(page.getByRole("combobox")).toHaveValue("pathway");
  await expect(page.getByText("2 bộ từ đã chọn")).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("vocabflow.study-source.v1:account-a")!).ids)).toEqual([1, 2]);
});

test("a delayed old source response cannot replace current availability", async ({ page }) => {
  await fixture(page);
  let release!: () => void;
  const delayed = new Promise<void>((resolve) => { release = resolve; });
  let allRequested = false;
  await page.route("**/review-queue?source=all", async (route) => {
    allRequested = true; await delayed;
    await route.fulfill({ json: { learnerId: profile().id, reviewDate: "2026-10-08", dueCount: 0, newCount: 1, queue: [word(999)] } });
  });
  await page.goto("/study/setup"); await expect(page.getByTestId("study-setup-summary-count")).toHaveText("2 từ");
  await page.getByRole("combobox").selectOption("all"); await expect.poll(() => allRequested).toBe(true);
  await page.getByRole("combobox").selectOption("pathway"); await expect(page.getByTestId("study-setup-summary-count")).toHaveText("2 từ");
  release(); await expect(page.getByTestId("study-setup-summary-count")).toHaveText("2 từ"); await expect(page.getByRole("combobox")).toHaveValue("pathway");
});
