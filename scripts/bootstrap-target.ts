import type { Environment } from "@vocabflow/contracts";
import { getConnectionTarget } from "../config/database-targets";

export function bootstrapTargetForEnvironment(environment: Environment) {
  if (environment === "production") throw new Error("USE_PRODUCTION_BOOTSTRAP_COMMAND");
  return getConnectionTarget(environment === "test" ? "test" : "development", "bootstrap");
}
