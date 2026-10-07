import { expect, test, type Page } from "@playwright/test";

const householdId = "00000000-0000-4000-8000-000000000001";

function learner(id: string, displayName: string, createdAt: string) {
  return {
    id,
    householdId,
    displayName,
    avatarKey: null,
    enabled: true,
    createdAt,
    updatedAt: createdAt
  };
}

const session = {
  session: { id: "session-1", userId: "parent-1" },
  user: { id: "parent-1", email: "parent@example.com" }
};

async function mockAuthenticatedLearners(page: Page, rows: ReturnType<typeof learner>[]) {
  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(session) });
  });
  await page.route("**/api/learners", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ learners: rows }) });
      return;
    }
    const body = await route.request().postDataJSON() as { displayName: string };
    const created = learner(
      "00000000-0000-4000-8000-000000000099",
      body.displayName,
      "2026-09-10T01:00:00.000Z"
    );
    rows.push(created);
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(created) });
  });
}

test("US-03 resolves zero learners, creates the first profile and keeps management usable", async ({ page }) => {
  const rows: ReturnType<typeof learner>[] = [];
  await mockAuthenticatedLearners(page, rows);
  await page.goto("/learners");

  await expect(page.getByTestId("learner-empty-state")).toBeVisible();
  await page.getByLabel("Tên người học").fill("  An  ");
  await page.getByLabel("Tên người học").press("Enter");
  await expect(page.getByRole("button", { name: /An/ })).toHaveAttribute("aria-current", "true");
  expect(rows).toHaveLength(1);
  await expect(page.getByTestId("toast-success")).toContainText("Đã tạo hồ sơ người học");
  await expect(page.getByRole("button", { name: "Tạo hồ sơ học" })).toBeVisible();
  await expect(page.locator(".learner-ready")).toHaveCount(0);
});

test("US-03 allows a second profile with one enabled learner", async ({ page }) => {
  await mockAuthenticatedLearners(page, [learner(
    "00000000-0000-4000-8000-000000000010",
    "An",
    "2026-09-10T00:00:00.000Z"
  )]);
  await page.goto("/learners");

  await expect(page.getByRole("button", { name: /An/ })).toHaveAttribute("aria-current", "true");
  await expect(page.getByRole("button", { name: "Tạo hồ sơ học" })).toBeVisible();
  await page.getByLabel("Tên người học").fill("Test 2");
  await page.getByLabel("Tên người học").press("Enter");
  await expect(page.getByRole("button", { name: /Test 2/ })).toHaveAttribute("aria-current", "true");
  await expect(page.getByRole("button", { name: "An", exact: true })).toBeVisible();
  await expect(page.getByLabel("Tên người học")).toHaveValue("");
  await expect(page.getByRole("button", { name: "Tạo hồ sơ học" })).toBeVisible();
});

test("US-03 requires explicit selection for multiple learners and refetches after reload", async ({ page }) => {
  const rows = [
    learner("00000000-0000-4000-8000-000000000010", "An", "2026-09-10T00:00:00.000Z"),
    learner("00000000-0000-4000-8000-000000000011", "Bình", "2026-09-10T00:01:00.000Z")
  ];
  await mockAuthenticatedLearners(page, rows);
  await page.goto("/learners");

  await expect(page.getByRole("button", { name: /An/ })).toBeVisible();
  await expect(page.getByTestId("learner-context-ready")).not.toBeVisible();
  const secondLearner = page.getByRole("button", { name: /Bình/ });
  await secondLearner.focus();
  await secondLearner.press("Enter");
  await expect(page.getByRole("button", { name: /Bình/ })).toHaveAttribute("aria-current", "true");

  await page.reload();
  await expect(page.getByRole("button", { name: /Bình/ })).toHaveAttribute("aria-current", "true");
  await expect(page.getByRole("button", { name: /An/ })).toBeVisible();
  await expect(page.getByTestId("learner-context-ready")).not.toBeVisible();
});

test("US-03 keeps the mobile learner layout within the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await mockAuthenticatedLearners(page, []);
  await page.goto("/learners");
  await expect(page.getByTestId("learner-empty-state")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});

test("US-03 recovers missing household membership before the first create", async ({ page }) => {
  const rows: ReturnType<typeof learner>[] = [];
  await mockAuthenticatedLearners(page, rows);
  let reads = 0;
  let bootstraps = 0;
  await page.route("**/api/learners", async (route) => {
    if (route.request().method() === "GET" && ++reads === 1) {
      await route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ error: { code: "HOUSEHOLD_ACCESS_DENIED" } }) });
    } else await route.fallback();
  });
  await page.route("**/api/bootstrap", async (route) => {
    bootstraps += 1;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ household: { id: householdId, name: "Gia đình VocabFlow", timezone: "Asia/Ho_Chi_Minh" } }) });
  });
  await page.goto("/learners");
  await expect(page.getByTestId("learner-empty-state")).toBeVisible();
  expect(bootstraps).toBe(1);
  expect(reads).toBe(2);
  await page.getByLabel("Tên người học").fill("Test 1");
  await page.getByLabel("Tên người học").press("Enter");
  await expect(page.getByRole("button", { name: /Test 1/ })).toHaveAttribute("aria-current", "true");
  await expect(page.getByTestId("toast-success")).toContainText("Đã tạo hồ sơ người học");
  expect(rows).toHaveLength(1);
  expect(bootstraps).toBe(1);
});
