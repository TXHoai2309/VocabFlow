import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { learningLevelLabel, type PracticeSource, type PracticeHistory, type PracticeResults } from "@vocabflow/contracts";
import { EmptyState, ErrorState, LoadingState } from "../../components/async-states";
import { useActiveLearner } from "../learners/learner-context-hook";
import { GUEST_ID } from "../guest/guest-store";
import { PracticeClientError, requestPracticeHistory, requestPracticeResults, requestPracticeRetry } from "./practice-client";
import { clearPracticeCheckpoint, readPracticeCheckpoint, writePracticeCheckpoint, type PracticeCheckpoint } from "./practice-checkpoint";

const outcomeLabels = { correct: "Đúng", incorrect: "Cần luyện thêm", revealed: "Đã xem đáp án", skipped: "Bỏ qua chủ động", technical: "Lỗi media" };
const date = (value: string) => new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(value));
const sourceLabel = (source: PracticeSource) => `${source.kind === "learned" ? "Từ đã học" : source.kind === "saved" ? "Từ đã lưu" : source.kind === "set" ? `Bộ học #${source.setId}` : "Mức học"}${source.cefr ? ` · ${learningLevelLabel(source.cefr)}` : ""}`;
function positivePage(value: string | null) { const number = Number(value); return Number.isSafeInteger(number) && number > 0 && number <= 100000 ? number : 1; }
function HistoryWorkspace({ userId, learnerId }: { userId: string; learnerId: string }) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const page = positivePage(params.get("page")), needsPage = positivePage(params.get("needsPage"));
  const [retry, setRetry] = useState(0);
  const key = `${userId}:${learnerId}:${page}:${needsPage}:${retry}`;
  const [resource, setResource] = useState<{ key: string; data?: PracticeHistory; error?: boolean }>({ key: "" });
  const [detail, setDetail] = useState<PracticeResults | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [creationError, setCreationError] = useState<string | null>(null);
  const [hasPendingRetry, setHasPendingRetry] = useState(false);
  const detailTarget = useRef<string | null>(null);
  const detailVersion = useRef(0);
  const mounted = useRef(true);
  const creationLock = useRef(false);
  const pendingRetry = useRef<{ id: string; originalId: string; questionIds: string[]; previous: PracticeCheckpoint | null } | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { mounted.current = true; document.title = "Lịch sử luyện · VocabFlow"; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    let cancelled = false;
    void requestPracticeHistory(learnerId, page, needsPage).then(data => { if (!cancelled) setResource({ key, data }); }).catch(() => { if (!cancelled) setResource({ key, error: true }); });
    return () => { cancelled = true; };
  }, [key, learnerId, page, needsPage]);
  function changePage(name: "page" | "needsPage", value: number) { const next = new URLSearchParams(params); next.set(name, String(value)); setParams(next); }
  async function open(sessionId: string) {
    if (creating) return;
    const version = ++detailVersion.current; detailTarget.current = sessionId;
    setDetailLoading(true); setDetailError(false); setDetail(null); setCreationError(null); setHasPendingRetry(false); pendingRetry.current = null;
    try {
      const result = await requestPracticeResults(learnerId, sessionId);
      if (mounted.current && version === detailVersion.current) { setDetail(result); setSelected(result.results.filter(row => row.outcome === "incorrect").map(row => row.questionId)); }
    } catch { if (mounted.current && version === detailVersion.current) setDetailError(true); }
    finally { if (mounted.current && version === detailVersion.current) { setDetailLoading(false); requestAnimationFrame(() => heading.current?.focus()); } }
  }
  async function startRetry() {
    if (!detail || !selected.length || creationLock.current) return;
    creationLock.current = true; setCreating(true); setCreationError(null);
    try {
      pendingRetry.current ??= { id: crypto.randomUUID(), originalId: detail.session.sessionId, questionIds: [...selected], previous: readPracticeCheckpoint(userId, learnerId) };
      const pending = pendingRetry.current;
      const checkpoint: PracticeCheckpoint = { version: 1, userId, learnerId, sessionId: pending.id, config: detail.session.config,
        created: false, pending: null, feedback: false, draft: null, retry: { originalId: pending.originalId, questionIds: pending.questionIds } };
      writePracticeCheckpoint(checkpoint); setHasPendingRetry(true);
      const next = await requestPracticeRetry(learnerId, pending.originalId, pending.id, pending.questionIds);
      if (!mounted.current) return;
      if (next.emptyReason) {
        if (pending.previous) writePracticeCheckpoint(pending.previous); else clearPracticeCheckpoint(userId, learnerId);
        pendingRetry.current = null; setHasPendingRetry(false);
        setCreationError(next.emptyReason === "insufficient-mixed-media" ? "Các câu sai đã chọn chưa đủ hai từ với cả ảnh và âm thanh để giữ kiểu kết hợp. Hãy chọn thêm câu phù hợp hoặc bắt đầu buổi khác." : "Nguồn hiện tại chưa đủ media hoặc lựa chọn cho các câu sai. Lịch sử cũ được giữ nguyên.");
        return;
      }
      writePracticeCheckpoint({ ...checkpoint, created: true });
      navigate("/practice", { state: { practiceSession: next } });
    } catch (failure) {
      if (mounted.current) setCreationError(failure instanceof PracticeClientError && failure.code === "STALE_PRACTICE_CONTENT"
        ? "Nội dung hoặc media của câu sai đã đổi/ngừng phục vụ. Không tạo lượt mới; lịch sử ban đầu vẫn giữ nguyên."
        : "Chưa tạo hoặc xác nhận được lượt luyện lại. Giữ nguyên lựa chọn và thử lại để không tạo trùng.");
    } finally { creationLock.current = false; if (mounted.current) setCreating(false); }
  }
  const data = resource.key === key ? resource.data : undefined;
  const failed = resource.key === key && resource.error;
  return <main className="study-setup-page" aria-labelledby="practice-history-title">
    <header className="study-setup-header"><Link className="button secondary" to="/practice">Về Luyện tự do</Link><h1 id="practice-history-title">Lịch sử luyện</h1><p>{userId === GUEST_ID ? "Lịch sử khách trên trình duyệt này; không tự chuyển vào tài khoản." : "Kết quả luyện riêng của tài khoản."} Tách với Ôn theo lịch và từ yếu SRS.</p></header>
    {failed ? <ErrorState description="Không tải được lịch sử luyện. Dữ liệu đã lưu được giữ nguyên." onRetry={() => setRetry(value => value + 1)} /> : !data ? <LoadingState pattern="rows" label="Đang tải lịch sử luyện" /> : <>
      <section className="exercise-card"><h2>Từ cần luyện thêm</h2><p>Từ có lần trả lời đúng/sai gần nhất là sai trong Luyện tự do.</p>
        {!data.needsPractice.length ? <p role="status">Chưa có từ cần luyện thêm trong trang này.</p> : <ul className="practice-history-list">{data.needsPractice.map(word => <li key={word.vocabularyId}><strong>{word.word}</strong><span>{word.incorrectCount} lần cần luyện thêm · {date(word.lastAnsweredAt)}</span><button className="button secondary" onClick={() => void open(word.sessionId)}>Xem buổi có {word.word}</button></li>)}</ul>}
        <nav className="practice-actions" aria-label="Phân trang từ cần luyện thêm"><button className="button secondary" disabled={needsPage <= 1} onClick={() => changePage("needsPage", needsPage - 1)}>Từ trước</button><span>{data.needsTotal} từ · Trang {needsPage}</span><button className="button secondary" disabled={needsPage * 20 >= data.needsTotal} onClick={() => changePage("needsPage", needsPage + 1)}>Từ tiếp</button></nav>
      </section>
      <section className="exercise-card"><h2>Các buổi luyện</h2>{!data.items.length ? <EmptyState title="Chưa có buổi luyện trong trang này" description="Bắt đầu Luyện tự do để lưu kết quả đầu tiên, hoặc quay về trang trước." /> : <ul className="practice-history-list">{data.items.map(item => <li key={item.sessionId}>
        <strong>{date(item.createdAt)}{item.retryOf ? " · Lượt luyện lại" : ""}</strong><span>{sourceLabel(item.config.source)} · {item.config.cue === "image" ? "Ảnh" : item.config.cue === "audio" ? "Nghe" : "Kết hợp"} · {item.config.responseMode === "type" ? "Gõ từ" : "Chọn từ"} · Đã làm {item.completed}/{item.total} · {item.summary.accuracy === null ? "Chưa có câu trả lời" : `${item.summary.accuracy}% đúng`}</span>
        <span>Đúng {item.summary.correct} · Cần luyện thêm {item.summary.incorrect} · Đã xem {item.summary.revealed} · Bỏ qua {item.summary.skipped} · Lỗi media {item.summary.technical}</span>
        <button className="button secondary" aria-controls="practice-history-detail" aria-expanded={detail?.session.sessionId === item.sessionId} onClick={() => void open(item.sessionId)}>Xem buổi luyện</button>
      </li>)}</ul>}
      <nav className="practice-actions" aria-label="Phân trang buổi luyện"><button className="button secondary" disabled={page <= 1} onClick={() => changePage("page", page - 1)}>Buổi trước</button><span>{data.totalSessions} buổi · Trang {page}</span><button className="button secondary" disabled={page * 20 >= data.totalSessions} onClick={() => changePage("page", page + 1)}>Buổi tiếp</button></nav></section>
    </>}
    <section id="practice-history-detail" className="practice-history-detail">
      {detailLoading ? <LoadingState pattern="rows" label="Đang tải kết quả buổi luyện" /> : detailError ? <ErrorState description="Không tải được kết quả buổi luyện." onRetry={() => { if (detailTarget.current) void open(detailTarget.current); }} /> : detail ? <section className="exercise-card"><h2 tabIndex={-1} ref={heading}>Kết quả lượt đầu</h2><p>Chỉ hiện các câu đã giải quyết. Luyện lại tạo lượt mới và giữ nguyên kết quả này.</p>
        <fieldset disabled={creating || hasPendingRetry} className="practice-history-selection"><legend>Chọn câu sai để luyện lại</legend>{detail.results.map(row => <div className="practice-history-result" key={row.questionId}>
          {row.outcome === "incorrect" ? <label><input type="checkbox" checked={selected.includes(row.questionId)} onChange={event => setSelected(ids => event.target.checked ? [...ids, row.questionId] : ids.filter(id => id !== row.questionId))} />{row.word}</label> : <strong>{row.word}</strong>}
          <span>{outcomeLabels[row.outcome]} · {row.cueKind === "image" ? "Ảnh" : "Nghe"}{row.submitted ? ` · Bạn trả lời: ${row.submitted}` : ""}</span>
        </div>)}</fieldset>
        {!detail.results.some(row => row.outcome === "incorrect") ? <p role="status">Buổi này chưa có câu sai để luyện lại.</p> : null}
        {creationError ? <p role="alert">{creationError}</p> : null}
        <button className="button primary" disabled={creating || !selected.length} onClick={() => void startRetry()}>{creating ? "Đang tạo lượt luyện…" : creationError ? "Thử lại lượt luyện đã chọn" : "Luyện lại câu đã chọn"}</button>
      </section> : null}
    </section>
  </main>;
}
export function PracticeHistoryPage() {
  const { activeLearner, userId } = useActiveLearner();
  if (!activeLearner || !userId) return null;
  return <HistoryWorkspace key={`${userId}:${activeLearner.id}`} userId={userId} learnerId={activeLearner.id} />;
}
