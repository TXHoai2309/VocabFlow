import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router";
import type { LearningSetDetail, LearningSetSummary, VocabularyLevel } from "@vocabflow/contracts";
import { LearningSetsClientError, requestLearningSet, requestLearningSets } from "./learning-sets-client";

type LoadState = "loading" | "ready" | "error";

function gradeLabel(grade: VocabularyLevel | null) {
  if (!grade) return "Chung";
  return grade === "GENERAL" ? "Chung" : grade.replace("GRADE_", "Lớp ");
}

function loadError(error: unknown) {
  if (error instanceof LearningSetsClientError && error.status === 401) return "Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.";
  return "Không thể tải bộ từ lúc này. Vui lòng thử lại.";
}

export function LearningSetsPage() {
  const [state, setState] = useState<LoadState>("loading");
  const [learningSets, setLearningSets] = useState<LearningSetSummary[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  function load() {
    setState("loading");
    setMessage(null);
    void requestLearningSets()
      .then((items) => {
        setLearningSets(items);
        setState("ready");
      })
      .catch((error: unknown) => {
        setState("error");
        setMessage(loadError(error));
      });
  }

  useEffect(() => {
    let cancelled = false;
    void requestLearningSets()
      .then((items) => {
        if (cancelled) return;
        setLearningSets(items);
        setState("ready");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState("error");
        setMessage(loadError(error));
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <main className="learner-page" aria-labelledby="learning-sets-title">
      <section className="learner-card learning-sets-card">
        <div className="learning-sets-topbar">
          <Link className="back-link" to="/learners">← Về trang người học</Link>
          <Link className="learning-sets-manage-link" to="/learning-sets/assign">Gán cho người học</Link>
        </div>
        <p className="auth-eyebrow">Bộ từ</p>
        <h1 className="auth-title" id="learning-sets-title">Bộ từ</h1>
        <p className="auth-copy">Các bộ từ được tuyển chọn sẵn, có thứ tự ổn định để gia đình chọn nội dung học.</p>

        {state === "loading" ? <div className="learning-sets-state" data-testid="learning-sets-loading" role="status">Đang tải bộ từ…</div> : null}
        {state === "error" ? (
          <div className="learning-sets-state learning-sets-error" data-testid="learning-sets-error" role="alert">
            <span>{message}</span><button className="auth-retry" type="button" onClick={load}>Thử lại</button>
          </div>
        ) : null}
        {state === "ready" && learningSets.length === 0 ? (
          <div className="vocabulary-empty" data-testid="learning-sets-empty" role="status">
            <h2>Chưa có bộ từ</h2><p>Danh mục bộ từ hiện đang trống.</p>
          </div>
        ) : null}
        {state === "ready" && learningSets.length > 0 ? (
          <ul className="learning-set-list" data-testid="learning-sets-list">
            {learningSets.map((learningSet) => (
              <li className="learning-set-row" key={learningSet.id}>
                <div className="learning-set-copy">
                  <div className="learning-set-heading"><strong>{learningSet.name}</strong><span>{gradeLabel(learningSet.grade)}</span></div>
                  <p>{learningSet.description}</p>
                  <small>{learningSet.vocabularyCount} từ đang bật</small>
                </div>
                <Link className="button secondary learning-set-open" to={`/learning-sets/${learningSet.id}`}>Xem bộ từ</Link>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </main>
  );
}

export function LearningSetDetailPage() {
  const { learningSetId } = useParams();
  const parsedId = Number(learningSetId);
  if (!Number.isSafeInteger(parsedId) || parsedId <= 0) return <Navigate to="/learning-sets" replace />;
  return <LearningSetDetailExperience key={parsedId} learningSetId={parsedId} />;
}

function LearningSetDetailExperience({ learningSetId }: { learningSetId: number }) {
  const [state, setState] = useState<LoadState>("loading");
  const [learningSet, setLearningSet] = useState<LearningSetDetail | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void requestLearningSet(learningSetId)
      .then((item) => {
        if (cancelled) return;
        setLearningSet(item);
        setState("ready");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState("error");
        setMessage(error instanceof LearningSetsClientError && error.status === 404
          ? "Bộ từ này hiện không khả dụng."
          : loadError(error));
      });
    return () => { cancelled = true; };
  }, [learningSetId]);

  return (
    <main className="learner-page" aria-labelledby="learning-set-detail-title">
      <section className="learner-card learning-sets-card">
        <Link className="back-link" to="/learning-sets">← Về danh sách bộ từ</Link>
        {state === "loading" ? <div className="learning-sets-state" data-testid="learning-set-detail-loading" role="status">Đang tải chi tiết…</div> : null}
        {state === "error" ? <div className="learning-sets-state learning-sets-error" data-testid="learning-set-detail-error" role="alert">{message}</div> : null}
        {state === "ready" && learningSet ? (
          <>
            <p className="auth-eyebrow">{gradeLabel(learningSet.grade)}</p>
            <h1 className="auth-title" id="learning-set-detail-title">{learningSet.name}</h1>
            <p className="auth-copy">{learningSet.description}</p>
            {learningSet.items.length === 0 ? (
              <div className="vocabulary-empty" data-testid="learning-set-detail-empty" role="status">
                <h2>Chưa có từ đang bật</h2><p>Hãy chọn bộ từ khác để bắt đầu.</p>
              </div>
            ) : (
              <ol className="learning-set-items" data-testid="learning-set-detail-items">
                {learningSet.items.map((item) => (
                  <li className="learning-set-item" key={item.vocabulary.id}>
                    <span className="learning-set-item-order">{item.sortOrder + 1}</span>
                    <div className="vocabulary-list-copy"><strong>{item.vocabulary.word}</strong><span>{item.vocabulary.vietnamese}</span></div>
                  </li>
                ))}
              </ol>
            )}
          </>
        ) : null}
      </section>
    </main>
  );
}
