import { clearPublicLearningCache, requestPublicLearningIndex, requestPublicWords, requestPublicBrowse, requestPublicMatchingIds } from "./public-learning-client";
import {
  reviewRequestSchema,
  reviewResponseSchema, updateLearnerSettingsRequestSchema,
  type PublicLearningIndex, type VocabularyDto, type ReviewQueueResponse, type ReviewRequest, type LearnerVocabularyDto, type WeakWordsItem
} from "@vocabflow/contracts";
import { scheduleReview, type SchedulerState } from "@vocabflow/learning-domain";
import { GUEST_ID, guestToday, readGuestState, mutateGuestState, type GuestState } from "./guest-store";

let guestCatalogEnabled = false;
export function setGuestCatalogEnabled(enabled: boolean) { guestCatalogEnabled = enabled; }
export const clearLearningCatalogCache = clearPublicLearningCache;
type IndexWord = PublicLearningIndex["vocabulary"][number];
const catalog = requestPublicLearningIndex;
function json(value: unknown, status = 200) { return new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } }); }
function failure(code: string, status = 409) { return json({ error: { code, message: "Không thể hoàn tất. Vui lòng thử lại." } }, status); }
function normalize(text: string) { return text.normalize("NFKC").trim().toLocaleLowerCase("vi-VN"); }
function learnedWord(word: VocabularyDto, state: GuestState): LearnerVocabularyDto {
  return { ...word, status: state.progress[word.id]?.status ?? "NEW", nextReviewDate: state.progress[word.id]?.nextReviewDate ?? null };
}
function history(state: GuestState, date: string) {
  const events = Object.values(state.receipts).filter((event) => event.date === date);
  return { date, reviews: events.length, uniqueWords: new Set(events.map((event) => event.request.vocabularyId)).size,
    remembered: events.filter((event) => event.response.result === "REMEMBERED").length,
    forgotten: events.filter((event) => event.response.result === "FORGOTTEN").length,
    newLearned: events.filter((event) => event.isNew).length };
}
function previousDate(date: string, amount: number) {
  const value = new Date(`${date}T00:00:00Z`); value.setUTCDate(value.getUTCDate() - amount); return value.toISOString().slice(0, 10);
}
function activity(state: GuestState) {
  const today = guestToday(); const events = history(state, today);
  const goal = (target: number, completed: number) => ({ goal: target, completed, remaining: Math.max(0, target - completed), percent: Math.min(100, Math.round(completed / target * 100)) });
  const newWords = goal(state.settings.dailyNewWordGoal, events.newLearned);
  const reviewedWords = new Set(Object.values(state.receipts).filter((event) => event.date === today && !event.isNew).map((event) => event.request.vocabularyId)).size;
  const reviews = goal(state.settings.dailyReviewWordGoal, reviewedWords);
  const dates = [...new Set(Object.values(state.receipts).map((event) => event.date))].sort();
  let longestStreak = 0; let running = 0; let last = "";
  for (const date of dates) { running = last === previousDate(date, 1) ? running + 1 : 1; longestStreak = Math.max(longestStreak, running); last = date; }
  let currentStreak = 0;
  for (let date = dates.includes(today) ? today : previousDate(today, 1); dates.includes(date); date = previousDate(date, 1)) currentStreak += 1;
  return { learnerId: GUEST_ID, localDate: today,
    dailyGoal: { newWords, reviews, overallPercent: Math.round((newWords.percent + reviews.percent) / 2), completed: newWords.remaining === 0 && reviews.remaining === 0 },
    streak: { currentStreak, longestStreak, todayActive: events.reviews > 0 } };
}
function weakData(data: PublicLearningIndex, state: GuestState) {
  const today = guestToday();
  const events = Object.values(state.receipts).filter((event) => event.date >= previousDate(today, 29) && event.date <= today);
  const items: (Omit<WeakWordsItem, "vocabulary"> & { vocabulary: IndexWord })[] = data.vocabulary.filter((word) => state.progress[word.id]).map((word) => {
    const progress = state.progress[word.id]!;
    const recent = events.filter((event) => event.request.vocabularyId === word.id).slice(-10);
    const count = recent.length; const remembered = recent.filter((event) => event.response.result === "REMEMBERED").length;
    const days = Math.round((Date.parse(`${progress.nextReviewDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);
    return { vocabulary: word, learningState: progress.status,
      weaknessStatus: count >= 2 && remembered * 100 < count * 60 ? "WEAK" : progress.status === "MASTERED" ? "STABLE" : "LEARNING",
      recentAccuracy: count ? Math.round(remembered / count * 100) : null,
      reviewCount: count, rememberedCount: remembered, forgottenCount: count - remembered, nextReviewDate: progress.nextReviewDate,
      dueStatus: days < 0 ? "OVERDUE" : days === 0 ? "DUE_TODAY" : "UPCOMING", daysUntilDue: days, expectedRevision: progress.revision };
  });
  const rank = (item: Omit<WeakWordsItem, "vocabulary">) => (item.weaknessStatus === "WEAK" ? 0 : item.weaknessStatus === "LEARNING" ? 3 : 7) + ((item.daysUntilDue ?? 1) < 0 ? 0 : item.daysUntilDue === 0 ? 1 : 2);
  items.sort((a, b) => rank(a) - rank(b) || (a.recentAccuracy ?? 101) - (b.recentAccuracy ?? 101) || (a.nextReviewDate ?? "").localeCompare(b.nextReviewDate ?? "") || a.vocabulary.id - b.vocabulary.id);
  return { items, summary: { weakCount: items.filter((item) => item.weaknessStatus === "WEAK").length,
    dueCount: items.filter((item) => (item.daysUntilDue ?? 1) <= 0).length,
    recentAccuracy: events.length ? Math.round(events.filter((event) => event.response.result === "REMEMBERED").length / events.length * 100) : null,
    recentReviewCount: events.length } };
}
function scopedWords(data: PublicLearningIndex, state: GuestState, params: URLSearchParams) {
  let ids: number[] | undefined;
  if (params.has("topicId")) ids = data.topics.find((item) => item.id === Number(params.get("topicId")))?.vocabularyIds ?? [];
  else if (params.has("learningSetId")) ids = data.learningSets.find((item) => item.id === Number(params.get("learningSetId")))?.vocabularyIds ?? [];
  else if (params.get("scope") === "saved") ids = Object.keys(state.saved).map(Number);
  else if (params.get("scope") === "weak") ids = weakData(data, state).items.filter((item) => item.weaknessStatus === "WEAK").slice(0, 30).map((item) => item.vocabulary.id);
  else if (params.get("source") === "custom") {
    const selected = (params.get("setIds") ?? "").split(",").map(Number);
    ids = data.learningSets.filter((item) => selected.includes(item.id)).flatMap((item) => item.vocabularyIds);
  } else {
    // Match the account V2 queue: default, pathway and all use the enabled dataset.
    // Membership only narrows explicitly selected sets/topics, not unclassified words.
    return data.vocabulary;
  }
  const byId = new Map(data.vocabulary.map((word) => [word.id, word]));
  return [...new Set(ids)].flatMap((id) => byId.get(id) ? [byId.get(id)!] : []);
}
async function queue(data: PublicLearningIndex, state: GuestState, params: URLSearchParams): Promise<ReviewQueueResponse> {
  const today = guestToday(); const words = scopedWords(data, state, params);
  const remaining = Math.max(0, state.settings.dailyNewWordLimit - history(state, today).newLearned);
  const due = words.filter((word) => state.progress[word.id] && state.progress[word.id]!.nextReviewDate <= today)
    .sort((a, b) => state.progress[a.id]!.nextReviewDate.localeCompare(state.progress[b.id]!.nextReviewDate) || a.id - b.id);
  const fresh = words.filter((word) => !state.progress[word.id]);
  const voluntary = params.get("scope") === "weak" || params.get("content") === "all";
  const limit = Number(params.get("capacity")) || 20;
  const allowedFresh = new Set(fresh.slice(0, remaining).map((word) => word.id));
  const items = voluntary ? words.filter((word) => state.progress[word.id] || allowedFresh.has(word.id)) : [...due.slice(0, limit), ...fresh.slice(0, Math.min(params.has("capacity") ? limit : 10, remaining))];
  const details = new Map((await requestPublicWords(items.map((word) => word.id))).map((word) => [word.id, word]));
  return { learnerId: GUEST_ID, reviewDate: today, dueCount: due.length, newCount: fresh.length, dailyNewRemaining: Math.min(fresh.length, remaining),
    queue: items.filter((word) => details.has(word.id)).map((word) => ({ vocabulary: details.get(word.id)!, status: state.progress[word.id]?.status ?? "NEW",
      nextReviewDate: state.progress[word.id]?.nextReviewDate ?? null, expectedRevision: state.progress[word.id]?.revision ?? 0,
      queueType: state.progress[word.id] ? state.progress[word.id]!.nextReviewDate <= today ? "DUE" : "VOLUNTARY" : "NEW" })) };
}
async function review(input: ReviewRequest) {
  const confirmed = readGuestState().receipts[input.reviewId];
  if (confirmed) return JSON.stringify(confirmed.request) === JSON.stringify(input)
    ? json(confirmed.response) : failure("IDEMPOTENCY_CONFLICT");
  const word = (await requestPublicWords([input.vocabularyId]))[0];
  if (!word) return failure("VOCABULARY_NOT_FOUND", 404);
  return mutateGuestState((state) => {
    const receipt = state.receipts[input.reviewId];
    if (receipt) {
      if (JSON.stringify(receipt.request) !== JSON.stringify(input)) return failure("IDEMPOTENCY_CONFLICT");
      return json(receipt.response);
    }
    const prior = state.progress[word.id];
    if ((prior?.revision ?? 0) !== input.expectedRevision) return failure("STALE_REVISION");
    const today = guestToday();
    if (!prior && history(state, today).newLearned >= state.settings.dailyNewWordLimit) return failure("DAILY_NEW_LIMIT_REACHED");
    const submission = input.exerciseSubmission;
    const correct = !submission ? null : submission.type === "TYPE_WORD" ? normalize(submission.answer) === normalize(word.word)
      : submission.type === "MULTIPLE_CHOICE_MEANING" ? normalize(submission.answer) === normalize(word.vietnamese) : submission.selectedVocabularyId === word.id;
    if (correct !== null && input.result !== (correct ? "REMEMBERED" : "FORGOTTEN")) return failure("INVALID_REQUEST", 400);
    const currentState: SchedulerState = prior ? (({ revision: _revision, ...scheduler }) => scheduler)(prior) : {
      status: "NEW", consecutiveCorrect: 0, intervalDays: 0, firstLearnedDate: null, lastReviewedDate: null, nextReviewDate: null, totalCorrect: 0, totalIncorrect: 0
    };
    const progress = { ...scheduleReview({ currentState, result: input.result, today }), revision: (prior?.revision ?? 0) + 1 };
    const response = reviewResponseSchema.parse({ reviewId: input.reviewId, learnerId: GUEST_ID, vocabularyId: word.id, result: input.result, progress });
    state.progress[word.id] = progress;
    state.receipts[input.reviewId] = { request: input, response, date: today, isNew: !prior };
    return json(response);
  });
}

/** Only the fixed guest identity is routed locally. Account writes use the server. */
export async function learningFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = new URL(path, window.location.origin);
  const method = init?.method ?? "GET";
  const publicCatalogPath = guestCatalogEnabled && /^\/api\/(vocabulary|topics(?:\/\d+\/vocabulary)?|learning-sets(?:\/\d+)?)$/.test(url.pathname);
  const guestPath = url.pathname.startsWith(`/api/learners/${GUEST_ID}/`);
  const input = url.pathname === "/api/reviews" && typeof init?.body === "string" ? reviewRequestSchema.safeParse(JSON.parse(init.body)) : null;
  if (!publicCatalogPath && !guestPath && !(input?.success && input.data.learnerId === GUEST_ID)) return fetch(path, init);
  if (init?.signal?.aborted) throw new DOMException("Aborted", "AbortError");
  try {
    const params = url.searchParams;
    const resource = guestPath ? url.pathname.split("/").slice(4).join("/") : "";
    const body: unknown = typeof init?.body === "string" ? JSON.parse(init.body) : null;
    const state = guestPath || input?.success ? readGuestState() : null;
    if (input?.success) return await review(input.data);
    if (state && resource === "activity-summary") return json(activity(state));
    if (state && resource === "gamification") {
      const total = Object.values(state.receipts).reduce((sum, event) => sum + 10 + (event.request.exerciseSubmission && event.response.result === "REMEMBERED" ? 5 : 0), 0);
      return json({ learnerId: GUEST_ID, xp: { total, level: Math.floor(total / 100) + 1, xpIntoLevel: total % 100, xpPerLevel: 100, xpToNextLevel: 100 - total % 100 }, achievements: [] });
    }
    if (state && resource === "progress-history") {
      const from = params.get("from") ?? guestToday(); const to = params.get("to") ?? guestToday(); const days = [];
      for (let date = from; date <= to && days.length < 366; date = previousDate(date, -1)) days.push(history(state, date));
      return json({ learnerId: GUEST_ID, timezone: "Asia/Ho_Chi_Minh", from, to, days });
    }
    if (resource === "settings") {
      if (method === "GET") return json(state!.settings);
      const patch = updateLearnerSettingsRequestSchema.parse(body);
      return await mutateGuestState((fresh) => { fresh.settings = { ...fresh.settings, ...patch }; return json(fresh.settings); });
    }
    if (resource === "reset-progress" && method === "POST") return await mutateGuestState((fresh) => {
      const deletedProgressCount = Object.keys(fresh.progress).length; fresh.progress = {}; fresh.receipts = {};
      return json({ learnerId: GUEST_ID, deletedProgressCount });
    });
    if (resource.startsWith("saved-vocabulary/")) {
      const id = Number(resource.split("/")[1]);
      if (!Number.isSafeInteger(id) || id <= 0) return failure("INVALID_REQUEST", 400);
      if (method !== "DELETE" && !(await requestPublicWords([id])).length) return failure("VOCABULARY_NOT_FOUND", 404);
      return await mutateGuestState((fresh) => {
        if (method === "DELETE") delete fresh.saved[id]; else fresh.saved[id] ??= new Date().toISOString();
        return json({ learnerId: GUEST_ID, vocabularyId: id, saved: method !== "DELETE", savedAt: fresh.saved[id] ?? null });
      });
    }
    if (state && resource === "saved-vocabulary") {
      const words = await requestPublicWords(Object.keys(state.saved).map(Number));
      return json({ savedVocabulary: words.map((word) => ({ vocabulary: learnedWord(word, state), savedAt: state.saved[word.id] })) });
    }
    if (state && resource === "vocabulary" && params.has("id")) {
      const words = await requestPublicWords([Number(params.get("id"))]);
      return json({ vocabulary: words.map((word) => learnedWord(word, state)) });
    }
    if (state && resource === "vocabulary/browse") {
      const page = await requestPublicBrowse(params, init?.signal ?? undefined);
      return json({ ...page, vocabulary: page.vocabulary.map((word) => ({ ...word, status: state.progress[word.id]?.status ?? "NEW", nextReviewDate: state.progress[word.id]?.nextReviewDate ?? null })) });
    }
    const data = await catalog();
    if (init?.signal?.aborted) throw new DOMException("Aborted", "AbortError");
    if (publicCatalogPath) {
      if (method !== "GET") return failure("INVALID_REQUEST", 400);
      if (url.pathname === "/api/topics") return json({ topics: data.topics.map(({ vocabularyIds: _ids, ...topic }) => topic) });
      if (url.pathname === "/api/learning-sets") return json({ learningSets: data.learningSets.map(({ vocabularyIds: _ids, ...set }) => set) });
      return failure("INVALID_REQUEST", 400);
    }
    if (!state) return failure("INVALID_REQUEST", 400);
    if (resource.startsWith("learning-sets/")) {
      const id = Number(resource.split("/")[1]);
      return await mutateGuestState((fresh) => { fresh.assignments[id] = method !== "DELETE"; return json({ learnerId: GUEST_ID, learningSetId: id, active: method !== "DELETE" }); });
    }
    const words = data.vocabulary.map((word): IndexWord & Pick<LearnerVocabularyDto, "status" | "nextReviewDate"> => ({ ...word, status: state.progress[word.id]?.status ?? "NEW", nextReviewDate: state.progress[word.id]?.nextReviewDate ?? null }));
    const today = guestToday();
    if (resource === "review-queue") return json(await queue(data, state, params));
    if (resource === "learning-sets") return json({ learningSets: data.learningSets.map(({ vocabularyIds: _ids, ...set }) => ({ learningSet: set, active: state.assignments[set.id] !== false })) });
    if (resource === "progress-summary") return json({ learnerId: GUEST_ID, newCount: words.filter((word) => word.status === "NEW").length,
      learningCount: words.filter((word) => word.status === "LEARNING").length, masteredCount: words.filter((word) => word.status === "MASTERED").length,
      dueCount: words.filter((word) => word.nextReviewDate && word.nextReviewDate <= today).length, learnedCount: words.filter((word) => word.status !== "NEW").length,
      progressByLevel: [...new Set(words.map((word) => word.level))].map((level) => ({ level, total: words.filter((word) => word.level === level).length,
        learnedCount: words.filter((word) => word.level === level && word.status !== "NEW").length, masteredCount: words.filter((word) => word.level === level && word.status === "MASTERED").length })) });
    if (resource === "topic-progress") return json({ learnerId: GUEST_ID, localDate: guestToday(), topics: data.topics.map((topic) => {
      const items = words.filter((word) => topic.vocabularyIds.includes(word.id));
      return { topicId: topic.id, slug: topic.slug, name: topic.name, total: items.length, newCount: items.filter((word) => word.status === "NEW").length,
        learningCount: items.filter((word) => word.status === "LEARNING").length, masteredCount: items.filter((word) => word.status === "MASTERED").length,
        dueCount: items.filter((word) => word.nextReviewDate && word.nextReviewDate <= today).length };
    }) });
    if (resource === "continue-learning") {
      const set = data.learningSets.find((item) => { const count = item.vocabularyIds.filter((id) => state.progress[id]).length; return count > 0 && count < item.vocabularyIds.length; });
      const learnedCount = set?.vocabularyIds.filter((id) => state.progress[id]).length ?? 0;
      return json({ learnerId: GUEST_ID, candidate: set ? { scope: "LEARNING_SET", scopeId: set.id, title: set.name, totalCount: set.vocabularyIds.length, learnedCount,
        progressPercent: Math.round(learnedCount / set.vocabularyIds.length * 100), lastActivityAt: null } : null });
    }
    if (resource === "search") {
      const query = params.get("q") ?? ""; const matches = (text: string) => normalize(text).includes(normalize(query));
      const page = await requestPublicBrowse(new URLSearchParams({ page: "1", pageSize: "20", q: query }), init?.signal ?? undefined);
      return json({ query, vocabulary: page.vocabulary.slice(0, 10).map((word) => ({ type: "VOCABULARY", id: word.id, title: word.word, subtitle: word.shortMeaningVi ?? word.vietnamese,
        subtitleLabel: word.shortMeaningVi ? "Nghĩa tiếng Việt" : "Giải thích nghĩa", imageUrl: word.imageUrl, topic: word.topic, level: word.level })),
        topics: data.topics.filter((topic) => matches(topic.name)).slice(0, 10).map((topic) => ({ type: "TOPIC", id: topic.id, title: topic.name, description: topic.description })),
        learningSets: data.learningSets.filter((set) => matches(set.name)).slice(0, 10).map((set) => ({ type: "LEARNING_SET", id: set.id, title: set.name, description: set.description, vocabularyCount: set.vocabularyCount, grade: set.grade })) });
    }
    if (resource === "weak-words") {
      const result = weakData(data, state);
      let items = result.items;
      const summary = result.summary;
      if (params.get("status")) items = items.filter((item) => item.weaknessStatus.toLowerCase() === params.get("status"));
      else items = items.filter((item) => item.weaknessStatus === "WEAK" || (item.daysUntilDue ?? 1) <= 0);
      if (params.get("q")) {
        const ids = await requestPublicMatchingIds(params.get("q")!, init?.signal ?? undefined);
        items = items.filter((item) => ids.has(item.vocabulary.id));
      }
      const page = Number(params.get("page")) || 1; const pageSize = Number(params.get("pageSize")) || 20;
      const selected = items.slice((page - 1) * pageSize, page * pageSize);
      const details = new Map((await requestPublicWords(selected.map((item) => item.vocabulary.id))).map((word) => [word.id, word]));
      return json({ learnerId: GUEST_ID, reviewDate: today, summary, items: selected.filter((item) => details.has(item.vocabulary.id)).map((item) => ({ ...item, vocabulary: details.get(item.vocabulary.id)! })), pagination: { page, pageSize, totalItems: items.length, totalPages: Math.ceil(items.length / pageSize) } });
    }
    return failure("NOT_FOUND", 404);
  } catch (error) {
    if (init?.signal?.aborted) throw error;
    return failure(error instanceof Error && error.message.startsWith("GUEST_") ? "GUEST_STORAGE_UNAVAILABLE" : "INTERNAL_ERROR", 503);
  }
}
