import { useEffect, useState } from "react";
import { Link } from "react-router";
import type { TopicDto, VocabularyDto } from "@vocabflow/contracts";
import { requestTopicVocabulary, requestTopics, TopicsClientError } from "./topics-client";

type LoadState = "loading" | "ready" | "error";

function errorMessage(error: unknown, topic = false) {
  if (error instanceof TopicsClientError && error.status === 401) return "Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.";
  return topic
    ? "Không thể tải vocabulary theo chủ đề lúc này. Vui lòng thử lại."
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
        <p className="auth-eyebrow">Topics</p>
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
            <nav aria-label="Vocabulary topics" className="topic-list">
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
                {vocabularyState === "loading" ? <div className="vocabulary-list-state" data-testid="topic-vocabulary-loading" role="status">Đang tải vocabulary…</div> : null}
                {vocabularyState === "error" ? <div className="vocabulary-list-state vocabulary-list-error" data-testid="topic-vocabulary-error" role="alert">{vocabularyMessage}</div> : null}
                {vocabularyState === "ready" && vocabulary.length === 0 ? <p data-testid="topic-vocabulary-empty">Chủ đề này chưa có vocabulary đang bật.</p> : null}
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
