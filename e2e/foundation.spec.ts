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

  const auth = await request.get("/api/auth/session");
  expect(auth.status()).toBe(503);
  expect(auth.headers()["content-type"]).toContain("application/json");
});
