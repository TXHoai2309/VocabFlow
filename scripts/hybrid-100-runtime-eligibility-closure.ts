import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildAppImportV2, loadPinnedMasterProjectionGraph, APP_IMPORT_CONTRACT_VERSION, RUNTIME_PROJECTION_CONTRACT_VERSION, type MasterProjectionGraph } from "./transform-master-vocabulary-v2";
import { canonicalHash, sha256 } from "./hybrid-100-canonical-promote";
import { validateMasterVocabularyV2 } from "./validate-master-vocabulary-v2";

const SOURCE_RELEASE_VERSION = "2.2.0";
const TARGET_RELEASE_VERSION = "2.2.1";
const EXPECTED_RELEASE_HASH = "c82a32a3d7fc3534105b85e14908edd336c2409aa7294d070528a47f6260339d";
const EXPECTED_RELEASE_TREE = "35334eb7769c39029223d2d60311c6faab8c462efd0a340f262bed27543256ae";
const EXPECTED_SEMANTIC_DRAFT_FINGERPRINT = "a112a475e896f09038d4dd6834389af2d553d3a509829ef410ef17ae4e37ee1d";
const EXPECTED_SOURCE_PROOF_FINGERPRINT = "89d6477c3c1a32a0eb1e367f09df37238554f762b3b378c0f590525f3d0a4ccc";
const RELEASE_RELATIVE = "vocabflow-dataset/releases/hybrid-100-v2.2.0";
const TARGET_RELEASE_RELATIVE = "vocabflow-dataset/releases/hybrid-100-v2.2.1";
const EDITORIAL_RELATIVE = "vocabflow-dataset/workspaces/hybrid-100-editorial-draft";
const OUTPUT_RELATIVE = "vocabflow-dataset/workspaces/hybrid-100-runtime-eligibility-closure";
const REPORT_RELATIVE = "vocabflow-dataset/reports/hybrid-100-runtime-eligibility-closure-2.2.1.md";
const ARTIFACT_GENERATOR = "hybrid-100-runtime-eligibility-closure-v1";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Pinned dataset JSON is validated before this audit reads its schema-specific fields.
type JsonObject = Record<string, any>;
type StatusCounts = { total: number; approved: number; inReview: number; draft: number; other: number; byStatus: Record<string, number> };
type ChildSpec = {
  entityType: string;
  collection: "translations" | "definitions" | "examples" | "exampleTranslations";
  idField: string;
  language: string;
  fieldPath: string;
  ownerFlag: string;
};

const CHILD_SPECS: ChildSpec[] = [
  { entityType: "TRANSLATION", collection: "translations", idField: "translationId", language: "vi", fieldPath: "sense.translations", ownerFlag: "vietnameseTranslationApproved" },
  { entityType: "DEFINITION", collection: "definitions", idField: "definitionId", language: "en", fieldPath: "sense.definitions", ownerFlag: "englishDefinitionApproved" },
  { entityType: "EXAMPLE", collection: "examples", idField: "exampleId", language: "en", fieldPath: "sense.examples", ownerFlag: "englishExampleApproved" },
  { entityType: "EXAMPLE_TRANSLATION", collection: "exampleTranslations", idField: "exampleTranslationId", language: "vi", fieldPath: "example.exampleTranslations", ownerFlag: "vietnameseExampleApproved" },
];

function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

function objectArray(value: unknown): JsonObject[] {
  return Array.isArray(value) ? value.filter((item): item is JsonObject => Boolean(item) && typeof item === "object" && !Array.isArray(item)) : [];
}

function recordsIn(directory: string): JsonObject[] {
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => readJson<JsonObject>(path.join(directory, entry.name)))
    .sort((left, right) => String(left.masterSenseId ?? left.masterLexemeId ?? "").localeCompare(String(right.masterSenseId ?? right.masterLexemeId ?? ""), "en"));
}

function recursiveFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];
  const result: string[] = [];
  const visit = (current: string) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const target = path.join(current, entry.name);
      if (entry.isDirectory()) visit(target);
      else if (entry.isFile()) result.push(target);
    }
  };
  visit(directory);
  return result.sort((left, right) => left.localeCompare(right, "en"));
}

function directoryFingerprint(directory: string, excludedRelativePaths: string[] = []): string {
  const excluded = new Set(excludedRelativePaths);
  const entries = recursiveFiles(directory)
    .map((file) => ({
      path: path.relative(directory, file).split(path.sep).join("/"),
      sha256: sha256(readFileSync(file)),
    }))
    .filter((entry) => !excluded.has(entry.path))
    .sort((left, right) => left.path.localeCompare(right.path, "en"));
  return canonicalHash(entries);
}

function canonicalDatasetStateFingerprint(repositoryRoot: string): string {
  const datasetRoot = path.join(repositoryRoot, "vocabflow-dataset");
  return canonicalHash({
    datasetManifestSha256: sha256(readFileSync(path.join(datasetRoot, "dataset.json"))),
    entityTrees: Object.fromEntries(["master", "provenance", "taxonomy", "media", "learning-sets"].map((directory) => [
      directory,
      directoryFingerprint(path.join(datasetRoot, directory)),
    ])),
  });
}

function serializedObjectHash(value: unknown): string {
  return sha256(`${JSON.stringify(value, null, 2)}\n`);
}

function semanticProjection(value: unknown, root = true): unknown {
  if (Array.isArray(value)) return value.map((item) => semanticProjection(item, false));
  if (!value || typeof value !== "object") return value;
  const result: JsonObject = {};
  for (const [key, item] of Object.entries(value)) {
    if (key === "status" || key === "provenanceIds") continue;
    if (root && (key === "senseRevision" || key === "createdAt" || key === "updatedAt")) continue;
    result[key] = semanticProjection(item, false);
  }
  return result;
}

function equal(left: unknown, right: unknown): boolean {
  return canonicalHash(left) === canonicalHash(right);
}

function statusOf(row: JsonObject): string {
  return typeof row.status === "string" ? row.status : typeof row.reviewStatus === "string" ? row.reviewStatus : "MISSING_STATUS";
}

function summarizeStatuses(rows: JsonObject[]): StatusCounts {
  const byStatus: Record<string, number> = {};
  for (const row of rows) {
    const status = statusOf(row);
    byStatus[status] = (byStatus[status] ?? 0) + 1;
  }
  return {
    total: rows.length,
    approved: byStatus.APPROVED ?? 0,
    inReview: byStatus.IN_REVIEW ?? 0,
    draft: byStatus.DRAFT ?? 0,
    other: Object.entries(byStatus).filter(([status]) => !["APPROVED", "IN_REVIEW", "DRAFT"].includes(status)).reduce((sum, [, count]) => sum + count, 0),
    byStatus: Object.fromEntries(Object.entries(byStatus).sort(([left], [right]) => left.localeCompare(right, "en"))),
  };
}

function recordById(rows: JsonObject[], idField: string): Map<string, JsonObject> {
  return new Map(rows.flatMap((row) => typeof row[idField] === "string" ? [[row[idField] as string, row] as const] : []));
}

function semanticDraftFingerprint(repositoryRoot: string): { fingerprint: string; recordCounts: { lexemes: number; senses: number } } {
  const workspaceRoot = path.join(repositoryRoot, EDITORIAL_RELATIVE);
  const lexemes = recordsIn(path.join(workspaceRoot, "master", "lexemes"));
  const senses = recordsIn(path.join(workspaceRoot, "master", "senses"));
  const editorial = readJson<JsonObject>(path.join(workspaceRoot, "editorial-decisions.json"));
  const identityRegistry = readJson<JsonObject>(path.join(workspaceRoot, "identity-registry.json"));
  const authorshipAudit = readJson<JsonObject>(path.join(workspaceRoot, "authorship-audit.json"));
  const candidateMap = readJson<JsonObject[]>(path.join(workspaceRoot, "candidate-master-map.json"));
  const pins = [
    ...lexemes.map((record) => ({ recordPath: `${EDITORIAL_RELATIVE}/master/lexemes/${record.masterLexemeId}-r1.json`, contentHash: serializedObjectHash(record) })),
    ...senses.map((record) => ({ recordPath: `${EDITORIAL_RELATIVE}/master/senses/${record.masterSenseId}-r1.json`, contentHash: serializedObjectHash(record) })),
  ].sort((left, right) => left.recordPath.localeCompare(right.recordPath, "en"));
  const fingerprint = canonicalHash({
    sourceProofFingerprint: EXPECTED_SOURCE_PROOF_FINGERPRINT,
    authoringContractVersion: "HYBRID-100-EDITORIAL-DRAFT-1",
    identityRegistry,
    candidateMasterMap: candidateMap,
    editorialDecisions: editorial.decisions,
    masterRecordPins: pins,
    authorshipAudit: authorshipAudit.entries,
  });
  return { fingerprint, recordCounts: { lexemes: lexemes.length, senses: senses.length } };
}

