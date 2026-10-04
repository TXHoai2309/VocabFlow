import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { databaseHashMatchesMigrationSource, readMigrationHashEvidence } from "./migration-hash-verification";

const tempRoots: string[] = [];

function readSingleMigration(source: string) {
  const root = mkdtempSync(path.join(tmpdir(), "vocabflow-migration-hash-"));
  tempRoots.push(root);
  mkdirSync(path.join(root, "meta"));
  writeFileSync(path.join(root, "meta", "_journal.json"), JSON.stringify({
    version: "7",
    dialect: "postgresql",
    entries: [{ idx: 0, version: "7", when: 100, tag: "0000_sample", breakpoints: true }],
  }), "utf8");
  writeFileSync(path.join(root, "0000_sample.sql"), Buffer.from(source, "utf8"));
  return readMigrationHashEvidence(root)[0]!;
}

afterEach(() => {
  for (const root of tempRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("migration hash verification", () => {
  it("gives the same verification result for LF, CRLF, and bare-CR checkouts", () => {
    const lf = "CREATE TABLE sample (id integer);\n--> statement-breakpoint\nSELECT 1;\n";
    const lfEvidence = readSingleMigration(lf);
    const crlfEvidence = readSingleMigration(lf.replace(/\n/g, "\r\n"));
    const crEvidence = readSingleMigration(lf.replace(/\n/g, "\r"));

    expect(crlfEvidence.lfHash).toBe(lfEvidence.lfHash);
    expect(crEvidence.lfHash).toBe(lfEvidence.lfHash);
    expect(lfEvidence.worktreeHash).toBe(lfEvidence.lfHash);
    expect(crlfEvidence.worktreeHash).toBe(crlfEvidence.crlfHash);
    expect(crEvidence.worktreeHash).toBe(crEvidence.crHash);
    for (const databaseHash of [lfEvidence.lfHash, crlfEvidence.worktreeHash, crEvidence.worktreeHash]) {
      expect(databaseHashMatchesMigrationSource(lfEvidence, databaseHash)).toBe(true);
      expect(databaseHashMatchesMigrationSource(crlfEvidence, databaseHash)).toBe(true);
      expect(databaseHashMatchesMigrationSource(crEvidence, databaseHash)).toBe(true);
    }
  });

  it("rejects modified SQL, appended trailing content, and a changed terminal newline", () => {
    const original = readSingleMigration("SELECT 1;\n");
    const editedSql = readSingleMigration("SELECT 2;\n");
    const appendedContent = readSingleMigration("SELECT 1; -- changed trailing SQL content\n");
    const removedTerminalNewline = readSingleMigration("SELECT 1;");

    expect(databaseHashMatchesMigrationSource(editedSql, original.worktreeHash)).toBe(false);
    expect(databaseHashMatchesMigrationSource(appendedContent, original.worktreeHash)).toBe(false);
    expect(databaseHashMatchesMigrationSource(removedTerminalNewline, original.worktreeHash)).toBe(false);
  });

  it("keeps a UTF-8 BOM hash-significant", () => {
    const withoutBom = readSingleMigration("SELECT 1;\n");
    const withBom = readSingleMigration("\uFEFFSELECT 1;\n");

    expect(databaseHashMatchesMigrationSource(withBom, withoutBom.worktreeHash)).toBe(false);
  });
});
