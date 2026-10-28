import { CatalogLearningFilters } from "./catalog-learning-filters";
import { catalogLearningFilterParams, readCatalogLearningFilters } from "./catalog-learning-filter-state";
import { ActiveLearnerContext } from "./learner-context";
import { GuestCollectionPage } from "../guest/guest-collection-page";
import { GUEST_ID } from "../guest/guest-store";
import { AccountLearningState } from "./account-learning-state";
import { useContext, useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import type { LearnerDto, TopicDto, VocabularyDto, VocabularyLevel } from "@vocabflow/contracts";
import { useActiveLearner } from "./learner-context-hook";
import { LearnerVocabularyClientError, requestLearnerVocabulary } from "./vocabulary-list-client";
import { ProgressInsightsClientError, requestTopicProgress } from "./progress-insights-client";
import { requestTopicVocabulary, requestTopics, TopicsClientError } from "./topics-client";
import { CollectionDetailView } from "./collection-detail-view";
import { getVietnameseMeaningPresentation } from "../vocabulary/vocabulary-presentation";
import type { VocabularyCardItem } from "./vocabulary-card";
import { EmptyState, ErrorState, LoadingState } from "../../components/async-states";

type LoadState = "loading" | "ready" | "error";

function errorMessage(error: unknown, topic = false) {
  if (error instanceof TopicsClientError && error.status === 401) return "Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.";
  return topic
    ? "Không thể tải từ vựng theo chủ đề lúc này. Vui lòng thử lại."
    : "Không thể tải chủ đề lúc này. Vui lòng thử lại.";
}

export function TopicsPage() {
  const activeLearner = useContext(ActiveLearnerContext)?.activeLearner;
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const filters = readCatalogLearningFilters(params);
  const filterParams = catalogLearningFilterParams(params);
  const [topics, setTopics] = useState<TopicDto[]>([]);
  const [topicState, setTopicState] = useState<LoadState>("loading");
  const [topicMessage, setTopicMessage] = useState<string | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(() => Number(params.get("topicId")) || null);
  const [vocabulary, setVocabulary] = useState<VocabularyDto[]>([]);
  const [vocabularyState, setVocabularyState] = useState<LoadState>("ready");
  const [vocabularyMessage, setVocabularyMessage] = useState<string | null>(null);
  const [topicsRetry, setTopicsRetry] = useState(0);
  const [vocabularyRetry, setVocabularyRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void requestTopics()
      .then((items) => {
        if (cancelled) return;
        setTopics(items);
        setSelectedTopicId((current) => current && items.some((item) => item.id === current) ? current : null);
        setTopicState("ready");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setTopicState("error");
        setTopicMessage(errorMessage(error));
      });
    return () => { cancelled = true; };
  }, [topicsRetry]);

  useEffect(() => {
    if (selectedTopicId === null) return;
    let cancelled = false;
    void requestTopicVocabulary(selectedTopicId)
      .then((items) => {
        if (cancelled) return;
        setVocabulary(items);
        setVocabularyState("ready");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setVocabularyState("error");
        setVocabularyMessage(errorMessage(error, true));
      });
    return () => { cancelled = true; };
  }, [selectedTopicId, vocabularyRetry]);

  function selectTopic(topicId: number) {
    if (activeLearner?.id === GUEST_ID) { navigate(`/topics/${topicId}${filterParams.size ? `?${filterParams}` : ""}`); return; }
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.set("topicId", String(topicId));
      return next;
    });
    setSelectedTopicId(topicId);
    setVocabularyState("loading");
    setVocabularyMessage(null);
  }

  function retryTopics() {
    setTopicState("loading");
    setTopicMessage(null);
    setTopicsRetry((value) => value + 1);
  }

  function retryTopicVocabulary() {
    setVocabularyState("loading");
    setVocabularyMessage(null);
    setVocabularyRetry((value) => value + 1);
  }

  const visibleVocabulary = vocabulary.filter((item) => (!filters.level || item.level === filters.level) && (!filters.cefr || item.cefr === filters.cefr));
  const selectedTopic = topics.find((topic) => topic.id === selectedTopicId) ?? null;
  const relatedSetsParams = selectedTopic ? new URLSearchParams({ topicId: String(selectedTopic.id), ...(filters.level ? { level: filters.level } : {}) }) : null;

  return (
    <main className="learner-page" aria-labelledby="topics-title">
      <section className="learner-card topics-card">
        <div className="vocabulary-list-topbar">
          <Link className="back-link" to="/vocabulary">← Về danh sách từ vựng</Link>
        </div>
        <p className="auth-eyebrow">Chủ đề</p>
        <h1 className="auth-title" id="topics-title">Học theo chủ đề</h1>

        <CatalogLearningFilters />
        {topicState === "loading" ? <LoadingState className="vocabulary-list-state" label="Đang tải chủ đề…" pattern="cards" testId="topics-loading" /> : null}
        {topicState === "error" ? <ErrorState className="vocabulary-list-state vocabulary-list-error" title="Không thể tải chủ đề" description={topicMessage ?? "Vui lòng thử lại."} onRetry={retryTopics} testId="topics-error" /> : null}
        {topicState === "ready" && topics.length === 0 ? (
          <EmptyState className="vocabulary-empty" icon="topic" title="Nội dung chủ đề chưa sẵn sàng" description="Hiện chưa có chủ đề nào khả dụng. Bạn có thể khám phá từ vựng trong danh mục." action={<Link className="button secondary" to="/vocabulary">Khám phá từ vựng</Link>} testId="topics-empty-state" />
        ) : null}
        {topicState === "ready" && topics.length > 0 ? (
          <div className="topics-layout">
            <nav aria-label="Các chủ đề từ vựng" className="topic-list">
              {topics.map((topic) => (
                <button
                  className={topic.id === selectedTopicId ? "topic-button topic-button-active" : "topic-button"}
                  data-testid={`topic-${topic.slug}`}
                  key={topic.id}
                  type="button"
                  onClick={() => selectTopic(topic.id)}
                  aria-pressed={topic.id === selectedTopicId}
                >
                  <strong>{topic.name}</strong>
                  <span>{topic.parentTopicId ? `Thuộc ${topics.find((parent) => parent.id === topic.parentTopicId)?.name ?? "chủ đề lớn"}` : "Khám phá từ vựng"}</span>
                </button>
              ))}
            </nav>
            <section className="topic-vocabulary" aria-live="polite">
              {!selectedTopic ? <p data-testid="topic-select-prompt">Chọn một chủ đề để xem từ vựng.</p> : <>
                <h2>{selectedTopic.name}</h2>
                <div className="topic-actions">
                  <Link className="topic-detail-link" to={`/topics/${selectedTopic.id}${filterParams.size ? `?${filterParams}` : ""}`}>Xem chi tiết chủ đề</Link>
                  {relatedSetsParams ? <Link className="topic-detail-link" to={`/learning-sets?${relatedSetsParams}`}>Tìm bộ từ theo chủ đề</Link> : null}
                </div>
                {vocabularyState === "loading" ? <LoadingState className="vocabulary-list-state" label="Đang tải từ vựng theo chủ đề…" pattern="rows" testId="topic-vocabulary-loading" /> : null}
                {vocabularyState === "error" ? <ErrorState className="vocabulary-list-state vocabulary-list-error" title="Không thể tải từ vựng theo chủ đề" description={vocabularyMessage ?? "Vui lòng thử lại."} onRetry={retryTopicVocabulary} testId="topic-vocabulary-error" /> : null}
                {vocabularyState === "ready" && visibleVocabulary.length === 0 ? <EmptyState className="topic-vocabulary-empty" icon="book" title="Chủ đề chưa có từ vựng" description="Chưa có từ vựng nào đang bật trong chủ đề này." testId="topic-vocabulary-empty" /> : null}
                {vocabularyState === "ready" && vocabulary.length > 0 ? (
                  <ul className="vocabulary-list" data-testid="topic-vocabulary-list">
                    {visibleVocabulary.map((item) => { const meaning = getVietnameseMeaningPresentation(item); return <li className="vocabulary-list-row" key={item.id}><div className="vocabulary-list-copy"><strong>{item.word}</strong><small>{meaning.primaryLabel}</small><span>{meaning.primary}</span></div></li>; })}
                  </ul>
                ) : null}
              </>}
            </section>
          </div>
        ) : null}
      </section>
    </main>
  );
}

