import { Hono } from "hono";
import { errorEnvelope, type HouseholdBootstrapResponse } from "@vocabflow/contracts";
import { createAuth } from "./auth";
import { createBootstrapService, type BootstrapService } from "./bootstrap";

export type WorkerBindings = {
  DATABASE_URL?: string;
  BETTER_AUTH_SECRET?: string;
};

type AuthenticatedSession = { user: { id: string } };
type SessionReader = (request: Request, env: WorkerBindings) => Promise<AuthenticatedSession | null>;
type BootstrapRunner = (userId: string, env: WorkerBindings) => Promise<HouseholdBootstrapResponse["household"]>;

export type AppDependencies = {
  readSession?: SessionReader;
  bootstrap?: BootstrapRunner;
};

const SAFE_BOOTSTRAP_ERROR = "Không thể hoàn tất thiết lập gia đình. Vui lòng thử lại.";

async function readAuthenticatedSession(request: Request, env: WorkerBindings) {
  if (!env.DATABASE_URL || !env.BETTER_AUTH_SECRET) {
    throw new Error("AUTH_SERVICE_NOT_CONFIGURED");
  }
  const auth = createAuth(env.DATABASE_URL, env.BETTER_AUTH_SECRET);
  return auth.api.getSession({ headers: request.headers });
}

async function runBootstrap(userId: string, env: WorkerBindings) {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL_REQUIRED");
  const { createHttpDatabase } = await import("./db/client");
  const database = createHttpDatabase(env.DATABASE_URL);
  const service: BootstrapService = createBootstrapService(database);
  return service.ensureDefaultHousehold(userId);
}

export function createApp(dependencies: AppDependencies = {}) {
  const readSession = dependencies.readSession ?? readAuthenticatedSession;
  const bootstrap = dependencies.bootstrap ?? runBootstrap;
  const application = new Hono<{ Bindings: WorkerBindings }>();

  application.get("/api/health", (c) => c.json({ status: "ok" }, 200));

  application.all("/api/auth/*", async (c) => {
    if (!c.env?.DATABASE_URL || !c.env.BETTER_AUTH_SECRET) {
      return c.json({ error: { code: "INTERNAL_ERROR", message: "Authentication service is not configured." } }, 503);
    }
    const auth = createAuth(c.env.DATABASE_URL, c.env.BETTER_AUTH_SECRET);
    return auth.handler(c.req.raw);
  });

  application.post("/api/bootstrap", async (c) => {
    try {
      const session = await readSession(c.req.raw, c.env);
      if (!session?.user?.id) {
        return c.json(errorEnvelope("UNAUTHORIZED", "Đăng nhập để tiếp tục."), 401);
      }
      const household = await bootstrap(session.user.id, c.env);
      return c.json({ household }, 200);
    } catch {
      return c.json(errorEnvelope("INTERNAL_ERROR", SAFE_BOOTSTRAP_ERROR), 503);
    }
  });

  application.notFound((c) => {
    const url = new URL(c.req.url);
    if (url.pathname.startsWith("/api/")) {
      return c.json({ error: { code: "NOT_FOUND", message: "API route not found" } }, 404);
    }
    return c.json({ error: { code: "NOT_FOUND", message: "Route not found" } }, 404);
  });

  return application;
}

export const app = createApp();

export default app;
