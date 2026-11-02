import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigationType } from "react-router";
import { cefrFilterValues, learningLevelLabel, practiceConfigSchema, practiceSessionSchema, type PracticeAction, type PracticeSession, type PracticeOutcome, type PracticeConfig, type PracticeSource, type LearningSetSummary } from "@vocabflow/contracts";
import { EmptyState, ErrorState, LoadingState } from "../../components/async-states";
import { useActiveLearner } from "../learners/learner-context-hook";
import { GUEST_ID } from "../guest/guest-store";
import { usePracticeSession } from "./use-practice-session";
import { SessionCapacityControl } from "../study/session-capacity";
import type { SessionCapacity } from "../study/session-capacity-options";
import { requestPracticeSets } from "./practice-client";
import { usePronunciationAudio } from "../study/pronunciation-audio";

const outcomeLabels: Record<PracticeOutcome, string> = {
  correct: "Đúng", incorrect: "Cần luyện thêm", revealed: "Đã xem đáp án", skipped: "Bỏ qua chủ động", technical: "Bỏ qua vì lỗi media"
};
const practiceErrorCopy: Record<string, string> = {
  GUEST_PRACTICE_CORRUPT: "Dữ liệu luyện trên trình duyệt không đọc được. Dữ liệu cũ được giữ nguyên; hãy kiểm tra dữ liệu trang web rồi thử lại.",
  GUEST_LOCK_UNAVAILABLE: "Trình duyệt chưa hỗ trợ lưu an toàn giữa các cửa sổ. Hãy dùng trình duyệt mới hơn rồi thử lại; chưa có kết quả mới được ghi.",
  STORAGE_UNAVAILABLE: "Chưa lưu được checkpoint trên thiết bị. Hãy cho phép lưu dữ liệu trang web, rồi thử lại. Câu trả lời vẫn được giữ.",
  STALE_QUESTION: "Câu này đã có kết quả ở cửa sổ khác. Tải kết quả đã lưu để tiếp tục; câu trả lời mới chưa được ghi thêm."
};
function PracticeAudio({ url, disabled, onReady, onError }: { url: string; disabled: boolean; onReady: () => void; onError: () => void }) {
  const audio = usePronunciationAudio(url, "", 0, onError);
  const readyRef = useRef(onReady);
  useEffect(() => { readyRef.current = onReady; }, [onReady]);
  useEffect(() => { if (audio.state === "playing" || audio.state === "ended") readyRef.current(); }, [audio.state]);
  return <div><button className="button primary" type="button" disabled={disabled || audio.state === "loading"} onClick={audio.play}>Nghe gợi ý</button><p role="status">{audio.state === "loading" ? "Đang tải âm thanh…" : audio.state === "playing" ? "Đang phát âm thanh" : "Có thể nghe lại không giới hạn"}</p></div>;
}
function Question({ question, disabled, act, draftText, onDraft }: { question: NonNullable<PracticeSession["current"]>; disabled: boolean; act: (action: PracticeAction) => void; draftText: string; onDraft: (questionId: string, text: string) => void }) {
  const [media, setMedia] = useState<"loading" | "ready" | "error">("loading");
  const [reload, setReload] = useState(0);
  const [text, setText] = useState(draftText);
  const [inputError, setInputError] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  function action(kind: "reveal" | "skip" | "technical-skip") {
    act({ actionId: crypto.randomUUID(), questionId: question.questionId, kind });
  }
  const mediaLabel = question.cueKind === "image" ? "ảnh" : "âm thanh";
  return <section className="exercise-card" aria-label={`Câu luyện ${mediaLabel}`} aria-busy={disabled}>
    <h2 className="exercise-prompt" ref={heading} tabIndex={-1}>{question.responseMode === "type" ? "Gõ" : "Chọn"} từ tiếng Anh phù hợp với {mediaLabel}</h2>
    <div className="practice-media">
      {media !== "error" && question.cueKind === "image" ? <img key={reload} className="exercise-image" src={question.imageUrl!} alt="Hình minh họa cho câu luyện" onLoad={() => setMedia("ready")} onError={() => setMedia("error")} /> : null}
      {media !== "error" && question.cueKind === "audio" ? <PracticeAudio key={reload} url={question.audioUrl!} disabled={disabled} onReady={() => setMedia("ready")} onError={() => setMedia("error")} /> : null}
      {media === "loading" && question.cueKind === "image" ? <p role="status">Đang tải ảnh…</p> : null}
      {media === "error" ? <div role="alert"><p>Không tải được {mediaLabel}. Lỗi này không tính là trả lời sai.</p><button className="button secondary" disabled={disabled} onClick={() => { setMedia("loading"); setReload(value => value + 1); }}>Tải lại {mediaLabel}</button><button className="button secondary" disabled={disabled} onClick={() => action("technical-skip")}>Bỏ qua lỗi {mediaLabel}</button></div> : null}
    </div>
    {question.responseMode === "type" ? <form className="exercise-typing-form" noValidate onSubmit={event => {
      event.preventDefault();
      if (!text.normalize("NFKC").trim()) { setInputError(true); return; }
      if (!disabled && media === "ready") act({ actionId: crypto.randomUUID(), questionId: question.questionId, kind: "type-answer", text });
    }} onKeyDown={event => { if (event.key === "Enter" && event.nativeEvent.isComposing) event.preventDefault(); }}>
      <label className="exercise-typing-label" htmlFor="practice-answer">Từ tiếng Anh</label>
      <input className="exercise-typing-input" id="practice-answer" value={text} lang="en" maxLength={200} autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false} disabled={disabled || media !== "ready"} aria-invalid={inputError} aria-describedby={inputError ? "practice-answer-error" : undefined} onChange={event => { setText(event.target.value); setInputError(false); onDraft(question.questionId, event.target.value); }} />
      {inputError ? <p className="exercise-typing-error" id="practice-answer-error" role="alert">Nhập từ tiếng Anh trước khi gửi.</p> : null}
      <button className="button primary" type="submit" disabled={disabled || media !== "ready"}>Gửi đáp án</button>
    </form> : <fieldset className="exercise-options" disabled={disabled || media !== "ready"}>
      <legend className="sr-only">Chọn một trong bốn từ</legend>
      {question.options.map(option => <button className="exercise-option" key={option.optionId} onClick={() => act({ actionId: crypto.randomUUID(), questionId: question.questionId, kind: "answer", optionId: option.optionId })}>{option.label}</button>)}
    </fieldset>}
    <div className="practice-actions"><button className="button secondary" disabled={disabled || media !== "ready"} onClick={() => action("reveal")}>Xem đáp án</button><button className="button secondary" disabled={disabled || media !== "ready"} onClick={() => action("skip")}>Bỏ qua câu</button></div>
  </section>;
}
function PracticeWorkspace({ learnerId, userId, initialSession }: { learnerId: string; userId: string; initialSession?: PracticeSession }) {
  const isGuest = userId === GUEST_ID;
  const flow = usePracticeSession(userId, learnerId, initialSession);
  const { session, busy, error, feedback, save } = flow;
  const [count, setCount] = useState<SessionCapacity>(10);
  const [cue, setCue] = useState<PracticeConfig["cue"]>("image");
  const [responseMode, setResponseMode] = useState<PracticeConfig["responseMode"]>("choice");
  const [sourceKind, setSourceKind] = useState<PracticeSource["kind"]>("learned");
  const [setId, setSetId] = useState(0);
  const [level, setLevel] = useState("");
  const [sets, setSets] = useState<LearningSetSummary[] | null>(null);
  const [setsError, setSetsError] = useState(false);
  const [setsRetry, setSetsRetry] = useState(0);
  const statusRef = useRef<HTMLDivElement>(null);
  useEffect(() => { document.title = "Luyện tự do · VocabFlow"; }, []);
  useEffect(() => { if (feedback) statusRef.current?.focus(); }, [feedback]);
  useEffect(() => {
    if (sourceKind !== "set") return;
    let cancelled = false;
    void requestPracticeSets(learnerId).then(values => { if (!cancelled) { setSets(values); setSetsError(false); } }).catch(() => { if (!cancelled) setSetsError(true); });
    return () => { cancelled = true; };
  }, [sourceKind, setsRetry, learnerId]);
  function sourceLabel(source: PracticeSource) {
    const label = source.kind === "learned" ? "Từ đã học" : source.kind === "saved" ? "Từ đã lưu" : source.kind === "set" ? sets?.find(set => set.id === source.setId)?.name ?? `Bộ học #${source.setId}` : "Mức học";
    return `${label}${source.cefr ? ` · ${learningLevelLabel(source.cefr)}` : ""}`;
  }
  const selectedConfig = practiceConfigSchema.safeParse({ count, cue, responseMode, source: { kind: sourceKind,
    ...(sourceKind === "set" ? { setId } : {}), ...(level ? { cefr: level } : {}) } });
  function changeSetup(change: () => void) {
    change(); flow.newSession();
  }
  const incompatible = error === "STALE_PRACTICE_CONTENT" || error === "INVALID_PRACTICE_CHECKPOINT" || error === "PRACTICE_NOT_FOUND";
  return <main className="study-page practice-page" aria-labelledby="practice-title">
    <header className="study-setup-header"><div className="practice-actions"><Link className="button secondary" to="/study/setup">Về buổi học</Link><Link className="button secondary" to="/practice/history">Lịch sử luyện</Link></div><h1 id="practice-title">Luyện tự do</h1><p>Luyện thêm theo tốc độ của bạn. Kết quả lưu riêng, không đổi lịch ôn hay XP.</p></header>
    {error ? <ErrorState title={incompatible ? "Buổi luyện không còn tương thích" : error === "STALE_QUESTION" ? "Buổi luyện đã cập nhật ở cửa sổ khác" : "Chưa lưu được"} description={incompatible ? "Nội dung hoặc checkpoint đã đổi. Lịch sử đã lưu được giữ nguyên; hãy chủ động bắt đầu buổi mới." : practiceErrorCopy[error] ?? "Câu hiện tại và lựa chọn vẫn được giữ. Thử lại để xác nhận đúng một lần."} onRetry={incompatible || error === "STALE_QUESTION" ? undefined : flow.retry} retrying={busy} action={incompatible ? <button className="button primary" onClick={flow.newSession}>Bắt đầu buổi mới</button> : error === "STALE_QUESTION" ? <button className="button primary" disabled={busy} onClick={() => void flow.reconcile()}>Tải kết quả đã lưu</button> : undefined} /> : null}
    {flow.loadingCheckpoint ? <LoadingState label="Đang kiểm tra buổi luyện trên thiết bị" pattern="study" /> : incompatible || flow.recovering ? null : flow.offer ? <section className="exercise-card"><h2>Có buổi luyện trên thiết bị này</h2><p>Tiếp tục với đúng nguồn, câu và kết quả của bạn trên trình duyệt này.</p><div className="practice-actions"><button className="button primary" disabled={busy} onClick={() => void flow.resume()}>Tiếp tục buổi luyện</button>{!flow.offer.pending ? <button className="button secondary" disabled={busy} onClick={flow.newSession}>Bắt đầu buổi mới</button> : null}</div></section> : !session || session.emptyReason ? <>
      <section className="exercise-card"><h2>Thiết lập buổi luyện</h2><p>Mỗi từ xuất hiện một lần. Chọn đúng nguồn bạn muốn luyện.</p>
        <fieldset className="practice-setup" disabled={busy || Boolean(error)}>
          <legend className="sr-only">Thiết lập buổi luyện</legend>
          <label htmlFor="practice-source">Nguồn luyện</label>
          <select id="practice-source" value={sourceKind} onChange={event => changeSetup(() => { setSourceKind(event.target.value as PracticeSource["kind"]); setLevel(""); })}>
            <option value="learned">Từ đã học</option><option value="set">Bộ học</option><option value="level">Mức học</option><option value="saved">Từ đã lưu</option>
          </select>
          {sourceKind === "set" ? <><label htmlFor="practice-set">Bộ học</label><select id="practice-set" value={setId} disabled={!sets} onChange={event => changeSetup(() => setSetId(Number(event.target.value)))}><option value={0}>Chọn bộ học</option>{sets?.map(set => <option key={set.id} value={set.id}>{set.name}</option>)}</select>{!sets && !setsError ? <p role="status">Đang tải bộ học…</p> : null}</> : null}
          <label htmlFor="practice-level">{sourceKind === "level" ? "Mức học" : "Lọc thêm theo mức học"}</label>
          <select id="practice-level" value={level} onChange={event => changeSetup(() => setLevel(event.target.value))}><option value="">{sourceKind === "level" ? "Chọn mức học" : "Không lọc thêm"}</option>{cefrFilterValues.map(value => <option key={value} value={value}>{learningLevelLabel(value)}</option>)}</select>
          <label htmlFor="practice-cue">Gợi ý</label><select id="practice-cue" value={cue} onChange={event => changeSetup(() => setCue(event.target.value as PracticeConfig["cue"]))}><option value="image">Ảnh</option><option value="audio">Nghe</option><option value="mixed">Kết hợp ảnh và nghe</option></select>
          <label htmlFor="practice-response-mode">Cách trả lời</label><select id="practice-response-mode" value={responseMode} onChange={event => changeSetup(() => setResponseMode(event.target.value as PracticeConfig["responseMode"]))}><option value="choice">Chọn một trong bốn từ</option><option value="type">Gõ từ tiếng Anh</option></select>
          <h3 id="practice-count">Số câu</h3><SessionCapacityControl value={count} onChange={value => changeSetup(() => setCount(value))} unit="câu" labelledBy="practice-count" />
          <button className="button primary" disabled={!selectedConfig.success || (sourceKind === "set" && (!sets || setsError))} onClick={() => { if (selectedConfig.success) void flow.start(selectedConfig.data); }}>Bắt đầu luyện</button>
        </fieldset>
        {sourceKind === "set" && setsError ? <ErrorState description="Không tải được danh sách bộ học. Thử lại hoặc chọn nguồn khác." onRetry={() => { setSetsError(false); setSetsRetry(value => value + 1); }} /> : null}
      </section>
      {busy ? <LoadingState pattern="study" label="Đang chuẩn bị buổi luyện" /> : null}
      {session?.emptyReason ? <EmptyState title={session.emptyReason === "no-learned-words" ? "Chưa có từ đã học" : session.emptyReason === "empty-source" ? "Nguồn đã chọn chưa có từ phù hợp" : session.emptyReason === "insufficient-mixed-media" ? "Kết hợp cần cả ảnh và âm thanh ở hai từ khác nhau" : "Chưa đủ media hoặc bốn lựa chọn rõ ràng"} description="Chưa tạo buổi luyện. Hãy chủ động đổi nguồn hoặc gợi ý ở trên; không tự lấy thêm từ ngoài nguồn." action={<Link className="button secondary" to="/study/setup">Đến buổi học</Link>} /> : null}
    </> : <>
      <p>{sourceLabel(session.config.source)} · {session.config.cue === "image" ? "Ảnh" : session.config.cue === "audio" ? "Nghe" : "Kết hợp ảnh và nghe"}</p>
      <p role="status">{session.total} câu thực có / yêu cầu {session.requestedCount} · Đã lưu {session.completed}/{session.total}</p>
      {busy ? <p role="status">Đang lưu…</p> : null}
      {feedback && session.feedback ? <div className="exercise-card" ref={statusRef} tabIndex={-1} role="status"><h2>{outcomeLabels[session.feedback.outcome]}</h2><p>Đáp án: <strong>{session.feedback.answer}</strong></p><p>Đã lưu kết quả.</p><button className="button primary" onClick={flow.next}>{session.status === "complete" ? "Xem tổng kết" : "Câu tiếp theo"}</button></div>
        : session.current ? <Question key={session.current.questionId} question={session.current} disabled={busy || Boolean(error)} act={action => void save(action)} draftText={flow.draft?.questionId === session.current.questionId ? flow.draft.text : ""} onDraft={flow.writeDraft} />
        : <section className="exercise-card" aria-label="Tổng kết luyện tự do"><h2>Hoàn tất buổi luyện</h2><dl className="practice-summary">{(Object.keys(outcomeLabels) as PracticeOutcome[]).map(outcome => <div key={outcome}><dt>{outcomeLabels[outcome]}</dt><dd>{session.summary[outcome]}</dd></div>)}<div><dt>Tỷ lệ đúng trên câu đã trả lời</dt><dd>{session.summary.accuracy === null ? "Chưa có câu trả lời" : `${session.summary.accuracy}%`}</dd></div></dl><p>Ảnh: {session.summary.byCue.image.correct} đúng / {session.summary.byCue.image.incorrect} cần luyện thêm. Nghe: {session.summary.byCue.audio.correct} đúng / {session.summary.byCue.audio.incorrect} cần luyện thêm.</p><p role="status">{isGuest ? "Kết quả đã lưu trên trình duyệt này. Xóa dữ liệu trang web sẽ làm mất lịch sử khách." : "Kết quả đã lưu vào tài khoản."}</p><button className="button primary" onClick={flow.newSession}>Luyện buổi mới</button></section>}
    </>}
  </main>;
}
export function PracticePage() {
  const { activeLearner, userId } = useActiveLearner();
  const location = useLocation();
  const navigationType = useNavigationType();
  const payload = location.state as { practiceSession?: unknown } | null;
  const handedOff = navigationType === "PUSH" ? practiceSessionSchema.safeParse(payload?.practiceSession) : null;
  if (!activeLearner || !userId) return null;
  return <PracticeWorkspace key={`${userId}:${activeLearner.id}`} learnerId={activeLearner.id} userId={userId} initialSession={handedOff?.success ? handedOff.data : undefined} />;
}
