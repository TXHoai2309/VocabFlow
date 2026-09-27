import app from "../apps/api/src";
import { runtimeBindingsFromEnvironment } from "../apps/api/src/runtime-bindings";
import type { RuntimeBindings } from "../apps/api/src/runtime-bindings";

type HonoFetchApp = {
  fetch(request: Request, environment?: RuntimeBindings): Response | Promise<Response>;
};

export const VERCEL_API_PATH_QUERY = "__vocabflow_path";

function restoreLogicalApiRequest(request: Request): Request {
  const url = new URL(request.url);
  const logicalPath = url.searchParams.get(VERCEL_API_PATH_QUERY);

  if (
    logicalPath === null
    || (logicalPath !== "/api" && !logicalPath.startsWith("/api/"))
  ) {
    return request;
  }

  url.pathname = logicalPath;
  url.searchParams.delete(VERCEL_API_PATH_QUERY);
  return new Request(url, request);
}

export function createVercelApiHandler(
  application: HonoFetchApp = app,
  readEnvironment: () => NodeJS.ProcessEnv = () => process.env,
) {
  return {
    fetch(request: Request) {
      return application.fetch(
        restoreLogicalApiRequest(request),
        runtimeBindingsFromEnvironment(readEnvironment()),
      );
    },
  };
}

export default createVercelApiHandler();
