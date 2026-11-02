import type { VideoCue } from "@vocabflow/contracts";

/** Source cues are ordered by start, but their display intervals may overlap. */
export function currentCueIndex(cues: readonly Pick<VideoCue, "startMs" | "endMs">[], timeMs: number): number {
  if (!Number.isFinite(timeMs)) return -1;
  let active = -1;
  for (let index = 0; index < cues.length; index++) {
    const cue = cues[index]!;
    if (cue.startMs > timeMs) break;
    if (timeMs < cue.endMs && (active < 0 || cue.startMs > cues[active]!.startMs)) active = index;
  }
  return active;
}