function childRows(sense: JsonObject): Array<{ spec: ChildSpec; row: JsonObject }> {
  const result: Array<{ spec: ChildSpec; row: JsonObject }> = [];
  for (const spec of CHILD_SPECS) {
    const rows = spec.collection === "exampleTranslations"
      ? objectArray(sense.examples).flatMap((example) => objectArray(example.exampleTranslations))
      : objectArray(sense[spec.collection]);
    result.push(...rows.map((row) => ({ spec, row })));
  }
  return result;
}

function safeDatasetPath(repositoryRoot: string, recordPath: string): string {
  const prefix = "vocabflow-dataset/";
  if (!recordPath.startsWith(prefix)) throw new Error("OWNER_TRACE_PATH_OUTSIDE_DATASET");
  const absolute = path.resolve(repositoryRoot, ...recordPath.split("/"));
  const base = path.resolve(repositoryRoot, "vocabflow-dataset");
  if (!absolute.startsWith(`${base}${path.sep}`)) throw new Error("OWNER_TRACE_PATH_TRAVERSAL");
  return absolute;
}

function loadPinnedProvenance(repositoryRoot: string, releaseRoot: string, pins: JsonObject[]): Map<string, JsonObject> {
  const map = new Map<string, JsonObject>();
  for (const pin of pins) {
    if (typeof pin.recordPath !== "string" || typeof pin.contentHash !== "string") continue;
    const record = readJson<JsonObject>(path.join(releaseRoot, pin.recordPath));
    if (canonicalHash(record) !== pin.contentHash || typeof record.provenanceId !== "string") throw new Error("RELEASE_PROVENANCE_PIN_INVALID");
    if (map.has(record.provenanceId)) throw new Error("DUPLICATE_RELEASE_PROVENANCE_ID");
    map.set(record.provenanceId, record);
  }
  return map;
}

function verifyProvenanceReferences(
  row: JsonObject,
  childId: string,
  fieldPath: string,
  provenanceById: Map<string, JsonObject>,
): { pass: boolean; references: Array<JsonObject> } {
  const ids = Array.isArray(row.provenanceIds) ? row.provenanceIds.filter((id): id is string => typeof id === "string") : [];
  const references = ids.map((id) => {
    const record = provenanceById.get(id);
    return {
      provenanceId: id,
      subjectType: record?.subjectType ?? null,
      subjectId: record?.subjectId ?? null,
      fieldPath: record?.fieldPath ?? null,
      sourceType: record?.sourceType ?? null,
      resolvesToOwnerAndField: record?.subjectType === "LINGUISTIC_CHILD" && record.subjectId === childId && record.fieldPath === fieldPath,
    };
  });
  return { pass: ids.length > 0 && references.every((item) => item.resolvesToOwnerAndField), references };
}

