import { mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildArtifactDigest } from "./build-artifact-safety";
import {
  vercelDeployCommandPlan,
  verifyLinkedVercelProject,
  verifyVercelArtifact,
  verifyVercelProductionOrigin,
} from "./vercel-deployment-safety";

let temporaryRoot: string | undefined;

afterEach(() => {
  if (temporaryRoot) rmSync(temporaryRoot, { recursive: true, force: true });
  temporaryRoot = undefined;
});

describe("Vercel release deployment guards", () => {
  it("keeps local frontend and Vercel full-stack development commands separate", () => {
    const packageJson = JSON.parse(readFileSync(resolve("package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts.dev).toBe("pnpm dev:web");
    expect(packageJson.scripts["dev:web"]).toContain("vite --config apps/web/vite.config.mts");
    expect(packageJson.scripts["dev:vercel"]).toBe("vercel dev --local --listen 3000");
    expect(packageJson.scripts.dev).not.toContain("vercel dev");
  });

  it("uses explicit preview and production CLI targets without implicit production", () => {
    expect(vercelDeployCommandPlan("preview")).toEqual([
      ["pull", "--yes", "--environment=preview"],
      ["build"],
      ["deploy", "--prebuilt", "--yes"],
    ]);
    expect(vercelDeployCommandPlan("production")).toEqual([
      ["pull", "--yes", "--environment=production"],
      ["build", "--prod"],
      ["deploy", "--prebuilt", "--prod", "--yes"],
    ]);
  });

  it("requires an exact owner-approved linked project and organization", () => {
    expect(verifyLinkedVercelProject({
      linkedProject: { projectId: "prj_owner_approved", orgId: "team_owner_approved" },
      expectedProjectId: "prj_owner_approved",
      expectedOrgId: "team_owner_approved",
    })).toEqual({ projectId: "prj_owner_approved", orgId: "team_owner_approved" });
    expect(() => verifyLinkedVercelProject({
      linkedProject: { projectId: "prj_other", orgId: "team_owner_approved" },
      expectedProjectId: "prj_owner_approved",
      expectedOrgId: "team_owner_approved",
    })).toThrow("VERCEL_LINKED_PROJECT_MISMATCH");
    expect(() => verifyLinkedVercelProject({ linkedProject: { projectId: "prj_any", orgId: "team_any" } }))
      .toThrow("VERCEL_PROJECT_ID_OWNER_INPUT_REQUIRED");
  });

  it("requires a canonical HTTPS production auth origin", () => {
    expect(verifyVercelProductionOrigin("https://learn.owner-domain.vn/"))
      .toBe("https://learn.owner-domain.vn");
    expect(() => verifyVercelProductionOrigin(undefined)).toThrow("BETTER_AUTH_URL_OWNER_INPUT_REQUIRED");
  });

  it("requires a clean static artifact and packaged API function for the same SHA", () => {
    temporaryRoot = mkdtempSync(join(tmpdir(), "vocabflow-vercel-artifact-"));
    const distributionRoot = join(temporaryRoot, "dist");
    const clientRoot = join(distributionRoot, "client");
    const outputRoot = join(temporaryRoot, ".vercel", "output");
    const staticRoot = join(outputRoot, "static");
    const apiFunctionRoot = join(outputRoot, "functions", "api", "handler.func");
    mkdirSync(clientRoot, { recursive: true });
    mkdirSync(staticRoot, { recursive: true });
    mkdirSync(apiFunctionRoot, { recursive: true });
    writeFileSync(join(clientRoot, "index.html"), "<div>safe</div>", "utf8");
    writeFileSync(join(staticRoot, "index.html"), "<div>safe</div>", "utf8");
    writeFileSync(join(apiFunctionRoot, "index.js"), "export default { fetch: () => new Response('ok') }", "utf8");
    const releaseSha = "a".repeat(40);
    writeFileSync(join(distributionRoot, "vocabflow-release-metadata.json"), JSON.stringify({
      releaseSha,
      outputDirectory: "dist/client",
      artifactDigest: buildArtifactDigest(clientRoot),
    }), "utf8");

    expect(verifyVercelArtifact({ outputRoot, distributionRoot, releaseSha }).deployScan.safe).toBe(true);
    expect(() => verifyVercelArtifact({ outputRoot, distributionRoot, releaseSha: "b".repeat(40) }))
      .toThrow("PRODUCTION_ARTIFACT_RELEASE_MISMATCH");

    const legacyCatchAllRoot = join(outputRoot, "functions", "api", "[...route].func");
    renameSync(apiFunctionRoot, legacyCatchAllRoot);
    expect(() => verifyVercelArtifact({ outputRoot, distributionRoot, releaseSha }))
      .toThrow("VERCEL_API_FUNCTION_MISSING");
    renameSync(legacyCatchAllRoot, apiFunctionRoot);

    writeFileSync(join(apiFunctionRoot, ".env.production"), "BETTER_AUTH_SECRET=synthetic-fixture", "utf8");
    expect(() => verifyVercelArtifact({ outputRoot, distributionRoot, releaseSha }))
      .toThrow("BUILD_ARTIFACT_SECURITY_CHECK_FAILED");
  });

  it("defines repository-root Vite output and excludes API paths and assets from the SPA rewrite", () => {
    const config = JSON.parse(readFileSync(resolve("vercel.json"), "utf8")) as {
      framework: string;
      installCommand: string;
      buildCommand: string;
      devCommand: string;
      outputDirectory: string;
      rewrites: Array<{ source: string; destination: string }>;
    };
    expect(config).toMatchObject({
      framework: "vite",
      installCommand: "pnpm install --frozen-lockfile",
      buildCommand: "pnpm build:production",
      devCommand: "pnpm dev:web --port $PORT",
      outputDirectory: "dist/client",
    });
    const fallback = new RegExp(`^${config.rewrites[2]?.source}$`);
    expect(config.rewrites[2]?.destination).toBe("/index.html");
    expect(fallback.test("/")).toBe(true);
    expect(fallback.test("/study/exercises")).toBe(true);
    expect(fallback.test("/src/main.tsx")).toBe(false);
    expect(fallback.test("/@vite/client")).toBe(false);
    expect(fallback.test("/@react-refresh")).toBe(false);
    expect(fallback.test("/api")).toBe(false);
    expect(fallback.test("/api/health")).toBe(false);
    expect(config).not.toHaveProperty("routes");
    expect(config.rewrites).toEqual([
      {
        source: "/api",
        destination: "/api/handler?__vocabflow_path=/api",
      },
      {
        source: "/api/:__vocabflow_route*",
        destination: "/api/handler?__vocabflow_path=/api/:__vocabflow_route*",
      },
      {
        source: "/((?!api(?:/|$)|@|.*\\.[^/]+$).*)",
        destination: "/index.html",
      },
    ]);
    expect(config.rewrites[0]?.source).toBe("/api");
    expect(config.rewrites[1]?.source).toBe("/api/:__vocabflow_route*");
    expect(config.rewrites[2]?.destination).toBe("/index.html");
    expect(config.rewrites[1]?.destination.replace(":__vocabflow_route*", "learners/123/progress-history"))
      .toBe("/api/handler?__vocabflow_path=/api/learners/123/progress-history");
    expect(config.rewrites.some((rewrite) => "transforms" in rewrite)).toBe(false);
    expect(readFileSync(resolve("api", "handler.ts"), "utf8")).toContain("application.fetch(");
  });

  it("keeps the Vercel production build independent of Cloudflare settings", () => {
    const buildScript = readFileSync(resolve("scripts/production-build.ts"), "utf8");
    expect(buildScript).not.toMatch(/CLOUDFLARE|WRANGLER|zoneName|workers_dev/i);
    expect(buildScript).toContain('resolve("dist", "client")');
  });
});
