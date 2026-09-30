import { describe, expect, it, vi } from "vitest";

const { betterAuthMock, drizzleAdapterMock, createHttpDatabaseMock } = vi.hoisted(() => ({
  betterAuthMock: vi.fn((options: Record<string, unknown>) => ({ options })),
  drizzleAdapterMock: vi.fn(() => ({ adapter: "drizzle" })),
  createHttpDatabaseMock: vi.fn(() => ({ database: "fixture" }))
}));

vi.mock("better-auth", () => ({ betterAuth: betterAuthMock }));
vi.mock("better-auth/adapters/drizzle", () => ({ drizzleAdapter: drizzleAdapterMock }));
vi.mock("./db/client", () => ({ createHttpDatabase: createHttpDatabaseMock }));

import { createAuth } from "./auth";

describe("Better Auth configuration", () => {
  it("enables the built-in session cookie cache for 60 seconds without changing auth setup", () => {
    createAuth("postgres://fixture.invalid/vocabflow", "test-only-secret");

    const options = betterAuthMock.mock.calls[0]?.[0];
    expect(options?.session).toEqual({
      cookieCache: {
        enabled: true,
        maxAge: 60
      }
    });
    expect(options?.emailAndPassword).toEqual({ enabled: true });
    expect(options?.database).toBeDefined();
    expect(drizzleAdapterMock).toHaveBeenCalledWith({ database: "fixture" }, { provider: "pg" });
  });
});
