// @vitest-environment node
import { describe, expect, it } from "vitest";
import { Hono } from "hono";
import { foundationAttemptRequestSchema, foundationReviewRequestSchema } from "@vocabflow/contracts";
import { foundationLocalEnabled, installFoundationLocal } from "./foundation-local";

describe("foundation local boundary", () => {
  const local = { DATABASE_URL: "postgres://user:placeholder@127.0.0.1:55432/vocabflow_dev", VOCABFLOW_ENV: "development", DATABASE_ENV: "development", EXECUTION_CONTEXT: "local-development", DATABASE_DRIVER: "postgres-js" };
  it.each([{}, { ...local, VERCEL_ENV: "preview" }, { ...local, VOCABFLOW_ENV: "production" }, { ...local, DATABASE_URL: "postgres://user:placeholder@remote.example/db" }])("does not install provider-independent local routes outside strict local environment", async env => {
    expect(foundationLocalEnabled(env)).toBe(false);
    const app = new Hono(); expect(installFoundationLocal(app, env)).toBeUndefined();
    expect((await app.request("http://127.0.0.1/api/public/foundation/catalog")).status).toBe(404);
  });
  it("refuses client answer keys/target display metadata and missing revision pins", () => {
    const base = { targetId: "00000000-0000-4000-8000-000000000001", expectedRevision: 0, pins: { targetRevision: 1, presentationRevision: 2, pronunciationRevision: 1 } };
    expect(foundationAttemptRequestSchema.safeParse({ ...base, correctOptionKey: "A" }).success).toBe(false);
    expect(foundationAttemptRequestSchema.safeParse({ ...base, pins: undefined }).success).toBe(false);
    expect(foundationReviewRequestSchema.safeParse({ reviewId: base.targetId, attemptRef: base.targetId, expectedRevision: 0, pins: base.pins, answer: { kind: "LETTER_OPTION", optionKey: base.targetId, correct: true } }).success).toBe(false);
  });
});
