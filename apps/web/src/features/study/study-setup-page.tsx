import { LearningSetPickerDialog } from "./learning-set-picker-dialog";
import { readStudyPreference, saveStudyPreference } from "./study-source-preference";
import { AccountLearningState } from "../learners/account-learning-state";
import { SessionCapacityControl } from "./session-capacity";
import type { SessionCapacity } from "./session-capacity-options";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import { LearningSetsClientError, requestLearningSets } from "../learning-sets/learning-sets-client";
import { useActiveLearner } from "../learners/learner-context-hook";
import { requestTopics, TopicsClientError } from "../learners/topics-client";
import type { LearnerDto, ReviewQueueResponse, LearningSetSummary, LearningSourceScope } from "@vocabflow/contracts";
import { learningLevelLabel } from "@vocabflow/contracts";
import { requestScopedReviewQueue, selectStudyQueue, studyContentModeFromParams, studyScopeFromParams, type StudyContentMode, type StudyScope, studyScopeParams } from "./study-queue";
import { EmptyState, ErrorState, LoadingState } from "../../components/async-states";

const MODE_COPY: Record<StudyContentMode, { title: string; description: string; empty: string; icon: "new" | "review" | "mixed" }> = {
  new: { title: "Từ mới", description: "Học những từ vựng chưa học", empty: "Hiện chưa có từ mới cần học", icon: "new" },
  review: { title: "Ôn tập", description: "Ôn lại những từ đến hạn", empty: "Hiện chưa có từ cần ôn", icon: "review" },
  mixed: { title: "Kết hợp", description: "Kết hợp từ mới và ôn tập", empty: "Chưa có từ mới hoặc từ đến hạn", icon: "mixed" }
};

type SetupState = "loading" | "ready" | "error" | "not-found";
type StudySetupData = { queue: ReviewQueueResponse; scopeName: string | null };
type StudyScopeDetails = { scopeName: string };

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
  const params = new URLSearchParams();
  if (scope && "level" in scope && scope.level) params.set("level", scope.level);
  if (scope && "cefr" in scope && scope.cefr) params.set("cefr", scope.cefr);
  const suffix = params.size ? `?${params}` : "";
  if (scope?.type === "topic") return `/topics/${scope.id}${suffix}`;
  if (scope?.type === "learning-set") return `/learning-sets/${scope.id}`;
  if (scope?.type === "saved") return "/saved";
  if (scope?.type === "weak") return "/weak-words";
  return "/";
}

async function requestScopeDetails(scope: Exclude<StudyScope, { type: "invalid" }>, sets: LearningSetSummary[] | null): Promise<StudyScopeDetails> {
  if (scope.type === "topic") {
    const topics = await requestTopics();
    const topic = topics.find((item) => item.id === scope.id);
    if (!topic) throw new TopicsClientError("SCOPE_NOT_FOUND", 404);
    return { scopeName: topic.name };
  }
  if (scope.type === "all" || scope.type === "pathway" || scope.type === "custom") return { scopeName: scope.type };
  if (scope.type === "saved") return { scopeName: "Từ đã lưu" };
  if (scope.type === "weak") return { scopeName: "Từ yếu" };
  const learningSet = sets?.find((set) => set.id === scope.id);
  if (!learningSet) throw new LearningSetsClientError("SCOPE_NOT_FOUND", 404);
  return { scopeName: learningSet.name };
}

async function requestSetupData(learnerId: string, scope: StudyScope | null, sets: LearningSetSummary[] | null): Promise<StudySetupData> {
  if (scope?.type === "invalid") throw new TopicsClientError("INVALID_SCOPE", 404);
  if (!scope) return { queue: await requestScopedReviewQueue(learnerId, null, 30), scopeName: null };
  if (scope.type === "saved") return { queue: await requestScopedReviewQueue(learnerId, scope, 30), scopeName: "Từ đã lưu" };
  if (scope.type === "weak") return { queue: await requestScopedReviewQueue(learnerId, scope), scopeName: "Từ yếu" };
  const detailsPromise = requestScopeDetails(scope, sets);
  const [queue, details] = await Promise.all([
    requestScopedReviewQueue(learnerId, scope, 30),
    detailsPromise
  ]);
  return { queue, scopeName: details.scopeName };
}

