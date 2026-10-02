import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020, { type ErrorObject, type ValidateFunction } from "ajv/dist/2020";
import addFormats from "ajv-formats";
import canonicalize from "canonicalize";

type JsonObject = Record<string, unknown>;
type Severity = "ERROR" | "WARNING" | "INFO";
type EntityType =
  | "DATASET"
  | "TAXONOMY"
  | "LEXEME"
  | "SENSE"
  | "PRONUNCIATION"
  | "TRANSLATION"
  | "DEFINITION"
  | "EXAMPLE"
  | "EXAMPLE_TRANSLATION"
  | "CLASSIFICATION"
  | "TOPIC"
  | "DOMAIN"
  | "EXAM"
  | "CURRICULUM"
  | "SCHOOL_LEVEL"
  | "DIFFICULTY_SCALE"
  | "LEARNING_SET"
  | "LEARNING_SET_ITEM"
  | "RELATION"
  | "MEDIA_ASSET"
  | "MEDIA_ASSET_VERSION"
  | "MEDIA_DELIVERY"
  | "PROVENANCE";

export interface ValidationIssue {
  code: string;
  severity: Severity;
  entityType?: EntityType;
  entityId?: string;
  recordPath?: string;
  path?: string;
  message: string;
  stage: "schema" | "cross-file" | "release";
}

export interface ValidationReport {
  schemaVersion: string;
  datasetVersion: string | null;
  validatedAt: string;
  status: "PASS" | "FAIL";
  errorCount: number;
  warningCount: number;
  infoCount: number;
  issues: ValidationIssue[];
}

export interface ValidateMasterVocabularyOptions {
  datasetRoot?: string;
  schemaRoot?: string;
  writeReport?: boolean;
  validatedAt?: string;
}

interface ArtifactPin {
  collection: string;
  entityType: EntityType;
  idField: string;
  revisionField?: string;
  schemaFile: string;
  schemaTarget?: string;
  records: JsonObject[];
}

interface LoadedArtifact {
  entityType: EntityType;
  recordPath: string;
  data: JsonObject;
  pins: JsonObject[];
}

interface EntityRecord {
  entityType: EntityType;
  id: string;
  data: JsonObject;
  recordPath: string;
  path: string;
  scope?: string;
}

interface TaxonomyContext {
  id: string;
  version: string;
  recordPath: string;
  data: JsonObject;
  topics: JsonObject[];
  domains: JsonObject[];
  exams: JsonObject[];
  curricula: JsonObject[];
  schoolLevels: JsonObject[];
  difficultyScales: JsonObject[];
  cefrFrameworks: JsonObject[];
}

const SCHEMA_FILES = [
  "common.schema.json",
  "dataset.schema.json",
  "lexeme.schema.json",
  "sense.schema.json",
  "taxonomy.schema.json",
  "learning-set.schema.json",
  "media-asset.schema.json",
  "provenance.schema.json",
] as const;

