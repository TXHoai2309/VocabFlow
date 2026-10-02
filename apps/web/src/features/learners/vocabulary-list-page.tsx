import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useLocation } from "react-router";
import type { LearnerDto, LearnerVocabularyDto, VocabularyLevel } from "@vocabflow/contracts";
import { useActiveLearner } from "./learner-context-hook";
import { LearnerVocabularyClientError, requestLearnerVocabulary } from "./vocabulary-list-client";

type VocabularyListState = "loading" | "ready" | "error";

function statusLabel(status: LearnerVocabularyDto["status"]) {
  return status === "LEARNING" ? "Đang học" : status === "MASTERED" ? "Đã thành thạo" : "Từ mới";
}

function listErrorMessage(error: unknown) {
  if (error instanceof LearnerVocabularyClientError && (error.status === 401 || error.code === "UNAUTHORIZED")) {
    return "Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.";
  }
  if (error instanceof LearnerVocabularyClientError && (error.status === 403 || error.code === "HOUSEHOLD_ACCESS_DENIED")) {
    return "Không thể xem từ vựng của người học này.";
  }
  return "Không thể tải từ vựng lúc này. Vui lòng thử lại.";
}

export function VocabularyListPage() {
  const { activeLearner } = useActiveLearner();
  const location = useLocation();
  if (!activeLearner) {
    return <Navigate to="/learners" replace state={{ returnTo: `${location.pathname}${location.search}` }} />;
  }
  return <VocabularyListExperience key={activeLearner.id} activeLearner={activeLearner} />;
}

function VocabularyListExperience({ activeLearner }: { activeLearner: LearnerDto }) {
  const [state, setState] = useState<VocabularyListState>("loading");
  const [vocabulary, setVocabulary] = useState<LearnerVocabularyDto[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [level, setLevel] = useState<VocabularyLevel | "">("");

  const loadVocabulary = useCallback(async () => {
    setState("loading");
    setVocabulary([]);
    setMessage(null);
    try {
      const response = await requestLearnerVocabulary(activeLearner.id, level || undefined);
      setVocabulary(response);
      setState("ready");
    } catch (error) {
      setState("error");
      setMessage(listErrorMessage(error));
    }
  }, [activeLearner.id, level]);

  useEffect(() => {
    let cancelled = false;
    void requestLearnerVocabulary(activeLearner.id, level || undefined)
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
  }, [activeLearner.id, level]);

  return (
    <main className="learner-page" aria-labelledby="vocabulary-list-title">
      <section className="learner-card vocabulary-list-card">
        <div className="vocabulary-list-topbar">
          <Link className="back-link" to="/learners">← Về trang người học</Link>
          <p className="study-learner">Người học: <strong>{activeLearner.displayName}</strong></p>
        </div>
        <p className="auth-eyebrow">Từ vựng</p>
        <h1 className="auth-title" id="vocabulary-list-title">Từ vựng của {activeLearner.displayName}</h1>
        <div className="vocabulary-list-actions">
          <label className="vocabulary-filter-label" htmlFor="vocabulary-level-filter">Cấp độ</label>
          <select
            id="vocabulary-level-filter"
            className="vocabulary-filter"
            data-testid="vocabulary-level-filter"
            value={level}
            onChange={(event) => setLevel(event.target.value as VocabularyLevel | "")}
          >
            <option value="">Tất cả cấp độ</option>
            <option value="GRADE_1">Lớp 1</option>
            <option value="GRADE_2">Lớp 2</option>
            <option value="GRADE_3">Lớp 3</option>
            <option value="GRADE_4">Lớp 4</option>
            <option value="GRADE_5">Lớp 5</option>
            <option value="GENERAL">Chung</option>
          </select>
          <Link className="vocabulary-topics-link" to="/topics">Duyệt theo chủ đề</Link>
        </div>

        {state === "loading" ? (
          <div className="vocabulary-list-state" data-testid="vocabulary-loading" role="status">Đang tải từ vựng…</div>
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
            <p>Danh sách từ vựng hiện đang trống.</p>
          </div>
        ) : null}

        {state === "ready" && vocabulary.length > 0 ? (
          <ul className="vocabulary-list" data-testid="vocabulary-list">
              {vocabulary.map((item) => (
                <li className="vocabulary-list-row vocabulary-list-row-interactive" data-testid={`vocabulary-row-${item.id}`} key={item.id}>
                  <Link className="vocabulary-list-row-link" to={`/vocabulary/${item.id}`} aria-label={`${item.word}, ${item.vietnamese}, ${statusLabel(item.status)}. Xem chi tiết`}>
                    <span className="vocabulary-list-copy">
                      <strong>{item.word}</strong>
                      <span>{item.vietnamese}</span>
                    </span>
                    <span className={`vocabulary-status vocabulary-status-${item.status.toLowerCase()}`}>
                      {statusLabel(item.status)}
                    </span>
                    <span className="vocabulary-list-chevron" aria-hidden="true">›</span>
                  </Link>
                </li>
              ))}
          </ul>
        ) : null}
      </section>
    </main>
  );
}
