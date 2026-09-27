import { describe, expect, it } from "vitest";
import { parseProductionAuthOrigin, productionAuthSettings } from "./auth-production-config";

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
});
