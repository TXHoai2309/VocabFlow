export type FoundationStatus = "ready";

export function foundationStatus(): FoundationStatus {
  return "ready";
}

export type LocalDate = string;
export type LearningStatus = "NEW" | "LEARNING" | "MASTERED";
export type ReviewResult = "REMEMBERED" | "FORGOTTEN";

export type VirtualNewState = {
  status: "NEW";
  consecutiveCorrect: 0;
  intervalDays: 0;
  firstLearnedDate: null;
  lastReviewedDate: null;
  nextReviewDate: null;
  totalCorrect: 0;
  totalIncorrect: 0;
};

export type ExistingLearningState = {
  status: "LEARNING" | "MASTERED";
  consecutiveCorrect: number;
  intervalDays: number;
  firstLearnedDate: LocalDate;
  lastReviewedDate: LocalDate;
  nextReviewDate: LocalDate;
  totalCorrect: number;
  totalIncorrect: number;
};

export type SchedulerState = VirtualNewState | ExistingLearningState;

export type SchedulerInput = {
  currentState: SchedulerState;
  result: ReviewResult;
  today: LocalDate;
};

export type SchedulerOutput = {
  status: "LEARNING" | "MASTERED";
  consecutiveCorrect: number;
  intervalDays: 1 | 3 | 7 | 14 | 30;
  firstLearnedDate: LocalDate;
  lastReviewedDate: LocalDate;
  nextReviewDate: LocalDate;
  totalCorrect: number;
  totalIncorrect: number;
};

export type SchedulerErrorCode =
  | "INVALID_INPUT"
  | "INVALID_DATE"
  | "INVALID_STATUS"
  | "INVALID_RESULT"
  | "INVALID_COUNTER"
  | "INVALID_INTERVAL"
  | "INVALID_STATE";

export class SchedulerValidationError extends Error {
  readonly code: SchedulerErrorCode;
  readonly field: string;

  constructor(code: SchedulerErrorCode, field: string, message: string) {
    super(message);
    this.name = "SchedulerValidationError";
    this.code = code;
    this.field = field;
  }
}

const INPUT_FIELDS = ["currentState", "result", "today"] as const;
const STATE_FIELDS = [
  "status",
  "consecutiveCorrect",
  "intervalDays",
  "firstLearnedDate",
  "lastReviewedDate",
  "nextReviewDate",
  "totalCorrect",
  "totalIncorrect"
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function rejectUnexpectedFields(value: Record<string, unknown>, fields: readonly string[], field: string): void {
  const allowed = new Set(fields);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      throw new SchedulerValidationError("INVALID_INPUT", `${field}.${key}`, `Unexpected field: ${field}.${key}`);
    }
  }
}

function fail(code: SchedulerErrorCode, field: string, message: string): never {
  throw new SchedulerValidationError(code, field, message);
}

function validateDate(value: unknown, field: string, nullable = false): void {
  if (nullable && value === null) return;
  if (typeof value !== "string") {
    fail("INVALID_DATE", field, `${field} must be a YYYY-MM-DD date`);
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    fail("INVALID_DATE", field, `${field} must be a YYYY-MM-DD date`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    fail("INVALID_DATE", field, `${field} is not a valid Gregorian calendar date`);
  }
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function addCalendarDays(date: LocalDate, days: number): LocalDate {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) {
    fail("INVALID_DATE", "today", "today must be a YYYY-MM-DD date");
  }

  let year = Number(match[1]);
  let month = Number(match[2]);
  let day = Number(match[3]);
  for (let remaining = days; remaining > 0; remaining -= 1) {
    day += 1;
    if (day > daysInMonth(year, month)) {
      day = 1;
      month += 1;
      if (month > 12) {
        month = 1;
        year += 1;
        if (year > 9999) {
          fail("INVALID_DATE", "today", "calendar date range exceeded");
        }
      }
    }
  }
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function validateNonNegativeInteger(value: unknown, field: string): asserts value is number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    fail("INVALID_COUNTER", field, `${field} must be a non-negative safe integer`);
  }
}

function incrementSafeInteger(value: number, field: string): number {
  const incremented = value + 1;
  if (!Number.isSafeInteger(incremented)) {
    fail("INVALID_COUNTER", field, `${field} increment exceeds the safe integer range`);
  }
  return incremented;
}

