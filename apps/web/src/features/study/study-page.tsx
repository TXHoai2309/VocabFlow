import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router";
import type {
  LearnerDto,
  ExerciseSubmission,
  ReviewQueueItem,
  ReviewQueueResponse,
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
  normalizeExerciseAnswer,
  TYPE_WORD_CUE,
  type ExerciseInstance,
  type ExerciseType,
  type TypeWordCue
} from "./exercise-generator";

type StudyState = "loading" | "empty" | "error" | "ready" | "saving" | "save-failed" | "reconciling" | "awaiting-next" | "summary";
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
  exercise: boolean;
};

const SAFE_QUEUE_ERROR = "Không thể tải danh sách học lúc này. Vui lòng thử lại.";
const SAFE_SAVE_ERROR = "Không thể lưu tiến trình lúc này. Vui lòng thử lại.";

function sessionCards(queue: ReviewQueueItem[]): SessionCard[] {
  return queue.map((item) => ({ item, reinforcementAttempt: 0, reviewId: null }));
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
  const [searchParams] = useSearchParams();
  const scope = useMemo(() => studyScopeFromParams(searchParams), [searchParams]);
  const selection = useMemo(() => studySelectionFromParams(searchParams), [searchParams]);
  const scopeKey = scope ? `${scope.type}:${"id" in scope ? scope.id : "invalid"}` : "all";
  const selectionKey = selection ? `${selection.content}:${selection.amount}` : "default";
  if (!activeLearner) return <Navigate to="/learners" replace />;
  return <StudyExperience key={`${activeLearner.id}:${mode}:${exercisePreference ?? "default"}:${scopeKey}:${selectionKey}`} activeLearner={activeLearner} mode={mode} exercisePreference={exercisePreference} scope={scope} selection={selection} />;
}

export function ExerciseStudyPage() {
  const [searchParams] = useSearchParams();
  const requestedType = searchParams.get("type");
  const exercisePreference = Object.values(EXERCISE_TYPE).includes(requestedType as ExerciseType)
    ? requestedType as ExerciseType
    : undefined;
  return <StudyPage mode="exercise" exercisePreference={exercisePreference} />;
}

