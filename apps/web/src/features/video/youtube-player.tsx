import { useEffect, useRef, useState, type RefObject } from "react";
export type YoutubePlayer = {
  destroy: () => void; getIframe: () => HTMLIFrameElement; getCurrentTime: () => number; getDuration: () => number;
  getPlayerState: () => number; playVideo: () => void; pauseVideo: () => void; seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getAvailablePlaybackRates: () => number[]; getPlaybackRate: () => number; setPlaybackRate: (rate: number) => void;
};
type YoutubeApi = { Player: new (element: HTMLElement, options: { width: number; height: number; videoId: string; playerVars: Record<string, number | string>; events: { onReady: (event: { target: YoutubePlayer }) => void; onStateChange: (event: { data: number }) => void; onError: (event: { data: number }) => void; onAutoplayBlocked: () => void } }) => YoutubePlayer };
declare global { interface Window { YT?: YoutubeApi; onYouTubeIframeAPIReady?: () => void } }
let loadingApi: Promise<YoutubeApi> | null = null;
function loadApi(): Promise<YoutubeApi> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (loadingApi) return loadingApi;
  loadingApi = new Promise<YoutubeApi>((resolve, reject) => {
    const script = document.createElement("script"), previous = window.onYouTubeIframeAPIReady;
    const fail = () => { clearTimeout(timeout); script.remove(); window.onYouTubeIframeAPIReady = previous; reject(new Error("YOUTUBE_SCRIPT_UNAVAILABLE")); };
    const timeout = window.setTimeout(fail, 20000);
    window.onYouTubeIframeAPIReady = () => { try { previous?.(); } finally { if (window.YT?.Player) { clearTimeout(timeout); resolve(window.YT); } else fail(); } };
    script.src = "https://www.youtube.com/iframe_api"; script.async = true; script.referrerPolicy = "strict-origin-when-cross-origin"; script.onerror = fail; document.head.appendChild(script);
  }).catch(error => { loadingApi = null; throw error; });
  return loadingApi;
}
const errorCopy: Record<number, string> = { 2: "YouTube không nhận mã video này.", 5: "Trình duyệt chưa phát được video HTML5. Hãy thử tải lại.", 100: "Video đã bị xóa, đặt riêng tư hoặc không còn truy cập được.", 101: "Chủ video không cho phát nhúng. Bạn có thể mở nguồn YouTube.", 150: "Chủ video không cho phát nhúng. Bạn có thể mở nguồn YouTube.", 153: "YouTube chưa xác minh được nguồn nhúng của trang. Hãy thử tải lại hoặc mở YouTube." };
const stateCopy: Record<number, string> = { [-1]: "Video chưa bắt đầu", 0: "Video đã kết thúc", 1: "Đang phát video", 2: "Video đang tạm dừng", 3: "Video đang tải thêm dữ liệu", 5: "Video sẵn sàng" };
type Props = { youtubeId: string; controller?: RefObject<YoutubePlayer | null>; onTime?: (seconds: number, duration: number, state: number) => void; onReady?: (player: YoutubePlayer) => void; onAvailability?: (ready: boolean) => void };
function PlayerAttempt({ youtubeId, controller, onTime, onReady, onAvailability, retry }: Props & { retry: () => void }) {
  const container = useRef<HTMLDivElement>(null), callbacks = useRef({ onTime, onReady, onAvailability });
  const [status, setStatus] = useState("Đang tải player YouTube…"), [error, setError] = useState<string | null>(null);
  useEffect(() => { callbacks.current = { onTime, onReady, onAvailability }; }, [onTime, onReady, onAvailability]);
  useEffect(() => {
    let cancelled = false, player: YoutubePlayer | null = null, polling: number | undefined, readyTimeout: number | undefined;
    void loadApi().then(api => {
      if (cancelled || !container.current) return;
      const mount = document.createElement("div"); container.current.appendChild(mount);
      readyTimeout = window.setTimeout(() => { if (!cancelled) setError("Chưa nhận được phản hồi từ player. Video và dữ liệu đã lưu được giữ nguyên."); }, 20000);
      player = new api.Player(mount, { width: 640, height: 360, videoId: youtubeId,
        playerVars: { controls: 1, playsinline: 1, autoplay: 0, origin: window.location.origin }, events: {
          onReady: event => {
            if (cancelled) return; clearTimeout(readyTimeout); const target = event.target;
            const frame = target.getIframe(); frame.title = "Trình phát YouTube gốc"; frame.referrerPolicy = "strict-origin-when-cross-origin";
            if (controller) controller.current = target; callbacks.current.onAvailability?.(true); callbacks.current.onReady?.(target); setStatus("Video sẵn sàng — nhấn phát trong player");
            polling = window.setInterval(() => { if (!cancelled) { try { callbacks.current.onTime?.(target.getCurrentTime(), target.getDuration(), target.getPlayerState()); } catch { /* Player may be navigating away. */ } } }, 250);
          },
          onStateChange: event => { if (!cancelled) setStatus(stateCopy[event.data] ?? "Player đã cập nhật trạng thái"); },
          onError: event => { if (!cancelled) { clearTimeout(readyTimeout); clearInterval(polling); if (controller) controller.current = null; callbacks.current.onAvailability?.(false); setStatus("Player báo lỗi"); setError(errorCopy[event.data] ?? "Chưa phát được video. Hãy thử tải lại hoặc mở nguồn YouTube."); } },
          onAutoplayBlocked: () => { if (!cancelled) setStatus("Trình duyệt yêu cầu bạn nhấn phát trực tiếp trong player."); }
        } });
    }).catch(() => { if (!cancelled) setError("Không tải được player YouTube. Kiểm tra kết nối rồi thử lại."); });
    const node = container.current;
    return () => { cancelled = true; clearInterval(polling); clearTimeout(readyTimeout); if (controller) controller.current = null; callbacks.current.onAvailability?.(false); player?.destroy(); node?.replaceChildren(); };
  }, [youtubeId, controller]);
  return <section aria-label="Video gốc"><div className="youtube-player" ref={container} /><p role="status">{status}</p>{error ? <div role="alert"><p>{error}</p><button className="button secondary" onClick={retry}>Tải lại player</button></div> : null}<a className="button secondary" href={`https://www.youtube.com/watch?v=${youtubeId}`} target="_blank" rel="noopener">Mở nguồn YouTube</a></section>;
}
export function YoutubePlayerView(props: Props) { const [attempt, setAttempt] = useState(0); return <PlayerAttempt key={`${props.youtubeId}:${attempt}`} {...props} retry={() => setAttempt(value => value + 1)} />; }