function validateState(value: unknown): asserts value is SchedulerState {
  if (!isRecord(value)) {
    fail("INVALID_STATE", "currentState", "currentState must be an object");
  }
  rejectUnexpectedFields(value, STATE_FIELDS, "currentState");

  if (value.status !== "NEW" && value.status !== "LEARNING" && value.status !== "MASTERED") {
    fail("INVALID_STATUS", "currentState.status", "currentState.status is unsupported");
  }

  validateNonNegativeInteger(value.consecutiveCorrect, "currentState.consecutiveCorrect");
  validateNonNegativeInteger(value.intervalDays, "currentState.intervalDays");
  validateNonNegativeInteger(value.totalCorrect, "currentState.totalCorrect");
  validateNonNegativeInteger(value.totalIncorrect, "currentState.totalIncorrect");

  if (value.status === "NEW") {
    if (value.consecutiveCorrect !== 0
      || value.intervalDays !== 0
      || value.firstLearnedDate !== null
      || value.lastReviewedDate !== null
      || value.nextReviewDate !== null
      || value.totalCorrect !== 0
      || value.totalIncorrect !== 0) {
      fail("INVALID_STATE", "currentState", "NEW must use the canonical virtual state");
    }
    return;
  }

  if (value.firstLearnedDate === null || value.lastReviewedDate === null || value.nextReviewDate === null) {
    fail("INVALID_STATE", "currentState", "existing state dates must be non-null");
  }
  validateDate(value.firstLearnedDate, "currentState.firstLearnedDate");
  validateDate(value.lastReviewedDate, "currentState.lastReviewedDate");
  validateDate(value.nextReviewDate, "currentState.nextReviewDate");

  if (value.status === "LEARNING") {
    if (value.consecutiveCorrect > 3 || value.intervalDays < 1) {
      fail("INVALID_STATE", "currentState", "LEARNING state invariants are invalid");
    }
  } else if (value.consecutiveCorrect < 4 || value.intervalDays < 14) {
    fail("INVALID_STATE", "currentState", "MASTERED state invariants are invalid");
  }
}

function validateInput(value: unknown): asserts value is SchedulerInput {
  if (!isRecord(value)) {
    fail("INVALID_INPUT", "input", "scheduler input must be an object");
  }
  rejectUnexpectedFields(value, INPUT_FIELDS, "input");
  validateState(value.currentState);
  if (value.result !== "REMEMBERED" && value.result !== "FORGOTTEN") {
    fail("INVALID_RESULT", "result", "result is unsupported");
  }
  validateDate(value.today, "today");
}

function rememberedInterval(consecutiveCorrect: number): { intervalDays: 1 | 3 | 7 | 14 | 30; status: "LEARNING" | "MASTERED" } {
  if (consecutiveCorrect === 1) return { intervalDays: 1, status: "LEARNING" };
  if (consecutiveCorrect === 2) return { intervalDays: 3, status: "LEARNING" };
  if (consecutiveCorrect === 3) return { intervalDays: 7, status: "LEARNING" };
  if (consecutiveCorrect === 4) return { intervalDays: 14, status: "MASTERED" };
  return { intervalDays: 30, status: "MASTERED" };
}

export function scheduleReview(input: SchedulerInput): SchedulerOutput {
  validateInput(input);
  const { currentState, result, today } = input;

  if (result === "FORGOTTEN") {
    const totalIncorrect = currentState.status === "NEW"
      ? 1
      : incrementSafeInteger(currentState.totalIncorrect, "currentState.totalIncorrect");
    return {
      status: "LEARNING",
      consecutiveCorrect: 0,
      intervalDays: 1,
      firstLearnedDate: currentState.status === "NEW" ? today : currentState.firstLearnedDate,
      lastReviewedDate: today,
      nextReviewDate: addCalendarDays(today, 1),
      totalCorrect: currentState.status === "NEW" ? 0 : currentState.totalCorrect,
      totalIncorrect
    };
  }

  const consecutiveCorrect = currentState.status === "NEW"
    ? 1
    : incrementSafeInteger(currentState.consecutiveCorrect, "currentState.consecutiveCorrect");
  const totalCorrect = currentState.status === "NEW"
    ? 1
    : incrementSafeInteger(currentState.totalCorrect, "currentState.totalCorrect");
  const { intervalDays, status } = rememberedInterval(consecutiveCorrect);
  return {
    status,
    consecutiveCorrect,
    intervalDays,
    firstLearnedDate: currentState.status === "NEW" ? today : currentState.firstLearnedDate,
    lastReviewedDate: today,
    nextReviewDate: addCalendarDays(today, intervalDays),
    totalCorrect,
    totalIncorrect: currentState.status === "NEW" ? 0 : currentState.totalIncorrect
  };
}
export * from "./foundation-queue.js";
