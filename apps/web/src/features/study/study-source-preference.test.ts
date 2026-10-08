import { beforeEach, describe, expect, it } from "vitest";
import { readStudyPreference, saveStudyPreference } from "./study-source-preference";
describe("Account study preference", () => {
  beforeEach(() => localStorage.clear());
  it("defaults to pathway and retains account A without leaking into B", () => {
    expect(readStudyPreference("A")).toEqual({ source: "pathway", ids: [] });
    saveStudyPreference("A", "custom", [1, 2]);
    expect(readStudyPreference("B")).toEqual({ source: "pathway", ids: [] });
    expect(readStudyPreference("A")).toEqual({ source: "custom", ids: [1, 2] });
    expect(readStudyPreference()).toEqual({ source: "pathway", ids: [] });
  });
  it("handles corrupt or unsafe stored preferences", () => {
    localStorage.setItem("vocabflow.study-source.v1:A", "bad"); expect(readStudyPreference("A").source).toBe("pathway");
    localStorage.setItem("vocabflow.study-source.v1:A", JSON.stringify({ source: "custom", ids: [0, -1, 9007199254740992] }));
    expect(readStudyPreference("A").ids).toEqual([]);
  });
});
