import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createHttpDatabase } from "./db/client";
import { productionAuthSettings, type AuthEnvironment } from "./auth-production-config";

export function createAuth(connectionString: string, secret: string, environment: AuthEnvironment = {}) {
  if (!secret) throw new Error("BETTER_AUTH_SECRET is required outside core health checks.");
  const productionSettings = productionAuthSettings(environment);
  const db = createHttpDatabase(connectionString);
  return betterAuth({
    secret,
    database: drizzleAdapter(db, { provider: "pg" }),
    emailAndPassword: { enabled: true },
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 60
      }
    },
    ...(productionSettings ?? {})
  });
}
