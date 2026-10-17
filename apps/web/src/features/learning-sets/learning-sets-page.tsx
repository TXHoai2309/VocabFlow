import { AccountLearningState } from "../learners/account-learning-state";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import type { LearnerDto, LearningSetDetail, LearningSetSummary, VocabularyLevel } from "@vocabflow/contracts";
import { LearningSetsClientError, requestLearnerLearningSets, requestLearningSet, requestLearningSets } from "./learning-sets-client";
import { useActiveLearner } from "../learners/learner-context-hook";
import { requestLearnerVocabulary } from "../learners/vocabulary-list-client";
import { CollectionDetailView } from "../learners/collection-detail-view";
import { EmptyState, ErrorState, LoadingState } from "../../components/async-states";
import type { VocabularyCardItem } from "../learners/vocabulary-card";

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
          <Link className="back-link" to="/">← Về trang chủ</Link>
          {!(learningSets.length > 0 && learningSets.every((learningSet) => learningSet.studyScopeAvailable === true))
            ? <Link className="learning-sets-manage-link" to="/learning-sets/assign">Thêm vào học tập</Link>
            : null}
        </div>
        <p className="auth-eyebrow">Bộ từ</p>
        <h1 className="auth-title" id="learning-sets-title">Bộ từ</h1>
        <p className="auth-copy">Các bộ từ được tuyển chọn sẵn, có thứ tự ổn định để bạn chọn nội dung học.</p>

        {state === "loading" ? <LoadingState className="learning-sets-state" label="Đang tải danh sách bộ từ…" pattern="rows" testId="learning-sets-loading" /> : null}
        {state === "error" ? (
          <ErrorState className="learning-sets-state learning-sets-error" title="Không thể tải danh sách bộ từ" description={message ?? "Vui lòng thử lại."} onRetry={() => void load()} testId="learning-sets-error" />
        ) : null}
        {state === "ready" && learningSets.length === 0 ? (
          <EmptyState className="vocabulary-empty" icon="folder" title="Chưa có bộ từ phù hợp" description="Danh mục bộ từ hiện đang trống." testId="learning-sets-empty" />
        ) : null}
        {state === "ready" && learningSets.length > 0 ? (
          <ul className="learning-set-list" data-testid="learning-sets-list">
            {learningSets.map((learningSet) => (
              <li className="learning-set-row" key={learningSet.id}>
                <div className="learning-set-copy">
                  <div className="learning-set-heading"><strong>{learningSet.name}</strong><span>
                    {learningSet.classificationStatus === "SOURCE_VERIFIED" ? "CEFR · Có nguồn" :
                      learningSet.classificationStatus === "INFERRED_REVIEWABLE" ? "Gợi ý · Cần xem lại" : gradeLabel(learningSet.grade)}
                  </span></div>
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
  const { activeLearner } = useActiveLearner();
  const { learningSetId } = useParams();
  if (!activeLearner) {
    return <AccountLearningState />;
  }
  const parsedId = learningSetId && /^\d+$/.test(learningSetId) ? Number(learningSetId) : NaN;
  return <LearningSetDetailExperience key={`${activeLearner.id}:${learningSetId ?? "missing"}`} learner={activeLearner} learningSetId={parsedId} />;
}

type LearningSetDetailState = "loading" | "ready" | "error" | "not-found";

type LearningSetDetailData = {
  learningSet: LearningSetDetail;
  items: VocabularyCardItem[];
  learned: number;
  mastered: number;
  assigned: boolean;
};

function LearningSetDetailExperience({ learner, learningSetId }: { learner: LearnerDto; learningSetId: number }) {
  const [state, setState] = useState<LearningSetDetailState>("loading");
  const [data, setData] = useState<LearningSetDetailData | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const validLearningSetId = Number.isSafeInteger(learningSetId) && learningSetId > 0;

  useEffect(() => {
    let cancelled = false;
    if (!validLearningSetId) return () => { cancelled = true; };
    void Promise.all([
      requestLearningSet(learningSetId),
      requestLearnerVocabulary(learner.id),
      requestLearnerLearningSets(learner.id)
    ])
      .then(([learningSet, learnerVocabulary, learnerSets]) => {
        if (cancelled) return;
        const statusByVocabularyId = new Map(learnerVocabulary.map((item) => [item.id, item.status]));
        const items: VocabularyCardItem[] = learningSet.items.map(({ vocabulary }) => {
          const status = statusByVocabularyId.get(vocabulary.id);
          return status ? { ...vocabulary, status } : vocabulary;
        });
        const learned = items.filter((item) => item.status && item.status !== "NEW").length;
        const mastered = items.filter((item) => item.status === "MASTERED").length;
        const assigned = learnerSets.some((item) => item.learningSet.id === learningSet.id && item.active);
        setData({ learningSet, items, learned, mastered, assigned });
        setState("ready");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof LearningSetsClientError && error.status === 404) {
          setState("not-found");
          return;
        }
        setState("error");
        setMessage(error instanceof LearningSetsClientError && error.status === 401
          ? "Phiên đăng nhập đã hết. Vui lòng đăng nhập lại."
          : "Không thể tải chi tiết bộ từ lúc này. Vui lòng thử lại.");
      });
    return () => { cancelled = true; };
  }, [learner.id, learningSetId, retryCount, validLearningSetId]);

  if (!validLearningSetId || state === "not-found") {
    return (
      <main className="collection-detail-page" aria-label="Chi tiết bộ từ">
        <div className="collection-detail-state collection-detail-missing" role="status" data-testid="learning-set-detail-not-found">
          <h1>Bộ từ này hiện không khả dụng.</h1><Link to="/learning-sets">Quay lại danh sách bộ từ</Link>
        </div>
      </main>
    );
  }

  if (state === "ready" && data) {
    return (
      <CollectionDetailView
        kind="learning-set"
        title={data.learningSet.name}
        description={data.learningSet.description}
        level={data.learningSet.grade}
        items={data.items}
        learnedCount={data.learned}
        progressTotal={data.items.length}
        masteredCount={data.mastered}
        studyHref={`/study/setup?learningSetId=${data.learningSet.id}`}
        studyReady={data.learningSet.studyScopeAvailable === true || data.assigned}
        directStudyScope={data.learningSet.studyScopeAvailable === true}
        assignmentHref={!data.learningSet.studyScopeAvailable && !data.assigned && data.items.length > 0 ? "/learning-sets/assign" : undefined}
      />
    );
  }

  return (
    <main className="collection-detail-page" aria-label="Chi tiết bộ từ">
      {state === "loading" ? <LoadingState className="collection-detail-state" label="Đang tải chi tiết bộ từ…" pattern="detail" testId="learning-set-detail-loading" /> : null}
      {state === "error" ? (
        <ErrorState className="collection-detail-state collection-detail-error" title="Không thể tải chi tiết bộ từ" description={message ?? "Vui lòng thử lại."} onRetry={() => { setState("loading"); setData(null); setMessage(null); setRetryCount((current) => current + 1); }} testId="learning-set-detail-error" />
      ) : null}
    </main>
  );
}