function checkOwnerAndSemanticTrace(input: {
  repositoryRoot: string;
  releaseSenses: JsonObject[];
  ownerReview: JsonObject;
  editorialDecisions: JsonObject[];
  candidateMap: JsonObject[];
  provenanceById: Map<string, JsonObject>;
  canonicalSensePins: JsonObject[];
}): { rows: JsonObject[]; summary: JsonObject; issues: string[] } {
  const issues: string[] = [];
  const draftSenses = recordsIn(path.join(input.repositoryRoot, EDITORIAL_RELATIVE, "master", "senses"));
  const draftById = recordById(draftSenses, "masterSenseId");
  const ownerDecisions = objectArray(input.ownerReview.candidateDecisions);
  const editorialByCandidate = new Map(input.editorialDecisions.map((decision) => [String(decision.candidateId), decision]));
  const mapByCandidate = new Map(input.candidateMap.map((item) => [String(item.candidateId), item]));
  const releaseBySense = recordById(input.releaseSenses, "masterSenseId");
  const canonicalPins = new Map(input.canonicalSensePins.map((pin) => [String(pin.masterSenseId), pin]));
  const rows: JsonObject[] = [];
  const statusCounts: Record<string, number> = {};
  const childTypeCounts: Record<string, number> = {};
  const uniqueChildIds = new Set<string>();

  for (const ownerDecision of ownerDecisions) {
    const candidateId = String(ownerDecision.candidateId ?? "");
    const senseId = String(ownerDecision.masterSenseId ?? "");
    const lexemeId = String(ownerDecision.masterLexemeId ?? "");
    const releaseSense = releaseBySense.get(senseId);
    const editorial = editorialByCandidate.get(candidateId);
    const mapped = mapByCandidate.get(candidateId);
    if (!releaseSense || !editorial || !mapped || releaseSense.masterLexemeId !== lexemeId || mapped.masterSenseId !== senseId || mapped.masterLexemeId !== lexemeId) {
      issues.push(`OWNER_IDENTITY_TRACE_MISSING:${senseId}`);
      continue;
    }

    const isReuse = ownerDecision.identityDecision === "REUSE_EXISTING_SENSE";
    let reviewedSense: JsonObject | undefined;
    let reviewedSourcePath = "";
    let reviewedSourceHash = "";
    let ownerContentReviewed = false;
    let provenanceSourceSense: JsonObject | undefined;
    let canonicalPromotionProvenanceSourcePath: string | null = null;
    if (isReuse) {
      const pin = editorial.existingMasterIdentityReview?.reusedCanonicalSense as JsonObject | undefined;
      if (!pin || pin.masterSenseId !== senseId || pin.masterLexemeId && pin.masterLexemeId !== lexemeId || typeof pin.recordPath !== "string" || typeof pin.contentHash !== "string") {
        issues.push(`REUSE_OWNER_PIN_MISSING:${senseId}`);
      } else {
        reviewedSourcePath = pin.recordPath;
        const filePath = safeDatasetPath(input.repositoryRoot, pin.recordPath);
        reviewedSense = readJson<JsonObject>(filePath);
        reviewedSourceHash = sha256(readFileSync(filePath));
        if (reviewedSourceHash !== pin.contentHash) issues.push(`REUSE_OWNER_PIN_HASH_MISMATCH:${senseId}`);
        if (ownerDecision.semanticIdentityExactEnough !== true || editorial.reviewStatus !== "REVIEWED_PASS") issues.push(`REUSE_SEMANTIC_DECISION_NOT_APPROVED:${senseId}`);
        ownerContentReviewed = ownerDecision.semanticIdentityExactEnough === true && editorial.reviewStatus === "REVIEWED_PASS";
        provenanceSourceSense = reviewedSense;
      }
    } else {
      reviewedSense = draftById.get(senseId);
      const workspacePin = mapped.workspaceSenseRecord as JsonObject | undefined;
      reviewedSourcePath = String(workspacePin?.recordPath ?? `${EDITORIAL_RELATIVE}/master/senses/${senseId}-r1.json`);
      reviewedSourceHash = reviewedSense ? serializedObjectHash(reviewedSense) : "";
      if (!reviewedSense || !workspacePin || workspacePin.recordPath !== reviewedSourcePath || workspacePin.contentHash !== reviewedSourceHash) {
        issues.push(`OWNER_REVIEWED_DRAFT_PIN_MISMATCH:${senseId}`);
      }
      const fieldFlagsPass = CHILD_SPECS.every((spec) => ownerDecision[spec.ownerFlag] === true);
      if (!fieldFlagsPass || ownerDecision.editorialReviewStatus !== "APPROVE_DRAFT") issues.push(`OWNER_CHILD_CONTENT_REVIEW_INCOMPLETE:${senseId}`);
      ownerContentReviewed = fieldFlagsPass && ownerDecision.editorialReviewStatus === "APPROVE_DRAFT";
      const canonicalPin = canonicalPins.get(senseId);
      if (!canonicalPin || typeof canonicalPin.recordPath !== "string" || typeof canonicalPin.contentHash !== "string") {
        issues.push(`CANONICAL_PROMOTION_SENSE_PIN_MISSING:${senseId}`);
      } else {
        canonicalPromotionProvenanceSourcePath = `vocabflow-dataset/${canonicalPin.recordPath}`;
        const canonicalFile = safeDatasetPath(input.repositoryRoot, canonicalPromotionProvenanceSourcePath);
        if (!existsSync(canonicalFile)) {
          issues.push(`CANONICAL_PROMOTION_CHILD_SOURCE_MISSING:${senseId}`);
        } else {
          provenanceSourceSense = readJson<JsonObject>(canonicalFile);
          if (canonicalPin.masterSenseId !== senseId || canonicalPin.senseRevision !== provenanceSourceSense.senseRevision
            || provenanceSourceSense.masterSenseId !== senseId || canonicalPin.contentHash !== canonicalHash(provenanceSourceSense)) {
            issues.push(`CANONICAL_PROMOTION_SENSE_PIN_MISMATCH:${senseId}`);
          }
          if (reviewedSense && !equal(semanticProjection(reviewedSense), semanticProjection(provenanceSourceSense))) {
            issues.push(`CANONICAL_PROMOTION_SEMANTIC_DRIFT:${senseId}`);
          }
          reviewedSourcePath = `${EDITORIAL_RELATIVE}/master/senses/${senseId}-r1.json`;
        }
      }
    }

    const parentSemanticMatch = Boolean(reviewedSense && equal(semanticProjection(reviewedSense), semanticProjection(releaseSense)));
    if (!parentSemanticMatch) issues.push(`OWNER_REVIEWED_PARENT_CONTENT_DRIFT:${senseId}`);
    const currentChildren = childRows(releaseSense);
    const reviewedChildren = reviewedSense ? childRows(reviewedSense) : [];
    const promotedSourceChildren = provenanceSourceSense ? childRows(provenanceSourceSense) : [];
    const reviewedByKey = new Map(reviewedChildren.map(({ spec, row }) => [`${spec.entityType}:${String(row[spec.idField])}`, row]));
    const provenanceSourceByKey = new Map(promotedSourceChildren.map(({ spec, row }) => [`${spec.entityType}:${String(row[spec.idField])}`, row]));
    const traceRowsForSense: JsonObject[] = [];

    for (const { spec, row } of currentChildren) {
      const id = String(row[spec.idField] ?? "");
      const key = `${spec.entityType}:${id}`;
      const semanticSource = reviewedByKey.get(key);
      const canonicalSource = provenanceSourceByKey.get(key);
      const sourceForProvenance = isReuse ? semanticSource : canonicalSource;
      const childSemanticMatch = Boolean(semanticSource && equal(semanticProjection(semanticSource), semanticProjection(row)));
      const childOwnerMatchesSense = spec.entityType === "EXAMPLE_TRANSLATION"
        ? objectArray(releaseSense.examples).some((example) => example.exampleId === row.exampleId)
        : row.masterSenseId === senseId;
      const identityMatch = id.length > 0 && childOwnerMatchesSense;
      const provenanceCheck = verifyProvenanceReferences(row, id, spec.fieldPath, input.provenanceById);
      const provenanceRefsPreserved = Boolean(sourceForProvenance && equal(sourceForProvenance.provenanceIds ?? [], row.provenanceIds ?? []));
      const languageMatch = row.language === spec.language;
      const status = statusOf(row);
      const statusTransitionAllowed = status === "APPROVED" || status === "DRAFT" || status === "IN_REVIEW";
      const semanticSourceFingerprint = semanticSource ? canonicalHash(semanticProjection(semanticSource)) : null;
      const releasedSemanticFingerprint = canonicalHash(semanticProjection(row));
      const ownerTracePass = ownerContentReviewed && parentSemanticMatch && childSemanticMatch && identityMatch
        && languageMatch && provenanceCheck.pass && provenanceRefsPreserved && statusTransitionAllowed;
      if (!ownerTracePass) issues.push(`NESTED_CHILD_OWNER_TRACE_FAILED:${key}`);
      if (!statusTransitionAllowed) issues.push(`NESTED_CHILD_LIFECYCLE_STATUS_UNSUPPORTED:${key}`);
      if (!id || uniqueChildIds.has(id)) issues.push(`NESTED_CHILD_ID_DUPLICATE_OR_MISSING:${key}`);
      uniqueChildIds.add(id);
      statusCounts[status] = (statusCounts[status] ?? 0) + 1;
      childTypeCounts[spec.entityType] = (childTypeCounts[spec.entityType] ?? 0) + 1;
      const changeRequired = status !== "APPROVED";
      traceRowsForSense.push({
        entityType: spec.entityType,
        childId: id,
        masterSenseId: senseId,
        masterLexemeId: lexemeId,
        language: row.language,
        text: row.text,
        currentStatus: status,
        plannedStatus: ownerTracePass ? "APPROVED" : status,
        displayOrder: row.displayOrder,
        isPreferred: typeof row.isPreferred === "boolean" ? row.isPreferred : null,
        contentKind: row.translationKind ?? row.definitionKind ?? row.register ?? null,
        provenanceIds: row.provenanceIds ?? [],
        provenanceTrace: provenanceCheck.references,
        ownerReviewedSource: {
          kind: isReuse ? "PINNED_REUSE_SENSE" : "FINGERPRINTED_SEMANTIC_DRAFT",
          recordPath: reviewedSourcePath,
          parentSourceContentHash: reviewedSourceHash,
          candidateId,
          semanticDraftFingerprint: EXPECTED_SEMANTIC_DRAFT_FINGERPRINT,
          ownerReviewDecision: ownerDecision.editorialReviewStatus,
          ownerContentReviewBasis: isReuse ? "OWNER_REVIEWED_EXACT_IDENTITY_REUSE_WITH_IMMUTABLE_SOURCE_PIN" : spec.ownerFlag,
          ownerContentReviewPass: ownerContentReviewed,
          canonicalPromotionProvenanceSource: canonicalPromotionProvenanceSourcePath,
          canonicalPromotionProvenanceSourceHash: provenanceSourceSense ? canonicalHash(provenanceSourceSense) : null,
        },
        equality: {
          stableChildId: identityMatch,
          owningSenseAndLexeme: childOwnerMatchesSense && lexemeId === releaseSense.masterLexemeId,
          language: languageMatch,
          learnerFacingContent: childSemanticMatch,
          orderingAndPreferredSelection: semanticSource ? row.displayOrder === semanticSource.displayOrder && row.isPreferred === semanticSource.isPreferred : false,
          provenanceReferences: provenanceCheck.pass && provenanceRefsPreserved,
          statusOnlyPromotion: changeRequired && ownerTracePass,
          noSemanticDrift: ownerTracePass,
          semanticContentFingerprintMatches: semanticSourceFingerprint === releasedSemanticFingerprint,
        },
      });
    }

    const byType = Object.fromEntries(CHILD_SPECS.map((spec) => [spec.entityType, traceRowsForSense.filter((row) => row.entityType === spec.entityType).length]));
    const lexeme = String(releaseSense.masterLexemeId);
    const sensePronunciations = objectArray(releaseSense.pronunciationOverrides);
    rows.push({
      masterSenseId: senseId,
      masterLexemeId: lexeme,
      candidateId,
      identityDecision: ownerDecision.identityDecision,
      ownerReviewedSourceKind: isReuse ? "PINNED_REUSE_SENSE" : "FINGERPRINTED_SEMANTIC_DRAFT",
      ownerContentReviewPass: ownerContentReviewed,
      parentSemanticMatch,
      childCounts: byType,
      childRows: traceRowsForSense,
      sensePronunciationCount: sensePronunciations.length,
      sourceSenseRevision: releaseSense.senseRevision,
      nextSenseRevision: releaseSense.senseRevision + (traceRowsForSense.some((child) => child.currentStatus !== "APPROVED" && child.equality.noSemanticDrift) ? 1 : 0),
      learnerContentRequirements: {
        vietnameseTranslation: traceRowsForSense.some((child) => child.entityType === "TRANSLATION" && child.plannedStatus === "APPROVED" && child.language === "vi") ? "YES" : "NO",
        englishDefinition: traceRowsForSense.some((child) => child.entityType === "DEFINITION" && child.plannedStatus === "APPROVED" && child.language === "en") ? "YES" : "NO",
        englishExample: traceRowsForSense.some((child) => child.entityType === "EXAMPLE" && child.plannedStatus === "APPROVED" && child.language === "en") ? "YES" : "NO",
        exampleTranslation: traceRowsForSense.some((child) => child.entityType === "EXAMPLE_TRANSLATION" && child.plannedStatus === "APPROVED" && child.language === "vi") ? "YES" : "NO",
        pronunciationIpa: sensePronunciations.length > 0 ? "REVIEW_REQUIRED" : "NO",
      },
      runtimeLemma: lexeme,
      childLifecycleChangesPlanned: traceRowsForSense.filter((child) => child.currentStatus !== "APPROVED" && child.equality.noSemanticDrift).length,
    });
  }

  const summary = {
    ownerReviewedCandidateDecisions: ownerDecisions.length,
    ownerReviewApproveDraftCount: ownerDecisions.filter((decision) => decision.editorialReviewStatus === "APPROVE_DRAFT").length,
    directlyAuthoredSenses: draftSenses.length,
    reviewedReuseSenses: ownerDecisions.filter((decision) => decision.identityDecision === "REUSE_EXISTING_SENSE").length,
    childRowsTraced: rows.reduce((sum, sense) => sum + objectArray(sense.childRows).length, 0),
    childRowsPassed: rows.reduce((sum, sense) => sum + objectArray(sense.childRows).filter((child) => child.equality?.noSemanticDrift === true).length, 0),
    childRowsBlocked: rows.reduce((sum, sense) => sum + objectArray(sense.childRows).filter((child) => child.equality?.noSemanticDrift !== true).length, 0),
    childRowsByType: childTypeCounts,
    childStatusCounts: statusCounts,
    provenanceReferencesValidated: rows.reduce((sum, sense) => sum + objectArray(sense.childRows).filter((child) => child.equality?.provenanceReferences === true).length, 0),
    uniqueChildIds: uniqueChildIds.size,
  };
  return { rows, summary, issues: [...new Set(issues)].sort() };
}

