import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { loadEnvFile } from "node:process";
import { canonicalJsonSha256 } from "./validate-master-vocabulary-v2";
import { runMasterVocabularyTransform } from "./transform-master-vocabulary-v2";
import { assertCurationDatabaseAccess, configuredCurationTarget, resolveCurationTargetName, type CurationTargetName } from "./vocabulary-curation-access";
import { assertResolvedTargetBeforeMutation } from "./runtime-validation";
import { assertPostConnectIdentity, openSql, readContext } from "./db-core";
import { authorizeProductionRelease, parseProductionReleaseArgs, resolveProductionConnection, runAuthorizedProductionMutation } from "./production-release-safety";
import { applyMasterVocabularyImport, createPostgresMasterImportStore } from "./master-vocabulary-v2-import-store";
import { buildMasterVocabularyImportPlan, type ImportArtifacts, type JsonRecord, type Reconciliation } from "./master-vocabulary-v2-import-planner";

const DEFAULT_ROOT = path.join(process.cwd(), "vocabflow-dataset");
const ARTIFACT_FILES = {
  vocabulary: "import/vocabulary-import-v2.json",
  topics: "import/topics-import-v2.json",
  learningSets: "import/learning-sets-import-v2.json",
  learningSetItems: "import/learning-set-items-import-v2.json",
  topicMemberships: "import/topic-memberships-import-v2.json",
  reconciliation: "import/mappings/runtime-reconciliation-v2.json",
} as const;

type CliOptions = {
  apply: boolean;
  target?: CurationTargetName;
  confirmTarget?: string;
  confirmBranch?: string;
  planFingerprint?: string;
  reportPath?: string;
  datasetRoot: string;
};

function parseArgs(args: readonly string[]): CliOptions {
  let apply = false;
  let target: CurationTargetName | undefined;
  let confirmTarget: string | undefined;
  let confirmBranch: string | undefined;
  let planFingerprint: string | undefined;
  let reportPath: string | undefined;
  let datasetRoot = DEFAULT_ROOT;
  const seen = new Set<string>();
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index]!;
    if (seen.has(flag)) throw new Error("CLI_ARGUMENT_INVALID");
    seen.add(flag);
    if (flag === "--apply") { apply = true; continue; }
    if (["--target", "--confirm-target", "--confirm-branch", "--plan-fingerprint", "--report", "--dataset-root"].includes(flag)) {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) throw new Error("CLI_ARGUMENT_INVALID");
      index += 1;
      if (flag === "--target") {
        if (value !== "development" && value !== "test" && value !== "production") throw new Error("CLI_ARGUMENT_INVALID");
        target = value;
      } else if (flag === "--confirm-target") confirmTarget = value;
      else if (flag === "--confirm-branch") confirmBranch = value;
      else if (flag === "--plan-fingerprint") planFingerprint = value;
      else if (flag === "--report") reportPath = path.resolve(value);
      else datasetRoot = path.resolve(value);
      continue;
    }
    throw new Error("CLI_ARGUMENT_INVALID");
  }
  if (planFingerprint && !/^[0-9a-f]{64}$/.test(planFingerprint)) throw new Error("CLI_ARGUMENT_INVALID");
  if (apply && (!target || !planFingerprint)) throw new Error("MASTER_IMPORT_APPLY_CONFIRMATIONS_REQUIRED");
  if (!apply && (confirmTarget !== undefined || confirmBranch !== undefined || planFingerprint !== undefined)) throw new Error("MASTER_IMPORT_CONFIRMATION_WITHOUT_APPLY");
  return { apply, target, confirmTarget, confirmBranch, planFingerprint, reportPath, datasetRoot };
}

function readJson(root: string, relativePath: string): JsonRecord {
  const target = path.resolve(root, relativePath);
  if (!target.startsWith(`${path.resolve(root)}${path.sep}`)) throw new Error("IMPORT_ARTIFACT_PATH_OUTSIDE_DATASET");
  let parsed: unknown;
  try { parsed = JSON.parse(readFileSync(target, "utf8")) as unknown; }
  catch { throw new Error(`IMPORT_ARTIFACT_READ_FAILED:${relativePath}`); }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error(`IMPORT_ARTIFACT_INVALID:${relativePath}`);
  return parsed as JsonRecord;
}

