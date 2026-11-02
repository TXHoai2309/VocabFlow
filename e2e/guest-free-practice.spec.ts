import { expect, test, type Page } from "@playwright/test";
import type { GuestPracticeStore } from "../apps/web/src/features/practice/guest-practice";

const guestId = "00000000-0000-4000-8000-000000000058";
const guestKey = "vocabflow.guest.v1";
const practiceKey = "vocabflow.practice.guest.v1";
const words = ["apple", "book", "house", "water", "sun", "moon"].map((word, i) => ({
  id: i + 1, word, vietnamese: ["quả táo", "quyển sách", "ngôi nhà", "nước", "mặt trời", "mặt trăng"][i]!,
  contentVersion: 1, imageUrl: `/practice-media/${i}.png`, audioUrl: `/practice-audio/${i}.mp3`, ipa: null,
  definitionEn: null, exampleEn: null, enabled: true, topic: null, level: null, cefr: "A1"
}));
async function prepare(page: Page, learned = true) {
  await page.route("**/api/auth/get-session", route => route.fulfill({ json: null }));
  const requests = { privateWrites: [] as string[], detailIds: [] as number[][] };
  page.on("request", request => { if (request.url().includes("/api/") && ["POST", "PUT", "PATCH", "DELETE"].includes(request.method())) requests.privateWrites.push(request.url()); });
  await page.route("**/api/public/learning-index", route => route.fulfill({ json: {
    vocabulary: words.map(({ id, level, cefr }) => ({ id, level, cefr })), topics: [],
    learningSets: [{ id: 42, slug: "six-words", name: "Bộ sáu từ", description: "Synthetic test collection", grade: null, enabled: true, sortOrder: 1, vocabularyCount: 6, vocabularyIds: [1, 2, 3, 4, 5, 6] }]
  } }));
  await page.route("**/api/public/vocabulary?ids=*", route => {
    const ids = new URL(route.request().url()).searchParams.get("ids")!.split(",").map(Number);
    requests.detailIds.push(ids);
    return route.fulfill({ json: { vocabulary: words.filter(word => ids.includes(word.id)) } });
  });
  await page.route("**/practice-media/*.png", route => route.fulfill({ contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aP9sAAAAASUVORK5CYII=", "base64") }));
  await page.addInitScript(({ guestId, guestKey, learned }) => {
    if (!localStorage.getItem(guestKey)) {
      const progress: Record<string, unknown> = {};
      if (learned) for (let id = 1; id <= 6; id++) progress[id] = { status: "LEARNING", consecutiveCorrect: 1, intervalDays: 1,
        firstLearnedDate: "2026-10-31", lastReviewedDate: "2026-10-31", nextReviewDate: "2099-12-31", totalCorrect: 1, totalIncorrect: 0, revision: 7 };
      localStorage.setItem(guestKey, JSON.stringify({ version: 1, revision: 9, progress, receipts: {},
        saved: Object.fromEntries([1, 2, 3, 4].map(id => [id, "2026-10-31T00:00:00.000Z"])), assignments: {},
        settings: { learnerId: guestId, dailyNewWordLimit: 10, dailyNewWordGoal: 10, dailyReviewWordGoal: 20, flashcardDisplayMode: "SELF_RECALL" } }));
    }
    class ControlledAudio extends EventTarget {
      src = ""; currentTime = 0; preload = "auto";
      load() {} pause() {}
      play() { this.dispatchEvent(new Event("playing")); return Promise.resolve(); }
    }
    window.Audio = ControlledAudio as unknown as typeof Audio;
  }, { guestId, guestKey, learned });
  await page.goto("/practice");
  return requests;
}
async function stored(page: Page): Promise<GuestPracticeStore> {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)!), practiceKey);
}
async function question(page: Page) {
  await expect(page.locator(".exercise-option, .exercise-typing-input").first()).toBeVisible();
  const state = Object.values((await stored(page)).sessions).at(-1)!.state;
  return state.questions[state.results.length]!;
}
for (const cue of ["image", "audio", "mixed"] as const) for (const responseMode of ["choice", "type"] as const) {
  test(`guest ${cue}/${responseMode} completes locally while scheduled learning remains byte-identical`, async ({ page }) => {
    const requests = await prepare(page);
    const before = await page.evaluate(key => localStorage.getItem(key), guestKey);
    await page.getByLabel("Gợi ý", { exact: true }).selectOption(cue);
    await page.getByLabel("Cách trả lời").selectOption(responseMode);
    await page.getByRole("button", { name: "5 câu", exact: true }).click();
    await page.getByRole("button", { name: "Bắt đầu luyện" }).click();
    for (let i = 0; i < 5; i++) {
      await expect(page.getByText("5 câu thực có / yêu cầu 5")).toBeVisible();
      const q = await question(page);
      if (q.cueKind === "audio") await page.getByRole("button", { name: "Nghe gợi ý", exact: true }).click();
      if (responseMode === "type") { const input = page.getByRole("textbox", { name: "Từ tiếng Anh", exact: true }); await input.fill(q.answer.toUpperCase()); await input.press("Enter"); }
      else await page.getByRole("button", { name: q.answer, exact: true }).click();
      await page.getByRole("button", { name: /Câu tiếp theo|Xem tổng kết/ }).click();
    }
    await expect(page.getByRole("heading", { name: "Hoàn tất buổi luyện" })).toBeVisible();
    await expect(page.getByText("Kết quả đã lưu trên trình duyệt này.", { exact: false })).toBeVisible();
    expect(await page.evaluate(key => localStorage.getItem(key), guestKey)).toBe(before);
    expect(requests.privateWrites).toEqual([]);
    const state = Object.values((await stored(page)).sessions)[0]!.state;
    expect(state.results).toHaveLength(5); expect(state.revision).toBe(5);
    expect(new Set(state.questions.map(q => q.vocabularyId)).size).toBe(5);
    expect(requests.detailIds.every(ids => ids.length <= 60 && ids.every(id => id <= 6))).toBe(true);
  });
}
test("guest uses saved scope explicitly when learned source is empty; no account data is borrowed", async ({ page }) => {
  const requests = await prepare(page, false);
  await page.getByRole("button", { name: "Bắt đầu luyện" }).click();
  await expect(page.getByRole("heading", { name: "Chưa có từ đã học" })).toBeVisible();
  expect(requests.detailIds).toEqual([]);
  await page.getByLabel("Nguồn luyện", { exact: true }).selectOption("saved");
  await page.getByRole("button", { name: "Bắt đầu luyện" }).click();
  await expect(page.getByText("4 câu thực có / yêu cầu 10")).toBeVisible();
  expect(Object.values((await stored(page)).sessions)[0]!.state.questions.map(q => q.vocabularyId).sort()).toEqual([1, 2, 3, 4]);
  expect(requests.privateWrites).toEqual([]);
});
test("guest reload retains typed draft and confirmed cursor without replaying a result", async ({ page }) => {
  const requests = await prepare(page);
  await page.getByLabel("Cách trả lời").selectOption("type");
  await page.getByRole("button", { name: "Bắt đầu luyện" }).click();
  const input = page.getByRole("textbox", { name: "Từ tiếng Anh", exact: true });
  await input.fill("MY DRAFT");
  const id = (await question(page)).questionId;
  await page.reload(); await page.getByRole("button", { name: "Tiếp tục buổi luyện" }).click();
  await expect(input).toHaveValue("MY DRAFT"); expect((await question(page)).questionId).toBe(id);
  await input.fill((await question(page)).answer); await input.press("Enter");
  await page.getByRole("button", { name: "Câu tiếp theo" }).click();
  const nextId = (await question(page)).questionId;
  await page.reload(); await page.getByRole("button", { name: "Tiếp tục buổi luyện" }).click();
  await expect(input).toBeVisible(); expect((await question(page)).questionId).toBe(nextId);
  expect(Object.values((await stored(page)).sessions)[0]!.state.results).toHaveLength(1);
  expect(requests.privateWrites).toEqual([]);
});
test("guest result persistence failure keeps the question and retries without touching scheduled state", async ({ page }) => {
  await prepare(page);
  await page.getByRole("button", { name: "Bắt đầu luyện" }).click();
  const before = await page.evaluate(key => localStorage.getItem(key), guestKey);
  await page.evaluate(key => {
    const original = Storage.prototype.setItem;
    (window as typeof window & { restoreGuestPracticeStorage: () => void }).restoreGuestPracticeStorage = () => { Storage.prototype.setItem = original; };
    Storage.prototype.setItem = function (name, value) { if (name === key) throw new DOMException("controlled guest result I/O failure"); return original.call(this, name, value); };
  }, practiceKey);
  await page.getByRole("button", { name: (await question(page)).answer, exact: true }).click();
  await expect(page.getByRole("heading", { name: "Chưa lưu được" })).toBeVisible();
  expect(Object.values((await stored(page)).sessions)[0]!.state.results).toHaveLength(0);
  await page.evaluate(() => { (window as typeof window & { restoreGuestPracticeStorage: () => void }).restoreGuestPracticeStorage(); });
  await page.getByRole("button", { name: "Thử lại", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Đúng", exact: true })).toBeVisible();
  expect(Object.values((await stored(page)).sessions)[0]!.state.results).toHaveLength(1);
  expect(await page.evaluate(key => localStorage.getItem(key), guestKey)).toBe(before);
});
test("guest refuses writes without Web Locks and preserves corrupt practice history", async ({ page }) => {
  await prepare(page);
  await page.evaluate(() => { Object.defineProperty(navigator, "locks", { configurable: true, value: undefined }); });
  await page.getByRole("button", { name: "Bắt đầu luyện" }).click();
  await expect(page.getByText("Trình duyệt chưa hỗ trợ lưu an toàn giữa các cửa sổ.", { exact: false })).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), practiceKey)).toBeNull();
  await page.reload();
  await page.getByRole("button", { name: "Tiếp tục buổi luyện" }).click();
  await expect(page.locator(".exercise-option").first()).toBeEnabled();
  await page.getByRole("button", { name: "Bỏ qua câu", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Bỏ qua chủ động", exact: true })).toBeVisible();
  const corrupt = '{"version":99,"sessions":{}}';
  await page.evaluate(({ key, corrupt }) => localStorage.setItem(key, corrupt), { key: practiceKey, corrupt });
  await page.reload(); await page.getByRole("button", { name: "Tiếp tục buổi luyện" }).click();
  await expect(page.getByText("Dữ liệu luyện trên trình duyệt không đọc được.", { exact: false })).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), practiceKey)).toBe(corrupt);
});
test("two guest tabs serialize one first outcome and reconcile the stale window", async ({ page, context }) => {
  await prepare(page);
  await page.getByRole("button", { name: "Bắt đầu luyện" }).click();
  const other = await context.newPage(); await prepare(other);
  await other.getByRole("button", { name: "Tiếp tục buổi luyện" }).click();
  const q = await question(page);
  const wrong = q.options.find(option => option.label !== q.answer)!.label;
  await Promise.all([page.getByRole("button", { name: q.answer, exact: true }).click(), other.getByRole("button", { name: wrong, exact: true }).click()]);
  await expect.poll(async () => Object.values((await stored(page)).sessions)[0]!.state.results.length).toBe(1);
  await expect.poll(async () => await page.getByRole("button", { name: "Tải kết quả đã lưu" }).count() + await other.getByRole("button", { name: "Tải kết quả đã lưu" }).count()).toBe(1);
  const stale = await page.getByRole("button", { name: "Tải kết quả đã lưu" }).count() ? page : other;
  await expect(stale.getByRole("heading", { name: "Buổi luyện đã cập nhật ở cửa sổ khác" })).toBeVisible();
  await stale.getByRole("button", { name: "Tải kết quả đã lưu" }).click();
  await expect(stale.getByText("Đã lưu kết quả.")).toBeVisible();
  expect(Object.values((await stored(page)).sessions)[0]!.state.revision).toBe(1);
});
test("guest practice is retained separately and never imported when an account opens", async ({ page }) => {
  const requests = await prepare(page);
  await page.getByRole("button", { name: "Bắt đầu luyện" }).click();
  await page.getByRole("button", { name: (await question(page)).answer, exact: true }).click();
  await expect(page.getByText("Đã lưu kết quả.")).toBeVisible();
  const before = await page.evaluate(key => localStorage.getItem(key), practiceKey);
  const profile = { id: "00000000-0000-4000-8000-000000000010", householdId: "00000000-0000-4000-8000-000000000001", displayName: "Account", avatarKey: null, enabled: true, createdAt: "2026-10-31T00:00:00.000Z", updatedAt: "2026-10-31T00:00:00.000Z" };
  await page.route("**/api/auth/get-session", route => route.fulfill({ json: { session: { id: "account-session", userId: "account-a" }, user: { id: "account-a", name: "Account", email: "account@example.invalid" } } }));
  await page.route("**/api/learners", route => route.fulfill({ json: { learners: [profile] } }));
  await page.reload();
  await expect(page.getByRole("button", { name: "Bắt đầu luyện" })).toBeVisible();
  expect(await page.getByRole("button", { name: "Tiếp tục buổi luyện" }).count()).toBe(0);
  expect(await page.evaluate(key => localStorage.getItem(key), practiceKey)).toBe(before);
  expect(requests.privateWrites).toEqual([]);
});
test("guest history and selected wrong retry survive failed storage without modifying first outcomes", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const requests = await prepare(page);
  const before = await page.evaluate(key => localStorage.getItem(key), guestKey);
  await page.getByRole("button", { name: "5 câu", exact: true }).click();
  await page.getByRole("button", { name: "Bắt đầu luyện" }).click();
  let wrongWord = "";
  for (let i = 0; i < 5; i++) {
    const q = await question(page);
    if (i === 0) { wrongWord = q.answer; await page.getByRole("button", { name: q.options.find(option => option.label !== q.answer)!.label, exact: true }).click(); }
    else await page.getByRole("button", { name: q.answer, exact: true }).click();
    await page.getByRole("button", { name: /Câu tiếp theo|Xem tổng kết/ }).click();
  }
  const original = structuredClone(Object.values((await stored(page)).sessions)[0]!);
  const detailCalls = requests.detailIds.length;
  await page.getByRole("link", { name: "Lịch sử luyện", exact: true }).click();
  await page.getByRole("button", { name: "Xem buổi luyện", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: wrongWord, exact: true })).toBeChecked();
  expect(requests.detailIds).toHaveLength(detailCalls);
  await page.evaluate(key => {
    const original = Storage.prototype.setItem;
    (window as typeof window & { restoreRetryStorage: () => void }).restoreRetryStorage = () => { Storage.prototype.setItem = original; };
    Storage.prototype.setItem = function (name, value) { if (name === key) throw new DOMException("controlled retry storage failure"); return original.call(this, name, value); };
  }, practiceKey);
  await page.getByRole("button", { name: "Luyện lại câu đã chọn" }).click();
  await expect(page.getByText("Chưa tạo hoặc xác nhận được lượt luyện lại.", { exact: false })).toBeVisible();
  expect(Object.values((await stored(page)).sessions)).toHaveLength(1);
  await page.evaluate(() => { (window as typeof window & { restoreRetryStorage: () => void }).restoreRetryStorage(); });
  await page.getByRole("button", { name: "Thử lại lượt luyện đã chọn" }).click();
  await expect(page.locator(".exercise-option").first()).toBeEnabled();
  await page.getByRole("button", { name: wrongWord, exact: true }).click();
  await page.getByRole("button", { name: "Xem tổng kết" }).click();
  await page.getByRole("link", { name: "Lịch sử luyện", exact: true }).click();
  await expect(page.getByText("Lượt luyện lại", { exact: false })).toBeVisible();
  await expect(page.getByText("Chưa có từ cần luyện thêm trong trang này.")).toBeVisible();
  expect((await stored(page)).sessions[original.state.sessionId]).toEqual(original);
  expect(await page.evaluate(key => localStorage.getItem(key), guestKey)).toBe(before);
  expect(requests.privateWrites).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: ".scratch/practice-game-video-20261101/evidence/07-history-mobile.png", fullPage: true });
});
