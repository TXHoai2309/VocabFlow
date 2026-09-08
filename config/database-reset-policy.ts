import { APP_SCHEMA, MIGRATION_SCHEMA } from "@vocabflow/contracts";

export const DATABASE_RESET_POLICY = {
  applicationSchemas: [APP_SCHEMA],
  applicationTables: [
    `${APP_SCHEMA}.household_members`,
    `${APP_SCHEMA}.households`,
    `${APP_SCHEMA}.account`,
    `${APP_SCHEMA}.session`,
    `${APP_SCHEMA}.verification`,
    `${APP_SCHEMA}.user`
  ],
  protectedSchemas: ["vocabflow_meta"],
  protectedTables: [
    "vocabflow_meta.bootstrap_metadata",
    "vocabflow_meta.environment_identity"
  ],
  migrationTrackingObjects: [`${MIGRATION_SCHEMA}.__drizzle_migrations`]
} as const;
