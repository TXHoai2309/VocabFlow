import { describe, expect, it } from "vitest";
import { currentCueIndex } from "./current-cue";

const cues = [
  { startMs: 57039, endMs: 59280 },
  { startMs: 58295, endMs: 62719 },
  { startMs: 59280, endMs: 65199 },
  { startMs: 62719, endMs: 66880 },
  { startMs: 65199, endMs: 69360 },
  { startMs: 66880, endMs: 72720 },
];
describe("current cue in a source-ordered overlapping transcript", () => {
  it.each([
    [57038, -1], [57039, 0], [58294, 0], [58295, 1], [59280, 2],
    [62718, 2], [62719, 3], [63000, 3], [65199, 4], [66880, 5], [72720, -1],
  ])("at %i ms selects index %i without an offset", (time, expected) => {
    expect(currentCueIndex(cues, time)).toBe(expected);
  });
  it("uses the supplied clock after backward seeks and never mutates source timings", () => {
    const original = structuredClone(cues);
    expect([70000, 63000, 58000, 63000].map(time => currentCueIndex(cues, time))).toEqual([5, 3, 0, 3]);
    expect(cues).toEqual(original);
  });
  it("keeps source order for equal starts, but ignores an already ended tied cue", () => {
    const tied = [{ startMs: 1000, endMs: 1500 }, { startMs: 1000, endMs: 3000 }];
    expect(currentCueIndex(tied, 1200)).toBe(0);
    expect(currentCueIndex(tied, 1500)).toBe(1);
  });
  it("does not hold an expired cue across a gap or choose a future cue", () => {
    const separated = [{ startMs: 1000, endMs: 2000 }, { startMs: 4000, endMs: 5000 }];
    expect(currentCueIndex(separated, 3000)).toBe(-1);
    expect(currentCueIndex([], 1000)).toBe(-1);
    expect(currentCueIndex(separated, Number.NaN)).toBe(-1);
    expect(currentCueIndex(separated, Number.POSITIVE_INFINITY)).toBe(-1);
  });
});
