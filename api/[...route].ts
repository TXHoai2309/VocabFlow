import app from "../apps/api/src";
import { runtimeBindingsFromEnvironment } from "../apps/api/src/runtime-bindings";
import type { RuntimeBindings } from "../apps/api/src/runtime-bindings";

type HonoFetchApp = {
  fetch(request: Request, environment?: RuntimeBindings): Response | Promise<Response>;
};

export function createVercelApiHandler(
  application: HonoFetchApp = app,
  readEnvironment: () => NodeJS.ProcessEnv = () => process.env,
) {
  return {
    fetch(request: Request) {
      return application.fetch(request, runtimeBindingsFromEnvironment(readEnvironment()));
    },
  };
}

export default createVercelApiHandler();
