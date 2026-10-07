import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { learnerDtoSchema, type LearnerDto } from "@vocabflow/contracts";
import { ActiveLearnerContext, ACTIVE_LEARNER_STORAGE_KEY } from "./learner-context";
import { resolveAccountLearning } from "./account-learning-client";

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

type IdentityState = {
  userId: string | null | undefined;
  activeLearner: LearnerDto | null;
  status: "resolving" | "ready" | "error";
  error: string | null;
};

export function ActiveLearnerProvider({ children, initialLearner = null, userId, userName }: {
  children: ReactNode;
  initialLearner?: LearnerDto | null;
  userId?: string | null;
  userName?: string;
}) {
  const [identity, setIdentity] = useState<IdentityState>({ userId, activeLearner: initialLearner, status: initialLearner ? "ready" : "resolving", error: null });
  const generation = useRef(0);
  const pending = useRef<{ userId: string; promise: Promise<LearnerDto> } | null>(null);
  const setActiveLearner = useCallback((learner: LearnerDto) => {
    generation.current += 1;
    if (userId) persistSelection(userId, learner);
    setIdentity({ userId, activeLearner: learner, status: "ready", error: null });
  }, [userId]);
  const clearActiveLearner = useCallback(() => {
    generation.current += 1;
    removeStoredSelection();
    setIdentity({ userId, activeLearner: null, status: "resolving", error: null });
  }, [userId]);
  const resolve = useCallback(async () => {
    if (!userId) return;
    if (pending.current?.userId === userId) return;
    const currentGeneration = ++generation.current;
    setIdentity({ userId, activeLearner: null, status: "resolving", error: null });
    const operation = { userId, promise: resolveAccountLearning(userName, readStoredSelection(userId)?.id, () => currentGeneration === generation.current) };
    pending.current = operation;
    try {
      const canonical = await operation.promise;
      if (currentGeneration !== generation.current) return;
      persistSelection(userId, canonical);
      setIdentity({ userId, activeLearner: canonical, status: "ready", error: null });
    } catch {
      if (currentGeneration !== generation.current) return;
      setIdentity({ userId, activeLearner: null, status: "error", error: "Không thể tải dữ liệu học tập lúc này. Vui lòng thử lại." });
    } finally {
      if (pending.current === operation) pending.current = null;
    }
  }, [userId, userName]);
  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => { if (userId && !cancelled) void resolve(); });
    return () => { cancelled = true; };
  }, [resolve, userId]);
  useEffect(() => () => { generation.current += 1; }, [userId]);
  const retry = useCallback(() => { void resolve(); }, [resolve]);
  const current = identity.userId === userId ? identity : { activeLearner: null, status: "resolving" as const, error: null };
  const value = useMemo(() => ({ activeLearner: current.activeLearner, status: current.status, error: current.error, retry, setActiveLearner, clearActiveLearner }), [current.activeLearner, current.status, current.error, retry, setActiveLearner, clearActiveLearner]);
  return <ActiveLearnerContext.Provider value={value}>{children}</ActiveLearnerContext.Provider>;
}
