import { expect, test, type Page } from "@playwright/test";

const guestKey = "vocabflow.guest.v1";
const word = { id: 1, word: "hello", vietnamese: "xin chào", ipa: null, definitionEn: null, exampleEn: null, imageUrl: null, audioUrl: null, topic: "Chào hỏi", level: null, enabled: true, contentVersion: 1 };
const catalog = { vocabulary: [word], learningSets: [{ id: 1, slug: "starter", name: "Bắt đầu", description: "Từ cơ bản", grade: null, sortOrder: 0, enabled: true, vocabularyCount: 1, vocabularyIds: [1] }], topics: [] };
async function guestApi(page: Page) {
  await page.route("**/api/auth/get-session", (route) => route.fulfill({ json: null }));
  await page.route("**/api/public/learning-index", (route) => route.fulfill({ json: { ...catalog, vocabulary: catalog.vocabulary.map(({ id, level }) => ({ id, level })) } }));
  await page.route("**/api/public/vocabulary?ids=*", (route) => route.fulfill({ json: { vocabulary: catalog.vocabulary } }));
}
test("guest studies a word without any set, restores progress and keeps it when opening signup", async ({ page }) => {
  await guestApi(page);
  await page.route("**/api/public/learning-index", (route) => route.fulfill({ json: {
    vocabulary: [{ id: word.id, level: null }], learningSets: [], topics: []
  } }));
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
  await page.route("**/api/public/learning-index", (route) => route.fulfill(fail ? { status: 503, json: { error: { code: "INTERNAL_ERROR" } } } : { json: { ...catalog, vocabulary: catalog.vocabulary.map(({ id, level }) => ({ id, level })) } }));
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

test("7,311-word guest Home separates unseen count, daily allowance and selected cards", async ({ page }) => {
  const ids = Array.from({ length: 7311 }, (_, index) => index + 1);
  await guestApi(page);
  await page.addInitScript(({ guestKey }) => {
    const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    const learnerId = "00000000-0000-4000-8000-000000000058";
    const state: { version: number; revision: number; progress: Record<string, unknown>; receipts: Record<string, unknown>; saved: Record<string, string>; assignments: Record<string, boolean>; settings: object } = {
      version: 1, revision: 0, progress: {}, receipts: {}, saved: {}, assignments: {}, settings: { learnerId, dailyNewWordGoal: 100, dailyReviewWordGoal: 20, dailyNewWordLimit: 100 }
    };
    for (let id = 1; id <= 10; id++) {
      const progress = { status: "LEARNING", consecutiveCorrect: 1, intervalDays: 1, firstLearnedDate: date, lastReviewedDate: date, nextReviewDate: "2099-12-31", totalCorrect: 1, totalIncorrect: 0, revision: 1 };
      const reviewId = `00000000-0000-4000-8000-${String(id).padStart(12, "0")}`;
      state.progress[id] = progress;
      state.receipts[reviewId] = { request: { reviewId, learnerId, vocabularyId: id, result: "REMEMBERED", expectedRevision: 0 }, response: { reviewId, learnerId, vocabularyId: id, result: "REMEMBERED", progress }, date, isNew: true };
    }
    localStorage.setItem(guestKey, JSON.stringify(state));
  }, { guestKey });
  await page.route("**/api/public/learning-index", (route) => route.fulfill({ json: {
    vocabulary: ids.map((id) => ({ id, level: null })), learningSets: [{ ...catalog.learningSets[0], vocabularyCount: 6717, vocabularyIds: ids.slice(0, 6717) }], topics: []
  } }));
  const detailBatches: number[][] = [];
  await page.route("**/api/public/vocabulary?ids=*", (route) => {
    const requested = new URL(route.request().url()).searchParams.get("ids")!.split(",").map(Number); detailBatches.push(requested);
    return route.fulfill({ json: { vocabulary: requested.map((id) => ({ ...word, id, word: `word-${id}` })) } });
  });
  const fullCatalogRequests: string[] = [];
  page.on("request", (request) => { if (request.url().includes("/learning-catalog")) fullCatalogRequests.push(request.url()); });
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Từ mới: 7301", exact: true })).toBeVisible();
  await expect(page.locator(".home-hero-copy")).toContainText("90 từ mới");
  expect(fullCatalogRequests).toEqual([]);
  expect(detailBatches.flat()).toHaveLength(10);
  await page.goto("/study/setup?source=all");
  await expect(page.getByRole("button", { name: "Bắt đầu học", exact: true })).toBeEnabled();
  expect(detailBatches.every((batch) => batch.length <= 60)).toBe(true);
  expect(detailBatches.at(-1)).toHaveLength(30);
});

test("Settings remains usable when every public content endpoint is unavailable", async ({ page }) => {
  await page.route("**/api/auth/get-session", (route) => route.fulfill({ json: null }));
  const contentRequests: string[] = [];
  await page.route("**/api/public/**", (route) => { contentRequests.push(route.request().url()); return route.abort(); });
  await page.goto("/learner-settings");
  await page.getByLabel("Từ mới mỗi ngày", { exact: true }).fill("100");
  await page.getByLabel("Giới hạn từ mới scheduler mỗi ngày", { exact: true }).fill("100");
  await page.getByRole("button", { name: "Lưu cài đặt", exact: true }).click();
  await expect.poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "{}").settings?.dailyNewWordLimit, guestKey)).toBe(100);
  expect(contentRequests).toEqual([]);
});

test("guest collection uses bounded pages and search instead of downloading the entire set", async ({ page }) => {
  await guestApi(page);
  const ids = Array.from({ length: 100 }, (_, index) => index + 1);
  await page.route("**/api/public/learning-index", (route) => route.fulfill({ json: {
    vocabulary: ids.map((id) => ({ id, level: null })), learningSets: [{ ...catalog.learningSets[0], vocabularyCount: ids.length, vocabularyIds: ids }], topics: []
  } }));
  const reads: URLSearchParams[] = [];
  await page.route("**/api/public/vocabulary/browse?*", (route) => {
    const params = new URL(route.request().url()).searchParams; reads.push(params);
    const current = Number(params.get("page")) || 1;
    const items = params.has("q") ? [word] : ids.slice((current - 1) * 30, current * 30).map((id) => ({ ...word, id, word: `word-${id}` }));
    return route.fulfill({ json: { vocabulary: items.map(({ definitionEn: _definition, exampleEn: _example, ...card }) => ({ ...card, status: "NEW", nextReviewDate: null })), total: params.has("q") ? 1 : 100, page: current, pageSize: 30, totalPages: params.has("q") ? 1 : 4, filters: { cefrOptions: [], topicOptions: [] } } });
  });
  await page.goto("/learning-sets/1");
  await expect(page.getByTestId("collection-vocabulary-list").locator("li")).toHaveCount(30);
  await page.getByRole("button", { name: "Trang sau", exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.getByTestId("collection-vocabulary-list")).toContainText("word-31");
  await page.getByRole("searchbox", { name: "Tìm từ trong bộ từ" }).fill("hello");
  await expect(page.getByTestId("collection-vocabulary-list").locator("li")).toHaveCount(1);
  expect(reads.every((params) => params.get("learningSetId") === "1" && params.get("pageSize") === "30")).toBe(true);
  expect(reads.at(-1)?.get("q")).toBe("hello");
});
