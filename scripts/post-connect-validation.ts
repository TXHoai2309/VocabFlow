import type { DatabaseIdentity, DatabaseTarget } from "@vocabflow/contracts";
import { canonicalIdentityMatches } from "@vocabflow/contracts";

export function validatePostConnectIdentity(identity: DatabaseIdentity, expected: DatabaseTarget) {
  if (!canonicalIdentityMatches(identity, expected)) throw new Error("DATABASE_IDENTITY_MISMATCH");
  return true;
}
