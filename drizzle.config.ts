import { defineConfig } from "drizzle-kit";

const connectionString = process.env.NEON_TEST_MIGRATION_DATABASE_URL
  ?? process.env.NEON_TEST_DATABASE_URL
  ?? process.env.DATABASE_MIGRATION_URL
  ?? process.env.DATABASE_URL
  ?? "postgresql://placeholder:placeholder@localhost/vocabflow";

export default defineConfig({
  schema: "./apps/api/src/db/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: { url: connectionString },
  strict: true,
  verbose: true,
  casing: "snake_case"
});
