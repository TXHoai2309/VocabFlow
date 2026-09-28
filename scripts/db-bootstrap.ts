import postgres from "postgres";
import { assertApplicationTablesAbsent, BOOTSTRAP_METADATA_VERSION, openSql, PROTECTED_IDENTITY_TABLE, PROTECTED_SCHEMA } from "./db-core";
import { APP_SCHEMA, MIGRATION_SCHEMA, type ConnectionTarget } from "@vocabflow/contracts";
import type { ParsedRoleCredential } from "./db-credentials";

export { APP_SCHEMA, MIGRATION_SCHEMA };

export const ROLE_NAMES = {
  owner: "vocabflow_identity_owner",
  provision: "vocabflow_identity_provision",
  migration: "vocabflow_migration",
  runtime: "vocabflow_runtime",
  bootstrap: "vocabflow_identity_bootstrap"
} as const;

export type BootstrapRoleCredentials = {
  provision: ParsedRoleCredential;
  migration: ParsedRoleCredential;
  runtime: ParsedRoleCredential;
};

const LOCK_KEY = 89421731;

type BootstrapStage =
  | "acquire-advisory-lock"
  | "load-existing-state"
  | "create-roles"
  | "create-migration-schema"
  | "create-application-schema"
  | "create-protected-schema"
  | "create-protected-tables"
  | "grant-protected-privileges"
  | "assert-role-model"
  | "assert-protected-shape"
  | "assert-protected-privileges"
  | "assert-migration-privileges"
  | "assert-application-database-privileges"
  | "assert-memberships";

function markStage(stage: BootstrapStage) {
  console.log(`DB_BOOTSTRAP_STAGE=${stage}`);
}

function ident(value: string) {
  if (!/^[a-z_][a-z0-9_]*$/.test(value)) throw new Error("INVALID_ROLE_IDENTIFIER");
  return `"${value}"`;
}

function roleModelFailure(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; message?: string };
  return candidate.code === "42501"
    || /permission denied|must be owner|must have .* privilege|cannot create role|role .* does not exist|not permitted/i.test(candidate.message ?? "");
}

type SqlTag = {
  unsafe(value: string): unknown;
  (strings: TemplateStringsArray, ...values: unknown[]): Promise<unknown>;
};

type TemporarySetRole = typeof ROLE_NAMES.migration | typeof ROLE_NAMES.owner;

const ROLE_NAME_SETTING = "vocabflow.bootstrap_role_name";
const ROLE_PASSWORD_SETTING = "vocabflow.bootstrap_role_password";

// PostgreSQL utility statements do not accept extended-query parameters in
// CREATE ROLE's PASSWORD clause. Keep this block constant and pass both
// values through transaction-local settings; the server-side format() applies
// identifier/literal quoting. `tx.unsafe` is deliberately used only for this
// constant block, never for either credential value.
const CREATE_LOGIN_ROLE_BLOCK = `DO $vocabflow_role$
DECLARE
  role_name text := current_setting('${ROLE_NAME_SETTING}', true);
  role_password text := current_setting('${ROLE_PASSWORD_SETTING}', true);
BEGIN
  IF role_name IS NULL OR role_password IS NULL OR role_name = '' OR role_password = '' THEN
    RAISE EXCEPTION 'ROLE_CREDENTIALS_REQUIRED';
  END IF;
  EXECUTE format(
    'CREATE ROLE %I LOGIN NOINHERIT PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS',
    role_name,
    role_password
  );
END
$vocabflow_role$`;

/** Execute CREATE ROLE without placing a password in client-side SQL text. */
export async function createLoginRole(tx: SqlTag, roleName: string, password: string) {
  ident(roleName);
  if (!password) throw new Error("ROLE_CREDENTIALS_REQUIRED");
  await tx`SELECT set_config(${ROLE_NAME_SETTING}::text, ${roleName}::text, true), set_config(${ROLE_PASSWORD_SETTING}::text, ${password}::text, true)`;
  await tx.unsafe(CREATE_LOGIN_ROLE_BLOCK);
}

/**
 * PostgreSQL 18 automatically grants every role created by a non-superuser
 * CREATEROLE user back to that creator with ADMIN TRUE, INHERIT FALSE and
 * SET FALSE. That bootstrap-superuser-attributed row cannot be changed by the
 * creator and is intentionally retained. Ownership operations use a separate,
 * CURRENT_USER-attributed SET grant which is revoked on the successful path.
 * An error aborts the surrounding transaction and rolls the temporary row back.
 */
export async function withTemporarySetMembership(
  tx: SqlTag,
  roleName: TemporarySetRole,
  operation: () => Promise<void>,
  bootstrapRoleName: string = ROLE_NAMES.bootstrap,
) {
  await tx`GRANT ${tx.unsafe(ident(roleName))} TO ${tx.unsafe(ident(bootstrapRoleName))} WITH ADMIN FALSE, INHERIT FALSE, SET TRUE GRANTED BY CURRENT_USER`;
  let operationSucceeded = false;
  try {
    await operation();
    operationSucceeded = true;
  } finally {
    // If operation failed, PostgreSQL has already marked the transaction
    // aborted; rollback will remove the temporary grant. Issuing REVOKE in
    // that state would mask the original error with 25P02.
    if (operationSucceeded) {
      await tx`REVOKE ${tx.unsafe(ident(roleName))} FROM ${tx.unsafe(ident(bootstrapRoleName))} GRANTED BY CURRENT_USER`;
      await assertBootstrapAdministrativeMemberships(
        tx as unknown as ReturnType<typeof openSql>,
        [roleName],
        bootstrapRoleName,
      );
    }
  }
}

