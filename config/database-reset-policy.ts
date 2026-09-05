export const DATABASE_RESET_POLICY = {
  applicationSchemas: ["public"],
  applicationTables: [
    "public.account",
    "public.session",
    "public.verification",
    "public.user"
  ],
  protectedSchemas: ["vocabflow_meta"],
  protectedTables: [
    "vocabflow_meta.bootstrap_metadata",
    "vocabflow_meta.environment_identity"
  ],
  migrationTrackingObjects: ["drizzle.__drizzle_migrations"]
} as const;
