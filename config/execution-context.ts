import type { DatabasePurpose, Environment, ExecutionContext, TrustedSource } from "@vocabflow/contracts";
import { databasePurposeSchema, environmentSchema, executionContextSchema, trustedSourceSchema } from "@vocabflow/contracts";

export const EXECUTION_CONTEXTS: Record<ExecutionContext, { source: TrustedSource; environment: Environment }> = {
  "local-development": { source: "dev-launcher", environment: "development" },
  "ci-test": { source: "github-actions", environment: "test" },
  "cloudflare-production": { source: "cloudflare-runtime", environment: "production" }
};

export function readExecutionContext(value: string | undefined): ExecutionContext {
  return executionContextSchema.parse(value ?? "local-development");
}

export function readEnvironment(value: string | undefined): Environment {
  return environmentSchema.parse(value);
}

export function readTrustedSource(value: string | undefined): TrustedSource {
  return trustedSourceSchema.parse(value);
}

export function readPurpose(value: string | undefined): DatabasePurpose {
  return databasePurposeSchema.parse(value);
}

export function assertExecutionContext(context: ExecutionContext, source: TrustedSource, environment: Environment) {
  const expected = EXECUTION_CONTEXTS[context];
  if (expected.source !== source || expected.environment !== environment) {
    throw new Error("INVALID_EXECUTION_CONTEXT");
  }
}
