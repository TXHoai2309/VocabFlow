import { useCallback, useMemo, useState, type ReactNode } from "react";
import type { LearnerDto } from "@vocabflow/contracts";
import { ActiveLearnerContext } from "./learner-context";

export function ActiveLearnerProvider({
  children,
  initialLearner = null
}: {
  children: ReactNode;
  initialLearner?: LearnerDto | null;
}) {
  const [activeLearner, setActiveLearner] = useState<LearnerDto | null>(initialLearner);
  const clearActiveLearner = useCallback(() => setActiveLearner(null), []);
  const value = useMemo(() => ({
    activeLearner,
    setActiveLearner,
    clearActiveLearner
  }), [activeLearner, clearActiveLearner]);

  return (
    <ActiveLearnerContext.Provider value={value}>
      {children}
    </ActiveLearnerContext.Provider>
  );
}
