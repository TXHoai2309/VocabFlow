import type { ConnectionTarget, DatabaseTarget, DatabasePurpose } from "@vocabflow/contracts";

type TargetWithRoles = DatabaseTarget & {
  roles: Record<DatabasePurpose, string>;
};

const placeholder = (name: string) => `__configure_${name}__`;

export const DATABASE_TARGETS = {
  development: {
    environment: "development",
    provider: "neon",
    projectId: placeholder("development_project_id"),
    branchId: placeholder("development_branch_id"),
    databaseName: "vocabflow",
    pooled: false,
    usage: "development",
    identityVersion: 1,
    roles: {
      bootstrap: "vocabflow_identity_bootstrap",
      "identity-provision": "vocabflow_identity_provision",
      migration: "vocabflow_migration",
      runtime: "vocabflow_runtime",
      "integration-test": "vocabflow_migration"
    }
  },
  test: {
    environment: "test",
    provider: "neon",
    projectId: placeholder("test_project_id"),
    branchId: placeholder("test_branch_id"),
    databaseName: "vocabflow",
    pooled: false,
    usage: "shared-ci",
    identityVersion: 1,
    roles: {
      bootstrap: "vocabflow_identity_bootstrap",
      "identity-provision": "vocabflow_identity_provision",
      migration: "vocabflow_migration",
      runtime: "vocabflow_runtime",
      "integration-test": "vocabflow_migration"
    }
  },
  production: {
    environment: "production",
    provider: "neon",
    projectId: placeholder("production_project_id"),
    branchId: placeholder("production_branch_id"),
    databaseName: "vocabflow",
    pooled: true,
    usage: "production",
    identityVersion: 1,
    roles: {
      bootstrap: "vocabflow_identity_bootstrap",
      "identity-provision": "vocabflow_identity_provision",
      migration: "vocabflow_migration",
      runtime: "vocabflow_runtime",
      "integration-test": "vocabflow_migration"
    }
  }
} as const satisfies Record<string, TargetWithRoles>;

export function getConnectionTarget(environment: keyof typeof DATABASE_TARGETS, purpose: DatabasePurpose): ConnectionTarget {
  const target = DATABASE_TARGETS[environment] as TargetWithRoles;
  return { ...target, purpose, roleName: target.roles[purpose] };
}

export function isConfiguredTarget(target: DatabaseTarget): boolean {
  return !target.projectId.startsWith("__configure_") && !target.branchId.startsWith("__configure_");
}

export const SHARED_CI_TARGET = DATABASE_TARGETS.test;
