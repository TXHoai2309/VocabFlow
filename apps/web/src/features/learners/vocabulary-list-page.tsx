import { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router";
import type { LearnerDto, LearnerVocabularyDto } from "@vocabflow/contracts";
import { useActiveLearner } from "./learner-context-hook";
import { LearnerVocabularyClientError, requestLearnerVocabulary } from "./vocabulary-list-client";

type VocabularyListState = "loading" | "ready" | "error";

function statusLabel(status: LearnerVocabularyDto["status"]) {
  return status === "LEARNING" ? "Learning" : status === "MASTERED" ? "Mastered" : "New";
}

function listErrorMessage(error: unknown) {
  if (error instanceof LearnerVocabularyClientError && (error.status === 401 || error.code === "UNAUTHORIZED")) {
    return "Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.";
  }
  if (error instanceof LearnerVocabularyClientError && (error.status === 403 || error.code === "HOUSEHOLD_ACCESS_DENIED")) {
    return "Không thể xem vocabulary của learner này.";
  }
  return "Không thể tải vocabulary lúc này. Vui lòng thử lại.";
}

export function VocabularyListPage() {
  const { activeLearner } = useActiveLearner();
  if (!activeLearner) return <Navigate to="/learners" replace />;
  return <VocabularyListExperience key={activeLearner.id} activeLearner={activeLearner} />;
}

function VocabularyListExperience({ activeLearner }: { activeLearner: LearnerDto }) {
  const [state, setState] = useState<VocabularyListState>("loading");
  const [vocabulary, setVocabulary] = useState<LearnerVocabularyDto[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const loadVocabulary = useCallback(async () => {
    setState("loading");
    setVocabulary([]);
    setMessage(null);
    try {
      const response = await requestLearnerVocabulary(activeLearner.id);
      setVocabulary(response);
      setState("ready");
    } catch (error) {
      setState("error");
      setMessage(listErrorMessage(error));
    }
  }, [activeLearner.id]);

  useEffect(() => {
    let cancelled = false;
    void requestLearnerVocabulary(activeLearner.id)
      .then((response) => {
        if (cancelled) return;
        setVocabulary(response);
        setState("ready");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState("error");
        setMessage(listErrorMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, [activeLearner.id]);

  return (
    <main className="learner-page" aria-labelledby="vocabulary-list-title">
      <section className="learner-card vocabulary-list-card">
        <div className="vocabulary-list-topbar">
          <Link className="back-link" to="/learners">← Về learner home</Link>
          <p className="study-learner">Learner: <strong>{activeLearner.displayName}</strong></p>
        </div>
        <p className="auth-eyebrow">Vocabulary</p>
        <h1 className="auth-title" id="vocabulary-list-title">Từ vựng của {activeLearner.displayName}</h1>

        {state === "loading" ? (
          <div className="vocabulary-list-state" data-testid="vocabulary-loading" role="status">Đang tải vocabulary…</div>
        ) : null}

        {state === "error" ? (
          <div className="vocabulary-list-state vocabulary-list-error" data-testid="vocabulary-error" role="alert">
            <p>{message}</p>
            <button className="auth-retry" type="button" onClick={() => void loadVocabulary()}>Thử lại</button>
          </div>
        ) : null}

        {state === "ready" && vocabulary.length === 0 ? (
          <div className="vocabulary-empty" data-testid="vocabulary-empty-state" role="status">
            <h2>Chưa có từ vựng</h2>
            <p>Danh sách vocabulary đang trống.</p>
          </div>
        ) : null}

        {state === "ready" && vocabulary.length > 0 ? (
          <ul className="vocabulary-list" data-testid="vocabulary-list">
            {vocabulary.map((item) => (
              <li className="vocabulary-list-row" data-testid={`vocabulary-row-${item.id}`} key={item.id}>
                <div className="vocabulary-list-copy">
                  <strong>{item.word}</strong>
                  <span>{item.vietnamese}</span>
                </div>
                <span className={`vocabulary-status vocabulary-status-${item.status.toLowerCase()}`}>
                  {statusLabel(item.status)}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </main>
  );
}
