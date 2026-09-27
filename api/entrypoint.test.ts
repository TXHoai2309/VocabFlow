import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { Hono } from "hono";
import { ModuleKind, ScriptTarget, transpileModule } from "typescript";
import { describe, expect, it } from "vitest";
import { createVercelApiHandler, VERCEL_API_PATH_QUERY } from "./handler";
import type { RuntimeBindings } from "../apps/api/src/runtime-bindings";

describe("Vercel Hono function boundary", () => {
  it("loads the handler and existing Hono app under the function-local ESM package scope", () => {
    const rootPackage = JSON.parse(readFileSync(resolve("package.json"), "utf8")) as { type?: string };
    const functionPackage = JSON.parse(readFileSync(resolve("api/package.json"), "utf8")) as { type?: string };
    const applicationPackage = JSON.parse(readFileSync(resolve("apps/api/package.json"), "utf8")) as { type?: string };
    const handlerSource = readFileSync(resolve("api/handler.ts"), "utf8");
    const handlerUrl = pathToFileURL(resolve("api/handler.ts")).href;
    const childEnvironment = Object.fromEntries(
      ["PATH", "SystemRoot", "WINDIR", "TEMP", "TMP"]
        .flatMap((key) => process.env[key] ? [[key, process.env[key] as string]] : []),
    );
    const script = [
      `import handler from ${JSON.stringify(handlerUrl)};`,
      `const response = await handler.fetch(new Request("https://vocabflow.vercel.app/api/health"));`,
      `if (response.status !== 200 || (await response.text()) !== '{"status":"ok"}') process.exitCode = 1;`,
      `else process.stdout.write("VERCEL_HANDLER_ESM_LOAD_OK");`,
    ].join("\n");

    expect(rootPackage.type).not.toBe("module");
    expect(functionPackage.type).toBe("module");
    expect(applicationPackage.type).toBe("module");
    expect(handlerSource).toMatch(/import app from ["']\.\.\/apps\/api\/src\/index\.js["']/);
    expect(handlerSource).toMatch(/runtime-bindings\.js["']/);
    expect(handlerSource).not.toMatch(/["']\.\.\/apps\/api\/src["']/);
    expect(handlerSource).not.toMatch(/\brequire\s*\(/);

    const result = spawnSync(
      process.execPath,
      ["--import", "tsx", "--input-type=module", "--eval", script],
      {
        cwd: resolve("."),
        encoding: "utf8",
        env: { ...childEnvironment, NODE_ENV: "test" },
        timeout: 30_000,
      },
    );

    expect(result.error?.message, result.stderr).toBeUndefined();
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("VERCEL_HANDLER_ESM_LOAD_OK");
    expect(result.stderr).not.toContain("ERR_REQUIRE_ESM");
  }, 30_000);

  it("resolves the transpiled handler's explicit JavaScript modules with native Node ESM", () => {
    const fixtureRoot = mkdtempSync(join(tmpdir(), "vocabflow-native-esm-"));
    try {
      const apiDirectory = join(fixtureRoot, "api");
      const appSourceDirectory = join(fixtureRoot, "apps", "api", "src");
      mkdirSync(apiDirectory, { recursive: true });
      mkdirSync(appSourceDirectory, { recursive: true });
      writeFileSync(join(apiDirectory, "package.json"), JSON.stringify({ type: "module" }), "utf8");
      writeFileSync(join(fixtureRoot, "apps", "api", "package.json"), JSON.stringify({ type: "module" }), "utf8");
      const handlerSource = readFileSync(resolve("api/handler.ts"), "utf8");
      const emittedHandler = transpileModule(handlerSource, {
        compilerOptions: { module: ModuleKind.ESNext, target: ScriptTarget.ES2022 },
      }).outputText;
      writeFileSync(join(apiDirectory, "handler.js"), emittedHandler, "utf8");
      writeFileSync(
        join(appSourceDirectory, "index.js"),
        "export default { fetch(request) { return new Response(new URL(request.url).pathname); } };\n",
        "utf8",
      );
      writeFileSync(
        join(appSourceDirectory, "runtime-bindings.js"),
        "export function runtimeBindingsFromEnvironment() { return {}; }\n",
        "utf8",
      );
      const script = [
        `import handler from ${JSON.stringify(pathToFileURL(join(apiDirectory, "handler.js")).href)};`,
        `const response = await handler.fetch(new Request("https://vocabflow.vercel.app/api/health"));`,
        `if (response.status !== 200 || (await response.text()) !== "/api/health") throw new Error("NATIVE_ESM_HANDLER_DISPATCH_FAILED");`,
        `process.stdout.write("NATIVE_NODE_ESM_MODULE_RESOLUTION_OK");`,
      ].join("\n");
      const childEnvironment = Object.fromEntries(
        ["PATH", "SystemRoot", "WINDIR", "TEMP", "TMP"]
          .flatMap((key) => process.env[key] ? [[key, process.env[key] as string]] : []),
      );
      const result = spawnSync(process.execPath, ["--input-type=module", "--eval", script], {
        cwd: fixtureRoot,
        encoding: "utf8",
        env: { ...childEnvironment, NODE_ENV: "test" },
        timeout: 30_000,
      });

      expect(emittedHandler).toContain("../apps/api/src/index.js");
      expect(emittedHandler).not.toMatch(/\brequire\s*\(/);
      expect(result.error?.message, result.stderr).toBeUndefined();
      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout).toContain("NATIVE_NODE_ESM_MODULE_RESOLUTION_OK");
      expect(result.stderr).not.toContain("ERR_UNSUPPORTED_DIR_IMPORT");
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  }, 30_000);

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

  it("forwards POST Better Auth sign-in requests through the same Hono route", async () => {
    const received: Request[] = [];
    const fixture = new Hono();
    fixture.all("/api/auth/*", async (context) => {
      received.push(context.req.raw);
      return context.text("sign-in handler reached", 200);
    });
    const request = new Request("https://vocabflow.vercel.app/api/auth/sign-in/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "fixture@example.test", password: "not-a-real-password" }),
    });
    const expectedBody = await request.clone().text();

    const response = await createVercelApiHandler(fixture).fetch(request);

    expect(response.status).toBe(200);
    expect(received).toHaveLength(1);
    expect(received[0]?.url).toBe(request.url);
    expect(received[0]?.method).toBe("POST");
    await expect(received[0]?.text()).resolves.toBe(expectedBody);
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
