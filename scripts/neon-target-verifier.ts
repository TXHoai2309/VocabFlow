import type { ConnectionTarget, ConfiguredConnectionFingerprint, ProviderVerifiedTarget, ResolvedDatabaseTarget, ProviderErrorCode } from "@vocabflow/contracts";
import { resolveDatabaseTarget } from "@vocabflow/contracts";

export type NeonBranchResult = { projectId: string; branchId: string };
export type NeonConnectionResult = { uri: string };

export interface NeonApiClient {
  getBranch(input: { projectId: string; branchId: string }): Promise<NeonBranchResult>;
  getConnectionUri(input: {
    projectId: string;
    branchId: string;
    databaseName: string;
    roleName: string;
    pooled: boolean;
  }): Promise<NeonConnectionResult>;
}

export type NeonVerificationCode = ProviderErrorCode;

export type NeonVerificationResult =
  | { ok: true; verified: ResolvedDatabaseTarget }
  | { ok: false; code: NeonVerificationCode; message: string };

const safeMessage = "Neon provider verification failed.";

export async function verifyNeonTarget(input: {
  expected: ConnectionTarget;
  configuredConnection: ConfiguredConnectionFingerprint;
  neonApiClient: NeonApiClient;
}): Promise<NeonVerificationResult> {
  try {
    const branch = await input.neonApiClient.getBranch({
      projectId: input.expected.projectId,
      branchId: input.expected.branchId
    });
    if (branch.projectId !== input.expected.projectId) return { ok: false, code: "PROJECT_NOT_FOUND", message: safeMessage };
    if (branch.branchId !== input.expected.branchId) return { ok: false, code: "BRANCH_NOT_FOUND", message: safeMessage };

    const connection = await input.neonApiClient.getConnectionUri({
      projectId: input.expected.projectId,
      branchId: input.expected.branchId,
      databaseName: input.expected.databaseName,
      roleName: input.expected.roleName,
      pooled: input.expected.pooled
    });
    const parsed = new URL(connection.uri);
    const provider: ProviderVerifiedTarget = {
      projectId: input.expected.projectId,
      branchId: input.expected.branchId,
      host: parsed.hostname.toLowerCase(),
      databaseName: decodeURIComponent(parsed.pathname.replace(/^\//, "")),
      roleName: decodeURIComponent(parsed.username),
      pooled: parsed.hostname.toLowerCase().includes("-pooler")
    };
    const verified = resolveDatabaseTarget(input.expected, provider, input.configuredConnection);
    return { ok: true, verified };
  } catch (error) {
    if (error instanceof Error) {
      const code = error.message as NeonVerificationCode;
      if (["PROVIDER_AUTH_FAILED", "PROJECT_NOT_FOUND", "BRANCH_NOT_FOUND", "PROVIDER_RESPONSE_INVALID", "CONNECTION_TARGET_MISMATCH", "PROVIDER_UNAVAILABLE"].includes(code)) {
        return { ok: false, code, message: safeMessage };
      }
      if (error instanceof TypeError) return { ok: false, code: "PROVIDER_RESPONSE_INVALID", message: safeMessage };
    }
    return { ok: false, code: "PROVIDER_UNAVAILABLE", message: safeMessage };
  }
}

function parseProviderJson(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") throw new Error("PROVIDER_RESPONSE_INVALID");
  return value as Record<string, unknown>;
}

export function createNeonApiClient(apiKey: string, fetchImpl: typeof fetch = fetch): NeonApiClient {
  if (!apiKey) throw new Error("PROVIDER_AUTH_FAILED");
  const request = async (url: string): Promise<Record<string, unknown>> => {
    const response = await fetchImpl(url, { headers: { Authorization: `Bearer ${apiKey}` } });
    if (response.status === 401 || response.status === 403) throw new Error("PROVIDER_AUTH_FAILED");
    if (response.status === 404) throw new Error("BRANCH_NOT_FOUND");
    if (!response.ok) throw new Error("PROVIDER_UNAVAILABLE");
    return parseProviderJson(await response.json());
  };
  return {
    async getBranch({ projectId, branchId }) {
      const body = await request(`https://console.neon.tech/api/v2/projects/${encodeURIComponent(projectId)}/branches/${encodeURIComponent(branchId)}`);
      const id = typeof body.id === "string" ? body.id : typeof body.branch_id === "string" ? body.branch_id : undefined;
      const project = typeof body.project_id === "string" ? body.project_id : projectId;
      if (!id || project !== projectId) throw new Error("PROVIDER_RESPONSE_INVALID");
      return { projectId: project, branchId: id };
    },
    async getConnectionUri({ projectId, branchId, databaseName, roleName, pooled }) {
      const params = new URLSearchParams({
        branch_id: branchId,
        database_name: databaseName,
        role_name: roleName,
        pooled: String(pooled)
      });
      const body = await request(`https://console.neon.tech/api/v2/projects/${encodeURIComponent(projectId)}/connection_uri?${params}`);
      const uri = typeof body.uri === "string" ? body.uri : undefined;
      if (!uri) throw new Error("PROVIDER_RESPONSE_INVALID");
      return { uri };
    }
  };
}

export function mapProviderCodeToDbStatus(code: NeonVerificationCode): "FAIL" | "BLOCKED_PROVIDER_VERIFICATION" {
  return code === "PROVIDER_UNAVAILABLE" ? "BLOCKED_PROVIDER_VERIFICATION" : "FAIL";
}