export async function protectedState(sql: ReturnType<typeof openSql>) {
  // Do catalog existence checks first. Referencing a missing relation in the
  // same SQL statement as a CASE expression still fails at parse time in
  // PostgreSQL, which would make a genuinely fresh target impossible to
  // bootstrap.
  const [catalog] = await sql<{ schema_exists: boolean; identity_exists: boolean; metadata_exists: boolean; schema_owner: string | null }[]>`
    SELECT
      to_regnamespace(${PROTECTED_SCHEMA}::text) IS NOT NULL AS schema_exists,
      to_regclass(${`${PROTECTED_SCHEMA}.${PROTECTED_IDENTITY_TABLE}`}::text) IS NOT NULL AS identity_exists,
      to_regclass(${`${PROTECTED_SCHEMA}.bootstrap_metadata`}::text) IS NOT NULL AS metadata_exists,
      (SELECT r.rolname FROM pg_namespace n JOIN pg_roles r ON r.oid = n.nspowner WHERE n.nspname::text = ${PROTECTED_SCHEMA}::text) AS schema_owner
  `;
  let owner: string | null = null;
  let metadataOwner: string | null = null;
  let identityCount = "0";
  let metadataCount = "0";
  let identityId: number | null = null;
  let metadataId: number | null = null;
  let metadataVersion: number | null = null;
  if (catalog?.identity_exists) {
    const [identity] = await sql<{ owner: string | null; identity_count: string; identity_id: number | null }[]>`
      SELECT
        (SELECT r.rolname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace JOIN pg_roles r ON r.oid = c.relowner WHERE n.nspname::text = ${PROTECTED_SCHEMA}::text AND c.relname::text = ${PROTECTED_IDENTITY_TABLE}::text) AS owner,
        (SELECT count(*)::text FROM ${sql.unsafe(`"${PROTECTED_SCHEMA}"."${PROTECTED_IDENTITY_TABLE}"`)}) AS identity_count,
        (SELECT id FROM ${sql.unsafe(`"${PROTECTED_SCHEMA}"."${PROTECTED_IDENTITY_TABLE}"`)} ORDER BY id LIMIT 1) AS identity_id
    `;
    owner = identity?.owner ?? null;
    identityCount = identity?.identity_count ?? "0";
    identityId = identity?.identity_id ?? null;
  }
  if (catalog?.metadata_exists) {
    const [metadata] = await sql<{ owner: string | null; metadata_count: string; metadata_id: number | null; metadata_version: number | null }[]>`
      SELECT
        (SELECT r.rolname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace JOIN pg_roles r ON r.oid = c.relowner WHERE n.nspname::text = ${PROTECTED_SCHEMA}::text AND c.relname = 'bootstrap_metadata') AS owner,
        (SELECT count(*)::text FROM ${sql.unsafe(`"${PROTECTED_SCHEMA}"."bootstrap_metadata"`)}) AS metadata_count,
        (SELECT id FROM ${sql.unsafe(`"${PROTECTED_SCHEMA}"."bootstrap_metadata"`)} ORDER BY id LIMIT 1) AS metadata_id,
        (SELECT version FROM ${sql.unsafe(`"${PROTECTED_SCHEMA}"."bootstrap_metadata"`)} WHERE id = 1) AS metadata_version
    `;
    metadataOwner = metadata?.owner ?? null;
    metadataCount = metadata?.metadata_count ?? "0";
    metadataId = metadata?.metadata_id ?? null;
    metadataVersion = metadata?.metadata_version ?? null;
  }
  return {
    schema_exists: catalog?.schema_exists ?? false,
    identity_exists: catalog?.identity_exists ?? false,
    metadata_exists: catalog?.metadata_exists ?? false,
    schema_owner: catalog?.schema_owner ?? null,
    owner,
    metadataOwner,
    identity_count: identityCount,
    metadata_count: metadataCount,
    identity_id: identityId,
    metadata_id: metadataId,
    metadata_version: metadataVersion
  };
}

export async function assertProtectedShape(sql: ReturnType<typeof openSql>) {
  const columns = await sql<{ table_name: string; column_name: string; udt_name: string; is_nullable: string }[]>`
    SELECT table_name, column_name, udt_name, is_nullable
    FROM information_schema.columns
    WHERE table_schema::text = ${PROTECTED_SCHEMA}::text
      AND table_name::text = ANY(${sql.array(["bootstrap_metadata", PROTECTED_IDENTITY_TABLE])}::text[])
    ORDER BY table_name, ordinal_position
  `;
  const expected = [
    ["bootstrap_metadata", "id", "int2", "NO"],
    ["bootstrap_metadata", "version", "int4", "NO"],
    [PROTECTED_IDENTITY_TABLE, "id", "int2", "NO"],
    [PROTECTED_IDENTITY_TABLE, "environment", "text", "NO"],
    [PROTECTED_IDENTITY_TABLE, "provider", "text", "NO"],
    [PROTECTED_IDENTITY_TABLE, "project_id", "text", "NO"],
    [PROTECTED_IDENTITY_TABLE, "branch_id", "text", "NO"],
    [PROTECTED_IDENTITY_TABLE, "identity_version", "int4", "NO"],
    [PROTECTED_IDENTITY_TABLE, "created_at", "timestamptz", "NO"]
  ];
  if (columns.length !== expected.length || columns.some((column, index) => {
    const wanted = expected[index];
    return !wanted || column.table_name !== wanted[0] || column.column_name !== wanted[1] || column.udt_name !== wanted[2] || column.is_nullable !== wanted[3];
  })) throw new Error("PROTECTED_METADATA_MALFORMED");

  const constraints = await sql<{ table_name: string; contype: string; definition: string }[]>`
    SELECT ctable.relname AS table_name, c.contype, pg_get_constraintdef(c.oid) AS definition
    FROM pg_constraint c
    JOIN pg_class ctable ON ctable.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = ctable.relnamespace
    WHERE n.nspname::text = ${PROTECTED_SCHEMA}::text
      AND ctable.relname::text = ANY(${sql.array(["bootstrap_metadata", PROTECTED_IDENTITY_TABLE])}::text[])
  `;
  const normalized = (table: string) => constraints.filter((constraint) => constraint.table_name === table).map((constraint) => constraint.definition.toLowerCase().replaceAll('"', "").replaceAll(/\s+/g, ""));
  const metadataConstraints = normalized("bootstrap_metadata");
  const identityConstraints = normalized(PROTECTED_IDENTITY_TABLE);
  if (!metadataConstraints.some((definition) => definition.includes("primarykey(id)"))
    || !metadataConstraints.some((definition) => definition.includes("id=1"))
    || !metadataConstraints.some((definition) => definition.includes("version=1"))
    || !identityConstraints.some((definition) => definition.includes("primarykey(id)"))
    || !identityConstraints.some((definition) => definition.includes("id=1"))
    || !identityConstraints.some((definition) => definition.includes("environmentin('development','test','production')") || (definition.includes("environment=any(array[") && definition.includes("'development'") && definition.includes("'test'") && definition.includes("'production'")))
    || !identityConstraints.some((definition) => definition.includes("provider='neon'"))
    || !identityConstraints.some((definition) => definition.includes("identity_version=1"))) {
    throw new Error("PROTECTED_METADATA_MALFORMED");
  }

  const [acl] = await sql<{ public_create: boolean }[]>`
    SELECT EXISTS (
      SELECT 1
      FROM pg_namespace n,
           aclexplode(COALESCE(n.nspacl, acldefault('n', n.nspowner))) privilege
      WHERE n.nspname::text = ${PROTECTED_SCHEMA}::text
        AND privilege.grantee = 0
        AND privilege.privilege_type = 'CREATE'
    ) AS public_create
  `;
  if (acl?.public_create) throw new Error("PROTECTED_METADATA_MALFORMED");
}

