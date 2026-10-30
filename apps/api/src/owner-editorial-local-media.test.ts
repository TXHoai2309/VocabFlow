import { afterEach, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { Hono } from "hono";
import { installOwnerCatalogMedia } from "./owner-editorial-local-media";

const temporary: string[] = [];
const sha = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const env = { VOCAB_DATASET_VERSION: "owner-local", DATABASE_URL: "postgres://fixture@127.0.0.1:55432/vocabflow_dev", VOCABFLOW_ENV: "development", DATABASE_ENV: "development", EXECUTION_CONTEXT: "local-development", DATABASE_DRIVER: "postgres-js" };
function fixture() {
  const root = mkdtempSync(path.join(os.tmpdir(), "vocabflow-owner-media-test-")); temporary.push(root);
  const media = path.join(root, "assets"); mkdirSync(media);
  const bytes = Buffer.from("owner media fixture"); const hash = sha(bytes); const filename = hash + ".mp3";
  const file = path.join(media, filename); writeFileSync(file, bytes);
  const planPath = path.join(root, "plan.json");
  writeFileSync(planPath, JSON.stringify({ assets: [{ filename, repoRelativePath: file, sha256: hash, byteLength: bytes.length, mimeType: "audio/mpeg" }] }));
  return { root, file, filename, bytes, configuration: { planPath, planSha256: sha(readFileSync(planPath)), assetRoots: [media] } };
}
afterEach(() => { for (const root of temporary.splice(0)) {
  if (path.dirname(path.resolve(root)) !== path.resolve(os.tmpdir()) || !path.basename(root).startsWith("vocabflow-owner-media-test-")) throw new Error("INVALID_FIXTURE_CLEANUP");
  rmSync(root, { recursive: true, force: true });
} });
describe("owner media delivery", () => {
  it("loads exact bytes on demand and withholds later drift, unknown IDs and remote hosts", async () => {
    const f = fixture(); const app = new Hono(); installOwnerCatalogMedia(app, env, f.configuration);
    const route = `/api/local-owner-editorial-media/${f.filename}`;
    const response = await app.request("http://127.0.0.1" + route);
    expect(response.status).toBe(200); expect(response.headers.get("content-type")).toBe("audio/mpeg");
    expect(Buffer.from(await response.arrayBuffer())).toEqual(f.bytes);
    expect((await app.request("http://remote.test" + route)).status).toBe(404);
    expect((await app.request("http://127.0.0.1/api/local-owner-editorial-media/missing.mp3")).status).toBe(404);
    writeFileSync(f.file, "modified"); expect((await app.request("http://127.0.0.1" + route)).status).toBe(404);
  });
  it("never registers in legacy/V2/deployed modes", async () => {
    const f = fixture();
    for (const override of [{ VOCAB_DATASET_VERSION: "v2" }, { VERCEL_ENV: "production" }, { VERCEL_ENV: "preview" }]) {
      const app = new Hono(); installOwnerCatalogMedia(app, { ...env, ...override }, f.configuration);
      expect((await app.request(`http://127.0.0.1/api/local-owner-editorial-media/${f.filename}`)).status).toBe(404);
    }
  });
  it("rejects an unpinned manifest and paths beyond the authorized roots", async () => {
    const f = fixture();
    expect(() => installOwnerCatalogMedia(new Hono(), env, { ...f.configuration, planSha256: "0".repeat(64) })).toThrow("PLAN_PIN_MISMATCH");
    const g = fixture(); const app = new Hono();
    installOwnerCatalogMedia(app, env, { ...f.configuration, assetRoots: g.configuration.assetRoots });
    expect((await app.request(`http://127.0.0.1/api/local-owner-editorial-media/${f.filename}`)).status).toBe(404);
  });
});
