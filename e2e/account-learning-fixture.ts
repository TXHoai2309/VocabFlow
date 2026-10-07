import type { Page } from "@playwright/test";
import type { LearnerDto } from "@vocabflow/contracts";
export const householdId = "00000000-0000-4000-8000-000000000001";
export function profile(id = "00000000-0000-4000-8000-000000000010", displayName = "An", createdAt = "2026-09-10T00:00:00.000Z"): LearnerDto {
  return { id, householdId, displayName, avatarKey: null, enabled: true, createdAt, updatedAt: createdAt };
}
export async function mockAccount(page: Page, rows: LearnerDto[] = [profile()], authenticated = true, missingHousehold = false) {
  const state = { authenticated, rows, creates: 0, reads: 0, bootstraps: 0, sessionReads: 0, signIns: 0, signUps: 0, signOuts: 0, logoutFails: false, userName: "Nguyễn An", scopedRequests: [] as string[] };
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    state.scopedRequests.push(path);
    await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { code: "INTERNAL_ERROR" } }) });
  });
  await page.route("**/api/auth/get-session", async (route) => { state.sessionReads += 1; await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(state.authenticated ? { session: { id: "session-1", userId: "account-a" }, user: { id: "account-a", name: state.userName, email: "account@example.com" } } : null) }); });
  for (const action of ["sign-in", "sign-up"]) {
    await page.route("**/api/auth/" + action + "/email", async (route) => {
      state.authenticated = true;
      if (action === "sign-up") { state.signUps += 1; state.userName = (route.request().postDataJSON() as { name: string }).name; } else state.signIns += 1;
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ token: "test-session-token", user: { id: "account-a", name: state.userName, email: "account@example.com" } }) });
    });
  }
  await page.route("**/api/auth/sign-out", async (route) => {
    state.signOuts += 1;
    if (state.logoutFails) await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ code: "INTERNAL_ERROR" }) });
    else { state.authenticated = false; await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true }) }); }
  });
  await page.route("**/api/bootstrap", async (route) => {
    state.bootstraps += 1;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ household: { id: householdId, name: "Gia đình VocabFlow", timezone: "Asia/Ho_Chi_Minh" } }) });
  });
  await page.route("**/api/learners", async (route) => {
    if (route.request().method() === "GET") {
      state.reads += 1;
      if (missingHousehold && state.bootstraps === 0) { await route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ error: { code: "HOUSEHOLD_ACCESS_DENIED" } }) }); return; }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ learners: rows }) }); return;
    }
    state.creates += 1;
    const name = (route.request().postDataJSON() as { displayName: string }).displayName;
    const created = profile("00000000-0000-4000-8000-000000000099", name);
    rows.push(created);
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(created) });
  });
  return state;
}
