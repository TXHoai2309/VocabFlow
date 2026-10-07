import type { LearnerDto } from "@vocabflow/contracts";
import { requestBootstrap } from "../auth/bootstrap-client";
import { createLearner, LearnerClientError, requestLearners } from "./learner-client";

export function selectCanonicalLearner(rows: LearnerDto[], storedId?: string): LearnerDto | null {
  const enabled = rows.filter((row) => row.enabled);
  return enabled.find((row) => row.id === storedId)
    ?? enabled.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))[0]
    ?? null;
}

export async function resolveAccountLearning(userName: string | undefined, storedId?: string, isCurrent = () => true): Promise<LearnerDto> {
  const checkCurrent = () => { if (!isCurrent()) throw new Error("IDENTITY_RESOLUTION_CANCELLED"); };
  let rows: LearnerDto[];
  try {
    rows = await requestLearners();
  } catch (error) {
    if (!(error instanceof LearnerClientError) || error.code !== "HOUSEHOLD_ACCESS_DENIED") throw error;
    checkCurrent();
    await requestBootstrap();
    checkCurrent();
    rows = await requestLearners();
  }
  checkCurrent();
  const existing = selectCanonicalLearner(rows, storedId);
  if (existing) return existing;
  const name = userName?.trim();
  try {
    return await createLearner({ displayName: name && name.length <= 80 ? name : "Người học" });
  } catch (error) {
    if (!(error instanceof LearnerClientError) || !error.uncertain) throw error;
    checkCurrent();
    // A dispatched POST may have committed. Never replay it automatically.
    const refreshed = await requestLearners();
    checkCurrent();
    const reconciled = selectCanonicalLearner(refreshed, storedId);
    if (reconciled) return reconciled;
    throw error;
  }
}