type TopicDetailState = "loading" | "ready" | "error" | "not-found";

type TopicDetailData = {
  topic: TopicDto;
  items: VocabularyCardItem[];
  level: VocabularyLevel | null;
  total: number;
  learned: number;
  mastered: number;
  hasAssignedVocabulary: boolean;
};

function topicDetailError(error: unknown) {
  if ((error instanceof TopicsClientError || error instanceof ProgressInsightsClientError || error instanceof LearnerVocabularyClientError) && error.status === 401) {
    return "Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.";
  }
  if ((error instanceof TopicsClientError || error instanceof ProgressInsightsClientError || error instanceof LearnerVocabularyClientError) && error.status === 403) {
    return "Không thể xem nội dung học tập của bạn.";
  }
  return "Không thể tải chi tiết chủ đề lúc này. Vui lòng thử lại.";
}

export function TopicDetailPage() {
  const { activeLearner } = useActiveLearner();
  const { topicId } = useParams();
  if (!activeLearner) {
    return <AccountLearningState />;
  }
  const parsedId = topicId && /^\d+$/.test(topicId) ? Number(topicId) : NaN;
  if (activeLearner.id === GUEST_ID && Number.isSafeInteger(parsedId) && parsedId > 0) return <GuestCollectionPage kind="topic" id={parsedId} />;
  return <TopicDetailExperience key={`${activeLearner.id}:${topicId ?? "missing"}`} learner={activeLearner} topicId={parsedId} />;
}

