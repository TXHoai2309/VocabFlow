import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useLocation, useSearchParams } from "react-router";
import type {
  LearnerDto,
  ExerciseSubmission,
  ReviewQueueItem,
  ReviewRequest,
  ReviewResult,
  ReviewResponse
} from "@vocabflow/contracts";
import { useActiveLearner } from "../learners/learner-context-hook";
import { ReviewQueueClientError } from "./review-queue-client";
import { requestScopedReviewQueue, selectStudyQueue, studyScopeFromParams, studySelectionFromParams, type StudyScope, type StudySelection } from "./study-queue";
import { ReviewClientError, submitReview } from "./review-client";
import { Flashcard } from "./flashcard";
import { ExerciseCard, type ExerciseAnswer } from "./exercise-card";
import {
  createExercise,
  EXERCISE_TYPE,
  exerciseSubmissionForOption,
  normalizeExerciseAnswer,
  TYPE_WORD_CUE,
  type ExerciseInstance,
  type ExerciseType,
  type TypeWordCue
} from "./exercise-generator";

type StudyState = "loading" | "empty" | "error" | "ready" | "answered" | "saving" | "save-failed" | "reconciling" | "summary";
export type StudyMode = "flashcard" | "exercise";

type SessionCard = {
  item: ReviewQueueItem;
  reinforcementAttempt: number;
  reviewId: string | null;
};

type SessionMetrics = {
  scheduledReviews: number;
  remembered: number;
  forgotten: number;
  reinforcement: number;
};

type PendingReview = {
  request: ReviewRequest;
  card: SessionCard;
};

const SAFE_QUEUE_ERROR = "Không thể tải danh sách học lúc này. Vui lòng thử lại.";
const SAFE_SAVE_ERROR = "Không thể lưu tiến trình lúc này. Vui lòng thử lại.";

function sessionCards(queue: ReviewQueueItem[]): SessionCard[] {
  return queue.map((item) => ({ item, reinforcementAttempt: 0, reviewId: null }));
}

function studySetupHref(scope: StudyScope | null) {
  const params = new URLSearchParams();
  if (scope?.type === "topic" || scope?.type === "learning-set") {
    params.set(scope.type === "topic" ? "topicId" : "learningSetId", String(scope.id));
  }
  const query = params.toString();
  return query ? `/study/setup?${query}` : "/study/setup";
}

function studyReturnHref(state: unknown, scope: StudyScope | null) {
  if (state && typeof state === "object" && "returnTo" in state) {
    const returnTo = (state as { returnTo?: unknown }).returnTo;
    if (typeof returnTo === "string" && returnTo.startsWith("/") && !returnTo.startsWith("//")) return returnTo;
  }
  return studySetupHref(scope);
}

function studyContentLabel(content: StudySelection["content"] | undefined) {
  if (content === "new") return "Từ mới";
  if (content === "review") return "Ôn tập";
  if (content === "mixed") return "Kết hợp";
  return null;
}

function applyCanonicalReviewResponse(card: SessionCard, response: ReviewResponse): SessionCard {
  return {
    ...card,
    item: {
      ...card.item,
      status: response.progress.status,
      nextReviewDate: response.progress.nextReviewDate,
      expectedRevision: response.progress.revision
    }
  };
}

