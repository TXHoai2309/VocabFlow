import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router";
import type { LearnerDto, VocabularyDto } from "@vocabflow/contracts";
import { useActiveLearner } from "../learners/learner-context-hook";
import { requestVocabulary, VocabularyClientError } from "./vocabulary-client";

type StudyState = "loading" | "empty" | "error" | "ready";

const SAFE_VOCABULARY_ERROR = "Không thể tải nội dung học lúc này. Vui lòng thử lại.";

function errorMessage(error: unknown) {
  if (!(error instanceof VocabularyClientError)) return SAFE_VOCABULARY_ERROR;
  if (error.status === 401 || error.code === "UNAUTHORIZED") {
    return "Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.";
  }
  if (error.status === 403 || error.code === "HOUSEHOLD_ACCESS_DENIED") {
    return "Không thể tiếp tục với learner này. Vui lòng chọn lại learner.";
  }
  return SAFE_VOCABULARY_ERROR;
}

export function StudyPage() {
  const { activeLearner } = useActiveLearner();
  if (!activeLearner) return <Navigate to="/learners" replace />;
  return <StudyExperience key={activeLearner.id} activeLearner={activeLearner} />;
}

function StudyExperience({ activeLearner }: { activeLearner: LearnerDto }) {
  const [state, setState] = useState<StudyState>("loading");
  const [vocabulary, setVocabulary] = useState<VocabularyDto[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void requestVocabulary()
      .then((nextVocabulary) => {
        if (cancelled) return;
        setVocabulary(nextVocabulary);
        setState(nextVocabulary.length === 0 ? "empty" : "ready");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState("error");
        setMessage(errorMessage(error));
      });

    return () => {
      cancelled = true;
    };
  }, [activeLearner]);

  const card = vocabulary[0];
  const retry = () => {
    setState("loading");
    setMessage(null);
    setIsFlipped(false);
    setImageFailed(false);
    void requestVocabulary()
      .then((nextVocabulary) => {
        setVocabulary(nextVocabulary);
        setState(nextVocabulary.length === 0 ? "empty" : "ready");
      })
      .catch((error: unknown) => {
        setState("error");
        setMessage(errorMessage(error));
      });
  };

  return (
    <main className="study-page" aria-labelledby="study-title">
      <section className="study-shell">
        <div className="study-topbar">
          <Link className="back-link" to="/learners">← Đổi learner</Link>
          <p className="study-learner">Đang học: <strong>{activeLearner.displayName}</strong></p>
        </div>
        <p className="auth-eyebrow">First study experience</p>
        <h1 className="auth-title" id="study-title">Một từ mới cho hôm nay</h1>

        {state === "loading" ? (
          <div className="study-status" data-testid="study-loading" role="status">
            Đang tải thẻ học…
          </div>
        ) : null}

        {state === "empty" ? (
          <div className="study-state" data-testid="study-empty-state" role="status">
            <h2>Chưa có từ vựng để học</h2>
            <p>Hãy quay lại sau khi nội dung học được sẵn sàng.</p>
            <button className="auth-retry" type="button" onClick={retry}>Thử lại</button>
          </div>
        ) : null}

        {state === "error" ? (
          <div className="study-state" data-testid="study-error-state" role="alert">
            <h2>Không thể mở thẻ học</h2>
            <p>{message ?? SAFE_VOCABULARY_ERROR}</p>
            {message === "Phiên đăng nhập đã hết. Vui lòng đăng nhập lại." ? (
              <Link className="auth-retry study-state-link" to="/login">Đăng nhập lại</Link>
            ) : (
              <button className="auth-retry" type="button" onClick={retry}>Thử lại</button>
            )}
          </div>
        ) : null}

        {state === "ready" && card ? (
          <div className="study-card-area" data-testid="first-flashcard-ready">
            <p className="study-instruction">Chạm hoặc nhấn Space để lật thẻ.</p>
            <button
              className="study-card"
              type="button"
              aria-label={isFlipped ? "Lật về mặt trước" : "Lật để xem nghĩa"}
              aria-describedby="study-card-description"
              aria-pressed={isFlipped}
              onClick={() => setIsFlipped((current) => !current)}
              onKeyDown={(event) => {
                if (event.key === " ") {
                  event.preventDefault();
                  setIsFlipped((current) => !current);
                }
              }}
            >
              {!isFlipped ? (
                <span className="study-card-face study-card-front">
                  <span id="study-card-description" className="sr-only">Từ tiếng Anh: {card.word}</span>
                  <span className="study-card-word">{card.word}</span>
                  <span className="study-card-hint">Nhấn để xem nghĩa</span>
                </span>
              ) : (
                <span className="study-card-face study-card-back">
                  <span id="study-card-description" className="sr-only">Từ: {card.word}. Nghĩa: {card.vietnamese}.</span>
                  <span className="study-card-word">{card.word}</span>
                  <span className="study-card-vietnamese">{card.vietnamese}</span>
                  {card.ipa ? <span className="study-card-optional">{card.ipa}</span> : null}
                  {card.definitionEn ? <span className="study-card-optional">{card.definitionEn}</span> : null}
                  {card.exampleEn ? <span className="study-card-example">{card.exampleEn}</span> : null}
                  {card.topic ? <span className="study-card-optional">{card.topic}</span> : null}
                  {card.imageUrl && !imageFailed ? (
                    <img
                      className="study-card-image"
                      src={card.imageUrl}
                      alt=""
                      onError={() => setImageFailed(true)}
                    />
                  ) : null}
                </span>
              )}
            </button>
            <p className="study-card-state" role="status" aria-live="polite">
              {isFlipped ? "Mặt sau: nghĩa tiếng Việt" : "Mặt trước: từ tiếng Anh"}
            </p>
          </div>
        ) : null}
      </section>
    </main>
  );
}