export async function assertRoleModel(sql: ReturnType<typeof openSql>, bootstrapRoleName: string = ROLE_NAMES.bootstrap) {
  const required = [ROLE_NAMES.owner, ROLE_NAMES.provision, ROLE_NAMES.migration, ROLE_NAMES.runtime];
  const roles = await sql<{ rolname: string; rolcanlogin: boolean; rolinherit: boolean; rolsuper: boolean; rolcreatedb: boolean; rolcreaterole: boolean; rolreplication: boolean; rolbypassrls: boolean }[]>`
    SELECT rolname, rolcanlogin, rolinherit, rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolbypassrls
    FROM pg_roles
    WHERE rolname::text = ANY(${sql.array(required)}::text[])
  `;
  if (roles.length !== required.length) throw new Error("BLOCKED_ROLE_MODEL");
  for (const role of roles) {
    const expectedLogin = role.rolname !== ROLE_NAMES.owner;
    if (role.rolcanlogin !== expectedLogin || role.rolinherit || role.rolsuper || role.rolcreatedb || role.rolcreaterole || role.rolreplication || role.rolbypassrls) {
      throw new Error("BLOCKED_ROLE_MODEL");
    }
  }
  markStage("assert-application-database-privileges");
  await assertNoApplicationDatabasePrivileges(sql);
  markStage("assert-memberships");
  await assertMemberships(sql, bootstrapRoleName);
}

export async function assertNoApplicationDatabasePrivileges(sql: ReturnType<typeof openSql>) {
  const [database] = await sql<{
    application_database_owner: boolean;
    owner_create: boolean;
    provision_create: boolean;
    migration_create: boolean;
    runtime_create: boolean;
  }[]>`
    SELECT
      EXISTS (
        SELECT 1
        FROM pg_database db
        JOIN pg_roles role_owner ON role_owner.oid = db.datdba
        WHERE db.datname = current_database()
          AND role_owner.rolname::text = ANY(${sql.array([ROLE_NAMES.owner, ROLE_NAMES.provision, ROLE_NAMES.migration, ROLE_NAMES.runtime])}::text[])
      ) AS application_database_owner,
      has_database_privilege(${ROLE_NAMES.owner}::text, current_database()::text, 'CREATE') AS owner_create,
      has_database_privilege(${ROLE_NAMES.provision}::text, current_database()::text, 'CREATE') AS provision_create,
      has_database_privilege(${ROLE_NAMES.migration}::text, current_database()::text, 'CREATE') AS migration_create,
      has_database_privilege(${ROLE_NAMES.runtime}::text, current_database()::text, 'CREATE') AS runtime_create
  `;
  if (database?.application_database_owner || database?.owner_create || database?.provision_create || database?.migration_create || database?.runtime_create) {
    throw new Error("BLOCKED_ROLE_MODEL");
  }
}

type BootstrapCreatedRole = typeof ROLE_NAMES.owner
  | typeof ROLE_NAMES.provision
  | typeof ROLE_NAMES.migration
  | typeof ROLE_NAMES.runtime;

type BootstrapMembershipRow = {
  roleid: number;
  member: number;
  grantor: number;
  granted_role: BootstrapCreatedRole;
  grantor_is_superuser: boolean;
  admin_option: boolean;
  inherit_option: boolean;
  set_option: boolean;
};

const BOOTSTRAP_MEMBERSHIP_FAILURES: Record<BootstrapCreatedRole, { inherit: string; set: string }> = {
  [ROLE_NAMES.owner]: {
    inherit: "BLOCKED_ROLE_MODEL_BOOTSTRAP_OWNER_INHERIT_ENABLED",
    set: "BLOCKED_ROLE_MODEL_BOOTSTRAP_OWNER_SET_ENABLED",
  },
  [ROLE_NAMES.provision]: {
    inherit: "BLOCKED_ROLE_MODEL_BOOTSTRAP_PROVISION_INHERIT_ENABLED",
    set: "BLOCKED_ROLE_MODEL_BOOTSTRAP_PROVISION_SET_ENABLED",
  },
  [ROLE_NAMES.migration]: {
    inherit: "BLOCKED_ROLE_MODEL_BOOTSTRAP_MIGRATION_INHERIT_ENABLED",
    set: "BLOCKED_ROLE_MODEL_BOOTSTRAP_MIGRATION_SET_ENABLED",
  },
  [ROLE_NAMES.runtime]: {
    inherit: "BLOCKED_ROLE_MODEL_BOOTSTRAP_RUNTIME_INHERIT_ENABLED",
    set: "BLOCKED_ROLE_MODEL_BOOTSTRAP_RUNTIME_SET_ENABLED",
  },
};

async function assertBootstrapAdministrativeMemberships(
  sql: ReturnType<typeof openSql>,
  roles: readonly BootstrapCreatedRole[],
  bootstrapRoleName: string = ROLE_NAMES.bootstrap,
) {
  const rows = await sql<BootstrapMembershipRow[]>`
    SELECT
      membership.roleid::oid AS roleid,
      membership.member::oid AS member,
      membership.grantor::oid AS grantor,
      granted.rolname::text AS granted_role,
      grantor_role.rolsuper AS grantor_is_superuser,
      membership.admin_option,
      membership.inherit_option,
      membership.set_option
    FROM pg_auth_members membership
    JOIN pg_roles member ON member.oid = membership.member
    JOIN pg_roles granted ON granted.oid = membership.roleid
    JOIN pg_roles grantor_role ON grantor_role.oid = membership.grantor
    WHERE member.rolname::text = ${bootstrapRoleName}::text
      AND granted.rolname::text = ANY(${sql.array([...roles])}::text[])
    ORDER BY granted.rolname, membership.grantor
  `;

  for (const role of roles) {
    const roleRows = rows.filter((row) => row.granted_role === role);
    const failures = BOOTSTRAP_MEMBERSHIP_FAILURES[role];
    if (roleRows.some((row) => row.set_option)) throw new Error(failures.set);
    if (roleRows.some((row) => row.inherit_option)) throw new Error(failures.inherit);

    // PostgreSQL 18 creates exactly one bootstrap-superuser-attributed
    // administrative row. It is safe only because SET and INHERIT are false.
    // A row granted by the bootstrap member itself is a leaked temporary grant.
    const automatic = roleRows[0];
    if (roleRows.length !== 1
      || !automatic
      || automatic.admin_option !== true
      || automatic.set_option !== false
      || automatic.inherit_option !== false
      || automatic.grantor_is_superuser !== true
      || automatic.grantor === automatic.member) {
      throw new Error("BLOCKED_ROLE_MODEL_UNEXPECTED_BOOTSTRAP_MEMBERSHIP_OPTIONS");
    }
  }
}

export async function assertBootstrapMigrationMembershipSafe(sql: ReturnType<typeof openSql>, bootstrapRoleName: string = ROLE_NAMES.bootstrap) {
  await assertBootstrapAdministrativeMemberships(sql, [ROLE_NAMES.migration], bootstrapRoleName);
}

export async function assertBootstrapOwnerMembershipSafe(sql: ReturnType<typeof openSql>, bootstrapRoleName: string = ROLE_NAMES.bootstrap) {
  await assertBootstrapAdministrativeMemberships(sql, [ROLE_NAMES.owner], bootstrapRoleName);
}

