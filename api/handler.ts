import app, { runtimeBindingsFromEnvironment } from "../apps/api/dist/vercel-runtime.mjs";
import type { RuntimeBindings } from "../apps/api/src/runtime-bindings.js";

type HonoFetchApp = {
  fetch(request: Request, environment?: RuntimeBindings): Response | Promise<Response>;
};

export const VERCEL_API_PATH_QUERY = "__vocabflow_path";
export const VERCEL_API_ROUTE_QUERY = "__vocabflow_route";

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
  url.searchParams.delete(VERCEL_API_ROUTE_QUERY);
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