function TopicDetailExperience({ learner, topicId }: { learner: LearnerDto; topicId: number }) {
  const [params] = useSearchParams();
  const filters = readCatalogLearningFilters(params);
  const [state, setState] = useState<TopicDetailState>("loading");
  const [data, setData] = useState<TopicDetailData | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const validTopicId = Number.isSafeInteger(topicId) && topicId > 0;

  useEffect(() => {
    let cancelled = false;
    if (!validTopicId) return () => { cancelled = true; };
    void requestTopics()
      .then(async (topics) => {
        const topic = topics.find((item) => item.id === topicId);
        if (!topic) {
          if (!cancelled) setState("not-found");
          return;
        }
        const [topicVocabulary, learnerVocabulary, topicProgress] = await Promise.all([
          requestTopicVocabulary(topicId),
          requestLearnerVocabulary(learner.id),
          requestTopicProgress(learner.id)
        ]);
        const progress = topicProgress.topics.find((item) => item.topicId === topicId);
        if (!progress) throw new ProgressInsightsClientError("TOPIC_PROGRESS_NOT_FOUND", 404);
        const progressByVocabularyId = new Map(learnerVocabulary.map((item) => [item.id, item.status]));
        const items: VocabularyCardItem[] = topicVocabulary.map((item) => {
          const status = progressByVocabularyId.get(item.id);
          return status ? { ...item, status } : item;
        });
        const firstLevel = items[0]?.level ?? null;
        const level = firstLevel && items.every((item) => item.level === firstLevel) ? firstLevel : null;
        if (cancelled) return;
        setData({
          topic,
          items,
          level,
          total: items.length,
          learned: items.filter((item) => item.status === "LEARNING" || item.status === "MASTERED").length,
          mastered: items.filter((item) => item.status === "MASTERED").length,
          hasAssignedVocabulary: progress.total > 0
        });
        setState("ready");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if ((error instanceof TopicsClientError || error instanceof ProgressInsightsClientError) && error.status === 404) {
          setState("not-found");
          return;
        }
        setMessage(topicDetailError(error));
        setState("error");
      });
    return () => { cancelled = true; };
  }, [learner.id, retryCount, topicId, validTopicId]);

  if (!validTopicId || state === "not-found") {
    return (
      <main className="collection-detail-page" aria-label="Chi tiết chủ đề">
        <div className="collection-detail-state collection-detail-missing" role="status" data-testid="topic-detail-not-found">
          <h1>Chủ đề này hiện không khả dụng.</h1><Link to="/topics">Quay lại chủ đề</Link>
        </div>
      </main>
    );
  }

  if (state === "ready" && data) {
    const items = data.items.filter((item) => (!filters.level || item.level === filters.level) && (!filters.cefr || item.cefr === filters.cefr));
    const scopeParams = catalogLearningFilterParams(params); scopeParams.set("topicId", String(data.topic.id));
    return (<><CatalogLearningFilters />
      <CollectionDetailView
        kind="topic"
        title={data.topic.name}
        description={`Từ vựng về ${data.topic.name.toLocaleLowerCase("vi-VN")}.`}
        level={filters.level ?? data.level}
        items={items}
        learnedCount={items.filter((item) => item.status === "LEARNING" || item.status === "MASTERED").length}
        progressTotal={items.length}
        masteredCount={items.filter((item) => item.status === "MASTERED").length}
        studyHref={`/study/setup?${scopeParams}`}
        studyReady={data.topic.studyScopeAvailable === true || data.hasAssignedVocabulary}
        directStudyScope={data.topic.studyScopeAvailable === true}
        assignmentHref={items.length > 0 && !data.hasAssignedVocabulary ? "/learning-sets/assign" : undefined}
      /></>
    );
  }

  return (
    <main className="collection-detail-page" aria-label="Chi tiết chủ đề">
      {state === "loading" ? <LoadingState className="collection-detail-state" label="Đang tải chi tiết chủ đề…" pattern="detail" testId="topic-detail-loading" /> : null}
      {state === "error" ? (
        <ErrorState className="collection-detail-state collection-detail-error" title="Không thể tải chi tiết chủ đề" description={message ?? "Vui lòng thử lại."} onRetry={() => { setState("loading"); setData(null); setMessage(null); setRetryCount((current) => current + 1); }} testId="topic-detail-error" />
      ) : null}
    </main>
  );
}
