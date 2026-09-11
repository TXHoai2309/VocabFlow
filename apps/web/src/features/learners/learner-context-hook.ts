import { useContext } from "react";
import { ActiveLearnerContext } from "./learner-context";

export function useActiveLearner() {
  const context = useContext(ActiveLearnerContext);
  if (!context) throw new Error("ActiveLearnerProvider is required");
  return context;
}
