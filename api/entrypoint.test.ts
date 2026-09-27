import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { createVercelApiHandler } from "./[...route]";
import type { RuntimeBindings } from "../apps/api/src/runtime-bindings";

describe("Vercel Hono function boundary", () => {
  it("dispatches the existing Hono API app for API requests", async () => {
    const handler = createVercelApiHandler();
    const response = await handler.fetch(new Request("https://vocabflow.vercel.app/api/health"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "ok" });
  });

  it("keeps unknown API requests in Hono instead of returning SPA HTML", async () => {
    const handler = createVercelApiHandler();
    const response = await handler.fetch(new Request("https://vocabflow.vercel.app/api/unknown"));

    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(await response.text()).not.toContain("<html");
  });

  it("maps only server runtime bindings from process environment", async () => {
    const environment = {
      DATABASE_URL: "server-only-fixture",
      BETTER_AUTH_SECRET: "auth-fixture",
      BETTER_AUTH_URL: "https://vocabflow.vercel.app",
      VOCABFLOW_ENV: "production",
      DATABASE_ENV: "production",
      VERCEL_ENV: "production",
      VERCEL_URL: "vocabflow.vercel.app",
      PRODUCTION_DATABASE_URL: "operator-only-fixture",
      PRODUCTION_MIGRATION_DATABASE_URL: "operator-only-fixture",
      NEON_API_KEY: "operator-only-fixture",
      VITE_BETTER_AUTH_SECRET: "must-not-map",
    } as NodeJS.ProcessEnv;
    const fixture = new Hono<{ Bindings: RuntimeBindings }>();
    fixture.get("/api/runtime-env", (context) => context.json(context.env));
    const handler = createVercelApiHandler(fixture, () => environment);
    const response = await handler.fetch(new Request("https://vocabflow.vercel.app/api/runtime-env"));

    await expect(response.json()).resolves.toEqual({
      DATABASE_URL: "server-only-fixture",
      BETTER_AUTH_SECRET: "auth-fixture",
      BETTER_AUTH_URL: "https://vocabflow.vercel.app",
      VOCABFLOW_ENV: "production",
      DATABASE_ENV: "production",
      VERCEL_ENV: "production",
      VERCEL_URL: "vocabflow.vercel.app",
    });
  });
});
