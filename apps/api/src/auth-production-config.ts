export type AuthEnvironment = {
  VOCABFLOW_ENV?: string;
  DATABASE_ENV?: string;
  BETTER_AUTH_URL?: string;
};

export function parseProductionAuthOrigin(value: string | undefined) {
  if (!value) throw new Error("BETTER_AUTH_URL_OWNER_INPUT_REQUIRED");
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("BETTER_AUTH_URL_INVALID");
  }
  const hostname = parsed.hostname.toLowerCase();
  if (parsed.protocol !== "https:" || !hostname.includes(".") || hostname === "localhost"
      || hostname.endsWith(".localhost") || hostname.endsWith(".local")
      || hostname === "127.0.0.1" || hostname.endsWith(".example") || hostname.endsWith(".invalid")
      || parsed.port || parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) {
    throw new Error("BETTER_AUTH_URL_MUST_BE_CANONICAL_HTTPS_ORIGIN");
  }
  return parsed.origin;
}

export function productionAuthSettings(environment: AuthEnvironment) {
  const productionSelected = environment.VOCABFLOW_ENV === "production" || environment.DATABASE_ENV === "production";
  if (!productionSelected) return undefined;
  if (environment.VOCABFLOW_ENV !== "production" || environment.DATABASE_ENV !== "production") {
    throw new Error("PRODUCTION_ENVIRONMENT_MARKERS_REQUIRED");
  }
  const origin = parseProductionAuthOrigin(environment.BETTER_AUTH_URL);
  return {
    baseURL: origin,
    trustedOrigins: [origin],
    advanced: { useSecureCookies: true },
  };
}