function createReviewId() {
  if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function queueErrorMessage(error: unknown) {
  if (!(error instanceof ReviewQueueClientError)) return SAFE_QUEUE_ERROR;
  if (error.status === 401 || error.code === "UNAUTHORIZED") {
    return "Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.";
  }
  if (error.status === 403 || error.code === "HOUSEHOLD_ACCESS_DENIED") {
    return "Không thể tiếp tục với người học này. Vui lòng chọn lại.";
  }
  return SAFE_QUEUE_ERROR;
}

function isLoginError(error: unknown) {
  return (error instanceof ReviewQueueClientError || error instanceof ReviewClientError)
    && (error.status === 401 || error.code === "UNAUTHORIZED");
}

function isLearnerAccessError(error: unknown) {
  return (error instanceof ReviewQueueClientError || error instanceof ReviewClientError)
    && (error.status === 403 || error.code === "HOUSEHOLD_ACCESS_DENIED");
}

function saveErrorMessage(error: unknown) {
  if (isLoginError(error)) return "Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.";
  if (isLearnerAccessError(error)) return "Không thể tiếp tục với người học này. Vui lòng chọn lại.";
  return SAFE_SAVE_ERROR;
}

export function StudyPage({ mode = "flashcard", exercisePreference }: { mode?: StudyMode; exercisePreference?: ExerciseType } = {}) {
  const { activeLearner } = useActiveLearner();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const scope = useMemo(() => studyScopeFromParams(searchParams), [searchParams]);
  const selection = useMemo(() => studySelectionFromParams(searchParams), [searchParams]);
  const scopeKey = scope ? `${scope.type}:${"id" in scope ? scope.id : "invalid"}` : "all";
  const selectionKey = selection ? `${selection.content}:${selection.amount}` : "default";
  const returnTo = useMemo(() => studyReturnHref(location.state, scope), [location.state, scope]);
  if (!activeLearner) return <Navigate to="/learners" replace />;
  return <StudyExperience key={`${activeLearner.id}:${mode}:${exercisePreference ?? "default"}:${scopeKey}:${selectionKey}`} activeLearner={activeLearner} mode={mode} exercisePreference={exercisePreference} scope={scope} selection={selection} returnTo={returnTo} />;
}

export function ExerciseStudyPage() {
  const [searchParams] = useSearchParams();
  const requestedType = searchParams.get("type");
  const exercisePreference = Object.values(EXERCISE_TYPE).includes(requestedType as ExerciseType)
    ? requestedType as ExerciseType
    : undefined;
  return <StudyPage mode="exercise" exercisePreference={exercisePreference} />;
}

function StudyExperience({ activeLearner, mode, exercisePreference, scope, selection, returnTo }: { activeLearner: LearnerDto; mode: StudyMode; exercisePreference?: ExerciseType; scope: StudyScope | null; selection: StudySelection | null; returnTo: string }) {
  const [state, setState] = useState<StudyState>("loading");
  const [cards, setCards] = useState<SessionCard[]>([]);
  const [baseQueueLength, setBaseQueueLength] = useState(0);
  const [metrics, setMetrics] = useState<SessionMetrics>({
    scheduledReviews: 0,
    remembered: 0,
    forgotten: 0,
    reinforcement: 0
  });
  const [message, setMessage] = useState<string | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [pending, setPending] = useState<PendingReview | null>(null);
  const [lastAnswer, setLastAnswer] = useState<ReviewResult | null>(null);
  const [exerciseAnswer, setExerciseAnswer] = useState<ExerciseAnswer | null>(null);
  const [exerciseResetVersion, setExerciseResetVersion] = useState(0);
  const [exerciseFallbackType, setExerciseFallbackType] = useState<ExerciseType | "flashcard" | null>(null);
  const [exerciseBlockedCues, setExerciseBlockedCues] = useState<TypeWordCue[]>([]);
  const cardsRef = useRef<SessionCard[]>([]);

  const currentCard = cards[0] ?? null;
  const currentExercise: ExerciseInstance | null = useMemo(() => mode === "exercise" && currentCard && exerciseFallbackType !== "flashcard"
    ? createExercise(currentCard.item, cards.map((card) => card.item), {
      preferredType: exerciseFallbackType ?? exercisePreference,
      blockedCues: exerciseBlockedCues
    })
    : null, [cards, currentCard, exerciseBlockedCues, exerciseFallbackType, exercisePreference, mode]);
  const useExerciseCard = mode === "exercise"
    && currentExercise !== null
    && exerciseFallbackType !== "flashcard";

  useEffect(() => {
    cardsRef.current = cards;
  }, [cards]);

  const loadQueue = useCallback(async () => {
    setState("loading");
    setMessage(null);
    setPending(null);
    setLastAnswer(null);
    setExerciseAnswer(null);
    setExerciseResetVersion((version) => version + 1);
    setExerciseFallbackType(null);
    setExerciseBlockedCues([]);
    setIsFlipped(false);
    try {
      const scopedResponse = await requestScopedReviewQueue(activeLearner.id, scope);
      const response = selection ? selectStudyQueue(scopedResponse, selection) : scopedResponse;
      const nextCards = sessionCards(response.queue);
      cardsRef.current = nextCards;
      setBaseQueueLength(response.queue.length);
      setCards(nextCards);
      setState(nextCards.length === 0 ? "empty" : "ready");
    } catch (error) {
      setState("error");
      setMessage(queueErrorMessage(error));
    }
  }, [activeLearner.id, scope, selection]);

  useEffect(() => {
    void Promise.resolve().then(() => loadQueue());
  }, [loadQueue]);

  const replaceCards = useCallback((nextCards: SessionCard[], resetPresentation = true) => {
    cardsRef.current = nextCards;
    if (resetPresentation) {
      setIsFlipped(false);
    }
    setCards(nextCards);
  }, []);

  const reconcileQueue = useCallback(async (card: SessionCard, reason: "stale" | "conflict") => {
    setState("reconciling");
    setMessage("Đang tải lại tiến trình mới nhất…");
    try {
      const scopedResponse = await requestScopedReviewQueue(activeLearner.id, scope);
      const response = selection ? selectStudyQueue(scopedResponse, selection) : scopedResponse;
      const canonicalCards = sessionCards(response.queue);
      const matchingCard = canonicalCards.find((candidate) => candidate.item.vocabulary.id === card.item.vocabulary.id);
      const nextCards = matchingCard
        ? [matchingCard, ...canonicalCards.filter((candidate) => candidate !== matchingCard)]
        : canonicalCards;
      replaceCards(nextCards);
      setPending(null);
      setLastAnswer(null);
      setExerciseAnswer(null);
      setExerciseFallbackType(null);
      setExerciseBlockedCues([]);
      setMessage(matchingCard
        ? reason === "stale"
          ? "Tiến trình đã thay đổi. Hãy đánh giá lại thẻ này."
          : "Lượt ôn tập này đã được ghi nhận với dữ liệu khác. Hãy đánh giá lại thẻ này."
        : "Tiến trình đã được cập nhật. Thẻ này không còn trong danh sách học.");
      setState(nextCards.length === 0 ? "summary" : "ready");
    } catch (error) {
      setPending(null);
      setState(isLoginError(error) || isLearnerAccessError(error) ? "error" : "save-failed");
      setMessage(isLoginError(error)
        ? "Phiên đăng nhập đã hết. Vui lòng đăng nhập lại."
        : isLearnerAccessError(error)
          ? "Không thể tiếp tục với người học này. Vui lòng chọn lại."
          : "Không thể cập nhật tiến trình lúc này. Vui lòng tải lại danh sách học.");
    }
  }, [activeLearner.id, replaceCards, scope, selection]);

  const advanceScheduledCard = useCallback((card: SessionCard, response: ReviewResponse) => {
    const canonicalCard = applyCanonicalReviewResponse(card, response);
    const result = response.result;
    const remaining = cardsRef.current.slice(1);
    const reinforcement = result === "FORGOTTEN"
      ? [{ ...canonicalCard, reinforcementAttempt: 1, reviewId: null }]
      : [];
    const nextCards = [...remaining, ...reinforcement];
    replaceCards(nextCards);
    setMetrics((current) => ({
      ...current,
      scheduledReviews: current.scheduledReviews + 1,
      remembered: current.remembered + (result === "REMEMBERED" ? 1 : 0),
      forgotten: current.forgotten + (result === "FORGOTTEN" ? 1 : 0)
    }));
    setPending(null);
    setLastAnswer(null);
    setExerciseAnswer(null);
    setExerciseFallbackType(null);
    setExerciseBlockedCues([]);
    setMessage(null);
    setIsFlipped(false);
    setState(nextCards.length === 0 ? "summary" : "ready");
  }, [replaceCards]);

  const saveScheduledReview = useCallback(async (request: ReviewRequest, card: SessionCard) => {
    try {
      const response = await submitReview(request);
      advanceScheduledCard(card, response);
    } catch (error) {
      if (error instanceof ReviewClientError && error.code === "STALE_REVISION") {
        await reconcileQueue(card, "stale");
        return;
      }
      if (error instanceof ReviewClientError && error.code === "IDEMPOTENCY_CONFLICT") {
        await reconcileQueue(card, "conflict");
        return;
      }
      setState(isLoginError(error) || isLearnerAccessError(error) ? "error" : "save-failed");
      setMessage(saveErrorMessage(error));
    }
  }, [advanceScheduledCard, reconcileQueue]);

  const answerCard = useCallback((result: ReviewResult) => {
    if (!currentCard || state !== "ready") return;
    if (currentCard.reinforcementAttempt > 0) {
      setLastAnswer(result);
      setMessage(null);
      setState("answered");
      return;
    }

    const reviewId = currentCard.reviewId ?? createReviewId();
    const request: ReviewRequest = {
      reviewId,
      learnerId: activeLearner.id,
      vocabularyId: currentCard.item.vocabulary.id,
      result,
      expectedRevision: currentCard.item.expectedRevision
    };
    const card = { ...currentCard, reviewId };
    const nextCards = cardsRef.current.map((candidate, index) => index === 0 ? card : candidate);
    replaceCards(nextCards, false);
    setLastAnswer(result);
    setMessage(null);
    setState("answered");
    setPending({ request, card });
  }, [activeLearner.id, currentCard, replaceCards, state]);

  const answerExercise = useCallback((optionId: string, exerciseSubmission: ExerciseSubmission) => {
    if (!currentCard || !currentExercise || !useExerciseCard || state !== "ready" || exerciseAnswer) return;
    const result: ReviewResult = currentExercise.exerciseType === EXERCISE_TYPE.TYPE_WORD
      ? normalizeExerciseAnswer(exerciseSubmission.type === EXERCISE_TYPE.TYPE_WORD ? exerciseSubmission.answer : "")
        === normalizeExerciseAnswer(currentExercise.correctAnswer ?? "")
        ? "REMEMBERED"
        : "FORGOTTEN"
      : optionId === currentExercise.correctOptionId ? "REMEMBERED" : "FORGOTTEN";

    if (currentCard.reinforcementAttempt > 0) {
      setExerciseAnswer({ optionId, result });
      setLastAnswer(result);
      setState("answered");
      return;
    }

    const reviewId = currentCard.reviewId ?? createReviewId();
    const request: ReviewRequest = {
      reviewId,
      learnerId: activeLearner.id,
      vocabularyId: currentCard.item.vocabulary.id,
      result,
      expectedRevision: currentCard.item.expectedRevision,
      exerciseSubmission
    };
    const card = { ...currentCard, reviewId };
    const nextCards = cardsRef.current.map((candidate, index) => index === 0 ? card : candidate);
    replaceCards(nextCards, false);
    setExerciseAnswer({ optionId, result });
    setPending({ request, card });
    setLastAnswer(result);
    setMessage(null);
    setState("answered");
  }, [activeLearner.id, currentCard, currentExercise, exerciseAnswer, replaceCards, state, useExerciseCard]);

  const advanceReinforcement = useCallback((result: ReviewResult) => {
    if (!currentCard) return;
    const shouldReinsert = result === "FORGOTTEN" && currentCard.reinforcementAttempt < 2;
    const remaining = cardsRef.current.slice(1);
    const reinforcement = shouldReinsert
      ? [{ ...currentCard, reinforcementAttempt: currentCard.reinforcementAttempt + 1, reviewId: null }]
      : [];
    const nextCards = [...remaining, ...reinforcement];
    replaceCards(nextCards);
    setMetrics((current) => ({ ...current, reinforcement: current.reinforcement + 1 }));
    setPending(null);
    setLastAnswer(null);
    setExerciseAnswer(null);
    setExerciseFallbackType(null);
    setExerciseBlockedCues([]);
    setMessage(null);
    setState(nextCards.length === 0 ? "summary" : "ready");
  }, [currentCard, replaceCards]);

  const continueAfterAnswer = useCallback(() => {
    if (state !== "answered" || !currentCard || !lastAnswer) return;
    if (currentCard.reinforcementAttempt > 0) {
      advanceReinforcement(lastAnswer);
      return;
    }
    if (!pending) return;
    setState("saving");
    setMessage(null);
    void saveScheduledReview(pending.request, pending.card);
  }, [advanceReinforcement, currentCard, lastAnswer, pending, saveScheduledReview, state]);

  const undoAnswer = useCallback(() => {
    if (state !== "answered" || !currentCard) return;
    const resetCard = { ...currentCard, reviewId: null };
    replaceCards([resetCard, ...cardsRef.current.slice(1)], false);
    setPending(null);
    setLastAnswer(null);
    setExerciseAnswer(null);
    setExerciseResetVersion((version) => version + 1);
    setMessage(null);
    setState("ready");
  }, [currentCard, replaceCards, state]);

  const retrySave = () => {
    if (!pending) return;
    setState("saving");
    setMessage(null);
    void saveScheduledReview(pending.request, pending.card);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (typeof window.matchMedia === "function" && !window.matchMedia("(min-width: 1024px)").matches) return;
      if (event.defaultPrevented || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target;
      if (target instanceof Element && target.closest("input, textarea, select, button, a[href], [contenteditable='true'], [role='textbox'], [role='button']")) return;

      if (/^[1-9]$/.test(event.key) && state === "ready" && useExerciseCard && currentExercise) {
        const option = currentExercise.options[Number(event.key) - 1];
        if (!option) return;
        event.preventDefault();
        answerExercise(option.optionId, exerciseSubmissionForOption(currentExercise, option));
        return;
      }
      if (event.key === "Enter" && state === "answered") {
        event.preventDefault();
        continueAfterAnswer();
        return;
      }
      if (event.key.toLocaleLowerCase() === "z" && state === "answered") {
        event.preventDefault();
        undoAnswer();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [answerExercise, continueAfterAnswer, currentExercise, state, undoAnswer, useExerciseCard]);

  const handleExerciseMediaFailure = useCallback(() => {
    if (!currentCard || !currentExercise || state !== "ready" || exerciseAnswer || exerciseFallbackType === "flashcard") return;
    if (currentExercise.exerciseType === EXERCISE_TYPE.IMAGE_TO_WORD) {
      setExerciseFallbackType(EXERCISE_TYPE.TYPE_WORD);
      setExerciseBlockedCues([TYPE_WORD_CUE.IMAGE]);
      setMessage("Hình ảnh không khả dụng. Đã chuyển bài này sang gợi ý an toàn khác.");
      return;
    }
    if (currentExercise.exerciseType === EXERCISE_TYPE.TYPE_WORD && currentExercise.cueType) {
      if (exerciseBlockedCues.includes(currentExercise.cueType)) {
        setExerciseFallbackType("flashcard");
        setMessage("Nội dung đa phương tiện không khả dụng. Đã chuyển sang thẻ học.");
        return;
      }
      setExerciseFallbackType(EXERCISE_TYPE.TYPE_WORD);
      setExerciseBlockedCues((current) => [...new Set([...current, currentExercise.cueType!])]);
      setMessage("Nội dung đa phương tiện không khả dụng. Đã chuyển sang gợi ý khác.");
      return;
    }
    setExerciseFallbackType("flashcard");
    setMessage(currentExercise.exerciseType === EXERCISE_TYPE.LISTENING_CHOICE
      ? "Âm thanh không khả dụng. Đã chuyển sang thẻ học."
      : "Nội dung đa phương tiện không khả dụng. Đã chuyển sang thẻ học.");
  }, [currentCard, currentExercise, exerciseAnswer, exerciseBlockedCues, exerciseFallbackType, state]);

  const exerciseSaveState = state === "saving"
    ? "saving"
    : state === "save-failed"
      ? "save-failed"
      : state === "answered"
        ? "answered"
        : "ready";

  const handleExit = (event: React.MouseEvent<HTMLAnchorElement>) => {
    const hasUnsavedRisk = state === "answered" || state === "saving" || state === "save-failed" || pending !== null;
    if (!hasUnsavedRisk) return;
    const message = "Câu trả lời chưa được lưu. Bạn vẫn muốn thoát?";
    if (!globalThis.confirm(message)) {
      event.preventDefault();
    }
  };

  const progressTotal = baseQueueLength;
  const currentQuestion = progressTotal === 0 ? 0 : Math.min(progressTotal, metrics.scheduledReviews + 1);
  const progressPercent = progressTotal === 0 ? 0 : Math.round((currentQuestion / progressTotal) * 100);
  const selectedContentLabel = studyContentLabel(selection?.content);
  const sessionModeLabel = selectedContentLabel ?? (mode === "exercise" ? "Bài tập" : "Flashcard");
  const studyTitle = state === "summary" ? "Hoàn thành buổi học" : "Buổi học";

  return (
    <main className="study-page" aria-labelledby="study-title">
      <section className="study-shell">
        <header className="study-topbar">
          <div className="study-brand" aria-label="VocabFlow">
            <svg aria-hidden="true" viewBox="0 0 32 32" className="study-brand-mark">
              <path d="M4 6.5c4.8-.9 8.8-.1 12 2.2v17c-3.2-2.3-7.2-3.1-12-2.2z" fill="currentColor" />
              <path d="M28 6.5c-4.8-.9-8.8-.1-12 2.2v17c3.2-2.3 7.2-3.1 12-2.2z" fill="currentColor" opacity=".68" />
            </svg>
            <span>Vocab<span>Flow</span></span>
          </div>
          <Link className="study-exit-button" to={returnTo} onClick={handleExit}>
            <span aria-hidden="true">←</span> Thoát buổi học
          </Link>
          <div className="study-session-context" aria-label="Thiết lập buổi học">
            <span className="study-session-chip">{sessionModeLabel}</span>
            {progressTotal > 0 ? <span className="study-session-chip">{progressTotal} từ</span> : null}
          </div>
        </header>

        <h1 className="sr-only" id="study-title">{studyTitle}</h1>

        {state === "error" ? (
          <div className="study-state" data-testid="study-error-state" role="alert">
            <h2>Không thể mở phiên học</h2>
            <p>{message ?? SAFE_QUEUE_ERROR}</p>
            {message === "Phiên đăng nhập đã hết. Vui lòng đăng nhập lại." ? (
              <Link className="auth-retry study-state-link" to="/login">Đăng nhập lại</Link>
            ) : message === "Không thể tiếp tục với người học này. Vui lòng chọn lại." ? (
              <Link className="auth-retry study-state-link" to="/learners">Chọn lại người học</Link>
            ) : (
              <button className="auth-retry" type="button" onClick={() => void loadQueue()}>Thử lại</button>
            )}
          </div>
        ) : null}

        {state === "empty" ? (
          <div className="study-state" data-testid="study-empty-state" role="status">
            <h2>Không có từ phù hợp cho buổi học này</h2>
            <p>Thay đổi số từ, chế độ hoặc phạm vi học để bắt đầu.</p>
            <Link className="register-submit study-state-link" to={returnTo}>Quay lại thiết lập</Link>
          </div>
        ) : null}

        {state === "loading" ? (
          <div className="study-state study-loading-state" data-testid="study-loading" role="status" aria-busy="true">
            <span className="study-loading-indicator" aria-hidden="true" />
            <span>Đang chuẩn bị buổi học…</span>
          </div>
        ) : null}

        {state === "summary" ? (
          <div className="study-summary" data-testid="study-session-summary">
            <h2>Hoàn thành buổi học</h2>
            <p className="study-summary-lead">Bạn đã hoàn thành tất cả câu hỏi trong buổi học này.</p>
            <dl className="study-summary-list">
              <div><dt>Đã ôn tập</dt><dd>{metrics.scheduledReviews}</dd></div>
              <div><dt>Đã nhớ</dt><dd>{metrics.remembered}</dd></div>
              <div><dt>Chưa nhớ</dt><dd>{metrics.forgotten}</dd></div>
              <div><dt>Lượt ôn lại</dt><dd>{metrics.reinforcement}</dd></div>
            </dl>
            <Link className="register-submit study-summary-link" to="/learners">Về trang người học</Link>
          </div>
        ) : null}

        {currentCard && ["ready", "answered", "saving", "save-failed", "reconciling"].includes(state) ? (
          <div className="study-session" data-testid="study-session-ready">
            <section className="study-progress-card" aria-label="Tiến độ buổi học">
              <span className="study-progress-count" data-testid="session-counter">Câu {currentQuestion} / {progressTotal}</span>
              <div className="study-progress" role="progressbar" aria-label="Tiến độ buổi học" aria-valuemin={0} aria-valuemax={progressTotal} aria-valuenow={currentQuestion}>
                <span style={{ width: `${progressPercent}%` }} />
              </div>
            </section>

            {useExerciseCard && currentExercise ? (
              <ExerciseCard
                key={`${currentExercise.exerciseId}:${exerciseResetVersion}`}
                exercise={currentExercise}
                vocabulary={currentCard.item.vocabulary}
                answer={exerciseAnswer}
                saveState={exerciseSaveState}
                onAnswer={answerExercise}
                onAudioFailure={handleExerciseMediaFailure}
                onImageFailure={handleExerciseMediaFailure}
              />
            ) : (
              <>
                <Flashcard
                  key={`${currentCard.item.vocabulary.id}-${currentCard.reinforcementAttempt}`}
                  vocabulary={currentCard.item.vocabulary}
                  isFlipped={isFlipped}
                  onFlip={() => setIsFlipped((current) => !current)}
                />
                {mode === "exercise" ? <p className="study-session-message" role="status">Không đủ đáp án phù hợp cho bài tập; dùng thẻ học cho từ này.</p> : null}
              </>
            )}

            {message && state === "ready" ? <p className="study-session-message" role="status">{message}</p> : null}
            {currentCard.reinforcementAttempt > 0 && state === "ready" ? <p className="study-session-message" role="status">Ôn tập lại</p> : null}

            {!useExerciseCard && isFlipped && (state === "ready" || state === "save-failed") ? (
              <div className="study-actions" aria-label="Đánh giá thẻ học">
                <button className={`study-recall study-recall-forgotten${lastAnswer === "FORGOTTEN" ? " is-selected" : ""}`} type="button" disabled={state === "save-failed"} aria-pressed={lastAnswer === "FORGOTTEN"} onClick={() => answerCard("FORGOTTEN")}>Chưa nhớ</button>
                <button className={`study-recall study-recall-remembered${lastAnswer === "REMEMBERED" ? " is-selected" : ""}`} type="button" disabled={state === "save-failed"} aria-pressed={lastAnswer === "REMEMBERED"} onClick={() => answerCard("REMEMBERED")}>Đã nhớ</button>
              </div>
            ) : null}

            {!useExerciseCard && state === "answered" && lastAnswer ? (
              <div className={`exercise-feedback ${lastAnswer === "REMEMBERED" ? "is-correct" : "is-incorrect"}`} role="status" aria-live="polite">
                {lastAnswer === "REMEMBERED" ? "Đã nhớ câu trả lời." : "Câu trả lời chưa đúng."} Bạn có thể hoàn tác trước khi sang câu tiếp theo.
              </div>
            ) : null}

            {state === "answered" ? (
              <div className="study-session-actions">
                <button className="study-undo-button" type="button" aria-label="Hoàn tác câu trả lời (Z)" aria-keyshortcuts="z" onClick={undoAnswer}>
                  <span aria-hidden="true">↶</span> Hoàn tác <kbd>Z</kbd>
                </button>
                <button className="study-next-button" type="button" aria-label="Câu tiếp theo" aria-keyshortcuts="Enter" onClick={continueAfterAnswer}>
                  Câu tiếp theo <span aria-hidden="true">→</span><kbd>Enter</kbd>
                </button>
              </div>
            ) : state === "saving" ? (
              <button className="study-next-button" type="button" disabled aria-busy="true">Đang lưu câu trả lời…</button>
            ) : null}

            {useExerciseCard && currentExercise && currentExercise.options.length > 0 ? (
              <footer className="study-keyboard-hints" aria-label="Phím tắt">
                <span>Phím tắt:</span>
                {currentExercise.options.map((option, index) => <kbd key={option.optionId}>{index + 1}</kbd>)}
                <span>Chọn đáp án</span><kbd>Enter</kbd><span>Câu tiếp theo</span><kbd>Z</kbd><span>Hoàn tác</span>
              </footer>
            ) : null}

            {state === "save-failed" ? (
              <div className="study-save-failed" data-testid="study-save-failed" role="alert">
                <span><strong>Chưa lưu tiến trình.</strong> {message ?? SAFE_SAVE_ERROR}</span>
                {pending ? <button className="auth-retry" type="button" onClick={retrySave}>Thử lại</button> : <button className="auth-retry" type="button" onClick={() => void loadQueue()}>Tải lại danh sách học</button>}
              </div>
            ) : null}
            {state === "reconciling" ? <p className="study-reconciling" role="status">{message}</p> : null}
          </div>
        ) : null}
      </section>
    </main>
  );
}
