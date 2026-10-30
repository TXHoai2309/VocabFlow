import { afterEach, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { Hono } from "hono";
import { installPinnedLocalMedia } from "./pinned-local-media";

const roots: string[] = [];
const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const env = { DATABASE_URL: "postgres://unused@127.0.0.1:55432/vocabflow_dev", VOCABFLOW_ENV: "development", DATABASE_ENV: "development", EXECUTION_CONTEXT: "local-development", DATABASE_DRIVER: "postgres-js" };
function fixture(edit?: (asset: { filename: string; repoRelativePath: string; sha256: string; byteLength: number; mimeType: string }) => void) {
  const root = mkdtempSync(path.join(os.tmpdir(), "vocabflow-media-test-")); roots.push(root);
  const assets = path.join(root, "assets"); mkdirSync(assets);
  const bytes = Buffer.from("pinned fixture audio"); const sha256 = hash(bytes);
  const asset = { filename: `${sha256}.mp3`, repoRelativePath: path.join(assets, "clip.mp3"), sha256, byteLength: bytes.length, mimeType: "audio/mpeg" };
  writeFileSync(asset.repoRelativePath, bytes); edit?.(asset);
  const planPath = path.join(root, "plan.json"); writeFileSync(planPath, JSON.stringify({ assets: [asset] }));
  return { root, asset, bytes, config: { planPath, planSha256: hash(readFileSync(planPath)), route: "/api/bounded-media", assetRoots: [assets] } };
}
afterEach(() => { for (const root of roots.splice(0)) {
  if (path.dirname(path.resolve(root)) !== path.resolve(os.tmpdir()) || !path.basename(root).startsWith("vocabflow-media-test-")) throw new Error("INVALID_FIXTURE_CLEANUP_PATH");
  rmSync(root, { recursive: true, force: true });
} });

describe("pinned local media boundary", () => {
  it("serves only exact allowlisted bytes on loopback and rejects other filenames/hosts", async () => {
    const f = fixture(); const app = new Hono(); installPinnedLocalMedia(app, env, f.config);
    const url = `/api/bounded-media/${f.asset.filename}`;
    const response = await app.request(`http://127.0.0.1${url}`);
    expect(response.status).toBe(200); expect(response.headers.get("content-type")).toBe("audio/mpeg");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(Buffer.from(await response.arrayBuffer())).toEqual(f.bytes);
    expect((await app.request("http://127.0.0.1/api/bounded-media/missing.mp3")).status).toBe(404);
    expect((await app.request(`http://example.test${url}`)).status).toBe(404);
  });
  it.each([
    { VOCABFLOW_ENV: "production" }, { DATABASE_ENV: "production" }, { VERCEL_ENV: "preview" },
    { EXECUTION_CONTEXT: "ci" }, { DATABASE_DRIVER: "neon-http" },
    { DATABASE_URL: "postgres://unused@example.test:55432/vocabflow_dev" },
    { DATABASE_URL: "postgres://unused@127.0.0.1:55432/other" }
  ])("never installs outside the dedicated local environment: %j", async (override) => {
    const f = fixture(); const app = new Hono(); installPinnedLocalMedia(app, { ...env, ...override }, f.config);
    expect((await app.request(`http://127.0.0.1/api/bounded-media/${f.asset.filename}`)).status).toBe(404);
  });
  it("fails closed on manifest or asset byte drift", () => {
    const f = fixture();
    expect(() => installPinnedLocalMedia(new Hono(), env, { ...f.config, planSha256: "0".repeat(64) })).toThrow("PLAN_PIN_MISMATCH");
    writeFileSync(f.asset.repoRelativePath, "different audio");
    expect(() => installPinnedLocalMedia(new Hono(), env, f.config)).toThrow("ASSET_PIN_MISMATCH");
  });
  it("rejects pinned paths outside the media root and inconsistent MIME types", () => {
    const f = fixture((asset) => { asset.mimeType = "image/png"; });
    expect(() => installPinnedLocalMedia(new Hono(), env, f.config)).toThrow("PATH_OR_TYPE_INVALID");
    const other = fixture();
    writeFileSync(other.config.planPath, JSON.stringify({ assets: [{ ...other.asset, repoRelativePath: f.asset.repoRelativePath }] }));
    expect(() => installPinnedLocalMedia(new Hono(), env, { ...other.config, planSha256: hash(readFileSync(other.config.planPath)) })).toThrow("PATH_OR_TYPE_INVALID");
  });
});
