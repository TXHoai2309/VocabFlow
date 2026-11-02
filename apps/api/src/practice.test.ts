import { describe, expect, it } from "vitest";
import type { LearnerVocabularyDto, PracticeAction, PracticeSession } from "@vocabflow/contracts";
import { practiceHistoryPage, practiceResults, type PracticeState } from "@vocabflow/learning-domain";
import { createApp } from "./index";
import { createPracticeService, type PracticeRepository } from "./practice";

const learnerId = "00000000-0000-4000-8000-000000000010";
const foreignId = "00000000-0000-4000-8000-000000000011";
const words: LearnerVocabularyDto[] = ["apple", "book", "house", "water", "sun", "moon"].map((word, i) => ({
  id: i + 1, word, vietnamese: ["quả táo", "quyển sách", "ngôi nhà", "nước", "mặt trời", "mặt trăng"][i]!, contentVersion: 1,
  status: "LEARNING", imageUrl: `/media/${i}.png`, audioUrl: null, ipa: null, definitionEn: null, exampleEn: null,
  enabled: true, topic: null, level: null, nextReviewDate: "2026-11-02"
}));
function fixture(source = words) {
  const stored = new Map<string, PracticeState>();
  const created = new Map<string, string>();
  let writes = 0;
  let clock = Date.parse("2026-11-01T00:00:00.000Z");
  const key = (learner: string, session: string) => `${learner}:${session}`;
  const repo: PracticeRepository = {
    history: async (learner, page, needsPage) => practiceHistoryPage([...stored.values()].filter(state => state.learnerId === learner).map(state => ({ state, createdAt: created.get(key(learner, state.sessionId))! })), page, needsPage),
    results: async (learner, session) => { const state = stored.get(key(learner, session)); return state ? practiceResults({ state, createdAt: created.get(key(learner, session))! }) : null; },
    read: async (learner, session) => structuredClone(stored.get(key(learner, session)) ?? null),
    insert: async state => { const id = key(state.learnerId, state.sessionId); if (!stored.has(id)) { stored.set(id, structuredClone(state)); created.set(id, new Date().toISOString()); writes++; } },
    replace: async (state, revision) => { const id = key(state.learnerId, state.sessionId); if (stored.get(id)?.revision !== revision) return false; stored.set(id, structuredClone(state)); writes++; return true; }
  };
  const service = createPracticeService({ authorize: async (user, learner) => user === "owner" && learner === learnerId,
    now: () => new Date(clock++),
    currentWords: async (_user, _learner, ids) => structuredClone(source.filter(word => word.enabled && ids.includes(word.id))),
    sourceWords: async () => structuredClone(source), repository: repo });
  const app = createApp({ readSession: async request => request.headers.get("x-test-user") ? { user: { id: request.headers.get("x-test-user")! } } : null, practiceService: service });
  async function request(path = "", body?: unknown, user = "owner", learner = learnerId) {
    return app.request(`http://localhost/api/learners/${learner}/practice-sessions${path}`, {
      method: body === undefined ? "GET" : "POST", headers: { "Content-Type": "application/json", ...(user ? { "x-test-user": user } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
  }
  async function create() { const response = await request("", { sessionId: crypto.randomUUID() }); expect(response.status).toBe(200); return await response.json() as PracticeSession; }
  return { request, create, stored, writes: () => writes };
}
describe("free practice API authority and durable state", () => {
  it("requires authentication and ownership for create/read/write; foreign session is absent", async () => {
    const f = fixture(); const id = crypto.randomUUID();
    expect((await f.request("", { sessionId: id }, "")).status).toBe(401);
    expect((await f.request("", { sessionId: id }, "other")).status).toBe(403);
    expect((await f.request("", { sessionId: id }, "owner", foreignId)).status).toBe(403);
    const state = await f.create();
    expect((await f.request(`/${state.sessionId}`, undefined, "other")).status).toBe(403);
    expect((await f.request(`/${state.sessionId}/actions`, { actionId: id, questionId: state.current!.questionId, kind: "skip" }, "other")).status).toBe(403);
    expect((await f.request(`/${id}`)).status).toBe(404);
    expect(f.writes()).toBe(1);
  });
  it("uses only learned source, caps without duplication, hides keys and never mutates learning state", async () => {
    const learningBefore = JSON.stringify(words);
    const f = fixture([...words, { ...words[0]!, id: 700, word: "outside", status: "NEW" }]);
    const state = await f.create();
    expect(state.total).toBe(6); expect(state.requestedCount).toBe(10);
    expect(state.current!.options).toHaveLength(4);
    expect(JSON.stringify(state)).not.toMatch(/correctOptionId|vocabularyId|outside/);
    const hidden = [...f.stored.values()][0]!;
    expect(new Set(hidden.questions.map(q => q.vocabularyId)).size).toBe(6);
    const action: PracticeAction = { actionId: crypto.randomUUID(), questionId: state.current!.questionId, kind: "answer", optionId: hidden.questions[0]!.correctOptionId! };
    const response = await f.request(`/${state.sessionId}/actions`, action);
    expect(response.status).toBe(200); expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect((await response.json()).summary).toMatchObject({ correct: 1, incorrect: 0, accuracy: 100 });
    expect(JSON.stringify(words)).toBe(learningBefore);
    const read = await f.request(`/${state.sessionId}`); expect((await read.json()).completed).toBe(1);
  });
  it("replays concurrent create and same action once; conflicting payload and stale action cannot advance", async () => {
    const f = fixture(); const id = crypto.randomUUID();
    const creations = await Promise.all([f.request("", { sessionId: id }), f.request("", { sessionId: id })]);
    const state = await creations[0]!.json() as PracticeSession;
    expect(await creations[1]!.json()).toEqual(state);
    const action = { actionId: crypto.randomUUID(), questionId: state.current!.questionId, kind: "skip" };
    const results = await Promise.all([f.request(`/${id}/actions`, action), f.request(`/${id}/actions`, action)]);
    expect(results.map(r => r.status)).toEqual([200, 200]);
    expect((await results[0]!.json()).completed).toBe(1); expect((await results[1]!.json()).completed).toBe(1);
    expect(f.writes()).toBe(2);
    expect((await f.request(`/${id}/actions`, { ...action, kind: "reveal" })).status).toBe(409);
    expect((await f.request(`/${id}/actions`, { ...action, actionId: crypto.randomUUID() })).status).toBe(409);
  });
  it("serializes two different first actions on the same question", async () => {
    const f = fixture(); const state = await f.create();
    const responses = await Promise.all(["skip", "reveal"].map(kind => f.request(`/${state.sessionId}/actions`, { actionId: crypto.randomUUID(), questionId: state.current!.questionId, kind })));
    expect(responses.map(r => r.status).sort()).toEqual([200, 409]);
    expect((await (await f.request(`/${state.sessionId}`)).json()).completed).toBe(1);
  });
  it("rejects forged grading and unserved options", async () => {
    const f = fixture(); const state = await f.create();
    const action = { actionId: crypto.randomUUID(), questionId: state.current!.questionId, kind: "answer", optionId: crypto.randomUUID() };
    expect((await f.request(`/${state.sessionId}/actions`, { ...action, correct: true, score: 999 })).status).toBe(400);
    expect((await f.request(`/${state.sessionId}/actions`, action)).status).toBe(409);
    expect((await f.request("", { sessionId: crypto.randomUUID(), words: words })).status).toBe(400);
    expect(f.writes()).toBe(1);
  });
  it("reports distinct outcomes and accuracy only over answers; first results survive reload", async () => {
    const f = fixture(); let state = await f.create();
    for (const kind of ["answer", "answer", "reveal", "skip", "technical-skip", "technical-skip"] as const) {
      const q = [...f.stored.values()][0]!.questions[state.completed]!;
      const option = state.completed === 0 ? q.correctOptionId : q.options.find(o => o.optionId !== q.correctOptionId)!.optionId;
      state = await (await f.request(`/${state.sessionId}/actions`, { actionId: crypto.randomUUID(), questionId: q.questionId, kind, ...(kind === "answer" ? { optionId: option } : {}) })).json();
    }
    expect(state.status).toBe("complete"); expect(state.current).toBeNull();
    expect(state.summary).toMatchObject({ correct: 1, incorrect: 1, revealed: 1, skipped: 1, technical: 2, accuracy: 50 });
    expect(await (await f.request(`/${state.sessionId}`)).json()).toEqual(state);
  });
  it("does not create empty, media-less or ambiguous sessions and does not broaden the source", async () => {
    for (const source of [[], words.map(w => ({ ...w, status: "NEW" as const })), words.map(w => ({ ...w, imageUrl: null })), words.slice(0, 3), words.map(w => ({ ...w, vietnamese: "same" })), words.map(w => ({ ...w, imageMediaStatus: "AMBIGUOUS" as const }))]) {
      const f = fixture(source); const state = await f.create();
      expect(state.total).toBe(0); expect(state.summary.accuracy).toBeNull(); expect(f.writes()).toBe(0);
    }
  });
  it("persists explicit source/count and rejects altered config on replay", async () => {
    const f = fixture(); const id = crypto.randomUUID();
    const config = { count: 5, source: { kind: "saved", cefr: "A1" } };
    const response = await f.request("", { sessionId: id, ...config });
    expect(response.status).toBe(200);
    const state = await response.json() as PracticeSession;
    expect(state.total).toBe(5); expect(state.availableCount).toBe(6);
    expect(state.config).toEqual({ ...config, cue: "image", responseMode: "choice" });
    expect((await f.request("", { sessionId: id, ...config })).status).toBe(200);
    expect((await f.request("", { sessionId: id, ...config, count: 10 })).status).toBe(409);
    expect((await f.request("", { sessionId: id })).status).toBe(409);
    expect(f.writes()).toBe(1);
  });
  it("rejects unsupported counts, sources, levels and client target lists", async () => {
    const f = fixture();
    for (const config of [{ count: 6 }, { source: { kind: "all" } }, { source: { kind: "set", setId: -1 } },
      { source: { kind: "level", cefr: "any" } }, { source: { kind: "saved", ids: [1, 2, 3, 4] } }, { vocabularyIds: [1, 2, 3, 4] }]) {
      expect((await f.request("", { sessionId: crypto.randomUUID(), ...config })).status).toBe(400);
    }
    expect(f.writes()).toBe(0);
  });
  it("serves word audio without an image or answer key and retains cue outcomes", async () => {
    const f = fixture(words.map(word => ({ ...word, audioUrl: `/word-audio/${word.id}.mp3` })));
    const id = crypto.randomUUID();
    const state = await (await f.request("", { sessionId: id, cue: "audio" })).json() as PracticeSession;
    expect(state.current).toMatchObject({ cueKind: "audio", imageUrl: null });
    expect(state.current!.audioUrl).toMatch(/^\/word-audio\//);
    expect(JSON.stringify(state.current)).not.toMatch(/correctOptionId|vocabularyId|vietnamese/);
    const result = await (await f.request(`/${id}/actions`, { actionId: crypto.randomUUID(), questionId: state.current!.questionId, kind: "technical-skip" })).json() as PracticeSession;
    expect(result.summary.byCue.audio.technical).toBe(1); expect(result.summary.incorrect).toBe(0);
    expect(result.feedback!.cueKind).toBe("audio");
    expect(await (await f.request(`/${id}`)).json()).toEqual(result);
  });
  it("mixed alternates image/audio on distinct targets and never degrades to one cue", async () => {
    const f = fixture(words.map((word, i) => ({ ...word, imageUrl: i === 1 ? null : word.imageUrl, audioUrl: i === 0 ? null : `/word-audio/${word.id}.mp3` })));
    const state = await (await f.request("", { sessionId: crypto.randomUUID(), cue: "mixed" })).json() as PracticeSession;
    expect(state.total).toBe(6);
    const hidden = [...f.stored.values()][0]!;
    expect(hidden.questions.map(q => q.cueKind)).toEqual(["image", "audio", "image", "audio", "image", "audio"]);
    expect(new Set(hidden.questions.map(q => q.vocabularyId)).size).toBe(6);
    for (const q of hidden.questions) expect(q.cueKind === "image" ? q.audioUrl : q.imageUrl).toBeNull();
    for (const source of [words, words.map(word => ({ ...word, imageUrl: null, audioUrl: "/word.mp3" })),
      words.map((word, i) => ({ ...word, imageUrl: i === 0 ? word.imageUrl : null, audioUrl: i === 0 ? "/word.mp3" : null }))]) {
      const onlyOne = fixture(source);
      const response = await onlyOne.request("", { sessionId: crypto.randomUUID(), cue: "mixed" });
      expect((await response.json()).emptyReason).toBe("insufficient-mixed-media");
      expect(onlyOne.writes()).toBe(0);
    }
  });
  it("types on a single media target without options; normalizes text but not synonyms or misspellings", async () => {
    for (const [text, expected] of [["  ＩＣＥ　ＣＲＥＡＭ  ", "correct"], ["ice \t cream", "correct"], ["gelato", "incorrect"], ["icecream", "incorrect"]]) {
      const f = fixture([{ ...words[0]!, word: "Ice Cream" }]);
      const state = await (await f.request("", { sessionId: crypto.randomUUID(), responseMode: "type" })).json() as PracticeSession;
      expect(state.total).toBe(1); expect(state.current!.options).toEqual([]);
      expect(JSON.stringify(state.current)).not.toContain("Ice Cream");
      const action = { actionId: crypto.randomUUID(), questionId: state.current!.questionId, kind: "type-answer", text };
      const response = await f.request(`/${state.sessionId}/actions`, action);
      expect(response.status).toBe(200);
      const result = await response.json() as PracticeSession;
      expect(result.feedback!.outcome).toBe(expected);
      expect((await f.request(`/${state.sessionId}/actions`, action)).status).toBe(200);
      expect(f.writes()).toBe(2);
    }
  });
  it("rejects blank typed answers and incompatible answer modes; reveal remains the first outcome", async () => {
    const f = fixture();
    const state = await (await f.request("", { sessionId: crypto.randomUUID(), responseMode: "type" })).json() as PracticeSession;
    const action = { actionId: crypto.randomUUID(), questionId: state.current!.questionId, kind: "type-answer", text: " " };
    expect((await f.request(`/${state.sessionId}/actions`, action)).status).toBe(400);
    expect((await f.request(`/${state.sessionId}/actions`, { ...action, kind: "answer", optionId: crypto.randomUUID(), text: undefined })).status).toBe(400);
    expect(f.writes()).toBe(1);
    const revealed = await (await f.request(`/${state.sessionId}/actions`, { actionId: crypto.randomUUID(), questionId: state.current!.questionId, kind: "reveal" })).json() as PracticeSession;
    expect(revealed.feedback!.outcome).toBe("revealed");
    expect((await f.request(`/${state.sessionId}/actions`, { ...action, text: "apple" })).status).toBe(409);
    expect(revealed.summary.correct).toBe(0);
    const choice = await f.create();
    expect((await f.request(`/${choice.sessionId}/actions`, { ...action, actionId: crypto.randomUUID(), questionId: choice.current!.questionId, text: "apple" })).status).toBe(400);
  });
  it("blocks stale content without replacing the queue; exact committed replay survives content changes", async () => {
    const source = words.map(word => ({ ...word }));
    const f = fixture(source); const state = await f.create();
    const hidden = [...f.stored.values()][0]!;
    const action = { actionId: crypto.randomUUID(), questionId: state.current!.questionId, kind: "answer", optionId: hidden.questions[0]!.correctOptionId };
    const result = await (await f.request(`/${state.sessionId}/actions`, action)).json() as PracticeSession;
    const nextId = [...f.stored.values()][0]!.questions[1]!.vocabularyId;
    source.find(word => word.id === nextId)!.contentVersion++;
    const stale = await f.request(`/${state.sessionId}`);
    expect(stale.status).toBe(409); expect((await stale.json()).error.code).toBe("STALE_PRACTICE_CONTENT");
    expect(await (await f.request(`/${state.sessionId}/actions`, action)).json()).toEqual(result);
    expect((await f.request(`/${state.sessionId}/actions`, { actionId: crypto.randomUUID(), questionId: result.current!.questionId, kind: "skip" })).status).toBe(409);
    expect([...f.stored.values()][0]!.results).toHaveLength(1);
    expect(f.writes()).toBe(2);
  });
  it("reads private history/resolved-only results and creates a distinct selected-wrong retry", async () => {
    const f = fixture(); const state = await f.create();
    const original = [...f.stored.values()][0]!;
    const wrong = original.questions[0]!;
    const incorrectOption = wrong.options.find(option => option.optionId !== wrong.correctOptionId)!.optionId;
    await f.request(`/${state.sessionId}/actions`, { actionId: crypto.randomUUID(), questionId: wrong.questionId, kind: "answer", optionId: incorrectOption });
    await f.request(`/${state.sessionId}/actions`, { actionId: crypto.randomUUID(), questionId: original.questions[1]!.questionId, kind: "reveal" });
    const firstSnapshot = structuredClone([...f.stored.values()][0]!);
    const historyResponse = await f.request(); expect(historyResponse.status).toBe(200);
    const history = await historyResponse.json(); expect(history.totalSessions).toBe(1); expect(history.needsTotal).toBe(1);
    expect(history.items[0].summary).toMatchObject({ correct: 0, incorrect: 1, revealed: 1, accuracy: 0 });
    const detailResponse = await f.request(`/${state.sessionId}/results`);
    expect(detailResponse.status).toBe(200);
    const detail = await detailResponse.json(); expect(detail.results).toHaveLength(2);
    expect(JSON.stringify(detail)).not.toMatch(/correctOptionId|"options"/);
    const id = crypto.randomUUID();
    const request = { sessionId: id, questionIds: [wrong.questionId] };
    const retryResponse = await f.request(`/${state.sessionId}/retry`, request); expect(retryResponse.status).toBe(200);
    const retry = await retryResponse.json() as PracticeSession;
    expect(retry.total).toBe(1); expect(retry.config).toEqual(state.config); expect(retry.current!.options).toHaveLength(4);
    expect(await (await f.request(`/${state.sessionId}/retry`, request)).json()).toEqual(retry);
    expect([...f.stored.values()][0]!).toEqual(firstSnapshot);
    const newState = [...f.stored.values()].find(saved => saved.sessionId === id)!;
    await f.request(`/${id}/actions`, { actionId: crypto.randomUUID(), questionId: retry.current!.questionId, kind: "answer", optionId: newState.questions[0]!.correctOptionId });
    const after = await (await f.request()).json(); expect(after.totalSessions).toBe(2); expect(after.needsTotal).toBe(0);
    expect(after.items.some((entry: { retryOf?: string }) => entry.retryOf === state.sessionId)).toBe(true);
    expect([...f.stored.values()][0]!).toEqual(firstSnapshot);
  });
  it("history/retry enforce ownership, validate pages and reject unserved or non-incorrect selections", async () => {
    const f = fixture(); const state = await f.create(); const path = `/${state.sessionId}`;
    expect((await f.request("", undefined, "")).status).toBe(401);
    expect((await f.request("", undefined, "other")).status).toBe(403);
    expect((await f.request(`${path}/results`, undefined, "other")).status).toBe(403);
    expect((await f.request(`${path}/retry`, { sessionId: crypto.randomUUID() }, "other")).status).toBe(403);
    expect((await f.request(`${path}/retry`, { sessionId: crypto.randomUUID(), questionIds: [state.current!.questionId] })).status).toBe(400);
    for (const query of ["?page=0", "?page=1&page=2", "?needsPage=abc", "?scope=all"]) expect((await f.request(query)).status).toBe(400);
    const second = await (await f.request("?page=2&needsPage=2")).json(); expect(second.items).toEqual([]); expect(second.totalSessions).toBe(1);
    const history = await (await f.request()).json(); expect(history.items[0].summary.accuracy).toBeNull();
  });
  it("keeps resolved history readable after retirement but refuses a new retry of stale pins", async () => {
    const source = words.map(word => ({ ...word })); const f = fixture(source);
    const state = await f.create(); const saved = [...f.stored.values()][0]!;
    const q = saved.questions[0]!;
    await f.request(`/${state.sessionId}/actions`, { actionId: crypto.randomUUID(), questionId: q.questionId,
      kind: "answer", optionId: q.options.find(option => option.optionId !== q.correctOptionId)!.optionId });
    const before = await (await f.request(`/${state.sessionId}/results`)).json();
    source.find(word => word.id === q.vocabularyId)!.contentVersion++;
    expect(await (await f.request(`/${state.sessionId}/results`)).json()).toEqual(before);
    expect((await f.request(`/${state.sessionId}/retry`, { sessionId: crypto.randomUUID(), questionIds: [q.questionId] })).status).toBe(409);
    expect(f.stored.size).toBe(1);
  });
});
