import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import type { FishGameAction, FishGameSession } from "@vocabflow/contracts";
import { EmptyState, ErrorState } from "../../components/async-states";
import { useActiveLearner } from "../learners/learner-context-hook";
import { GUEST_ID } from "../guest/guest-store";
import { useGameSession } from "./use-game-session";
import { GameSetup } from "./game-setup";
import { usePronunciationAudio } from "../study/pronunciation-audio";

const outcomes = { correct: "Bắt được cá!", incorrect: "Chưa đúng — mất 1 tim", revealed: "Đã xem đáp án — mất 1 tim", skipped: "Đã bỏ qua — mất 1 tim", technical: "Đã bỏ qua lỗi media — giữ nguyên tim" };
const guestErrors: Record<string, string> = {
  GUEST_GAME_STORAGE_UNAVAILABLE: "Chưa lưu được ván trên trình duyệt. Cá và câu trả lời được giữ; thử lại sau khi cho phép lưu dữ liệu trang web.",
  GUEST_GAME_CORRUPT: "Không đọc được dữ liệu game trên trình duyệt. Dữ liệu cũ được giữ nguyên; hãy kiểm tra dữ liệu trang web rồi thử lại.",
  GUEST_LOCK_UNAVAILABLE: "Trình duyệt chưa hỗ trợ lưu an toàn giữa các cửa sổ. Dùng trình duyệt mới hơn rồi thử lại; chưa ghi kết quả mới."
};
function GameAudio({ url, disabled, ready, fail }: { url: string; disabled: boolean; ready: () => void; fail: () => void }) {
  const audio = usePronunciationAudio(url, "", 0, fail); const readyRef = useRef(ready);
  useEffect(() => { readyRef.current = ready; }, [ready]);
  useEffect(() => { if (audio.state === "playing" || audio.state === "ended") readyRef.current(); }, [audio.state]);
  return <div><button className="button primary" disabled={disabled || audio.state === "loading"} onClick={audio.play}>Nghe gợi ý</button><p role="status">{audio.state === "loading" ? "Đang tải âm thanh…" : "Nghe lại không mất tim"}</p></div>;
}
function FishQuestion({ question, busy, act, draft, onDraft }: { question: NonNullable<FishGameSession["current"]>; busy: boolean; act: (action: FishGameAction) => void; draft: string; onDraft: (questionId: string, text: string) => void }) {
  const [text, setText] = useState(draft); const [empty, setEmpty] = useState(false);
  const [media, setMedia] = useState<"loading" | "ready" | "error">("loading"); const [reload, setReload] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { if (media === "ready") input.current?.focus(); }, [media]);
  function send(kind: "skip" | "reveal" | "technical-skip") { act({ actionId: crypto.randomUUID(), questionId: question.questionId, kind }); }
  return <section className="exercise-card" aria-busy={busy}>
    <div className="fish-stage"><span className="fish-decoration" aria-hidden="true">🐟</span><h2>Gõ từ tiếng Anh để bắt cá</h2>
      {media !== "error" && question.cueKind === "image" ? <img key={reload} className="exercise-image" src={question.imageUrl!} alt="Hình gợi ý cho cá hiện tại" onLoad={() => setMedia("ready")} onError={() => setMedia("error")} /> : null}
      {media !== "error" && question.cueKind === "audio" ? <GameAudio key={reload} url={question.audioUrl!} disabled={busy} ready={() => setMedia("ready")} fail={() => setMedia("error")} /> : null}
      {media === "loading" && question.cueKind === "image" ? <p role="status">Đang tải ảnh…</p> : null}
    </div>
    {media === "error" ? <div role="alert"><p>Không tải được {question.cueKind === "image" ? "ảnh" : "âm thanh"}. Lỗi media không mất tim.</p><div className="practice-actions"><button className="button secondary" disabled={busy} onClick={() => { setMedia("loading"); setReload(value => value + 1); }}>Tải lại {question.cueKind === "image" ? "ảnh" : "âm thanh"}</button><button className="button secondary" disabled={busy} onClick={() => send("technical-skip")}>Bỏ qua lỗi {question.cueKind === "image" ? "ảnh" : "âm thanh"}</button></div></div> : null}
    <form className="exercise-typing-form" noValidate onSubmit={event => { event.preventDefault(); if (!text.normalize("NFKC").trim()) { setEmpty(true); input.current?.focus(); return; } act({ actionId: crypto.randomUUID(), questionId: question.questionId, kind: "type-answer", text }); }}>
      <label htmlFor="fish-answer">Từ tiếng Anh</label><input id="fish-answer" ref={input} value={text} maxLength={200} autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false} disabled={busy || media !== "ready"} aria-invalid={empty} aria-describedby={empty ? "fish-empty" : undefined} onChange={event => { setText(event.target.value); setEmpty(false); onDraft(question.questionId, event.target.value); }} />
      {empty ? <p id="fish-empty" role="alert">Nhập từ trước khi gửi. Ô trống không mất tim.</p> : null}
      <button className="button primary" disabled={busy || media !== "ready"}>Gửi đáp án</button>
    </form>
    <div className="practice-actions"><button className="button secondary" disabled={busy || media !== "ready"} onClick={() => send("reveal")}>Xem đáp án · −1 tim</button><button className="button secondary" disabled={busy || media !== "ready"} onClick={() => send("skip")}>Bỏ qua cá · −1 tim</button></div>
  </section>;
}
function GameWorkspace({ userId, learnerId }: { userId: string; learnerId: string }) {
  const flow = useGameSession(userId, learnerId); const { session, feedback, busy, error } = flow;
  const incompatible = error === "STALE_GAME_CONTENT" || error === "INVALID_GAME_CHECKPOINT" || error === "GAME_NOT_FOUND";
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { document.title = "Bắn cá điền từ · VocabFlow"; }, []);
  useEffect(() => { if (feedback) heading.current?.focus(); }, [feedback]);
  return <main className="study-page practice-page" aria-labelledby="game-title"><header className="study-setup-header"><div className="practice-actions"><Link className="button secondary" to="/study/setup">Về buổi học</Link><Link className="button secondary" to="/game/history">Lịch sử game</Link></div><h1 id="game-title">Bắn cá điền từ</h1><p>5 tim · Đúng +10 · Sai, xem hoặc bỏ qua −1 tim. Không giới hạn thời gian.</p><p>Kết quả game lưu riêng, không đổi lịch ôn hay XP.</p>{userId === GUEST_ID ? <p>Lưu trên trình duyệt này; xóa dữ liệu trang web sẽ mất ván khách. Không tự chuyển vào tài khoản.</p> : null}</header>
    {error ? <ErrorState title="Chưa xác nhận được ván" description={guestErrors[error] ?? (incompatible ? "Nội dung hoặc checkpoint không còn tương thích. Tim/điểm chưa thay đổi; ván cũ được giữ nguyên." : error === "STORAGE_UNAVAILABLE" ? "Chưa lưu được checkpoint trên thiết bị. Cho phép lưu dữ liệu trang web rồi thử lại; câu trả lời vẫn được giữ." : error === "STALE_QUESTION" ? "Cá đã được giải quyết ở cửa sổ khác. Tải kết quả đã lưu để tiếp tục." : "Cá và câu trả lời vẫn được giữ. Thử lại để xác nhận một lần.")} onRetry={incompatible || error === "STALE_QUESTION" ? undefined : () => void flow.retry()} retrying={busy} action={incompatible ? <button className="button primary" onClick={flow.newSession}>Chuẩn bị ván mới</button> : error === "STALE_QUESTION" ? <button className="button primary" onClick={() => void flow.reconcile()}>Tải kết quả đã lưu</button> : undefined} /> : null}
    {incompatible ? null : flow.offer ? <section className="exercise-card"><h2>Có ván trên thiết bị này</h2><p>Tiếp tục đúng ván với tim, điểm, cá và hàng đợi đã lưu.</p><div className="practice-actions"><button className="button primary" disabled={busy} onClick={() => void flow.resume()}>{busy ? "Đang tải ván…" : "Tiếp tục ván"}</button>{!flow.offer.pending && !flow.offer.finish ? <button className="button secondary" disabled={busy} onClick={flow.newSession}>Chuẩn bị ván mới</button> : null}</div></section>
      : !session || (session.emptyReason && session.status !== "paused-content") ? <><GameSetup learnerId={learnerId} disabled={busy || Boolean(error)} onStart={config => void flow.save(undefined, config)} />{busy ? <p role="status">Đang chuẩn bị ván…</p> : null}{session?.emptyReason ? <EmptyState title={session.emptyReason === "no-learned-words" ? "Chưa có từ đã học" : session.emptyReason === "empty-source" ? "Nguồn chưa có từ phù hợp" : session.emptyReason === "insufficient-mixed-media" ? "Kết hợp cần cả ảnh, âm thanh và hai từ khác nhau" : "Chưa có media phù hợp"} description="Chủ động đổi nguồn hoặc gợi ý. Không tự lấy từ ngoài nguồn đã chọn." /> : null}</> : <>
      <p>{session.config.source.kind === "learned" ? "Từ đã học" : session.config.source.kind === "set" ? `Bộ học #${session.config.source.setId}` : session.config.source.kind === "saved" ? "Từ đã lưu" : `Mức ${session.config.source.cefr}`} · {session.config.cue === "image" ? "Ảnh" : session.config.cue === "audio" ? "Nghe" : "Kết hợp ảnh và nghe"}</p>
      <dl className="practice-summary fish-score" aria-live="polite"><div><dt>Tim còn lại</dt><dd>{session.hearts}/5</dd></div><div><dt>Điểm game</dt><dd>{session.score}</dd></div><div><dt>Cá đã bắt</dt><dd>{session.summary.correct}</dd></div></dl>
      {session.status === "active" ? <button className="button secondary" disabled={busy || Boolean(error)} onClick={flow.pause}>Tạm dừng ván</button> : null}
      {session.status === "active" || session.status === "paused-content" ? <button className="button secondary" disabled={busy || Boolean(error)} onClick={() => void flow.finish()}>Kết thúc ván và lưu tổng kết</button> : null}
      {busy ? <p role="status">Đang lưu kết quả…</p> : null}
      {feedback && session.feedback ? <section className="exercise-card" role="status"><h2 ref={heading} tabIndex={-1}>{outcomes[session.feedback.outcome]}</h2><p>Đáp án: <strong>{session.feedback.answer}</strong></p><button className="button primary" disabled={busy || Boolean(error)} onClick={flow.next}>{session.status === "lost" || session.status === "ended" ? "Xem tổng kết ván" : session.status === "paused-content" ? "Xem trạng thái ván" : "Cá tiếp theo"}</button></section>
        : session.status === "lost" || session.status === "ended" ? <section className="exercise-card"><h2>{session.status === "lost" ? "Ván kết thúc — hết tim" : "Ván đã kết thúc"}</h2><p>{session.score} điểm · {session.summary.correct} cá đã bắt</p><p>Sai {session.summary.incorrect} · Đã xem {session.summary.revealed} · Bỏ qua {session.summary.skipped} · Lỗi media {session.summary.technical}</p><button className="button primary" onClick={flow.newSession}>Chuẩn bị ván mới</button></section>
        : session.status === "paused-content" ? <section className="exercise-card"><h2>Ván tạm dừng vì media</h2><p>{session.emptyReason === "insufficient-next-cue" ? "Giai đoạn hiện tại không đủ loại gợi ý tiếp theo để giữ kiểu kết hợp và không lặp từ sớm." : "Không còn media hợp lệ sau các mục đã bỏ qua kỹ thuật."} Tim và điểm được giữ nguyên.</p><button className="button primary" onClick={flow.newSession}>Đổi thiết lập cho ván mới</button></section>
        : session.current ? <FishQuestion key={session.current.questionId} question={session.current} busy={busy || Boolean(error)} act={action => void flow.save(action)} draft={flow.draft?.questionId === session.current.questionId ? flow.draft.text : ""} onDraft={flow.writeDraft} /> : null}
    </>}
  </main>;
}
export function GamePage() {
  const { activeLearner, userId } = useActiveLearner();
  if (!activeLearner || !userId) return null;
  return <GameWorkspace key={`${userId}:${activeLearner.id}`} userId={userId} learnerId={activeLearner.id} />;
}
