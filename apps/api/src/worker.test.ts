import { describe, expect, it, vi } from "vitest";
import app, { createApp, type WorkerBindings } from "./index";

const household = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Gia đình VocabFlow",
  timezone: "Asia/Ho_Chi_Minh"
};

function bootstrapTestApp(
  session: { user: { id: string } } | null,
  bootstrap?: (userId: string, env: WorkerBindings) => Promise<typeof household>
) {
  const bootstrapImpl = bootstrap ?? vi.fn(async (_userId: string, _env: WorkerBindings) => household);
  return {
    app: createApp({
      readSession: async () => session,
      bootstrap: bootstrapImpl
    }),
    bootstrap: bootstrapImpl
  };
}

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

describe("US-01 household bootstrap route", () => {
  it("returns 401 without a valid Better Auth session", async () => {
    const { app: testApp, bootstrap } = bootstrapTestApp(null);
    const response = await testApp.request("http://localhost/api/bootstrap", { method: "POST", body: "{}" }, {} as WorkerBindings);
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: { code: "UNAUTHORIZED", message: "Đăng nhập để tiếp tục." } });
    expect(bootstrap).not.toHaveBeenCalled();
  });

  it("derives the owner from the session and returns only the safe household shape", async () => {
    const { app: testApp, bootstrap } = bootstrapTestApp({ user: { id: "user-1" } });
    const response = await testApp.request("http://localhost/api/bootstrap", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ownerUserId: "attacker" })
    }, {} as WorkerBindings);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ household });
    expect(bootstrap).toHaveBeenCalledWith("user-1", expect.anything());
    expect(JSON.stringify(body)).not.toContain("primaryOwnerUserId");
  });

  it("is sequentially idempotent and creates one OWNER household membership", async () => {
    const calls: string[] = [];
    const service = vi.fn(async (userId: string) => {
      calls.push(userId);
      return household;
    });
    const { app: testApp } = bootstrapTestApp({ user: { id: "user-1" } }, service);
    const request = () => testApp.request("http://localhost/api/bootstrap", { method: "POST" }, {} as WorkerBindings);
    const first = await request();
    const second = await request();
    expect(await first.json()).toEqual({ household });
    expect(await second.json()).toEqual({ household });
    expect(calls).toEqual(["user-1", "user-1"]);
  });

  it("returns the same canonical household for concurrent bootstrap requests", async () => {
    let created = false;
    let createCount = 0;
    const service = vi.fn(async () => {
      if (!created) {
        created = true;
        createCount += 1;
      }
      await Promise.resolve();
      return household;
    });
    const { app: testApp } = bootstrapTestApp({ user: { id: "user-1" } }, service);
    const request = () => testApp.request("http://localhost/api/bootstrap", { method: "POST" }, {} as WorkerBindings);
    const responses = await Promise.all([request(), request(), request()]);
    expect(createCount).toBe(1);
    expect(await Promise.all(responses.map((response) => response.json()))).toEqual([
      { household }, { household }, { household }
    ]);
  });

  it("returns a safe envelope when the database service fails", async () => {
    const service = vi.fn(async () => { throw new Error("raw SQL secret"); });
    const { app: testApp } = bootstrapTestApp({ user: { id: "user-1" } }, service);
    const response = await testApp.request("http://localhost/api/bootstrap", { method: "POST" }, {} as WorkerBindings);
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body).toEqual({ error: { code: "INTERNAL_ERROR", message: "Không thể hoàn tất thiết lập gia đình. Vui lòng thử lại." } });
    expect(JSON.stringify(body)).not.toContain("raw SQL secret");
  });
});