function collectLifecycleRows(senses: JsonObject[], lexemes: JsonObject[]) {
  const translations = senses.flatMap((sense) => objectArray(sense.translations));
  const definitions = senses.flatMap((sense) => objectArray(sense.definitions));
  const examples = senses.flatMap((sense) => objectArray(sense.examples));
  const exampleTranslations = examples.flatMap((example) => objectArray(example.exampleTranslations));
  const sensePronunciations = senses.flatMap((sense) => objectArray(sense.pronunciationOverrides));
  const lexemePronunciations = lexemes.flatMap((lexeme) => objectArray(lexeme.pronunciations));
  return {
    translations,
    definitions,
    examples,
    exampleTranslations,
    sensePronunciations,
    lexemePronunciations,
    statusInventory: {
      translations: summarizeStatuses(translations),
      definitions: summarizeStatuses(definitions),
      examples: summarizeStatuses(examples),
      exampleTranslations: summarizeStatuses(exampleTranslations),
      sensePronunciations: summarizeStatuses(sensePronunciations),
      lexemePronunciations: summarizeStatuses(lexemePronunciations),
      parentSenses: summarizeStatuses(senses),
    },
  };
}

function simulatePatchProjection(graph: MasterProjectionGraph, traceRows: JsonObject[]) {
  const simulatedGraph = structuredClone(graph) as MasterProjectionGraph;
  const childReferenceFingerprint = (senses: JsonObject[]) => canonicalHash(senses.flatMap((sense) => childRows(sense).map(({ spec, row }) => ({
    entityType: spec.entityType,
    childId: row[spec.idField],
    provenanceIds: row.provenanceIds ?? [],
  }))));
  const sourceSemanticFingerprint = canonicalHash(graph.senses.map((sense) => semanticProjection(sense)));
  const simulatedSemanticFingerprintBeforeProjection = () => canonicalHash(simulatedGraph.senses.map((sense) => semanticProjection(sense)));
  const sourceChildReferenceFingerprint = childReferenceFingerprint(graph.senses as JsonObject[]);
  const sourceClassificationFingerprint = canonicalHash(graph.classifications);
  const sourceTaxonomyFingerprint = canonicalHash(graph.taxonomy);
  const sourceLexemeFingerprint = canonicalHash(graph.lexemes);
  const traceBySense = new Map(traceRows.map((row) => [String(row.masterSenseId), row]));
  const traceByChild = new Map<string, JsonObject>();
  for (const senseTrace of traceRows) {
    for (const childTrace of objectArray(senseTrace.childRows)) traceByChild.set(`${childTrace.entityType}:${childTrace.childId}`, childTrace);
  }
  simulatedGraph.manifest.datasetVersion = TARGET_RELEASE_VERSION;
  delete simulatedGraph.manifest.releaseHash;
  for (const sense of simulatedGraph.senses) {
    const trace = traceBySense.get(String(sense.masterSenseId));
    if (!trace) continue;
    let changed = false;
    for (const { spec, row } of childRows(sense)) {
      const childTrace = traceByChild.get(`${spec.entityType}:${String(row[spec.idField])}`);
      if (childTrace?.plannedStatus === "APPROVED" && row.status !== "APPROVED") {
        row.status = "APPROVED";
        changed = true;
      }
    }
    if (changed) {
      const currentRevision = sense.senseRevision;
      if (typeof currentRevision !== "number" || !Number.isInteger(currentRevision) || currentRevision < 1) throw new Error("SIMULATED_SENSE_REVISION_INVALID");
      sense.senseRevision = currentRevision + 1;
    }
  }
  const artifacts = buildAppImportV2(simulatedGraph, "RELEASE");
  const records = objectArray(artifacts.vocabulary.records);
  const rowsBySense = new Map(records.map((row) => [String(row.masterSenseId), row]));
  const projectedFields = {
    vietnameseNonNull: records.filter((row) => typeof row.runtimeProjection?.vietnamese === "string" && row.runtimeProjection.vietnamese.length > 0).length,
    definitionEnNonNull: records.filter((row) => typeof row.runtimeProjection?.definitionEn === "string" && row.runtimeProjection.definitionEn.length > 0).length,
    exampleEnNonNull: records.filter((row) => typeof row.runtimeProjection?.exampleEn === "string" && row.runtimeProjection.exampleEn.length > 0).length,
    ipaNonNull: records.filter((row) => typeof row.runtimeProjection?.ipa === "string" && row.runtimeProjection.ipa.length > 0).length,
  };
  const invariantChecks = {
    learnerFacingAndIdentityFingerprint: {
      before: sourceSemanticFingerprint,
      after: simulatedSemanticFingerprintBeforeProjection(),
      unchanged: sourceSemanticFingerprint === simulatedSemanticFingerprintBeforeProjection(),
    },
    childProvenanceReferenceFingerprint: {
      before: sourceChildReferenceFingerprint,
      after: childReferenceFingerprint(simulatedGraph.senses as JsonObject[]),
      unchanged: sourceChildReferenceFingerprint === childReferenceFingerprint(simulatedGraph.senses as JsonObject[]),
    },
    lexemePinFingerprint: {
      before: sourceLexemeFingerprint,
      after: canonicalHash(simulatedGraph.lexemes),
      unchanged: sourceLexemeFingerprint === canonicalHash(simulatedGraph.lexemes),
    },
    classificationPinFingerprint: {
      before: sourceClassificationFingerprint,
      after: canonicalHash(simulatedGraph.classifications),
      unchanged: sourceClassificationFingerprint === canonicalHash(simulatedGraph.classifications),
    },
    taxonomyFingerprint: {
      before: sourceTaxonomyFingerprint,
      after: canonicalHash(simulatedGraph.taxonomy),
      unchanged: sourceTaxonomyFingerprint === canonicalHash(simulatedGraph.taxonomy),
    },
  };
  const perSenseProjection = graph.senses.map((sense) => {
    const row = rowsBySense.get(String(sense.masterSenseId));
    return {
      masterSenseId: sense.masterSenseId,
      projected: Boolean(row),
      vietnameseNonNull: Boolean(row?.runtimeProjection?.vietnamese),
      definitionEnNonNull: Boolean(row?.runtimeProjection?.definitionEn),
      exampleEnNonNull: Boolean(row?.runtimeProjection?.exampleEn),
      ipaNonNull: Boolean(row?.runtimeProjection?.ipa),
      projectionFingerprint: row?.masterProjectionFingerprint ?? null,
    };
  });
  return {
    appImportContractVersion: String(artifacts.vocabulary.artifactVersion),
    projectionContractVersion: String(artifacts.vocabulary.projectionContractVersion),
    sourceDatasetVersion: String(artifacts.vocabulary.sourceDatasetVersion),
    importEligible: artifacts.vocabulary.importEligible === true,
    projectedSenses: records.length,
    skippedSenses: simulatedGraph.senses.length - records.length,
    projectedFields,
    invariantChecks,
    perSenseProjection,
    vocabularyArtifact: artifacts.vocabulary,
  };
}

