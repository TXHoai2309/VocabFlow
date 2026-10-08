import { expect, test } from "@playwright/test";
import { mockAccount, profile } from "./account-learning-fixture";
const storage = "vocabflow.activeLearner.v1";
test("zero profiles self-heal household, provision once and preserve requested route", async ({ page }) => {
  const state = await mockAccount(page, [], true, true); await page.goto("/study/setup?weak=1"); await expect(page.locator(".app-layout")).toBeVisible(); await expect(page).toHaveURL(/\/study\/setup\?weak=1$/); expect(state.bootstraps).toBe(1); expect(state.reads).toBe(2); expect(state.creates).toBe(1); await expect(page.getByRole("button", { name: "Tạo hồ sơ học" })).toHaveCount(0);
});
test("one existing profile needs no create or selector", async ({ page }) => {
  const state = await mockAccount(page); await page.goto("/"); await expect(page.locator(".app-layout")).toBeVisible(); expect(state.creates).toBe(0); await expect(page.getByRole("heading", { name: "Chọn người học" })).toHaveCount(0);
});
test("multiple legacy profiles are preserved while stored identity is used internally", async ({ page }) => {
  const rows = [profile(), profile("00000000-0000-4000-8000-000000000011", "XH"), profile("00000000-0000-4000-8000-000000000012", "Toast Test")];
  const before = JSON.stringify(rows); const state = await mockAccount(page, rows); await page.addInitScript(({ key, learner }) => localStorage.setItem(key, JSON.stringify({ userId: "account-a", learner })), { key: storage, learner: rows[1] }); await page.goto("/progress"); await expect(page.locator(".app-layout")).toBeVisible();
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).learner.id, storage)).toBe(rows[1]?.id); expect(JSON.stringify(rows)).toBe(before); expect(state.creates).toBe(0); await expect(page.getByRole("button", { name: /Đổi người học/ })).toHaveCount(0); await page.reload(); await expect(page.locator(".app-layout")).toBeVisible(); await expect(page).toHaveURL(/\/progress$/);
});
test("old learners bookmarks redirect to Home and mobile remains in viewport", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 }); await mockAccount(page); await page.goto("/learners"); await expect(page.locator(".app-layout")).toBeVisible(); await expect(page).toHaveURL(/\/$/); expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});
test("account logout clears persisted identity and supports login again", async ({ page }) => {
  const state = await mockAccount(page); await page.goto("/"); await page.getByRole("button", { name: "Tài khoản của Nguyễn An" }).click(); const menu = page.getByRole("menu", { name: "Tài khoản" }); await expect(menu.getByRole("menuitem")).toHaveText(["Đăng xuất"]); await menu.getByRole("menuitem", { name: "Đăng xuất" }).click(); await expect(page).toHaveURL(/\/login$/); await expect.poll(() => state.sessionReads).toBeGreaterThan(1); expect(state.signOuts).toBe(1); expect(await page.evaluate((key) => localStorage.getItem(key), storage)).toBeNull();
  await page.getByLabel("Email").fill("account@example.com"); await page.getByRole("textbox", { name: "Mật khẩu" }).fill("secret"); await page.getByRole("textbox", { name: "Mật khẩu" }).press("Enter"); await expect(page.locator(".app-layout")).toBeVisible(); await expect(page).toHaveURL(/\/$/);
});
test("logout failure retains session and shows safe toast", async ({ page }) => {
  const state = await mockAccount(page); state.logoutFails = true; await page.goto("/"); await page.getByRole("button", { name: "Tài khoản của Nguyễn An" }).click(); await page.getByRole("menuitem", { name: "Đăng xuất" }).click(); await expect(page.getByTestId("toast-error")).toContainText("Không thể đăng xuất. Vui lòng thử lại."); await expect(page.locator(".app-layout")).toBeVisible(); await expect(page).toHaveURL(/\/$/); expect(await page.evaluate((key) => localStorage.getItem(key), storage)).not.toBeNull();
});