export function StudySetupPage() {
  const { activeLearner, userId } = useActiveLearner();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const scope = useMemo(() => studyScopeFromParams(searchParams), [searchParams]);
  const preferredContent = useMemo(() => studyContentModeFromParams(searchParams), [searchParams]);
  const scopeKey = scope?.type === "saved"
    ? `saved:${scope.all ? "all" : "scheduled"}`
    : scope?.type === "weak" ? "weak"
    : scope ? JSON.stringify(scope) : "all";
  if (!activeLearner) {
    return <AccountLearningState />;
  }
  return <StudySetupExperience key={`${userId ?? ""}:${activeLearner.id}:${scopeKey}:${preferredContent ?? "default"}`} activeLearner={activeLearner} userId={userId} scope={scope} preferredContent={preferredContent} returnTo={`${location.pathname}${location.search}`} />;
}

function StudySetupExperience({ activeLearner, scope: urlScope, userId, preferredContent, returnTo }: { activeLearner: LearnerDto; userId?: string; scope: StudyScope | null; preferredContent: StudyContentMode | null; returnTo: string }) {
  const navigate = useNavigate();
  const [preference] = useState(() => readStudyPreference(userId));
  const [source, setSource] = useState<LearningSourceScope["type"]>(urlScope?.type === "custom" || urlScope?.type === "all" || urlScope?.type === "pathway" ? urlScope.type : urlScope?.type === "learning-set" ? "custom" : preference.source);
  const [ids, setIds] = useState<number[]>(urlScope?.type === "custom" ? urlScope.ids : urlScope?.type === "learning-set" ? [urlScope.id] : preference.ids);
  const [override, setOverride] = useState(false);
  const [sets, setSets] = useState<LearningSetSummary[] | null>(null);
  const [catalogRetry, setCatalogRetry] = useState(0);
  const [picker, setPicker] = useState(false);
  const catalogRequest = useRef<Promise<LearningSetSummary[]> | null>(null);
  const [catalogError, setCatalogError] = useState(false);
  const scope = useMemo<StudyScope>(() => {
    if (urlScope && !override) return urlScope;
    const filters = urlScope && "level" in urlScope ? { ...(urlScope.level ? { level: urlScope.level } : {}), ...(urlScope.cefr ? { cefr: urlScope.cefr } : {}) }
      : urlScope && "cefr" in urlScope && urlScope.cefr ? { cefr: urlScope.cefr } : {};
    return { ...(source === "custom" ? { type: "custom" as const, ids } : { type: source }), ...filters };
  }, [urlScope, override, source, ids]);
  const sourceName = source === "pathway" ? "Học theo lộ trình" : source === "all" ? "Tất cả bộ từ" : `${ids.length} bộ từ`;

  const [state, setState] = useState<SetupState>("loading");
  const [data, setData] = useState<StudySetupData | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [amount, setAmount] = useState<SessionCapacity>(10);
  const [content, setContent] = useState<StudyContentMode | null>(null);
  const [retry, setRetry] = useState(0);

  const requiresCatalog = ["custom", "learning-set"].includes(scope.type);
  useEffect(() => {
    if ((!["pathway", "all", "custom", "learning-set"].includes(scope.type) && !picker) || sets) return;
    let cancelled = false;
    if (!catalogRequest.current) catalogRequest.current = requestLearningSets().then((list) => list.filter((set) => set.enabled));
    void catalogRequest.current.then((enabled) => {
      if (cancelled) return;
      setCatalogError(false);
      setSets(enabled);
      if (!urlScope) {
        setIds((current) => {
          const valid = current.filter((id) => enabled.some((set) => set.id === id));
          if (valid.length !== current.length) saveStudyPreference(userId, readStudyPreference(userId).source, valid);
          return valid.length === current.length ? current : valid;
        });
      }
    }).catch(() => {
      catalogRequest.current = null;
      if (!cancelled) setCatalogError(true);
    });
    return () => { cancelled = true; };
  }, [requiresCatalog, scope.type, picker, sets, catalogRetry, urlScope, userId]);

  const scopeSets = requiresCatalog ? sets : null;

  useEffect(() => {
    let cancelled = false;
    if (requiresCatalog && !scopeSets) return;
    void Promise.resolve().then(async () => {
      if (cancelled) return;
      setState("loading");
      if (scope.type === "custom" && ids.length === 0) {
        setData({ queue: { learnerId: activeLearner.id, reviewDate: new Date().toISOString().slice(0, 10), queue: [], newCount: 0, dueCount: 0 }, scopeName: null });
        setState("ready"); return;
      }
      try {
        const nextData = await requestSetupData(activeLearner.id, scope, scopeSets);
        if (cancelled) return;
        setData(nextData); setContent((current) => current ?? preferredContent ?? defaultMode(nextData.queue)); setState("ready");
      } catch (error: unknown) {
        if (cancelled) return;
        if (isMissingScope(error) || scope.type === "invalid" || (error instanceof Error && "status" in error && error.status === 404)) { setState("not-found"); return; }
        setMessage("Không thể tải nội dung học lúc này. Vui lòng thử lại."); setState("error");
      }
    });
    return () => { cancelled = true; };
  }, [activeLearner.id, preferredContent, retry, scope, scopeSets, requiresCatalog, ids.length]);

  const backHref = returnHref(scope);
  if (state === "not-found") {
    return (
      <main className="study-setup-page" aria-label="Thiết lập buổi học">
        <EmptyState className="study-setup-empty" icon="book" title="Không tìm thấy nội dung học" description="Nội dung này hiện không khả dụng." action={<Link className="study-setup-back-link" to={backHref}>Quay lại</Link>} testId="study-setup-scope-not-found" />
      </main>
    );
  }

  if (state === "ready" && data?.queue.queue.length === 0 && (scope.type === "saved" || scope.type === "weak")) {
    return <main className="study-setup-page"><EmptyState testId="study-setup-empty" icon="book" title={scope.type === "weak" ? "Không còn từ yếu cần ôn" : "Chưa có từ để học"} description="Nội dung này hiện chưa có từ phù hợp cho buổi học." action={<Link to={backHref}>Quay lại</Link>} /></main>;
  }

  if (state === "loading" && !data && !(catalogError && requiresCatalog)) {
    return (
      <main className="study-setup-page" aria-label="Thiết lập buổi học" aria-busy="true">
        <LoadingState label="Đang tải thiết lập buổi học…" pattern="study-setup" testId="study-setup-loading" />
      </main>
    );
  }

  if (state === "error" || (catalogError && requiresCatalog && !data)) {
    return (
      <main className="study-setup-page" aria-label="Thiết lập buổi học">
        <ErrorState className="study-setup-empty" title="Không thể tải nội dung học" description={message ?? "Vui lòng thử lại."} onRetry={() => { setState("loading"); setMessage(null); if (catalogError) { setCatalogError(false); setCatalogRetry((value) => value + 1); } setRetry((value) => value + 1); }} testId="study-setup-error" />
      </main>
    );
  }

  if (!data) {
    return (
      <main className="study-setup-page" aria-label="Thiết lập buổi học" aria-busy="true">
        <LoadingState label="Đang tải thiết lập buổi học…" pattern="study-setup" testId="study-setup-loading" />
      </main>
    );
  }

  const availability = {
    new: state === "ready" ? availableCount(data.queue, "new") : 0,
    review: state === "ready" ? availableCount(data.queue, "review") : 0,
    mixed: state === "ready" ? availableCount(data.queue, "mixed") : 0
  };
  const isSavedAll = scope?.type === "saved" && scope.all;
  const isWeak = scope?.type === "weak";
  const isAllScope = isSavedAll || isWeak;
  const selectedContent = content ?? defaultMode(data.queue);
  const available = isAllScope ? (state === "ready" ? data.queue.queue.length : 0) : availability[selectedContent];
  const plannedCount = state === "ready" ? selectStudyQueue(data.queue, { amount, content: isAllScope ? "all" : selectedContent }).queue.length : 0;

  function startStudy() {
    if (available === 0) return;
    const params = studyScopeParams(scope);
    params.set("count", String(amount));
    params.set("content", isAllScope ? "all" : selectedContent);
    navigate(`/study?${params.toString()}`, { state: { returnTo: override || !urlScope ? `/study/setup?${studyScopeParams(scope)}` : returnTo } });
  }

  return (
    <main className="study-setup-page" aria-labelledby="study-setup-title" data-testid="study-setup-page">
      <header className="study-setup-header">
        <Link className="study-setup-back-link" to={backHref}><SetupIcon name="back" />Quay lại</Link>
        <h1 id="study-setup-title">Thiết lập buổi học</h1>
        {scope && "level" in scope && scope.level ? <p>{scope.level === "GENERAL" ? "Nội dung chung" : `Lớp ${scope.level.slice(-1)}`}</p> : null}
        {scope && "cefr" in scope && scope.cefr ? <p>Mức học: {learningLevelLabel(scope.cefr)}</p> : null}

      </header>

      <div className="study-setup-layout">
        <section className="study-setup-options" aria-label="Tùy chọn buổi học">
          <section className="study-setup-section">
            <label className="study-source-label" htmlFor="study-source">Nguồn học</label>
            <select id="study-source" value={source} onChange={(event) => {
              const next = event.target.value as LearningSourceScope["type"];
              if (next === "custom") { setPicker(true); return; }
              setState("loading"); setSource(next); setOverride(true); saveStudyPreference(userId, next, ids);
            }}>
              <option value="pathway">Học theo lộ trình</option><option value="custom">Bộ từ tôi chọn</option><option value="all">Tất cả bộ từ</option>
            </select>
            {urlScope && !override && !["custom", "pathway", "all", "learning-set"].includes(urlScope.type) ? <p>{data.scopeName}</p> : null}
            {source === "custom" ? <div className="study-source-count"><span>{ids.length} bộ từ đã chọn</span><button type="button" onClick={() => setPicker(true)}>Thay đổi</button></div> : null}
            {state === "ready" && sets?.length === 0 ? <EmptyState icon="book" title="Chưa có bộ từ" description="Hiện chưa có bộ từ khả dụng." /> : state === "ready" && available === 0 ? <p role="status">{source === "custom" && ids.length === 0 ? "Chọn ít nhất một bộ từ để bắt đầu." : "Nguồn học này chưa có từ mới hoặc từ đến hạn phù hợp."}</p> : null}
          </section>

          <section className="study-setup-section" aria-labelledby="study-setup-amount-title">
            <div className="study-setup-section-heading">
              <span className="study-setup-section-icon"><SetupIcon name="layers" /></span>
              <div><h2 id="study-setup-amount-title">Số lượng từ</h2></div>
            </div>
            <SessionCapacityControl value={amount} onChange={setAmount} labelledBy="study-setup-amount-title" />
          </section>

          {isAllScope ? (
            <section className="study-setup-section study-setup-mode-section" aria-label={`Phạm vi học ${isWeak ? "từ yếu" : "từ đã lưu"}`} data-testid={isWeak ? "study-setup-weak" : "study-setup-saved-all"}>
              <div className="study-setup-section-heading">
                <span className="study-setup-section-icon"><SetupIcon name="mixed" /></span>
                <div><h2>{isWeak ? "Nguồn học: Từ yếu" : "Từ đã lưu"}</h2><p data-testid={isWeak ? "study-setup-weak-count" : "study-setup-saved-all-count"}>{available} từ có thể {isWeak ? "ôn" : "học"}</p></div>
              </div>
            </section>
          ) : (
            <section className="study-setup-section study-setup-mode-section" aria-labelledby="study-setup-mode-title">
              <div className="study-setup-section-heading">
                <span className="study-setup-section-icon"><SetupIcon name="mixed" /></span>
                <div><h2 id="study-setup-mode-title">Chế độ học</h2></div>
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
          )}

          <button className="study-setup-start" type="button" disabled={available === 0} onClick={startStudy}><SetupIcon name="play" />Bắt đầu học<SetupIcon name="back" /></button>

        </section>

        <aside className="study-setup-aside" aria-label="Tóm tắt buổi học">
          <section className="study-setup-summary" aria-labelledby="study-setup-summary-title">
            <h2 id="study-setup-summary-title"><SetupIcon name="clipboard" />Tóm tắt buổi học</h2>
            <dl>
              <div><dt>Số lượng từ</dt><dd data-testid="study-setup-summary-count">{plannedCount} từ</dd></div>
              <div><dt>Chế độ học</dt><dd data-testid="study-setup-summary-mode">{isWeak ? "Ôn tập từ yếu" : isSavedAll ? "Từ đã lưu" : MODE_COPY[selectedContent].title}</dd></div>
              <div><dt>Nguồn học</dt><dd data-testid="study-setup-summary-scope">{urlScope && !override && !["custom", "pathway", "all"].includes(urlScope.type) ? data.scopeName : sourceName}</dd></div>
            </dl>

          </section>

        </aside>
      </div>
      {picker ? <LearningSetPickerDialog sets={sets ?? []} loading={!sets && !catalogError} error={catalogError} onRetry={() => { setCatalogError(false); setCatalogRetry((value) => value + 1); }} selected={ids} onCancel={() => setPicker(false)} onApply={(next) => {
        const changed = scope.type !== "custom" || scope.ids.join(",") !== next.join(",");
        if (changed) { setState("loading"); setIds(next); setSource("custom"); setOverride(true); saveStudyPreference(userId, "custom", next); }
        setPicker(false);
      }} /> : null}
    </main>
  );
}
