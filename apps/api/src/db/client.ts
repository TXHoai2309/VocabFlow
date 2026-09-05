import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export function createHttpDatabase(connectionString: string) {
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to create the application database client.");
  }
  const sql = neon(connectionString);
  return drizzle(sql, { schema });
}
