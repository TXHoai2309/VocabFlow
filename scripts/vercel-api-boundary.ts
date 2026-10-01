import { readdirSync } from "node:fs";
import { join } from "node:path";

const testEntrypointName = /\.(?:test|spec)\.(?:[cm]?tsx?)$/i;

function findTestEntrypoints(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory() && !entry.isSymbolicLink()) return findTestEntrypoints(path);
    return entry.isFile() && testEntrypointName.test(entry.name) ? [path] : [];
  });
}

export function assertNoApiTestEntrypoints(apiRoot: string) {
  if (findTestEntrypoints(apiRoot).length > 0) {
    throw new Error("VERCEL_API_TEST_ENTRYPOINT_PRESENT");
  }
}
