import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertProductionReleaseIsCurrentMain,
  TRUSTED_DB_MAX_WAIT_MS,
  TRUSTED_DB_POLL_INTERVAL_MS,
  waitForTrustedDbIntegration,
} from "./production-release-safety";

const workflow = readFileSync(resolve(".github/workflows/production-release.yml"), "utf8").replace(/\r\n/g, "\n");
const repository = "TXHoai2309/VocabFlow";

function trustedDbRun(releaseSha: string, overrides: Record<string, unknown> = {}) {
  return {
    name: "Trusted DB Integration",
    head_sha: releaseSha,
    head_branch: "main",
    event: "push",
    status: "completed",
    conclusion: "success",
    repository: { full_name: repository },
    head_repository: { full_name: repository },
    ...overrides,
  };
}

function fakeClock() {
  let time = 0;
  const delays: number[] = [];
  return {
    now: () => time,
    delays,
    sleep: async (milliseconds: number) => {
      delays.push(milliseconds);
      time += milliseconds;
    },
  };
}

describe("production release workflow safety contract", () => {
  it("waits for successful Core CI on a same-repository main push", () => {
    expect(workflow).toMatch(/workflow_run:\n\s+workflows:\n\s+- Core CI\n\s+types:\n\s+- completed\n\s+branches:\n\s+- main/);
    expect(workflow).toContain("github.event.workflow_run.name == 'Core CI'");
    expect(workflow).toContain("github.event.workflow_run.conclusion == 'success'");
    expect(workflow).toContain("github.event.workflow_run.head_branch == 'main'");
    expect(workflow).toContain("github.event.workflow_run.event == 'push'");
    expect(workflow).toContain("github.event.workflow_run.head_repository.full_name == 'TXHoai2309/VocabFlow'");
    expect(workflow).toContain("github.event.repository.full_name == 'TXHoai2309/VocabFlow'");
  });

  it("checks out and verifies the immutable SHA from the Core CI run", () => {
    expect(workflow).toContain("ref: ${{ github.event.workflow_run.head_sha }}");
    expect(workflow).toContain("fetch-depth: 0");
    expect(workflow).toContain('actual_sha="$(git rev-parse HEAD)"');
    expect(workflow).toContain('[[ "$actual_sha" != "$RELEASE_SHA" ]]');
    expect(workflow).toContain("VOCABFLOW_RELEASE_SHA: ${{ github.event.workflow_run.head_sha }}");
  });

  it("runs preflight, dry-run, guarded migration, and safe deploy sequentially", () => {
    const preflight = workflow.indexOf("Production DB preflight (read-only)");
    const dryRun = workflow.indexOf("Production migration plan (read-only)");
    const apply = workflow.indexOf("Apply forward-only production migrations");
    const postMigrationPreflight = workflow.indexOf("Verify production DB after migration (read-only)");
    const idempotency = workflow.indexOf("Verify no production migrations remain pending");
    const deploy = workflow.indexOf("Deploy the migrated release SHA to Vercel Production");
    expect(preflight).toBeGreaterThan(-1);
    expect(dryRun).toBeGreaterThan(preflight);
    expect(apply).toBeGreaterThan(dryRun);
    expect(postMigrationPreflight).toBeGreaterThan(apply);
    expect(idempotency).toBeGreaterThan(postMigrationPreflight);
    expect(deploy).toBeGreaterThan(idempotency);
    expect(workflow).toContain("pnpm db:production-preflight --target production");
    expect(workflow).toContain("pnpm db:migrate --target production");
    expect(workflow).toContain('migration_report="$(pnpm db:migrate --target production)"');
    expect(workflow).not.toMatch(/pnpm db:production-preflight -- --target/);
    expect(workflow).not.toMatch(/pnpm db:migrate -- --target/);
    expect(workflow).toContain("--confirm-target production");
    expect(workflow).toContain('--confirm-branch "$PRODUCTION_BRANCH_ID"');
    expect(workflow).toContain("DATABASE_TARGETS.production.branchId");
    expect(workflow).toContain("--apply");
    expect(workflow).toContain("MIGRATIONS_PENDING=0");
    expect(workflow).toContain("PRODUCTION_POST_MIGRATION_VERIFY_FAILED");
    expect(workflow).toContain("pnpm deploy:production");
    expect(workflow).not.toContain("continue-on-error:");
    expect(workflow).not.toContain("if: always()");
    expect(workflow).not.toContain("vercel --prod");
    expect(workflow).not.toContain("workflow_dispatch:");
    expect(workflow).not.toContain("pull_request:");
  });

  it("stops stale workflow runs before migration mutation or deployment", () => {
    const currentMain = workflow.indexOf("Verify release SHA is still current main before mutation");
    const trustedDbGate = workflow.indexOf("Wait for Trusted DB Integration for release SHA");
    const currentMainRecheck = workflow.indexOf("Reconfirm release SHA is still current main before mutation");
    const apply = workflow.indexOf("Apply forward-only production migrations");
    const deploy = workflow.indexOf("Deploy the migrated release SHA to Vercel Production");
    const guard = workflow.slice(currentMain, apply);

    expect(currentMain).toBeGreaterThan(-1);
    expect(currentMain).toBeGreaterThan(workflow.indexOf("Production migration plan (read-only)"));
    expect(currentMain).toBeLessThan(trustedDbGate);
    expect(trustedDbGate).toBeLessThan(currentMainRecheck);
    expect(currentMainRecheck).toBeLessThan(apply);
    expect(apply).toBeLessThan(deploy);
    expect(guard).toContain("${GITHUB_API_URL}/repos/TXHoai2309/VocabFlow/commits/main");
    expect(guard).toContain("READONLY_GITHUB_TOKEN: ${{ github.token }}");
    expect(guard).toContain("assertProductionReleaseIsCurrentMain");
    expect(guard).toContain("PRODUCTION_RELEASE_NOT_CURRENT_MAIN");
    expect(guard).toContain("PRODUCTION_MAIN_HEAD_LOOKUP_FAILED");
    expect(workflow).not.toContain("continue-on-error:");
    expect(workflow).not.toContain("if: always()");
  });

  it("polls Trusted DB for the exact release SHA before mutation and times out before apply", () => {
    const trustedDbGate = workflow.indexOf("Wait for Trusted DB Integration for release SHA");
    const apply = workflow.indexOf("Apply forward-only production migrations");
    const deploy = workflow.indexOf("Deploy the migrated release SHA to Vercel Production");
    const gate = workflow.slice(trustedDbGate, apply);

    expect(trustedDbGate).toBeGreaterThan(workflow.indexOf("Verify release SHA is still current main before mutation"));
    expect(trustedDbGate).toBeLessThan(apply);
    expect(apply).toBeLessThan(deploy);
    expect(gate).toContain("actions/workflows/trusted-db.yml/runs");
    expect(gate).toContain('url.searchParams.set("head_sha", releaseSha)');
    expect(gate).toContain('url.searchParams.set("branch", "main")');
    expect(gate).toContain('url.searchParams.set("event", "push")');
    expect(gate).toContain("READONLY_GITHUB_TOKEN: ${{ github.token }}");
    expect(gate).toContain("waitForTrustedDbIntegration");
    expect(gate).toContain("PRODUCTION_TRUSTED_DB_REQUIRED");
    expect(gate).toContain("AbortSignal.timeout(timeoutMs)");
    expect(TRUSTED_DB_POLL_INTERVAL_MS).toBe(15_000);
    expect(TRUSTED_DB_MAX_WAIT_MS).toBe(35 * 60 * 1_000);
    expect(workflow).toContain("timeout-minutes: 60");
    expect(workflow).not.toContain("continue-on-error:");
    expect(workflow).not.toContain("if: always()");
  });

  it("continues immediately for a matching successful Trusted DB run", async () => {
    const releaseSha = "a".repeat(40);
    let requestCount = 0;
    await expect(waitForTrustedDbIntegration({
      releaseSha,
      fetchWorkflowRuns: async () => {
        requestCount += 1;
        return { workflow_runs: [trustedDbRun(releaseSha)] };
      },
    })).resolves.toBeUndefined();
    expect(requestCount).toBe(1);
  });

  it.each(["queued", "in_progress", "requested", "waiting", "pending"])(
    "retries a Trusted DB run in %s state",
    async (status) => {
      const releaseSha = "a".repeat(40);
      const clock = fakeClock();
      let requestCount = 0;
      await waitForTrustedDbIntegration({
        releaseSha,
        now: clock.now,
        sleep: clock.sleep,
        fetchWorkflowRuns: async () => {
          requestCount += 1;
          return { workflow_runs: [trustedDbRun(releaseSha, {
            status: requestCount === 1 ? status : "completed",
            conclusion: requestCount === 1 ? null : "success",
          })] };
        },
      });
      expect(requestCount).toBe(2);
      expect(clock.delays).toEqual([15_000]);
    },
  );

  it("retries when no matching Trusted DB run exists yet", async () => {
    const releaseSha = "a".repeat(40);
    const clock = fakeClock();
    let requestCount = 0;
    await waitForTrustedDbIntegration({
      releaseSha,
      now: clock.now,
      sleep: clock.sleep,
      fetchWorkflowRuns: async () => {
        requestCount += 1;
        return { workflow_runs: requestCount === 1 ? [] : [trustedDbRun(releaseSha)] };
      },
    });
    expect(requestCount).toBe(2);
    expect(clock.delays).toEqual([15_000]);
  });

  it.each(["failure", "cancelled", "skipped", "timed_out", "action_required", "neutral", "stale"])(
    "fails immediately for a completed Trusted DB run with conclusion %s",
    async (conclusion) => {
      const releaseSha = "a".repeat(40);
      const clock = fakeClock();
      let requestCount = 0;
      await expect(waitForTrustedDbIntegration({
        releaseSha,
        now: clock.now,
        sleep: clock.sleep,
        fetchWorkflowRuns: async () => {
          requestCount += 1;
          return { workflow_runs: [trustedDbRun(releaseSha, { conclusion })] };
        },
      })).rejects.toThrow("PRODUCTION_TRUSTED_DB_REQUIRED");
      expect(requestCount).toBe(1);
      expect(clock.delays).toEqual([]);
    },
  );

  it("does not count a successful workflow run for another SHA", async () => {
    const releaseSha = "a".repeat(40);
    const otherSha = "b".repeat(40);
    const clock = fakeClock();
    let requestCount = 0;
    await expect(waitForTrustedDbIntegration({
      releaseSha,
      now: clock.now,
      sleep: clock.sleep,
      pollIntervalMs: 15_000,
      maxWaitMs: 30_000,
      fetchWorkflowRuns: async () => {
        requestCount += 1;
        return { workflow_runs: [trustedDbRun(otherSha)] };
      },
    })).rejects.toThrow("PRODUCTION_TRUSTED_DB_REQUIRED");
    expect(requestCount).toBe(2);
    expect(clock.delays).toEqual([15_000, 15_000]);
  });

  it("retries wrong repository, branch, or event instead of counting the run", async () => {
    const releaseSha = "a".repeat(40);
    const clock = fakeClock();
    let requestCount = 0;
    const invalidRuns = [
      trustedDbRun(releaseSha, { repository: { full_name: "other/repo" } }),
      trustedDbRun(releaseSha, { head_repository: { full_name: "other/repo" } }),
      trustedDbRun(releaseSha, { head_branch: "feature/release" }),
      trustedDbRun(releaseSha, { event: "workflow_dispatch" }),
    ];
    await waitForTrustedDbIntegration({
      releaseSha,
      now: clock.now,
      sleep: clock.sleep,
      maxWaitMs: 75_000,
      fetchWorkflowRuns: async () => {
        requestCount += 1;
        return { workflow_runs: requestCount <= invalidRuns.length
          ? [invalidRuns[requestCount - 1]]
          : [trustedDbRun(releaseSha)] };
      },
    });
    expect(requestCount).toBe(invalidRuns.length + 1);
    expect(clock.delays).toEqual([15_000, 15_000, 15_000, 15_000]);
  });

  it("fails with the stable code at the bounded polling deadline", async () => {
    const releaseSha = "a".repeat(40);
    const clock = fakeClock();
    let requestCount = 0;
    await expect(waitForTrustedDbIntegration({
      releaseSha,
      now: clock.now,
      sleep: clock.sleep,
      pollIntervalMs: 15_000,
      maxWaitMs: 30_000,
      fetchWorkflowRuns: async () => {
        requestCount += 1;
        return { workflow_runs: [] };
      },
    })).rejects.toThrow("PRODUCTION_TRUSTED_DB_REQUIRED");
    expect(requestCount).toBe(2);
    expect(clock.delays).toEqual([15_000, 15_000]);
  });

  it("allows an exact event/release/current-main SHA match and rejects stale or mismatched SHAs", () => {
    const shaA = "a".repeat(40);
    const shaB = "b".repeat(40);
    expect(() => assertProductionReleaseIsCurrentMain({
      eventSha: shaA,
      releaseSha: shaA,
      currentMainSha: shaA,
    })).not.toThrow();
    expect(() => assertProductionReleaseIsCurrentMain({
      eventSha: shaA,
      releaseSha: shaA,
      currentMainSha: shaB,
    })).toThrow("PRODUCTION_RELEASE_NOT_CURRENT_MAIN");
    expect(() => assertProductionReleaseIsCurrentMain({
      eventSha: shaA,
      releaseSha: shaB,
      currentMainSha: shaB,
    })).toThrow("PRODUCTION_RELEASE_NOT_CURRENT_MAIN");
  });

  it("uses minimal permissions, the protected production environment, and serialized releases", () => {
    expect(workflow).toContain("permissions:\n  contents: read\n  actions: read");
    expect(workflow).not.toContain("actions: write");
    expect(workflow).toContain("group: vocabflow-production-release");
    expect(workflow).toContain("cancel-in-progress: false");
    expect(workflow).toContain("environment:\n      name: production");
  });

  it("keeps production and Vercel credentials step-scoped and out of Trusted DB", () => {
    expect(workflow).toContain("PRODUCTION_DATABASE_URL: ${{ secrets.PRODUCTION_DATABASE_URL }}");
    expect(workflow).toContain("PRODUCTION_MIGRATION_DATABASE_URL: ${{ secrets.PRODUCTION_MIGRATION_DATABASE_URL }}");
    expect(workflow).toContain("NEON_API_KEY: ${{ secrets.NEON_API_KEY }}");
    expect(workflow).toContain("VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}");
    expect(workflow).toContain("VERCEL_PROJECT_ID: ${{ vars.VOCABFLOW_VERCEL_PROJECT_ID }}");
    expect(workflow).toContain("VERCEL_ORG_ID: ${{ vars.VOCABFLOW_VERCEL_ORG_ID }}");
    expect(workflow).toContain("vars.VOCABFLOW_VERCEL_PROJECT_ID");
    expect(workflow).toContain("vars.VOCABFLOW_VERCEL_ORG_ID");
    expect(workflow).toContain("vars.BETTER_AUTH_URL");
    expect(workflow).not.toContain("NEON_TEST_");

    const linkedProjectStepStart = workflow.indexOf("Create ephemeral linked Vercel project metadata");
    const deployStepStart = workflow.indexOf("Deploy the migrated release SHA to Vercel Production");
    const linkedProjectStep = workflow.slice(linkedProjectStepStart, deployStepStart);
    expect(linkedProjectStep).toContain(".vercel/project.json");
    expect(linkedProjectStep).not.toContain("VERCEL_TOKEN");

    const trustedDb = readFileSync(resolve(".github/workflows/trusted-db.yml"), "utf8").replace(/\r\n/g, "\n");
    expect(trustedDb).toContain("EXECUTION_CONTEXT: ci-test");
    expect(trustedDb).toContain("VOCABFLOW_ENV: test");
    expect(trustedDb).toContain("pnpm test:db");
    expect(trustedDb).not.toContain("PRODUCTION_MIGRATION_DATABASE_URL");
  });
});
