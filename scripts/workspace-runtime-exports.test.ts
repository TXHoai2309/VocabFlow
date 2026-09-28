import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

type WorkspacePackageManifest = {
  name: string;
  type?: string;
  main?: string;
  module?: string;
  types?: string;
  exports?: Record<string, string | Record<string, string>>;
};

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = resolve(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(entryPath);
    return entry.isFile() && entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")
      ? [entryPath]
      : [];
  });
}

function hasRuntimeBindings(importClause: ts.ImportClause | undefined): boolean {
  if (!importClause) return true;
  if (importClause.isTypeOnly) return false;
  if (importClause.name) return true;
  const bindings = importClause.namedBindings;
  if (!bindings || ts.isNamespaceImport(bindings)) return true;
  return bindings.elements.some((element) => !element.isTypeOnly);
}

function runtimeWorkspaceImports(): string[] {
  const names = new Set<string>();
  for (const filePath of sourceFiles(resolve("apps/api/src"))) {
    const source = ts.createSourceFile(filePath, readFileSync(filePath, "utf8"), ts.ScriptTarget.Latest, true);
    for (const statement of source.statements) {
      if (ts.isImportDeclaration(statement)
        && ts.isStringLiteral(statement.moduleSpecifier)
        && statement.moduleSpecifier.text.startsWith("@vocabflow/")
        && hasRuntimeBindings(statement.importClause)) {
        names.add(statement.moduleSpecifier.text);
      }
      if (ts.isExportDeclaration(statement)
        && !statement.isTypeOnly
        && statement.moduleSpecifier
        && ts.isStringLiteral(statement.moduleSpecifier)
        && statement.moduleSpecifier.text.startsWith("@vocabflow/")) {
        names.add(statement.moduleSpecifier.text);
      }
    }
  }
  return [...names].sort();
}

function childEnvironment() {
  return Object.fromEntries(
    ["PATH", "SystemRoot", "WINDIR", "TEMP", "TMP"]
      .flatMap((key) => process.env[key] ? [[key, process.env[key] as string]] : []),
  );
}

describe("Node runtime workspace package exports", () => {
  it("finds every runtime workspace package used by apps/api and requires JS exports", () => {
    const runtimePackages = runtimeWorkspaceImports();
    expect(runtimePackages).toEqual(["@vocabflow/contracts", "@vocabflow/learning-domain"]);

    for (const packageName of runtimePackages) {
      const packageDirectory = resolve("packages", packageName.split("/")[1] as string);
      const manifest = JSON.parse(readFileSync(resolve(packageDirectory, "package.json"), "utf8")) as WorkspacePackageManifest;
      const rootExport = manifest.exports?.["."];
      const conditions = typeof rootExport === "string" ? { default: rootExport } : rootExport;
      expect(manifest.type).toBe("module");
      expect(manifest.main).toBe("./dist/index.cjs");
      expect(manifest.module).toBe("./dist/index.js");
      expect(manifest.types).toBe("./dist/index.d.ts");
      expect(conditions?.types).toBe("./dist/index.d.ts");
      expect(conditions?.import).toBe("./dist/index.js");
      expect(conditions?.require).toBe("./dist/index.cjs");
      for (const [condition, target] of Object.entries(conditions ?? {})) {
        if (condition === "types") continue;
        expect(target).toMatch(/\.(?:c?js)$/);
        expect(target).not.toMatch(/(?:^|\/)src(?:\/|$)|\.ts$/);
      }
      expect(readFileSync(resolve(packageDirectory, "dist/index.js"), "utf8")).not.toMatch(/\.\.\/src\/index\.ts/);
      expect(readFileSync(resolve(packageDirectory, "dist/index.cjs"), "utf8")).not.toMatch(/\.\.\/src\/index\.ts/);
      expect(readFileSync(resolve(packageDirectory, "dist/index.d.ts"), "utf8")).toBeTruthy();
    }
  });

  it("resolves and imports every runtime workspace package with native Node ESM and no loader", () => {
    const runtimePackages = runtimeWorkspaceImports();
    const script = [
      `const names = ${JSON.stringify(runtimePackages)};`,
      `import { createRequire } from "node:module";`,
      `const require = createRequire(import.meta.url);`,
      `for (const name of names) {`,
      `  const resolved = import.meta.resolve(name);`,
      `  if (!resolved.endsWith("/dist/index.js") || resolved.endsWith(".ts")) throw new Error("WORKSPACE_EXPORT_NOT_EXECUTABLE_JS:" + name + ":" + resolved);`,
      `  await import(name);`,
      `  const required = require.resolve(name);`,
      `  const requiredPath = required.replaceAll(String.fromCharCode(92), "/");`,
      `  if (!requiredPath.endsWith("/dist/index.cjs")) throw new Error("WORKSPACE_REQUIRE_EXPORT_NOT_EXECUTABLE_CJS:" + name + ":" + required);`,
      `  require(name);`,
      `}`,
      `process.stdout.write("NATIVE_WORKSPACE_EXPORTS_OK:" + names.join(","));`,
    ].join("\n");
    const result = spawnSync(process.execPath, ["--input-type=module", "--eval", script], {
      cwd: resolve("."),
      encoding: "utf8",
      env: { ...childEnvironment(), NODE_ENV: "test" },
      timeout: 30_000,
    });

    expect(result.error?.message, result.stderr).toBeUndefined();
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain(`NATIVE_WORKSPACE_EXPORTS_OK:${runtimePackages.join(",")}`);
    expect(result.stderr).not.toContain("ERR_MODULE_NOT_FOUND");
  }, 30_000);
});