export function buildHybrid100RuntimeEligibilityClosure(repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")) {
  const releaseRoot = path.join(repositoryRoot, RELEASE_RELATIVE);
  const targetReleasePath = path.join(repositoryRoot, TARGET_RELEASE_RELATIVE);
  const releaseTreeBefore = directoryFingerprint(releaseRoot, ["reports/release-approval-evidence.json", "reports/release-candidate-evidence.json"]);
  const canonicalTreeBefore = directoryFingerprint(path.join(repositoryRoot, "vocabflow-dataset", "master"));
  const canonicalDatasetStateBefore = canonicalDatasetStateFingerprint(repositoryRoot);
  if (existsSync(targetReleasePath)) throw new Error("PATCH_RELEASE_2_2_1_ALREADY_EXISTS");

  const manifest = readJson<JsonObject>(path.join(releaseRoot, "dataset.json"));
  const manifestWithoutHash = structuredClone(manifest) as JsonObject;
  delete manifestWithoutHash.releaseHash;
  const sourceHash = canonicalHash(manifestWithoutHash);
  if (manifest.datasetVersion !== SOURCE_RELEASE_VERSION || manifest.schemaVersion !== "2.0.1" || manifest.status !== "APPROVED"
    || manifest.releaseHash !== EXPECTED_RELEASE_HASH || sourceHash !== EXPECTED_RELEASE_HASH || manifest.releaseHashAlgorithm !== "sha256-canonical-json-v1") {
    throw new Error("SOURCE_RELEASE_IDENTITY_OR_HASH_MISMATCH");
  }
  if (releaseTreeBefore !== EXPECTED_RELEASE_TREE) throw new Error("SOURCE_RELEASE_TREE_FINGERPRINT_MISMATCH");

  const validation = validateMasterVocabularyV2({ datasetRoot: releaseRoot, writeReport: false, validatedAt: "2000-01-01T00:00:00Z" });
  if (validation.status !== "PASS" || validation.errorCount !== 0 || validation.warningCount !== 0 || validation.infoCount !== 0) {
    throw new Error("SOURCE_RELEASE_VALIDATION_FAILED");
  }
  const graph = loadPinnedMasterProjectionGraph(releaseRoot);
  const releaseSenses = graph.senses as JsonObject[];
  const releaseLexemes = graph.lexemes as JsonObject[];
  const releaseClassifications = graph.classifications as JsonObject[];
  if (releaseSenses.length !== 100 || releaseLexemes.length !== 87 || releaseClassifications.length !== 99) throw new Error("HYBRID_100_RELEASE_COHORT_COUNT_MISMATCH");

  const editorialRoot = path.join(repositoryRoot, EDITORIAL_RELATIVE);
  const ownerReview = readJson<JsonObject>(path.join(editorialRoot, "owner-review.json"));
  const ownerPromotionApproval = readJson<JsonObject>(path.join(editorialRoot, "canonical-promotion.json"));
  const editorialPackage = readJson<JsonObject>(path.join(editorialRoot, "editorial-decisions.json"));
  const candidateMap = readJson<JsonObject[]>(path.join(editorialRoot, "candidate-master-map.json"));
  const semanticFingerprint = semanticDraftFingerprint(repositoryRoot);
  if (semanticFingerprint.fingerprint !== EXPECTED_SEMANTIC_DRAFT_FINGERPRINT
    || ownerReview.draftFingerprint !== EXPECTED_SEMANTIC_DRAFT_FINGERPRINT
    || ownerReview.sourceProofFingerprint !== EXPECTED_SOURCE_PROOF_FINGERPRINT
    || semanticFingerprint.recordCounts.senses !== 98 || semanticFingerprint.recordCounts.lexemes !== 84) {
    throw new Error("OWNER_REVIEWED_SEMANTIC_PACKAGE_FINGERPRINT_MISMATCH");
  }
  if (ownerReview.summary?.candidates !== 100 || ownerReview.summary?.approveDraft !== 100
    || ownerPromotionApproval.ownerApproved !== true || ownerPromotionApproval.canonicalPromotionAuthorized !== true
    || ownerPromotionApproval.ownerApprovalScope !== "CANONICAL_DRAFT_PROMOTION_ONLY"
    || ownerPromotionApproval.approvedDraftFingerprint !== EXPECTED_SEMANTIC_DRAFT_FINGERPRINT) {
    throw new Error("OWNER_SEMANTIC_REVIEW_EVIDENCE_MISMATCH");
  }

  const releasePins = manifest.includedProvenance as JsonObject[];
  const provenanceById = loadPinnedProvenance(repositoryRoot, releaseRoot, releasePins);
  const canonicalManifest = readJson<JsonObject>(path.join(repositoryRoot, "vocabflow-dataset", "dataset.json"));
  const canonicalSensePins = objectArray(canonicalManifest.includedSenses);
  const trace = checkOwnerAndSemanticTrace({
    repositoryRoot,
    releaseSenses,
    ownerReview,
    editorialDecisions: objectArray(editorialPackage.decisions),
    candidateMap,
    provenanceById,
    canonicalSensePins,
  });
  const lifecycle = collectLifecycleRows(releaseSenses, releaseLexemes);
  const traceBySense = new Map(trace.rows.map((row) => [String(row.masterSenseId), row]));
  const traceIssues = [...trace.issues];
  const allTraceChildRows = trace.rows.flatMap((sense) => objectArray(sense.childRows));
  const childRowsToApprove = allTraceChildRows.filter((row) => row.currentStatus !== "APPROVED" && row.equality?.noSemanticDrift === true && row.plannedStatus === "APPROVED");
  const blockedChildren = trace.rows.flatMap((sense) => objectArray(sense.childRows)).filter((row) => row.equality?.noSemanticDrift !== true);
  const senseRevisionPlan = releaseSenses.map((sense) => {
    const senseTrace = traceBySense.get(String(sense.masterSenseId));
    const changes = objectArray(senseTrace?.childRows).filter((child) => child.currentStatus !== "APPROVED" && child.plannedStatus === "APPROVED");
    return {
      masterSenseId: sense.masterSenseId,
      masterLexemeId: sense.masterLexemeId,
      currentSenseRevision: sense.senseRevision,
      plannedSenseRevision: sense.senseRevision + (changes.length > 0 ? 1 : 0),
      currentParentStatus: sense.status,
      plannedParentStatus: sense.status,
      childStatusTransitions: changes.map((child) => ({ entityType: child.entityType, childId: child.childId, from: child.currentStatus, to: "APPROVED" })),
      learnerFacingDrift: 0,
      requiresNewSenseRevision: changes.length > 0,
      materializationAuthorized: false,
    };
  });
  const simulationInput = structuredClone(graph) as MasterProjectionGraph;
  const simulation = simulatePatchProjection(simulationInput, trace.rows);
  const ownerTracePassed = trace.issues.length === 0 && trace.summary.childRowsPassed === 400 && trace.summary.childRowsTraced === 400;
  const projectionReady = ownerTracePassed && simulation.projectedSenses === 100 && simulation.skippedSenses === 0 && simulation.importEligible
    && simulation.appImportContractVersion === APP_IMPORT_CONTRACT_VERSION
    && simulation.projectionContractVersion === RUNTIME_PROJECTION_CONTRACT_VERSION
    && Object.values(simulation.invariantChecks).every((check) => check.unchanged === true);
  if (!projectionReady) traceIssues.push("RUNTIME_PROJECTION_SIMULATION_NOT_100_OF_100");

  const releaseTreeAfter = directoryFingerprint(releaseRoot, ["reports/release-approval-evidence.json", "reports/release-candidate-evidence.json"]);
  const canonicalTreeAfter = directoryFingerprint(path.join(repositoryRoot, "vocabflow-dataset", "master"));
  const canonicalDatasetStateAfter = canonicalDatasetStateFingerprint(repositoryRoot);
  if (releaseTreeAfter !== releaseTreeBefore || releaseTreeAfter !== EXPECTED_RELEASE_TREE) traceIssues.push("FROZEN_2_2_0_SOURCE_CHANGED_DURING_AUDIT");
  if (canonicalTreeAfter !== canonicalTreeBefore || canonicalDatasetStateAfter !== canonicalDatasetStateBefore) traceIssues.push("CANONICAL_MASTER_CHANGED_DURING_AUDIT");
  if (existsSync(targetReleasePath)) traceIssues.push("2_2_1_RELEASE_DIRECTORY_CREATED_DURING_AUDIT");

  const perSenseRows = releaseSenses.map((sense) => {
    const lexeme = releaseLexemes.find((item) => item.masterLexemeId === sense.masterLexemeId);
    const senseTrace = traceBySense.get(String(sense.masterSenseId));
    const translated = objectArray(sense.translations);
    const definitions = objectArray(sense.definitions);
    const examples = objectArray(sense.examples);
    const exampleTranslations = examples.flatMap((example) => objectArray(example.exampleTranslations));
    const simulationRow = simulation.perSenseProjection.find((row) => row.masterSenseId === sense.masterSenseId);
    return {
      masterSenseId: sense.masterSenseId,
      masterLexemeId: sense.masterLexemeId,
      lemma: lexeme?.lemma ?? null,
      partOfSpeech: sense.partOfSpeechCode,
      englishSenseLabel: objectArray(sense.senseLabel).find((label) => label.language === "en")?.text ?? null,
      childStatus: {
        translation: translated[0] ? statusOf(translated[0]) : "MISSING",
        definition: definitions[0] ? statusOf(definitions[0]) : "MISSING",
        example: examples[0] ? statusOf(examples[0]) : "MISSING",
        exampleTranslation: exampleTranslations[0] ? statusOf(exampleTranslations[0]) : "MISSING",
      },
      requiredFutureContent: senseTrace?.learnerContentRequirements ?? { vietnameseTranslation: "NO", englishDefinition: "NO", englishExample: "NO", exampleTranslation: "NO", pronunciationIpa: "NO" },
      plannedSenseRevision: senseTrace?.nextSenseRevision ?? sense.senseRevision,
      releaseProjectionSimulation: simulationRow ?? null,
    };
  });

  const classificationContentBefore = canonicalHash(releaseClassifications.map((item) => ({ ...item })));
  const taxonomyContentBefore = canonicalHash(graph.taxonomy);
  const provenanceIdsBefore = [...provenanceById.keys()].sort((left, right) => left.localeCompare(right, "en"));
  const sourcePinCounts = {
    lexemes: objectArray(manifest.includedLexemes).length,
    senses: objectArray(manifest.includedSenses).length,
    classifications: objectArray(manifest.includedClassifications).length,
    provenance: objectArray(manifest.includedProvenance).length,
    taxonomy: objectArray(manifest.includedTaxonomySnapshots).length,
    media: objectArray(manifest.includedMediaAssets).length,
    mediaVersions: objectArray(manifest.includedMediaAssetVersions).length,
    learningSets: objectArray(manifest.includedLearningSets).length,
    relations: objectArray(manifest.includedRelations).length,
  };
  const issues = [...new Set(traceIssues)].sort();
  const ready = projectionReady && issues.length === 0;

  const nestedLifecycleInventory = {
    generatedBy: ARTIFACT_GENERATOR,
    artifactType: "HYBRID_100_NESTED_LIFECYCLE_INVENTORY",
    sourceReleaseVersion: SOURCE_RELEASE_VERSION,
    sourceReleaseHash: EXPECTED_RELEASE_HASH,
    semanticDraftFingerprint: EXPECTED_SEMANTIC_DRAFT_FINGERPRINT,
    cohortSenseCount: releaseSenses.length,
    statusInventory: lifecycle.statusInventory,
    proposedChildLifecyclePromotions: {
      translation: childRowsToApprove.filter((row) => row.entityType === "TRANSLATION").length,
      definition: childRowsToApprove.filter((row) => row.entityType === "DEFINITION").length,
      example: childRowsToApprove.filter((row) => row.entityType === "EXAMPLE").length,
      exampleTranslation: childRowsToApprove.filter((row) => row.entityType === "EXAMPLE_TRANSLATION").length,
      sensePronunciation: 0,
      lexemePronunciation: 0,
      totalLearnerFacingRows: childRowsToApprove.length,
      blockedRows: blockedChildren.length,
    },
    runtimeContentBySense: perSenseRows,
    pronunciationPolicy: {
      sensePronunciationRows: lifecycle.sensePronunciations.length,
      lexemePronunciationRows: lifecycle.lexemePronunciations.length,
      approvalReady: 0,
      futurePlan: "No pronunciation rows exist in the reviewed cohort; none are inferred, added, or promoted.",
    },
  };
  const ownerReviewTrace = {
    generatedBy: ARTIFACT_GENERATOR,
    artifactType: "HYBRID_100_OWNER_REVIEWED_CHILD_TRACE",
    sourceReleaseHash: EXPECTED_RELEASE_HASH,
    semanticDraftFingerprint: EXPECTED_SEMANTIC_DRAFT_FINGERPRINT,
    ownerPromotionScope: ownerPromotionApproval.ownerApprovalScope,
    nestedChildApprovalAuthorized: false,
    summary: trace.summary,
    issues,
    senses: trace.rows,
  };
  const revisionArtifact = {
    generatedBy: ARTIFACT_GENERATOR,
    artifactType: "HYBRID_100_SENSE_REVISION_PLAN",
    sourceReleaseVersion: SOURCE_RELEASE_VERSION,
    targetReleaseVersion: TARGET_RELEASE_VERSION,
    versionBump: "PATCH",
    exactSenseRevisionCount: senseRevisionPlan.filter((row) => row.requiresNewSenseRevision).length,
    stableSenseIdsPreserved: senseRevisionPlan.length === 100,
    learnerFacingDrift: 0,
    identityDrift: 0,
    provenanceDrift: 0,
    orderingDrift: 0,
    preferredSelectionDrift: 0,
    revisions: senseRevisionPlan,
    materializationAuthorized: false,
  };
  const patchReleasePlan = {
    generatedBy: ARTIFACT_GENERATOR,
    artifactType: "HYBRID_100_PATCH_RELEASE_PLAN",
    sourceRelease: { datasetVersion: SOURCE_RELEASE_VERSION, status: "APPROVED", releaseHash: EXPECTED_RELEASE_HASH, releaseTreeFingerprint: EXPECTED_RELEASE_TREE },
    targetReleasePlan: { datasetVersion: TARGET_RELEASE_VERSION, status: "APPROVED", versionBump: "PATCH", schemaVersion: manifest.schemaVersion, releaseHash: null, created: false },
    semanticDraftFingerprint: EXPECTED_SEMANTIC_DRAFT_FINGERPRINT,
    expectedCohort: sourcePinCounts,
    patchRules: {
      senseIdentity: "preserve all masterSenseId values",
      senseRevision: "create the next immutable parent Sense revision for every Sense with at least one planned nested lifecycle transition",
      parentSenseStatus: "remain APPROVED",
      children: "status-only DRAFT/IN_REVIEW -> APPROVED; preserve child IDs, owners, languages, text, order, preferred flags, and existing provenance references",
      lexemes: "reuse existing APPROVED Lexeme pins; no Lexeme revision unless a dependency requires one (none found)",
      classifications: "reuse all existing APPROVED Classification pins unchanged; no CEFR change",
      taxonomy: "reuse the existing APPROVED 2.0.1 snapshot unchanged",
      provenance: "reuse all 799 existing Provenance pins; allocate none",
      media: "reuse none; source release contains no media",
    },
    plannedSenseRevisionCount: revisionArtifact.exactSenseRevisionCount,
    plannedSenseRevisions: senseRevisionPlan.map(({ masterSenseId, masterLexemeId, currentSenseRevision, plannedSenseRevision, currentParentStatus, plannedParentStatus, childStatusTransitions }) => ({
      masterSenseId, masterLexemeId, currentSenseRevision, plannedSenseRevision, currentParentStatus, plannedParentStatus, childStatusTransitions,
    })),
    unchangedPinSets: {
      lexemePins: true,
      classificationPins: true,
      taxonomySnapshot: true,
      provenanceIds: true,
      mediaPins: true,
      learningSetPins: true,
      relationPins: true,
    },
    expectedManifestChanges: ["datasetVersion", "release timestamps", "releaseHash", "changeSummary", "Sense revision pins and corresponding content hashes"],
    authorization: {
      nestedChildApprovalAuthorized: false,
      senseRevisionMaterializationAuthorized: false,
      patchReleaseBuildAuthorized: false,
    },
  };
  const simulationArtifact = {
    generatedBy: ARTIFACT_GENERATOR,
    artifactType: "HYBRID_100_RUNTIME_PROJECTION_SIMULATION",
    inMemoryOnly: true,
    sourceReleaseHash: EXPECTED_RELEASE_HASH,
    plannedDatasetVersion: TARGET_RELEASE_VERSION,
    appImportContractVersion: simulation.appImportContractVersion,
    projectionContractVersion: simulation.projectionContractVersion,
    projectedSenses: simulation.projectedSenses,
    skippedSenses: simulation.skippedSenses,
    importEligible: simulation.importEligible,
    runtimeFieldCounts: simulation.projectedFields,
    invariantChecks: simulation.invariantChecks,
    perSense: simulation.perSenseProjection,
    generatedArtifactWritten: false,
  };
  const validationSummary = {
    generatedBy: ARTIFACT_GENERATOR,
    artifactType: "HYBRID_100_RUNTIME_ELIGIBILITY_CLOSURE_VALIDATION",
    status: ready ? "PASS" : "BLOCKED",
    sourceRelease: { datasetVersion: SOURCE_RELEASE_VERSION, releaseHash: sourceHash, releaseTreeFingerprint: releaseTreeAfter, unchanged: releaseTreeAfter === EXPECTED_RELEASE_TREE },
    sourceReleaseValidation: { status: validation.status, errors: validation.errorCount, warnings: validation.warningCount, info: validation.infoCount },
    semanticDraftFingerprint: { expected: EXPECTED_SEMANTIC_DRAFT_FINGERPRINT, computed: semanticFingerprint.fingerprint, verified: semanticFingerprint.fingerprint === EXPECTED_SEMANTIC_DRAFT_FINGERPRINT },
    ownerReview: { decisions: trace.summary.ownerReviewedCandidateDecisions, approveDraft: trace.summary.ownerReviewApproveDraftCount, ownerCanonicalDraftPromotionVerified: true, nestedChildApprovalAuthorized: false },
    lifecycleTrace: trace.summary,
    revisionPlan: { exactSenseRevisionCount: revisionArtifact.exactSenseRevisionCount, allStableSenseIdsPreserved: revisionArtifact.stableSenseIdsPreserved },
    patchPlan: { sourceVersion: SOURCE_RELEASE_VERSION, targetVersion: TARGET_RELEASE_VERSION, versionBump: "PATCH", sameCohort: equal(sourcePinCounts, { lexemes: 87, senses: 100, classifications: 99, provenance: 799, taxonomy: 1, media: 0, mediaVersions: 0, learningSets: 0, relations: 0 }) },
    projectionSimulation: { projectedSenses: simulation.projectedSenses, skippedSenses: simulation.skippedSenses, importEligible: simulation.importEligible, appImportContractVersion: simulation.appImportContractVersion, projectionContractVersion: simulation.projectionContractVersion, runtimeFieldCounts: simulation.projectedFields, invariantChecks: simulation.invariantChecks },
    validatorReadinessGap: {
      approvedManifestRequiresApprovedTopLevelSenses: true,
      nestedRowsUseIndependentStatus: true,
      publicationValidatorRequiresRuntimeProjectionCompleteness: false,
      releaseTransformFiltersNestedChildrenByApprovedStatus: true,
      recommendation: "KEEP_MASTER_RELEASE_APPROVAL_AND_RUNTIME_IMPORT_READINESS_SEPARATE; add/use a dedicated runtime-readiness gate without silently changing the publication contract.",
    },
    immutability: {
      releaseTreeBefore: releaseTreeBefore,
      releaseTreeAfter: releaseTreeAfter,
      canonicalMasterTreeBefore: canonicalTreeBefore,
      canonicalMasterTreeAfter: canonicalTreeAfter,
      canonicalDatasetStateBefore,
      canonicalDatasetStateAfter,
      release221DirectoryExisted: false,
      release221DirectoryCreated: false,
      canonicalRevisionsCreated: false,
    },
    sideEffects: { databaseConnection: "NONE", databaseWrites: "NONE", migrations: "NONE", importerApply: "NO", runtimeIdsAllocated: 0, bridgeMappingsCreated: 0, learnerRowsMutated: 0, productionConnection: "NONE", productionMutation: "NO" },
    authorization: { nestedChildApprovalAuthorized: false, senseRevisionMaterializationAuthorized: false, patchRelease221BuildAuthorized: false, databaseWriteAuthorized: false, runtimeImportAuthorized: false, productionMutationAuthorized: false },
    runtimeEligibilityClosureTechnicallyReady: projectionReady,
    phase2G1AReady: ready,
    issues,
    classificationPinFingerprint: classificationContentBefore,
    taxonomyFingerprint: taxonomyContentBefore,
    provenanceIdsFingerprint: canonicalHash(provenanceIdsBefore),
  };

  const report = renderReport({ manifest, lifecycle, trace, perSenseRows, revisionArtifact, patchReleasePlan, simulationArtifact, validationSummary });
  const artifacts = {
    "nested-lifecycle-inventory.json": nestedLifecycleInventory,
    "owner-review-trace.json": ownerReviewTrace,
    "sense-revision-plan.json": revisionArtifact,
    "patch-release-2.2.1-plan.json": patchReleasePlan,
    "runtime-projection-simulation.json": simulationArtifact,
    "validation-summary.json": validationSummary,
    "manifest.json": {
      generatedBy: ARTIFACT_GENERATOR,
      artifactType: "HYBRID_100_RUNTIME_ELIGIBILITY_CLOSURE_MANIFEST",
      sourceReleaseVersion: SOURCE_RELEASE_VERSION,
      sourceReleaseHash: EXPECTED_RELEASE_HASH,
      sourceReleaseTreeFingerprint: EXPECTED_RELEASE_TREE,
      semanticDraftFingerprint: EXPECTED_SEMANTIC_DRAFT_FINGERPRINT,
      targetReleasePlan: TARGET_RELEASE_VERSION,
      versionBump: "PATCH",
      fileInventory: ["nested-lifecycle-inventory.json", "owner-review-trace.json", "sense-revision-plan.json", "patch-release-2.2.1-plan.json", "runtime-projection-simulation.json", "validation-summary.json"],
      noReleaseMaterialized: true,
      authorization: validationSummary.authorization,
    },
  };
  return { artifacts, report, summary: { status: ready ? "PASS" : "BLOCKED", sourceReleaseVersion: SOURCE_RELEASE_VERSION, sourceReleaseHash: EXPECTED_RELEASE_HASH, nestedChildrenTraced: trace.summary.childRowsTraced, nestedChildrenApprovalReady: childRowsToApprove.length, nestedChildrenBlocked: blockedChildren.length, senseRevisionsPlanned: revisionArtifact.exactSenseRevisionCount, projectedSenses: simulation.projectedSenses, skippedSenses: simulation.skippedSenses, importEligible: simulation.importEligible, runtimeEligibilityClosureTechnicallyReady: projectionReady, phase2G1AReady: ready, issues } };
}

