import { expect, test } from "@playwright/test";
import { mockAccount } from "./account-learning-fixture";
test("signup with Enter provisions internal identity and opens Home directly", async ({ page }) => {
  const state = await mockAccount(page, [], false);
  const visits: string[] = []; page.on("framenavigated", (frame) => { if (frame === page.mainFrame()) visits.push(new URL(frame.url()).pathname); });
  await page.goto("/register"); await page.getByLabel("Tên của bạn").fill("Nguyễn An"); await page.getByLabel("Email").fill("account@example.com"); await page.getByRole("textbox", { name: "Mật khẩu" }).fill("secret"); await page.getByRole("textbox", { name: "Mật khẩu" }).press("Enter");
  await expect(page.locator(".app-layout")).toBeVisible(); await expect(page).toHaveURL(/\/$/);
  expect(state.signUps).toBe(1); expect(state.bootstraps).toBe(1); expect(state.creates).toBe(1); expect(state.rows[0]?.displayName).toBe("Nguyễn An"); expect(visits).not.toContain("/learners");
  await expect(page.getByText("Tiếp tục tạo hồ sơ người học")).toHaveCount(0); await expect(page.getByRole("button", { name: "Tạo hồ sơ học" })).toHaveCount(0); await expect(page.getByTestId("toast-success")).toHaveCount(0);
});
