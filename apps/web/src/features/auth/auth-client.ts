import { createAuthClient } from "better-auth/react";

// Better Auth resolves the same-origin `/api/auth` base path in the browser.
// No deployment URL or secret is included in the client bundle.
export const authClient = createAuthClient();