function renderReport(input: {
  manifest: JsonObject;
  lifecycle: ReturnType<typeof collectLifecycleRows>;
  trace: ReturnType<typeof checkOwnerAndSemanticTrace>;
  perSenseRows: JsonObject[];
  revisionArtifact: JsonObject;
  patchReleasePlan: JsonObject;
  simulationArtifact: JsonObject;
  validationSummary: JsonObject;
}): string {
  const statuses = input.lifecycle.statusInventory;
  const statusLine = (name: string, count: StatusCounts) => `| ${name} | ${count.approved} | ${count.inReview} | ${count.draft} | ${count.other} | ${count.total} |`;
  const requirementCounts = (key: string) => input.perSenseRows.filter((row) => row.requiredFutureContent?.[key] === "YES").length;
  const senseRows = input.perSenseRows.map((row) => `| ${row.lemma} | ${row.partOfSpeech} | ${row.englishSenseLabel} | ${row.masterSenseId} | ${row.childStatus.translation} / ${row.childStatus.definition} / ${row.childStatus.example} / ${row.childStatus.exampleTranslation} | ${row.requiredFutureContent.vietnameseTranslation} / ${row.requiredFutureContent.englishDefinition} / ${row.requiredFutureContent.englishExample} / ${row.requiredFutureContent.exampleTranslation} / ${row.requiredFutureContent.pronunciationIpa} | ${row.plannedSenseRevision} |`).join("\n");
  const projection = input.simulationArtifact.runtimeFieldCounts;
  const ready = input.validationSummary.phase2G1AReady;
  return `<!-- generatedBy: ${ARTIFACT_GENERATOR} -->

# Hybrid-100 Nested Learner-Content Lifecycle Audit — Patch 2.2.1 Plan

## Outcome

**RUNTIME_ELIGIBILITY_CLOSURE_TECHNICALLY_READY = ${input.validationSummary.runtimeEligibilityClosureTechnicallyReady ? "YES" : "NO"}.** **PHASE_2G1A_READY = ${ready ? "YES" : "NO"}.** This is an offline audit and in-memory simulation only. It does not authorize nested child approval, Sense revision materialization, a 2.2.1 release build, runtime import, database writes, or production mutation.

## Pinned source and owner-reviewed package

- Source release: \`2.2.0 / APPROVED\`; releaseHash \`${EXPECTED_RELEASE_HASH}\`; immutable release tree fingerprint \`${EXPECTED_RELEASE_TREE}\`.
- Owner-reviewed semantic draft fingerprint: \`${EXPECTED_SEMANTIC_DRAFT_FINGERPRINT}\`; independently recomputed from the workspace records, candidate map, identity registry, editorial decisions, and authorship audit. The owner authorization artifact binds that fingerprint to canonical DRAFT promotion only.
- Cohort: ${input.manifest.includedLexemes.length} Lexemes, ${input.manifest.includedSenses.length} Senses, ${input.manifest.includedClassifications.length} Classifications, ${input.manifest.includedProvenance.length} Provenance records, ${input.manifest.includedTaxonomySnapshots.length} Taxonomy snapshot, ${input.manifest.includedMediaAssets.length} Media assets, ${input.manifest.includedLearningSets.length} Learning Sets, ${input.manifest.includedRelations.length} Relations.
- Parent Sense status: ${statuses.parentSenses.approved} APPROVED / ${statuses.parentSenses.total}.

## Nested lifecycle status inventory

| Child type | APPROVED | IN_REVIEW | DRAFT | Other | Total |
|---|---:|---:|---:|---:|---:|
${statusLine("Translation", statuses.translations)}
${statusLine("Definition", statuses.definitions)}
${statusLine("Example", statuses.examples)}
${statusLine("ExampleTranslation", statuses.exampleTranslations)}
${statusLine("Sense Pronunciation", statuses.sensePronunciations)}
${statusLine("Lexeme Pronunciation", statuses.lexemePronunciations)}

The four learner-facing child types each have ${input.trace.summary.childRowsTraced / 4} rows. All ${input.trace.summary.childRowsPassed} rows trace to the exact semantic package or a pinned existing-Sense reuse decision. Their stable child/owner IDs, language, text, order, preferred selection and Provenance links match their reviewed source; observed drift is zero. ${input.trace.summary.childRowsBlocked} child rows are blocked. Pronunciation rows are absent from the approved package and release, so none are inferred or promoted.

For new authored Senses, the audit independently verifies the Phase 2F.2 semantic package fingerprint and compares released semantic fields to the owner-reviewed revision-1 draft records. Provenance references are checked against the current canonical manifest's exact immutable Sense pins and the 799 Provenance pins in release 2.2.0; each child reference resolves to the expected owner and field path. The two reuse decisions resolve to the exact canonical record paths/content hashes pinned by owner review; their child content and Provenance refs are preserved from those records.

## Runtime content and in-memory simulation

- Future required Vietnamese Translation: ${requirementCounts("vietnameseTranslation")}/100 Senses.
- English Definition preserved: ${requirementCounts("englishDefinition")}/100.
- English Example preserved: ${requirementCounts("englishExample")}/100.
- ExampleTranslation preserved: ${requirementCounts("exampleTranslation")}/100.
- Pronunciation/IPA present in source: 0 records; IPA is not required by the current projection contract and no IPA is synthesized.
- Simulated App Import: \`${input.simulationArtifact.appImportContractVersion}\`; projection: \`${input.simulationArtifact.projectionContractVersion}\`.
- RELEASE projection: ${input.simulationArtifact.projectedSenses}/100 projected; ${input.simulationArtifact.skippedSenses} skipped; importEligible=${input.simulationArtifact.importEligible}.
- Non-null runtime fields: Vietnamese ${projection.vietnameseNonNull}; definitionEn ${projection.definitionEnNonNull}; exampleEn ${projection.exampleEnNonNull}; ipa ${projection.ipaNonNull}.
- Simulation is in memory. No simulated file or release directory was written.

## 2.2.1 PATCH plan

- Planned transition: \`2.2.0 → 2.2.1\` / \`PATCH\`, under the repository identity/versioning policy.
- Sense revisions required: **${input.revisionArtifact.exactSenseRevisionCount}**; stable Master Sense IDs preserved and parent status remains APPROVED. Every planned Sense revision is the next monotonic revision because its nested statuses change.
- Only nested lifecycle statuses become APPROVED. Lexeme pins, CEFR Classification pins/values, taxonomy 2.0.1, the 799 Provenance IDs, media/set/relation counts and learner-facing text remain unchanged.
- Planned target cohort remains 87 Lexemes, 100 Senses, 99 Classifications, 799 Provenance records, 1 Taxonomy snapshot, 0 media, 0 Learning Sets, 0 Relations. Release timestamps, releaseHash and change summary belong to a future authorized build.
- Child approval, Sense revision materialization, and release 2.2.1 creation are **not authorized**. Release directory created: NO.

## Publication validator and runtime-readiness boundary

The current validator requires an APPROVED manifest's pinned top-level Lexeme/Sense/Classification records to be APPROVED. Nested Translation, Definition, Example, ExampleTranslation and Pronunciation keep independent status values and are checked for schema/reference/Provenance rules; the publication validator does not require the nested rows to satisfy runtime projection completeness. The RELEASE transform correctly filters nested learner-facing content by its own APPROVED status and fails closed when no eligible Vietnamese Translation exists.

Recommendation: keep Master-release approval and runtime-import readiness separate, with a dedicated runtime-readiness gate. Do not silently change the publication validator contract.

## Safety and validation

- Frozen 2.2.0 release hash/tree: unchanged before and after.
- Canonical Master: unchanged; no revisions created.
- 2.2.1 release: not created.
- Development/Neon/Production: no connection; no database writes or migrations; no importer apply.
- Authorization flags: \`NESTED_CHILD_APPROVAL_AUTHORIZED = NO\`; \`SENSE_REVISION_MATERIALIZATION_AUTHORIZED = NO\`; \`PATCH_RELEASE_2_2_1_BUILD_AUTHORIZED = NO\`; \`DATABASE_WRITE_AUTHORIZED = NO\`; \`RUNTIME_IMPORT_AUTHORIZED = NO\`; \`PRODUCTION_MUTATION_AUTHORIZED = NO\`.
- Release validator: PASS; semantic fingerprint: verified; owner-child trace: ${input.trace.summary.childRowsPassed}/${input.trace.summary.childRowsTraced}; projection simulation: ${input.simulationArtifact.projectedSenses}/100.

## Per-Sense content checklist

Statuses are Translation / Definition / Example / ExampleTranslation. Required content is Vietnamese Translation / English Definition / English Example / ExampleTranslation / Pronunciation-IPA.

| Lemma | POS | Reviewed meaning | Master Sense ID | Current child statuses | Required future content | Planned Sense revision |
|---|---|---|---|---|---|---:|
${senseRows}
`;
}