function loadArtifacts(root: string): { artifacts: ImportArtifacts; reconciliation: Reconciliation } {
  const artifacts: ImportArtifacts = {
    vocabulary: readJson(root, ARTIFACT_FILES.vocabulary),
    topics: readJson(root, ARTIFACT_FILES.topics),
    learningSets: readJson(root, ARTIFACT_FILES.learningSets),
    learningSetItems: readJson(root, ARTIFACT_FILES.learningSetItems),
    topicMemberships: readJson(root, ARTIFACT_FILES.topicMemberships),
  };
  const reconciliation = readJson(root, ARTIFACT_FILES.reconciliation) as unknown as Reconciliation;
  verifyAgainstMasterTransform(root, artifacts);
  return { artifacts, reconciliation };
}

function verifyAgainstMasterTransform(root: string, artifacts: ImportArtifacts) {
  const expectedMode = artifacts.vocabulary.sourceManifestStatus === "APPROVED" ? "RELEASE" : "PREVIEW";
  const expected = runMasterVocabularyTransform({ datasetRoot: root, mode: expectedMode, writeOutputs: false });
  const pairs = [
    [artifacts.vocabulary, expected.vocabulary], [artifacts.topics, expected.topics],
    [artifacts.learningSets, expected.learningSets], [artifacts.learningSetItems, expected.learningSetItems],
    [artifacts.topicMemberships, expected.topicMemberships],
  ] as const;
  if (pairs.some(([actual, regenerated]) => canonicalJsonSha256(actual) !== canonicalJsonSha256(regenerated))) {
    throw new Error("APP_IMPORT_ARTIFACT_TRANSFORM_MISMATCH");
  }
}

function loadRepositoryEnv() {
  const envPath = path.join(process.cwd(), ".env");
  if (existsSync(envPath)) {
    try { loadEnvFile(envPath); } catch { throw new Error("ENV_FILE_INVALID"); }
  }
}

function staticEligibility(artifacts: ImportArtifacts) {
  const source = artifacts.vocabulary;
  if (source.artifactVersion !== "app-import-v3" || source.mode !== "RELEASE"
      || source.importEligible !== true || source.sourceManifestStatus !== "APPROVED"
      || typeof source.sourceReleaseHash !== "string" || !/^[0-9a-f]{64}$/.test(source.sourceReleaseHash)) {
    throw new Error("IMPORT_ARTIFACT_NOT_ELIGIBLE");
  }
}

function targetRequest(options: CliOptions, mode: "dry-run" | "apply") {
  const { context, environment } = readContext();
  const targetName = resolveCurationTargetName(context, options.target);
  const target = configuredCurationTarget(targetName);
  const trustedSource = process.env.GITHUB_ACTIONS === "true" ? "github-actions" as const : "dev-launcher" as const;
  const accessRequest = {
    executionContext: context, trustedSource, vocabularyEnvironment: environment,
    databaseEnvironment: process.env.DATABASE_ENV, requestedTarget: options.target,
    resolvedTarget: target, mode, confirmTarget: options.confirmTarget, confirmBranch: options.confirmBranch,
  };
  assertCurationDatabaseAccess(accessRequest);
  return { context, environment, targetName, target, trustedSource, accessRequest };
}

async function openVerifiedRuntimeConnection(options: CliOptions, mode: "dry-run" | "apply") {
  const request = targetRequest(options, mode);
  if (request.targetName === "production") {
    const productionOptions = parseProductionReleaseArgs([
      "--target", "production",
      ...(options.confirmTarget ? ["--confirm-target", options.confirmTarget] : []),
      ...(options.confirmBranch ? ["--confirm-branch", options.confirmBranch] : []),
    ]);
    authorizeProductionRelease({ options: productionOptions, mode: mode === "apply" ? "mutation" : "read-only", environment: process.env });
    const connection = await resolveProductionConnection({ purpose: "runtime", environment: process.env });
    return { ...request, url: connection.url, verifiedTarget: connection.resolved.expected, productionOptions, close: async () => undefined };
  }
  const connection = await assertResolvedTargetBeforeMutation({
    context: request.context, source: request.trustedSource, environment: request.environment,
    purpose: "runtime", operation: mode === "apply" ? "db-enrich" : "db-check", target: request.target,
  });
  return { ...request, url: connection.url, verifiedTarget: connection.resolved.expected, productionOptions: undefined, close: async () => undefined };
}