function StudyExperience({ activeLearner, mode, exercisePreference, scope, selection }: { activeLearner: LearnerDto; mode: StudyMode; exercisePreference?: ExerciseType; scope: StudyScope | null; selection: StudySelection | null }) {
  const [state, setState] = useState<StudyState>("loading");
  const [cards, setCards] = useState<SessionCard[]>([]);
  const [baseQueueLength, setBaseQueueLength] = useState(0);
  const [queueInfo, setQueueInfo] = useState<Pick<ReviewQueueResponse, "dueCount" | "newCount" | "reviewDate"> | null>(null);
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
  const [confirmedExerciseResponse, setConfirmedExerciseResponse] = useState<ReviewResponse | null>(null);
  const [exerciseReinforcementReady, setExerciseReinforcementReady] = useState(false);
  const [exerciseFallbackType, setExerciseFallbackType] = useState<ExerciseType | "flashcard" | null>(null);
  const [exerciseBlockedCues, setExerciseBlockedCues] = useState<TypeWordCue[]>([]);
  const cardsRef = useRef<SessionCard[]>([]);

  const currentCard = cards[0] ?? null;
  const currentExercise: ExerciseInstance | null = mode === "exercise" && currentCard && exerciseFallbackType !== "flashcard"
    ? createExercise(currentCard.item, cards.map((card) => card.item), {
      preferredType: exerciseFallbackType ?? exercisePreference,
      blockedCues: exerciseBlockedCues
    })
    : null;
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
    setConfirmedExerciseResponse(null);
    setExerciseReinforcementReady(false);
    setExerciseFallbackType(null);
    setExerciseBlockedCues([]);
    setIsFlipped(false);
    try {
      const scopedResponse = await requestScopedReviewQueue(activeLearner.id, scope);
      const response = selection ? selectStudyQueue(scopedResponse, selection) : scopedResponse;
      const nextCards = sessionCards(response.queue);
      cardsRef.current = nextCards;
      setQueueInfo({ dueCount: response.dueCount, newCount: response.newCount, reviewDate: response.reviewDate });
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
      setQueueInfo({ dueCount: response.dueCount, newCount: response.newCount, reviewDate: response.reviewDate });
      replaceCards(nextCards);
      setPending(null);
      setLastAnswer(null);
      setExerciseAnswer(null);
      setConfirmedExerciseResponse(null);
      setExerciseReinforcementReady(false);
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
    setConfirmedExerciseResponse(null);
    setExerciseReinforcementReady(false);
    setExerciseFallbackType(null);
    setExerciseBlockedCues([]);
    setMessage(null);
    setIsFlipped(false);
    setState(nextCards.length === 0 ? "summary" : "ready");
  }, [replaceCards]);

  const saveScheduledReview = useCallback(async (request: ReviewRequest, card: SessionCard, exercise: boolean) => {
    try {
      const response = await submitReview(request);
      if (exercise) {
        setConfirmedExerciseResponse(response);
        setPending(null);
        setLastAnswer(response.result);
        setMessage(null);
        setState("awaiting-next");
      } else {
        advanceScheduledCard(card, response);
      }
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

  const answerCard = (result: ReviewResult) => {
    if (!currentCard || state !== "ready") return;
    if (currentCard.reinforcementAttempt > 0) {
      const shouldReinsert = result === "FORGOTTEN" && currentCard.reinforcementAttempt < 2;
      const remaining = cardsRef.current.slice(1);
      const reinforcement = shouldReinsert
        ? [{ ...currentCard, reinforcementAttempt: currentCard.reinforcementAttempt + 1, reviewId: null }]
        : [];
      const nextCards = [...remaining, ...reinforcement];
      replaceCards(nextCards);
      setMetrics((current) => ({ ...current, reinforcement: current.reinforcement + 1 }));
      setMessage(null);
      setIsFlipped(false);
      setExerciseFallbackType(null);
      setExerciseBlockedCues([]);
      setState(nextCards.length === 0 ? "summary" : "ready");
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
    setState("saving");
    setPending({ request, card, exercise: false });
    void saveScheduledReview(request, card, false);
  };

  const answerExercise = (optionId: string, exerciseSubmission: ExerciseSubmission) => {
    if (!currentCard || !currentExercise || !useExerciseCard || state !== "ready" || exerciseAnswer) return;
    const result: ReviewResult = currentExercise.exerciseType === EXERCISE_TYPE.TYPE_WORD
      ? normalizeExerciseAnswer(exerciseSubmission.type === EXERCISE_TYPE.TYPE_WORD ? exerciseSubmission.answer : "")
        === normalizeExerciseAnswer(currentExercise.correctAnswer ?? "")
        ? "REMEMBERED"
        : "FORGOTTEN"
      : optionId === currentExercise.correctOptionId ? "REMEMBERED" : "FORGOTTEN";

    if (currentCard.reinforcementAttempt > 0) {
      setExerciseAnswer({ optionId, result });
      setExerciseReinforcementReady(true);
      setState("awaiting-next");
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
    setPending({ request, card, exercise: true });
    setLastAnswer(result);
    setMessage(null);
    setState("saving");
    void saveScheduledReview(request, card, true);
  };

  const continueAfterExercise = () => {
    if (state !== "awaiting-next" || !currentCard) return;
    if (confirmedExerciseResponse) {
      advanceScheduledCard(currentCard, confirmedExerciseResponse);
      return;
    }
    if (!exerciseReinforcementReady || !exerciseAnswer) return;

    const shouldReinsert = exerciseAnswer.result === "FORGOTTEN" && currentCard.reinforcementAttempt < 2;
    const remaining = cardsRef.current.slice(1);
    const reinforcement = shouldReinsert
      ? [{ ...currentCard, reinforcementAttempt: currentCard.reinforcementAttempt + 1, reviewId: null }]
      : [];
    const nextCards = [...remaining, ...reinforcement];
    replaceCards(nextCards);
    setMetrics((current) => ({ ...current, reinforcement: current.reinforcement + 1 }));
    setExerciseAnswer(null);
    setExerciseReinforcementReady(false);
    setExerciseFallbackType(null);
    setExerciseBlockedCues([]);
    setMessage(null);
    setState(nextCards.length === 0 ? "summary" : "ready");
  };

  const retrySave = () => {
    if (!pending) return;
    setState("saving");
    setMessage(null);
    void saveScheduledReview(pending.request, pending.card, pending.exercise);
  };

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
      : state === "awaiting-next"
        ? "awaiting-next"
        : "ready";

  const handleExit = (event: React.MouseEvent<HTMLAnchorElement>) => {
    const hasUnsavedRisk = state === "saving" || state === "save-failed" || pending !== null;
    if (!hasUnsavedRisk) return;
    const message = "Câu trả lời chưa được lưu. Bạn vẫn muốn thoát?";
    if (!globalThis.confirm(message)) {
      event.preventDefault();
    }
  };

  if (state === "loading") {
    return (
      <main className="study-page" aria-labelledby="study-title">
        <section className="study-shell">
          <div className="study-topbar"><Link className="back-link" to="/learners">← Thoát</Link><p className="study-learner">Đang học: <strong>{activeLearner.displayName}</strong></p></div>
          <p className="auth-eyebrow">{mode === "exercise" ? "Bài tập" : "Phiên học"}</p>
          <h1 className="auth-title" id="study-title">Phiên học hôm nay</h1>
          <div className="study-status" data-testid="study-loading" role="status">Đang chuẩn bị phiên học…</div>
        </section>
      </main>
    );
  }

  return (
    <main className="study-page" aria-labelledby="study-title">
      <section className="study-shell">
        <div className="study-topbar">
          <Link className="back-link" to="/learners" onClick={handleExit}>← Thoát</Link>
          <p className="study-learner">Đang học: <strong>{activeLearner.displayName}</strong></p>
        </div>

        <p className="auth-eyebrow">{mode === "exercise" ? "Bài tập" : "Phiên học"}</p>
        <h1 className="auth-title" id="study-title">{state === "summary" ? "Hoàn thành phiên học" : "Phiên học hôm nay"}</h1>

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
            <h2>Hôm nay chưa có thẻ học</h2>
            <p>Không có từ đến hạn hoặc từ mới để bắt đầu phiên học.</p>
            <Link className="auth-retry study-state-link" to="/learners">Về trang người học</Link>
          </div>
        ) : null}

        {state === "summary" ? (
          <div className="study-summary" data-testid="study-session-summary">
            <p className="study-summary-lead">Bạn đã hoàn thành tất cả thẻ trong phiên học này.</p>
            <dl className="study-summary-list">
              <div><dt>Đã ôn tập</dt><dd>{metrics.scheduledReviews}</dd></div>
              <div><dt>Đã nhớ</dt><dd>{metrics.remembered}</dd></div>
              <div><dt>Chưa nhớ</dt><dd>{metrics.forgotten}</dd></div>
              <div><dt>Lượt ôn lại</dt><dd>{metrics.reinforcement}</dd></div>
            </dl>
            <Link className="register-submit study-summary-link" to="/learners">Về trang người học</Link>
          </div>
        ) : null}

        {currentCard && ["ready", "saving", "save-failed", "reconciling", "awaiting-next"].includes(state) ? (
          <div className="study-session" data-testid="study-session-ready">
            <div className="study-session-header">
              <span data-testid="session-counter">{metrics.scheduledReviews} / {baseQueueLength}</span>
              <span>{currentCard.reinforcementAttempt > 0 ? "Ôn tập lại" : currentCard.item.queueType === "DUE" ? "Cần ôn tập" : "Từ mới"}</span>
            </div>
            {queueInfo ? <p className="study-queue-meta">{queueInfo.dueCount} đến hạn · {queueInfo.newCount} từ mới · {queueInfo.reviewDate}</p> : null}
            <div className="study-progress" role="progressbar" aria-label="Tiến độ phiên học" aria-valuemin={0} aria-valuemax={baseQueueLength} aria-valuenow={metrics.scheduledReviews}>
              <span style={{ width: `${baseQueueLength === 0 ? 0 : Math.min(100, (metrics.scheduledReviews / baseQueueLength) * 100)}%` }} />
            </div>

            <p className="study-instruction">
              {mode === "exercise" && useExerciseCard
                ? currentExercise?.exerciseType === EXERCISE_TYPE.TYPE_WORD
                  ? "Gõ từ tiếng Anh. Bạn chỉ có một lần trả lời cho mỗi bài."
                  : "Chọn một đáp án. Bạn chỉ có một lần trả lời cho mỗi bài."
                : "Chạm hoặc nhấn phím cách để lật thẻ."}
            </p>
            {useExerciseCard && currentExercise ? (
              <ExerciseCard
                key={currentExercise.exerciseId}
                exercise={currentExercise}
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

            <p className="study-card-state" role="status" aria-live="polite">
              {state === "saving" ? "Đang lưu…" : state === "reconciling" ? "Đang cập nhật tiến trình…" : state === "awaiting-next" ? (exerciseReinforcementReady ? "Đã ghi nhận trong phiên. Bạn có thể tiếp tục." : "Đã lưu. Bạn có thể tiếp tục.") : lastAnswer ? "Chưa lưu tiến trình" : isFlipped ? "Mặt sau: nghĩa tiếng Việt" : "Mặt trước: từ tiếng Anh"}
            </p>
            {message && state === "ready" ? <p className="study-session-message" role="status">{message}</p> : null}

            {!useExerciseCard && isFlipped ? (
              <div className="study-actions" aria-label="Đánh giá thẻ học">
                <button className="study-recall study-recall-forgotten" type="button" disabled={state !== "ready"} onClick={() => answerCard("FORGOTTEN")}>Chưa nhớ</button>
                <button className="study-recall study-recall-remembered" type="button" disabled={state !== "ready"} onClick={() => answerCard("REMEMBERED")}>Đã nhớ</button>
              </div>
            ) : null}

            {mode === "exercise" && state === "awaiting-next" ? (
              <button className="register-submit exercise-next-button" type="button" onClick={continueAfterExercise}>
                Tiếp tục
              </button>
            ) : null}

            {state === "save-failed" ? (
              <div className="study-save-failed" data-testid="study-save-failed" role="alert">
                <span>{message ?? SAFE_SAVE_ERROR}</span>
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
