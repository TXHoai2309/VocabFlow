import { serve } from "@hono/node-server";
import { app } from "./index";
import { runtimeBindingsFromEnvironment } from "./runtime-bindings";

const port = 3001;
const bindings = runtimeBindingsFromEnvironment(process.env);

serve({
  port,
  fetch: (request) => app.fetch(request, bindings),
});

console.log(`VocabFlow API running at http://127.0.0.1:${port}`);
