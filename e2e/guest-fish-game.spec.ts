import { expect, test, type Page } from "@playwright/test";
import type { GuestGameStore } from "../apps/web/src/features/game/guest-game";
import { mockAccount } from "./account-learning-fixture";
const guestId = "00000000-0000-4000-8000-000000000058", guestKey = "vocabflow.guest.v1", gameKey = "vocabflow.game.guest.v1";
const catalog = ["apple", "book", "house", "water", "sun", "moon"].map((word, i) => ({ id: i + 1, word, vietnamese: word, contentVersion: 1,
  imageUrl: `/guest-game-media/${i}.png`, audioUrl: `/guest-game-audio/${i}.mp3`, ipa: null, definitionEn: null, exampleEn: null, enabled: true, topic: null, level: null, cefr: "A1" }));
async function prepare(page: Page) {
  const words = catalog.map(word => ({ ...word })); const requests = { privateWrites: [] as string[] };
  page.on("request", request => { if (request.url().includes("/api/") && ["POST", "PUT", "PATCH", "DELETE"].includes(request.method())) requests.privateWrites.push(request.url()); });
  await page.route("**/api/auth/get-session", route => route.fulfill({ json: null }));
  await page.route("**/api/public/learning-index", route => route.fulfill({ json: { vocabulary: words.map(({ id, level, cefr }) => ({ id, level, cefr })), topics: [], learningSets: [{ id: 42, slug: "game-set", name: "Bộ game", description: "Synthetic game collection", grade: null, enabled: true, sortOrder: 1, vocabularyCount: 6, vocabularyIds: words.map(word => word.id) }] } }));
  await page.route("**/api/public/vocabulary?ids=*", route => { const ids = new URL(route.request().url()).searchParams.get("ids")!.split(",").map(Number); return route.fulfill({ json: { vocabulary: words.filter(word => ids.includes(word.id)) } }); });
  await page.route("**/guest-game-media/*.png", route => route.fulfill({ contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aP9sAAAAASUVORK5CYII=", "base64") }));
  await page.addInitScript(({ guestId, guestKey }) => {
    if (!localStorage.getItem(guestKey)) {
      const progress: Record<string, unknown> = {}; for (let id = 1; id <= 3; id++) progress[id] = { status: "LEARNING", consecutiveCorrect: 1, intervalDays: 1, firstLearnedDate: "2026-10-31", lastReviewedDate: "2026-10-31", nextReviewDate: "2099-12-31", totalCorrect: 1, totalIncorrect: 0, revision: 7 };
      localStorage.setItem(guestKey, JSON.stringify({ version: 1, revision: 9, progress, receipts: {}, saved: Object.fromEntries([1, 2, 4, 5].map(id => [id, "2026-10-31T00:00:00.000Z"])), assignments: {}, settings: { learnerId: guestId, dailyNewWordLimit: 10, dailyNewWordGoal: 10, dailyReviewWordGoal: 20, flashcardDisplayMode: "SELF_RECALL" } }));
    }
    class ControlledAudio extends EventTarget { src = ""; currentTime = 0; preload = "auto"; load() {} pause() {} play() { this.dispatchEvent(new Event("playing")); return Promise.resolve(); } }
    window.Audio = ControlledAudio as unknown as typeof Audio;
  }, { guestId, guestKey });
  await page.goto("/game"); return { requests, words };
}
async function stored(page: Page): Promise<GuestGameStore> { return page.evaluate(key => JSON.parse(localStorage.getItem(key)!), gameKey); }
async function current(page: Page) { await expect(page.getByRole("heading", { name: "Gõ từ tiếng Anh để bắt cá", exact: true })).toBeVisible(); return Object.values((await stored(page)).games).at(-1)!.state.current!; }
async function ready(page: Page) { const q = await current(page); if (q.cueKind === "audio") await page.getByRole("button", { name: "Nghe gợi ý", exact: true }).click(); await expect(page.getByLabel("Từ tiếng Anh", { exact: true })).toBeEnabled(); return q; }
for (const cue of ["image", "audio", "mixed"] as const) test(`guest ${cue} plays scoped learned/new, resumes and loses with unchanged scheduled state`, async ({ page }) => {
  if (cue === "image") await page.setViewportSize({ width: 390, height: 844 });
  const f = await prepare(page); const before = await page.evaluate(key => localStorage.getItem(key), guestKey);
  await page.getByLabel("Nguồn game", { exact: true }).selectOption("set"); await page.getByLabel("Bộ học", { exact: true }).selectOption("42"); await page.getByLabel("Gợi ý game", { exact: true }).selectOption(cue);
  await page.getByRole("button", { name: "Bắt đầu ván", exact: true }).click(); const seen: number[] = [];
  for (let i = 0; i < 6; i++) { const q = await ready(page); seen.push(q.vocabularyId); await page.getByLabel("Từ tiếng Anh", { exact: true }).fill(q.answer); await page.getByRole("button", { name: "Gửi đáp án", exact: true }).click(); await page.getByRole("button", { name: "Cá tiếp theo", exact: true }).click(); }
  expect(new Set(seen.slice(0, 3))).toEqual(new Set([1, 2, 3])); expect(new Set(seen.slice(3, 6))).toEqual(new Set([4, 5, 6]));
  for (let i = 0; i < 3; i++) { await ready(page); await page.getByRole("button", { name: "Bỏ qua cá · −1 tim", exact: true }).click(); await page.getByRole("button", { name: "Cá tiếp theo", exact: true }).click(); }
  const saved = structuredClone(Object.values((await stored(page)).games)[0]!); expect(saved.state.hearts).toBe(2);
  await page.reload(); await page.getByRole("button", { name: "Tiếp tục ván", exact: true }).click(); await ready(page); expect(Object.values((await stored(page)).games)[0]).toEqual(saved);
  for (let i = 0; i < 2; i++) { await ready(page); await page.getByRole("button", { name: "Bỏ qua cá · −1 tim", exact: true }).click(); await page.getByRole("button", { name: i === 1 ? "Xem tổng kết ván" : "Cá tiếp theo", exact: true }).click(); }
  await expect(page.getByRole("heading", { name: "Ván kết thúc — hết tim", exact: true })).toBeVisible();
  expect(Object.values((await stored(page)).games)[0]!.state).toMatchObject({ hearts: 0, score: 60, status: "lost", current: null });
  await page.reload(); await page.getByRole("button", { name: "Tiếp tục ván", exact: true }).click(); await expect(page.getByRole("heading", { name: "Ván kết thúc — hết tim", exact: true })).toBeVisible();
  if (cue === "image") { expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); await page.screenshot({ path: ".scratch/practice-game-video-20261101/evidence/11-guest-game-mobile.png", fullPage: true }); }
  expect(await page.evaluate(key => localStorage.getItem(key), guestKey)).toBe(before); expect(f.requests.privateWrites).toEqual([]);
});
test("failed guest game write retains first fish and retries once without main guest writes", async ({ page }) => {
  const f = await prepare(page); const before = await page.evaluate(key => localStorage.getItem(key), guestKey);
  await page.getByRole("button", { name: "Bắt đầu ván", exact: true }).click(); const q = await ready(page); await page.getByLabel("Từ tiếng Anh", { exact: true }).fill(q.answer);
  await page.evaluate(key => { const original = Storage.prototype.setItem; (window as typeof window & { restoreGuestGame: () => void }).restoreGuestGame = () => { Storage.prototype.setItem = original; }; Storage.prototype.setItem = function (name, value) { if (name === key) throw new DOMException("controlled guest game failure"); return original.call(this, name, value); }; }, gameKey);
  await page.getByRole("button", { name: "Gửi đáp án", exact: true }).click(); await expect(page.getByText("Chưa lưu được ván trên trình duyệt.", { exact: false })).toBeVisible();
  expect(Object.values((await stored(page)).games)[0]!.state).toMatchObject({ score: 0, hearts: 5, revision: 0 });
  await page.evaluate(() => { (window as typeof window & { restoreGuestGame: () => void }).restoreGuestGame(); }); await page.getByRole("button", { name: "Thử lại", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Bắt được cá!", exact: true })).toBeVisible(); expect(Object.values((await stored(page)).games)[0]!.state).toMatchObject({ score: 10, hearts: 5, revision: 1 });
  expect(await page.evaluate(key => localStorage.getItem(key), guestKey)).toBe(before); expect(f.requests.privateWrites).toEqual([]);
});
test("guest refuses missing locks and preserves corrupt game data without fake scores", async ({ page }) => {
  await prepare(page); await page.evaluate(() => Object.defineProperty(navigator, "locks", { configurable: true, value: undefined }));
  await page.getByRole("button", { name: "Bắt đầu ván", exact: true }).click(); await expect(page.getByText("Trình duyệt chưa hỗ trợ lưu an toàn giữa các cửa sổ.", { exact: false })).toBeVisible(); expect(await page.evaluate(key => localStorage.getItem(key), gameKey)).toBeNull();
  await page.reload(); await page.getByRole("button", { name: "Tiếp tục ván", exact: true }).click(); await ready(page);
  const corrupt = await page.evaluate(key => { const store = JSON.parse(localStorage.getItem(key)!); const game = Object.values(store.games)[0] as { state: { score: number } }; game.state.score = 999; const raw = JSON.stringify(store); localStorage.setItem(key, raw); return raw; }, gameKey);
  await page.reload(); await page.getByRole("button", { name: "Tiếp tục ván", exact: true }).click(); await expect(page.getByText("Không đọc được dữ liệu game trên trình duyệt.", { exact: false })).toBeVisible(); expect(await page.evaluate(key => localStorage.getItem(key), gameKey)).toBe(corrupt);
});
test("two guest tabs serialize the first outcome and stale UI reconciles the saved score", async ({ page, context }) => {
  await prepare(page); await page.getByRole("button", { name: "Bắt đầu ván", exact: true }).click(); const q = await ready(page);
  const second = await context.newPage(); await prepare(second); await second.getByRole("button", { name: "Tiếp tục ván", exact: true }).click(); await ready(second);
  await page.getByLabel("Từ tiếng Anh", { exact: true }).fill(q.answer); await page.getByRole("button", { name: "Gửi đáp án", exact: true }).click(); await expect(page.getByRole("heading", { name: "Bắt được cá!", exact: true })).toBeVisible();
  await second.getByLabel("Từ tiếng Anh", { exact: true }).fill("wrong"); await second.getByRole("button", { name: "Gửi đáp án", exact: true }).click(); await expect(second.getByRole("button", { name: "Tải kết quả đã lưu", exact: true })).toBeVisible();
  await second.getByRole("button", { name: "Tải kết quả đã lưu", exact: true }).click(); await expect(second.getByRole("heading", { name: "Bắt được cá!", exact: true })).toBeVisible();
  expect(Object.values((await stored(page)).games)[0]!.state).toMatchObject({ score: 10, hearts: 5, revision: 1 });
});
test("stale guest pins cannot charge hearts, and account entry never imports the guest game", async ({ page }) => {
  const f = await prepare(page); await page.getByRole("button", { name: "Bắt đầu ván", exact: true }).click(); const q = await ready(page); f.words.find(word => word.id === q.vocabularyId)!.contentVersion++;
  const before = await page.evaluate(key => localStorage.getItem(key), gameKey); await page.reload(); await page.getByRole("button", { name: "Tiếp tục ván", exact: true }).click(); await expect(page.getByText("Nội dung hoặc checkpoint không còn tương thích.", { exact: false })).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), gameKey)).toBe(before); expect(f.requests.privateWrites).toEqual([]);
  await mockAccount(page); await page.goto("/game"); await expect(page.getByRole("button", { name: "Bắt đầu ván", exact: true })).toBeVisible(); await expect(page.getByRole("button", { name: "Tiếp tục ván", exact: true })).toHaveCount(0);
  expect(await page.evaluate(key => localStorage.getItem(key), gameKey)).toBe(before);
});
test("guest history records only finalized games, preserves outcomes and safely retries failed finalization", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); const f = await prepare(page); const mainBefore = await page.evaluate(key => localStorage.getItem(key), guestKey);
  await page.getByRole("button", { name: "Bắt đầu ván", exact: true }).click();
  const q = await ready(page); await page.getByLabel("Từ tiếng Anh", { exact: true }).fill(q.answer); await page.getByRole("button", { name: "Gửi đáp án", exact: true }).click(); await page.getByRole("button", { name: "Cá tiếp theo", exact: true }).click();
  await ready(page); await page.getByRole("button", { name: "Xem đáp án · −1 tim", exact: true }).click(); await page.getByRole("button", { name: "Cá tiếp theo", exact: true }).click();
  await page.getByRole("button", { name: "Tạm dừng ván", exact: true }).click(); await page.getByRole("link", { name: "Lịch sử game", exact: true }).click(); await expect(page.getByRole("heading", { name: "Chưa có kỷ lục trong trang này", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Về game", exact: true }).click(); await page.getByRole("button", { name: "Tiếp tục ván", exact: true }).click();
  await page.evaluate(key => { const original = Storage.prototype.setItem; (window as typeof window & { restoreFinish: () => void }).restoreFinish = () => { Storage.prototype.setItem = original; }; Storage.prototype.setItem = function (name, value) { if (name === key) throw new DOMException("controlled finish failure"); return original.call(this, name, value); }; }, gameKey);
  await page.getByRole("button", { name: "Kết thúc ván và lưu tổng kết", exact: true }).click(); await expect(page.getByText("Chưa lưu được ván trên trình duyệt.", { exact: false })).toBeVisible();
  expect(Object.values((await stored(page)).games)[0]!.state.status).toBe("active");
  await page.evaluate(() => { (window as typeof window & { restoreFinish: () => void }).restoreFinish(); }); await page.getByRole("button", { name: "Thử lại", exact: true }).click(); await expect(page.getByRole("heading", { name: "Ván đã kết thúc", exact: true })).toBeVisible();
  const ended = structuredClone(Object.values((await stored(page)).games)[0]!); expect(ended.state).toMatchObject({ status: "ended", hearts: 4, score: 10, revision: 3 });
  await page.reload(); await page.getByRole("button", { name: "Tiếp tục ván", exact: true }).click(); await expect(page.getByRole("heading", { name: "Ván đã kết thúc", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Lịch sử game", exact: true }).click(); await expect(page.getByText("1 nhóm · Trang 1", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Xem kết quả ván", exact: true }).click(); await expect(page.locator("#game-history-detail")).toContainText("Đã xem đáp án");
  expect(Object.values((await stored(page)).games)[0]).toEqual(ended); expect(await page.evaluate(key => localStorage.getItem(key), guestKey)).toBe(mainBefore); expect(f.requests.privateWrites).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); await page.screenshot({ path: ".scratch/practice-game-video-20261101/evidence/12-game-history-mobile.png", fullPage: true });
});
