import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router";
import type {
  LearnerDto,
  ReviewQueueItem,
  ReviewQueueResponse,
  ReviewRequest,
  ReviewResult
} from "@vocabflow/contracts";
import { useActiveLearner } from "../learners/learner-context-hook";
import { requestReviewQueue, ReviewQueueClientError } from "./review-queue-client";
import { ReviewClientError, submitReview } from "./review-client";
import { Flashcard } from "./flashcard";

type StudyState = "loading" | "empty" | "error" | "ready" | "saving" | "save-failed" | "reconciling" | "summary";

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

const SAFE_QUEUE_ERROR = "Không thể tải review queue lúc này. Vui lòng thử lại.";
const SAFE_SAVE_ERROR = "Không thể lưu tiến trình lúc này. Vui lòng thử lại.";

function sessionCards(queue: ReviewQueueItem[]): SessionCard[] {
  return queue.map((item) => ({ item, reinforcementAttempt: 0, reviewId: null }));
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
    return "Không thể tiếp tục với learner này. Vui lòng chọn lại learner.";
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
  if (isLearnerAccessError(error)) return "Không thể tiếp tục với learner này. Vui lòng chọn lại learner.";
  return SAFE_SAVE_ERROR;
}

export function StudyPage() {
  const { activeLearner } = useActiveLearner();
  if (!activeLearner) return <Navigate to="/learners" replace />;
  return <StudyExperience key={activeLearner.id} activeLearner={activeLearner} />;
}

