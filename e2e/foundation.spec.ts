import { expect, test } from "@playwright/test";

test("production preview serves SPA and Worker API on one origin", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /dependable place/i })).toBeVisible();

  await page.getByRole("link", { name: /open nested route/i }).click();
  await expect(page).toHaveURL(/\/foundation$/);
  await expect(page.getByRole("heading", { name: /foundation route is working/i })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: /foundation route is working/i })).toBeVisible();

  const health = await request.get("/api/health");
  expect(health.status()).toBe(200);
  expect(health.headers()["content-type"]).toContain("application/json");
  expect(await health.json()).toEqual({ status: "ok" });

  const unknown = await request.get("/api/unknown");
  expect(unknown.status()).toBe(404);
  expect(unknown.headers()["content-type"]).toContain("application/json");
  expect(await unknown.text()).not.toContain("<html");

  // Better Auth 1.7.2 exposes `/get-session`; `/session` is not a supported
  // endpoint. Core CI runs without auth secrets (503), while a configured
  // local preview returns the unauthenticated session as `null` (200).
  const auth = await request.get("/api/auth/get-session");
  expect([200, 503]).toContain(auth.status());
  expect(auth.headers()["content-type"]).toContain("application/json");
  if (auth.status() === 200) expect(await auth.json()).toBeNull();
});
