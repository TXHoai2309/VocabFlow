import { inspectBuildArtifact, sanitizeGeneratedSecretFiles } from "./build-artifact-safety";

try {
  const removed = sanitizeGeneratedSecretFiles();
  const scan = inspectBuildArtifact();
  if (!scan.safe) throw new Error("BUILD_ARTIFACT_SECURITY_CHECK_FAILED");
  console.log(`BUILD_DEV_ENV_FILES_REMOVED=${removed}`);
  console.log(`CLIENT_SECRET_SCAN=PASS key_name_hits=${scan.clientSecretKeyNameMatches} value_hits=${scan.secretValueMatches}`);
  console.log("BUILD_SOURCE_MAP_SCAN=PASS");
} catch (error) {
  const message = error instanceof Error ? error.message : "";
  console.error(/^[A-Z][A-Z0-9_]{2,79}$/.test(message) ? message : "BUILD_ARTIFACT_SECURITY_CHECK_FAILED");
  process.exitCode = 1;
}
