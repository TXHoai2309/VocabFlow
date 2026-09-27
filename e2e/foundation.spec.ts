import { expect, test } from "@playwright/test";

test("static production preview serves SPA deep links", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /dependable place/i })).toBeVisible();

  await page.getByRole("link", { name: /open nested route/i }).click();
  await expect(page).toHaveURL(/\/foundation$/);
  await expect(page.getByRole("heading", { name: /foundation route is working/i })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: /foundation route is working/i })).toBeVisible();

});
