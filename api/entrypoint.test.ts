import { spawnSync } from "node:child_process";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { Hono } from "hono";
import { ModuleKind, ScriptTarget, transpileModule } from "typescript";
import { createApp } from "../apps/api/src/index";
import { describe, expect, it, vi } from "vitest";
import { createVercelApiHandler, VERCEL_API_PATH_QUERY, VERCEL_API_ROUTE_QUERY } from "./handler";
import type { RuntimeBindings } from "../apps/api/src/runtime-bindings";

function createStrictQueryValidationApp() {
  const learningSetService = {
    list: vi.fn(async () => []),
    detail: async () => { throw new Error("unused learning set detail"); },
    listForLearner: vi.fn(async () => []),
    assign: async () => { throw new Error("unused learning set assignment"); },
    unassign: async () => { throw new Error("unused learning set removal"); },
  };
  const learnerSettingsService = {
    get: vi.fn(async (_userId: string, learnerId: string) => ({
      learnerId,
      dailyNewWordLimit: 5,
      dailyLearningGoal: 10,
    })),
    update: async (_userId: string, learnerId: string) => ({
      learnerId,
      dailyNewWordLimit: 5,
      dailyLearningGoal: 10,
    }),
  };
  const application = createApp({
    readSession: async () => ({ user: { id: "user-1" } }),
    learningSetService,
    learnerSettingsService,
  });
  return { application, learningSetService, learnerSettingsService };
}

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
    expect(handlerSource).toMatch(/from ["']\.\.\/apps\/api\/dist\/vercel-runtime\.mjs["']/);
    expect(handlerSource).toMatch(/import type \{ RuntimeBindings \} from ["']\.\.\/apps\/api\/src\/runtime-bindings\.js["']/);
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

  it("loads the transpiled handler and built Hono app with native Node ESM and no TS loader", () => {
    const handlerOutputPath = join(resolve("api"), `handler.native-esm-${process.pid}.mjs`);
    try {
      const handlerSource = readFileSync(resolve("api/handler.ts"), "utf8");
      const emittedHandler = transpileModule(handlerSource, {
        compilerOptions: { module: ModuleKind.ESNext, target: ScriptTarget.ES2022 },
      }).outputText;
      expect(emittedHandler).not.toMatch(/\.\.\/apps\/api\/src/);
      writeFileSync(handlerOutputPath, emittedHandler, "utf8");
      const script = [
        `import handler from ${JSON.stringify(pathToFileURL(handlerOutputPath).href)};`,
        `const response = await handler.fetch(new Request("https://vocabflow.vercel.app/api/health"));`,
        `const body = await response.json();`,
        `if (response.status !== 200 || body.status !== "ok") throw new Error("NATIVE_ESM_HANDLER_DISPATCH_FAILED");`,
        `const sessionResponse = await handler.fetch(new Request("https://vocabflow.vercel.app/api/auth/get-session"));`,
        `const signInResponse = await handler.fetch(new Request("https://vocabflow.vercel.app/api/auth/sign-in/email", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }));`,
        `const unknownResponse = await handler.fetch(new Request("https://vocabflow.vercel.app/api/not-a-real-route"));`,
        `if (sessionResponse.status !== 503 || signInResponse.status !== 503 || unknownResponse.status !== 404) throw new Error("NATIVE_ESM_API_ROUTE_DISPATCH_FAILED");`,
        `if (!(unknownResponse.headers.get("content-type") ?? "").includes("application/json")) throw new Error("NATIVE_ESM_API_404_NOT_JSON");`,
        `for (const name of ["@vocabflow/contracts", "@vocabflow/learning-domain"]) {`,
        `  const resolved = import.meta.resolve(name);`,
        `  if (!resolved.endsWith("/dist/index.js") || resolved.endsWith(".ts")) throw new Error("WORKSPACE_RUNTIME_EXPORT_NOT_JS:" + name + ":" + resolved);`,
        `  await import(name);`,
        `}`,
        `process.stdout.write("NATIVE_NODE_ESM_HANDLER_AND_WORKSPACES_OK");`,
      ].join("\n");
      const childEnvironment = Object.fromEntries(
        ["PATH", "SystemRoot", "WINDIR", "TEMP", "TMP"]
          .flatMap((key) => process.env[key] ? [[key, process.env[key] as string]] : []),
      );
      const result = spawnSync(process.execPath, ["--input-type=module", "--eval", script], {
        cwd: resolve("."),
        encoding: "utf8",
        env: { ...childEnvironment, NODE_ENV: "test" },
        timeout: 30_000,
      });

      expect(emittedHandler).toContain("../apps/api/dist/vercel-runtime.mjs");
      expect(emittedHandler).not.toMatch(/\brequire\s*\(/);
      expect(result.error?.message, result.stderr).toBeUndefined();
      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout).toContain("NATIVE_NODE_ESM_HANDLER_AND_WORKSPACES_OK");
      expect(result.stderr).not.toContain("ERR_UNSUPPORTED_DIR_IMPORT");
      expect(result.stderr).not.toContain("ERR_MODULE_NOT_FOUND");
    } finally {
      rmSync(handlerOutputPath, { force: true });
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
    fixture.get("/api/health", (context) => context.json({
      path: context.req.path,
      query: Object.fromEntries(new URL(context.req.url).searchParams.entries()),
    }));
    const request = new Request(
      `https://vocabflow.vercel.app/api/handler?${VERCEL_API_PATH_QUERY}=%2Fapi%2Fhealth&${VERCEL_API_ROUTE_QUERY}=health&path=client-value&grade=GRADE_1&topic=home`,
    );

    const response = await createVercelApiHandler(fixture).fetch(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      path: "/api/health",
      query: { path: "client-value", grade: "GRADE_1", topic: "home" },
    });
  });

  it("preserves a nested API path and its query after the Vercel rewrite", async () => {
    const fixture = new Hono();
    fixture.get("/api/learners/:learnerId/progress-history", (context) =>
      context.json({
        path: context.req.path,
        learnerId: context.req.param("learnerId"),
        from: context.req.query("from"),
        to: context.req.query("to"),
        clientPath: context.req.query("path"),
      }));
    const request = new Request(
      `https://vocabflow.vercel.app/api/handler?${VERCEL_API_PATH_QUERY}=%2Fapi%2Flearners%2F123%2Fprogress-history&${VERCEL_API_ROUTE_QUERY}=learners%2F123%2Fprogress-history&path=client-value&from=2026-01-01&to=2026-01-31`,
    );

    const response = await createVercelApiHandler(fixture).fetch(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      path: "/api/learners/123/progress-history",
      learnerId: "123",
      from: "2026-01-01",
      to: "2026-01-31",
      clientPath: "client-value",
    });
  });

  it.each([
    ["/api/learning-sets", "learning-sets"],
    ["/api/learners/00000000-0000-4000-8000-000000000002/settings", "learners/00000000-0000-4000-8000-000000000002/settings"],
    ["/api/learners/00000000-0000-4000-8000-000000000002/learning-sets", "learners/00000000-0000-4000-8000-000000000002/learning-sets"],
  ])("strips Vercel transport metadata before the strict %s route validator", async (logicalPath, capturedRoute) => {
    const { application, learningSetService, learnerSettingsService } = createStrictQueryValidationApp();
    const request = new Request(
      `https://vocabflow.vercel.app/api/handler?${VERCEL_API_PATH_QUERY}=${encodeURIComponent(logicalPath)}&${VERCEL_API_ROUTE_QUERY}=${encodeURIComponent(capturedRoute)}`,
    );

    const response = await createVercelApiHandler(application).fetch(request);

    expect(response.status).toBe(200);
    if (logicalPath === "/api/learning-sets") {
      await expect(response.json()).resolves.toEqual({ learningSets: [] });
      expect(learningSetService.list).toHaveBeenCalledOnce();
    } else if (logicalPath.endsWith("/settings")) {
      await expect(response.json()).resolves.toEqual({
        learnerId: "00000000-0000-4000-8000-000000000002",
        dailyNewWordLimit: 5,
        dailyLearningGoal: 10,
      });
      expect(learnerSettingsService.get).toHaveBeenCalledOnce();
    } else {
      await expect(response.json()).resolves.toEqual({ learningSets: [] });
      expect(learningSetService.listForLearner).toHaveBeenCalledOnce();
    }
  });

  it("preserves a client query named path and multiple legitimate query parameters", async () => {
    const fixture = new Hono();
    fixture.get("/api/vocabulary", (context) => context.json({
      path: context.req.path,
      query: Object.fromEntries(new URL(context.req.url).searchParams.entries()),
    }));
    const request = new Request(
      `https://vocabflow.vercel.app/api/handler?${VERCEL_API_PATH_QUERY}=%2Fapi%2Fvocabulary&${VERCEL_API_ROUTE_QUERY}=vocabulary&path=client-value&grade=GRADE_1&topic=home&page=2&sort=recent`,
    );

    const response = await createVercelApiHandler(fixture).fetch(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      path: "/api/vocabulary",
      query: { path: "client-value", grade: "GRADE_1", topic: "home", page: "2", sort: "recent" },
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
