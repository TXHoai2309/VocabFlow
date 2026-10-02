import type { ReviewQueueItem } from "@vocabflow/contracts";

export type StudySessionWrongItem = {
  item: ReviewQueueItem;
  learnerAnswer?: string;
  correctAnswer?: string;
};

export type StudySessionResult = {
  total: number;
  correct: number;
  incorrect: number;
  newCount: number;
  reviewCount: number;
  wrongItems: StudySessionWrongItem[];
  startedAt: number;
  completedAt: number | null;
};

export function createStudySessionResult(queue: ReviewQueueItem[], startedAt = Date.now()): StudySessionResult {
  return {
    total: queue.length,
    correct: 0,
    incorrect: 0,
    newCount: queue.filter((item) => item.queueType === "NEW").length,
    reviewCount: queue.filter((item) => item.queueType === "DUE").length,
    wrongItems: [],
    startedAt,
    completedAt: null
  };
}

export function formatStudyDuration(startedAt: number, completedAt: number): string {
  const totalSeconds = Math.max(0, Math.floor((completedAt - startedAt) / 1000));
  if (totalSeconds < 60) return `${totalSeconds} giây`;

  const totalMinutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (totalMinutes < 60) return seconds === 0 ? `${totalMinutes} phút` : `${totalMinutes} phút ${seconds} giây`;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours} giờ` : `${hours} giờ ${minutes} phút`;
}
