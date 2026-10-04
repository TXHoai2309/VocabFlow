import { readFileSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { readMigrationFiles } from "drizzle-orm/migrator";

type MigrationJournal = {
  entries: Array<{ tag: string; when: number }>;
};

export type MigrationHashEvidence = {
  tag: string;
  folderMillis: number;
  worktreeHash: string;
  lfHash: string;
  crlfHash: string;
  crHash: string;
  acceptedHashes: string[];
};

export type MigrationHashRepresentation = "LF" | "CRLF" | "CR" | "NO_MATCH";

function sha256Sql(sql: string): string {
  return createHash("sha256").update(sql, "utf8").digest("hex");
}

function normalizeLineEndings(sql: string): string {
  return sql.replace(/\r\n?/g, "\n");
}

/**
 * Drizzle hashes the complete UTF-8 SQL text exactly as checked out, so line
 * endings are significant to its stored digest. Verification compares the DB
 * value against each exact Drizzle digest for the same LF-normalized logical
 * SQL source under LF, CRLF, and bare-CR serialization. Other bytes (including
 * BOM and terminal newline) remain significant.
 */
export function readMigrationHashEvidence(migrationsFolder: string): MigrationHashEvidence[] {
  const journal = JSON.parse(
    readFileSync(path.join(migrationsFolder, "meta", "_journal.json"), "utf8"),
  ) as MigrationJournal;
  const entriesByWhen = new Map(journal.entries.map((entry) => [entry.when, entry]));
  const migrations = readMigrationFiles({ migrationsFolder });

  return migrations.map((migration) => {
    const entry = entriesByWhen.get(migration.folderMillis);
    if (!entry) throw new Error("MIGRATION_JOURNAL_ENTRY_MISSING");
    // Buffer.toString() intentionally matches Drizzle 0.45.2's reader.
    const source = readFileSync(path.join(migrationsFolder, `${entry.tag}.sql`)).toString();
    const lf = normalizeLineEndings(source);
    const crlf = lf.replace(/\n/g, "\r\n");
    const cr = lf.replace(/\n/g, "\r");
    const hashes = [sha256Sql(lf), sha256Sql(crlf), sha256Sql(cr)];
    if (!hashes.includes(migration.hash)) throw new Error("MIGRATION_HASH_REPRESENTATION_INVALID");
    return {
      tag: entry.tag,
      folderMillis: migration.folderMillis,
      worktreeHash: migration.hash,
      lfHash: hashes[0]!,
      crlfHash: hashes[1]!,
      crHash: hashes[2]!,
      acceptedHashes: [...new Set(hashes)],
    };
  });
}

export function databaseHashMatchesMigrationSource(evidence: MigrationHashEvidence, databaseHash: string): boolean {
  return evidence.acceptedHashes.includes(databaseHash);
}

export function matchingMigrationHashRepresentation(
  evidence: MigrationHashEvidence,
  databaseHash: string,
): MigrationHashRepresentation {
  if (databaseHash === evidence.lfHash) return "LF";
  if (databaseHash === evidence.crlfHash) return "CRLF";
  if (databaseHash === evidence.crHash) return "CR";
  return "NO_MATCH";
}
