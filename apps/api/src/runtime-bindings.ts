export type RuntimeBindings = {
  DATABASE_URL?: string;
  DATABASE_DRIVER?: "neon-http" | "postgres-js" | string;
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  VOCABFLOW_ENV?: string;
  DATABASE_ENV?: string;
  EXECUTION_CONTEXT?: string;
  VERCEL_ENV?: string;
  VERCEL_URL?: string;
  VOCAB_DATASET_VERSION?: string;
  VOCABFLOW_V2_PUBLIC_MEDIA_ATTESTATION_ID?: string;
};

const bindingNames = [
  "DATABASE_URL",
  "DATABASE_DRIVER",
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL",
  "VOCABFLOW_ENV",
  "DATABASE_ENV",
  "EXECUTION_CONTEXT",
  "VERCEL_ENV",
  "VERCEL_URL",
  "VOCAB_DATASET_VERSION",
  "VOCABFLOW_V2_PUBLIC_MEDIA_ATTESTATION_ID",
] as const satisfies readonly (keyof RuntimeBindings)[];

export function runtimeBindingsFromEnvironment(environment: NodeJS.ProcessEnv): RuntimeBindings {
  return Object.fromEntries(bindingNames.flatMap((name) => {
    const value = environment[name];
    return value === undefined ? [] : [[name, value]];
  })) as RuntimeBindings;
}
