import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router";
import type { LearnerDto, LearnerLearningSetDto } from "@vocabflow/contracts";
import { useActiveLearner } from "../learners/learner-context-hook";
import { EmptyState, ErrorState, LoadingState } from "../../components/async-states";
import {
  assignLearningSet,
  LearningSetsClientError,
  requestLearnerLearningSets,
  unassignLearningSet
} from "./learning-sets-client";

type LoadState = "loading" | "ready" | "error";

function messageFor(error: unknown) {
  if (error instanceof LearningSetsClientError && error.status === 403) return "Bạn không có quyền thay đổi hồ sơ người học này.";
  if (error instanceof LearningSetsClientError && error.status === 401) return "Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.";
  return "Không thể cập nhật bộ từ lúc này. Vui lòng thử lại.";
}

export function LearnerLearningSetsPage() {
  const { activeLearner } = useActiveLearner();
  if (!activeLearner) return <Navigate to="/learners" replace />;
  return <LearnerLearningSetsExperience key={activeLearner.id} activeLearner={activeLearner} />;
}

function LearnerLearningSetsExperience({ activeLearner }: { activeLearner: LearnerDto }) {
  const [state, setState] = useState<LoadState>("loading");
  const [items, setItems] = useState<LearnerLearningSetDto[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void requestLearnerLearningSets(activeLearner.id)
      .then((next) => {
        if (cancelled) return;
        setItems(next);
        setState("ready");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState("error");
        setMessage(messageFor(error));
      });
    return () => { cancelled = true; };
  }, [activeLearner.id, retryCount]);

  function retryList() {
    setState("loading");
    setMessage(null);
    setRetryCount((value) => value + 1);
  }

  async function toggle(item: LearnerLearningSetDto) {
    if (busyId !== null) return;
    setBusyId(item.learningSet.id);
    setMessage(null);
    setSuccess(null);
    try {
      const result = item.active
        ? await unassignLearningSet(activeLearner.id, item.learningSet.id)
        : await assignLearningSet(activeLearner.id, item.learningSet.id);
      setItems((current) => current.map((candidate) => candidate.learningSet.id === result.learningSetId
        ? { ...candidate, active: result.active }
        : candidate));
      setSuccess(result.active ? `Đã gán ${item.learningSet.name}.` : `Đã bỏ gán ${item.learningSet.name}.`);
    } catch (error) {
      setMessage(messageFor(error));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="learner-page" aria-labelledby="learner-learning-sets-title">
      <section className="learner-card learning-sets-card">
        <div className="learning-sets-topbar">
          <Link className="back-link" to="/learners">← Về trang người học</Link>
          <Link className="learning-sets-manage-link" to="/learning-sets">Xem danh mục</Link>
        </div>
        <p className="auth-eyebrow">Bộ từ</p>
        <h1 className="auth-title" id="learner-learning-sets-title">Bộ từ của {activeLearner.displayName}</h1>
        <p className="auth-copy">Bật hoặc tắt bộ từ để chọn những từ vựng xuất hiện trong danh sách học. Tiến trình và lịch sử ôn tập sẽ không bị xóa.</p>
        {success ? <p className="learning-sets-success" role="status">{success}</p> : null}
        {state === "loading" ? <LoadingState className="learning-sets-state" label="Đang tải các bộ từ của người học…" pattern="form" testId="learner-learning-sets-loading" /> : null}
        {state === "error" ? <ErrorState className="learning-sets-state learning-sets-error" title="Không thể tải bộ từ của người học" description={message ?? "Vui lòng thử lại."} onRetry={retryList} testId="learner-learning-sets-error" /> : null}
        {state === "ready" && items.length === 0 ? <EmptyState className="vocabulary-empty" icon="folder" title="Chưa có bộ từ khả dụng" description="Danh mục bộ từ hiện đang trống." testId="learner-learning-sets-empty" /> : null}
        {state === "ready" && items.length > 0 ? (
          <div className="learner-set-toggle-list" data-testid="learner-learning-sets-list">
            {items.map((item) => (
              <div className="learner-set-toggle" key={item.learningSet.id}>
                <div className="learning-set-copy"><strong>{item.learningSet.name}</strong><p>{item.learningSet.description}</p><small>{item.learningSet.vocabularyCount} từ đang bật</small></div>
                <button className={item.active ? "set-toggle set-toggle-active" : "set-toggle"} type="button" onClick={() => void toggle(item)} disabled={busyId !== null} aria-pressed={item.active}>
                  {busyId === item.learningSet.id ? "Đang lưu…" : item.active ? "Đã gán" : "Gán bộ từ"}
                </button>
              </div>
            ))}
          </div>
        ) : null}
        {message && state === "ready" ? <p className="learning-sets-inline-error" role="alert">{message}</p> : null}
      </section>
    </main>
  );
}
