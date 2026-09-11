import { createContext } from "react";
import type { LearnerDto } from "@vocabflow/contracts";

export type ActiveLearnerContextValue = {
  activeLearner: LearnerDto | null;
  setActiveLearner: (learner: LearnerDto) => void;
  clearActiveLearner: () => void;
};

export const ActiveLearnerContext = createContext<ActiveLearnerContextValue | null>(null);