export async function assertMemberships(sql: ReturnType<typeof openSql>, bootstrapRoleName: string = ROLE_NAMES.bootstrap) {
  type MembershipSubstage =
    | "membership-bootstrap-owner"
    | "membership-bootstrap-migration"
    | "membership-bootstrap-application-roles"
    | "membership-app-owner"
    | "membership-cross-app";
  const markSubstage = (substage: MembershipSubstage) => {
    console.log(`DB_BOOTSTRAP_SUBSTAGE=${substage}`);
  };

  markSubstage("membership-bootstrap-owner");
  await assertBootstrapOwnerMembershipSafe(sql, bootstrapRoleName);

  markSubstage("membership-bootstrap-migration");
  await assertBootstrapMigrationMembershipSafe(sql, bootstrapRoleName);

  markSubstage("membership-bootstrap-application-roles");
  await assertBootstrapAdministrativeMemberships(sql, [ROLE_NAMES.provision, ROLE_NAMES.runtime], bootstrapRoleName);

  markSubstage("membership-app-owner");
  const [applicationOwnerMembership] = await sql<{ forbidden: boolean }[]>`
    SELECT EXISTS (
      SELECT 1
      FROM pg_auth_members membership
      JOIN pg_roles member ON member.oid = membership.member
      JOIN pg_roles granted ON granted.oid = membership.roleid
      WHERE granted.rolname::text = ${ROLE_NAMES.owner}::text
        AND member.rolname::text = ANY(${sql.array([ROLE_NAMES.provision, ROLE_NAMES.migration, ROLE_NAMES.runtime])}::text[])
    ) AS forbidden
  `;
  if (applicationOwnerMembership?.forbidden !== false) {
    throw new Error("BLOCKED_ROLE_MODEL_APP_TO_OWNER_MEMBERSHIP");
  }

  markSubstage("membership-cross-app");
  const [crossApplicationMembership] = await sql<{
    provision_to_migration: boolean;
    runtime_to_migration: boolean;
  }[]>`
    SELECT
      EXISTS (
        SELECT 1
        FROM pg_auth_members membership
        JOIN pg_roles member ON member.oid = membership.member
        JOIN pg_roles granted ON granted.oid = membership.roleid
        WHERE granted.rolname::text = ${ROLE_NAMES.migration}::text
          AND member.rolname::text = ${ROLE_NAMES.provision}::text
      ) AS provision_to_migration,
      EXISTS (
        SELECT 1
        FROM pg_auth_members membership
        JOIN pg_roles member ON member.oid = membership.member
        JOIN pg_roles granted ON granted.oid = membership.roleid
        WHERE granted.rolname::text = ${ROLE_NAMES.migration}::text
          AND member.rolname::text = ${ROLE_NAMES.runtime}::text
      ) AS runtime_to_migration
  `;
  if (crossApplicationMembership?.provision_to_migration !== false) {
    throw new Error("BLOCKED_ROLE_MODEL_PROVISION_TO_MIGRATION_MEMBERSHIP");
  }
  if (crossApplicationMembership.runtime_to_migration !== false) {
    throw new Error("BLOCKED_ROLE_MODEL_RUNTIME_TO_MIGRATION_MEMBERSHIP");
  }
}

