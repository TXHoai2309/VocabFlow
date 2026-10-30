/** Typed foundation progress is independent of lexical progress and collection placement. */
export function selectFoundationQueue<T extends { id: string; order: number; status: "NEW" | "LEARNING" | "MASTERED"; nextReviewDate: string | null }>(rows: readonly T[], today: string, capacity: number, mode: "new" | "review" | "mixed"): T[] {
  if (![5, 10, 20, 30].includes(capacity)) throw new Error("INVALID_FOUNDATION_CAPACITY");
  const unique = [...new Map(rows.map(row => [row.id, row])).values()];
  const due = mode === "new" ? [] : unique.filter(row => row.status !== "NEW" && row.nextReviewDate !== null && row.nextReviewDate <= today).sort((a, b) => a.nextReviewDate!.localeCompare(b.nextReviewDate!) || a.order - b.order || a.id.localeCompare(b.id));
  const fresh = mode === "review" ? [] : unique.filter(row => row.status === "NEW").sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  return [...due, ...fresh].slice(0, capacity);
}
