import {videoWriteHeaders} from "./video-client";
import { useEffect, useRef, useState } from "react";
import { nativeViewSchema, nativeRunSchema, type NativeRun, type VideoTranscript } from "@vocabflow/contracts";
import { ErrorState, LoadingState } from "../../components/async-states";
import { requestTranscript } from "./video-client";
const messages: Record<string, string> = { QUOTA_UNKNOWN: "Chưa xác minh được quota.", FREE_PLAN_REQUIRED: "Chỉ bật gói miễn phí đã xác minh.", QUOTA_EXHAUSTED: "Đã hết quota miễn phí.", TRANSCRIPT_UNAVAILABLE: "Nguồn chưa có phụ đề phù hợp.", ENGLISH_UNAVAILABLE: "Nguồn không trả về phụ đề Anh.", INVALID_TIMED_TRANSCRIPT: "Phụ đề trả về thiếu hoặc sai timing.", DELIVERY_UNCERTAIN: "Chưa rõ provider đã nhận yêu cầu. Không tự gửi lại để tránh dùng quota trùng.", QUOTA_OR_RATE_LIMIT: "Provider đang giới hạn tốc độ hoặc quota." };
export function VideoNative({ learner, video, onSaved }: { learner: string; video: string; onSaved: (value: VideoTranscript) => void }) {
  const [view, setView] = useState<ReturnType<typeof nativeViewSchema.parse> | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState(false), [retry, setRetry] = useState(0), pending = useRef<string | null>(null), lock = useRef(false);
  const base = `/api/learners/${learner}/video-library/${video}/native-transcript`;
  useEffect(() => { let cancelled = false; void fetch(base, { credentials: "same-origin", cache: "no-store" }).then(async response => { if (!response.ok) throw new Error(); return nativeViewSchema.parse(await response.json()); }).then(value => { if (!cancelled) { setView(value); setError(false); } }).catch(() => { if (!cancelled) setError(true); }); return () => { cancelled = true; }; }, [base, retry]);
  async function confirm(poll = false) {
    if (lock.current) return; lock.current = true; setBusy(true); setError(false); pending.current ??= crypto.randomUUID();
    try { const response = await fetch(base + (poll ? "/poll" : ""), { method: "POST", credentials: "same-origin", headers: videoWriteHeaders(learner,video), body: JSON.stringify({ requestId: pending.current }) }); if (!response.ok) throw new Error(); const run: NativeRun | null = nativeRunSchema.nullable().parse(await response.json()); setView(prior => prior ? { ...prior, run } : null);
      if (run?.status === "success" && run.versionId) { onSaved(await requestTranscript(learner, video, run.versionId)); pending.current = null; } }
    catch { setError(true); } finally { setBusy(false); lock.current = false; }
  }
  const run = view?.run;
  return <section className="exercise-card"><h2>Lấy phụ đề Anh có sẵn</h2><p>Chỉ lấy phụ đề có timing từ nguồn được hỗ trợ. Không tạo lời bằng AI. Chỉ dùng nội dung bạn có quyền học và lưu riêng.</p>
    {!view && !error ? <LoadingState pattern="rows" label="Đang kiểm tra hạn mức lấy phụ đề" /> : view ? <><p role="status">{view.quota.remaining === null ? "Quota chưa xác định" : `Còn ${view.quota.remaining} credits miễn phí`} · Mỗi yêu cầu lấy nguồn dùng 1 credit.</p>{view.quota.reason ? <p>{messages[view.quota.reason] ?? "Chưa thể xác minh hạn mức miễn phí."}</p> : null}
    {run ? <p role="status">{run.status === "success" ? "Đã lưu phụ đề Anh từ nguồn." : run.status === "waiting" ? "Nguồn đang xử lý, có job được giữ để kiểm tra tiếp." : run.status === "processing" ? "Đang xác nhận yêu cầu đã gửi. Không tạo yêu cầu mới; nếu không thể xác nhận, bạn vẫn nhập SRT/VTT được." : messages[run.reason ?? ""] ?? "Chưa lấy được phụ đề nguồn. Bạn vẫn xem video và nhập SRT/VTT được."}</p> : null}
    <button className="button secondary" disabled={busy || (!run && !view.quota.available) || run?.status === "failed" || run?.status === "uncertain"} onClick={() => void confirm(run?.status === "waiting")}>{busy ? "Đang xác nhận phụ đề…" : run?.status === "waiting" ? "Kiểm tra job phụ đề" : run?.status === "success" ? "Mở phụ đề nguồn đã lưu" : run ? "Xác nhận yêu cầu đã gửi" : "Lấy phụ đề Anh · 1 credit"}</button></> : null}
    {error ? <ErrorState description="Chưa xác nhận được nguồn/quota hoặc lần lưu. Giữ yêu cầu; nhập SRT/VTT vẫn dùng được." onRetry={() => { if (pending.current) void confirm(view?.run?.status === "waiting"); else setRetry(value => value + 1); }} /> : null}
  </section>;
}
