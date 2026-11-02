import { expect, test, type Page } from "@playwright/test";
import { matchesCefrFilter, type LearnerVocabularyDto } from "@vocabflow/contracts";
import { fishGameHistoryPage, fishGameResults, type FishGameState } from "@vocabflow/learning-domain";
import { createApp } from "../apps/api/src/index";
import { createFishGameService } from "../apps/api/src/fish-game";
import { mockAccount, profile } from "./account-learning-fixture";
const words: LearnerVocabularyDto[] = ["apple", "book", "water"].map((word, i) => ({ id: i + 1, word, vietnamese: word, enabled: true, status: "LEARNING", contentVersion: 1,
  imageUrl: `/fish-media/${i}.png`, audioUrl: null, ipa: null, definitionEn: null, exampleEn: null, level: null, topic: null, nextReviewDate: "2026-11-02" }));
async function setup(page: Page, source = words.map(word => ({ ...word }))) {
  const account = await mockAccount(page); const states = new Map<string, FishGameState>(), created = new Map<string, string>();
  const controls = { failAfterCommit: false, failFinishAfterCommit: false, failMedia: false, writes: 0, payloads: [] as unknown[], finishPayloads: [] as unknown[] };
  const app = createApp({ readSession: async () => ({ user: { id: "account-a" } }), fishGameService: createFishGameService({
    authorize: async (user, learner) => user === "account-a" && learner === profile().id,
    sourceWords: async (_user, _learner, scope) => structuredClone(source.filter(word => (scope.kind !== "set" || (scope.setId === 42 && word.id <= 4)) && (scope.kind !== "saved" || word.id <= 2) && matchesCefrFilter(word.cefr, scope.cefr, word.tags))), currentWords: async (_user, _learner, ids) => structuredClone(source.filter(word => ids.includes(word.id))),
    repository: { history: async (learner, page, recordsPage) => fishGameHistoryPage([...states.values()].filter(state => state.learnerId === learner).map(state => ({ state, createdAt: created.get(state.gameId)! })), page, recordsPage),
      results: async (learner, id, page) => { const state = states.get(id); return state?.learnerId === learner ? fishGameResults({ state, createdAt: created.get(id)! }, page) : null; },
      read: async (_learner, id) => structuredClone(states.get(id) ?? null),
      insert: async state => { if (!states.has(state.gameId)) { states.set(state.gameId, structuredClone(state)); created.set(state.gameId, new Date().toISOString()); controls.writes++; } },
      replace: async (state, revision) => { if (states.get(state.gameId)?.revision !== revision) return false; states.set(state.gameId, structuredClone(state)); controls.writes++; return true; } }
  }) });
  await page.route("**/fish-media/*.png", async route => controls.failMedia ? route.abort() : route.fulfill({ contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aP9sAAAAASUVORK5CYII=", "base64") }));
  await page.route("**/api/learning-sets", async route => route.fulfill({ contentType: "application/json", body: JSON.stringify({ learningSets: [{ id: 42, slug: "game-set", name: "Bộ game", description: "Synthetic game collection", grade: null, enabled: true, sortOrder: 1, vocabularyCount: source.filter(word => word.id <= 4).length }] }) }));
  await page.route("**/api/learners/*/fish-games**", async route => {
    const request = route.request(); const action = request.url().endsWith("/actions");
    if (action) controls.payloads.push(request.postDataJSON());
    if (request.url().endsWith("/finish")) controls.finishPayloads.push(request.postDataJSON());
    const response = await app.request(request.url(), { method: request.method(), headers: { "Content-Type": "application/json" }, body: request.postData() ?? undefined });
    if (action && controls.failAfterCommit) { controls.failAfterCommit = false; return route.fulfill({ status: 503, body: "{}" }); }
    if (request.url().endsWith("/finish") && controls.failFinishAfterCommit) { controls.failFinishAfterCommit = false; return route.fulfill({ status: 503, body: "{}" }); }
    await route.fulfill({ status: response.status, headers: Object.fromEntries(response.headers.entries()), body: await response.text() });
  });
  await page.goto("/game");
  return { account, states, controls, source, question: () => [...states.values()][0]!.current! };
}
test("one correct fish scores ten, five losses end the game with no further fish or learning writes", async ({ page }) => {
  const f = await setup(page); await page.getByRole("button", { name: "Bắt đầu ván", exact: true }).click();
  await expect(page.getByLabel("Từ tiếng Anh", { exact: true })).toBeEnabled();
  await expect(page.getByLabel("Từ tiếng Anh", { exact: true })).toBeFocused();
  const answer = f.question().answer; await page.getByLabel("Từ tiếng Anh", { exact: true }).fill(answer.toUpperCase());
  await page.getByRole("button", { name: "Gửi đáp án", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Bắt được cá!" })).toBeFocused();
  await page.getByRole("button", { name: "Cá tiếp theo", exact: true }).click();
  for (let i = 0; i < 5; i++) {
    await expect(page.getByLabel("Từ tiếng Anh", { exact: true })).toBeEnabled();
    if (i === 0) { await page.getByLabel("Từ tiếng Anh", { exact: true }).fill("wrong"); await page.getByRole("button", { name: "Gửi đáp án", exact: true }).click(); }
    else await page.getByRole("button", { name: i % 2 ? "Xem đáp án · −1 tim" : "Bỏ qua cá · −1 tim", exact: true }).click();
    await page.getByRole("button", { name: i === 4 ? "Xem tổng kết ván" : "Cá tiếp theo", exact: true }).click();
  }
  await expect(page.getByRole("heading", { name: "Ván kết thúc — hết tim" })).toBeVisible();
  await expect(page.getByLabel("Từ tiếng Anh", { exact: true })).toHaveCount(0);
  expect([...f.states.values()][0]).toMatchObject({ score: 10, hearts: 0, current: null, status: "lost" });
  expect(f.controls.writes).toBe(7); expect(f.account.scopedRequests.filter(path => /review|progress|xp/.test(path))).toEqual([]);
  await page.screenshot({ path: ".scratch/practice-game-video-20261101/evidence/08-game-summary.png", fullPage: true });
});
test("an uncertain save preserves typed input and retry cannot double the points", async ({ page }) => {
  const f = await setup(page); await page.getByRole("button", { name: "Bắt đầu ván", exact: true }).click();
  await expect(page.getByLabel("Từ tiếng Anh", { exact: true })).toBeEnabled(); const answer = f.question().answer;
  f.controls.failAfterCommit = true; await page.getByLabel("Từ tiếng Anh", { exact: true }).fill(answer);
  await page.getByRole("button", { name: "Gửi đáp án", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Chưa xác nhận được ván" })).toBeVisible();
  await expect(page.getByLabel("Từ tiếng Anh", { exact: true })).toHaveValue(answer);
  await page.getByRole("button", { name: "Thử lại", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Bắt được cá!" })).toBeVisible();
  expect(f.controls.payloads[0]).toEqual(f.controls.payloads[1]); expect(f.controls.writes).toBe(2);
  expect([...f.states.values()][0]).toMatchObject({ score: 10, hearts: 5 });
});
test("blank input and media recovery cost no hearts; mobile supports keyboard and reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ reducedMotion: "reduce" });
  const f = await setup(page); await page.getByRole("button", { name: "Bắt đầu ván", exact: true }).click();
  await expect(page.getByLabel("Từ tiếng Anh", { exact: true })).toBeEnabled();
  await page.getByLabel("Từ tiếng Anh", { exact: true }).press("Enter");
  await expect(page.getByText("Nhập từ trước khi gửi. Ô trống không mất tim.")).toBeVisible();
  expect(f.controls.writes).toBe(1); expect(await page.locator(".fish-decoration").evaluate(element => getComputedStyle(element).animationName)).toBe("none");
  f.controls.failMedia = true; await page.getByRole("button", { name: "Bỏ qua cá · −1 tim", exact: true }).click();
  await page.getByRole("button", { name: "Cá tiếp theo", exact: true }).click();
  await expect(page.getByText("Không tải được ảnh. Lỗi media không mất tim.")).toBeVisible();
  await page.getByRole("button", { name: "Bỏ qua lỗi ảnh", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Đã bỏ qua lỗi media — giữ nguyên tim" })).toBeVisible();
  expect([...f.states.values()][0]).toMatchObject({ score: 0, hearts: 4 });
  f.controls.failMedia = false; await page.getByRole("button", { name: "Cá tiếp theo", exact: true }).click();
  await expect(page.getByLabel("Từ tiếng Anh", { exact: true })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: ".scratch/practice-game-video-20261101/evidence/08-game-mobile.png", fullPage: true });
});
test("stale content keeps hearts and score and lets the player explicitly prepare a fresh game", async ({ page }) => {
  const f = await setup(page); await page.getByRole("button", { name: "Bắt đầu ván", exact: true }).click();
  await expect(page.getByLabel("Từ tiếng Anh", { exact: true })).toBeEnabled();
  const q = f.question(); f.source.find(word => word.id === q.vocabularyId)!.contentVersion++;
  await page.getByLabel("Từ tiếng Anh", { exact: true }).fill(q.answer);
  await page.getByRole("button", { name: "Gửi đáp án", exact: true }).click();
  await expect(page.getByText("Nội dung hoặc checkpoint không còn tương thích.", { exact: false })).toBeVisible();
  expect([...f.states.values()][0]).toMatchObject({ hearts: 5, score: 0, revision: 0 });
  await page.getByRole("button", { name: "Chuẩn bị ván mới", exact: true }).click();
  await page.getByRole("button", { name: "Bắt đầu ván", exact: true }).click();
  await expect(page.getByLabel("Từ tiếng Anh", { exact: true })).toBeEnabled(); expect(f.states.size).toBe(2);
});
async function audioIO(page: Page) {
  await page.addInitScript(() => {
    const state = window as typeof window & { gameAudioFails?: boolean; gameAudioPlays?: number }; state.gameAudioPlays = 0;
    class ControlledAudio extends EventTarget {
      src = ""; currentTime = 0; preload = "auto"; load() {} pause() {}
      play() { state.gameAudioPlays = (state.gameAudioPlays ?? 0) + 1; if (state.gameAudioFails) return Promise.reject(new Error("controlled audio I/O failure")); this.dispatchEvent(new Event("playing")); return Promise.resolve(); }
    }
    window.Audio = ControlledAudio as unknown as typeof Audio;
  });
}
for (const cue of ["audio", "mixed"] as const) test(`${cue} set game uses learned then new members and cycles only that scope without learning writes`, async ({ page }) => {
  await audioIO(page);
  const source: LearnerVocabularyDto[] = Array.from({ length: 5 }, (_, i) => ({ ...words[i % 3]!, id: i + 1, word: `word${i}`, status: i === 0 || i === 2 ? "LEARNING" : "NEW", audioUrl: `/fish-audio/${i}.mp3`, cefr: "A1" }));
  const f = await setup(page, source);
  await page.getByLabel("Nguồn game", { exact: true }).selectOption("set"); await page.getByLabel("Bộ học", { exact: true }).selectOption("42");
  await page.getByLabel("Gợi ý game", { exact: true }).selectOption(cue); await page.getByRole("button", { name: "Bắt đầu ván", exact: true }).click();
  const seen: number[] = [];
  for (let i = 0; i < 8; i++) {
    await expect(page.getByRole("heading", { name: "Gõ từ tiếng Anh để bắt cá", exact: true })).toBeVisible();
    const q = f.question(); seen.push(q.vocabularyId);
    expect(q.cueKind).toBe(cue === "audio" || i % 2 ? "audio" : "image");
    if (q.cueKind === "audio") {
      await expect(page.getByLabel("Từ tiếng Anh", { exact: true })).toBeDisabled();
      await page.getByRole("button", { name: "Nghe gợi ý", exact: true }).click();
      await page.getByRole("button", { name: "Nghe gợi ý", exact: true }).click();
      await expect(page.locator("img.exercise-image")).toHaveCount(0);
    }
    await expect(page.getByLabel("Từ tiếng Anh", { exact: true })).toBeEnabled();
    await page.getByLabel("Từ tiếng Anh", { exact: true }).fill(q.answer); await page.getByRole("button", { name: "Gửi đáp án", exact: true }).click();
    await page.getByRole("button", { name: "Cá tiếp theo", exact: true }).click();
  }
  expect(new Set(seen.slice(0, 2))).toEqual(new Set([1, 3])); expect(new Set(seen.slice(2, 4))).toEqual(new Set([2, 4]));
  expect(new Set(seen.slice(4, 8)).size).toBe(4); expect(seen).not.toContain(5);
  expect([...f.states.values()][0]).toMatchObject({ score: 80, hearts: 5, config: { source: { kind: "set", setId: 42 }, cue } });
  expect(f.source.filter(word => word.status === "NEW")).toHaveLength(3); expect(f.account.scopedRequests.filter(path => /review|progress|xp/.test(path))).toEqual([]);
});
test("single unlearned audio target can start explicitly; media retry and exhaustion never cost hearts", async ({ page }) => {
  await audioIO(page); const f = await setup(page, [{ ...words[0]!, status: "NEW", cefr: "A1", audioUrl: "/fish-audio/one.mp3" }]);
  await page.getByLabel("Nguồn game", { exact: true }).selectOption("level"); await page.getByLabel("Mức học", { exact: true }).selectOption("A1");
  await page.getByLabel("Gợi ý game", { exact: true }).selectOption("audio"); await page.getByRole("button", { name: "Bắt đầu ván", exact: true }).click();
  await page.evaluate(() => { (window as typeof window & { gameAudioFails: boolean }).gameAudioFails = true; });
  await page.getByRole("button", { name: "Nghe gợi ý", exact: true }).click();
  await expect(page.getByText("Không tải được âm thanh. Lỗi media không mất tim.")).toBeVisible();
  expect(f.controls.writes).toBe(1);
  await page.getByRole("button", { name: "Tải lại âm thanh", exact: true }).click();
  await page.getByRole("button", { name: "Nghe gợi ý", exact: true }).click();
  await page.getByRole("button", { name: "Bỏ qua lỗi âm thanh", exact: true }).click();
  await page.getByRole("button", { name: "Xem trạng thái ván", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Ván tạm dừng vì media", exact: true })).toBeVisible();
  expect([...f.states.values()][0]).toMatchObject({ status: "paused-content", hearts: 5, score: 0, current: null });
  expect(f.source[0]!.status).toBe("NEW");
});
test("two hearts, current fish, typed draft and queue survive reload and explicit pause", async ({ page }) => {
  const f = await setup(page); await page.getByRole("button", { name: "Bắt đầu ván", exact: true }).click();
  for (let i = 0; i < 3; i++) { await expect(page.getByLabel("Từ tiếng Anh", { exact: true })).toBeEnabled(); await page.getByRole("button", { name: "Bỏ qua cá · −1 tim", exact: true }).click(); await page.getByRole("button", { name: "Cá tiếp theo", exact: true }).click(); }
  await page.getByLabel("Từ tiếng Anh", { exact: true }).fill("unfinished draft");
  const before = structuredClone([...f.states.values()][0]!); expect(before.hearts).toBe(2);
  await page.reload(); await page.getByRole("button", { name: "Tiếp tục ván", exact: true }).click();
  await expect(page.getByLabel("Từ tiếng Anh", { exact: true })).toHaveValue("unfinished draft");
  expect([...f.states.values()][0]).toEqual(before); await expect(page.locator(".fish-score")).toContainText("2/5");
  await page.getByRole("button", { name: "Tạm dừng ván", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Có ván trên thiết bị này", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Tiếp tục ván", exact: true }).click(); await expect(page.getByLabel("Từ tiếng Anh", { exact: true })).toHaveValue("unfinished draft");
  expect([...f.states.values()][0]).toEqual(before);
});
test("reload confirms an uncertain correct action once, then lost state never regains hearts and explicit new game starts fresh", async ({ page }) => {
  const f = await setup(page); await page.getByRole("button", { name: "Bắt đầu ván", exact: true }).click();
  await expect(page.getByLabel("Từ tiếng Anh", { exact: true })).toBeEnabled();
  f.controls.failAfterCommit = true; await page.getByLabel("Từ tiếng Anh", { exact: true }).fill(f.question().answer); await page.getByRole("button", { name: "Gửi đáp án", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Chưa xác nhận được ván", exact: true })).toBeVisible();
  await page.reload(); await expect(page.getByRole("button", { name: "Chuẩn bị ván mới", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Tiếp tục ván", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Bắt được cá!", exact: true })).toBeVisible();
  expect(f.controls.payloads[0]).toEqual(f.controls.payloads[1]); expect(f.controls.writes).toBe(2);
  await page.getByRole("button", { name: "Cá tiếp theo", exact: true }).click();
  for (let i = 0; i < 5; i++) { await expect(page.getByLabel("Từ tiếng Anh", { exact: true })).toBeEnabled(); await page.getByRole("button", { name: "Bỏ qua cá · −1 tim", exact: true }).click(); await page.getByRole("button", { name: i === 4 ? "Xem tổng kết ván" : "Cá tiếp theo", exact: true }).click(); }
  const first = structuredClone([...f.states.values()][0]!);
  await page.reload(); await page.getByRole("button", { name: "Tiếp tục ván", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Ván kết thúc — hết tim", exact: true })).toBeVisible(); expect([...f.states.values()][0]).toEqual(first);
  await page.getByRole("button", { name: "Chuẩn bị ván mới", exact: true }).click();
  await page.getByLabel("Nguồn game", { exact: true }).selectOption("saved"); await page.getByRole("button", { name: "Bắt đầu ván", exact: true }).click();
  await expect(page.getByLabel("Từ tiếng Anh", { exact: true })).toBeEnabled();
  expect(f.states.size).toBe(2); expect([...f.states.values()][1]).toMatchObject({ score: 0, hearts: 5, config: { source: { kind: "saved" } } }); expect([...f.states.values()][0]).toEqual(first);
});
test("checkpoint write failure sends no action and retries the same saved answer after recovery", async ({ page }) => {
  const f = await setup(page); await page.getByRole("button", { name: "Bắt đầu ván", exact: true }).click();
  await expect(page.getByLabel("Từ tiếng Anh", { exact: true })).toBeEnabled(); const answer = f.question().answer;
  await page.getByLabel("Từ tiếng Anh", { exact: true }).fill(answer);
  await page.evaluate(() => { const original = Storage.prototype.setItem; (window as typeof window & { restoreGameStorage: () => void }).restoreGameStorage = () => { Storage.prototype.setItem = original; }; Storage.prototype.setItem = function (key, value) { if (key.startsWith("vocabflow.game.resume.v1:")) throw new DOMException("controlled checkpoint failure"); return original.call(this, key, value); }; });
  await page.getByRole("button", { name: "Gửi đáp án", exact: true }).click();
  await expect(page.getByText("Chưa lưu được checkpoint trên thiết bị.", { exact: false })).toBeVisible();
  expect(f.controls.writes).toBe(1); await expect(page.getByLabel("Từ tiếng Anh", { exact: true })).toHaveValue(answer);
  await page.evaluate(() => { (window as typeof window & { restoreGameStorage: () => void }).restoreGameStorage(); });
  await page.getByRole("button", { name: "Thử lại", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Bắt được cá!", exact: true })).toBeVisible(); expect(f.controls.writes).toBe(2);
});
test("audio checkpoint preserves cue and draft while requiring a fresh listen after reload", async ({ page }) => {
  await audioIO(page); const f = await setup(page, words.map(word => ({ ...word, audioUrl: `/fish-audio/${word.id}.mp3` })));
  await page.getByLabel("Gợi ý game", { exact: true }).selectOption("audio"); await page.getByRole("button", { name: "Bắt đầu ván", exact: true }).click();
  await page.getByRole("button", { name: "Nghe gợi ý", exact: true }).click(); await page.getByLabel("Từ tiếng Anh", { exact: true }).fill("draft");
  const before = structuredClone([...f.states.values()][0]!); await page.reload(); await page.getByRole("button", { name: "Tiếp tục ván", exact: true }).click();
  await expect(page.getByLabel("Từ tiếng Anh", { exact: true })).toHaveValue("draft"); await expect(page.getByLabel("Từ tiếng Anh", { exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Nghe gợi ý", exact: true }).click(); await expect(page.getByLabel("Từ tiếng Anh", { exact: true })).toBeEnabled(); expect([...f.states.values()][0]).toEqual(before);
});
test("corrupt checkpoint is preserved until explicit new game, and another account cannot read the draft", async ({ page }) => {
  await setup(page); const key = `vocabflow.game.resume.v1:account-a:${profile().id}`;
  await page.evaluate(key => localStorage.setItem(key, "corrupt-game-pointer"), key); await page.reload();
  await expect(page.getByText("Nội dung hoặc checkpoint không còn tương thích.", { exact: false })).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe("corrupt-game-pointer");
  await page.getByRole("button", { name: "Chuẩn bị ván mới", exact: true }).click(); await page.getByRole("button", { name: "Bắt đầu ván", exact: true }).click();
  await expect(page.getByLabel("Từ tiếng Anh", { exact: true })).toBeEnabled(); await page.getByLabel("Từ tiếng Anh", { exact: true }).fill("private game draft");
  await page.route("**/api/auth/get-session", route => route.fulfill({ contentType: "application/json", body: JSON.stringify({ session: { id: "other-session", userId: "account-b" }, user: { id: "account-b", name: "Other", email: "other@example.invalid" } }) }));
  await page.reload(); await expect(page.getByRole("button", { name: "Bắt đầu ván", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Tiếp tục ván", exact: true })).toHaveCount(0); await expect(page.getByText("private game draft", { exact: true })).toHaveCount(0);
  expect(JSON.parse((await page.evaluate(key => localStorage.getItem(key), key))!).draft.text).toBe("private game draft");
});
test("account history excludes paused records, confirms uncertain finish once and keeps separate cue records", async ({ page }) => {
  await audioIO(page); const f = await setup(page, words.map(word => ({ ...word, audioUrl: `/fish-audio/${word.id}.mp3` })));
  await page.getByRole("button", { name: "Bắt đầu ván", exact: true }).click();
  for (let i = 0; i < 3; i++) {
    await expect(page.getByLabel("Từ tiếng Anh", { exact: true })).toBeEnabled();
    if (i === 2) await page.getByRole("button", { name: "Xem đáp án · −1 tim", exact: true }).click();
    else { await page.getByLabel("Từ tiếng Anh", { exact: true }).fill(i === 0 ? f.question().answer : "wrong"); await page.getByRole("button", { name: "Gửi đáp án", exact: true }).click(); }
    await page.getByRole("button", { name: "Cá tiếp theo", exact: true }).click();
  }
  await page.getByRole("button", { name: "Tạm dừng ván", exact: true }).click(); await page.getByRole("link", { name: "Lịch sử game", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Chưa có kỷ lục trong trang này", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Xem kết quả ván", exact: true }).click(); await expect(page.getByRole("heading", { name: "Các mục đã giải quyết", exact: true })).toBeFocused();
  await expect(page.locator("#game-history-detail")).toContainText("Đã xem đáp án"); await expect(page.locator("#game-history-detail")).toContainText("Bạn gõ: wrong");
  await page.getByRole("link", { name: "Về game", exact: true }).click(); await page.getByRole("button", { name: "Tiếp tục ván", exact: true }).click();
  f.controls.failFinishAfterCommit = true; await page.getByRole("button", { name: "Kết thúc ván và lưu tổng kết", exact: true }).click(); await expect(page.getByRole("heading", { name: "Chưa xác nhận được ván", exact: true })).toBeVisible();
  await page.reload(); await expect(page.getByRole("button", { name: "Chuẩn bị ván mới", exact: true })).toHaveCount(0); await page.getByRole("button", { name: "Tiếp tục ván", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Ván đã kết thúc", exact: true })).toBeVisible(); expect(f.controls.finishPayloads[0]).toEqual(f.controls.finishPayloads[1]); expect(f.controls.writes).toBe(5);
  expect([...f.states.values()][0]).toMatchObject({ score: 10, hearts: 3, status: "ended", current: null });
  await page.getByRole("button", { name: "Chuẩn bị ván mới", exact: true }).click(); await page.getByLabel("Gợi ý game", { exact: true }).selectOption("audio"); await page.getByRole("button", { name: "Bắt đầu ván", exact: true }).click();
  await page.getByRole("button", { name: "Kết thúc ván và lưu tổng kết", exact: true }).click(); await expect(page.getByRole("heading", { name: "Ván đã kết thúc", exact: true })).toBeVisible();
  for (const word of f.source) word.contentVersion++;
  await page.getByRole("link", { name: "Lịch sử game", exact: true }).click(); await expect(page.getByText("2 nhóm · Trang 1", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Xem ván kỷ lục", exact: true }).first().click(); await expect(page.locator("#game-history-detail")).toContainText("Đã xem đáp án");
  await page.screenshot({ path: ".scratch/practice-game-video-20261101/evidence/12-game-history-desktop.png", fullPage: true });
});
