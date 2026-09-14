import { APP_SCHEMA, MIGRATION_SCHEMA } from "@vocabflow/contracts";

export const DATABASE_RESET_POLICY = {
  applicationSchemas: [APP_SCHEMA],
  applicationTables: [
    `${APP_SCHEMA}.review_events`,
    `${APP_SCHEMA}.learner_progress`,
    `${APP_SCHEMA}.vocabularies`,
    `${APP_SCHEMA}.learner_profiles`,
    `${APP_SCHEMA}.household_members`,
    `${APP_SCHEMA}.households`,
    `${APP_SCHEMA}.account`,
    `${APP_SCHEMA}.session`,
    `${APP_SCHEMA}.verification`,
    `${APP_SCHEMA}.user`
  ],
  applicationEnumTypes: [
    `${APP_SCHEMA}.review_result`,
    `${APP_SCHEMA}.learning_status`,
    `${APP_SCHEMA}.household_role`
  ],
  protectedSchemas: ["vocabflow_meta"],
  protectedTables: [
    "vocabflow_meta.bootstrap_metadata",
    "vocabflow_meta.environment_identity"
  ],
  migrationTrackingObjects: [`${MIGRATION_SCHEMA}.__drizzle_migrations`]
} as const;