function StudyExperience({ activeLearner }: { activeLearner: LearnerDto }) {
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
  const cardsRef = useRef<SessionCard[]>([]);

  const currentCard = cards[0] ?? null;

  useEffect(() => {
    cardsRef.current = cards;
  }, [cards]);

  const loadQueue = useCallback(async () => {
    setState("loading");
    setMessage(null);
    setPending(null);
    setLastAnswer(null);
    setIsFlipped(false);
    try {
      const response = await requestReviewQueue(activeLearner.id);
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
  }, [activeLearner.id]);

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
    setMessage("Đang tải lại tiến trình canonical…");
    try {
      const response = await requestReviewQueue(activeLearner.id);
      const canonicalCards = sessionCards(response.queue);
      const matchingCard = canonicalCards.find((candidate) => candidate.item.vocabulary.id === card.item.vocabulary.id);
      const nextCards = matchingCard
        ? [matchingCard, ...canonicalCards.filter((candidate) => candidate !== matchingCard)]
        : canonicalCards;
      setQueueInfo({ dueCount: response.dueCount, newCount: response.newCount, reviewDate: response.reviewDate });
      replaceCards(nextCards);
      setPending(null);
      setLastAnswer(null);
      setMessage(matchingCard
        ? reason === "stale"
          ? "Tiến trình đã thay đổi. Hãy đánh giá lại thẻ này."
          : "Review đã tồn tại với dữ liệu khác. Hãy đánh giá lại thẻ này."
        : "Tiến trình đã được cập nhật. Thẻ này không còn trong queue.");
      setState(nextCards.length === 0 ? "summary" : "ready");
    } catch (error) {
      setPending(null);
      setState(isLoginError(error) || isLearnerAccessError(error) ? "error" : "save-failed");
      setMessage(isLoginError(error)
        ? "Phiên đăng nhập đã hết. Vui lòng đăng nhập lại."
        : isLearnerAccessError(error)
          ? "Không thể tiếp tục với learner này. Vui lòng chọn lại learner."
          : "Không thể cập nhật tiến trình lúc này. Vui lòng tải lại queue.");
    }
  }, [activeLearner.id, replaceCards]);

  const advanceScheduledCard = useCallback((card: SessionCard, result: ReviewResult) => {
    const remaining = cardsRef.current.slice(1);
    const reinforcement = result === "FORGOTTEN"
      ? [{ ...card, reinforcementAttempt: 1, reviewId: null }]
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
    setMessage(null);
    setIsFlipped(false);
    setState(nextCards.length === 0 ? "summary" : "ready");
  }, [replaceCards]);

  const saveScheduledReview = useCallback(async (request: ReviewRequest, card: SessionCard) => {
    try {
      await submitReview(request);
      advanceScheduledCard(card, request.result);
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
    setPending({ request, card });
    setLastAnswer(result);
    setMessage(null);
    setState("saving");
    void saveScheduledReview(request, card);
  };

  const retrySave = () => {
    if (!pending) return;
    setState("saving");
    setMessage(null);
    void saveScheduledReview(pending.request, pending.card);
  };

  const handleExit = (event: React.MouseEvent<HTMLAnchorElement>) => {
    const message = state === "saving" || state === "save-failed" || pending
      ? "Câu trả lời chưa được lưu. Bạn vẫn muốn thoát?"
      : "Bạn muốn kết thúc phiên học?";
    if (!globalThis.confirm(message)) {
      event.preventDefault();
    }
  };

  if (state === "loading") {
    return (
      <main className="study-page" aria-labelledby="study-title">
        <section className="study-shell">
          <div className="study-topbar"><Link className="back-link" to="/learners">← Thoát</Link><p className="study-learner">Đang học: <strong>{activeLearner.displayName}</strong></p></div>
          <p className="auth-eyebrow">Study session</p>
          <h1 className="auth-title" id="study-title">Phiên học hôm nay</h1>
          <div className="study-status" data-testid="study-loading" role="status">Đang tạo review queue…</div>
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

        <p className="auth-eyebrow">Study session</p>
        <h1 className="auth-title" id="study-title">{state === "summary" ? "Hoàn thành phiên học" : "Phiên học hôm nay"}</h1>

        {state === "error" ? (
          <div className="study-state" data-testid="study-error-state" role="alert">
            <h2>Không thể mở phiên học</h2>
            <p>{message ?? SAFE_QUEUE_ERROR}</p>
            {message === "Phiên đăng nhập đã hết. Vui lòng đăng nhập lại." ? (
              <Link className="auth-retry study-state-link" to="/login">Đăng nhập lại</Link>
            ) : message === "Không thể tiếp tục với learner này. Vui lòng chọn lại learner." ? (
              <Link className="auth-retry study-state-link" to="/learners">Chọn lại learner</Link>
            ) : (
              <button className="auth-retry" type="button" onClick={() => void loadQueue()}>Thử lại</button>
            )}
          </div>
        ) : null}

        {state === "empty" ? (
          <div className="study-state" data-testid="study-empty-state" role="status">
            <h2>Hôm nay chưa có thẻ học</h2>
            <p>Không có từ đến hạn hoặc từ mới để bắt đầu phiên học.</p>
            <Link className="auth-retry study-state-link" to="/learners">Về learner</Link>
          </div>
        ) : null}

        {state === "summary" ? (
          <div className="study-summary" data-testid="study-session-summary">
            <p className="study-summary-lead">Bạn đã hoàn thành các thẻ trong queue hiện tại.</p>
            <dl className="study-summary-list">
              <div><dt>Đã review</dt><dd>{metrics.scheduledReviews}</dd></div>
              <div><dt>Đã nhớ</dt><dd>{metrics.remembered}</dd></div>
              <div><dt>Chưa nhớ</dt><dd>{metrics.forgotten}</dd></div>
              <div><dt>Lượt ôn lại</dt><dd>{metrics.reinforcement}</dd></div>
            </dl>
            <Link className="register-submit study-summary-link" to="/learners">Về learner home</Link>
          </div>
        ) : null}

        {currentCard && ["ready", "saving", "save-failed", "reconciling"].includes(state) ? (
          <div className="study-session" data-testid="study-session-ready">
            <div className="study-session-header">
              <span data-testid="session-counter">{metrics.scheduledReviews} / {baseQueueLength}</span>
              <span>{currentCard.reinforcementAttempt > 0 ? "Ôn lại" : currentCard.item.queueType === "DUE" ? "Đến hạn" : "Từ mới"}</span>
            </div>
            {queueInfo ? <p className="study-queue-meta">{queueInfo.dueCount} đến hạn · {queueInfo.newCount} từ mới · {queueInfo.reviewDate}</p> : null}
            <div className="study-progress" role="progressbar" aria-label="Tiến độ phiên học" aria-valuemin={0} aria-valuemax={baseQueueLength} aria-valuenow={metrics.scheduledReviews}>
              <span style={{ width: `${baseQueueLength === 0 ? 0 : Math.min(100, (metrics.scheduledReviews / baseQueueLength) * 100)}%` }} />
            </div>

            <p className="study-instruction">Chạm hoặc nhấn Space để lật thẻ.</p>
            <Flashcard
              key={`${currentCard.item.vocabulary.id}-${currentCard.reinforcementAttempt}`}
              vocabulary={currentCard.item.vocabulary}
              isFlipped={isFlipped}
              onFlip={() => setIsFlipped((current) => !current)}
            />

            <p className="study-card-state" role="status" aria-live="polite">
              {state === "saving" ? "Đang lưu…" : state === "reconciling" ? "Đang cập nhật tiến trình…" : lastAnswer ? "Chưa lưu tiến trình" : isFlipped ? "Mặt sau: nghĩa tiếng Việt" : "Mặt trước: từ tiếng Anh"}
            </p>
            {message && state === "ready" ? <p className="study-session-message" role="status">{message}</p> : null}

            {isFlipped ? (
              <div className="study-actions" aria-label="Đánh giá thẻ học">
                <button className="study-recall study-recall-forgotten" type="button" disabled={state !== "ready"} onClick={() => answerCard("FORGOTTEN")}>Chưa nhớ</button>
                <button className="study-recall study-recall-remembered" type="button" disabled={state !== "ready"} onClick={() => answerCard("REMEMBERED")}>Đã nhớ</button>
              </div>
            ) : null}

            {state === "save-failed" ? (
              <div className="study-save-failed" data-testid="study-save-failed" role="alert">
                <span>{message ?? SAFE_SAVE_ERROR}</span>
                {pending ? <button className="auth-retry" type="button" onClick={retrySave}>Thử lại</button> : <button className="auth-retry" type="button" onClick={() => void loadQueue()}>Tải lại queue</button>}
              </div>
            ) : null}
            {state === "reconciling" ? <p className="study-reconciling" role="status">{message}</p> : null}
          </div>
        ) : null}
      </section>
    </main>
  );
}
