import { expect, test } from "@playwright/test";
import { mockAccount } from "./account-learning-fixture";
test("login with Enter opens Home without choosing a profile", async ({ page }) => {
  const state = await mockAccount(page, undefined, false); await page.goto("/login"); await page.getByLabel("Email").fill("account@example.com"); await page.getByRole("textbox", { name: "Mật khẩu" }).fill("secret"); await page.getByRole("textbox", { name: "Mật khẩu" }).press("Enter");
  await expect(page.locator(".app-layout")).toBeVisible(); await expect(page).toHaveURL(/\/$/); expect(state.signIns).toBe(1); expect(state.creates).toBe(0); expect(state.bootstraps).toBe(1); await expect(page.getByText("Tiếp tục chọn người học")).toHaveCount(0);
});
test("login preserves safe invalid-credentials feedback", async ({ page }) => {
  await mockAccount(page, undefined, false); await page.route("**/api/auth/sign-in/email", async (route) => route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ code: "INVALID_EMAIL_OR_PASSWORD", message: "internal provider detail" }) }));
  await page.goto("/login"); await page.getByLabel("Email").fill("account@example.com"); await page.getByRole("textbox", { name: "Mật khẩu" }).fill("wrong"); await page.getByRole("textbox", { name: "Mật khẩu" }).press("Enter");
  await expect(page.getByRole("alert")).toContainText("Địa chỉ email hoặc mật khẩu không đúng. Vui lòng thử lại."); await expect(page.getByRole("alert")).not.toContainText("internal provider detail");
});
test("an existing authenticated session opens Home from login", async ({ page }) => {
  const state = await mockAccount(page); await page.goto("/login"); await expect(page.locator(".app-layout")).toBeVisible(); await expect(page).toHaveURL(/\/$/); expect(state.bootstraps).toBe(1); expect(state.signIns).toBe(0);
});
