import { afterEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import {
  addRecentSearch,
  clearPersistedRecentSearches,
  normalizeRecentSearches,
  persistRecentSearches,
  readRecentSearches,
  RECENT_SEARCHES_STORAGE_KEY
} from "./recent-searches";

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("global search recent queries", () => {
  it("normalizes, deduplicates case-insensitively and caps the newest queries at five", () => {
    const recent = addRecentSearch(["Food", "animals", "family", "school", "travel"], " FOOD ");

    expect(recent).toEqual(["FOOD", "animals", "family", "school", "travel"]);
    expect(normalizeRecentSearches(["family", " FamiLY ", "", null, "food", "animals", "school"])).toEqual([
      "family", "food", "animals", "school"
    ]);
    expect(addRecentSearch(recent, "   ")).toEqual(recent);
  });

  it("stores only strings and clears the versioned localStorage entry", () => {
    persistRecentSearches([" family ", "FAMILY", "food"]);

    expect(window.localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY)).toBe(JSON.stringify(["family", "food"]));
    expect(readRecentSearches()).toEqual(["family", "food"]);
    clearPersistedRecentSearches();
    expect(window.localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY)).toBeNull();
  });

  it("recovers safely from corrupt JSON and unavailable storage writes", () => {
    window.localStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, "{broken");
    expect(readRecentSearches()).toEqual([]);
    expect(window.localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY)).toBeNull();

    window.localStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(["family"]));
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("storage blocked"); });
    expect(readRecentSearches()).toEqual(["family"]);
  });
});
