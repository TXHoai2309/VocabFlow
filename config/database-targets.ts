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
    projectId: "shy-hill-72364426",
    branchId: "br-square-grass-b3af0nte",
    databaseName: "neondb",
    pooled: true,
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
    projectId: "shy-hill-72364426",
    branchId: "br-rough-silence-b3gbqjcb",
    databaseName: "neondb",
    pooled: true,
    usage: "production",
    identityVersion: 1,
    roles: {
      bootstrap: "vocabflow_identity_bootstrap",
      "identity-provision": "vocabflow_identity_provision",
      migration: "vocabflow_migration",
      runtime: "vocabflow_runtime",
      "integration-test": "vocabflow_migration",
    },
  },
} as const satisfies Record<string, TargetWithRoles>;

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