export async function assertProtectedPrivileges(sql: ReturnType<typeof openSql>) {
  type ProtectedPrivilegeSubstage =
    | "protected-resolve-oids"
    | "protected-provision-table"
    | "protected-provision-schema"
    | "protected-migration-table"
    | "protected-migration-schema"
    | "protected-runtime-table"
    | "protected-runtime-schema"
    | "protected-owner-membership";
  const markSubstage = (substage: ProtectedPrivilegeSubstage) => {
    console.log(`DB_BOOTSTRAP_SUBSTAGE=${substage}`);
  };

  const protectedIdentityRelation = `${PROTECTED_SCHEMA}.${PROTECTED_IDENTITY_TABLE}`;

  markSubstage("protected-resolve-oids");
  const [oids] = await sql<{
    owner_oid: number | null;
    provision_oid: number | null;
    migration_oid: number | null;
    runtime_oid: number | null;
    table_oid: number | null;
    schema_oid: number | null;
  }[]>`
    SELECT
      (SELECT oid::oid FROM pg_roles WHERE rolname::text = ${ROLE_NAMES.owner}::text) AS owner_oid,
      (SELECT oid::oid FROM pg_roles WHERE rolname::text = ${ROLE_NAMES.provision}::text) AS provision_oid,
      (SELECT oid::oid FROM pg_roles WHERE rolname::text = ${ROLE_NAMES.migration}::text) AS migration_oid,
      (SELECT oid::oid FROM pg_roles WHERE rolname::text = ${ROLE_NAMES.runtime}::text) AS runtime_oid,
      to_regclass(${protectedIdentityRelation}::text)::oid AS table_oid,
      to_regnamespace(${PROTECTED_SCHEMA}::text)::oid AS schema_oid
  `;
  if (!oids || oids.owner_oid === null || oids.provision_oid === null || oids.migration_oid === null || oids.runtime_oid === null || oids.table_oid === null || oids.schema_oid === null) {
    throw new Error("BLOCKED_ROLE_MODEL");
  }

  markSubstage("protected-provision-table");
  const [provisionTable] = await sql<{
    provision_select: boolean;
    provision_insert: boolean;
    provision_update: boolean;
    provision_delete: boolean;
    provision_truncate: boolean;
  }[]>`
    SELECT
      has_table_privilege(${oids.provision_oid}::oid, ${oids.table_oid}::oid, 'SELECT'::text) AS provision_select,
      has_table_privilege(${oids.provision_oid}::oid, ${oids.table_oid}::oid, 'INSERT'::text) AS provision_insert,
      has_table_privilege(${oids.provision_oid}::oid, ${oids.table_oid}::oid, 'UPDATE'::text) AS provision_update,
      has_table_privilege(${oids.provision_oid}::oid, ${oids.table_oid}::oid, 'DELETE'::text) AS provision_delete,
      has_table_privilege(${oids.provision_oid}::oid, ${oids.table_oid}::oid, 'TRUNCATE'::text) AS provision_truncate
  `;

  markSubstage("protected-provision-schema");
  const [provisionSchema] = await sql<{ provision_schema_create: boolean }[]>`
    SELECT has_schema_privilege(${oids.provision_oid}::oid, ${oids.schema_oid}::oid, 'CREATE'::text) AS provision_schema_create
  `;

  markSubstage("protected-migration-table");
  const [migrationTable] = await sql<{
    migration_select: boolean;
    migration_insert: boolean;
    migration_update: boolean;
    migration_delete: boolean;
    migration_truncate: boolean;
  }[]>`
    SELECT
      has_table_privilege(${oids.migration_oid}::oid, ${oids.table_oid}::oid, 'SELECT'::text) AS migration_select,
      has_table_privilege(${oids.migration_oid}::oid, ${oids.table_oid}::oid, 'INSERT'::text) AS migration_insert,
      has_table_privilege(${oids.migration_oid}::oid, ${oids.table_oid}::oid, 'UPDATE'::text) AS migration_update,
      has_table_privilege(${oids.migration_oid}::oid, ${oids.table_oid}::oid, 'DELETE'::text) AS migration_delete,
      has_table_privilege(${oids.migration_oid}::oid, ${oids.table_oid}::oid, 'TRUNCATE'::text) AS migration_truncate
  `;

  markSubstage("protected-migration-schema");
  const [migrationSchema] = await sql<{ migration_schema_create: boolean }[]>`
    SELECT has_schema_privilege(${oids.migration_oid}::oid, ${oids.schema_oid}::oid, 'CREATE'::text) AS migration_schema_create
  `;

  markSubstage("protected-runtime-table");
  const [runtimeTable] = await sql<{
    runtime_select: boolean;
    runtime_insert: boolean;
    runtime_update: boolean;
    runtime_delete: boolean;
    runtime_truncate: boolean;
  }[]>`
    SELECT
      has_table_privilege(${oids.runtime_oid}::oid, ${oids.table_oid}::oid, 'SELECT'::text) AS runtime_select,
      has_table_privilege(${oids.runtime_oid}::oid, ${oids.table_oid}::oid, 'INSERT'::text) AS runtime_insert,
      has_table_privilege(${oids.runtime_oid}::oid, ${oids.table_oid}::oid, 'UPDATE'::text) AS runtime_update,
      has_table_privilege(${oids.runtime_oid}::oid, ${oids.table_oid}::oid, 'DELETE'::text) AS runtime_delete,
      has_table_privilege(${oids.runtime_oid}::oid, ${oids.table_oid}::oid, 'TRUNCATE'::text) AS runtime_truncate
  `;

  markSubstage("protected-runtime-schema");
  const [runtimeSchema] = await sql<{ runtime_schema_create: boolean }[]>`
    SELECT has_schema_privilege(${oids.runtime_oid}::oid, ${oids.schema_oid}::oid, 'CREATE'::text) AS runtime_schema_create
  `;

  markSubstage("protected-owner-membership");
  const [ownerMembership] = await sql<{
    provision_set_owner: boolean;
    migration_set_owner: boolean;
    runtime_set_owner: boolean;
  }[]>`
    SELECT
      -- SET is the privilege that controls SET ROLE; checking USAGE here
      -- would not prove that application roles are isolated from the owner.
      pg_has_role(${oids.provision_oid}::oid, ${oids.owner_oid}::oid, 'SET'::text) AS provision_set_owner,
      pg_has_role(${oids.migration_oid}::oid, ${oids.owner_oid}::oid, 'SET'::text) AS migration_set_owner,
      pg_has_role(${oids.runtime_oid}::oid, ${oids.owner_oid}::oid, 'SET'::text) AS runtime_set_owner
  `;

  if (
    provisionTable?.provision_select !== true
    || provisionTable.provision_insert !== true
    || provisionTable.provision_update !== false
    || provisionTable.provision_delete !== false
    || provisionTable.provision_truncate !== false
    || provisionSchema?.provision_schema_create !== false
    || migrationTable?.migration_select !== true
    || migrationTable.migration_insert !== false
    || migrationTable.migration_update !== false
    || migrationTable.migration_delete !== false
    || migrationTable.migration_truncate !== false
    || migrationSchema?.migration_schema_create !== false
    || runtimeTable?.runtime_select !== true
    || runtimeTable.runtime_insert !== false
    || runtimeTable.runtime_update !== false
    || runtimeTable.runtime_delete !== false
    || runtimeTable.runtime_truncate !== false
    || runtimeSchema?.runtime_schema_create !== false
    || ownerMembership?.provision_set_owner !== false
    || ownerMembership.migration_set_owner !== false
    || ownerMembership.runtime_set_owner !== false
  ) {
    throw new Error("BLOCKED_ROLE_MODEL");
  }
}

