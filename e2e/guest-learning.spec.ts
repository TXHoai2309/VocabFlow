import { expect, test, type Page } from "@playwright/test";

const guestKey = "vocabflow.guest.v1";
const word = { id: 1, word: "hello", vietnamese: "xin chào", ipa: null, definitionEn: null, exampleEn: null, imageUrl: null, audioUrl: null, topic: "Chào hỏi", level: null, enabled: true, contentVersion: 1 };
const catalog = { vocabulary: [word], learningSets: [{ id: 1, slug: "starter", name: "Bắt đầu", description: "Từ cơ bản", grade: null, sortOrder: 0, enabled: true, vocabularyCount: 1, vocabularyIds: [1] }], topics: [] };
async function guestApi(page: Page) {
  await page.route("**/api/auth/get-session", (route) => route.fulfill({ json: null }));
  await page.route("**/api/public/learning-catalog", (route) => route.fulfill({ json: catalog }));
}
test("guest completes a flashcard, restores progress and keeps it when opening signup", async ({ page }) => {
  await guestApi(page);
  const privateWrites: string[] = [];
  page.on("request", (request) => { if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method())) privateWrites.push(request.url()); });
  await page.goto("/");
  await expect(page.getByLabel("Học không cần tài khoản")).toBeVisible();
  await page.screenshot({ path: "test-results/guest-desktop-notice.png", fullPage: true });
  await page.getByRole("button", { name: "Tiếp tục học", exact: true }).click();
  await page.goto("/study/setup");
  await page.getByRole("button", { name: "Bắt đầu học", exact: true }).click();
  await expect(page.locator(".flashcard-word")).toHaveText("hello");
  await page.getByRole("button", { name: "Lật để xem nghĩa" }).press("Space");
  await page.getByRole("button", { name: "Đã nhớ", exact: true }).click();
  await expect.poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "{}").progress?.[1]?.revision, guestKey)).toBe(1);
  await page.goto("/progress"); await page.reload();
  await expect(page.locator(".app-layout")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Đăng nhập", exact: true })).toHaveCount(0);
  await page.goto("/study/setup");
  await expect(page.getByRole("button", { name: "Bắt đầu học", exact: true })).toBeDisabled();
  await page.goto("/register");
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "{}").progress?.[1]?.revision, guestKey)).toBe(1);
  expect(privateWrites).toEqual([]);
});

test("mobile guest notice, keyboard dismissal and account navigation fit the screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await guestApi(page);
  await page.goto("/study/setup");
  const dismiss = page.getByRole("button", { name: "Tiếp tục học", exact: true });
  await page.screenshot({ path: "test-results/guest-mobile-notice.png", fullPage: true });
  await dismiss.focus(); await dismiss.press("Enter");
  await expect(page.getByLabel("Học không cần tài khoản")).toHaveCount(0);
  await page.getByRole("button", { name: "Mở menu tài khoản" }).click();
  await page.getByRole("menuitem", { name: "Cài đặt", exact: true }).click();
  await expect(page).toHaveURL(/learner-settings/);
  await expect(page.getByRole("heading", { name: "Cài đặt học tập" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/guest-mobile.png", fullPage: true });
});

test("failed browser persistence keeps the card and explains how to recover", async ({ page }) => {
  await guestApi(page);
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new DOMException("Quota exceeded", "QuotaExceededError"); }; });
  await page.goto("/study?source=all");
  await page.getByRole("button", { name: "Lật để xem nghĩa" }).click();
  await page.getByRole("button", { name: "Đã nhớ", exact: true }).click();
  await expect(page.getByText("Chưa thể lưu tiến độ trên trình duyệt này.", { exact: true })).toBeVisible();
  await expect(page.locator(".flashcard-word")).toHaveText("hello");
  expect(await page.evaluate((key) => localStorage.getItem(key), guestKey)).toBeNull();
});

test("content failures retry without requiring registration", async ({ page }) => {
  await guestApi(page); let fail = true;
  await page.route("**/api/public/learning-catalog", (route) => route.fulfill(fail ? { status: 503, json: { error: { code: "INTERNAL_ERROR" } } } : { json: catalog }));
  await page.goto("/study?source=all");
  await expect(page.getByRole("button", { name: "Thử lại", exact: true })).toBeVisible();
  fail = false; await page.getByRole("button", { name: "Thử lại", exact: true }).click();
  await expect(page.locator(".flashcard-word")).toHaveText("hello");
});

test("two browser tabs reconcile a stale answer without overwriting progress", async ({ page, context }) => {
  await guestApi(page);
  const other = await context.newPage(); await guestApi(other);
  for (const tab of [page, other]) {
    await tab.goto("/study?source=all");
    await tab.getByRole("button", { name: "Lật để xem nghĩa" }).click();
  }
  await page.getByRole("button", { name: "Đã nhớ", exact: true }).click();
  await expect.poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "{}").progress?.[1]?.revision, guestKey)).toBe(1);
  await other.getByRole("button", { name: "Chưa nhớ", exact: true }).click();
  await expect(other.locator(".flashcard-word")).toHaveCount(0);
  const state = await other.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "{}"), guestKey);
  expect(state.progress[1].revision).toBe(1); expect(state.progress[1].totalIncorrect).toBe(0);
  expect(Object.keys(state.receipts)).toHaveLength(1);
});

test("guest can answer a typing exercise and save its scheduler result", async ({ page }) => {
  await guestApi(page);
  await page.goto("/study/exercises?source=all&type=TYPE_WORD");
  await page.getByLabel("Từ tiếng Anh", { exact: true }).fill("hello");
  await page.getByRole("button", { name: "Gửi câu trả lời", exact: true }).click();
  await expect.poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "{}").progress?.[1]?.revision, guestKey)).toBe(1);
  const result = await page.evaluate((key) => Object.values(JSON.parse(localStorage.getItem(key) ?? "{}").receipts)[0], guestKey);
  expect(result).toMatchObject({ response: { result: "REMEMBERED" }, request: { exerciseSubmission: { type: "TYPE_WORD", answer: "hello" } } });
});
