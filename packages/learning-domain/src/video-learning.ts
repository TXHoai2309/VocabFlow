import { VIDEO_SUBTITLE_MAX_BYTES, type VideoCue, type VideoWatchAction, type VideoWatchState } from "@vocabflow/contracts";
export class VideoRuleError extends Error { constructor(readonly code: "INVALID_VIDEO_URL" | "IDEMPOTENCY_CONFLICT" | "INVALID_SUBTITLE" | "INVALID_REQUEST", readonly reason?: string) { super(code); } }
/** Parse only: no submitted URL is ever fetched. */
export function parseYoutubeVideoUrl(input: string) {
  let url: URL; try { if (input.length > 2048) throw new Error(); url = new URL(input.trim()); } catch { throw new VideoRuleError("INVALID_VIDEO_URL"); }
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.port || url.searchParams.has("list")) throw new VideoRuleError("INVALID_VIDEO_URL");
  let id: string | null = null;
  if (["youtu.be", "www.youtu.be"].includes(url.hostname)) id = /^\/([A-Za-z0-9_-]{11})\/?$/.exec(url.pathname)?.[1] ?? null;
  else if (["youtube.com", "www.youtube.com", "m.youtube.com"].includes(url.hostname)) {
    if (url.pathname === "/watch" && url.searchParams.getAll("v").length === 1) id = url.searchParams.get("v");
    else id = /^\/(?:shorts|embed)\/([A-Za-z0-9_-]{11})\/?$/.exec(url.pathname)?.[1] ?? null;
  }
  if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) throw new VideoRuleError("INVALID_VIDEO_URL");
  return { youtubeId: id, canonicalUrl: `https://www.youtube.com/watch?v=${id}` };
}
function subtitleTime(value: string) {
  const match = /^(?:(\d{2,}):)?(\d{2}):(\d{2})[.,](\d{3})$/.exec(value);
  if (!match || Number(match[2]) >= 60 || Number(match[3]) >= 60) throw new VideoRuleError("INVALID_SUBTITLE", "Mốc thời gian không hợp lệ.");
  return (Number(match[1] ?? 0) * 3600 + Number(match[2]) * 60 + Number(match[3])) * 1000 + Number(match[4]);
}
function plainSubtitle(value: string) {
  return value.replace(/<[^>]*>/g, "").replace(/\{\\[^}]*\}/g, "").replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (_, entity: string) => ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " })[entity]!)
    .replace(/&#(\d+);/g, (_, digits: string) => { const code = Number(digits); return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : ""; }).replace(/\s+/gu, " ").trim();
}
export function parseTimedSubtitles(text: string, format: "srt" | "vtt", language: string): VideoCue[] {
  if (language !== "en") throw new VideoRuleError("INVALID_SUBTITLE", "Chọn phụ đề lời nguồn tiếng Anh.");
  if (new TextEncoder().encode(text).length > VIDEO_SUBTITLE_MAX_BYTES) throw new VideoRuleError("INVALID_SUBTITLE", "Phụ đề vượt512 KiB.");
  const normalized = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").trim();
  if (!normalized || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(normalized)) throw new VideoRuleError("INVALID_SUBTITLE", "Phụ đề rỗng hoặc chứa ký tự không hợp lệ.");
  if (format === "vtt" && !/^WEBVTT(?:[ \t].*)?\n/.test(`${normalized}\n`)) throw new VideoRuleError("INVALID_SUBTITLE", "VTT cần tiêu đề WEBVTT.");
  const blocks = normalized.split(/\n[ \t]*\n/), cues: VideoCue[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]!; if (format === "vtt" && (i === 0 && block.startsWith("WEBVTT") || /^(NOTE(?:\s|$)|STYLE(?:\s|$)|REGION(?:\s|$))/.test(block))) continue;
    const lines = block.split("\n"); let timing = 0;
    if (!lines[0]?.includes("-->")) timing = 1;
    const match = /^(\S+)\s+-->\s+(\S+)(?:[ \t]+.*)?$/.exec(lines[timing] ?? "");
    if (!match) throw new VideoRuleError("INVALID_SUBTITLE", `Khối${i + 1} thiếu mốc thời gian hợp lệ.`);
    const startMs = subtitleTime(match[1]!), endMs = subtitleTime(match[2]!), cueText = plainSubtitle(lines.slice(timing + 1).join(" "));
    if (startMs >= endMs || endMs > 86400000 || startMs < (cues.at(-1)?.startMs ?? 0) || !cueText || cueText.length > 2000) throw new VideoRuleError("INVALID_SUBTITLE", `Khối${i + 1} có lời hoặc khoảng thời gian không hợp lệ.`);
    cues.push({ id: `cue-${cues.length + 1}`, startMs, endMs, text: cueText });
    if (cues.length > 5000) throw new VideoRuleError("INVALID_SUBTITLE", "Phụ đề vượt5000 cue.");
  }
  const words = cues.map(cue => cue.text).join(" "), letters = words.match(/\p{L}/gu) ?? [], latin = words.match(/\p{Script=Latin}/gu) ?? [];
  if (!cues.length || !/[A-Za-z]{2}/.test(words) || latin.length / Math.max(1, letters.length) < 0.85) throw new VideoRuleError("INVALID_SUBTITLE", "Chưa nhận được lời tiếng Anh hợp lệ. Hãy kiểm tra ngôn ngữ file; ứng dụng không tự nhận dạng giọng nói.");
  return cues;
}
export type StoredVideoWatch = VideoWatchState & { receipts: { actionId: string; fingerprint: string }[] };
export const emptyVideoWatch = (): StoredVideoWatch => ({ revision: 0, positionMs: null, bookmarks: [], receipts: [] });
export function applyVideoWatch(state: StoredVideoWatch, action: VideoWatchAction, at: string): StoredVideoWatch {
  const fingerprint = JSON.stringify(action.kind === "position" ? [action.kind, action.positionMs] : [action.kind, action.versionId, action.startMs, action.endMs, action.label]);
  const existing = state.receipts.find(item => item.actionId === action.actionId);
  if (existing) { if (existing.fingerprint !== fingerprint) throw new VideoRuleError("IDEMPOTENCY_CONFLICT"); return state; }
  return { revision: state.revision + 1, positionMs: action.kind === "position" ? action.positionMs : state.positionMs,
    bookmarks: action.kind === "bookmark" ? [...state.bookmarks, { id: action.actionId, versionId: action.versionId, startMs: action.startMs, endMs: action.endMs, label: action.label, createdAt: at }] : state.bookmarks,
    receipts: [...state.receipts, { actionId: action.actionId, fingerprint }] };
}
export function presentVideoWatch(state: StoredVideoWatch): VideoWatchState { return { revision: state.revision, positionMs: state.positionMs, bookmarks: state.bookmarks }; }
