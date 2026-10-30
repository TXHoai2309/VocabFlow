import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import type { z } from "zod";
import { foundationCatalogSchema, type FoundationAttempt, type FoundationQueue, type FoundationReviewRequest, type FoundationReviewResponse, type FoundationTeaching } from "@vocabflow/contracts";
import { EmptyState, ErrorState, LoadingState } from "../../components/async-states";
import { useActiveLearner } from "../learners/learner-context-hook";
import { SessionCapacityControl } from "../study/session-capacity";
import { SESSION_CAPACITIES, type SessionCapacity } from "../study/session-capacity-options";
import { FoundationClientError, foundationAttempt, foundationCatalog, foundationQueue, foundationReveal, foundationReview, foundationReviewRequest } from "./foundation-client";

function BackLink() { return <Link className="study-setup-back-link" to="/vocabulary"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M19 12H5m7 7-7-7 7-7" /></svg>Về từ vựng</Link>; }
function message(error: unknown): string {
  if (error instanceof FoundationClientError) {
    if (error.code.startsWith("GUEST_")) return "Chưa thể lưu tiến độ trên trình duyệt này. Hãy kiểm tra quyền lưu dữ liệu và dung lượng rồi thử lại.";
    if (error.status === 401) return "Phiên đăng nhập đã hết. Hãy đăng nhập lại để tiếp tục.";
    if (error.status === 403) return "Bạn không có quyền truy cập nội dung học này.";
    if (error.status === 409) return "Nội dung hoặc tiến độ đã thay đổi. Hãy tải lại bài học.";
  }
  return "Chưa thể tải hoặc lưu bài học. Vui lòng thử lại.";
}

export function FoundationSetupPage() {
  const [params, setParams] = useSearchParams(); const navigate = useNavigate();
  const module = params.get("module") ?? "letters";
  const [catalog, setCatalog] = useState<z.infer<typeof foundationCatalogSchema> | null>(null);
  const [error, setError] = useState<string | null>(null); const [retry, setRetry] = useState(0);
  const [capacity, setCapacity] = useState<SessionCapacity>(10);
  const [mode, setMode] = useState<"new" | "review" | "mixed">("mixed");
  useEffect(() => { let active = true; void foundationCatalog().then(value => { if (active) { setCatalog(value); setError(null); } }).catch(e => { if (active) setError(message(e)); }); return () => { active = false; }; }, [retry]);
  const invalid = [...params.keys()].some(key => !["module", "collection"].includes(key)) || !["letters", "utterances"].includes(module);
  const collections = catalog?.collections.filter(c => c.module === module) ?? [];
  const code = params.get("collection") ?? (module === "letters" ? "letter-names" : "utterances-all");
  const current = collections.find(c => c.code === code);
  const unit = module === "letters" ? "hoạt động" : "câu";
  if (!import.meta.env.DEV) return <EmptyState title="Nội dung chưa phát hành" description="Bộ học này hiện chỉ có ở bản local." />;
  if (error) return <main className="study-setup-page"><ErrorState title="Chưa thể mở bộ học" description={error} onRetry={() => { setError(null); setRetry(x => x + 1); }} /></main>;
  if (!catalog) return <main className="study-setup-page"><LoadingState pattern="study-setup" label="Đang tải bộ học…" /></main>;
  return <main className="study-setup-page foundation-page" aria-labelledby="foundation-title">
    <header className="study-setup-header"><BackLink /><h1 id="foundation-title">{module === "letters" ? "Làm quen chữ và âm" : "Câu đầu tiên"}</h1><p>{module === "letters" ? "Sáu chữ A, I, M, S, F, T. Học tên chữ và âm bằng các hoạt động riêng." : "Mười hai câu ngắn để chào hỏi, cảm ơn và nhờ giúp đỡ."}</p></header>
    <nav className="foundation-tabs" aria-label="Loại nội dung nền tảng"><Link className={`button ${module === "letters" ? "primary" : "secondary"}`} to="/foundation/learn?module=letters" aria-current={module === "letters" ? "page" : undefined}>Chữ và âm</Link><Link className={`button ${module === "utterances" ? "primary" : "secondary"}`} to="/foundation/learn?module=utterances" aria-current={module === "utterances" ? "page" : undefined}>Câu đầu tiên</Link></nav>
    {invalid || !current ? <EmptyState title="Bộ học không phù hợp với lựa chọn này" description="Chọn lại một bộ chữ hoặc câu. Các bộ này không dùng bộ lọc lớp học hay CEFR." /> : <div className="study-setup-layout">
      <section className="study-setup-options" aria-label="Thiết lập học nền tảng">
        <section className="study-setup-section"><label className="study-source-label" htmlFor="foundation-collection">Nội dung học</label><select id="foundation-collection" className="study-source-select" value={code} onChange={event => setParams({ module, collection: event.target.value })}>{collections.map(c => <option key={c.code} value={c.code}>{c.title} · {c.total} {unit}</option>)}</select></section>
        <section className="study-setup-section"><h2 id="foundation-capacity">Số lượng {unit}</h2><SessionCapacityControl value={capacity} onChange={setCapacity} unit={unit} labelledBy="foundation-capacity" /></section>
        <section className="study-setup-section"><h2 id="foundation-mode">Nội dung buổi học</h2><div className="study-setup-modes" role="group" aria-labelledby="foundation-mode">{([['new','Học mới'],['review','Ôn tập'],['mixed','Kết hợp']] as const).map(([value,label]) => <button className={`study-setup-mode${mode === value ? " is-selected" : ""}`} key={value} type="button" aria-pressed={mode === value} onClick={() => setMode(value)}>{label}</button>)}</div></section>
        <button className="study-setup-start" type="button" disabled={module === "letters" && current.mediaReady === 0} onClick={() => navigate(`/foundation/study?${new URLSearchParams({ collection: code, capacity: String(capacity), mode })}`)}>Bắt đầu học</button>
      </section>
      <aside className="study-setup-aside"><section className="study-setup-summary" aria-label="Tóm tắt bộ học"><h2>Bộ học đã chọn</h2><p>{current.title}</p><p>{current.total} {unit} · tối đa {capacity} {unit} trong buổi.</p>{module === "letters" && current.mediaReady < current.total ? <p>{current.total-current.mediaReady} hoạt động âm chưa có audio phù hợp, chưa đưa vào buổi học.</p> : null}{module === "letters" && current.listeningReady < current.mediaReady ? <p>Hiện có phần nghe thử và làm quen. Bài nghe có chấm điểm sẽ mở sau khi audio được duyệt.</p> : null}<p>{module === "utterances" ? "Tự nhớ câu theo tình huống, xem gợi ý và tự đánh giá. Không chấm phát âm tự động." : "Tên chữ và âm được ghi nhận riêng."}</p></section></aside>
    </div>}
  </main>;
}

export function FoundationStudyPage() {
  const { activeLearner } = useActiveLearner();
  const [params] = useSearchParams();
  return activeLearner ? <FoundationStudySession key={`${activeLearner.id}:${params.toString()}`} learnerId={activeLearner.id} /> : <LoadingState pattern="study" label="Đang tải người học…" />;
}
function FoundationStudySession({ learnerId }: { learnerId: string }) {
  const [params] = useSearchParams(); const collection = params.get("collection") ?? "";
  const capacity = Number(params.get("capacity")); const mode = params.get("mode") ?? "mixed";
  const validScope = [...params.keys()].every(key => ["collection", "capacity", "mode"].includes(key)) && SESSION_CAPACITIES.some(n => n === capacity) && ["new", "review", "mixed"].includes(mode);
  const [queue, setQueue] = useState<FoundationQueue | null>(null); const [index, setIndex] = useState(0); const [reload, setReload] = useState(0);
  const [attempt, setAttempt] = useState<FoundationAttempt | null>(null); const [teaching, setTeaching] = useState<FoundationTeaching | null>(null);
  const [error, setError] = useState<string | null>(null); const [stale, setStale] = useState(false); const [busy, setBusy] = useState(false); const [listened, setListened] = useState(false); const [audioError, setAudioError] = useState(false);
  const [saved, setSaved] = useState<FoundationReviewResponse | null>(null); const [savedCount, setSavedCount] = useState(0); const [practiceCount, setPracticeCount] = useState(0);
  const operation = useRef(false); const [pending, setPending] = useState<FoundationReviewRequest | null>(null);
  const current = queue?.items[index];
  useEffect(() => {
    if (!validScope) return; let active = true;
    void foundationQueue(learnerId, collection, capacity, mode as "new" | "review" | "mixed").then(value => { if (active) { setQueue(value); setIndex(0); setError(null); } }).catch(e => { if (active) setError(message(e)); });
    return () => { active = false; };
  }, [learnerId, collection, capacity, mode, validScope, reload]);
  useEffect(() => {
    if (!current) return; let active = true;
    void foundationAttempt(learnerId, current).then(value => { if (active) setAttempt(value); }).catch(e => { if (active) setError(message(e)); });
    return () => { active = false; };
  }, [learnerId, current, reload]);
  const reloadStudy = () => { setQueue(null); setAttempt(null); setTeaching(null); setSaved(null); setError(null); setStale(false); setBusy(false); setPending(null); operation.current = false; setReload(x => x+1); };
  const reveal = async () => {
    if (!attempt || operation.current) return; operation.current = true; setBusy(true); setError(null);
    try { setTeaching(await foundationReveal(learnerId, attempt)); } catch(e) { setError(message(e)); setStale(e instanceof FoundationClientError && e.status === 409); } finally { operation.current = false; setBusy(false); }
  };
  const save = async (answer?: FoundationReviewRequest["answer"]) => {
    if (!attempt || operation.current || saved || (!answer && !pending)) return;
    operation.current = true; setBusy(true); setError(null);
    try {
      const request = pending ?? foundationReviewRequest(learnerId, attempt, answer!);
      setPending(request);
      const response = await foundationReview(learnerId, request);
      if (response.targetId !== attempt.targetId || response.itemType !== attempt.itemType) throw new FoundationClientError("INVALID_REVIEW_RESPONSE");
      setSaved(response); setSavedCount(n=>n+1); setPending(null);
    } catch(e) { setError(message(e)); setStale(e instanceof FoundationClientError && e.status === 409); } finally { operation.current = false; setBusy(false); }
  };
  const next = () => { if (!saved && current?.itemType === "UTTERANCE") return; if (!saved) setPracticeCount(n=>n+1); setAttempt(null); setTeaching(null); setSaved(null); setError(null); setListened(false); setAudioError(false); setPending(null); setIndex(n=>n+1); };
  if (!validScope || !import.meta.env.DEV) return <EmptyState title="Lựa chọn học không hợp lệ" description="Quay lại chọn một bộ chữ hoặc câu." action={<Link to="/foundation/learn">Chọn bộ học</Link>} />;
  if (error && !attempt) return <main className="study-setup-page"><ErrorState title="Chưa thể tải bài" description={error} onRetry={reloadStudy} /></main>;
  if (!queue) return <main className="study-setup-page"><LoadingState pattern="study" label="Đang chuẩn bị buổi học…" /></main>;
  if (!queue.items.length) return <main className="study-setup-page"><EmptyState title="Chưa có bài phù hợp cho buổi này" description={queue.unavailableCount ? "Các hoạt động âm đang chờ audio phù hợp. Chọn bộ tên chữ hoặc câu giao tiếp để học trước." : "Không có nội dung mới hoặc đến hạn trong lựa chọn này."} action={<Link className="button secondary" to="/foundation/learn">Chọn lại bộ học</Link>} /></main>;
  if (!current) return <main className="study-setup-page foundation-page"><section className="panel foundation-session"><h1>Đã hoàn tất buổi học</h1><p>Đã lưu kết quả cho {savedCount} mục.</p>{practiceCount ? <p>Đã xem {practiceCount} bài làm quen, không ghi điểm nghe.</p> : null}<Link className="button primary" to={`/foundation/learn?module=${collection.startsWith("utterances") ? "utterances" : "letters"}&collection=${collection}`}>Về bộ học</Link></section></main>;
  if (!attempt) return <main className="study-setup-page"><LoadingState pattern="study" label="Đang mở bài học…" /></main>;
  const practice = current.itemType === "LETTER_ACTIVITY" && !current.listeningReady;
  const answerDisabled = busy || saved !== null || pending !== null;
  return <main className="study-setup-page foundation-page" aria-labelledby="foundation-study-title">
    <header className="study-setup-header"><BackLink /><h1 id="foundation-study-title">{current.itemType === "UTTERANCE" ? "Nhớ câu theo tình huống" : practice ? "Làm quen tên chữ" : "Nghe và chọn chữ"}</h1><p>Bài {index+1} / {queue.items.length}</p></header>
    <section className="panel foundation-session" aria-busy={busy}>
      {current.context ? <p className="foundation-context">{current.context}</p> : null}
      <p>{attempt.instruction}</p>
      {attempt.audioUrl && !teaching ? <audio aria-label="Âm thanh câu hỏi" controls preload="none" src={attempt.audioUrl} onEnded={()=>setListened(true)} onError={()=>setAudioError(true)} /> : null}
      {!teaching && !saved ? <>
        {practice || current.itemType === "UTTERANCE" ? <button className="button primary" type="button" disabled={busy} onClick={()=>void reveal()}>{practice ? "Xem chữ và nghe mẫu" : "Xem câu gợi ý"}</button> : <div className="foundation-letter-options" role="group" aria-label="Chọn cặp chữ">{attempt.options.map(option=><button className="button secondary foundation-letter-option" key={option.optionKey} type="button" disabled={answerDisabled || !listened || audioError} onClick={()=>void save({kind:"LETTER_OPTION",optionKey:option.optionKey})}>{option.glyph}</button>)}</div>}
        {!practice && current.itemType === "LETTER_ACTIVITY" ? <button type="button" className="button secondary" disabled={busy || pending !== null} onClick={()=>void reveal()}>Xem hướng dẫn, bỏ chấm điểm lượt này</button> : null}
      </> : null}
      {teaching ? <div className="foundation-teaching"><h2>{teaching.title}</h2><p className={current.itemType === "LETTER_ACTIVITY" ? "foundation-glyph" : "foundation-utterance"}>{teaching.textEn}</p><p>{teaching.translationVi}</p><p>{teaching.explanation}</p>{teaching.audioUrl ? <audio controls preload="none" aria-label="Nghe mẫu" src={teaching.audioUrl} onError={()=>setAudioError(true)} /> : <p>Audio chưa sẵn sàng.</p>}{teaching.audioReview === "PENDING" ? <p className="foundation-note">Audio nghe thử, đang chờ duyệt.</p> : null}
        {current.itemType === "UTTERANCE" && !saved ? <div className="foundation-actions"><button type="button" className="button secondary" disabled={answerDisabled} onClick={()=>void save({kind:"SELF_RECALL",result:"FORGOTTEN"})}>Chưa nhớ</button><button type="button" className="button primary" disabled={answerDisabled} onClick={()=>void save({kind:"SELF_RECALL",result:"REMEMBERED"})}>Đã nhớ</button></div> : null}
        {current.itemType === "LETTER_ACTIVITY" ? <p>Đây là lượt làm quen, không chấm điểm nghe.</p> : null}
      </div> : null}
      {audioError ? <p role="alert">Chưa phát được audio. Hãy tải lại bài để thử lại.</p> : null}
      {error ? <div role="alert"><p>{error}</p>{stale ? <button className="button secondary" type="button" onClick={reloadStudy}>Tải lại bài</button> : pending ? <button className="button secondary" type="button" disabled={busy} onClick={()=>void save()}>Thử lại lưu kết quả</button> : null}</div> : null}
      {saved ? <p role="status">Đã lưu: {saved.result === "REMEMBERED" ? "đã nhớ" : "chưa nhớ"}.</p> : null}
      {saved || teaching && current.itemType === "LETTER_ACTIVITY" ? <button className="button primary" type="button" disabled={busy} onClick={next}>Tiếp tục</button> : null}
    </section>
  </main>;
}
