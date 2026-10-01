import { expect, test } from "@playwright/test";

test("static production preview serves SPA deep links", async ({ page }) => {
  await page.goto("/foundation");
  await expect(page.getByRole("heading", { name: "Trang nền tảng đang hoạt động." })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Trang nền tảng đang hoạt động." })).toBeVisible();

});