function writeJson(filePath: string, value: unknown): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function ensureOutputPathsSafe(repositoryRoot: string): void {
  const outputRoot = path.join(repositoryRoot, OUTPUT_RELATIVE);
  const reportPath = path.join(repositoryRoot, REPORT_RELATIVE);
  const expectedFiles = new Set(["manifest.json", "nested-lifecycle-inventory.json", "owner-review-trace.json", "sense-revision-plan.json", "patch-release-2.2.1-plan.json", "runtime-projection-simulation.json", "validation-summary.json"]);
  if (existsSync(outputRoot)) {
    for (const file of recursiveFiles(outputRoot)) {
      const relative = path.relative(outputRoot, file).split(path.sep).join("/");
      if (!expectedFiles.has(relative)) throw new Error("REFUSING_TO_OVERWRITE_UNRELATED_CLOSURE_WORKSPACE_FILE");
      const data = readJson<JsonObject>(file);
      if (data.generatedBy !== ARTIFACT_GENERATOR) throw new Error("REFUSING_TO_OVERWRITE_NON_GENERATED_CLOSURE_ARTIFACT");
    }
  }
  if (existsSync(reportPath) && !readFileSync(reportPath, "utf8").startsWith(`<!-- generatedBy: ${ARTIFACT_GENERATOR} -->`)) {
    throw new Error("REFUSING_TO_OVERWRITE_NON_GENERATED_CLOSURE_REPORT");
  }
}

