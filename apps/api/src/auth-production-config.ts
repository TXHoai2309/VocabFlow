export type AuthEnvironment = {
  DATABASE_DRIVER?: string;
  VOCABFLOW_ENV?: string;
  DATABASE_ENV?: string;
  BETTER_AUTH_URL?: string;
  VERCEL_ENV?: string;
  VERCEL_URL?: string;
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

export function parseVercelPreviewOrigin(value: string | undefined) {
  if (!value) throw new Error("VERCEL_PREVIEW_URL_REQUIRED");
  if (value.trim() !== value || /[/:?#@]/.test(value)) throw new Error("VERCEL_PREVIEW_URL_INVALID");
  let parsed: URL;
  try {
    parsed = new URL(`https://${value}`);
  } catch {
    throw new Error("VERCEL_PREVIEW_URL_INVALID");
  }
  const hostname = parsed.hostname.toLowerCase();
  if (parsed.protocol !== "https:" || parsed.host.toLowerCase() !== value.toLowerCase()
      || hostname === "vercel.app" || !hostname.endsWith(".vercel.app")) {
    throw new Error("VERCEL_PREVIEW_URL_INVALID");
  }
  return parsed.origin;
}

export function productionAuthSettings(environment: AuthEnvironment) {
  if (environment.VERCEL_ENV === "preview") {
    if (environment.VOCABFLOW_ENV !== "development" || environment.DATABASE_ENV !== "development") {
      throw new Error("PREVIEW_ENVIRONMENT_MARKERS_REQUIRED");
    }
    const origin = parseVercelPreviewOrigin(environment.VERCEL_URL);
    return {
      baseURL: origin,
      trustedOrigins: [origin],
      advanced: { useSecureCookies: true },
    };
  }

  const productionSelected = environment.VERCEL_ENV === "production"
    || environment.VOCABFLOW_ENV === "production"
    || environment.DATABASE_ENV === "production";
  if (!productionSelected) return undefined;
  if (environment.VERCEL_ENV !== undefined && environment.VERCEL_ENV !== "production") {
    throw new Error("PRODUCTION_VERCEL_ENVIRONMENT_MISMATCH");
  }
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
