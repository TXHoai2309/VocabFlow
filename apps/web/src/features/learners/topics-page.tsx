import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useParams } from "react-router";
import type { LearnerDto, TopicDto, VocabularyDto, VocabularyLevel } from "@vocabflow/contracts";
import { useActiveLearner } from "./learner-context-hook";
import { LearnerVocabularyClientError, requestLearnerVocabulary } from "./vocabulary-list-client";
import { ProgressInsightsClientError, requestTopicProgress } from "./progress-insights-client";
import { requestTopicVocabulary, requestTopics, TopicsClientError } from "./topics-client";
import { CollectionDetailView } from "./collection-detail-view";
import type { VocabularyCardItem } from "./vocabulary-card";

type LoadState = "loading" | "ready" | "error";

function errorMessage(error: unknown, topic = false) {
  if (error instanceof TopicsClientError && error.status === 401) return "Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.";
  return topic
    ? "Không thể tải từ vựng theo chủ đề lúc này. Vui lòng thử lại."
    : "Không thể tải chủ đề lúc này. Vui lòng thử lại.";
}

export function TopicsPage() {
  const [topics, setTopics] = useState<TopicDto[]>([]);
  const [topicState, setTopicState] = useState<LoadState>("loading");
  const [topicMessage, setTopicMessage] = useState<string | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const [vocabulary, setVocabulary] = useState<VocabularyDto[]>([]);
  const [vocabularyState, setVocabularyState] = useState<LoadState>("ready");
  const [vocabularyMessage, setVocabularyMessage] = useState<string | null>(null);

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
  }, []);

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
  }, [selectedTopicId]);

  function selectTopic(topicId: number) {
    setSelectedTopicId(topicId);
    setVocabularyState("loading");
    setVocabularyMessage(null);
  }

  const selectedTopic = topics.find((topic) => topic.id === selectedTopicId) ?? null;

  return (
    <main className="learner-page" aria-labelledby="topics-title">
      <section className="learner-card topics-card">
        <div className="vocabulary-list-topbar">
          <Link className="back-link" to="/vocabulary">← Về danh sách từ vựng</Link>
        </div>
        <p className="auth-eyebrow">Chủ đề</p>
        <h1 className="auth-title" id="topics-title">Học theo chủ đề</h1>

        {topicState === "loading" ? <div className="vocabulary-list-state" data-testid="topics-loading" role="status">Đang tải chủ đề…</div> : null}
        {topicState === "error" ? <div className="vocabulary-list-state vocabulary-list-error" data-testid="topics-error" role="alert">{topicMessage}</div> : null}
        {topicState === "ready" && topics.length === 0 ? (
          <div className="vocabulary-empty" data-testid="topics-empty-state" role="status">
            <h2>Chưa có chủ đề</h2>
            <p>Danh mục chủ đề hiện đang trống.</p>
          </div>
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
                  <span>{topic.description}</span>
                </button>
              ))}
            </nav>
            <section className="topic-vocabulary" aria-live="polite">
              {!selectedTopic ? <p data-testid="topic-select-prompt">Chọn một chủ đề để xem từ vựng.</p> : <>
                <h2>{selectedTopic.name}</h2>
                <Link className="topic-detail-link" to={`/topics/${selectedTopic.id}`}>Xem chi tiết chủ đề</Link>
                {vocabularyState === "loading" ? <div className="vocabulary-list-state" data-testid="topic-vocabulary-loading" role="status">Đang tải từ vựng…</div> : null}
                {vocabularyState === "error" ? <div className="vocabulary-list-state vocabulary-list-error" data-testid="topic-vocabulary-error" role="alert">{vocabularyMessage}</div> : null}
                {vocabularyState === "ready" && vocabulary.length === 0 ? <p data-testid="topic-vocabulary-empty">Chủ đề này chưa có từ vựng nào đang bật.</p> : null}
                {vocabularyState === "ready" && vocabulary.length > 0 ? (
                  <ul className="vocabulary-list" data-testid="topic-vocabulary-list">
                    {vocabulary.map((item) => <li className="vocabulary-list-row" key={item.id}><div className="vocabulary-list-copy"><strong>{item.word}</strong><span>{item.vietnamese}</span></div></li>)}
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
    return "Không thể xem nội dung của người học này.";
  }
  return "Không thể tải chi tiết chủ đề lúc này. Vui lòng thử lại.";
}

export function TopicDetailPage() {
  const { activeLearner } = useActiveLearner();
  const location = useLocation();
  const { topicId } = useParams();
  if (!activeLearner) {
    return <Navigate to="/learners" replace state={{ returnTo: `${location.pathname}${location.search}` }} />;
  }
  const parsedId = topicId && /^\d+$/.test(topicId) ? Number(topicId) : NaN;
  return <TopicDetailExperience key={`${activeLearner.id}:${topicId ?? "missing"}`} learner={activeLearner} topicId={parsedId} />;
}

function TopicDetailExperience({ learner, topicId }: { learner: LearnerDto; topicId: number }) {
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
    return (
      <CollectionDetailView
        kind="topic"
        title={data.topic.name}
        description={data.topic.description}
        level={data.level}
        items={data.items}
        learnedCount={data.learned}
        progressTotal={data.total}
        masteredCount={data.mastered}
        studyHref={`/study/setup?topicId=${data.topic.id}`}
        studyReady={data.hasAssignedVocabulary}
        assignmentHref={data.items.length > 0 && !data.hasAssignedVocabulary ? "/learning-sets/assign" : undefined}
      />
    );
  }

  return (
    <main className="collection-detail-page" aria-label="Chi tiết chủ đề">
      {state === "loading" ? <div className="collection-detail-state" role="status" data-testid="topic-detail-loading">Đang tải chi tiết chủ đề…</div> : null}
      {state === "error" ? (
        <div className="collection-detail-state collection-detail-error" role="alert" data-testid="topic-detail-error">
          <p>{message}</p><button className="auth-retry" type="button" onClick={() => { setState("loading"); setData(null); setMessage(null); setRetryCount((current) => current + 1); }}>Thử lại</button>
        </div>
      ) : null}
    </main>
  );
}