async function connectAndVerify(options: CliOptions, mode: "dry-run" | "apply") {
  const connection = await openVerifiedRuntimeConnection(options, mode);
  const sql = openSql(connection.url);
  try {
    await assertPostConnectIdentity(sql, connection.target);
    const [identity] = await sql<{ current_user: string; session_user: string; database_name: string }[]>`
      SELECT current_user::text AS current_user, session_user::text AS session_user, current_database()::text AS database_name
    `;
    if (!identity || identity.current_user !== connection.target.roleName || identity.session_user !== connection.target.roleName
        || identity.database_name !== connection.target.databaseName) throw new Error("MASTER_IMPORT_POST_CONNECT_ROLE_MISMATCH");
    const [tables] = await sql<{ ready: boolean }[]>`
      SELECT to_regclass('vocabflow_app.master_vocabulary_mappings') IS NOT NULL
        AND to_regclass('vocabflow_app.master_topic_mappings') IS NOT NULL
        AND to_regclass('vocabflow_app.master_learning_set_mappings') IS NOT NULL AS ready
    `;
    if (tables?.ready !== true) throw new Error("MASTER_IMPORT_SCHEMA_NOT_MIGRATED");
    return { sql, connection };
  } catch (error) {
    await sql.end({ timeout: 5 });
    throw error;
  }
}

function writeReport(plan: unknown, reportPath?: string) {
  const report = `${JSON.stringify(plan, null, 2)}\n`;
  if (reportPath) writeFileSync(reportPath, report, "utf8");
  process.stdout.write(report);
}

async function main() {
  loadRepositoryEnv();
  const options = parseArgs(process.argv.slice(2));
  const { artifacts, reconciliation } = loadArtifacts(options.datasetRoot);
  if (options.apply) staticEligibility(artifacts);

  if (!options.target) {
    const plan = buildMasterVocabularyImportPlan({ artifacts, reconciliation, targetEnvironment: "NOT_CONNECTED", mode: "DRY_RUN" });
    writeReport(plan, options.reportPath);
    if (options.apply) throw new Error("MASTER_IMPORT_TARGET_REQUIRED");
    return;
  }

  const { sql, connection } = await connectAndVerify(options, options.apply ? "apply" : "dry-run");
  try {
    const store = createPostgresMasterImportStore(sql);
    if (!options.apply) {
      const snapshot = await store.readSnapshot();
      const plan = buildMasterVocabularyImportPlan({ artifacts, reconciliation, snapshot, targetEnvironment: options.target, mode: "DRY_RUN" });
      writeReport(plan, options.reportPath);
      return;
    }
    const planFingerprint = options.planFingerprint!;
    const apply = () => applyMasterVocabularyImport({
      store, artifacts, reconciliation,
      target: { environment: options.target!, branchId: connection.target.branchId },
      expectedPlanFingerprint: planFingerprint,
      newRunId: randomUUID(),
    });
    const result = connection.targetName === "production"
      ? await runAuthorizedProductionMutation({ options: connection.productionOptions!, environment: process.env }, async (confirmedTarget) => {
        if (confirmedTarget.branchId !== connection.target.branchId) throw new Error("MASTER_IMPORT_TARGET_CHANGED_AFTER_PREFLIGHT");
        return apply();
      })
      : await apply();
    writeReport({ ...result, databaseMutations: result.applied ? "COMMITTED" : "NOOP" }, options.reportPath);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

function isMain() {
  const scriptPath = process.argv[1];
  return Boolean(scriptPath && path.resolve(scriptPath) === path.resolve(fileURLToPath(import.meta.url)));
}

if (isMain()) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "";
    process.stderr.write(`${/^[A-Z][A-Z0-9_:.-]{2,120}$/.test(message) ? message : "MASTER_IMPORT_FAILED"}\n`);
    process.exitCode = 1;
  });
}
