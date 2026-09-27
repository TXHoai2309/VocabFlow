import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { createVercelApiHandler, VERCEL_API_PATH_QUERY } from "./handler";
import type { RuntimeBindings } from "../apps/api/src/runtime-bindings";

describe("Vercel Hono function boundary", () => {
  it("dispatches the existing Hono API app for API requests", async () => {
    const handler = createVercelApiHandler();
    const response = await handler.fetch(new Request("https://vocabflow.vercel.app/api/health"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "ok" });
  });

  it("forwards nested POST auth requests, including the original body, to the Hono auth route", async () => {
    const received: Request[] = [];
    const fixture = new Hono();
    fixture.all("/api/auth/*", async (context) => {
      received.push(context.req.raw);
      return context.text("auth handler reached", 202);
    });
    const handler = createVercelApiHandler(fixture);
    const request = new Request("https://vocabflow.vercel.app/api/auth/sign-up/email?source=preview", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Fixture", email: "fixture@example.test", password: "not-a-real-password" }),
    });
    const expectedBody = await request.clone().text();

    const response = await handler.fetch(request);

    expect(response.status).toBe(202);
    expect(received).toHaveLength(1);
    expect(received[0]?.url).toBe(request.url);
    expect(received[0]?.method).toBe("POST");
    expect(await received[0]?.text()).toBe(expectedBody);
  });

  it("forwards GET Better Auth session requests through the same Hono route", async () => {
    const received: Request[] = [];
    const fixture = new Hono();
    fixture.all("/api/auth/*", (context) => {
      received.push(context.req.raw);
      return context.text("session handler reached", 200);
    });

    const response = await createVercelApiHandler(fixture).fetch(
      new Request("https://vocabflow.vercel.app/api/auth/get-session"),
    );

    expect(response.status).toBe(200);
    expect(received[0]?.url).toBe("https://vocabflow.vercel.app/api/auth/get-session");
    expect(received[0]?.method).toBe("GET");
  });

  it("restores the original API health path from the supported Vercel rewrite capture", async () => {
    const fixture = new Hono();
    fixture.get("/api/health", (context) => context.json({ path: context.req.path }));
    const request = new Request(
      `https://vocabflow.vercel.app/api/handler?${VERCEL_API_PATH_QUERY}=%2Fapi%2Fhealth`,
    );

    const response = await createVercelApiHandler(fixture).fetch(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ path: "/api/health" });
  });

  it("preserves a nested API path and its query after the Vercel rewrite", async () => {
    const fixture = new Hono();
    fixture.get("/api/learners/:learnerId/progress-history", (context) =>
      context.json({
        path: context.req.path,
        learnerId: context.req.param("learnerId"),
        from: context.req.query("from"),
        to: context.req.query("to"),
      }));
    const request = new Request(
      `https://vocabflow.vercel.app/api/handler?${VERCEL_API_PATH_QUERY}=%2Fapi%2Flearners%2F123%2Fprogress-history&from=2026-01-01&to=2026-01-31`,
    );

    const response = await createVercelApiHandler(fixture).fetch(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      path: "/api/learners/123/progress-history",
      learnerId: "123",
      from: "2026-01-01",
      to: "2026-01-31",
    });
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
