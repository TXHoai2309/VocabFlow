import { APP_SCHEMA, MIGRATION_SCHEMA } from "@vocabflow/contracts";

export const DATABASE_RESET_POLICY = {
  applicationSchemas: [APP_SCHEMA],
  importerOnlyTables: ["master_v2_development_projections", "master_v2_development_import_runs"],
  applicationViews: [`${APP_SCHEMA}.owner_editorial_active_projections`],
  applicationTables: [
    `${APP_SCHEMA}.foundation_reviews`,
    `${APP_SCHEMA}.foundation_attempts`,
    `${APP_SCHEMA}.foundation_progress`,
    `${APP_SCHEMA}.foundation_memberships`,
    `${APP_SCHEMA}.foundation_targets`,
    `${APP_SCHEMA}.foundation_collections`,
    `${APP_SCHEMA}.owner_editorial_projections`,
    `${APP_SCHEMA}.owner_editorial_local_projections`,
    `${APP_SCHEMA}.master_v2_short_meanings`,
    `${APP_SCHEMA}.master_v2_development_projections`,
    `${APP_SCHEMA}.master_v2_development_import_runs`,

    `${APP_SCHEMA}.master_learning_set_memberships`,
    `${APP_SCHEMA}.master_vocabulary_topic_memberships`,
    `${APP_SCHEMA}.master_learning_set_mappings`,
    `${APP_SCHEMA}.master_topic_mappings`,
    `${APP_SCHEMA}.master_vocabulary_mappings`,
    `${APP_SCHEMA}.master_vocabulary_import_runs`,
    `${APP_SCHEMA}.learner_achievements`,
    `${APP_SCHEMA}.xp_events`,
    `${APP_SCHEMA}.achievements`,
    `${APP_SCHEMA}.learner_learning_sets`,
    `${APP_SCHEMA}.learning_set_items`,
    `${APP_SCHEMA}.vocabulary_topics`,
    `${APP_SCHEMA}.learner_saved_vocabulary`,
    `${APP_SCHEMA}.review_events`,
    `${APP_SCHEMA}.learner_progress`,
    `${APP_SCHEMA}.vocabularies`,
    `${APP_SCHEMA}.learning_sets`,
    `${APP_SCHEMA}.topics`,
    `${APP_SCHEMA}.learner_profiles`,
    `${APP_SCHEMA}.household_members`,
    `${APP_SCHEMA}.households`,
    `${APP_SCHEMA}.account`,
    `${APP_SCHEMA}.session`,
    `${APP_SCHEMA}.verification`,
    `${APP_SCHEMA}.user`
  ],
  applicationEnumTypes: [
    `${APP_SCHEMA}.vocabulary_level`,
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
