export const RECENT_SEARCHES_STORAGE_KEY = "vocabflow.recentSearches.v1";
const RECENT_SEARCH_LIMIT = 5;

function normalizeQuery(value: string) {
  return value.trim().normalize("NFC");
}

export function normalizeRecentSearches(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const result: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string") continue;
    const query = normalizeQuery(item);
    if (!query || Array.from(query).length > 100) continue;
    const key = query.toLocaleLowerCase("vi-VN");
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(query);
    if (result.length === RECENT_SEARCH_LIMIT) break;
  }
  return result;
}

export function readRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = window.localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY);
    if (stored === null) return [];
    const recent = normalizeRecentSearches(JSON.parse(stored) as unknown);
    try {
      window.localStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(recent));
    } catch {
      // A blocked storage write should not discard valid recent searches.
    }
    return recent;
  } catch {
    try {
      window.localStorage.removeItem(RECENT_SEARCHES_STORAGE_KEY);
    } catch {
      // Storage is optional; the search experience remains usable without it.
    }
    return [];
  }
}

export function addRecentSearch(current: string[], value: string): string[] {
  const query = normalizeQuery(value);
  if (!query || Array.from(query).length > 100) return normalizeRecentSearches(current);
  return normalizeRecentSearches([query, ...current]);
}

export function persistRecentSearches(values: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(normalizeRecentSearches(values)));
  } catch {
    // Recent searches are best-effort and never block opening a result.
  }
}

export function clearPersistedRecentSearches() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(RECENT_SEARCHES_STORAGE_KEY);
  } catch {
    // Recent searches are best-effort and never block searching.
  }
}
