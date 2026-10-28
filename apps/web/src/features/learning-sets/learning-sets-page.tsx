import { GuestCollectionPage } from "../guest/guest-collection-page";
import { GUEST_ID } from "../guest/guest-store";
import { AccountLearningState } from "../learners/account-learning-state";
import { useDeferredValue, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import type { LearnerDto, LearningSetDetail, LearningSetSummary, VocabularyLevel } from "@vocabflow/contracts";
import { LearningSetsClientError, requestLearnerLearningSets, requestLearningSet, requestLearningSets } from "./learning-sets-client";
import { filterLearningSets, readLearningSetCatalogFilters } from "./learning-set-catalog";
import { useActiveLearner } from "../learners/learner-context-hook";
import { requestLearnerVocabulary } from "../learners/vocabulary-list-client";
import { CollectionDetailView } from "../learners/collection-detail-view";
import { EmptyState, ErrorState, LoadingState } from "../../components/async-states";
import type { VocabularyCardItem } from "../learners/vocabulary-card";

type LoadState = "loading" | "ready" | "error";

function gradeLabel(grade: VocabularyLevel | null) {
  if (!grade) return "Chưa phân lớp";
  return grade === "GENERAL" ? "Chung" : grade.replace("GRADE_", "Lớp ");
}

function topicHref(topicId: number, grade: VocabularyLevel | null) {
  const params = new URLSearchParams({ topicId: String(topicId) });
  if (grade) params.set("level", grade);
  return `/topics?${params}`;
}

function loadError(error: unknown) {
  if (error instanceof LearningSetsClientError && error.status === 401) return "Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.";
  return "Không thể tải bộ từ lúc này. Vui lòng thử lại.";
}

export function LearningSetsPage() {
  const [params, setParams] = useSearchParams();
  const filters = readLearningSetCatalogFilters(params);
  const deferredQuery = useDeferredValue(filters.query);
  const [state, setState] = useState<LoadState>("loading");
  const [learningSets, setLearningSets] = useState<LearningSetSummary[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const visibleLearningSets = filterLearningSets(learningSets, { ...filters, query: deferredQuery });
  const topicOptions = [...new Map(learningSets.flatMap((learningSet) => learningSet.topics ?? []).map((topic) => [topic.id, topic])).values()]
    .sort((a, b) => a.name.localeCompare(b.name, "vi"));

  function changeFilter(key: "level" | "topicId" | "q", value: string) {
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (value) next.set(key, value); else next.delete(key);
      return next;
    });
  }

  function clearFilters() {
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.delete("level");
      next.delete("topicId");
      next.delete("q");
      return next;
    });
  }

  function load() {
    setState("loading");
    setMessage(null);
    void requestLearningSets({ includeTopics: true })
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
    void requestLearningSets({ includeTopics: true })
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
        <p className="auth-eyebrow">Chọn theo chủ đề và lớp</p>
        <h1 className="auth-title" id="learning-sets-title">Bộ từ để học</h1>
        <p className="auth-copy">Chọn chủ đề và lớp phù hợp với bạn. Mỗi bộ từ có thể học riêng, không cần theo thứ tự.</p>

        {state === "loading" ? <LoadingState className="learning-sets-state" label="Đang tải danh sách bộ từ…" pattern="rows" testId="learning-sets-loading" /> : null}
        {state === "error" ? (
          <ErrorState className="learning-sets-state learning-sets-error" title="Không thể tải danh sách bộ từ" description={message ?? "Vui lòng thử lại."} onRetry={() => void load()} testId="learning-sets-error" />
        ) : null}
        {state === "ready" ? <div className="learning-set-catalog-tools" aria-label="Lọc bộ từ">
          <label className="learning-set-search">Tìm bộ từ<input type="search" value={filters.query} onChange={(event) => changeFilter("q", event.target.value)} placeholder="Ví dụ: gia đình, đồ ăn…" /></label>
          <label>Lớp học<select value={filters.grade ?? ""} onChange={(event) => changeFilter("level", event.target.value)}>
            <option value="">Tất cả lớp</option>
            {(["GRADE_1", "GRADE_2", "GRADE_3", "GRADE_4", "GRADE_5", "GENERAL"] as const).map((grade) => <option value={grade} key={grade}>{gradeLabel(grade)}</option>)}
          </select></label>
          <label>Chủ đề<select value={filters.topicId ?? ""} onChange={(event) => changeFilter("topicId", event.target.value)}>
            <option value="">Tất cả chủ đề</option>
            {topicOptions.map((topic) => <option value={topic.id} key={topic.id}>{topic.name}</option>)}
          </select></label>
          {(filters.grade || filters.topicId || filters.query) ? <button className="learning-set-clear-filters" type="button" onClick={clearFilters}>Xóa bộ lọc</button> : null}
        </div> : null}
        {state === "ready" && learningSets.length === 0 ? (
          <EmptyState className="vocabulary-empty" icon="folder" title="Chưa có bộ từ đã duyệt" description="Danh mục chưa có bộ từ chứa nội dung phù hợp để hiển thị." action={<Link className="button secondary" to="/topics">Khám phá chủ đề</Link>} testId="learning-sets-empty" />
        ) : null}
        {state === "ready" && learningSets.length > 0 ? <>
          <p className="learning-set-results" aria-live="polite">{visibleLearningSets.length} / {learningSets.length} bộ từ</p>
          {visibleLearningSets.length === 0 ? <EmptyState className="vocabulary-empty" icon="search" title="Không tìm thấy bộ từ phù hợp" description="Thử bỏ bớt bộ lọc hoặc đổi từ khóa tìm kiếm." action={<button className="button secondary" type="button" onClick={clearFilters}>Xóa bộ lọc</button>} testId="learning-sets-filtered-empty" /> : (
            <ul className="learning-set-list" data-testid="learning-sets-list">
              {visibleLearningSets.map((learningSet) => (
                <li className="learning-set-row" key={learningSet.id}>
                  <div className="learning-set-copy">
                    <div className="learning-set-heading"><strong>{learningSet.name}</strong><span>
                      {learningSet.classificationStatus === "SOURCE_VERIFIED" ? "CEFR · Có nguồn" :
                        learningSet.classificationStatus === "INFERRED_REVIEWABLE" ? "Gợi ý · Cần xem lại" : gradeLabel(learningSet.grade)}
                    </span></div>
                    <p>{learningSet.description}</p>
                    <small>{learningSet.vocabularyCount} từ đang bật</small>
                    <div className="learning-set-topic-links" aria-label={`Chủ đề trong ${learningSet.name}`}>
                      {learningSet.topics?.length ? learningSet.topics.map((topic) => <Link key={topic.id} to={topicHref(topic.id, learningSet.grade)}>{topic.name}</Link>) : <span>Chưa có chủ đề được duyệt</span>}
                    </div>
                  </div>
                  <Link className="button secondary learning-set-open" to={`/learning-sets/${learningSet.id}`}>Xem bộ từ</Link>
                </li>
              ))}
            </ul>
          )}
        </> : null}
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
  if (activeLearner.id === GUEST_ID && Number.isSafeInteger(parsedId) && parsedId > 0) return <GuestCollectionPage kind="learning-set" id={parsedId} />;
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
