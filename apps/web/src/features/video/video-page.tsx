import {useVideoInvalidation} from "./video-data-events";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import type { VideoLibraryEntry, VideoLibraryPage } from "@vocabflow/contracts";
import { parseYoutubeVideoUrl } from "@vocabflow/learning-domain";
import { EmptyState, ErrorState, LoadingState } from "../../components/async-states";
import { useActiveLearner } from "../learners/learner-context-hook";
import { GUEST_ID } from "../guest/guest-store";
import { requestVideo, requestVideoLibrary, saveVideo, VideoClientError } from "./video-client";
import { VideoEntryGate } from "./video-entry-gate";
function LoginEntry() { return <main className="study-setup-page"><EmptyState title="Thư viện video riêng" description="Đăng nhập trước khi xử lý link hoặc lưu video và dữ liệu học của bạn." action={<Link className="button primary" to="/login">Đăng nhập</Link>} /></main>; }
function LibraryWorkspace({ learnerId }: { learnerId: string }) {
  const navigate = useNavigate(), [params, setParams] = useSearchParams(), [retry, setRetry] = useState(0);
  const number = Number(params.get("page")), page = Number.isSafeInteger(number) && number > 0 && number <= 100000 ? number : 1;
  const key = `${page}:${retry}`; const [resource, setResource] = useState<{ key: string; data?: VideoLibraryPage; error?: boolean }>({ key: "" });
  const [url, setUrl] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null), [uncertain, setUncertain] = useState(false);
  const pending = useRef<{ videoId: string; url: string } | null>(null), lock = useRef(false), input = useRef<HTMLInputElement>(null);
  useEffect(() => { document.title = "Học YouTube · VocabFlow"; }, []);
  useEffect(() => { let cancelled = false; void requestVideoLibrary(learnerId, page).then(data => { if (!cancelled) setResource({ key, data }); }).catch(() => { if (!cancelled) setResource({ key, error: true }); }); return () => { cancelled = true; }; }, [key, learnerId, page]);
  async function add() {
    if (lock.current) return;
    try { parseYoutubeVideoUrl(url); } catch { setError("Dán link một video YouTube hợp lệ, không phải playlist hoặc kênh."); input.current?.focus(); return; }
    lock.current = true; setBusy(true); setError(null); setUncertain(true); pending.current ??= { videoId: crypto.randomUUID(), url };
    try { const entry = await saveVideo(learnerId, pending.current.videoId, pending.current.url); pending.current = null; setUncertain(false); navigate(`/videos/${entry.id}`); }
    catch (failure) { setError(failure instanceof VideoClientError && failure.code === "INVALID_VIDEO_URL" ? "Dán link một video YouTube hợp lệ, không phải playlist hoặc kênh." : "Chưa xác nhận được video đã lưu. Giữ nguyên link và thử lại để không tạo trùng."); }
    finally { lock.current = false; setBusy(false); }
  }
  const data = resource.key === key ? resource.data : undefined;
  return <main className="study-setup-page" aria-labelledby="video-library-title"><header className="study-setup-header"><Link className="button secondary" to="/study/setup">Về buổi học</Link><h1 id="video-library-title">Học YouTube</h1><p>Video và học liệu riêng của tài khoản, theo hồ sơ hiện tại. Xem bằng giọng gốc; không tự thay lịch ôn hay XP.</p></header>
    <section className="exercise-card"><h2>Thêm một video tiếng Anh</h2><form className="exercise-typing-form" noValidate onSubmit={event => { event.preventDefault(); void add(); }}><label htmlFor="youtube-url">Link video YouTube</label><input id="youtube-url" ref={input} type="url" aria-invalid={Boolean(error)} value={url} maxLength={2048} disabled={busy || uncertain} onChange={event => { setUrl(event.target.value); setError(null); }} aria-describedby={error ? "youtube-url-help youtube-url-error" : "youtube-url-help"} /><p id="youtube-url-help">Chọn một video có lời nói tiếng Anh. Không nhận playlist hoặc cả kênh.</p>{error ? <p id="youtube-url-error" role="alert">{error}</p> : null}<button className="button primary" disabled={busy}>{busy ? "Đang lưu video…" : uncertain ? "Thử lại lưu video" : "Lưu và mở video"}</button></form></section>
    <section className="exercise-card"><h2>Thư viện của bạn</h2>{resource.key === key && resource.error ? <ErrorState description="Chưa tải được thư viện. Các video đã lưu được giữ nguyên." onRetry={() => setRetry(value => value + 1)} /> : !data ? <LoadingState pattern="rows" label="Đang tải thư viện video" /> : !data.items.length ? <EmptyState title="Chưa có video trong trang này" description="Thêm một link ở trên để bắt đầu xem hoặc quay về trang trước." /> : <ul className="practice-history-list">{data.items.map(entry => <li key={entry.id}><strong>YouTube · {entry.youtubeId}</strong><Link className="button secondary" to={`/videos/${entry.id}`}>Mở video {entry.youtubeId}</Link></li>)}</ul>}
      {data ? <nav className="practice-actions" aria-label="Phân trang video"><button className="button secondary" disabled={page <= 1} onClick={() => setParams({ page: String(page - 1) })}>Video trước</button><span>{data.total} video · Trang {page}</span><button className="button secondary" disabled={page * 20 >= data.total} onClick={() => setParams({ page: String(page + 1) })}>Video tiếp</button></nav> : null}
    </section>
  </main>;
}
function VideoWorkspace({ userId, learnerId, videoId }: { userId: string; learnerId: string; videoId: string }) {
  const [retry, setRetry] = useState(0); const key = `${videoId}:${retry}`;
  const [resource, setResource] = useState<{ key: string; entry?: VideoLibraryEntry; error?: boolean }>({ key: "" });
  useEffect(() => { document.title = "Video riêng · VocabFlow"; }, []);
  useEffect(() => { let cancelled = false; void requestVideo(learnerId, videoId).then(entry => { if (!cancelled) setResource({ key, entry }); }).catch(() => { if (!cancelled) setResource({ key, error: true }); }); return () => { cancelled = true; }; }, [key, learnerId, videoId]);
  const entry = resource.key === key ? resource.entry : undefined;
  return <main className="study-setup-page" aria-labelledby="video-title"><header className="study-setup-header"><Link className="button secondary" to="/videos">Về thư viện video</Link><Link className="button secondary" to={`/videos/${videoId}/history`}>Lịch sử luyện video</Link><Link className="button secondary" to={`/videos/${videoId}/manage`}>Quản lý dữ liệu video</Link><h1 id="video-title">Xem video gốc</h1></header>{resource.key === key && resource.error ? <ErrorState description="Video không có trong thư viện hồ sơ này hoặc chưa tải được. Dữ liệu của bạn được giữ nguyên." onRetry={() => setRetry(value => value + 1)} /> : !entry ? <LoadingState pattern="study" label="Đang mở video riêng" /> : <><p>YouTube · {entry.youtubeId}</p><VideoEntryGate userId={userId} learnerId={learnerId} videoId={entry.id} youtubeId={entry.youtubeId} /></>}</main>;
}
export function VideoLibraryPageView() { const { activeLearner, userId } = useActiveLearner(); if (!activeLearner || !userId) return null; if (userId === GUEST_ID) return <LoginEntry />; return <LibraryWorkspace key={`${userId}:${activeLearner.id}`} learnerId={activeLearner.id} />; }
export function VideoPageView() { const { activeLearner, userId } = useActiveLearner(), { videoId } = useParams(); const invalidation=useVideoInvalidation(userId,activeLearner?.id,videoId);if (!activeLearner || !userId || !videoId) return null; if (userId === GUEST_ID) return <LoginEntry />; return <VideoWorkspace key={`${userId}:${activeLearner.id}:${videoId}:${invalidation}`} userId={userId} learnerId={activeLearner.id} videoId={videoId} />; }
