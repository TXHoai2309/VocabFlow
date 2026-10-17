import type {
  ConnectionTarget,
  DatabasePurpose,
  DatabaseTarget,
} from "@vocabflow/contracts";

type TargetWithRoles = DatabaseTarget & {
  roles: Record<DatabasePurpose, string>;
};

export const DATABASE_TARGETS = {
  development: {
    environment: "development",
    provider: "neon",
    projectId: "silent-sky-84582895",
    branchId: "br-cold-shadow-a17yg4k2",
    databaseName: "neondb",
    pooled: false,
    usage: "development",
    identityVersion: 1,
    roles: {
      bootstrap: "vocabflow_identity_bootstrap",
      "identity-provision": "vocabflow_identity_provision",
      migration: "vocabflow_migration",
      runtime: "vocabflow_runtime",
      "integration-test": "vocabflow_migration",
    },
  },

  test: {
    environment: "test",
    provider: "neon",
    projectId: "shy-hill-72364426",
    branchId: "br-red-cloud-b3go3xze",
    databaseName: "neondb",
    pooled: true,
    usage: "shared-ci",
    identityVersion: 1,
    roles: {
      bootstrap: "vocabflow_identity_bootstrap",
      "identity-provision": "vocabflow_identity_provision",
      migration: "vocabflow_migration",
      runtime: "vocabflow_runtime",
      "integration-test": "vocabflow_migration",
    },
  },

  production: {
    environment: "production",
    provider: "neon",
    projectId: "silent-sky-84582895",
    branchId: "br-cool-sea-a1ifkf95",
    databaseName: "neondb",
    pooled: true,
    usage: "production",
    identityVersion: 1,
    roles: {
      // Fresh Neon production bootstrap uses this one-shot provider owner
      // credential, never one of the production runtime/application roles.
      bootstrap: "neondb_owner",
      "identity-provision": "vocabflow_identity_provision",
      migration: "vocabflow_migration",
      runtime: "vocabflow_runtime",
      "integration-test": "vocabflow_migration",
    },
  },
} as const satisfies Record<string, TargetWithRoles>;

/** Preserved target metadata for documented Development rollback only. */
export const NEON_DEVELOPMENT_ROLLBACK_TARGET = {
  projectId: "shy-hill-72364426",
  branchId: "br-square-grass-b3af0nte",
  databaseName: "neondb",
} as const;

/** V1 stays available for an owner-approved deployment rollback. */
export const NEON_PRODUCTION_V1_ROLLBACK_TARGET = {
  projectId: "shy-hill-72364426",
  branchId: "br-rough-silence-b3gbqjcb",
  databaseName: "neondb",
} as const;

export function getConnectionTarget(
  environment: keyof typeof DATABASE_TARGETS,
  purpose: DatabasePurpose,
): ConnectionTarget {
  const target = DATABASE_TARGETS[environment] as TargetWithRoles;

  return {
    ...target,
    purpose,
    roleName: target.roles[purpose],
  };
}

export function isConfiguredTarget(target: DatabaseTarget): boolean {
  return (
    !target.projectId.startsWith("__configure_") &&
    !target.branchId.startsWith("__configure_")
  );
}

export const SHARED_CI_TARGET = DATABASE_TARGETS.test;
