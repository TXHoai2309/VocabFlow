import { useState } from "react";
import { Link } from "react-router";
import { ErrorState } from "../../components/async-states";
import { readVideoCheckpoint, writeVideoCheckpoint } from "./video-practice-checkpoint";
import { readVideoPracticeRequest, actVideoPracticeRequest, createVideoPracticeRequest } from "./video-practice-client";
import { VideoWatch } from "./video-watch";
export function VideoEntryGate({ userId, learnerId, videoId, youtubeId }: { userId: string; learnerId: string; videoId: string; youtubeId: string }) {
  const [initial] = useState(() => { try { return { cp: readVideoCheckpoint(userId, learnerId, videoId), error: false }; } catch { return { cp: null, error: true }; } });
  const [visible, setVisible] = useState(!initial.cp && !initial.error), [busy, setBusy] = useState(false), [error, setError] = useState(initial.error);
  async function expose() {
    if (busy) return; setBusy(true); setError(false);
    try {
      let cp = readVideoCheckpoint(userId, learnerId, videoId);
      if (cp) {
        let next = cp.pending ? await actVideoPracticeRequest(learnerId, videoId, cp.input.sessionId, cp.pending) : !cp.created ? await createVideoPracticeRequest(learnerId, videoId, cp.input) : await readVideoPracticeRequest(learnerId, videoId, cp.input.sessionId);
        const alreadyResolved = cp.feedback || Boolean(cp.pending);
        cp = { ...cp, created: true, pending: null, feedback: alreadyResolved };
        if (!alreadyResolved && next.current) {
          cp.pending = { actionId: crypto.randomUUID(), questionId: next.current.questionId, kind: "reveal" }; writeVideoCheckpoint(cp);
          next = await actVideoPracticeRequest(learnerId, videoId, cp.input.sessionId, cp.pending);
          cp = { ...cp, pending: null, feedback: true, draft: null };
        }
        if (next.total) writeVideoCheckpoint(cp);
      }
      setVisible(true);
    } catch { setError(true); } finally { setBusy(false); }
  }
  if (visible) return <VideoWatch learnerId={learnerId} videoId={videoId} youtubeId={youtubeId} />;
  return <section className="exercise-card"><h2>Có bài luyện video trên thiết bị</h2><p>Tiếp tục bài để giữ nguyên câu và chỗ khuyết. Mở Xem hiểu sẽ ghi Đã xem cho câu đang làm chưa có kết quả.</p><div className="practice-actions"><Link className="button primary" to={`/videos/${videoId}/practice?resume=1`}>Tiếp tục bài video</Link><button className="button secondary" disabled={busy} onClick={() => void expose()}>{busy ? "Đang xác nhận quyền xem lời…" : "Mở Xem hiểu và ghi Đã xem"}</button></div>{error ? <ErrorState description="Chưa đọc hoặc xác nhận được bài/chốt Đã xem. Lời vẫn được giấu; dữ liệu cũ được giữ. Thử lại hoặc kiểm tra checkpoint trong bài luyện." onRetry={() => void expose()} /> : null}</section>;
}
