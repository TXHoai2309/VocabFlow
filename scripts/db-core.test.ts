import { describe, expect, it, vi } from "vitest";

const { postgresMock } = vi.hoisted(() => ({ postgresMock: vi.fn() }));

vi.mock("postgres", () => ({ default: postgresMock }));

import { openSql } from "./db-core";

describe("script database connections", () => {
  it("disables prepared statements across schema resets that recreate enum types", () => {
    const connection = {};
    postgresMock.mockReturnValue(connection);

    expect(openSql("postgres://test.invalid/vocabflow")).toBe(connection);
    expect(postgresMock).toHaveBeenCalledWith(
      "postgres://test.invalid/vocabflow",
      expect.objectContaining({ prepare: false })
    );
  });
});
