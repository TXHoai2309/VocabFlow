import type { Hono } from "hono";
import { installPinnedLocalMedia } from "./pinned-local-media";

/** Separate from the accepted FIRST_WORDS pilot's immutable plan and allowlist. */
export function installTicket10LocalMedia(app: Hono, env: NodeJS.ProcessEnv) {
  installPinnedLocalMedia(app, env, {
    planPath: ".vocabflow-local/editorial-refresh-20261030/ticket10-a1-a2-runtime-r0002/integration-plan-r0002.json",
    planSha256: "94b7a904599e7851b2dd7e38c528a5b111cdd885fa9d01d4446ac54af5e6aa1d",
    route: "/api/local-editorial-batch-media/ticket10-a1-a2-batch-0001",
    assetRoots: [
      ".vocabflow-local/editorial-refresh-20261029/basic-500-media-r0002/assets",
      ".vocabflow-local/editorial-refresh-20261029/basic-plus-500-media-r0001/assets"
    ]
  });
}
