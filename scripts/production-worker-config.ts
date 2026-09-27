export type ProductionWorkerInput = {
  authUrl?: string;
  zoneName?: string;
};

export function requireProductionWorkerRoute(input: ProductionWorkerInput) {
  if (!input.authUrl || !input.zoneName) throw new Error("PRODUCTION_HOSTNAME_OWNER_INPUT_REQUIRED");
  let url: URL;
  try {
    url = new URL(input.authUrl);
  } catch {
    throw new Error("PRODUCTION_HOSTNAME_INVALID");
  }
  const hostname = url.hostname.toLowerCase();
  const zoneName = input.zoneName.trim().toLowerCase().replace(/\.$/, "");
  if (url.protocol !== "https:" || url.port || url.pathname !== "/" || url.search || url.hash
      || !zoneName || !(hostname === zoneName || hostname.endsWith(`.${zoneName}`))
      || hostname === "localhost" || hostname === "127.0.0.1") {
    throw new Error("PRODUCTION_HOSTNAME_ZONE_MISMATCH");
  }
  return { origin: url.origin, hostname, zoneName };
}

export function finalizeProductionWorkerConfig<T extends Record<string, unknown>>(
  config: T,
  input: ProductionWorkerInput,
) {
  const route = requireProductionWorkerRoute(input);
  const vars = typeof config.vars === "object" && config.vars !== null
    ? config.vars as Record<string, unknown>
    : {};
  return {
    ...config,
    name: "vocabflow",
    workers_dev: false,
    routes: [{ pattern: `${route.hostname}/*`, zone_name: route.zoneName }],
    vars: {
      ...vars,
      VOCABFLOW_ENV: "production",
      DATABASE_ENV: "production",
      BETTER_AUTH_URL: route.origin,
    },
  };
}