const PIN_CONFIG: ArtifactPin[] = [
  { collection: "includedLexemes", entityType: "LEXEME", idField: "masterLexemeId", revisionField: "lexemeRevision", schemaFile: "lexeme.schema.json", records: [] },
  { collection: "includedSenses", entityType: "SENSE", idField: "masterSenseId", revisionField: "senseRevision", schemaFile: "sense.schema.json", records: [] },
  { collection: "includedClassifications", entityType: "CLASSIFICATION", idField: "classificationId", revisionField: "classificationRevision", schemaFile: "common.schema.json", schemaTarget: "#/$defs/classification", records: [] },
  { collection: "includedLearningSets", entityType: "LEARNING_SET", idField: "learningSetId", revisionField: "learningSetRevision", schemaFile: "learning-set.schema.json", records: [] },
  { collection: "includedTaxonomySnapshots", entityType: "TAXONOMY", idField: "taxonomyId", revisionField: "taxonomyVersion", schemaFile: "taxonomy.schema.json", records: [] },
  { collection: "includedMediaAssetVersions", entityType: "MEDIA_ASSET", idField: "mediaAssetId", revisionField: "mediaAssetVersion", schemaFile: "media-asset.schema.json", records: [] },
  { collection: "includedRelations", entityType: "RELATION", idField: "relationId", revisionField: "relationRevision", schemaFile: "common.schema.json", schemaTarget: "#/$defs/relation", records: [] },
  { collection: "includedProvenance", entityType: "PROVENANCE", idField: "provenanceId", schemaFile: "provenance.schema.json", records: [] },
];

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asObjectArray(value: unknown): JsonObject[] {
  return Array.isArray(value) ? value.filter(isObject) : [];
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

export function canonicalJsonSha256(value: unknown): string {
  const canonical = canonicalize(value);
  if (canonical === undefined) {
    throw new TypeError("Value cannot be represented by RFC 8785 JSON Canonicalization Scheme.");
  }
  return sha256(canonical);
}

function compileSchemas(schemaRoot: string): {
  validators: Map<string, ValidateFunction>;
  schemaLoadError?: string;
} {
  try {
    const ajv = new Ajv2020({ allErrors: true, strict: false, validateFormats: true });
    addFormats(ajv);
    // The Phase 1 contract has not selected an IANA registry snapshot yet.
    // Keep format assertion at the syntax level; registry membership/casing is documented as deferred.
    ajv.addFormat("language-tag", {
      type: "string",
      validate: (value: string) => /^(?:[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*|[ix]-[A-Za-z0-9]{1,8}(?:-[A-Za-z0-9]{1,8})*)$/.test(value),
    });
    const schemas = new Map<string, JsonObject>();
    for (const file of SCHEMA_FILES) {
      const schema = JSON.parse(readFileSync(path.join(schemaRoot, file), "utf8")) as JsonObject;
      schemas.set(file, schema);
      ajv.addSchema(schema);
    }
    const validators = new Map<string, ValidateFunction>();
    for (const file of SCHEMA_FILES) {
      const schemaId = stringValue(schemas.get(file)?.$id);
      if (schemaId) {
        const validate = ajv.getSchema(schemaId);
        if (validate) validators.set(file, validate);
      }
    }
    for (const target of ["classification", "relation", "pronunciation"] as const) {
      validators.set(
        `common.schema.json#/$defs/${target}`,
        ajv.compile({
          $schema: "https://json-schema.org/draft/2020-12/schema",
          $ref: `https://schemas.vocabflow.invalid/master-vocabulary/v2/common.schema.json#/$defs/${target}`,
        }),
      );
    }
    return { validators };
  } catch (error) {
    return { validators: new Map(), schemaLoadError: error instanceof Error ? error.message : String(error) };
  }
}

const schemaRegistryCache = new Map<string, ReturnType<typeof compileSchemas>>();

function cachedSchemas(schemaRoot: string): ReturnType<typeof compileSchemas> {
  const key = path.resolve(schemaRoot);
  const cached = schemaRegistryCache.get(key);
  if (cached) return cached;
  const compiled = compileSchemas(key);
  schemaRegistryCache.set(key, compiled);
  return compiled;
}

export function validateMasterVocabularyDocument(
  value: unknown,
  schemaFile: string,
  schemaTarget?: string,
  schemaRoot = path.resolve(process.cwd(), "vocabflow-dataset", "schemas"),
): { valid: boolean; issues: ValidationIssue[] } {
  const compiled = cachedSchemas(schemaRoot);
  if (compiled.schemaLoadError) {
    return { valid: false, issues: [{ code: "SCHEMA_REGISTRY_LOAD_FAILED", severity: "ERROR", stage: "schema", message: compiled.schemaLoadError }] };
  }
  const validate = compiled.validators.get(schemaTarget ? `${schemaFile}${schemaTarget}` : schemaFile);
  if (!validate) {
    return { valid: false, issues: [{ code: "SCHEMA_VALIDATOR_MISSING", severity: "ERROR", stage: "schema", message: `Schema validator for ${schemaFile}${schemaTarget ?? ""} was not registered.` }] };
  }
  const issues = schemaErrors(validate, value, {});
  return { valid: issues.length === 0, issues };
}

function schemaErrors(
  validate: ValidateFunction,
  value: unknown,
  context: { entityType?: EntityType; entityId?: string; recordPath?: string; path?: string },
): ValidationIssue[] {
  if (validate(value)) return [];
  return (validate.errors ?? []).map((error: ErrorObject) => ({
    code: "SCHEMA_VALIDATION_FAILED",
    severity: "ERROR",
    stage: "schema",
    ...context,
    path: `${context.path ?? ""}${error.instancePath || "/"}` || "/",
    message: `${error.keyword}: ${error.message ?? "schema constraint failed"}`,
  }));
}

function readJsonFile(filePath: string): JsonObject | undefined {
  try {
    const parsed: unknown = JSON.parse(readFileSync(filePath, "utf8"));
    return isObject(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function safeRecordPath(root: string, rootRealPath: string, recordPath: string): { absolutePath?: string; error?: string } {
  if (!recordPath || recordPath.includes("\\") || recordPath.includes("\0") || recordPath.startsWith("/") || /^[A-Za-z]:/.test(recordPath)) {
    return { error: "recordPath must be a package-relative path using forward slashes." };
  }
  const parts = recordPath.split("/");
  if (parts.some((part) => part === ".." || part === "." || part.length === 0)) {
    return { error: "recordPath contains a traversal or empty path segment." };
  }
  const absolutePath = path.resolve(root, ...parts);
  const relative = path.relative(root, absolutePath);
  if (!relative || relative.startsWith(`..${path.sep}`) || relative === ".." || path.isAbsolute(relative)) {
    return { error: "recordPath does not point to a file beneath the dataset package." };
  }
  if (!existsSync(absolutePath)) return { absolutePath, error: "Pinned artifact does not exist." };
  try {
    const realPath = realpathSync(absolutePath);
    const realRelative = path.relative(rootRealPath, realPath);
    if (!realRelative || realRelative.startsWith(`..${path.sep}`) || realRelative === ".." || path.isAbsolute(realRelative)) {
      return { absolutePath, error: "Pinned artifact resolves outside the dataset package." };
    }
    return { absolutePath };
  } catch {
    return { absolutePath, error: "Pinned artifact cannot be resolved." };
  }
}

function pinKey(pin: JsonObject, idField: string, revisionField?: string): string {
  return `${String(pin[idField] ?? "<missing>")}@${revisionField ? String(pin[revisionField] ?? "<missing>") : "immutable"}`;
}

export function validateMasterVocabularyV2(
  options: ValidateMasterVocabularyOptions = {},
): ValidationReport {
  const datasetRoot = path.resolve(options.datasetRoot ?? path.join(process.cwd(), "vocabflow-dataset"));
  const schemaRoot = path.resolve(options.schemaRoot ?? path.join(process.cwd(), "vocabflow-dataset", "schemas"));
  const issues: ValidationIssue[] = [];
  const artifacts: LoadedArtifact[] = [];
  let manifest: JsonObject | undefined;
  let datasetVersion: string | null = null;
  let rootRealPath: string | undefined;

  try {
    rootRealPath = realpathSync(datasetRoot);
  } catch {
    issues.push({ code: "DATASET_ROOT_MISSING", severity: "ERROR", stage: "release", entityType: "DATASET", message: "Dataset package directory does not exist." });
  }

  const compiled = cachedSchemas(schemaRoot);
  if (compiled.schemaLoadError) {
    issues.push({ code: "SCHEMA_REGISTRY_LOAD_FAILED", severity: "ERROR", stage: "schema", message: compiled.schemaLoadError });
  }

  const manifestPath = path.join(datasetRoot, "dataset.json");
  if (existsSync(manifestPath)) {
    manifest = readJsonFile(manifestPath);
  }
  if (!manifest) {
    issues.push({ code: "DATASET_MANIFEST_UNREADABLE", severity: "ERROR", stage: "release", entityType: "DATASET", recordPath: "dataset.json", message: "dataset.json is missing, invalid JSON, or not an object." });
  } else {
    datasetVersion = stringValue(manifest.datasetVersion) ?? null;
    const schemaValidate = compiled.validators.get("dataset.schema.json");
    if (!schemaValidate) {
      issues.push({ code: "SCHEMA_VALIDATOR_MISSING", severity: "ERROR", stage: "schema", entityType: "DATASET", recordPath: "dataset.json", message: "Dataset schema validator was not registered." });
    } else {
      issues.push(...schemaErrors(schemaValidate, manifest, { entityType: "DATASET", entityId: stringValue(manifest.datasetId), recordPath: "dataset.json" }));
    }
  }

  // Do not dereference an invalid manifest: it is the sole release boundary.
  const hasManifestSchemaError = issues.some((issue) => issue.stage === "schema" && issue.recordPath === "dataset.json");
  if (manifest && !hasManifestSchemaError && !compiled.schemaLoadError && rootRealPath) {
    const seenPins = new Map<string, { path: string; hash: string }>();
    const parsedArtifacts = new Map<string, LoadedArtifact>();
    for (const config of PIN_CONFIG) {
      const pins = asObjectArray(manifest[config.collection]);
      for (let index = 0; index < pins.length; index += 1) {
        const pin = pins[index];
        const recordPath = stringValue(pin.recordPath) ?? "";
        const pinPath = `/${config.collection}/${index}/recordPath`;
        const entityId = stringValue(pin[config.idField]);
        const idKey = pinKey(pin, config.idField, config.revisionField);
        const previous = seenPins.get(`${config.entityType}:${idKey}`);
        const pinHash = stringValue(pin.contentHash) ?? "";
        if (previous) {
          issues.push({
            code: "PIN_CONFLICT",
            severity: "ERROR",
            stage: "release",
            entityType: config.entityType,
            entityId,
            recordPath,
            path: pinPath,
            message: "The same entity revision points to conflicting paths or content hashes.",
          });
        } else {
          seenPins.set(`${config.entityType}:${idKey}`, { path: recordPath, hash: pinHash });
        }

        const safePath = safeRecordPath(datasetRoot, rootRealPath, recordPath);
        if (safePath.error || !safePath.absolutePath) {
          issues.push({ code: safePath.error === "Pinned artifact does not exist." ? "PIN_ARTIFACT_MISSING" : "PIN_PATH_INVALID", severity: "ERROR", stage: "release", entityType: config.entityType, entityId, recordPath: recordPath || undefined, path: pinPath, message: safePath.error ?? "Pinned artifact path is invalid." });
          continue;
        }

        const parsed = readJsonFile(safePath.absolutePath);
        if (!parsed) {
          issues.push({ code: "PIN_ARTIFACT_UNREADABLE", severity: "ERROR", stage: "release", entityType: config.entityType, entityId, recordPath, path: pinPath, message: "Pinned artifact is invalid JSON or not an object." });
          continue;
        }

        const schemaValidate = compiled.validators.get(config.schemaTarget ? `${config.schemaFile}${config.schemaTarget}` : config.schemaFile);
        if (!schemaValidate) {
          issues.push({ code: "SCHEMA_VALIDATOR_MISSING", severity: "ERROR", stage: "schema", entityType: config.entityType, entityId, recordPath, message: `Schema validator for ${config.schemaFile} was not registered.` });
        } else {
          issues.push(...schemaErrors(schemaValidate, parsed, { entityType: config.entityType, entityId, recordPath }));
        }

        const actualId = stringValue(parsed[config.idField]);
        if (actualId !== entityId) {
          issues.push({ code: "PIN_ID_MISMATCH", severity: "ERROR", stage: "release", entityType: config.entityType, entityId, recordPath, path: `/${config.idField}`, message: `Artifact ${config.idField} does not match the manifest pin.` });
        }
        if (config.revisionField) {
          const actualRevision = config.entityType === "MEDIA_ASSET"
            ? asObjectArray(parsed.versions).find((version) => version.mediaAssetVersion === pin.mediaAssetVersion)?.mediaAssetVersion
            : parsed[config.revisionField];
          if (actualRevision !== pin[config.revisionField]) {
            issues.push({ code: "PIN_REVISION_MISMATCH", severity: "ERROR", stage: "release", entityType: config.entityType, entityId, recordPath, path: `/${config.revisionField}`, message: `Artifact ${config.revisionField} does not match the manifest pin.` });
          }
        }
        try {
          const actualHash = canonicalJsonSha256(parsed);
          if (actualHash !== pinHash) {
            issues.push({ code: "CONTENT_HASH_MISMATCH", severity: "ERROR", stage: "release", entityType: config.entityType, entityId, recordPath, path: "/contentHash", message: "Pinned contentHash does not match the RFC 8785 canonical record hash." });
          }
        } catch (error) {
          issues.push({ code: "CANONICAL_HASH_FAILED", severity: "ERROR", stage: "release", entityType: config.entityType, entityId, recordPath, message: error instanceof Error ? error.message : String(error) });
        }

        if (config.entityType === "MEDIA_ASSET") {
          const pinnedVersion = asObjectArray(parsed.versions).find((version) => version.mediaAssetVersion === pin.mediaAssetVersion);
          if (!pinnedVersion) {
            issues.push({ code: "PIN_MEDIA_VERSION_MISSING", severity: "ERROR", stage: "release", entityType: "MEDIA_ASSET", entityId, recordPath, path: "/versions", message: "The pinned mediaAssetVersion is absent from the pinned asset record." });
          } else if (pinnedVersion.sha256 !== pin.sha256) {
            issues.push({ code: "PIN_MEDIA_HASH_MISMATCH", severity: "ERROR", stage: "release", entityType: "MEDIA_ASSET_VERSION", entityId: `${entityId}@${String(pin.mediaAssetVersion)}`, recordPath, path: "/versions", message: "Manifest byte SHA-256 does not match the pinned media version." });
          }
          if (manifest.status === "APPROVED" && (parsed.status !== "APPROVED" || pinnedVersion?.status !== "APPROVED")) {
            issues.push({ code: "APPROVED_RELEASE_MEDIA_NOT_APPROVED", severity: "ERROR", stage: "cross-file", entityType: "MEDIA_ASSET", entityId, recordPath, path: "/versions", message: "An APPROVED release may pin only an APPROVED media slot and media version." });
          }
        }

        const parsedKey = `${config.entityType}:${recordPath}`;
        const existing = parsedArtifacts.get(parsedKey);
        if (existing) {
          existing.pins.push(pin);
        } else {
          const loaded: LoadedArtifact = { entityType: config.entityType, recordPath, data: parsed, pins: [pin] };
          parsedArtifacts.set(parsedKey, loaded);
          artifacts.push(loaded);
        }
      }
    }

    const releaseHash = stringValue(manifest.releaseHash);
    if (releaseHash) {
      const manifestForHash = { ...manifest };
      delete manifestForHash.releaseHash;
      try {
        if (canonicalJsonSha256(manifestForHash) !== releaseHash) {
          issues.push({ code: "RELEASE_HASH_MISMATCH", severity: "ERROR", stage: "release", entityType: "DATASET", entityId: stringValue(manifest.datasetId), recordPath: "dataset.json", path: "/releaseHash", message: "releaseHash does not match the JCS hash of dataset.json with releaseHash omitted." });
        }
      } catch (error) {
        issues.push({ code: "CANONICAL_HASH_FAILED", severity: "ERROR", stage: "release", entityType: "DATASET", recordPath: "dataset.json", path: "/releaseHash", message: error instanceof Error ? error.message : String(error) });
      }
    }

    if (manifest.status === "DRAFT") {
      issues.push({ code: "DRAFT_WORKING_DATASET", severity: "INFO", stage: "release", entityType: "DATASET", entityId: stringValue(manifest.datasetId), recordPath: "dataset.json", message: "DRAFT validation checks every declared pin and reference but does not require publication approval or a release hash." });
    }
    issues.push(...validateSemanticGraph(manifest, artifacts));
  }

  const sortedIssues = issues.sort((a, b) =>
    (a.recordPath ?? "").localeCompare(b.recordPath ?? "") ||
    (a.path ?? "").localeCompare(b.path ?? "") ||
    a.code.localeCompare(b.code) ||
    (a.entityType ?? "").localeCompare(b.entityType ?? "") ||
    (a.entityId ?? "").localeCompare(b.entityId ?? "") ||
    a.message.localeCompare(b.message),
  );
  const report: ValidationReport = {
    schemaVersion: stringValue(manifest?.schemaVersion) ?? "2.0.0",
    datasetVersion,
    validatedAt: options.validatedAt ?? new Date().toISOString(),
    status: sortedIssues.some((issue) => issue.severity === "ERROR") ? "FAIL" : "PASS",
    errorCount: sortedIssues.filter((issue) => issue.severity === "ERROR").length,
    warningCount: sortedIssues.filter((issue) => issue.severity === "WARNING").length,
    infoCount: sortedIssues.filter((issue) => issue.severity === "INFO").length,
    issues: sortedIssues,
  };

  if (options.writeReport !== false) {
    const outputPath = path.join(datasetRoot, "reports", "validation-report.json");
    try {
      mkdirSync(path.dirname(outputPath), { recursive: true });
      writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    } catch (error) {
      report.status = "FAIL";
      report.errorCount += 1;
      report.issues.push({ code: "REPORT_WRITE_FAILED", severity: "ERROR", stage: "release", recordPath: "reports/validation-report.json", message: error instanceof Error ? error.message : String(error) });
    }
  }
  return report;
}

function validateSemanticGraph(manifest: JsonObject, artifacts: LoadedArtifact[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const registry = new Map<EntityType, Map<string, EntityRecord>>();
  const taxonomyContexts: TaxonomyContext[] = [];
  const provenanceReferences: Array<{ ids: unknown; entityType: EntityType; entityId?: string; recordPath: string; path: string; required: boolean }> = [];
  const classifications: EntityRecord[] = [];
  const mediaAssets: EntityRecord[] = [];
  const learningSets: EntityRecord[] = [];
  const relations: EntityRecord[] = [];
  const pronunciations: EntityRecord[] = [];
  const examples: EntityRecord[] = [];

  function entities(type: EntityType): Map<string, EntityRecord> {
    let map = registry.get(type);
    if (!map) {
      map = new Map();
      registry.set(type, map);
    }
    return map;
  }

  function addEntity(type: EntityType, idValue: unknown, data: JsonObject, recordPath: string, atPath: string, scope?: string): EntityRecord | undefined {
    const id = stringValue(idValue);
    if (!id) return undefined;
    const map = entities(type);
    const previous = map.get(id);
    if (previous) {
      issues.push({ code: "DUPLICATE_ENTITY_ID", severity: "ERROR", stage: "cross-file", entityType: type, entityId: id, recordPath, path: atPath, message: `ID is already registered for this entity type at ${previous.recordPath}${previous.path}.` });
      return previous;
    }
    const record: EntityRecord = { entityType: type, id, data, recordPath, path: atPath, scope };
    map.set(id, record);
    return record;
  }

  function addProvenanceRefs(ids: unknown, type: EntityType, id: unknown, recordPath: string, atPath: string, required = false): void {
    const entityId = stringValue(id);
    if (required && !asObjectArray(ids).length && !(Array.isArray(ids) && ids.length > 0)) {
      issues.push({ code: "APPROVED_PROVENANCE_MISSING", severity: "ERROR", stage: "cross-file", entityType: type, entityId, recordPath, path: atPath, message: "Approved content requires at least one Provenance reference under the current contract." });
    }
    provenanceReferences.push({ ids, entityType: type, entityId, recordPath, path: atPath, required });
  }

  function checkReference(
    expectedType: EntityType,
    idValue: unknown,
    context: { entityType?: EntityType; entityId?: string; recordPath: string; path: string; code?: string },
  ): EntityRecord | undefined {
    const id = stringValue(idValue);
    if (!id) return undefined;
    const expected = entities(expectedType).get(id);
    if (expected) return expected;
    const foundType = [...registry.entries()].find(([type, values]) => type !== expectedType && values.has(id))?.[0];
    issues.push({
      code: context.code ?? (foundType ? "REFERENCE_TYPE_MISMATCH" : "REFERENCE_DANGLING"),
      severity: "ERROR",
      stage: "cross-file",
      entityType: context.entityType,
      entityId: context.entityId,
      recordPath: context.recordPath,
      path: context.path,
      message: foundType
        ? `Reference expects ${expectedType} but ID resolves as ${foundType}.`
        : `Reference does not resolve to a pinned ${expectedType}.`,
    });
    return undefined;
  }

  const datasetId = stringValue(manifest.datasetId);
  if (datasetId) addEntity("DATASET", datasetId, manifest, "dataset.json", "/datasetId");

  for (const artifact of artifacts) {
    const root = artifact.data;
    const rootPath = artifact.recordPath;
    switch (artifact.entityType) {
      case "LEXEME": {
        addEntity("LEXEME", root.masterLexemeId, root, rootPath, "");
        for (const [index, pronunciation] of asObjectArray(root.pronunciations).entries()) {
          addEntity("PRONUNCIATION", pronunciation.pronunciationId, pronunciation, rootPath, `/pronunciations/${index}`);
          pronunciations.push({ entityType: "PRONUNCIATION", id: stringValue(pronunciation.pronunciationId) ?? "", data: pronunciation, recordPath: rootPath, path: `/pronunciations/${index}` });
          if (pronunciation.masterLexemeId !== root.masterLexemeId) {
            issues.push({ code: "LINGUISTIC_CHILD_OWNER_MISMATCH", severity: "ERROR", stage: "cross-file", entityType: "PRONUNCIATION", entityId: stringValue(pronunciation.pronunciationId), recordPath: rootPath, path: `/pronunciations/${index}/masterLexemeId`, message: "Lexeme-owned Pronunciation must name the containing Lexeme as its owner." });
          }
        }
        for (const [index, alias] of asObjectArray(root.aliases).entries()) {
          addProvenanceRefs(alias.provenanceIds, "LEXEME", root.masterLexemeId, rootPath, `/aliases/${index}/provenanceIds`);
        }
        break;
      }
      case "SENSE": {
        addEntity("SENSE", root.masterSenseId, root, rootPath, "");
        addProvenanceRefs(root.provenanceIds, "SENSE", root.masterSenseId, rootPath, "/provenanceIds");
        for (const [index, translation] of asObjectArray(root.translations).entries()) {
          addEntity("TRANSLATION", translation.translationId, translation, rootPath, `/translations/${index}`);
          if (translation.masterSenseId !== root.masterSenseId) issues.push({ code: "LINGUISTIC_CHILD_OWNER_MISMATCH", severity: "ERROR", stage: "cross-file", entityType: "TRANSLATION", entityId: stringValue(translation.translationId), recordPath: rootPath, path: `/translations/${index}/masterSenseId`, message: "Translation must name the containing Sense as its owner." });
          addProvenanceRefs(translation.provenanceIds, "TRANSLATION", translation.translationId, rootPath, `/translations/${index}/provenanceIds`);
        }
        for (const [index, definition] of asObjectArray(root.definitions).entries()) {
          addEntity("DEFINITION", definition.definitionId, definition, rootPath, `/definitions/${index}`);
          if (definition.masterSenseId !== root.masterSenseId) issues.push({ code: "LINGUISTIC_CHILD_OWNER_MISMATCH", severity: "ERROR", stage: "cross-file", entityType: "DEFINITION", entityId: stringValue(definition.definitionId), recordPath: rootPath, path: `/definitions/${index}/masterSenseId`, message: "Definition must name the containing Sense as its owner." });
          addProvenanceRefs(definition.provenanceIds, "DEFINITION", definition.definitionId, rootPath, `/definitions/${index}/provenanceIds`);
        }
        for (const [index, example] of asObjectArray(root.examples).entries()) {
          addEntity("EXAMPLE", example.exampleId, example, rootPath, `/examples/${index}`);
          if (example.masterSenseId !== root.masterSenseId) issues.push({ code: "LINGUISTIC_CHILD_OWNER_MISMATCH", severity: "ERROR", stage: "cross-file", entityType: "EXAMPLE", entityId: stringValue(example.exampleId), recordPath: rootPath, path: `/examples/${index}/masterSenseId`, message: "Example must name the containing Sense as its owner." });
          examples.push({ entityType: "EXAMPLE", id: stringValue(example.exampleId) ?? "", data: example, recordPath: rootPath, path: `/examples/${index}` });
          addProvenanceRefs(example.provenanceIds, "EXAMPLE", example.exampleId, rootPath, `/examples/${index}/provenanceIds`);
          for (const [translationIndex, translation] of asObjectArray(example.exampleTranslations).entries()) {
            addEntity("EXAMPLE_TRANSLATION", translation.exampleTranslationId, translation, rootPath, `/examples/${index}/exampleTranslations/${translationIndex}`);
            if (translation.exampleId !== example.exampleId) issues.push({ code: "LINGUISTIC_CHILD_OWNER_MISMATCH", severity: "ERROR", stage: "cross-file", entityType: "EXAMPLE_TRANSLATION", entityId: stringValue(translation.exampleTranslationId), recordPath: rootPath, path: `/examples/${index}/exampleTranslations/${translationIndex}/exampleId`, message: "Example Translation must name the containing Example as its owner." });
            addProvenanceRefs(translation.provenanceIds, "EXAMPLE_TRANSLATION", translation.exampleTranslationId, rootPath, `/examples/${index}/exampleTranslations/${translationIndex}/provenanceIds`);
          }
        }
        for (const [index, pronunciation] of asObjectArray(root.pronunciationOverrides).entries()) {
          addEntity("PRONUNCIATION", pronunciation.pronunciationId, pronunciation, rootPath, `/pronunciationOverrides/${index}`);
          if (pronunciation.masterSenseId !== root.masterSenseId) issues.push({ code: "LINGUISTIC_CHILD_OWNER_MISMATCH", severity: "ERROR", stage: "cross-file", entityType: "PRONUNCIATION", entityId: stringValue(pronunciation.pronunciationId), recordPath: rootPath, path: `/pronunciationOverrides/${index}/masterSenseId`, message: "Sense-owned Pronunciation must name the containing Sense as its owner." });
          pronunciations.push({ entityType: "PRONUNCIATION", id: stringValue(pronunciation.pronunciationId) ?? "", data: pronunciation, recordPath: rootPath, path: `/pronunciationOverrides/${index}` });
        }
        break;
      }
      case "CLASSIFICATION": {
        const record = addEntity("CLASSIFICATION", root.classificationId, root, rootPath, "");
        if (record) classifications.push(record);
        addProvenanceRefs(root.sourceProvenanceIds, "CLASSIFICATION", root.classificationId, rootPath, "/sourceProvenanceIds", root.status === "APPROVED" && (root.dimension === "CEFR" || root.dimension === "EXAM" || root.dimension === "SCHOOL_LEVEL"));
        break;
      }
      case "LEARNING_SET": {
        const record = addEntity("LEARNING_SET", root.learningSetId, root, rootPath, "");
        if (record) learningSets.push(record);
        addProvenanceRefs(root.selectionProvenanceIds, "LEARNING_SET", root.learningSetId, rootPath, "/selectionProvenanceIds");
        for (const [index, item] of asObjectArray(root.items).entries()) {
          addEntity("LEARNING_SET_ITEM", item.learningSetItemId, item, rootPath, `/items/${index}`);
          if (item.addedByProvenanceId) addProvenanceRefs([item.addedByProvenanceId], "LEARNING_SET_ITEM", item.learningSetItemId, rootPath, `/items/${index}/addedByProvenanceId`);
        }
        break;
      }
      case "TAXONOMY": {
        const scope = `${String(root.taxonomyId)}@${String(root.taxonomyVersion)}`;
        addEntity("TAXONOMY", root.taxonomyId, root, rootPath, "/taxonomyId", scope);
        const context: TaxonomyContext = {
          id: stringValue(root.taxonomyId) ?? "",
          version: stringValue(root.taxonomyVersion) ?? "",
          recordPath: rootPath,
          data: root,
          topics: asObjectArray(root.topics),
          domains: asObjectArray(root.domains),
          exams: asObjectArray(root.exams),
          curricula: asObjectArray(root.curricula),
          schoolLevels: asObjectArray(root.schoolLevels),
          difficultyScales: asObjectArray(root.difficultyScales),
          cefrFrameworks: asObjectArray(root.cefrFrameworks),
        };
        taxonomyContexts.push(context);
        registerTaxonomyEntities(context, addEntity, issues);
        break;
      }
      case "MEDIA_ASSET": {
        const record = addEntity("MEDIA_ASSET", root.mediaAssetId, root, rootPath, "");
        if (record) mediaAssets.push(record);
        for (const [index, version] of asObjectArray(root.versions).entries()) {
          const id = `${String(version.mediaAssetId)}@${String(version.mediaAssetVersion)}`;
          addEntity("MEDIA_ASSET_VERSION", id, version, rootPath, `/versions/${index}`);
        }
        for (const [index, delivery] of asObjectArray(root.deliveries).entries()) {
          addEntity("MEDIA_DELIVERY", delivery.deliveryId, delivery, rootPath, `/deliveries/${index}`);
        }
        break;
      }
      case "RELATION": {
        const record = addEntity("RELATION", root.relationId, root, rootPath, "");
        if (record) relations.push(record);
        addProvenanceRefs(root.provenanceIds, "RELATION", root.relationId, rootPath, "/provenanceIds", root.status === "APPROVED");
        break;
      }
      case "PROVENANCE":
        addEntity("PROVENANCE", root.provenanceId, root, rootPath, "");
        break;
    }
  }

  // Taxonomy lineage is a versioned snapshot boundary: one exact version per taxonomy in a release.
  const taxonomyPinsById = new Map<string, Set<string>>();
  for (const context of taxonomyContexts) {
    const versions = taxonomyPinsById.get(context.id) ?? new Set<string>();
    versions.add(context.version);
    taxonomyPinsById.set(context.id, versions);
  }
  for (const [id, versions] of taxonomyPinsById) {
    if (versions.size > 1) issues.push({ code: "TAXONOMY_VERSION_CONFLICT", severity: "ERROR", stage: "cross-file", entityType: "TAXONOMY", entityId: id, message: "A release may pin only one immutable snapshot version for the same taxonomy ID." });
  }

  const approvedRelease = manifest.status === "APPROVED";
  for (const artifact of artifacts) {
    if (approvedRelease) {
      const root = artifact.data;
      const expectedApproved = artifact.entityType === "LEXEME" || artifact.entityType === "SENSE" || artifact.entityType === "CLASSIFICATION" || artifact.entityType === "LEARNING_SET" || artifact.entityType === "RELATION";
      if (expectedApproved && root.status !== "APPROVED") {
        issues.push({ code: "APPROVED_RELEASE_CONTENT_NOT_APPROVED", severity: "ERROR", stage: "cross-file", entityType: artifact.entityType, entityId: entityIdForArtifact(artifact), recordPath: artifact.recordPath, path: "/status", message: "An APPROVED release cannot publish a pinned learner-facing record whose status is not APPROVED." });
      }
      if (artifact.entityType === "TAXONOMY" && root.status !== "APPROVED") {
        issues.push({ code: "APPROVED_RELEASE_TAXONOMY_NOT_APPROVED", severity: "ERROR", stage: "cross-file", entityType: "TAXONOMY", entityId: stringValue(root.taxonomyId), recordPath: artifact.recordPath, path: "/status", message: "An APPROVED release requires its pinned taxonomy snapshot to be APPROVED." });
      }
    }
  }

  for (const record of entities("SENSE").values()) {
    const lexemeId = record.data.masterLexemeId;
    checkReference("LEXEME", lexemeId, { entityType: "SENSE", entityId: record.id, recordPath: record.recordPath, path: `${record.path}/masterLexemeId` });
    if (record.data.status === "MERGED") checkReference("SENSE", record.data.mergedIntoSenseId, { entityType: "SENSE", entityId: record.id, recordPath: record.recordPath, path: `${record.path}/mergedIntoSenseId` });
  }
  for (const record of entities("LEXEME").values()) {
    if (record.data.status === "MERGED") checkReference("LEXEME", record.data.mergedIntoLexemeId, { entityType: "LEXEME", entityId: record.id, recordPath: record.recordPath, path: `${record.path}/mergedIntoLexemeId` });
  }

  const childTypes: Array<[EntityType, string, EntityType]> = [
    ["TRANSLATION", "masterSenseId", "SENSE"],
    ["DEFINITION", "masterSenseId", "SENSE"],
    ["EXAMPLE", "masterSenseId", "SENSE"],
  ];
  for (const [childType, ownerField, ownerType] of childTypes) {
    for (const record of entities(childType).values()) checkReference(ownerType, record.data[ownerField], { entityType: childType, entityId: record.id, recordPath: record.recordPath, path: `${record.path}/${ownerField}` });
  }
  for (const record of entities("EXAMPLE_TRANSLATION").values()) checkReference("EXAMPLE", record.data.exampleId, { entityType: "EXAMPLE_TRANSLATION", entityId: record.id, recordPath: record.recordPath, path: `${record.path}/exampleId` });

  for (const record of pronunciations) {
    const data = record.data;
    const ownerLexemeId = stringValue(data.masterLexemeId);
    let resolvedLexemeId = ownerLexemeId;
    if (data.masterSenseId) {
      const sense = checkReference("SENSE", data.masterSenseId, { entityType: "PRONUNCIATION", entityId: record.id, recordPath: record.recordPath, path: `${record.path}/masterSenseId` });
      resolvedLexemeId = sense ? stringValue(sense.data.masterLexemeId) : undefined;
      if (resolvedLexemeId) checkReference("LEXEME", resolvedLexemeId, { entityType: "PRONUNCIATION", entityId: record.id, recordPath: record.recordPath, path: `${record.path}/masterSenseId` });
    } else if (ownerLexemeId) {
      checkReference("LEXEME", ownerLexemeId, { entityType: "PRONUNCIATION", entityId: record.id, recordPath: record.recordPath, path: `${record.path}/masterLexemeId` });
    }
    if (data.audioAssetId) {
      const asset = checkReference("MEDIA_ASSET", data.audioAssetId, { entityType: "PRONUNCIATION", entityId: record.id, recordPath: record.recordPath, path: `${record.path}/audioAssetId` });
      if (asset && (asset.data.mediaKind !== "WORD_PRONUNCIATION_AUDIO" || asset.data.targetEntityType !== (data.masterSenseId ? "SENSE" : "LEXEME") || asset.data.targetId !== (data.masterSenseId ?? resolvedLexemeId))) {
        issues.push({ code: "PRONUNCIATION_AUDIO_MISMATCH", severity: "ERROR", stage: "cross-file", entityType: "PRONUNCIATION", entityId: record.id, recordPath: record.recordPath, path: `${record.path}/audioAssetId`, message: "Pronunciation audio must be a word-pronunciation asset targeted to the same owner and owner type." });
      } else if (asset && data.status === "APPROVED") {
        const currentVersion = asObjectArray(asset.data.versions).find((version) => version.mediaAssetVersion === asset.data.currentMediaAssetVersion);
        if (currentVersion?.locale && currentVersion.locale !== data.locale) {
          issues.push({ code: "PRONUNCIATION_AUDIO_MISMATCH", severity: "ERROR", stage: "cross-file", entityType: "PRONUNCIATION", entityId: record.id, recordPath: record.recordPath, path: `${record.path}/audioAssetId`, message: "Selected word-audio locale must match the approved Pronunciation locale." });
        }
        if (currentVersion?.accentCode && data.accentCode && currentVersion.accentCode !== data.accentCode) {
          issues.push({ code: "PRONUNCIATION_AUDIO_MISMATCH", severity: "ERROR", stage: "cross-file", entityType: "PRONUNCIATION", entityId: record.id, recordPath: record.recordPath, path: `${record.path}/audioAssetId`, message: "Selected word-audio accentCode must match the approved Pronunciation when both are specified." });
        }
      }
    }
  }

  for (const record of entities("CLASSIFICATION").values()) {
    const data = record.data;
    checkReference("SENSE", data.masterSenseId, { entityType: "CLASSIFICATION", entityId: record.id, recordPath: record.recordPath, path: `${record.path}/masterSenseId` });
    const dimension = stringValue(data.dimension);
    let expectedType: EntityType | undefined;
    if (dimension === "TOPIC") expectedType = "TOPIC";
    if (dimension === "DOMAIN") expectedType = "DOMAIN";
    if (dimension === "EXAM") expectedType = "EXAM";
    if (dimension === "SCHOOL_LEVEL") expectedType = "SCHOOL_LEVEL";
    if (expectedType) {
      const target = checkReference(expectedType, data.valueRef, { entityType: "CLASSIFICATION", entityId: record.id, recordPath: record.recordPath, path: `${record.path}/valueRef` });
      if (approvedRelease && target?.data.status === "RETIRED") {
        issues.push({ code: "RETIRED_TAXONOMY_REFERENCE", severity: "ERROR", stage: "cross-file", entityType: "CLASSIFICATION", entityId: record.id, recordPath: record.recordPath, path: `${record.path}/valueRef`, message: "An APPROVED release cannot newly assign a retired taxonomy entity." });
      }
      if (dimension === "SCHOOL_LEVEL" && target) {
        const curriculum = checkReference("CURRICULUM", target.data.curriculumId, { entityType: "SCHOOL_LEVEL", entityId: stringValue(target.data.schoolLevelId), recordPath: target.recordPath, path: `${target.path}/curriculumId` });
        if (approvedRelease && curriculum?.data.status === "RETIRED") {
          issues.push({ code: "RETIRED_TAXONOMY_REFERENCE", severity: "ERROR", stage: "cross-file", entityType: "CURRICULUM", entityId: curriculum.id, recordPath: curriculum.recordPath, path: `${curriculum.path}/status`, message: "An APPROVED release cannot newly assign a School Level from a retired Curriculum." });
        }
      }
    }
    if (dimension === "CEFR") {
      const key = `${String(data.frameworkCode)}@${String(data.frameworkVersion)}`;
      const framework = taxonomyContexts.flatMap((context) => context.cefrFrameworks.map((candidate) => ({ context, candidate }))).find(({ candidate }) => candidate.frameworkCode === data.frameworkCode && candidate.frameworkVersion === data.frameworkVersion);
      if (!framework) {
        issues.push({ code: "CLASSIFICATION_FRAMEWORK_MISSING", severity: "ERROR", stage: "cross-file", entityType: "CLASSIFICATION", entityId: record.id, recordPath: record.recordPath, path: `${record.path}/frameworkCode`, message: `CEFR framework ${key} is not present in a pinned taxonomy snapshot.` });
      } else if ((approvedRelease || data.status === "APPROVED") && framework.candidate.status !== "ACTIVE") {
        issues.push({ code: "CLASSIFICATION_SCOPE_INACTIVE", severity: "ERROR", stage: "cross-file", entityType: "CLASSIFICATION", entityId: record.id, recordPath: record.recordPath, path: `${record.path}/frameworkCode`, message: "An approved CEFR assignment must use an active pinned framework." });
      }
    }
    if (dimension === "DIFFICULTY") {
      const scale = checkReference("DIFFICULTY_SCALE", data.scaleId, { entityType: "CLASSIFICATION", entityId: record.id, recordPath: record.recordPath, path: `${record.path}/scaleId` });
      if (scale && (approvedRelease || data.status === "APPROVED") && scale.data.status !== "ACTIVE") {
        issues.push({ code: "CLASSIFICATION_SCOPE_INACTIVE", severity: "ERROR", stage: "cross-file", entityType: "CLASSIFICATION", entityId: record.id, recordPath: record.recordPath, path: `${record.path}/scaleId`, message: "An approved Difficulty assignment must use an active pinned scale." });
      }
      if (scale?.data.scoreMethod === "EMPIRICAL_MODEL" && !scale.data.modelVersion) {
        issues.push({ code: "DIFFICULTY_MODEL_VERSION_MISSING", severity: "ERROR", stage: "cross-file", entityType: "DIFFICULTY_SCALE", entityId: scale.id, recordPath: scale.recordPath, path: `${scale.path}/modelVersion`, message: "EMPIRICAL_MODEL scales must identify their model version under the taxonomy contract." });
      }
    }
    if (dimension === "AGE_GROUP" && data.valueCode === "ALL") {
      issues.push({ code: "AGE_GROUP_ALL_NOT_STORED", severity: "ERROR", stage: "cross-file", entityType: "CLASSIFICATION", entityId: record.id, recordPath: record.recordPath, path: `${record.path}/valueCode`, message: "ALL is derived from approved KIDS, TEEN, and ADULT assignments and is not stored." });
    }
    const from = stringValue(data.validFrom);
    const to = stringValue(data.validTo);
    if (from && to && Date.parse(to) <= Date.parse(from)) {
      issues.push({ code: "CLASSIFICATION_INVALID_DATE_RANGE", severity: "ERROR", stage: "cross-file", entityType: "CLASSIFICATION", entityId: record.id, recordPath: record.recordPath, path: `${record.path}/validTo`, message: "validTo must be later than validFrom." });
    }
  }

  validateClassificationUniqueness(classifications, entities, issues);

  for (const record of learningSets) {
    const data = record.data;
    const items = asObjectArray(data.items);
    const setCode = stringValue(data.code);
    if (setCode) {
      const duplicate = [...entities("LEARNING_SET").values()].find((other) => other.id !== record.id && other.data.code === setCode);
      if (duplicate) issues.push({ code: "LEARNING_SET_CODE_DUPLICATE", severity: "ERROR", stage: "cross-file", entityType: "LEARNING_SET", entityId: record.id, recordPath: record.recordPath, path: `${record.path}/code`, message: `Learning Set code duplicates ${duplicate.id}.` });
    }
    const membership = new Map<string, JsonObject>();
    const positions = new Map<number, JsonObject>();
    for (const [index, item] of items.entries()) {
      const itemId = stringValue(item.learningSetItemId);
      if (item.learningSetId !== record.id) {
        issues.push({ code: "LEARNING_SET_ITEM_OWNER_MISMATCH", severity: "ERROR", stage: "cross-file", entityType: "LEARNING_SET_ITEM", entityId: itemId, recordPath: record.recordPath, path: `${record.path}/items/${index}/learningSetId`, message: "Learning Set Item learningSetId must match its containing revision." });
      }
      checkReference("SENSE", item.masterSenseId, { entityType: "LEARNING_SET_ITEM", entityId: itemId, recordPath: record.recordPath, path: `${record.path}/items/${index}/masterSenseId` });
      const senseId = stringValue(item.masterSenseId);
      if (senseId && membership.has(senseId)) {
        issues.push({ code: "LEARNING_SET_DUPLICATE_MEMBERSHIP", severity: "ERROR", stage: "cross-file", entityType: "LEARNING_SET_ITEM", entityId: itemId, recordPath: record.recordPath, path: `${record.path}/items/${index}/masterSenseId`, message: `Sense ${senseId} appears more than once in this Learning Set.` });
      } else if (senseId) membership.set(senseId, item);
      if (typeof item.position === "number") {
        if (positions.has(item.position)) {
          issues.push({ code: "LEARNING_SET_DUPLICATE_POSITION", severity: "ERROR", stage: "cross-file", entityType: "LEARNING_SET_ITEM", entityId: itemId, recordPath: record.recordPath, path: `${record.path}/items/${index}/position`, message: `Position ${item.position} is repeated in this Learning Set.` });
        } else positions.set(item.position, item);
      }
      if (data.status === "APPROVED") {
        const sense = entities("SENSE").get(senseId ?? "");
        if (!sense || sense.data.status !== "APPROVED" || item.status !== "APPROVED") {
          issues.push({ code: "LEARNING_SET_SENSE_NOT_ELIGIBLE", severity: "ERROR", stage: "cross-file", entityType: "LEARNING_SET_ITEM", entityId: itemId, recordPath: record.recordPath, path: `${record.path}/items/${index}`, message: "An APPROVED Learning Set can include only an APPROVED Sense and APPROVED membership." });
        }
      }
      if (item.addedByProvenanceId) checkReference("PROVENANCE", item.addedByProvenanceId, { entityType: "LEARNING_SET_ITEM", entityId: itemId, recordPath: record.recordPath, path: `${record.path}/items/${index}/addedByProvenanceId` });
    }
  }

  for (const record of mediaAssets) validateMediaAsset(record, entities, issues);

  for (const record of examples) {
    for (const [index, mediaId] of (Array.isArray(record.data.audioAssetIds) ? record.data.audioAssetIds : []).entries()) {
      const asset = checkReference("MEDIA_ASSET", mediaId, { entityType: "EXAMPLE", entityId: record.id, recordPath: record.recordPath, path: `${record.path}/audioAssetIds/${index}` });
      if (asset && (asset.data.mediaKind !== "EXAMPLE_AUDIO" || asset.data.targetEntityType !== "EXAMPLE" || asset.data.targetId !== record.id)) {
        issues.push({ code: "EXAMPLE_AUDIO_MISMATCH", severity: "ERROR", stage: "cross-file", entityType: "EXAMPLE", entityId: record.id, recordPath: record.recordPath, path: `${record.path}/audioAssetIds/${index}`, message: "Example audio must target the exact Example with mediaKind EXAMPLE_AUDIO." });
      }
    }
  }

  const symmetricEdges = new Map<string, EntityRecord>();
  for (const record of relations) {
    const data = record.data;
    const fromType = data.fromEntityType === "LEXEME" ? "LEXEME" : data.fromEntityType === "SENSE" ? "SENSE" : undefined;
    const toType = data.toEntityType === "LEXEME" ? "LEXEME" : data.toEntityType === "SENSE" ? "SENSE" : undefined;
    const from = fromType ? checkReference(fromType, data.fromId, { entityType: "RELATION", entityId: record.id, recordPath: record.recordPath, path: `${record.path}/fromId` }) : undefined;
    const to = toType ? checkReference(toType, data.toId, { entityType: "RELATION", entityId: record.id, recordPath: record.recordPath, path: `${record.path}/toId` }) : undefined;
    if (fromType && toType && fromType === toType && data.fromId === data.toId) {
      issues.push({ code: "RELATION_SELF_REFERENCE", severity: "ERROR", stage: "cross-file", entityType: "RELATION", entityId: record.id, recordPath: record.recordPath, path: `${record.path}/toId`, message: "Self-relations are prohibited by the relation contract." });
    }
    const relationType = stringValue(data.relationType);
    const directionality = stringValue(data.directionality);
    if ((relationType === "SYNONYM" || relationType === "ANTONYM") && directionality !== "SYMMETRIC") {
      issues.push({ code: "RELATION_DIRECTIONALITY_MISMATCH", severity: "ERROR", stage: "cross-file", entityType: "RELATION", entityId: record.id, recordPath: record.recordPath, path: `${record.path}/directionality`, message: `${relationType} relations must use SYMMETRIC directionality.` });
    }
    if ((relationType === "DERIVATIVE" || relationType === "VARIANT_OF") && directionality !== "DIRECTED") {
      issues.push({ code: "RELATION_DIRECTIONALITY_MISMATCH", severity: "ERROR", stage: "cross-file", entityType: "RELATION", entityId: record.id, recordPath: record.recordPath, path: `${record.path}/directionality`, message: `${relationType} relations must use DIRECTED directionality.` });
    }
    if (directionality === "SYMMETRIC" && from && to) {
      const endpointA = `${from.entityType}:${from.id}`;
      const endpointB = `${to.entityType}:${to.id}`;
      const edgeKey = `${relationType}:${[endpointA, endpointB].sort().join("|")}`;
      const previous = symmetricEdges.get(edgeKey);
      if (previous) issues.push({ code: "RELATION_SYMMETRIC_DUPLICATE", severity: "ERROR", stage: "cross-file", entityType: "RELATION", entityId: record.id, recordPath: record.recordPath, path: `${record.path}/fromId`, message: `Symmetric edge duplicates Relation ${previous.id} in canonical endpoint order.` });
      else symmetricEdges.set(edgeKey, record);
    }
  }

  for (const record of entities("PROVENANCE").values()) {
    const provenanceType = stringValue(record.data.subjectType);
    const subjectId = stringValue(record.data.subjectId);
    const typeMap: Record<string, EntityType | undefined> = {
      LEXEME: "LEXEME", SENSE: "SENSE", LINGUISTIC_CHILD: undefined,
      CLASSIFICATION: "CLASSIFICATION", RELATION: "RELATION", LEARNING_SET: "LEARNING_SET",
      MEDIA_ASSET_VERSION: "MEDIA_ASSET", TAXONOMY_RECORD: undefined,
    };
    const expected = provenanceType ? typeMap[provenanceType] : undefined;
    if (expected) {
      checkReference(expected, subjectId, { entityType: "PROVENANCE", entityId: record.id, recordPath: record.recordPath, path: `${record.path}/subjectId`, code: "PROVENANCE_SUBJECT_UNRESOLVED" });
    } else if (provenanceType === "LINGUISTIC_CHILD") {
      const childFound = ["PRONUNCIATION", "TRANSLATION", "DEFINITION", "EXAMPLE", "EXAMPLE_TRANSLATION"].some((type) => entities(type as EntityType).has(subjectId ?? ""));
      if (!childFound) issues.push({ code: "PROVENANCE_SUBJECT_UNRESOLVED", severity: "ERROR", stage: "cross-file", entityType: "PROVENANCE", entityId: record.id, recordPath: record.recordPath, path: `${record.path}/subjectId`, message: "LINGUISTIC_CHILD subjectId does not resolve to a pinned linguistic child." });
    } else if (provenanceType === "MEDIA_ASSET_VERSION") {
      if (!entities("MEDIA_ASSET").has(subjectId ?? "")) issues.push({ code: "PROVENANCE_SUBJECT_UNRESOLVED", severity: "ERROR", stage: "cross-file", entityType: "PROVENANCE", entityId: record.id, recordPath: record.recordPath, path: `${record.path}/subjectId`, message: "MEDIA_ASSET_VERSION subjectId does not resolve to a pinned Media Asset." });
    } else if (provenanceType === "TAXONOMY_RECORD") {
      const taxonomyTypes: EntityType[] = ["TOPIC", "DOMAIN", "EXAM", "CURRICULUM", "SCHOOL_LEVEL", "DIFFICULTY_SCALE"];
      if (!taxonomyTypes.some((type) => entities(type).has(subjectId ?? ""))) issues.push({ code: "PROVENANCE_SUBJECT_UNRESOLVED", severity: "ERROR", stage: "cross-file", entityType: "PROVENANCE", entityId: record.id, recordPath: record.recordPath, path: `${record.path}/subjectId`, message: "TAXONOMY_RECORD subjectId does not resolve to a pinned taxonomy entity." });
    }
  }

  for (const reference of provenanceReferences) {
    const ids = Array.isArray(reference.ids) ? reference.ids : [];
    for (const [index, id] of ids.entries()) {
      checkReference("PROVENANCE", id, { entityType: reference.entityType, entityId: reference.entityId, recordPath: reference.recordPath, path: `${reference.path}/${index}` });
    }
  }

  validateNormalizedLemmaCollisions(entities("LEXEME"), issues);
  validateTaxonomyConstraints(taxonomyContexts, entities, issues);
  return issues;
}

function entityIdForArtifact(artifact: LoadedArtifact): string | undefined {
  const fields: Partial<Record<EntityType, string>> = {
    LEXEME: "masterLexemeId", SENSE: "masterSenseId", CLASSIFICATION: "classificationId", LEARNING_SET: "learningSetId", RELATION: "relationId", PROVENANCE: "provenanceId", MEDIA_ASSET: "mediaAssetId",
  };
  const field = fields[artifact.entityType];
  return field ? stringValue(artifact.data[field]) : undefined;
}

function registerTaxonomyEntities(
  context: TaxonomyContext,
  addEntity: (type: EntityType, id: unknown, data: JsonObject, recordPath: string, atPath: string, scope?: string) => EntityRecord | undefined,
  issues: ValidationIssue[],
): void {
  const scope = `${context.id}@${context.version}`;
  const collections: Array<[EntityType, string, JsonObject[]]> = [
    ["TOPIC", "topics", context.topics],
    ["DOMAIN", "domains", context.domains],
    ["EXAM", "exams", context.exams],
    ["CURRICULUM", "curricula", context.curricula],
    ["SCHOOL_LEVEL", "schoolLevels", context.schoolLevels],
    ["DIFFICULTY_SCALE", "difficultyScales", context.difficultyScales],
  ];
  const ids: Record<EntityType, string> = {
    DATASET: "", TAXONOMY: "", LEXEME: "", SENSE: "", PRONUNCIATION: "", TRANSLATION: "", DEFINITION: "", EXAMPLE: "", EXAMPLE_TRANSLATION: "", CLASSIFICATION: "", TOPIC: "topicId", DOMAIN: "domainId", EXAM: "examId", CURRICULUM: "curriculumId", SCHOOL_LEVEL: "schoolLevelId", DIFFICULTY_SCALE: "scaleId", LEARNING_SET: "", LEARNING_SET_ITEM: "", RELATION: "", MEDIA_ASSET: "", MEDIA_ASSET_VERSION: "", MEDIA_DELIVERY: "", PROVENANCE: "",
  };
  for (const [type, property, records] of collections) {
    for (const [index, item] of records.entries()) addEntity(type, item[ids[type]], item, context.recordPath, `/${property}/${index}`, scope);
  }
  const frameworkKeys = new Set<string>();
  for (const [index, framework] of context.cefrFrameworks.entries()) {
    const key = `${String(framework.frameworkCode)}@${String(framework.frameworkVersion)}`;
    if (frameworkKeys.has(key)) issues.push({ code: "TAXONOMY_FRAMEWORK_DUPLICATE", severity: "ERROR", stage: "cross-file", entityType: "TAXONOMY", entityId: context.id, recordPath: context.recordPath, path: `/cefrFrameworks/${index}`, message: `CEFR framework scope ${key} is duplicated in this taxonomy snapshot.` });
    frameworkKeys.add(key);
  }
}

function validateTaxonomyConstraints(
  contexts: TaxonomyContext[],
  entities: (type: EntityType) => Map<string, EntityRecord>,
  issues: ValidationIssue[],
): void {
  for (const context of contexts) {
    const codeGroups: Array<[EntityType, JsonObject[], string, string]> = [
      ["TOPIC", context.topics, "topicId", "code"],
      ["DOMAIN", context.domains, "domainId", "code"],
    ];
    for (const [type, rows, idField, codeField] of codeGroups) {
      const seen = new Map<string, string>();
      for (const [index, row] of rows.entries()) {
        const code = stringValue(row[codeField]);
        const id = stringValue(row[idField]);
        if (!code) continue;
        const previous = seen.get(code);
        if (previous) issues.push({ code: "TAXONOMY_CODE_DUPLICATE", severity: "ERROR", stage: "cross-file", entityType: type, entityId: id, recordPath: context.recordPath, path: `/${type === "TOPIC" ? "topics" : "domains"}/${index}/${codeField}`, message: `${type} code ${code} duplicates ${previous} in the same taxonomy namespace.` });
        else seen.set(code, id ?? "unknown");
      }
    }

    const levelCodes = new Map<string, string>();
    for (const [index, level] of context.schoolLevels.entries()) {
      const id = stringValue(level.schoolLevelId);
      const curriculumId = stringValue(level.curriculumId);
      const curriculum = context.curricula.find((item) => item.curriculumId === curriculumId);
      if (!curriculum) {
        const elsewhere = entities("CURRICULUM").has(curriculumId ?? "");
        issues.push({ code: elsewhere ? "TAXONOMY_SCOPE_MISMATCH" : "REFERENCE_DANGLING", severity: "ERROR", stage: "cross-file", entityType: "SCHOOL_LEVEL", entityId: id, recordPath: context.recordPath, path: `/schoolLevels/${index}/curriculumId`, message: elsewhere ? "School Level Curriculum must belong to the same taxonomy snapshot." : "School Level Curriculum does not resolve in a pinned taxonomy snapshot." });
      }
      const key = `${curriculumId}:${String(level.levelCode)}`;
      const previous = levelCodes.get(key);
      if (previous) issues.push({ code: "SCHOOL_LEVEL_CODE_DUPLICATE", severity: "ERROR", stage: "cross-file", entityType: "SCHOOL_LEVEL", entityId: id, recordPath: context.recordPath, path: `/schoolLevels/${index}/levelCode`, message: `levelCode duplicates School Level ${previous} within the Curriculum.` });
      else levelCodes.set(key, id ?? "unknown");
    }
    validateParentGraph(context, "topics", "topicId", "parentTopicId", "TOPIC", issues);
    validateParentGraph(context, "domains", "domainId", "parentDomainId", "DOMAIN", issues);
  }
}

function validateParentGraph(
  context: TaxonomyContext,
  collection: "topics" | "domains",
  idField: "topicId" | "domainId",
  parentField: "parentTopicId" | "parentDomainId",
  codePrefix: "TOPIC" | "DOMAIN",
  issues: ValidationIssue[],
): void {
  const records = collection === "topics" ? context.topics : context.domains;
  const byId = new Map(records.map((item) => [stringValue(item[idField]) ?? "", item]));
  const indexById = new Map(records.map((item, index) => [stringValue(item[idField]) ?? "", index]));
  const state = new Map<string, 0 | 1 | 2>();
  const reported = new Set<string>();
  const visit = (id: string, trail: string[]): void => {
    const record = byId.get(id);
    if (!record) return;
    const status = state.get(id) ?? 0;
    if (status === 2) return;
    if (status === 1) {
      const cycleAt = trail.indexOf(id);
      const cycle = trail.slice(cycleAt).concat(id);
      const key = [...new Set(cycle)].sort().join("|");
      if (!reported.has(key)) {
        issues.push({ code: `${codePrefix}_CYCLE`, severity: "ERROR", stage: "cross-file", entityType: collection === "topics" ? "TOPIC" : "DOMAIN", entityId: id, recordPath: context.recordPath, path: `/${collection}/${indexById.get(id) ?? 0}/${parentField}`, message: `${collection === "topics" ? "Topic" : "Domain"} parent links contain a cycle: ${cycle.join(" -> ")}.` });
        reported.add(key);
      }
      return;
    }
    state.set(id, 1);
    const parentId = stringValue(record[parentField]);
    if (parentId) {
      if (parentId === id) issues.push({ code: `${codePrefix}_SELF_PARENT`, severity: "ERROR", stage: "cross-file", entityType: collection === "topics" ? "TOPIC" : "DOMAIN", entityId: id, recordPath: context.recordPath, path: `/${collection}/${indexById.get(id) ?? 0}/${parentField}`, message: "An entity cannot be its own parent." });
      else if (!byId.has(parentId)) issues.push({ code: `${codePrefix}_PARENT_MISSING`, severity: "ERROR", stage: "cross-file", entityType: collection === "topics" ? "TOPIC" : "DOMAIN", entityId: id, recordPath: context.recordPath, path: `/${collection}/${indexById.get(id) ?? 0}/${parentField}`, message: "Parent must resolve within the same taxonomy snapshot." });
      else visit(parentId, [...trail, id]);
    }
    state.set(id, 2);
  };
  for (const id of byId.keys()) visit(id, []);
}

function validateClassificationUniqueness(
  classifications: EntityRecord[],
  entities: (type: EntityType) => Map<string, EntityRecord>,
  issues: ValidationIssue[],
): void {
  const assignmentKeys = new Map<string, EntityRecord>();
  const primaryKeys = new Map<string, EntityRecord>();
  for (const record of classifications) {
    const data = record.data;
    const senseId = stringValue(data.masterSenseId) ?? "";
    const dimension = stringValue(data.dimension) ?? "";
    let valueScope = "";
    if (dimension === "CEFR") valueScope = `${data.frameworkCode}@${data.frameworkVersion}:${data.valueCode}`;
    else if (dimension === "DIFFICULTY") valueScope = `${data.scaleId}:${data.numericValue}`;
    else if (dimension === "AGE_GROUP") valueScope = String(data.valueCode);
    else valueScope = String(data.valueRef);
    const assignmentKey = `${senseId}:${dimension}:${valueScope}`;
    const previous = assignmentKeys.get(assignmentKey);
    if (previous) issues.push({ code: "CLASSIFICATION_DUPLICATE_ASSIGNMENT", severity: "ERROR", stage: "cross-file", entityType: "CLASSIFICATION", entityId: record.id, recordPath: record.recordPath, path: `${record.path}/dimension`, message: `Assignment duplicates Classification ${previous.id} for the same Sense, dimension, and value scope.` });
    else assignmentKeys.set(assignmentKey, record);

    if (data.isPrimary === true) {
      let scope = "";
      if (dimension === "CEFR") scope = `${data.frameworkCode}@${data.frameworkVersion}`;
      else if (dimension === "DIFFICULTY") scope = String(data.scaleId);
      else if (dimension === "SCHOOL_LEVEL") {
        const level = entities("SCHOOL_LEVEL").get(String(data.valueRef));
        scope = String(level?.data.curriculumId ?? "unresolved");
      }
      const key = `${senseId}:${dimension}:${scope}`;
      const existing = primaryKeys.get(key);
      if (existing) issues.push({ code: "CLASSIFICATION_PRIMARY_DUPLICATE", severity: "ERROR", stage: "cross-file", entityType: "CLASSIFICATION", entityId: record.id, recordPath: record.recordPath, path: `${record.path}/isPrimary`, message: `Primary assignment duplicates Classification ${existing.id} in the same Sense scope.` });
      else primaryKeys.set(key, record);
    }

  }

  for (const [type, ownerField, languageField, idField] of [
    ["TRANSLATION", "masterSenseId", "language", "translationId"],
    ["EXAMPLE_TRANSLATION", "exampleId", "language", "exampleTranslationId"],
    ["PRONUNCIATION", "masterLexemeId", "locale", "pronunciationId"],
  ] as const) {
    const groups = new Map<string, EntityRecord>();
    for (const record of entities(type).values()) {
      if (record.data.status !== "APPROVED" || record.data.isPreferred !== true) continue;
      const ownerId = type === "PRONUNCIATION" && record.data.masterSenseId ? `SENSE:${String(record.data.masterSenseId)}` : `${type === "PRONUNCIATION" ? "LEXEME" : "OWNER"}:${String(record.data[ownerField])}`;
      const key = `${ownerId}:${String(record.data[languageField])}`;
      const previous = groups.get(key);
      if (previous) {
        const code = type === "TRANSLATION" ? "PREFERRED_TRANSLATION_DUPLICATE" : type === "EXAMPLE_TRANSLATION" ? "PREFERRED_EXAMPLE_TRANSLATION_DUPLICATE" : "PREFERRED_PRONUNCIATION_DUPLICATE";
        issues.push({ code, severity: "ERROR", stage: "cross-file", entityType: type, entityId: String(record.data[idField]), recordPath: record.recordPath, path: `${record.path}/isPreferred`, message: `Preferred ${type} duplicates ${previous.id} for the same owner and language/locale.` });
      } else groups.set(key, record);
    }
  }
}

function validateNormalizedLemmaCollisions(lexemes: Map<string, EntityRecord>, issues: ValidationIssue[]): void {
  const groups = new Map<string, EntityRecord[]>();
  for (const lexeme of lexemes.values()) {
    const language = stringValue(lexeme.data.language);
    const normalizedLemma = stringValue(lexeme.data.normalizedLemma);
    if (!language || !normalizedLemma) continue;
    const key = `${language}:${normalizedLemma}`;
    const group = groups.get(key) ?? [];
    group.push(lexeme);
    groups.set(key, group);
  }
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    group.sort((a, b) => a.id.localeCompare(b.id));
    for (let left = 0; left < group.length; left += 1) {
      for (let right = left + 1; right < group.length; right += 1) {
        const first = group[left];
        const second = group[right];
        issues.push({ code: "LEXEME_NORMALIZED_COLLISION", severity: "WARNING", stage: "cross-file", entityType: "LEXEME", entityId: second.id, recordPath: second.recordPath, path: "/normalizedLemma", message: `Lexeme ${first.id} and ${second.id} share language + normalizedLemma; review as a duplicate candidate without auto-merging.` });
      }
    }
  }
}

function validateMediaAsset(
  record: EntityRecord,
  entities: (type: EntityType) => Map<string, EntityRecord>,
  issues: ValidationIssue[],
): void {
  const data = record.data;
  const versions = asObjectArray(data.versions);
  const versionsByNumber = new Map<number, JsonObject>();
  for (const [index, version] of versions.entries()) {
    const number = typeof version.mediaAssetVersion === "number" ? version.mediaAssetVersion : undefined;
    if (version.mediaAssetId !== record.id) {
      issues.push({ code: "MEDIA_VERSION_OWNER_MISMATCH", severity: "ERROR", stage: "cross-file", entityType: "MEDIA_ASSET_VERSION", entityId: `${String(version.mediaAssetId)}@${String(number)}`, recordPath: record.recordPath, path: `/versions/${index}/mediaAssetId`, message: "Media Asset Version must carry its containing mediaAssetId." });
    }
    if (number !== undefined) {
      if (versionsByNumber.has(number)) issues.push({ code: "MEDIA_VERSION_DUPLICATE", severity: "ERROR", stage: "cross-file", entityType: "MEDIA_ASSET_VERSION", entityId: `${record.id}@${number}`, recordPath: record.recordPath, path: `/versions/${index}/mediaAssetVersion`, message: "Media Asset Version number is duplicated within the asset." });
      else versionsByNumber.set(number, version);
    }
  }
  const current = typeof data.currentMediaAssetVersion === "number" ? data.currentMediaAssetVersion : undefined;
  if (current !== undefined) {
    const currentVersion = versionsByNumber.get(current);
    if (!currentVersion) issues.push({ code: "MEDIA_CURRENT_VERSION_MISSING", severity: "ERROR", stage: "cross-file", entityType: "MEDIA_ASSET", entityId: record.id, recordPath: record.recordPath, path: "/currentMediaAssetVersion", message: "currentMediaAssetVersion does not resolve to a version in this asset." });
    else if (data.status === "APPROVED" && currentVersion.status !== "APPROVED") issues.push({ code: "MEDIA_CURRENT_VERSION_NOT_APPROVED", severity: "ERROR", stage: "cross-file", entityType: "MEDIA_ASSET", entityId: record.id, recordPath: record.recordPath, path: "/currentMediaAssetVersion", message: "An APPROVED asset must select an APPROVED current version." });
  }

  const targetType = data.targetEntityType === "LEXEME" ? "LEXEME" : data.targetEntityType === "SENSE" ? "SENSE" : data.targetEntityType === "EXAMPLE" ? "EXAMPLE" : undefined;
  if (targetType) checkGraphReference(entities, targetType, data.targetId, { entityType: "MEDIA_ASSET", entityId: record.id, recordPath: record.recordPath, path: "/targetId" }, issues);
  const mediaKind = data.mediaKind;
  const allowedTarget = mediaKind === "IMAGE" ? data.targetEntityType === "LEXEME" || data.targetEntityType === "SENSE" || data.targetEntityType === "EXAMPLE"
    : mediaKind === "WORD_PRONUNCIATION_AUDIO" ? data.targetEntityType === "LEXEME" || data.targetEntityType === "SENSE"
      : mediaKind === "EXAMPLE_AUDIO" ? data.targetEntityType === "EXAMPLE" : false;
  if (!allowedTarget) issues.push({ code: "MEDIA_TARGET_KIND_MISMATCH", severity: "ERROR", stage: "cross-file", entityType: "MEDIA_ASSET", entityId: record.id, recordPath: record.recordPath, path: "/mediaKind", message: "mediaKind is not compatible with targetEntityType under the Master V2 contract." });

  for (const [index, delivery] of asObjectArray(data.deliveries).entries()) {
    const versionKey = `${String(delivery.mediaAssetId)}@${String(delivery.mediaAssetVersion)}`;
    if (delivery.mediaAssetId !== record.id || !versionsByNumber.has(Number(delivery.mediaAssetVersion))) {
      issues.push({ code: "MEDIA_DELIVERY_VERSION_UNRESOLVED", severity: "ERROR", stage: "cross-file", entityType: "MEDIA_DELIVERY", entityId: stringValue(delivery.deliveryId), recordPath: record.recordPath, path: `/deliveries/${index}/mediaAssetVersion`, message: `Delivery ${versionKey} does not resolve to a version in its containing asset.` });
    }
    if (delivery.deliveryStatus === "READY") {
      const url = stringValue(delivery.url);
      try {
        const parsed = new URL(url ?? "");
        if (parsed.protocol !== "https:" || !parsed.hostname || parsed.username || parsed.password) throw new Error("not a safe HTTPS URL");
      } catch {
        issues.push({ code: "MEDIA_READY_DELIVERY_URL_INVALID", severity: "ERROR", stage: "cross-file", entityType: "MEDIA_DELIVERY", entityId: stringValue(delivery.deliveryId), recordPath: record.recordPath, path: `/deliveries/${index}/url`, message: "READY delivery URL must be a credential-free HTTPS URL with a host." });
      }
    }
  }
}

function checkGraphReference(
  entities: (type: EntityType) => Map<string, EntityRecord>,
  expectedType: EntityType,
  idValue: unknown,
  context: { entityType: EntityType; entityId?: string; recordPath: string; path: string },
  issues: ValidationIssue[],
): EntityRecord | undefined {
  const id = stringValue(idValue);
  if (!id) return undefined;
  const match = entities(expectedType).get(id);
  if (match) return match;
  const foundType = (["DATASET", "TAXONOMY", "LEXEME", "SENSE", "PRONUNCIATION", "TRANSLATION", "DEFINITION", "EXAMPLE", "EXAMPLE_TRANSLATION", "CLASSIFICATION", "TOPIC", "DOMAIN", "EXAM", "CURRICULUM", "SCHOOL_LEVEL", "DIFFICULTY_SCALE", "LEARNING_SET", "LEARNING_SET_ITEM", "RELATION", "MEDIA_ASSET", "MEDIA_ASSET_VERSION", "MEDIA_DELIVERY", "PROVENANCE"] as EntityType[]).find((type) => type !== expectedType && entities(type).has(id));
  issues.push({ code: foundType ? "REFERENCE_TYPE_MISMATCH" : "REFERENCE_DANGLING", severity: "ERROR", stage: "cross-file", entityType: context.entityType, entityId: context.entityId, recordPath: context.recordPath, path: context.path, message: foundType ? `Reference expects ${expectedType} but ID resolves as ${foundType}.` : `Reference does not resolve to a pinned ${expectedType}.` });
  return undefined;
}

function isMain(): boolean {
  return process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isMain()) {
  const args = process.argv.slice(2);
  const rootIndex = args.indexOf("--dataset-root");
  const datasetRoot = rootIndex >= 0 ? args[rootIndex + 1] : undefined;
  const report = validateMasterVocabularyV2({ datasetRoot });
  console.log(`${report.status}: ${report.errorCount} error(s), ${report.warningCount} warning(s), ${report.infoCount} info issue(s).`);
  console.log(path.join(path.resolve(datasetRoot ?? path.join(process.cwd(), "vocabflow-dataset")), "reports", "validation-report.json"));
  if (report.status === "FAIL") process.exitCode = 1;
}
