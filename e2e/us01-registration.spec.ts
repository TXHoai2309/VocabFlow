import { expect, test } from "@playwright/test";

test("US-01 submits the registration pipeline with a native Enter key", async ({ page }) => {
  let signupCount = 0;
  let bootstrapCount = 0;

  await page.route("**/api/auth/sign-up/email", async (route) => {
    signupCount += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        token: "test-session-token",
        user: { id: "user-1", name: "Nguyễn An", email: "parent@example.com" }
      })
    });
  });

  await page.route("**/api/bootstrap", async (route) => {
    bootstrapCount += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        household: {
          id: "00000000-0000-4000-8000-000000000001",
          name: "Gia đình VocabFlow",
          timezone: "Asia/Ho_Chi_Minh"
        }
      })
    });
  });

  await page.goto("/register");
  await page.getByLabel("Tên phụ huynh").fill("Nguyễn An");
  await page.getByLabel("Email").fill("parent@example.com");
  const password = page.getByRole("textbox", { name: "Mật khẩu" });
  await password.fill("secret");
  await password.press("Enter");

  await expect(page.getByRole("status")).toContainText("Tài khoản và gia đình đã được thiết lập.");
  expect(signupCount).toBe(1);
  expect(bootstrapCount).toBe(1);
});
