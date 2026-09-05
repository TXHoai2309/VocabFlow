import { Hono } from "hono";
import { createAuth } from "./auth";

export type WorkerBindings = {
  DATABASE_URL?: string;
  BETTER_AUTH_SECRET?: string;
};

export const app = new Hono<{ Bindings: WorkerBindings }>();

app.get("/api/health", (c) => c.json({ status: "ok" }, 200));

app.all("/api/auth/*", async (c) => {
  if (!c.env?.DATABASE_URL || !c.env.BETTER_AUTH_SECRET) {
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Authentication service is not configured." } }, 503);
  }
  const auth = createAuth(c.env.DATABASE_URL, c.env.BETTER_AUTH_SECRET);
  return auth.handler(c.req.raw);
});

app.notFound((c) => {
  const url = new URL(c.req.url);
  if (url.pathname.startsWith("/api/")) {
    return c.json({ error: { code: "NOT_FOUND", message: "API route not found" } }, 404);
  }
  return c.json({ error: { code: "NOT_FOUND", message: "Route not found" } }, 404);
});

export default app;
