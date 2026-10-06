import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { learnerDtoSchema, type LearnerDto } from "@vocabflow/contracts";
import { ActiveLearnerContext, ACTIVE_LEARNER_STORAGE_KEY } from "./learner-context";
import { LearnerClientError, requestLearners } from "./learner-client";

type StoredLearnerSelection = { userId: string; learner: LearnerDto };

function removeStoredSelection() {
  try {
    window.localStorage.removeItem(ACTIVE_LEARNER_STORAGE_KEY);
  } catch {
    // Persistence is optional; keep the in-memory learner context usable.
  }
}

function readStoredSelection(userId: string | null | undefined): LearnerDto | null {
  if (!userId || typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ACTIVE_LEARNER_STORAGE_KEY);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || !("userId" in value) || !("learner" in value)) {
      removeStoredSelection();
      return null;
    }
    const record = value as { userId?: unknown; learner?: unknown };
    if (record.userId !== userId) {
      removeStoredSelection();
      return null;
    }
    const parsed = learnerDtoSchema.safeParse(record.learner);
    if (!parsed.success || !parsed.data.enabled) {
      removeStoredSelection();
      return null;
    }
    return parsed.data;
  } catch {
    removeStoredSelection();
    return null;
  }
}

function persistSelection(userId: string, learner: LearnerDto) {
  try {
    window.localStorage.setItem(ACTIVE_LEARNER_STORAGE_KEY, JSON.stringify({ userId, learner } satisfies StoredLearnerSelection));
  } catch {
    // Persistence is optional; keep the in-memory learner context usable.
  }
}

export function ActiveLearnerProvider({
  children,
  initialLearner = null,
  userId,
  validateStoredSelection = false
}: {
  children: ReactNode;
  initialLearner?: LearnerDto | null;
  userId?: string | null;
  validateStoredSelection?: boolean;
}) {
  const [activeLearner, setActiveLearnerState] = useState<LearnerDto | null>(() => initialLearner ?? readStoredSelection(userId));
  const activeLearnerRef = useRef(activeLearner);
  const validatedSelectionRef = useRef<string | null>(initialLearner && userId ? `${userId}:${initialLearner.id}` : null);
  const validatingSelectionRef = useRef<string | null>(null);
  const setActiveLearner = useCallback((learner: LearnerDto) => {
    setActiveLearnerState(learner);
    activeLearnerRef.current = learner;
    if (userId) {
      persistSelection(userId, learner);
      validatedSelectionRef.current = `${userId}:${learner.id}`;
    }
  }, [userId]);
  const clearActiveLearner = useCallback(() => {
    const currentLearner = activeLearnerRef.current;
    setActiveLearnerState(null);
    activeLearnerRef.current = null;
    validatedSelectionRef.current = null;
    if (!userId) return;
    try {
      const raw = window.localStorage.getItem(ACTIVE_LEARNER_STORAGE_KEY);
      if (!raw) return;
      const value: unknown = JSON.parse(raw);
      if (value && typeof value === "object" && "userId" in value && value.userId === userId) {
        removeStoredSelection();
      } else if (!currentLearner) {
        removeStoredSelection();
      }
    } catch {
      removeStoredSelection();
    }
  }, [userId]);

  useEffect(() => {
    if (!userId || !validateStoredSelection || !activeLearner) return;
    const selectionKey = `${userId}:${activeLearner.id}`;
    if (validatedSelectionRef.current === selectionKey || validatingSelectionRef.current === selectionKey) return;
    validatingSelectionRef.current = selectionKey;
    void requestLearners().then((learners) => {
      if (activeLearnerRef.current?.id !== activeLearner.id) return;
      const canonicalLearner = learners.find((learner) => learner.id === activeLearner.id && learner.enabled);
      if (!canonicalLearner) clearActiveLearner();
      else setActiveLearner(canonicalLearner);
    }).catch((error: unknown) => {
      if (activeLearnerRef.current?.id !== activeLearner.id) return;
      if (error instanceof LearnerClientError && (error.status === 403 || error.status === 404)) clearActiveLearner();
    }).finally(() => {
      if (validatingSelectionRef.current === selectionKey) validatingSelectionRef.current = null;
    });
  }, [activeLearner, clearActiveLearner, setActiveLearner, userId, validateStoredSelection]);

  const value = useMemo(() => ({
    activeLearner,
    setActiveLearner,
    clearActiveLearner
  }), [activeLearner, clearActiveLearner, setActiveLearner]);

  return (
    <ActiveLearnerContext.Provider value={value}>
      {children}
    </ActiveLearnerContext.Provider>
  );
}