export async function assertMigrationPrivileges(sql: ReturnType<typeof openSql>, target: ConnectionTarget) {
  type MigrationSubstage =
    | "migration-drizzle-schema"
    | "migration-application-schema"
    | "migration-application-privileges"
    | "migration-drizzle-privileges";
  const markSubstage = (substage: MigrationSubstage) => {
    console.log(`DB_BOOTSTRAP_SUBSTAGE=${substage}`);
  };

  markSubstage("migration-drizzle-schema");
  const [drizzleSchema] = await sql<{
    migration_role_oid: number | null;
    schema_oid: number | null;
    schema_owner: string | null;
  }[]>`
    SELECT
      (SELECT oid::oid FROM pg_roles WHERE rolname::text = ${ROLE_NAMES.migration}::text) AS migration_role_oid,
      to_regnamespace(${MIGRATION_SCHEMA}::text)::oid AS schema_oid,
      (SELECT r.rolname
       FROM pg_namespace n
       JOIN pg_roles r ON r.oid = n.nspowner
       WHERE n.nspname::text = ${MIGRATION_SCHEMA}::text) AS schema_owner
  `;
  if (!drizzleSchema?.migration_role_oid) throw new Error("BLOCKED_ROLE_MODEL_MIGRATION_ROLE_MISSING");
  if (!drizzleSchema.schema_oid) throw new Error("BLOCKED_ROLE_MODEL_DRIZZLE_SCHEMA_MISSING");
  if (drizzleSchema.schema_owner !== ROLE_NAMES.migration) throw new Error("BLOCKED_ROLE_MODEL_DRIZZLE_SCHEMA_OWNER");

  markSubstage("migration-application-schema");
  const [applicationSchema] = await sql<{
    schema_oid: number | null;
    schema_owner: string | null;
    provision_role_oid: number | null;
    runtime_role_oid: number | null;
  }[]>`
    SELECT
      to_regnamespace(${APP_SCHEMA}::text)::oid AS schema_oid,
      (SELECT r.rolname
       FROM pg_namespace n
       JOIN pg_roles r ON r.oid = n.nspowner
       WHERE n.nspname::text = ${APP_SCHEMA}::text) AS schema_owner,
      (SELECT oid::oid FROM pg_roles WHERE rolname::text = ${ROLE_NAMES.provision}::text) AS provision_role_oid,
      (SELECT oid::oid FROM pg_roles WHERE rolname::text = ${ROLE_NAMES.runtime}::text) AS runtime_role_oid
  `;
  if (!applicationSchema?.schema_oid) throw new Error("BLOCKED_ROLE_MODEL_APP_SCHEMA_MISSING");
  if (applicationSchema.schema_owner !== ROLE_NAMES.migration) throw new Error("BLOCKED_ROLE_MODEL_APP_SCHEMA_OWNER");
  if (!applicationSchema.provision_role_oid || !applicationSchema.runtime_role_oid) {
    throw new Error("BLOCKED_ROLE_MODEL_APP_SCHEMA_ROLE_MISSING");
  }

  markSubstage("migration-application-privileges");
  const [applicationPrivileges] = await sql<{
    migration_usage: boolean;
    migration_create: boolean;
    runtime_usage: boolean;
    runtime_create: boolean;
    provision_create: boolean;
    provision_set_migration: boolean;
    runtime_set_migration: boolean;
    forbidden_migration_membership: boolean;
  }[]>`
    SELECT
      has_schema_privilege(${drizzleSchema.migration_role_oid}::oid, ${applicationSchema.schema_oid}::oid, 'USAGE'::text) AS migration_usage,
      has_schema_privilege(${drizzleSchema.migration_role_oid}::oid, ${applicationSchema.schema_oid}::oid, 'CREATE'::text) AS migration_create,
      has_schema_privilege(${applicationSchema.runtime_role_oid}::oid, ${applicationSchema.schema_oid}::oid, 'USAGE'::text) AS runtime_usage,
      has_schema_privilege(${applicationSchema.runtime_role_oid}::oid, ${applicationSchema.schema_oid}::oid, 'CREATE'::text) AS runtime_create,
      has_schema_privilege(${applicationSchema.provision_role_oid}::oid, ${applicationSchema.schema_oid}::oid, 'CREATE'::text) AS provision_create,
      pg_has_role(${applicationSchema.provision_role_oid}::oid, ${drizzleSchema.migration_role_oid}::oid, 'SET'::text) AS provision_set_migration,
      pg_has_role(${applicationSchema.runtime_role_oid}::oid, ${drizzleSchema.migration_role_oid}::oid, 'SET'::text) AS runtime_set_migration,
      EXISTS (
        SELECT 1
        FROM pg_auth_members membership
        WHERE membership.roleid = ${drizzleSchema.migration_role_oid}::oid
          AND membership.member = ANY(${sql.array([applicationSchema.provision_role_oid, applicationSchema.runtime_role_oid])}::oid[])
      ) AS forbidden_migration_membership
  `;
  if (applicationPrivileges?.migration_usage !== true) throw new Error("BLOCKED_ROLE_MODEL_APP_SCHEMA_MIGRATION_USAGE");
  if (applicationPrivileges.migration_create !== true) throw new Error("BLOCKED_ROLE_MODEL_APP_SCHEMA_MIGRATION_CREATE");
  if (applicationPrivileges.runtime_usage !== true) throw new Error("BLOCKED_ROLE_MODEL_APP_SCHEMA_RUNTIME_USAGE");
  if (applicationPrivileges.runtime_create !== false) throw new Error("BLOCKED_ROLE_MODEL_APP_SCHEMA_RUNTIME_CREATE");
  if (applicationPrivileges.provision_create !== false) throw new Error("BLOCKED_ROLE_MODEL_APP_SCHEMA_PROVISION_CREATE");
  if (applicationPrivileges.provision_set_migration !== false
    || applicationPrivileges.runtime_set_migration !== false
    || applicationPrivileges.forbidden_migration_membership !== false) {
    throw new Error("BLOCKED_ROLE_MODEL_APP_SCHEMA_FORBIDDEN_MEMBERSHIP");
  }

  markSubstage("migration-drizzle-privileges");
  const [drizzlePrivileges] = await sql<{
    migration_schema_usage: boolean;
    migration_schema_create: boolean;
  }[]>`
    SELECT
      has_schema_privilege(${drizzleSchema.migration_role_oid}::oid, ${drizzleSchema.schema_oid}::oid, 'USAGE'::text) AS migration_schema_usage,
      has_schema_privilege(${drizzleSchema.migration_role_oid}::oid, ${drizzleSchema.schema_oid}::oid, 'CREATE'::text) AS migration_schema_create
  `;
  if (!drizzlePrivileges?.migration_schema_usage) throw new Error("BLOCKED_ROLE_MODEL_DRIZZLE_SCHEMA_USAGE");
  if (!drizzlePrivileges.migration_schema_create) throw new Error("BLOCKED_ROLE_MODEL_DRIZZLE_SCHEMA_CREATE");

  void target;
}

export type ProductionBootstrapIdentityRow = {
  id: number;
  environment: string;
  provider: string;
  project_id: string;
  branch_id: string;
  identity_version: number;
};

export type ProductionBootstrapCatalogSnapshot = {
  databaseName: string;
  sessionUser: string;
  currentUser: string;
  vocabularyRoles: string[];
  vocabularySchemas: string[];
  relations: string[];
  applicationTypes: string[];
  protected: Awaited<ReturnType<typeof protectedState>>;
  identities: ProductionBootstrapIdentityRow[];
};

const productionApplicationRoles = [ROLE_NAMES.owner, ROLE_NAMES.provision, ROLE_NAMES.migration, ROLE_NAMES.runtime].sort();
const productionApplicationSchemas = [APP_SCHEMA, MIGRATION_SCHEMA, PROTECTED_SCHEMA].sort();
const productionBootstrapRelations = [`${PROTECTED_SCHEMA}.bootstrap_metadata`, `${PROTECTED_SCHEMA}.${PROTECTED_IDENTITY_TABLE}`].sort();

export function classifyProductionBootstrapState(
  snapshot: ProductionBootstrapCatalogSnapshot,
  target: ConnectionTarget,
  bootstrapRoleName: string,
): "FRESH" | "ALREADY_BOOTSTRAPPED" {
  if (target.environment !== "production"
    || target.projectId !== "shy-hill-72364426"
    || target.branchId !== "br-rough-silence-b3gbqjcb"
    || target.databaseName !== "neondb"
    || snapshot.databaseName !== target.databaseName
    || snapshot.sessionUser !== bootstrapRoleName
    || snapshot.currentUser !== bootstrapRoleName) {
    throw new Error("PRODUCTION_BOOTSTRAP_CONNECTION_TARGET_MISMATCH");
  }

  const roles = [...snapshot.vocabularyRoles].sort();
  const schemas = [...snapshot.vocabularySchemas].sort();
  const relations = [...snapshot.relations].sort();
  const identityIsCanonical = snapshot.identities.length === 1
    && snapshot.identities[0]?.id === 1
    && snapshot.identities[0]?.environment === target.environment
    && snapshot.identities[0]?.provider === target.provider
    && snapshot.identities[0]?.project_id === target.projectId
    && snapshot.identities[0]?.branch_id === target.branchId
    && snapshot.identities[0]?.identity_version === target.identityVersion;
  const noIdentity = snapshot.identities.length === 0;
  const protectedStateIsFresh = !snapshot.protected.schema_exists
    && !snapshot.protected.identity_exists
    && !snapshot.protected.metadata_exists
    && snapshot.protected.schema_owner === null
    && snapshot.protected.owner === null
    && snapshot.protected.metadataOwner === null;

  if (roles.length === 0 && schemas.length === 0 && relations.length === 0
    && snapshot.applicationTypes.length === 0 && noIdentity && protectedStateIsFresh) {
    return "FRESH";
  }

  const protectedStateIsComplete = snapshot.protected.schema_exists
    && snapshot.protected.identity_exists
    && snapshot.protected.metadata_exists
    && snapshot.protected.schema_owner === ROLE_NAMES.owner
    && snapshot.protected.owner === ROLE_NAMES.owner
    && snapshot.protected.metadataOwner === ROLE_NAMES.owner
    && snapshot.protected.metadata_count === "1"
    && snapshot.protected.metadata_id === 1
    && snapshot.protected.metadata_version === BOOTSTRAP_METADATA_VERSION
    && (snapshot.protected.identity_count === "0" || (snapshot.protected.identity_count === "1" && snapshot.protected.identity_id === 1));
  const complete = JSON.stringify(roles) === JSON.stringify(productionApplicationRoles)
    && JSON.stringify(schemas) === JSON.stringify(productionApplicationSchemas)
    && JSON.stringify(relations) === JSON.stringify(productionBootstrapRelations)
    && snapshot.applicationTypes.length === 0
    && (noIdentity || identityIsCanonical)
    && protectedStateIsComplete;
  if (!complete) throw new Error("PRODUCTION_BOOTSTRAP_UNEXPECTED_STATE");
  return "ALREADY_BOOTSTRAPPED";
}

