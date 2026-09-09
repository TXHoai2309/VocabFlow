import { expect, test } from "@playwright/test";

const household = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Gia đình VocabFlow",
  timezone: "Asia/Ho_Chi_Minh"
};

test("US-02 signs in with native Enter and reaches household-ready handoff", async ({ page }) => {
  let signInCount = 0;
  let bootstrapCount = 0;

  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: "null" });
  });
  await page.route("**/api/auth/sign-in/email", async (route) => {
    signInCount += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ token: "test-session-token", user: { id: "user-1", email: "parent@example.com" } })
    });
  });
  await page.route("**/api/bootstrap", async (route) => {
    bootstrapCount += 1;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ household }) });
  });

  await page.goto("/login");
  await page.getByLabel("Email").fill("parent@example.com");
  const password = page.getByRole("textbox", { name: "Mật khẩu" });
  await password.fill("secret");
  await password.press("Enter");

  await expect(page.getByTestId("authenticated-household-ready")).toContainText("Household đã sẵn sàng.");
  expect(signInCount).toBe(1);
  expect(bootstrapCount).toBe(1);
});

test("US-02 shows a safe invalid-credentials state", async ({ page }) => {
  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: "null" });
  });
  await page.route("**/api/auth/sign-in/email", async (route) => {
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ code: "INVALID_EMAIL_OR_PASSWORD", message: "internal provider detail" })
    });
  });

  await page.goto("/login");
  await page.getByLabel("Email").fill("parent@example.com");
  const password = page.getByRole("textbox", { name: "Mật khẩu" });
  await password.fill("wrong");
  await password.press("Enter");

  await expect(page.getByRole("alert")).toContainText("Email hoặc mật khẩu không đúng. Vui lòng thử lại.");
  await expect(page.getByRole("alert")).not.toContainText("internal provider detail");
});

test("US-02 reuses an already-authenticated parent session", async ({ page }) => {
  let bootstrapCount = 0;

  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        session: { id: "session-1", userId: "user-1" },
        user: { id: "user-1", email: "parent@example.com" }
      })
    });
  });
  await page.route("**/api/bootstrap", async (route) => {
    bootstrapCount += 1;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ household }) });
  });

  await page.goto("/login");

  await expect(page.getByTestId("authenticated-household-ready")).toBeVisible();
  expect(bootstrapCount).toBe(1);
  await expect(page.getByRole("button", { name: "Đăng nhập" })).toBeDisabled();
});
