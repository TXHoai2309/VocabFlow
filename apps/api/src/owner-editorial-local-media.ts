import { createHash } from "node:crypto";
import { readFileSync, realpathSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Hono } from "hono";
import { vocabularyDatasetVersion } from "./vocabulary-dataset-version";

type Configuration = { planPath: string; planSha256: string; assetRoots: readonly string[] };
const CONFIG: Configuration = {
  planPath: "../VocabFlow-data/runtime/owner-local-media.json",
  planSha256: "79cf8abeddea8ded82940df2023634fd4286782bf49a990da75dbcf6f3f3c311",
  assetRoots: [
    "../VocabFlow-data/media/images",
    "../VocabFlow-data/media/audio"
  ]
};
const sha = (raw: Uint8Array) => createHash("sha256").update(raw).digest("hex");

/** Node-only fixed allowlist. Load/hash requested files rather than retaining 3GB in RAM. */
export function installOwnerCatalogMedia(app: Hono, env: NodeJS.ProcessEnv, configuration = CONFIG) {
  if (vocabularyDatasetVersion(env) !== "owner-local") return;
  const bytes = readFileSync(configuration.planPath);
  if (sha(bytes) !== configuration.planSha256) throw new Error("OWNER_CATALOG_PLAN_PIN_MISMATCH");
  type Asset = { filename: string; repoRelativePath: string; sha256: string; byteLength: number; mimeType: string };
  const plan = JSON.parse(bytes.toString("utf8")) as { assets: Asset[] };
  const assets = new Map(plan.assets.map(x => [x.filename, x]));
  if (assets.size !== plan.assets.length) throw new Error("OWNER_CATALOG_DUPLICATE_ASSET");
  const roots = configuration.assetRoots.map(x => realpathSync(x));
  app.get("/api/local-owner-editorial-media/:filename", async c => {
    if (!["127.0.0.1", "localhost"].includes(new URL(c.req.url).hostname)) return c.notFound();
    const filename = c.req.param("filename");
    const asset = assets.get(filename);
    if (!asset || !/^[a-f0-9]{64}\.(png|mp3)$/.test(filename)) return c.notFound();
    const ext = filename.endsWith(".png") ? "png" : "mp3";
    if (filename !== `${asset.sha256}.${ext}` || asset.mimeType !== (ext === "png" ? "image/png" : "audio/mpeg")) return c.notFound();
    try {
      const absolute = realpathSync(asset.repoRelativePath);
      if (!roots.some(root => {
        const relative = path.relative(root, absolute);
        return Boolean(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
      })) return c.notFound();
      const content = await readFile(absolute);
      if (content.length !== asset.byteLength || sha(content) !== asset.sha256) return c.notFound();
      c.header("Content-Type", asset.mimeType);
      c.header("Content-Length", String(content.length));
      c.header("Cache-Control", "private, max-age=31536000, immutable");
      c.header("X-Content-Type-Options", "nosniff");
      return c.body(new Uint8Array(content).buffer);
    } catch { return c.notFound(); }
  });
}