export async function assertProductionBootstrapState(
  sql: ReturnType<typeof openSql>,
  target: ConnectionTarget,
  bootstrapRoleName: string,
) {
  if (bootstrapRoleName !== target.roleName || target.environment !== "production") {
    throw new Error("PRODUCTION_BOOTSTRAP_CONNECTION_TARGET_MISMATCH");
  }
  const [connection] = await sql<{ database_name: string; session_user: string; current_user: string }[]>`
    SELECT current_database()::text AS database_name,
      session_user::text AS session_user,
      current_user::text AS current_user
  `;
  const roles = await sql<{ rolname: string }[]>`
    SELECT rolname::text AS rolname FROM pg_roles WHERE left(rolname::text, 10) = 'vocabflow_' ORDER BY rolname
  `;
  const schemas = await sql<{ schema_name: string }[]>`
    SELECT nspname::text AS schema_name FROM pg_namespace
    WHERE left(nspname::text, 10) = 'vocabflow_' OR nspname::text = ${MIGRATION_SCHEMA}::text
    ORDER BY nspname
  `;
  const relationRows = await sql<{ schema_name: string; relation_name: string }[]>`
    SELECT n.nspname::text AS schema_name, c.relname::text AS relation_name
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname::text = ANY(${sql.array(productionApplicationSchemas)}::text[])
      AND c.relkind = ANY(ARRAY['r', 'p', 'v', 'm', 'f', 'S']::"char"[])
    ORDER BY n.nspname, c.relname
  `;
  const applicationTypes = await sql<{ type_name: string }[]>`
    SELECT t.typname::text AS type_name
    FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname::text = ANY(${sql.array(productionApplicationSchemas)}::text[])
      AND (t.typtype IN ('e', 'd', 'r') OR (t.typtype = 'c' AND t.typrelid = 0))
      AND left(t.typname::text, 1) <> '_'
    ORDER BY t.typname
  `;
  const existing = await protectedState(sql);
  const identities = existing.identity_exists
    ? await sql<ProductionBootstrapIdentityRow[]>`
      SELECT id, environment, provider, project_id, branch_id, identity_version
      FROM ${sql.unsafe(`"${PROTECTED_SCHEMA}"."${PROTECTED_IDENTITY_TABLE}"`)} ORDER BY id
    `
    : [];
  const status = classifyProductionBootstrapState({
    databaseName: connection?.database_name ?? "",
    sessionUser: connection?.session_user ?? "",
    currentUser: connection?.current_user ?? "",
    vocabularyRoles: roles.map((row) => row.rolname),
    vocabularySchemas: schemas.map((row) => row.schema_name),
    relations: relationRows.map((row) => `${row.schema_name}.${row.relation_name}`),
    applicationTypes: applicationTypes.map((row) => row.type_name),
    protected: existing,
    identities,
  }, target, bootstrapRoleName);
  if (status === "ALREADY_BOOTSTRAPPED") {
    await assertProtectedShape(sql);
    await assertRoleModel(sql, bootstrapRoleName);
    await assertProtectedPrivileges(sql);
    await assertMigrationPrivileges(sql, target);
    await assertApplicationTablesAbsent(sql);
  }
  return status;
}

