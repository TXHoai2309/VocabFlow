import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router";
import { LearningSetsClientError, requestLearningSet } from "../learning-sets/learning-sets-client";
import { useActiveLearner } from "../learners/learner-context-hook";
import { requestTopicVocabulary, requestTopics, TopicsClientError } from "../learners/topics-client";
import type { LearnerDto, ReviewQueueResponse } from "@vocabflow/contracts";
import { requestScopedReviewQueue, studyScopeFromParams, type StudyContentMode, type StudyScope } from "./study-queue";

const STUDY_AMOUNTS = [5, 10, 20, 30] as const;
const MODE_COPY: Record<StudyContentMode, { title: string; description: string; empty: string; icon: "new" | "review" | "mixed" }> = {
  new: { title: "Từ mới", description: "Học những từ vựng chưa học", empty: "Hiện chưa có từ mới cần học", icon: "new" },
  review: { title: "Ôn tập", description: "Ôn lại những từ đến hạn", empty: "Hiện chưa có từ cần ôn", icon: "review" },
  mixed: { title: "Kết hợp", description: "Kết hợp từ mới và ôn tập", empty: "Chưa có từ mới hoặc từ đến hạn", icon: "mixed" }
};

type SetupState = "loading" | "ready" | "error" | "not-found";
type StudySetupData = { queue: ReviewQueueResponse; scopeName: string | null };
type StudyScopeDetails = { scopeName: string; vocabularyIds: number[] };

function availableCount(queue: ReviewQueueResponse, mode: StudyContentMode) {
  if (mode === "mixed") return queue.queue.length;
  return queue.queue.filter((item) => item.queueType === (mode === "new" ? "NEW" : "DUE")).length;
}

function defaultMode(queue: ReviewQueueResponse): StudyContentMode {
  if (availableCount(queue, "new") > 0 && availableCount(queue, "review") > 0) return "mixed";
  if (availableCount(queue, "new") > 0) return "new";
  if (availableCount(queue, "review") > 0) return "review";
  return "mixed";
}

function isMissingScope(error: unknown) {
  return (error instanceof LearningSetsClientError || error instanceof TopicsClientError) && error.status === 404;
}

function SetupIcon({ name }: { name: "back" | "layers" | "new" | "review" | "mixed" | "clipboard" | "check" | "play" | "bulb" }) {
  const paths = {
    back: "M19 12H5m7 7-7-7 7-7",
    layers: "m12 3 9 5-9 5-9-5 9-5zm-9 9 9 5 9-5M3 17l9 5 9-5",
    new: "M12 3v3m0 12v3m9-9h-3M6 12H3m15.36-6.36-2.12 2.12M7.76 16.24l-2.12 2.12m12.72 0-2.12-2.12M7.76 7.76 5.64 5.64M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
    review: "M20 11a8 8 0 0 0-14.9-3M4 4v4h4m-4 5a8 8 0 0 0 14.9 3M20 20v-4h-4",
    mixed: "m16 3 4 4-4 4M4 7h16m-12 14-4-4 4-4m12 4H4",
    clipboard: "M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2m-6 0a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2 2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2Zm0 7h6m-6 4h6",
    check: "m5 12 4 4L19 6",
    play: "m8 5 12 7-12 7V5Z",
    bulb: "M9 18h6m-5 4h4m-7-9a6 6 0 1 1 10 0c-.8.9-1.3 1.6-1.5 3h-7c-.2-1.4-.7-2.1-1.5-3Z"
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name]} /></svg>;
}

function returnHref(scope: StudyScope | null) {
  if (scope?.type === "topic") return `/topics/${scope.id}`;
  if (scope?.type === "learning-set") return `/learning-sets/${scope.id}`;
  return "/learners";
}

async function requestScopeDetails(scope: Exclude<StudyScope, { type: "invalid" }>): Promise<StudyScopeDetails> {
  if (scope.type === "topic") {
    const [topics, vocabulary] = await Promise.all([requestTopics(), requestTopicVocabulary(scope.id)]);
    const topic = topics.find((item) => item.id === scope.id);
    if (!topic) throw new TopicsClientError("SCOPE_NOT_FOUND", 404);
    return { scopeName: topic.name, vocabularyIds: vocabulary.map((item) => item.id) };
  }
  const learningSet = await requestLearningSet(scope.id);
  return { scopeName: learningSet.name, vocabularyIds: learningSet.items.map((item) => item.vocabulary.id) };
}

