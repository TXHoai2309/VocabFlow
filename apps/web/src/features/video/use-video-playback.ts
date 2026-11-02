import { useEffect, useRef, useState } from "react";
import type { YoutubePlayer } from "./youtube-player";
export function useVideoPlayback() {
  const controller = useRef<YoutubePlayer | null>(null), range = useRef<{ startMs: number; endMs: number; repeat: boolean; seeking: boolean; expires: number } | null>(null);
  const [notice, setNotice] = useState<string | null>(null), [repeating, setRepeating] = useState(false);
  useEffect(() => () => { range.current = null; }, []);
  function stop() { range.current = null; setRepeating(false); }
  function replay(startMs: number, endMs: number, repeat = false) {
    const player = controller.current;
    if (!player || startMs < 0 || endMs <= startMs || endMs > player.getDuration() * 1000 + 750) { setNotice("Player chưa sẵn sàng hoặc đoạn nằm ngoài thời lượng video. Chưa phát đoạn."); return; }
    player.pauseVideo(); range.current = { startMs, endMs, repeat, seeking: true, expires: Date.now() + 5000 }; setRepeating(repeat); setNotice("Đang chuyển tới đầu đoạn…"); player.seekTo(startMs / 1000, true);
  }
  function tick(seconds: number, _duration: number, state: number) {
    const current = range.current, player = controller.current; if (!current) return;
    if (!player) { stop(); setNotice("Player mất kết nối. Hãy tải lại rồi chủ động nghe lại đoạn."); return; }
    const time = seconds * 1000;
    if (current.seeking) {
      if (Math.abs(time - current.startMs) <= 750) { current.seeking = false; setNotice("Phát theo timing cue; có thể lệch khi seek/buffering. Không phải mốc từng từ."); player.playVideo(); }
      else if (Date.now() > current.expires) { player.pauseVideo(); stop(); setNotice("Player chưa chuyển đúng đầu đoạn. Đã dừng; thử nghe lại khi kết nối ổn định."); }
      return;
    }
    if (state !== 1) return;
    if (time >= current.endMs) { player.pauseVideo(); if (current.repeat) { current.seeking = true; current.expires = Date.now() + 5000; player.seekTo(current.startMs / 1000, true); } else { stop(); setNotice("Đã phát đến cuối đoạn."); } }
    else if (time < current.startMs - 750) { player.pauseVideo(); stop(); setNotice("Bạn đã chuyển ra ngoài đoạn; đã dừng nghe lặp."); }
  }
  return { controller, replay, tick, stop, repeating, notice };
}
