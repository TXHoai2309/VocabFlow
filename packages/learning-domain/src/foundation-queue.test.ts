import { describe, expect, it } from "vitest";
import { selectFoundationQueue } from "./foundation-queue";

describe("foundation queue", () => {
  const rows = [
    { id: "fresh", order: 0, status: "NEW" as const, nextReviewDate: null },
    { id: "future", order: 1, status: "LEARNING" as const, nextReviewDate: "2026-11-02" },
    { id: "due", order: 2, status: "LEARNING" as const, nextReviewDate: "2026-10-30" },
    { id: "overdue", order: 3, status: "MASTERED" as const, nextReviewDate: "2026-10-29" }
  ];
  it("keeps due before new, date order, and shared placements deduplicated", () => {
    expect(selectFoundationQueue([...rows, rows[2]], "2026-10-30", 5, "mixed").map(r => r.id)).toEqual(["overdue", "due", "fresh"]);
  });
  it("does not turn review-only or empty scopes into fresh/all", () => {
    expect(selectFoundationQueue(rows, "2026-10-30", 5, "review").map(r => r.id)).toEqual(["overdue", "due"]);
    expect(selectFoundationQueue(rows, "2026-10-30", 5, "new").map(r => r.id)).toEqual(["fresh"]);
    expect(selectFoundationQueue([], "2026-10-30", 30, "mixed")).toEqual([]);
  });
  it("honors capacity and rejects invented daily/session limits", () => {
    const input = Array.from({ length: 20 }, (_, i) => ({ ...rows[0], id: `target-${i}`, order: i }));
    expect(selectFoundationQueue(input, "2026-10-30", 5, "mixed")).toHaveLength(5);
    expect(() => selectFoundationQueue(input, "2026-10-30", 7, "mixed")).toThrow("INVALID_FOUNDATION_CAPACITY");
  });
});
