import { createContext } from "react";
import type { LearnerDto } from "@vocabflow/contracts";

export type ActiveLearnerContextValue = {
  userId?: string;
  activeLearner: LearnerDto | null;
  setActiveLearner: (learner: LearnerDto) => void;
  clearActiveLearner: () => void;
  status: "resolving" | "ready" | "error";
  error: string | null;
  retry: () => void;
};

export const ACTIVE_LEARNER_STORAGE_KEY = "vocabflow.activeLearner.v1";

export const ActiveLearnerContext = createContext<ActiveLearnerContextValue | null>(null);