async function requestSetupData(learnerId: string, scope: StudyScope | null): Promise<StudySetupData> {
  if (scope?.type === "invalid") throw new TopicsClientError("INVALID_SCOPE", 404);
  if (!scope) return { queue: await requestScopedReviewQueue(learnerId, null), scopeName: null };
  const detailsPromise = requestScopeDetails(scope);
  const [queue, details] = await Promise.all([
    requestScopedReviewQueue(learnerId, scope, detailsPromise.then((details) => details.vocabularyIds)),
    detailsPromise
  ]);
  return { queue, scopeName: details.scopeName };
}

export function StudySetupPage() {
  const { activeLearner } = useActiveLearner();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const scope = useMemo(() => studyScopeFromParams(searchParams), [searchParams]);
  const scopeKey = scope ? `${scope.type}:${"id" in scope ? scope.id : "invalid"}` : "all";
  if (!activeLearner) {
    return <Navigate to="/learners" replace state={{ returnTo: `${location.pathname}${location.search}` }} />;
  }
  return <StudySetupExperience key={`${activeLearner.id}:${scopeKey}`} activeLearner={activeLearner} scope={scope} />;
}

function StudySetupExperience({ activeLearner, scope }: { activeLearner: LearnerDto; scope: StudyScope | null }) {
  const navigate = useNavigate();
  const [state, setState] = useState<SetupState>("loading");
  const [data, setData] = useState<StudySetupData | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [amount, setAmount] = useState<(typeof STUDY_AMOUNTS)[number]>(10);
  const [content, setContent] = useState<StudyContentMode | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void requestSetupData(activeLearner.id, scope)
      .then((nextData) => {
        if (cancelled) return;
        setData(nextData);
        setContent(defaultMode(nextData.queue));
        setState("ready");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (isMissingScope(error)) {
          setState("not-found");
          return;
        }
        setMessage("Không thể tải nội dung học lúc này. Vui lòng thử lại.");
        setState("error");
      });
    return () => { cancelled = true; };
  }, [activeLearner.id, retry, scope]);

  const backHref = returnHref(scope);
  if (state === "not-found") {
    return (
      <main className="study-setup-page" aria-label="Thiết lập buổi học">
        <div className="study-setup-empty" role="status" data-testid="study-setup-scope-not-found">
          <h1>Không tìm thấy nội dung học</h1>
          <p>Nội dung này hiện không khả dụng.</p>
          <Link className="study-setup-back-link" to={backHref}>Quay lại</Link>
        </div>
      </main>
    );
  }

  if (state === "ready" && data && data.queue.queue.length === 0) {
    return (
      <main className="study-setup-page" aria-label="Thiết lập buổi học">
        <div className="study-setup-empty" role="status" data-testid="study-setup-empty">
          <h1>Chưa có từ để học</h1>
          <p>Nội dung này hiện chưa có từ phù hợp cho buổi học.</p>
          <Link className="study-setup-back-link" to={backHref}>Quay lại</Link>
        </div>
      </main>
    );
  }

  if (state === "loading") {
    return (
      <main className="study-setup-page" aria-label="Thiết lập buổi học" aria-busy="true">
        <div className="study-setup-status" role="status" data-testid="study-setup-loading">Đang tải danh sách học…</div>
      </main>
    );
  }

  if (state === "error") {
    return (
      <main className="study-setup-page" aria-label="Thiết lập buổi học">
        <div className="study-setup-empty" role="alert" data-testid="study-setup-error">
          <p>{message}</p>
          <button className="study-setup-secondary-button" type="button" onClick={() => { setState("loading"); setData(null); setMessage(null); setRetry((value) => value + 1); }}>Thử lại</button>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="study-setup-page" aria-label="Thiết lập buổi học" aria-busy="true">
        <div className="study-setup-status" role="status" data-testid="study-setup-loading">Đang tải danh sách học…</div>
      </main>
    );
  }

  const availability = {
    new: availableCount(data.queue, "new"),
    review: availableCount(data.queue, "review"),
    mixed: availableCount(data.queue, "mixed")
  };
  const selectedContent = content ?? defaultMode(data.queue);
  const available = availability[selectedContent];
  const plannedCount = Math.min(amount, available);

  function startStudy() {
    if (available === 0) return;
    const params = new URLSearchParams();
    if (scope?.type === "topic" || scope?.type === "learning-set") {
      params.set(scope.type === "topic" ? "topicId" : "learningSetId", String(scope.id));
    }
    params.set("count", String(amount));
    params.set("content", selectedContent);
    navigate(`/study?${params.toString()}`);
  }

  return (
    <main className="study-setup-page" aria-labelledby="study-setup-title" data-testid="study-setup-page">
      <header className="study-setup-header">
        <Link className="study-setup-back-link" to={backHref}><SetupIcon name="back" />Quay lại</Link>
        <h1 id="study-setup-title">Thiết lập buổi học</h1>
        <p>Chọn số lượng từ và chế độ học phù hợp với mục tiêu của bạn.</p>
      </header>

      <div className="study-setup-layout">
        <section className="study-setup-options" aria-label="Tùy chọn buổi học">
          <section className="study-setup-section" aria-labelledby="study-setup-amount-title">
            <div className="study-setup-section-heading">
              <span className="study-setup-section-icon"><SetupIcon name="layers" /></span>
              <div><h2 id="study-setup-amount-title">Số lượng từ</h2><p>Chọn số từ trong mỗi buổi học.</p></div>
            </div>
            <div className="study-setup-amounts" role="group" aria-labelledby="study-setup-amount-title">
              {STUDY_AMOUNTS.map((value) => (
                <button key={value} className={`study-setup-amount${amount === value ? " is-selected" : ""}`} type="button" aria-pressed={amount === value} onClick={() => setAmount(value)}>
                  {amount === value ? <span className="study-setup-selected-check"><SetupIcon name="check" /></span> : null}
                  <strong>{value}</strong><span>từ</span>
                </button>
              ))}
            </div>
          </section>

          <section className="study-setup-section study-setup-mode-section" aria-labelledby="study-setup-mode-title">
            <div className="study-setup-section-heading">
              <span className="study-setup-section-icon"><SetupIcon name="mixed" /></span>
              <div><h2 id="study-setup-mode-title">Chế độ học</h2><p>Chọn loại từ để đưa vào buổi học.</p></div>
            </div>
            <div className="study-setup-modes" role="group" aria-labelledby="study-setup-mode-title">
              {(Object.keys(MODE_COPY) as StudyContentMode[]).map((mode) => {
                const copy = MODE_COPY[mode];
                const disabled = availability[mode] === 0;
                return (
                  <button key={mode} className={`study-setup-mode${selectedContent === mode ? " is-selected" : ""}`} type="button" aria-pressed={selectedContent === mode} disabled={disabled} onClick={() => setContent(mode)}>
                    <span className="study-setup-mode-icon"><SetupIcon name={copy.icon} /></span>
                    {selectedContent === mode ? <span className="study-setup-selected-check"><SetupIcon name="check" /></span> : null}
                    <strong>{copy.title}</strong><span>{copy.description}</span>
                    {disabled ? <small>{copy.empty}</small> : null}
                  </button>
                );
              })}
            </div>
          </section>

          <div className="study-setup-tip"><span className="study-setup-tip-icon"><SetupIcon name="bulb" /></span><p>Thiết lập mặc định phù hợp cho hầu hết buổi học.</p></div>
          <button className="study-setup-start" type="button" disabled={available === 0} onClick={startStudy}><SetupIcon name="play" />Bắt đầu học<SetupIcon name="back" /></button>
          <p className="study-setup-note">Bạn có thể thay đổi thiết lập bất cứ lúc nào.</p>
        </section>

        <aside className="study-setup-aside" aria-label="Tóm tắt và gợi ý">
          <section className="study-setup-summary" aria-labelledby="study-setup-summary-title">
            <h2 id="study-setup-summary-title"><SetupIcon name="clipboard" />Tóm tắt buổi học</h2>
            <dl>
              <div><dt>Số lượng từ</dt><dd data-testid="study-setup-summary-count">{plannedCount} từ</dd></div>
              <div><dt>Chế độ học</dt><dd data-testid="study-setup-summary-mode">{MODE_COPY[selectedContent].title}</dd></div>
              {data.scopeName ? <div><dt>{scope?.type === "topic" ? "Chủ đề" : "Bộ từ"}</dt><dd data-testid="study-setup-summary-scope">{data.scopeName}</dd></div> : null}
            </dl>
            {plannedCount < amount ? <p className="study-setup-availability">Có {plannedCount} từ phù hợp trong phạm vi này.</p> : null}
          </section>
          <section className="study-setup-suggestions" aria-labelledby="study-setup-suggestions-title">
            <h2 id="study-setup-suggestions-title"><span><SetupIcon name="bulb" /></span>Gợi ý</h2>
            <ul>
              <li><span><SetupIcon name="check" /></span>Bắt đầu với 10 từ mỗi buổi để duy trì sự tập trung.</li>
              <li><span><SetupIcon name="check" /></span>Chọn chế độ phù hợp với mục tiêu học hôm nay.</li>
              <li><span><SetupIcon name="check" /></span>Bạn luôn có thể điều chỉnh thiết lập sau này.</li>
            </ul>
          </section>
        </aside>
      </div>
    </main>
  );
}
