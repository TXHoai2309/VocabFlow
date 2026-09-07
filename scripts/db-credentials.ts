export type ParsedRoleCredential = {
  roleName: string;
  password: string;
};

/**
 * Parse a purpose-specific PostgreSQL URL without ever including the URL or
 * password in an error. The returned password is held only in memory by the
 * bootstrap caller and is passed to postgres.js as a query parameter.
 */
export function parseRoleCredential(
  connectionString: string,
  expectedRoleName: string,
): ParsedRoleCredential {
  let parsed: URL;
  try {
    parsed = new URL(connectionString);
  } catch {
    throw new Error("INVALID_DATABASE_URL");
  }

  if (!/^postgres(?:ql)?$/.test(parsed.protocol.replace(/:$/, ""))) {
    throw new Error("INVALID_DATABASE_URL");
  }

  let roleName: string;
  let password: string;
  try {
    roleName = decodeURIComponent(parsed.username);
    password = decodeURIComponent(parsed.password);
  } catch {
    throw new Error("INVALID_DATABASE_URL");
  }

  if (!parsed.hostname || !parsed.pathname || parsed.pathname === "/" || !roleName || !password) {
    throw new Error("INVALID_DATABASE_URL");
  }

  if (roleName !== expectedRoleName) {
    throw new Error("CONNECTION_TARGET_MISMATCH");
  }

  return { roleName, password };
}