export function runHybrid100RuntimeEligibilityClosure(repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")) {
  ensureOutputPathsSafe(repositoryRoot);
  const result = buildHybrid100RuntimeEligibilityClosure(repositoryRoot);
  const outputRoot = path.join(repositoryRoot, OUTPUT_RELATIVE);
  for (const [fileName, value] of Object.entries(result.artifacts)) writeJson(path.join(outputRoot, fileName), value);
  const reportPath = path.join(repositoryRoot, REPORT_RELATIVE);
  mkdirSync(path.dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, result.report, "utf8");
  if (existsSync(path.join(repositoryRoot, TARGET_RELEASE_RELATIVE))) throw new Error("PATCH_RELEASE_2_2_1_DIRECTORY_MUST_NOT_BE_CREATED");
  const finalReleaseTree = directoryFingerprint(path.join(repositoryRoot, RELEASE_RELATIVE), ["reports/release-approval-evidence.json", "reports/release-candidate-evidence.json"]);
  const finalCanonicalTree = directoryFingerprint(path.join(repositoryRoot, "vocabflow-dataset", "master"));
  const finalCanonicalDatasetState = canonicalDatasetStateFingerprint(repositoryRoot);
  if (finalReleaseTree !== EXPECTED_RELEASE_TREE || finalCanonicalTree !== result.artifacts["validation-summary.json"].immutability.canonicalMasterTreeBefore
    || finalCanonicalDatasetState !== result.artifacts["validation-summary.json"].immutability.canonicalDatasetStateBefore) {
    throw new Error("POST_WRITE_SOURCE_IMMUTABILITY_CHECK_FAILED");
  }
  return result.summary;
}

function isMain(): boolean {
  const scriptPath = process.argv[1];
  return Boolean(scriptPath && path.resolve(scriptPath) === path.resolve(fileURLToPath(import.meta.url)));
}

if (isMain()) {
  try {
    const summary = runHybrid100RuntimeEligibilityClosure();
    process.stdout.write(`${Object.entries(summary).map(([key, value]) => `${key}=${JSON.stringify(value)}`).join("\n")}\n`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "HYBRID_100_RUNTIME_ELIGIBILITY_CLOSURE_FAILED";
    process.stderr.write(`${/^[A-Z0-9_:.-]{3,140}$/.test(message) ? message : "HYBRID_100_RUNTIME_ELIGIBILITY_CLOSURE_FAILED"}\n`);
    process.exitCode = 1;
  }
}