export async function bootstrapProtectedMetadata(
  url: string,
  target: ConnectionTarget,
  credentials?: BootstrapRoleCredentials,
  options: { bootstrapRoleName?: string; requireFreshProductionState?: boolean } = {},
) {
  const bootstrapRoleName = options.bootstrapRoleName ?? ROLE_NAMES.bootstrap;
  if (options.requireFreshProductionState && (target.environment !== "production" || bootstrapRoleName !== target.roleName)) {
    throw new Error("PRODUCTION_BOOTSTRAP_CONNECTION_TARGET_MISMATCH");
  }
  const sql = postgres(url, { max: 1, idle_timeout: 10, connect_timeout: 10, onnotice: () => undefined });
  try {
    await sql.begin(async (tx) => {
      markStage("acquire-advisory-lock");
      await tx`SELECT pg_advisory_xact_lock(${LOCK_KEY}::bigint)`;
      if (options.requireFreshProductionState) {
        await assertProductionBootstrapState(tx as unknown as ReturnType<typeof openSql>, target, bootstrapRoleName);
      }
      markStage("load-existing-state");
      const state = await protectedState(tx as unknown as ReturnType<typeof openSql>);
      if (state.schema_exists || state.identity_exists || state.metadata_exists || state.schema_owner || state.owner || state.metadataOwner) {
        const identityStateIsValid = state.identity_count === "0" || (state.identity_count === "1" && state.identity_id === 1);
        if (state.schema_exists && state.identity_exists && state.metadata_exists && state.schema_owner === ROLE_NAMES.owner && state.owner === ROLE_NAMES.owner && state.metadataOwner === ROLE_NAMES.owner && identityStateIsValid && state.metadata_count === "1" && state.metadata_id === 1 && state.metadata_version === BOOTSTRAP_METADATA_VERSION) {
          markStage("assert-protected-shape");
          await assertProtectedShape(tx as unknown as ReturnType<typeof openSql>);
          markStage("assert-role-model");
          await assertRoleModel(tx as unknown as ReturnType<typeof openSql>, bootstrapRoleName);
          markStage("assert-protected-privileges");
          await assertProtectedPrivileges(tx as unknown as ReturnType<typeof openSql>);
          markStage("assert-migration-privileges");
          await assertMigrationPrivileges(tx as unknown as ReturnType<typeof openSql>, target);
          return;
        }
        throw new Error("PROTECTED_METADATA_MALFORMED");
      }

      if (!credentials) throw new Error("ROLE_CREDENTIALS_REQUIRED");

      markStage("create-roles");
      await tx`CREATE ROLE ${tx.unsafe(ident(ROLE_NAMES.owner))} NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`;
      await createLoginRole(tx as unknown as SqlTag, ROLE_NAMES.provision, credentials.provision.password);
      await createLoginRole(tx as unknown as SqlTag, ROLE_NAMES.migration, credentials.migration.password);
      await createLoginRole(tx as unknown as SqlTag, ROLE_NAMES.runtime, credentials.runtime.password);
      markStage("create-migration-schema");
      await withTemporarySetMembership(tx as unknown as SqlTag, ROLE_NAMES.migration, async () => {
        await tx`CREATE SCHEMA ${tx.unsafe(ident(MIGRATION_SCHEMA))} AUTHORIZATION ${tx.unsafe(ident(ROLE_NAMES.migration))}`;
        await tx`SET LOCAL ROLE ${tx.unsafe(ident(ROLE_NAMES.migration))}`;
        await tx`REVOKE ALL ON SCHEMA ${tx.unsafe(ident(MIGRATION_SCHEMA))} FROM PUBLIC`;
        await tx`GRANT USAGE, CREATE ON SCHEMA ${tx.unsafe(ident(MIGRATION_SCHEMA))} TO ${tx.unsafe(ident(ROLE_NAMES.migration))}`;
        await tx`RESET ROLE`;
      }, bootstrapRoleName);

      markStage("create-application-schema");
      await withTemporarySetMembership(tx as unknown as SqlTag, ROLE_NAMES.migration, async () => {
        await tx`CREATE SCHEMA ${tx.unsafe(ident(APP_SCHEMA))} AUTHORIZATION ${tx.unsafe(ident(ROLE_NAMES.migration))}`;
        await tx`SET LOCAL ROLE ${tx.unsafe(ident(ROLE_NAMES.migration))}`;
        await tx`REVOKE ALL ON SCHEMA ${tx.unsafe(ident(APP_SCHEMA))} FROM PUBLIC`;
        await tx`GRANT USAGE, CREATE ON SCHEMA ${tx.unsafe(ident(APP_SCHEMA))} TO ${tx.unsafe(ident(ROLE_NAMES.migration))}`;
        await tx`GRANT USAGE ON SCHEMA ${tx.unsafe(ident(APP_SCHEMA))} TO ${tx.unsafe(ident(ROLE_NAMES.runtime))}`;
        await tx`RESET ROLE`;
      }, bootstrapRoleName);

      await withTemporarySetMembership(tx as unknown as SqlTag, ROLE_NAMES.owner, async () => {
        // CREATE SCHEMA ... AUTHORIZATION and all subsequent protected
        // object ownership work runs while the external bootstrap session can
        // SET ROLE to the NOLOGIN owner. No application role receives this
        // membership, and it is revoked by the helper before returning.
        markStage("create-protected-schema");
        await tx`CREATE SCHEMA ${tx.unsafe(ident(PROTECTED_SCHEMA))} AUTHORIZATION ${tx.unsafe(ident(ROLE_NAMES.owner))}`;
        markStage("create-protected-tables");
        await tx`SET LOCAL ROLE ${tx.unsafe(ident(ROLE_NAMES.owner))}`;
        await tx`CREATE TABLE ${tx.unsafe(`${PROTECTED_SCHEMA}.bootstrap_metadata`)} (id SMALLINT PRIMARY KEY CHECK (id = 1), version INTEGER NOT NULL CHECK (version = 1))`;
        await tx`CREATE TABLE ${tx.unsafe(`${PROTECTED_SCHEMA}.${PROTECTED_IDENTITY_TABLE}`)} (
          id SMALLINT PRIMARY KEY CHECK (id = 1),
          environment TEXT NOT NULL CHECK (environment IN ('development', 'test', 'production')),
          provider TEXT NOT NULL CHECK (provider = 'neon'),
          project_id TEXT NOT NULL,
          branch_id TEXT NOT NULL,
          identity_version INTEGER NOT NULL CHECK (identity_version = 1),
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )`;
        await tx`INSERT INTO ${tx.unsafe(`${PROTECTED_SCHEMA}.bootstrap_metadata`)} (id, version) VALUES (1, ${BOOTSTRAP_METADATA_VERSION})`;
        markStage("grant-protected-privileges");
        await tx`REVOKE ALL ON SCHEMA ${tx.unsafe(ident(PROTECTED_SCHEMA))} FROM PUBLIC`;
        await tx`GRANT USAGE ON SCHEMA ${tx.unsafe(ident(PROTECTED_SCHEMA))} TO ${tx.unsafe(ident(ROLE_NAMES.provision))}, ${tx.unsafe(ident(ROLE_NAMES.migration))}, ${tx.unsafe(ident(ROLE_NAMES.runtime))}`;
        await tx`GRANT SELECT ON ${tx.unsafe(`${PROTECTED_SCHEMA}.bootstrap_metadata`)} TO ${tx.unsafe(ident(ROLE_NAMES.provision))}, ${tx.unsafe(ident(ROLE_NAMES.migration))}, ${tx.unsafe(ident(ROLE_NAMES.runtime))}`;
        await tx`GRANT SELECT, INSERT ON ${tx.unsafe(`${PROTECTED_SCHEMA}.${PROTECTED_IDENTITY_TABLE}`)} TO ${tx.unsafe(ident(ROLE_NAMES.provision))}`;
        await tx`GRANT SELECT ON ${tx.unsafe(`${PROTECTED_SCHEMA}.${PROTECTED_IDENTITY_TABLE}`)} TO ${tx.unsafe(ident(ROLE_NAMES.migration))}, ${tx.unsafe(ident(ROLE_NAMES.runtime))}`;
        markStage("assert-protected-shape");
        await assertProtectedShape(tx as unknown as ReturnType<typeof openSql>);
        markStage("assert-protected-privileges");
        await assertProtectedPrivileges(tx as unknown as ReturnType<typeof openSql>);
        await tx`RESET ROLE`;
      }, bootstrapRoleName);

      markStage("assert-migration-privileges");
      await assertMigrationPrivileges(tx as unknown as ReturnType<typeof openSql>, target);
      markStage("assert-role-model");
      await assertRoleModel(tx as unknown as ReturnType<typeof openSql>, bootstrapRoleName);
    });
  } catch (error) {
    if (roleModelFailure(error)) {
      const candidate = error as {
        code?: string;
        message?: string;
      };

      console.error(
        `DB_ROLE_MODEL_DETAIL code=${typeof candidate.code === "string" && /^[A-Z0-9_]{2,80}$/.test(candidate.code) ? candidate.code : "UNKNOWN"}`
      );

      throw new Error("BLOCKED_ROLE_MODEL");
    }

    throw error;
  } finally {
    await sql.end({ timeout: 5 });
  }
}
