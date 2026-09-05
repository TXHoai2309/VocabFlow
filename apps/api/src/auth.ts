import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createHttpDatabase } from "./db/client";

export function createAuth(connectionString: string, secret: string) {
  if (!secret) throw new Error("BETTER_AUTH_SECRET is required outside core health checks.");
  const db = createHttpDatabase(connectionString);
  return betterAuth({
    secret,
    database: drizzleAdapter(db, { provider: "pg" }),
    emailAndPassword: { enabled: true }
  });
}
