import { describe, expect, it } from "vitest";
import app from "./index";

describe("foundation worker routes", () => {
  it("returns deterministic health JSON without bindings", async () => {
    const response = await app.request("http://localhost/api/health");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    await expect(response.json()).resolves.toEqual({ status: "ok" });
  });

  it("does not turn unknown API routes into SPA HTML", async () => {
    const response = await app.request("http://localhost/api/unknown");
    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(await response.text()).not.toContain("<html");
  });

  it("keeps the auth boundary server-only when not configured", async () => {
    const response = await app.request("http://localhost/api/auth/session");
    expect(response.status).toBe(503);
    expect(response.headers.get("content-type")).toContain("application/json");
  });
});
