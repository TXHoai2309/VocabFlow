import { expect, test, type Page } from "@playwright/test";
import { matchesCefrFilter, type LearnerVocabularyDto, type PracticeSource } from "@vocabflow/contracts";
import { practiceHistoryPage, practiceResults, type PracticeState } from "@vocabflow/learning-domain";
import { createApp } from "../apps/api/src/index";
import { createPracticeService } from "../apps/api/src/practice";
import { mockAccount, profile } from "./account-learning-fixture";

const words: LearnerVocabularyDto[] = ["apple", "book", "house", "water", "sun", "moon"].map((word, i) => ({
  id: i + 1, word, vietnamese: ["quả táo", "quyển sách", "ngôi nhà", "nước", "mặt trời", "mặt trăng"][i]!,
  contentVersion: 1, status: "LEARNING", cefr: "A1", imageUrl: `/practice-media/${i}.png`, audioUrl: null, ipa: null,
  definitionEn: null, exampleEn: null, enabled: true, topic: null, level: null, nextReviewDate: "2026-11-02"
}));
async function setup(page: Page, source = words) {
  const account = await mockAccount(page);
  const stored = new Map<string, PracticeState>();
  const created = new Map<string, string>();
  const controls = { accountUser: "account-a", failRetryAfterCommit: false, failSaveAfterCommit: false, failCreation: false, failMedia: false, writes: 0, pendingPayloads: [] as unknown[], sourceReads: [] as PracticeSource[] };
  const app = createApp({ readSession: async () => ({ user: { id: controls.accountUser } }),
    practiceService: createPracticeService({ authorize: async (user, learner) => user === "account-a" && learner === profile().id,
      currentWords: async (_user, _learner, ids) => structuredClone(source.filter(word => word.enabled && ids.includes(word.id))),
      sourceWords: async (_user, _learner, scope) => {
        controls.sourceReads.push(scope);
        // Storage I/O boundary; real SQL scope selection has its own rollback rehearsal.
        return structuredClone(source.filter(word => (scope.kind !== "learned" || word.status !== "NEW")
          && (scope.kind !== "saved" || word.id <= 4) && (scope.kind !== "set" || scope.setId === 42)
          && matchesCefrFilter(word.cefr, scope.cefr, word.tags)));
      }, repository: {
        history: async (learner, page, needsPage) => practiceHistoryPage([...stored.values()].filter(state => state.learnerId === learner).map(state => ({ state, createdAt: created.get(`${learner}:${state.sessionId}`)! })), page, needsPage),
        results: async (learner, session) => { const state = stored.get(`${learner}:${session}`); return state ? practiceResults({ state, createdAt: created.get(`${learner}:${session}`)! }) : null; },
        read: async (learner, session) => structuredClone(stored.get(`${learner}:${session}`) ?? null),
        insert: async state => { const key = `${state.learnerId}:${state.sessionId}`; if (!stored.has(key)) { stored.set(key, structuredClone(state)); created.set(key, new Date().toISOString()); controls.writes++; } },
        replace: async (state, revision) => { const key = `${state.learnerId}:${state.sessionId}`; if (stored.get(key)?.revision !== revision) return false; stored.set(key, structuredClone(state)); controls.writes++; return true; }
      }
    }) });
  await page.route("**/practice-media/*.png", async route => {
    if (controls.failMedia) return route.abort();
    await route.fulfill({ contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aP9sAAAAASUVORK5CYII=", "base64") });
  });
  await page.route("**/api/learning-sets", async route => route.fulfill({ contentType: "application/json", body: JSON.stringify({ learningSets: [{
    id: 42, slug: "six-words", name: "Bộ sáu từ", description: "Synthetic test collection", grade: null, enabled: true, sortOrder: 1, vocabularyCount: 6
  }] }) }));
  await page.route("**/api/learners/*/practice-sessions**", async route => {
    const request = route.request();
    if (!request.url().endsWith("/actions") && controls.failCreation) {
      controls.failCreation = false; return route.fulfill({ status: 503, body: "{}" });
    }
    const isAction = request.url().endsWith("/actions");
    if (isAction) controls.pendingPayloads.push(request.postDataJSON());
    const response = await app.request(request.url(), { method: request.method(), headers: { "Content-Type": "application/json" }, body: request.postData() ?? undefined });
    if (request.url().endsWith("/retry") && controls.failRetryAfterCommit) { controls.failRetryAfterCommit = false; return route.fulfill({ status: 503, body: "{}" }); }
    if (isAction && controls.failSaveAfterCommit) { controls.failSaveAfterCommit = false; return route.fulfill({ status: 503, body: "{}" }); }
    await route.fulfill({ status: response.status, headers: Object.fromEntries(response.headers.entries()), body: await response.text() });
  });
  await page.goto("/practice");
  return { account, controls, stored, source, question: () => { const state = [...stored.values()][0]!; return state.questions[state.results.length]!; } };
}
test("account image practice completes through the authoritative API and saved summary", async ({ page }) => {
  const f = await setup(page);
  await page.getByRole("button", { name: "Bắt đầu luyện" }).click();
  await expect(page.getByText("6 câu thực có / yêu cầu 10")).toBeVisible();
  await expect(page.getByRole("img")).toHaveAttribute("alt", "Hình minh họa cho câu luyện");
  const outcomes = ["correct", "incorrect", "reveal", "skip", "correct", "correct"];
  for (const outcome of outcomes) {
    await expect(page.getByRole("heading", { name: "Chọn từ tiếng Anh phù hợp với ảnh" })).toBeFocused();
    const q = f.question();
    if (outcome === "reveal") await page.getByRole("button", { name: "Xem đáp án", exact: true }).click();
    else if (outcome === "skip") await page.getByRole("button", { name: "Bỏ qua câu", exact: true }).click();
    else {
      const label = outcome === "correct" ? q.answer : q.options.find(o => o.optionId !== q.correctOptionId)!.label;
      await page.getByRole("button", { name: label, exact: true }).click();
    }
    await expect(page.getByText("Đã lưu kết quả.")).toBeVisible();
    await page.getByRole("button", { name: /Câu tiếp theo|Xem tổng kết/ }).click();
  }
  await expect(page.getByRole("heading", { name: "Hoàn tất buổi luyện" })).toBeVisible();
  await expect(page.getByText("75%", { exact: true })).toBeVisible();
  expect(f.controls.writes).toBe(7);
  expect(f.account.scopedRequests.some(path => path === "/api/reviews")).toBe(false);
});
test("uncertain action save keeps the question and retries exact action once", async ({ page }) => {
  const f = await setup(page);
  await page.getByRole("button", { name: "Bắt đầu luyện" }).click();
  const q = f.question();
  f.controls.failSaveAfterCommit = true;
  await page.getByRole("button", { name: q.answer, exact: true }).click();
  await expect(page.getByRole("heading", { name: "Chưa lưu được" })).toBeVisible();
  await expect(page.getByRole("button", { name: q.answer, exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Thử lại", exact: true }).click();
  await expect(page.getByText("Đã lưu kết quả.")).toBeVisible();
  expect(f.controls.pendingPayloads[0]).toEqual(f.controls.pendingPayloads[1]);
  expect(f.controls.writes).toBe(2);
  await page.getByRole("button", { name: "Câu tiếp theo" }).click();
  await expect(page.getByText("Đã lưu 1/6", { exact: false })).toBeVisible();
});
test("media failure has retry and technical skip without an incorrect outcome, mobile keyboard", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const f = await setup(page); f.controls.failMedia = true;
  await page.getByRole("button", { name: "Bắt đầu luyện" }).click();
  await expect(page.getByRole("button", { name: "Bỏ qua lỗi ảnh" })).toBeVisible();
  expect(await page.locator(".exercise-option:enabled").count()).toBe(0);
  await page.getByRole("button", { name: "Bỏ qua lỗi ảnh" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Bỏ qua vì lỗi media" })).toBeVisible();
  expect([...f.stored.values()][0]!.results[0]!.outcome).toBe("technical");
  f.controls.failMedia = false;
  await page.getByRole("button", { name: "Câu tiếp theo" }).click();
  await expect(page.locator(".exercise-option").first()).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: ".scratch/practice-game-video-20261101/evidence/01-mobile.png", fullPage: true });
});
test("empty sources explain the missing learned content and never persist a session", async ({ page }) => {
  const f = await setup(page, []);
  await page.getByRole("button", { name: "Bắt đầu luyện" }).click();
  await expect(page.getByRole("heading", { name: "Chưa có từ đã học" })).toBeVisible();
  expect(f.controls.writes).toBe(0);
});
test("creation failure retries safely and desktop media presents without overflow", async ({ page }) => {
  const f = await setup(page); f.controls.failCreation = true;
  await page.getByRole("button", { name: "Bắt đầu luyện" }).click();
  await expect(page.getByRole("heading", { name: "Chưa lưu được" })).toBeVisible();
  await page.getByRole("button", { name: "Thử lại", exact: true }).click();
  await expect(page.locator(".exercise-option").first()).toBeEnabled();
  expect(f.controls.writes).toBe(1);
  await page.screenshot({ path: ".scratch/practice-game-video-20261101/evidence/01-desktop.png", fullPage: true });
});
test("explicit six-word set requesting ten stays in that set and persists source/count", async ({ page }) => {
  const f = await setup(page);
  await page.getByLabel("Nguồn luyện", { exact: true }).selectOption("set");
  await page.getByLabel("Bộ học", { exact: true }).selectOption("42");
  await page.getByRole("button", { name: "Bắt đầu luyện" }).click();
  await expect(page.getByText("6 câu thực có / yêu cầu 10")).toBeVisible();
  await expect(page.getByText("Bộ sáu từ · Ảnh", { exact: true })).toBeVisible();
  expect([...f.stored.values()][0]!.config).toMatchObject({ count: 10, source: { kind: "set", setId: 42 }, cue: "image", responseMode: "choice" });
  expect(f.controls.sourceReads).toEqual([{ kind: "set", setId: 42 }]);
});
test("saved source and incompatible level return an honest empty intersection", async ({ page }) => {
  const f = await setup(page);
  await page.getByLabel("Nguồn luyện", { exact: true }).selectOption("saved");
  await page.getByLabel("Lọc thêm theo mức học").selectOption("C2");
  await page.getByRole("button", { name: "Bắt đầu luyện" }).click();
  await expect(page.getByRole("heading", { name: "Nguồn đã chọn chưa có từ phù hợp" })).toBeVisible();
  expect(f.controls.writes).toBe(0);
  await page.getByLabel("Lọc thêm theo mức học").selectOption("");
  await page.getByRole("button", { name: "20 câu", exact: true }).click();
  await page.getByRole("button", { name: "Bắt đầu luyện" }).click();
  await expect(page.getByText("4 câu thực có / yêu cầu 20")).toBeVisible();
  expect([...f.stored.values()][0]!.questions.map(q => q.vocabularyId).sort()).toEqual([1, 2, 3, 4]);
});
test("no learned words keeps setup available and requires explicit alternative level", async ({ page }) => {
  const f = await setup(page, words.map(word => ({ ...word, status: "NEW" })));
  await page.getByRole("button", { name: "Bắt đầu luyện" }).click();
  await expect(page.getByRole("heading", { name: "Chưa có từ đã học" })).toBeVisible();
  expect(f.controls.writes).toBe(0);
  await page.getByLabel("Nguồn luyện", { exact: true }).selectOption("level");
  await expect(page.getByRole("button", { name: "Bắt đầu luyện" })).toBeDisabled();
  await page.getByLabel("Mức học", { exact: true }).selectOption("A1");
  await page.getByRole("button", { name: "5 câu", exact: true }).click();
  await page.getByRole("button", { name: "Bắt đầu luyện" }).click();
  await expect(page.getByText("5 câu thực có / yêu cầu 5")).toBeVisible();
  expect([...f.stored.values()][0]!.config.source).toEqual({ kind: "level", cefr: "A1" });
});
async function audioIO(page: Page) {
  await page.addInitScript(() => {
    const state = window as typeof window & { practiceAudioFails?: boolean; practiceAudioPlays?: number };
    state.practiceAudioPlays = 0;
    // Replace the media I/O object, including src assignment; patching play()
    // alone would still start a real network request and a later error event.
    class ControlledAudio extends EventTarget {
      src = ""; currentTime = 0; preload = "auto";
      load() {}
      pause() {}
      play() {
        state.practiceAudioPlays = (state.practiceAudioPlays ?? 0) + 1;
        if (state.practiceAudioFails) return Promise.reject(new Error("controlled media I/O failure"));
        this.dispatchEvent(new Event("playing"));
        return Promise.resolve();
      }
    }
    window.Audio = ControlledAudio as unknown as typeof Audio;
  });
}
test("listening replays without results and preserves audio cue on failure/retry/technical skip", async ({ page }) => {
  await audioIO(page);
  const f = await setup(page, words.map(word => ({ ...word, audioUrl: `/practice-audio/${word.id}.mp3` })));
  await page.getByLabel("Gợi ý", { exact: true }).selectOption("audio");
  await page.getByRole("button", { name: "Bắt đầu luyện" }).click();
  await expect(page.getByRole("heading", { name: "Chọn từ tiếng Anh phù hợp với âm thanh" })).toBeVisible();
  await expect(page.locator(".exercise-option").first()).toBeDisabled();
  expect(await page.getByRole("img").count()).toBe(0);
  await page.getByRole("button", { name: "Nghe gợi ý", exact: true }).click();
  await page.getByRole("button", { name: "Nghe gợi ý", exact: true }).click();
  expect(f.controls.writes).toBe(1);
  await expect(page.locator(".exercise-option").first()).toBeEnabled();
  await page.getByRole("button", { name: f.question().answer, exact: true }).click();
  await page.getByRole("button", { name: "Câu tiếp theo" }).click();
  await page.evaluate(() => { (window as typeof window & { practiceAudioFails: boolean }).practiceAudioFails = true; });
  await page.getByRole("button", { name: "Nghe gợi ý", exact: true }).click();
  await expect(page.getByRole("button", { name: "Tải lại âm thanh" })).toBeVisible();
  await page.evaluate(() => { (window as typeof window & { practiceAudioFails: boolean }).practiceAudioFails = false; });
  await page.getByRole("button", { name: "Tải lại âm thanh" }).click();
  await page.getByRole("button", { name: "Nghe gợi ý", exact: true }).click();
  await expect(page.locator(".exercise-option").first()).toBeEnabled();
  await page.evaluate(() => { (window as typeof window & { practiceAudioFails: boolean }).practiceAudioFails = true; });
  await page.getByRole("button", { name: "Nghe gợi ý", exact: true }).click();
  await page.getByRole("button", { name: "Bỏ qua lỗi âm thanh" }).click();
  await expect(page.getByRole("heading", { name: "Bỏ qua vì lỗi media" })).toBeVisible();
  expect([...f.stored.values()][0]!.results.map(result => [result.cueKind, result.outcome])).toEqual([["audio", "correct"], ["audio", "technical"]]);
});
test("mixed alternates all cues without duplicate targets, with cue-specific summary", async ({ page }) => {
  await audioIO(page);
  const f = await setup(page, words.map(word => ({ ...word, audioUrl: `/practice-audio/${word.id}.mp3` })));
  await page.getByLabel("Gợi ý", { exact: true }).selectOption("mixed");
  await page.getByRole("button", { name: "Bắt đầu luyện" }).click();
  for (let i = 0; i < 6; i++) {
    const q = f.question();
    expect(q.cueKind).toBe(i % 2 ? "audio" : "image");
    if (q.cueKind === "audio") await page.getByRole("button", { name: "Nghe gợi ý", exact: true }).click();
    await page.getByRole("button", { name: q.answer, exact: true }).click();
    await page.getByRole("button", { name: /Câu tiếp theo|Xem tổng kết/ }).click();
  }
  await expect(page.getByText("Ảnh: 3 đúng / 0 cần luyện thêm. Nghe: 3 đúng / 0 cần luyện thêm.")).toBeVisible();
  expect(new Set([...f.stored.values()][0]!.questions.map(q => q.vocabularyId)).size).toBe(6);
});
test("mixed with only image media explains missing audio and does not start another mode", async ({ page }) => {
  const f = await setup(page);
  await page.getByLabel("Gợi ý", { exact: true }).selectOption("mixed");
  await page.getByRole("button", { name: "Bắt đầu luyện" }).click();
  await expect(page.getByRole("heading", { name: "Kết hợp cần cả ảnh và âm thanh ở hai từ khác nhau" })).toBeVisible();
  await expect(page.getByLabel("Gợi ý", { exact: true })).toHaveValue("mixed");
  expect(f.controls.writes).toBe(0);
});
test("typed image practice validates empty input, preserves failed answer and normalizes Unicode", async ({ page }) => {
  const f = await setup(page, [{ ...words[0]!, word: "Ice Cream" }]);
  await page.getByLabel("Cách trả lời").selectOption("type");
  await page.getByRole("button", { name: "Bắt đầu luyện" }).click();
  const input = page.getByRole("textbox", { name: "Từ tiếng Anh", exact: true });
  await expect(input).toBeEnabled();
  expect(await page.locator(".exercise-option").count()).toBe(0);
  await expect(page.getByText("Ice Cream", { exact: true })).not.toBeVisible();
  await page.getByRole("button", { name: "Gửi đáp án" }).click();
  await expect(page.getByText("Nhập từ tiếng Anh trước khi gửi.")).toBeVisible();
  expect(f.controls.writes).toBe(1);
  await input.fill("  ＩＣＥ　ＣＲＥＡＭ  "); f.controls.failSaveAfterCommit = true;
  await input.press("Enter");
  await expect(page.getByRole("heading", { name: "Chưa lưu được" })).toBeVisible();
  await expect(input).toHaveValue("  ＩＣＥ　ＣＲＥＡＭ  ");
  await page.getByRole("button", { name: "Thử lại", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Đúng", exact: true })).toBeVisible();
  expect(f.controls.pendingPayloads[0]).toEqual(f.controls.pendingPayloads[1]);
  expect(f.controls.writes).toBe(2);
  await page.getByRole("button", { name: "Xem tổng kết" }).click();
  await expect(page.getByText("100%", { exact: true })).toBeVisible();
});
for (const cue of ["audio", "mixed"] as const) test(`typed ${cue} practice keeps media contract and first outcomes`, async ({ page }) => {
  await audioIO(page);
  const f = await setup(page, words.map(word => ({ ...word, audioUrl: `/practice-audio/${word.id}.mp3` })));
  await page.getByLabel("Cách trả lời").selectOption("type");
  await page.getByLabel("Gợi ý", { exact: true }).selectOption(cue);
  await page.getByRole("button", { name: "Bắt đầu luyện" }).click();
  for (let i = 0; i < 6; i++) {
    const q = f.question();
    if (q.cueKind === "audio") await page.getByRole("button", { name: "Nghe gợi ý", exact: true }).click();
    const input = page.getByRole("textbox", { name: "Từ tiếng Anh", exact: true });
    await expect(input).toBeEnabled();
    if (i === 0) await page.getByRole("button", { name: "Xem đáp án", exact: true }).click();
    else { await input.fill(i === 1 ? "different-word" : q.answer.toUpperCase()); await input.press("Enter"); }
    await page.getByRole("button", { name: /Câu tiếp theo|Xem tổng kết/ }).click();
  }
  await expect(page.getByRole("heading", { name: "Hoàn tất buổi luyện" })).toBeVisible();
  await expect(page.getByText("80%", { exact: true })).toBeVisible();
  expect([...f.stored.values()][0]!.results.map(result => result.outcome)).toEqual(["revealed", "incorrect", "correct", "correct", "correct", "correct"]);
});
test("reload restores the same saved question and feedback without regenerating a session", async ({ page }) => {
  const f = await setup(page);
  await page.getByRole("button", { name: "Bắt đầu luyện" }).click();
  await page.getByRole("button", { name: f.question().answer, exact: true }).click();
  const nextId = f.question().questionId;
  await page.reload();
  await page.getByRole("button", { name: "Tiếp tục buổi luyện" }).click();
  await expect(page.getByRole("heading", { name: "Đúng", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Câu tiếp theo" }).click();
  expect(f.question().questionId).toBe(nextId); expect(f.controls.writes).toBe(2); expect(f.stored.size).toBe(1);
  await expect(page.getByText("Đã lưu 1/6", { exact: false })).toBeVisible();
});
test("reload preserves uncertain pending action and confirms it exactly once", async ({ page }) => {
  const f = await setup(page);
  await page.getByRole("button", { name: "Bắt đầu luyện" }).click();
  f.controls.failSaveAfterCommit = true;
  await page.getByRole("button", { name: f.question().answer, exact: true }).click();
  await expect(page.getByRole("heading", { name: "Chưa lưu được" })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Tiếp tục buổi luyện" }).click();
  await page.getByRole("button", { name: "Thử lại", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Đúng", exact: true })).toBeVisible();
  expect(f.controls.pendingPayloads[0]).toEqual(f.controls.pendingPayloads[1]); expect(f.controls.writes).toBe(2);
});
test("typed draft and completed summary survive reload on this device", async ({ page }) => {
  const f = await setup(page, [words[0]!]);
  await page.getByLabel("Cách trả lời").selectOption("type");
  await page.getByRole("button", { name: "Bắt đầu luyện" }).click();
  await page.getByRole("textbox", { name: "Từ tiếng Anh", exact: true }).fill("APP");
  await page.reload(); await page.getByRole("button", { name: "Tiếp tục buổi luyện" }).click();
  const input = page.getByRole("textbox", { name: "Từ tiếng Anh", exact: true });
  await expect(input).toHaveValue("APP");
  await input.fill("APPLE"); await input.press("Enter");
  await page.getByRole("button", { name: "Xem tổng kết" }).click();
  await page.reload(); await page.getByRole("button", { name: "Tiếp tục buổi luyện" }).click();
  await expect(page.getByRole("heading", { name: "Hoàn tất buổi luyện" })).toBeVisible();
  expect(await page.getByRole("textbox", { name: "Từ tiếng Anh" }).count()).toBe(0);
  expect(f.controls.writes).toBe(2); expect(f.stored.size).toBe(1);
});
test("checkpoint storage failure prevents the write and retains the answer for retry", async ({ page }) => {
  const f = await setup(page);
  await page.getByRole("button", { name: "Bắt đầu luyện" }).click();
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    (window as typeof window & { restorePracticeStorage: () => void }).restorePracticeStorage = () => { Storage.prototype.setItem = original; };
    Storage.prototype.setItem = function (key, value) { if (key.startsWith("vocabflow.practice.resume.v1:")) throw new DOMException("controlled storage I/O failure"); return original.call(this, key, value); };
  });
  await page.getByRole("button", { name: f.question().answer, exact: true }).click();
  await expect(page.getByText("Chưa lưu được checkpoint trên thiết bị.", { exact: false })).toBeVisible();
  expect(f.controls.pendingPayloads).toHaveLength(0); expect(f.controls.writes).toBe(1);
  await page.evaluate(() => { (window as typeof window & { restorePracticeStorage: () => void }).restorePracticeStorage(); });
  await page.getByRole("button", { name: "Thử lại", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Đúng", exact: true })).toBeVisible();
  expect(f.controls.writes).toBe(2);
});
test("incompatible content blocks resume and explicit new start preserves saved history", async ({ page }) => {
  const f = await setup(page, words.map(word => ({ ...word })));
  await page.getByRole("button", { name: "Bắt đầu luyện" }).click();
  await page.getByRole("button", { name: f.question().answer, exact: true }).click();
  f.source.find(word => word.id === f.question().vocabularyId)!.contentVersion++;
  await page.reload(); await page.getByRole("button", { name: "Tiếp tục buổi luyện" }).click();
  await expect(page.getByRole("heading", { name: "Buổi luyện không còn tương thích" })).toBeVisible();
  expect([...f.stored.values()][0]!.results).toHaveLength(1);
  await page.getByRole("button", { name: "Bắt đầu buổi mới" }).click();
  await page.getByRole("button", { name: "Bắt đầu luyện" }).click();
  await expect(page.locator(".exercise-option").first()).toBeEnabled();
  expect(f.stored.size).toBe(2); expect([...f.stored.values()][0]!.results).toHaveLength(1);
});
test("corrupt checkpoint is explained and account change does not reveal a previous draft", async ({ page }) => {
  const f = await setup(page);
  await page.getByRole("button", { name: "Bắt đầu luyện" }).click();
  await page.evaluate(() => {
    const key = Object.keys(localStorage).find(key => key.startsWith("vocabflow.practice.resume.v1:"))!;
    const value = JSON.parse(localStorage.getItem(key)!); value.version = 99; localStorage.setItem(key, JSON.stringify(value));
  });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Buổi luyện không còn tương thích" })).toBeVisible();
  f.controls.accountUser = "account-b";
  await page.route("**/api/auth/get-session", async route => route.fulfill({ contentType: "application/json", body: JSON.stringify({ session: { id: "session-b", userId: "account-b" }, user: { id: "account-b", name: "B", email: "b@example.invalid" } }) }));
  await page.reload();
  await expect(page.getByRole("button", { name: "Bắt đầu luyện" })).toBeVisible();
  expect(await page.getByRole("button", { name: "Tiếp tục buổi luyện" }).count()).toBe(0);
  expect(await page.getByRole("heading", { name: "Buổi luyện không còn tương thích" }).count()).toBe(0);
  expect(f.controls.writes).toBe(1);
});
test("unavailable checkpoint reads can recover without discarding stored data", async ({ page }) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.getItem;
    (window as typeof window & { restorePracticeRead: () => void }).restorePracticeRead = () => { Storage.prototype.getItem = original; };
    Storage.prototype.getItem = function (key) { if (key.startsWith("vocabflow.practice.resume.v1:")) throw new DOMException("controlled storage read failure"); return original.call(this, key); };
  });
  const f = await setup(page);
  await expect(page.getByText("Chưa lưu được checkpoint trên thiết bị.", { exact: false })).toBeVisible();
  expect(f.controls.writes).toBe(0);
  await page.evaluate(() => { (window as typeof window & { restorePracticeRead: () => void }).restorePracticeRead(); });
  await page.getByRole("button", { name: "Thử lại", exact: true }).click();
  await page.getByRole("button", { name: "Bắt đầu luyện" }).click();
  await expect(page.locator(".exercise-option").first()).toBeEnabled(); expect(f.controls.writes).toBe(1);
});
test("account history selects wrong questions, retries uncertain creation once and preserves the first session", async ({ page }) => {
  const f = await setup(page);
  await page.getByRole("button", { name: "5 câu", exact: true }).click();
  await page.getByRole("button", { name: "Bắt đầu luyện" }).click();
  const wrongWords: string[] = [];
  for (let i = 0; i < 5; i++) {
    await expect(page.locator(".exercise-option").first()).toBeEnabled();
    const q = f.question();
    if (i < 2) { wrongWords.push(q.answer); await page.getByRole("button", { name: q.options.find(option => option.label !== q.answer)!.label, exact: true }).click(); }
    else if (i === 3) await page.getByRole("button", { name: "Xem đáp án", exact: true }).click();
    else if (i === 4) await page.getByRole("button", { name: "Bỏ qua câu", exact: true }).click();
    else await page.getByRole("button", { name: q.answer, exact: true }).click();
    await page.getByRole("button", { name: /Câu tiếp theo|Xem tổng kết/ }).click();
  }
  const original = structuredClone([...f.stored.values()][0]!);
  await page.getByRole("link", { name: "Lịch sử luyện", exact: true }).click();
  await page.getByRole("button", { name: "Xem buổi luyện", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Kết quả lượt đầu" })).toBeFocused();
  await expect(page.getByRole("checkbox")).toHaveCount(2);
  await page.getByRole("checkbox", { name: wrongWords[1]!, exact: true }).uncheck();
  f.controls.failRetryAfterCommit = true;
  await page.getByRole("button", { name: "Luyện lại câu đã chọn" }).click();
  await expect(page.getByText("Chưa tạo hoặc xác nhận được lượt luyện lại.", { exact: false })).toBeVisible();
  expect(f.stored.size).toBe(2);
  await page.getByRole("button", { name: "Thử lại lượt luyện đã chọn" }).click();
  await expect(page).toHaveURL(/\/practice$/);
  await expect(page.locator(".exercise-option").first()).toBeEnabled();
  expect(f.stored.size).toBe(2);
  const retryState = [...f.stored.values()].find(state => state.retryOf === original.sessionId)!;
  expect(retryState.questions).toHaveLength(1); expect(retryState.questions[0]!.answer).toBe(wrongWords[0]);
  await page.getByRole("button", { name: wrongWords[0]!, exact: true }).click();
  await page.getByRole("button", { name: "Xem tổng kết" }).click();
  await page.getByRole("link", { name: "Lịch sử luyện", exact: true }).click();
  await expect(page.getByText("Lượt luyện lại", { exact: false })).toBeVisible();
  expect([...f.stored.values()][0]!).toEqual(original);
  await page.screenshot({ path: ".scratch/practice-game-video-20261101/evidence/07-history-desktop.png", fullPage: true });
});
test("reload recovers an uncommitted history retry with the saved wrong selection", async ({ page }) => {
  const f = await setup(page);
  await page.getByRole("button", { name: "Bắt đầu luyện" }).click();
  await expect(page.locator(".exercise-option").first()).toBeEnabled();
  const q = f.question();
  await page.getByRole("button", { name: q.options.find(option => option.label !== q.answer)!.label, exact: true }).click();
  await page.getByRole("button", { name: "Câu tiếp theo" }).click();
  await page.getByRole("link", { name: "Lịch sử luyện", exact: true }).click();
  await page.getByRole("button", { name: "Xem buổi luyện", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: q.answer, exact: true })).toBeChecked();
  f.controls.failCreation = true;
  await page.getByRole("button", { name: "Luyện lại câu đã chọn" }).click();
  await expect(page.getByText("Chưa tạo hoặc xác nhận được lượt luyện lại.", { exact: false })).toBeVisible();
  expect(f.stored.size).toBe(1);
  f.controls.failCreation = false;
  await page.getByRole("link", { name: "Về Luyện tự do", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "Tiếp tục buổi luyện" }).click();
  await expect(page.locator(".exercise-option").first()).toBeEnabled();
  expect(f.stored.size).toBe(2);
  const next = [...f.stored.values()].find(state => state.retryOf)!;
  expect(next.questions).toHaveLength(1); expect(next.questions[0]!.answer).toBe(q.answer);
});
