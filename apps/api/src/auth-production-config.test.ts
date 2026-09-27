import { describe, expect, it } from "vitest";
import { parseProductionAuthOrigin, parseVercelPreviewOrigin, productionAuthSettings } from "./auth-production-config";

describe("production Better Auth origin config", () => {
  it("leaves local auth settings unchanged outside production", () => {
    expect(productionAuthSettings({ VOCABFLOW_ENV: "development" })).toBeUndefined();
  });

  it("requires both production markers and an owner-supplied canonical origin", () => {
    expect(() => productionAuthSettings({ VOCABFLOW_ENV: "production" }))
      .toThrow("PRODUCTION_ENVIRONMENT_MARKERS_REQUIRED");
    expect(() => productionAuthSettings({ VOCABFLOW_ENV: "development", DATABASE_ENV: "production" }))
      .toThrow("PRODUCTION_ENVIRONMENT_MARKERS_REQUIRED");
    expect(() => productionAuthSettings({ VOCABFLOW_ENV: "production", DATABASE_ENV: "production" }))
      .toThrow("BETTER_AUTH_URL_OWNER_INPUT_REQUIRED");
  });

  it.each([
    "http://vocabflow.example.org",
    "https://localhost",
    "https://127.0.0.1",
    "https://learn.example.org/login",
    "https://user:pass@learn.example.org",
    "https://learn.example.org?next=/",
  ])("rejects non-canonical or insecure production origin %s", (origin) => {
    expect(() => parseProductionAuthOrigin(origin)).toThrow();
  });

  it("pins base URL, trusted origin and secure cookies to the chosen HTTPS origin", () => {
    expect(productionAuthSettings({
      VOCABFLOW_ENV: "production",
      DATABASE_ENV: "production",
      BETTER_AUTH_URL: "https://learn.vocabflow.vn/",
    })).toEqual({
      baseURL: "https://learn.vocabflow.vn",
      trustedOrigins: ["https://learn.vocabflow.vn"],
      advanced: { useSecureCookies: true },
    });
  });

  it("trusts only the exact deployment URL for a Vercel preview", () => {
    expect(productionAuthSettings({
      VOCABFLOW_ENV: "development",
      DATABASE_ENV: "development",
      VERCEL_ENV: "preview",
      VERCEL_URL: "vocabflow-git-feature-123.vercel.app",
    })).toEqual({
      baseURL: "https://vocabflow-git-feature-123.vercel.app",
      trustedOrigins: ["https://vocabflow-git-feature-123.vercel.app"],
      advanced: { useSecureCookies: true },
    });
  });

  it("does not allow preview auth to use production database markers", () => {
    expect(() => productionAuthSettings({
      VOCABFLOW_ENV: "production",
      DATABASE_ENV: "production",
      VERCEL_ENV: "preview",
      VERCEL_URL: "vocabflow-git-feature-123.vercel.app",
    })).toThrow("PREVIEW_ENVIRONMENT_MARKERS_REQUIRED");
  });

  it.each([
    undefined,
    "vercel.app",
    "attacker.example",
    "vocabflow.vercel.app/path",
    "https://vocabflow.vercel.app",
    "vocabflow.vercel.app:443",
  ])("rejects an untrusted or malformed Vercel preview URL %s", (deploymentUrl) => {
    expect(() => parseVercelPreviewOrigin(deploymentUrl)).toThrow();
  });

  it("requires VERCEL_ENV production to match both production database markers", () => {
    expect(() => productionAuthSettings({ VERCEL_ENV: "production" }))
      .toThrow("PRODUCTION_ENVIRONMENT_MARKERS_REQUIRED");
    expect(() => productionAuthSettings({
      VOCABFLOW_ENV: "production",
      DATABASE_ENV: "production",
      VERCEL_ENV: "preview",
    })).toThrow("PREVIEW_ENVIRONMENT_MARKERS_REQUIRED");
  });
});
