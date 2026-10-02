import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { app } from "./index";
import { runtimeBindingsFromEnvironment } from "./runtime-bindings";

const port = 3002;
const bindings = runtimeBindingsFromEnvironment(process.env);

const devApp = new Hono();
devApp.use(logger());
devApp.all("*", (c) => app.fetch(c.req.raw, bindings));

serve({
  port,
  fetch: devApp.fetch,
});

console.log(`VocabFlow API running at http://127.0.0.1:${port}`);
