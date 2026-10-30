import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import canonicalize from "canonicalize";
import { describe, expect, it } from "vitest";
import { z } from "zod";

const hash = (bytes: string | Buffer) => createHash("sha256").update(bytes).digest("hex");
const scope = z.object({ catalog: z.object({ path: z.string(), sha256: z.string(), byteLength: z.number() }), archivedAuthoringTests: z.array(z.object({ testFile: z.string(), sha256: z.string(), reason: z.string() })), archivedChecksClaimedPassed: z.literal(false) })
  .parse(JSON.parse(readFileSync("scripts/owner-publication-release-test-scope.json", "utf8")));
const bytes = readFileSync(scope.catalog.path);
const schema = z.object({
  catalogId: z.literal("owner-production-1547-20261030-r0001"), sourceDataset: z.literal("VOCABFLOW_OWNER_EDITORIAL"),
  contentReviewDecision: z.literal("OWNER_SELECTED_PUBLICATION"), canonicalMasterIdentityAssigned: z.literal(false),
  groups: z.array(z.object({ code: z.string(), sourcePackage: z.string() })),
  items: z.array(z.object({ itemId: z.string(), proposalKey: z.string(), package: z.string(), runtimeVocabularyId: z.number().int().positive(), retainedRuntimeId: z.boolean(), contentVersion: z.number().int().positive(), contentSha256: z.string(), topicCodes: z.array(z.string()),
    content: z.object({ word: z.string().min(1), meaningVi: z.string().min(1), shortMeaningVi: z.string().min(1), definitionEn: z.string().nullable(), partOfSpeech: z.string().min(1), cefr: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]).nullable(), tags: z.array(z.string()),
      examples: z.array(z.object({ en: z.string().min(1), vi: z.string().min(1), audioUrl: z.string().url() }).passthrough()).length(1),
      media: z.object({ image: z.string().url(), wordAudio: z.string().url(), exampleAudio: z.string().url() }) }).passthrough() })),
  assets: z.array(z.object({ sourceSha256: z.string().regex(/^[a-f0-9]{64}$/), sourceByteLength: z.number().int().positive(), publicId: z.string(), resourceType: z.enum(["image", "video"]), deliveryType: z.literal("upload"), version: z.number().int().positive(), etag: z.string().regex(/^[a-f0-9]{32}$/), originalUrl: z.string().url(), deliveryUrl: z.string().url(), uploadBytesAndEtagMatch: z.literal(true) }))
});
const catalog = schema.parse(JSON.parse(bytes.toString("utf8")));
describe("owner-selected Production publication integrity", () => {
  it("pins the complete new publication instead of the retired Master authoring tree", () => {
    expect(bytes.length).toBe(scope.catalog.byteLength); expect(hash(bytes)).toBe(scope.catalog.sha256);
    expect(catalog.items).toHaveLength(1547); expect(catalog.groups).toHaveLength(73); expect(catalog.assets).toHaveLength(4640);
    expect(catalog.items.filter(x => x.retainedRuntimeId)).toHaveLength(900);
    expect(catalog.items.filter(x => !x.retainedRuntimeId)).toHaveLength(647);
    expect(new Set(catalog.items.map(x => x.runtimeVocabularyId)).size).toBe(1547);
    expect(new Set(catalog.items.map(x => x.itemId)).size).toBe(1547);
    expect(new Set(catalog.items.map(x => x.content.word.trim().toLowerCase())).size).toBe(1547);
    expect(catalog.canonicalMasterIdentityAssigned).toBe(false);
  });
  it("binds all text, examples and public media to each exact content hash", () => {
    const media = new Set(catalog.assets.map(x => x.deliveryUrl));
    for (const item of catalog.items) {
      expect(hash(canonicalize(item.content)!)).toBe(item.contentSha256);
      expect(item.proposalKey).toBe(`owner-publication:${item.itemId}`);
      expect(item.content.examples[0]!.audioUrl).toBe(item.content.media.exampleAudio);
      expect(Object.values(item.content.media).every(url => media.has(url))).toBe(true);
      expect(Object.values(item.content.media).every(url => url.startsWith("https://res.cloudinary.com/") && url.includes("/vocabflow/owner/production-1547-20261030-r0001/"))).toBe(true);
    }
    for (const asset of catalog.assets) {
      expect(asset.publicId.endsWith(asset.sourceSha256)).toBe(true);
      expect(asset.sourceByteLength).toBeGreaterThan(26);
    }
  });
  it("keeps exact package totals and topic closure without duplicated senses", () => {
    expect(catalog.items.filter(x => x.package === "expansion547")).toHaveLength(547);
    expect(catalog.items.filter(x => x.package === "basic500")).toHaveLength(500);
    expect(catalog.items.filter(x => x.package === "basicplus500")).toHaveLength(500);
    const groups = new Map(catalog.groups.map(x => [x.code, x]));
    for (const item of catalog.items) { expect(item.topicCodes.length).toBeGreaterThan(0); for (const code of item.topicCodes) expect(groups.get(code)?.sourcePackage).toBe(item.package); }
    for (const code of groups.keys()) expect(catalog.items.some(x => x.topicCodes.includes(code))).toBe(true);
    expect(catalog.groups.length + 3).toBe(76);
  });
  it("does not invent CEFR for the curated first words", () => {
    const counts: Record<string, number> = {};
    for (const item of catalog.items) {
      const first = item.content.tags.includes("EDITORIAL:FIRST_WORDS");
      if (first) expect(item.content.cefr).toBeNull();
      const code = first ? "FIRST_WORDS" : item.content.cefr ?? "UNCLASSIFIED"; counts[code] = (counts[code] ?? 0) + 1;
    }
    expect(counts).toEqual({ FIRST_WORDS: 139, A1: 731, A2: 544, B1: 132, B2: 1 });
  });
  it("archives only explicitly enumerated retired authoring checks; new tests default to active", () => {
    const names = scope.archivedAuthoringTests.map(x => x.testFile);
    expect(new Set(names).size).toBe(31);
    for (const test of scope.archivedAuthoringTests) {
      expect(test.testFile.startsWith("scripts/")).toBe(true);
      expect(test.testFile).not.toMatch(/scripts\/(?:db-|production-|vercel-|owner-|runtime-|auth-)/);
      // Git checks out CRLF on Windows and LF on Linux; pin the same source text.
      expect(hash(readFileSync(test.testFile, "utf8").replaceAll("\r\n", "\n"))).toBe(test.sha256);
      expect(test.reason).toContain("Retired Master V2");
    }
    const appTests: string[] = [];
    const walk = (directory: string) => { for (const entry of readdirSync(directory, { withFileTypes: true })) { if (["node_modules", "dist"].includes(entry.name)) continue; const file = join(directory, entry.name); if (entry.isDirectory()) walk(file); else if (/\.test\.tsx?$/.test(file)) appTests.push(file); } };
    walk("apps"); expect(appTests.length).toBeGreaterThan(70);
    expect(appTests.every(x => !names.includes(x.replaceAll("\\", "/")))).toBe(true);
    expect(scope.archivedChecksClaimedPassed).toBe(false);
  });
});
