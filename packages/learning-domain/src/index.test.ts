import {
  scheduleReview,
  SchedulerValidationError,
  type SchedulerInput,
  type SchedulerState
} from "./index";

const NEW_STATE: SchedulerState = {
  status: "NEW",
  consecutiveCorrect: 0,
  intervalDays: 0,
  firstLearnedDate: null,
  lastReviewedDate: null,
  nextReviewDate: null,
  totalCorrect: 0,
  totalIncorrect: 0
};

function existingState(overrides: Partial<Exclude<SchedulerState, { status: "NEW" }>> = {}): SchedulerState {
  return {
    status: "LEARNING",
    consecutiveCorrect: 0,
    intervalDays: 1,
    firstLearnedDate: "2026-01-01",
    lastReviewedDate: "2026-01-02",
    nextReviewDate: "2026-01-03",
    totalCorrect: 4,
    totalIncorrect: 2,
    ...overrides
  };
}

describe("scheduleReview", () => {
  it.each([
    ["REMEMBERED", {
      status: "LEARNING",
      consecutiveCorrect: 1,
      intervalDays: 1,
      firstLearnedDate: "2026-01-10",
      lastReviewedDate: "2026-01-10",
      nextReviewDate: "2026-01-11",
      totalCorrect: 1,
      totalIncorrect: 0
    }],
    ["FORGOTTEN", {
      status: "LEARNING",
      consecutiveCorrect: 0,
      intervalDays: 1,
      firstLearnedDate: "2026-01-10",
      lastReviewedDate: "2026-01-10",
      nextReviewDate: "2026-01-11",
      totalCorrect: 0,
      totalIncorrect: 1
    }]
  ] as const)("transitions canonical NEW with %s", (result, expected) => {
    expect(scheduleReview({ currentState: NEW_STATE, result: result as "REMEMBERED" | "FORGOTTEN", today: "2026-01-10" })).toEqual(expected);
  });

  it.each([
    [0, 1, 1, "LEARNING", "2026-02-11", 5],
    [1, 2, 3, "LEARNING", "2026-02-13", 5],
    [2, 3, 7, "LEARNING", "2026-02-17", 5],
    [3, 4, 14, "MASTERED", "2026-02-24", 5]
  ] as const)("applies LEARNING REMEMBERED threshold %s -> %s", (current, next, intervalDays, status, nextReviewDate, totalCorrect) => {
    expect(scheduleReview({
      currentState: existingState({ consecutiveCorrect: current, intervalDays: current === 0 ? 1 : current === 1 ? 1 : current === 2 ? 3 : 7 }),
      result: "REMEMBERED",
      today: "2026-02-10"
    })).toEqual({
      status,
      consecutiveCorrect: next,
      intervalDays,
      firstLearnedDate: "2026-01-01",
      lastReviewedDate: "2026-02-10",
      nextReviewDate,
      totalCorrect,
      totalIncorrect: 2
    });
  });

  it("applies the 30-day interval for representative MASTERED remembered states", () => {
    expect(scheduleReview({
      currentState: existingState({ status: "MASTERED", consecutiveCorrect: 4, intervalDays: 14 }),
      result: "REMEMBERED",
      today: "2026-03-01"
    })).toEqual({
      status: "MASTERED",
      consecutiveCorrect: 5,
      intervalDays: 30,
      firstLearnedDate: "2026-01-01",
      lastReviewedDate: "2026-03-01",
      nextReviewDate: "2026-03-31",
      totalCorrect: 5,
      totalIncorrect: 2
    });
    expect(scheduleReview({
      currentState: existingState({ status: "MASTERED", consecutiveCorrect: 5, intervalDays: 30 }),
      result: "REMEMBERED",
      today: "2026-03-01"
    })).toEqual({
      status: "MASTERED",
      consecutiveCorrect: 6,
      intervalDays: 30,
      firstLearnedDate: "2026-01-01",
      lastReviewedDate: "2026-03-01",
      nextReviewDate: "2026-03-31",
      totalCorrect: 5,
      totalIncorrect: 2
    });
  });

  it.each([
    ["LEARNING", "2026-02-14"],
    ["MASTERED", "2026-02-14"]
  ] as const)("resets %s FORGOTTEN without changing the first learned date", (status, today) => {
    const state = existingState({ status, consecutiveCorrect: status === "MASTERED" ? 4 : 3, intervalDays: status === "MASTERED" ? 14 : 7 });
    expect(scheduleReview({ currentState: state, result: "FORGOTTEN", today })).toEqual({
      status: "LEARNING",
      consecutiveCorrect: 0,
      intervalDays: 1,
      firstLearnedDate: "2026-01-01",
      lastReviewedDate: today,
      nextReviewDate: "2026-02-15",
      totalCorrect: 4,
      totalIncorrect: 3
    });
  });

  it.each([
    ["2026-09-12", 1, "2026-09-13"],
    ["2026-01-31", 1, "2026-02-01"],
    ["2026-12-31", 1, "2027-01-01"],
    ["2028-02-28", 1, "2028-02-29"],
    ["2028-02-29", 1, "2028-03-01"],
    ["2026-02-28", 1, "2026-03-01"],
    ["2000-02-28", 1, "2000-02-29"],
    ["2000-02-29", 1, "2000-03-01"]
  ] as const)("adds calendar days from %s", (today, intervalDays, nextReviewDate) => {
    expect(scheduleReview({ currentState: NEW_STATE, result: "REMEMBERED", today })).toMatchObject({ intervalDays, nextReviewDate });
  });

  it.each([
    ["2026-01-31", existingState({ consecutiveCorrect: 0, intervalDays: 1 }), 1, "2026-02-01"],
    ["2026-01-30", existingState({ consecutiveCorrect: 1, intervalDays: 1 }), 3, "2026-02-02"],
    ["2026-01-25", existingState({ consecutiveCorrect: 2, intervalDays: 3 }), 7, "2026-02-01"],
    ["2026-12-20", existingState({ consecutiveCorrect: 3, intervalDays: 7 }), 14, "2027-01-03"],
    ["2026-12-20", existingState({ status: "MASTERED", consecutiveCorrect: 4, intervalDays: 14 }), 30, "2027-01-19"]
  ] as const)("adds the resulting %s-day scheduler interval across calendar boundaries", (today, currentState, intervalDays, nextReviewDate) => {
    expect(scheduleReview({ currentState, result: "REMEMBERED", today })).toMatchObject({ intervalDays, nextReviewDate });
  });

  it("does not add an overdue bonus", () => {
    expect(scheduleReview({
      currentState: existingState({ consecutiveCorrect: 2, intervalDays: 3, nextReviewDate: "2026-01-01" }),
      result: "REMEMBERED",
      today: "2026-02-20"
    })).toMatchObject({ intervalDays: 7, nextReviewDate: "2026-02-27" });
  });

  it("is deterministic, synchronous and non-mutating", () => {
    const currentState = Object.freeze(existingState({ consecutiveCorrect: 3, intervalDays: 7 }));
    const input = Object.freeze({ currentState, result: "REMEMBERED" as const, today: "2026-02-20" });
    const before = structuredClone(input);
    const first = scheduleReview(input);
    const second = scheduleReview(input);
    expect(second).toEqual(first);
    expect(input).toEqual(before);
    expect(first).not.toHaveProperty("revision");
    expect(first).not.toHaveProperty("reviewedAt");
  });

  it.each([
    ["today", "2026-02-30"],
    ["today", "2026-13-01"],
    ["today", "2026-1-01"],
    ["today", "26-01-01"],
    ["today", "prefix-2026-01-01"],
    ["today", "2100-02-29"],
    ["currentState.firstLearnedDate", "2026-02-30"]
  ] as const)("rejects invalid date in %s", (field, value) => {
    const input: SchedulerInput = field === "today"
      ? { currentState: NEW_STATE, result: "REMEMBERED", today: value }
      : { currentState: existingState({ firstLearnedDate: value }), result: "REMEMBERED", today: "2026-01-01" };
    expect(() => scheduleReview(input)).toThrow(SchedulerValidationError);
    expect(() => scheduleReview(input)).toThrow(/valid Gregorian|YYYY-MM-DD/);
  });

  it.each([
    ["negative counter", existingState({ totalCorrect: -1 })],
    ["negative interval", existingState({ intervalDays: -1 })],
    ["LEARNING count above range", existingState({ consecutiveCorrect: 4, intervalDays: 14 })],
    ["MASTERED count below range", existingState({ status: "MASTERED", consecutiveCorrect: 3, intervalDays: 14 })],
    ["MASTERED interval below range", existingState({ status: "MASTERED", consecutiveCorrect: 4, intervalDays: 7 })],
    ["missing existing date", existingState({ nextReviewDate: null as unknown as string })],
    ["non-canonical NEW", { ...NEW_STATE, totalCorrect: 1 }]
  ] as const)("rejects %s", (_name, currentState) => {
    expect(() => scheduleReview({ currentState: currentState as SchedulerState, result: "REMEMBERED", today: "2026-01-01" })).toThrow(SchedulerValidationError);
  });

  it.each([
    ["fractional consecutiveCorrect", existingState({ consecutiveCorrect: 1.5 })],
    ["fractional intervalDays", existingState({ intervalDays: 1.5 })],
    ["fractional totalCorrect", existingState({ totalCorrect: 1.5 })],
    ["fractional totalIncorrect", existingState({ totalIncorrect: 1.5 })],
    ["NaN counter", existingState({ totalCorrect: Number.NaN })],
    ["Infinity counter", existingState({ totalCorrect: Number.POSITIVE_INFINITY })],
    ["-Infinity counter", existingState({ totalIncorrect: Number.NEGATIVE_INFINITY })],
    ["counter above MAX_SAFE_INTEGER", existingState({ totalCorrect: Number.MAX_SAFE_INTEGER + 1 })]
  ] as const)("rejects %s", (_name, currentState) => {
    expect(() => scheduleReview({ currentState: currentState as SchedulerState, result: "REMEMBERED", today: "2026-01-01" })).toThrow(SchedulerValidationError);
  });

  it.each([
    ["REMEMBERED", existingState({ totalCorrect: Number.MAX_SAFE_INTEGER })],
    ["FORGOTTEN", existingState({ totalIncorrect: Number.MAX_SAFE_INTEGER })]
  ] as const)("rejects unsafe resulting counter for %s", (result, currentState) => {
    expect(() => scheduleReview({ currentState, result, today: "2026-01-01" })).toThrow(/safe integer range/);
  });

  it("rejects consecutiveCorrect overflow at the safe-integer boundary", () => {
    const currentState = existingState({
      status: "MASTERED",
      consecutiveCorrect: Number.MAX_SAFE_INTEGER,
      intervalDays: 30
    });
    expect(() => scheduleReview({ currentState, result: "REMEMBERED", today: "2026-01-01" })).toThrow(/safe integer range/);
  });

  it("increments a large valid MASTERED state safely", () => {
    const result = scheduleReview({
      currentState: existingState({
        status: "MASTERED",
        consecutiveCorrect: Number.MAX_SAFE_INTEGER - 1,
        intervalDays: 30
      }),
      result: "REMEMBERED",
      today: "2026-03-01"
    });
    expect(result).toEqual({
      status: "MASTERED",
      consecutiveCorrect: Number.MAX_SAFE_INTEGER,
      intervalDays: 30,
      firstLearnedDate: "2026-01-01",
      lastReviewedDate: "2026-03-01",
      nextReviewDate: "2026-03-31",
      totalCorrect: 5,
      totalIncorrect: 2
    });
    expect(Number.isSafeInteger(result.consecutiveCorrect)).toBe(true);
  });

  it("rejects unsupported result, status, null state and storage fields", () => {
    expect(() => scheduleReview({ currentState: NEW_STATE, result: "EASY", today: "2026-01-01" } as unknown as SchedulerInput)).toThrow(/unsupported/);
    expect(() => scheduleReview({ currentState: { ...NEW_STATE, status: "BROKEN" }, result: "REMEMBERED", today: "2026-01-01" } as unknown as SchedulerInput)).toThrow(/unsupported/);
    expect(() => scheduleReview({ currentState: null, result: "REMEMBERED", today: "2026-01-01" } as unknown as SchedulerInput)).toThrow(SchedulerValidationError);
    expect(() => scheduleReview({ currentState: { ...NEW_STATE, revision: 0 }, result: "REMEMBERED", today: "2026-01-01" } as unknown as SchedulerInput)).toThrow(/Unexpected field/);
  });
});
