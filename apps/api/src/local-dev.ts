import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { app } from "./index";
import { runtimeBindingsFromEnvironment } from "./runtime-bindings";
import { installEditorialLocalMedia } from "./editorial-local-media";
import { installFoundationLocal } from "./foundation-local";
import { installTicket10LocalMedia } from "./editorial-ticket10-local-media";
import { installOwnerCatalogMedia } from "./owner-editorial-local-media";
import { vocabularyDatasetVersion } from "./vocabulary-dataset-version";

const port = 3002;
const bindings = runtimeBindingsFromEnvironment(process.env);

const devApp = new Hono();
devApp.use(logger());
if (vocabularyDatasetVersion(bindings) === "owner-local") {
  installOwnerCatalogMedia(devApp, process.env);
} else {
  installEditorialLocalMedia(devApp, process.env);
  installTicket10LocalMedia(devApp, process.env);
}
installFoundationLocal(devApp, process.env);
devApp.all("*", (c) => app.fetch(c.req.raw, bindings));

serve({
  port,
  hostname: "127.0.0.1",
  fetch: devApp.fetch,
});

console.log(`VocabFlow API running at http://127.0.0.1:${port}`);
