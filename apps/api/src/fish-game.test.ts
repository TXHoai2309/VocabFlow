import { describe, expect, it } from "vitest";
import { matchesCefrFilter, type FishGameSession, type LearnerVocabularyDto } from "@vocabflow/contracts";
import { fishGameHistoryPage, fishGameResults, type FishGameState } from "@vocabflow/learning-domain";
import { createApp } from "./index";
import { createFishGameService } from "./fish-game";
const learner = "00000000-0000-4000-8000-000000000001";
const words: LearnerVocabularyDto[] = ["apple", "book", "water"].map((word, i) => ({ id: i + 1, word, vietnamese: word, enabled: true, status: "LEARNING", contentVersion: 1,
  imageUrl: `/images/${i}.png`, audioUrl: null, ipa: null, definitionEn: null, exampleEn: null, level: null, topic: null, nextReviewDate: "2026-11-02" }));
function fixture(source = words.map(word => ({ ...word }))) {
  const states = new Map<string, FishGameState>(), created = new Map<string, string>(); let writes = 0;
  const service = createFishGameService({ authorize: async (user, target) => user === "owner" && target === learner,
    sourceWords: async (_user, _target, scope) => structuredClone(source.filter(word => (scope.kind !== "set" || (scope.setId === 42 && word.id <= 4)) && (scope.kind !== "saved" || word.id <= 2) && matchesCefrFilter(word.cefr, scope.cefr, word.tags))), currentWords: async (_user, _target, ids) => structuredClone(source.filter(word => ids.includes(word.id))),
    repository: { history: async (target, page, recordsPage) => fishGameHistoryPage([...states.values()].filter(state => state.learnerId === target).map(state => ({ state, createdAt: created.get(state.gameId)! })), page, recordsPage),
      results: async (target, id, page) => { const state = states.get(id); return state?.learnerId === target ? fishGameResults({ state, createdAt: created.get(id)! }, page) : null; },
      read: async (target, id) => target === learner ? structuredClone(states.get(id) ?? null) : null,
      insert: async state => { if (!states.has(state.gameId)) { states.set(state.gameId, structuredClone(state)); created.set(state.gameId, new Date().toISOString()); writes++; } },
      replace: async (state, revision) => { if (states.get(state.gameId)?.revision !== revision) return false; states.set(state.gameId, structuredClone(state)); writes++; return true; } } });
  const app = createApp({ readSession: async request => request.headers.get("x-user") ? { user: { id: request.headers.get("x-user")! } } : null, fishGameService: service });
  async function request(path = "", body?: unknown, user = "owner", target = learner) { return app.request(`http://localhost/api/learners/${target}/fish-games${path}`, { headers: { "x-user": user, "Content-Type": "application/json" }, ...(body === undefined ? {} : { method: "POST", body: JSON.stringify(body) }) }); }
  async function create(config: Record<string, unknown> = {}) { return await (await request("", { gameId: crypto.randomUUID(), ...config })).json() as FishGameSession; }
  return { source, states, request, create, writes: () => writes };
}
describe("authoritative independent fish games", () => {
  it("scores one normalized correct fish and loses exactly five hearts, then refuses new outcomes", async () => {
    const f = fixture(); let state = await f.create(); expect(state).toMatchObject({ hearts: 5, score: 0, rulesVersion: 1 });
    expect(JSON.stringify(state.current)).not.toMatch(/answer|vocabularyId|correct/);
    const q = f.states.get(state.gameId)!.current!;
    const first = { actionId: crypto.randomUUID(), questionId: q.questionId, kind: "type-answer", text: `  ${q.answer.toUpperCase()}  ` };
    state = await (await f.request(`/${state.gameId}/actions`, first)).json(); expect(state.score).toBe(10); expect(state.hearts).toBe(5);
    expect(await (await f.request(`/${state.gameId}/actions`, first)).json()).toEqual(state);
    for (const kind of ["type-answer", "reveal", "skip", "reveal", "skip"]) {
      const action = { actionId: crypto.randomUUID(), questionId: state.current!.questionId, kind, ...(kind === "type-answer" ? { text: "deliberately wrong" } : {}) };
      state = await (await f.request(`/${state.gameId}/actions`, action)).json();
      expect(await (await f.request(`/${state.gameId}/actions`, action)).json()).toEqual(state);
    }
    expect(state).toMatchObject({ hearts: 0, score: 10, status: "lost", current: null, resolved: 6 });
    expect(state.summary).toEqual({ correct: 1, incorrect: 1, revealed: 2, skipped: 2, technical: 0 });
    expect((await f.request(`/${state.gameId}/actions`, { ...first, actionId: crypto.randomUUID() })).status).toBe(409);
    expect(f.writes()).toBe(7); expect(await (await f.request(`/${state.gameId}`)).json()).toEqual(state);
  });
  it("cycles a single word, does not charge blanks or media failure and pauses when all media failed", async () => {
    const f = fixture(words.slice(0, 1)); let state = await f.create(); const oldId = state.current!.questionId;
    expect((await f.request(`/${state.gameId}/actions`, { actionId: crypto.randomUUID(), questionId: oldId, kind: "type-answer", text: "  " })).status).toBe(400);
    state = await (await f.request(`/${state.gameId}/actions`, { actionId: crypto.randomUUID(), questionId: oldId, kind: "type-answer", text: words[0]!.word })).json();
    expect(state).toMatchObject({ hearts: 5, score: 10, cycle: 2 }); expect(state.current!.questionId).not.toBe(oldId);
    state = await (await f.request(`/${state.gameId}/actions`, { actionId: crypto.randomUUID(), questionId: state.current!.questionId, kind: "technical-skip" })).json();
    expect(state).toMatchObject({ hearts: 5, score: 10, status: "paused-content", emptyReason: "no-valid-media", current: null }); expect(f.writes()).toBe(3);
  });
  it("does not repeat within a cycle or immediately at the boundary when alternatives exist", async () => {
    const f = fixture(); let state = await f.create(); const ids: number[] = [];
    for (let i = 0; i < 7; i++) { const q = f.states.get(state.gameId)!.current!; ids.push(q.vocabularyId); state = await (await f.request(`/${state.gameId}/actions`, { actionId: crypto.randomUUID(), questionId: q.questionId, kind: "type-answer", text: q.answer })).json(); }
    expect(new Set(ids.slice(0, 3)).size).toBe(3); expect(new Set(ids.slice(3, 6)).size).toBe(3);
    expect(ids[2]).not.toBe(ids[3]); expect(ids[5]).not.toBe(ids[6]); expect(state.score).toBe(70);
  });
  it("authenticates and authorizes every private read/write and rejects client scoring", async () => {
    const f = fixture(); const state = await f.create();
    expect((await f.request("", { gameId: crypto.randomUUID() }, "")).status).toBe(401);
    for (const path of [`/${state.gameId}`, `/${crypto.randomUUID()}`]) expect((await f.request(path, undefined, "other")).status).toBe(403);
    expect((await f.request(`/${state.gameId}/actions`, { actionId: crypto.randomUUID(), questionId: state.current!.questionId, kind: "skip" }, "other")).status).toBe(403);
    expect((await f.request("", { gameId: crypto.randomUUID(), hearts: 5, score: 100 })).status).toBe(400);
    expect((await f.request(`/${state.gameId}/actions`, { actionId: crypto.randomUUID(), questionId: state.current!.questionId, kind: "type-answer", text: "wrong", correct: true })).status).toBe(400);
    expect((await f.request(`/${state.gameId}`)).headers.get("cache-control")).toBe("no-store"); expect(f.writes()).toBe(1);
  });
  it("serializes competing actions and detects changed receipt payloads", async () => {
    const f = fixture(); const state = await f.create(); const q = state.current!;
    const first = { actionId: crypto.randomUUID(), questionId: q.questionId, kind: "reveal" };
    const responses = await Promise.all([f.request(`/${state.gameId}/actions`, first), f.request(`/${state.gameId}/actions`, { ...first, actionId: crypto.randomUUID(), kind: "skip" })]);
    expect(responses.map(response => response.status).sort()).toEqual([200, 409]);
    const after = await (await f.request(`/${state.gameId}`)).json(); expect(after.hearts).toBe(4); expect(after.resolved).toBe(1);
    expect((await f.request(`/${state.gameId}/actions`, { ...first, kind: "skip" })).status).toBe(409);
  });
  it("rejects stale content without a heart/score write and keeps committed replay readable", async () => {
    const f = fixture(); let state = await f.create(); const q = f.states.get(state.gameId)!.current!;
    const first = { actionId: crypto.randomUUID(), questionId: q.questionId, kind: "skip" };
    state = await (await f.request(`/${state.gameId}/actions`, first)).json();
    f.source.find(word => word.id === f.states.get(state.gameId)!.current!.vocabularyId)!.contentVersion++;
    expect((await f.request(`/${state.gameId}`)).status).toBe(409);
    expect((await f.request(`/${state.gameId}/actions`, { actionId: crypto.randomUUID(), questionId: state.current!.questionId, kind: "skip" })).status).toBe(409);
    expect(await (await f.request(`/${state.gameId}/actions`, first)).json()).toEqual(state); expect(f.writes()).toBe(2);
  });
  it("never widens empty/unlearned/ambiguous image pools", async () => {
    for (const source of [[], words.map(word => ({ ...word, status: "NEW" as const })), words.map(word => ({ ...word, imageUrl: null })), words.map(word => ({ ...word, imageMediaStatus: "AMBIGUOUS" as const }))]) {
      const f = fixture(source); const state = await f.create(); expect(state.current).toBeNull(); expect(state.emptyReason).not.toBeNull(); expect(f.writes()).toBe(0);
    }
  });
  it("uses learned then new members of the chosen set, then only that pool across mixed cycles", async () => {
    const source = Array.from({ length: 5 }, (_, i) => ({ ...words[i % 3]!, id: i + 1, word: `word${i}`, status: i === 0 || i === 2 ? "LEARNING" as const : "NEW" as const, audioUrl: `/audio/${i}.mp3`, cefr: "A1" }));
    const f = fixture(source); let state = await f.create({ source: { kind: "set", setId: 42 }, cue: "mixed" }); const seen: number[] = [];
    for (let i = 0; i < 9; i++) {
      const q = f.states.get(state.gameId)!.current!; seen.push(q.vocabularyId); expect(q.cueKind).toBe(i % 2 ? "audio" : "image");
      state = await (await f.request(`/${state.gameId}/actions`, { actionId: crypto.randomUUID(), questionId: q.questionId, kind: "type-answer", text: q.answer })).json();
    }
    expect(new Set(seen.slice(0, 2))).toEqual(new Set([1, 3])); expect(new Set(seen.slice(2, 4))).toEqual(new Set([2, 4]));
    expect(new Set(seen.slice(4, 8)).size).toBe(4); expect(seen).not.toContain(5); expect(seen[7]).not.toBe(seen[8]);
    expect(f.source.filter(word => word.status === "NEW")).toHaveLength(3);
    const wrongLevel = await f.create({ source: { kind: "saved", cefr: "B2" } }); expect(wrongLevel.emptyReason).toBe("empty-source");
  });
  it("starts unlearned-only explicit levels and pauses uneven mixed phases without changing cue", async () => {
    const f = fixture(words.map(word => ({ ...word, status: "NEW", cefr: "A1", audioUrl: "/audio/word.mp3" })));
    const state = await f.create({ source: { kind: "level", cefr: "A1" }, cue: "audio" }); expect(state.current!.cueKind).toBe("audio");
    expect(state.current!.imageUrl).toBeNull(); expect(JSON.stringify(state.current)).not.toContain("answer");
    const uneven = fixture(words.map((word, i) => ({ ...word, imageUrl: i === 2 ? null : word.imageUrl, audioUrl: i === 2 ? "/audio/word.mp3" : null })));
    let game = await uneven.create({ cue: "mixed" });
    for (let i = 0; i < 3; i++) { const q = uneven.states.get(game.gameId)!.current!; game = await (await uneven.request(`/${game.gameId}/actions`, { actionId: crypto.randomUUID(), questionId: q.questionId, kind: "type-answer", text: q.answer })).json(); }
    // A fresh cycle may continue if its next cue is available; it must always
    // retain alternation and eventually pause rather than repeat within phase.
    for (let i = 0; i < 5 && game.current; i++) { const q = uneven.states.get(game.gameId)!.current!; game = await (await uneven.request(`/${game.gameId}/actions`, { actionId: crypto.randomUUID(), questionId: q.questionId, kind: "type-answer", text: q.answer })).json(); }
    expect(game).toMatchObject({ hearts: 5, status: "paused-content", emptyReason: "insufficient-next-cue", current: null });
    const noAudio = await fixture().create({ cue: "mixed" }); expect(noAudio.emptyReason).toBe("insufficient-mixed-media");
  });
  it("finalizes once with server points, excludes unfinished games and groups records by saved conditions", async () => {
    const f = fixture(words.map(word => ({ ...word, audioUrl: "/audio/word.mp3" }))); const first = await f.create(); const q = f.states.get(first.gameId)!.current!;
    const outcome = { actionId: crypto.randomUUID(), questionId: q.questionId, kind: "type-answer", text: q.answer };
    await f.request(`/${first.gameId}/actions`, outcome);
    expect((await (await f.request()).json()).totalRecords).toBe(0);
    const actionId = crypto.randomUUID(), finish = await f.request(`/${first.gameId}/finish`, { actionId }); expect(finish.status).toBe(200);
    const ended = await finish.json(); expect(ended).toMatchObject({ hearts: 5, score: 10, status: "ended", current: null, resolved: 1 });
    expect(await (await f.request(`/${first.gameId}/finish`, { actionId })).json()).toEqual(ended);
    expect(await (await f.request(`/${first.gameId}/finish`, { actionId: crypto.randomUUID() })).json()).toEqual(ended);
    expect((await f.request(`/${first.gameId}/actions`, { ...outcome, actionId: crypto.randomUUID() })).status).toBe(409);
    expect(await (await f.request(`/${first.gameId}/actions`, outcome)).json()).toEqual(ended);
    const imageSecond = await f.create(); await f.request(`/${imageSecond.gameId}/finish`, { actionId: crypto.randomUUID() });
    const audio = await f.create({ cue: "audio" }); await f.request(`/${audio.gameId}/finish`, { actionId: crypto.randomUUID() });
    await f.create(); const history = await (await f.request()).json();
    expect(history.totalGames).toBe(4); expect(history.totalRecords).toBe(2);
    expect(history.records.find((record: { config: { cue: string } }) => record.config.cue === "image")).toMatchObject({ bestScore: 10, bestGameId: first.gameId, finalizedGames: 2 });
    expect(f.writes()).toBe(8);
  });
  it("history/results/finish keep auth, strict pages, resolved-only snapshots and close even retired content", async () => {
    const f = fixture(); const state = await f.create(); const q = f.states.get(state.gameId)!.current!;
    expect((await (await f.request(`/${state.gameId}/results`)).json()).items).toEqual([]);
    await f.request(`/${state.gameId}/actions`, { actionId: crypto.randomUUID(), questionId: q.questionId, kind: "reveal" });
    const before = await (await f.request(`/${state.gameId}/results`)).json(); expect(before.items).toHaveLength(1); expect(before.items[0]).toMatchObject({ word: q.answer, outcome: "revealed" }); expect(JSON.stringify(before)).not.toMatch(/current|pool|remaining|correctOptionId/);
    for (const word of f.source) word.contentVersion++;
    expect(await (await f.request(`/${state.gameId}/results`)).json()).toEqual(before);
    expect((await f.request(`/${state.gameId}/finish`, { actionId: crypto.randomUUID() })).status).toBe(200);
    expect((await f.request("", undefined, "other")).status).toBe(403);
    expect((await f.request(`/${state.gameId}/results`, undefined, "other")).status).toBe(403);
    expect((await f.request(`/${state.gameId}/finish`, { actionId: crypto.randomUUID() }, "other")).status).toBe(403);
    expect((await f.request(`/${state.gameId}/finish`, { actionId: crypto.randomUUID(), score: 999 })).status).toBe(400);
    for (const query of ["?page=0", "?recordsPage=foo", "?page=1&page=2", "?scope=all"]) expect((await f.request(query)).status).toBe(400);
    const second = await (await f.request("?page=2&recordsPage=2")).json(); expect(second.items).toEqual([]); expect(second.records).toEqual([]); expect(second.totalGames).toBe(1);
  });
  it("serializes finalization against resolution without later score changes", async () => {
    const f = fixture(); const state = await f.create(); const q = f.states.get(state.gameId)!.current!;
    const responses = await Promise.all([f.request(`/${state.gameId}/finish`, { actionId: crypto.randomUUID() }), f.request(`/${state.gameId}/actions`, { actionId: crypto.randomUUID(), questionId: q.questionId, kind: "type-answer", text: q.answer })]);
    expect(responses[0]!.status).toBe(200); expect([200, 409]).toContain(responses[1]!.status);
    const ended = await (await f.request(`/${state.gameId}`)).json(); expect(ended.status).toBe("ended"); expect([0, 10]).toContain(ended.score);
    expect((await (await f.request()).json()).records[0].finalizedGames).toBe(1);
  });
});
