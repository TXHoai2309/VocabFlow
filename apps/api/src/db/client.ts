import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import postgres from "postgres";
import { drizzle as drizzlePostgresJs } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

const localPostgresDatabases = new Map<string, ReturnType<typeof drizzlePostgresJs<typeof schema>>>();

export function createHttpDatabase(connectionString: string, driver: string | undefined = "neon-http") {
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to create the application database client.");
  }
  if (driver === "postgres-js") {
    let target: URL;
    try {
      target = new URL(connectionString);
    } catch {
      throw new Error("LOCAL_DATABASE_URL_INVALID");
    }
    if (target.protocol !== "postgres:" && target.protocol !== "postgresql:") {
      throw new Error("LOCAL_DATABASE_URL_INVALID");
    }
    if (!new Set(["127.0.0.1", "localhost", "::1"]).has(target.hostname)
      || target.port !== "55432" || target.pathname !== "/vocabflow_dev") {
      throw new Error("LOCAL_DATABASE_TARGET_REQUIRED");
    }
    const existing = localPostgresDatabases.get(connectionString);
    if (existing) return existing;
    const client = postgres(connectionString, { max: 8, idle_timeout: 10, connect_timeout: 10, prepare: false });
    const database = drizzlePostgresJs(client, { schema });
    localPostgresDatabases.set(connectionString, database);
    return database;
  }
  if (driver !== undefined && driver !== "neon-http") throw new Error("DATABASE_DRIVER_UNSUPPORTED");
  const sql = neon(connectionString);
  return drizzle(sql, { schema });
}
