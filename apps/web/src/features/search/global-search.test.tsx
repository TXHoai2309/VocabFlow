import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { MemoryRouter, useLocation, useNavigate } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import type { GlobalSearchResponse, GlobalSearchResult } from "@vocabflow/contracts";
import { GlobalSearchPalette } from "./global-search-palette";
import {
  addRecentSearch,
  persistRecentSearches,
  readRecentSearches,
  RECENT_SEARCHES_STORAGE_KEY
} from "./recent-searches";

const vocabulary = {
  type: "VOCABULARY" as const,
  id: 1,
  title: "family",
  subtitle: "gia đình",
  imageUrl: null,
  topic: "Gia đình",
  level: "GRADE_1" as const
};
const topic = { type: "TOPIC" as const, id: 2, title: "Gia đình", description: "Từ vựng gia đình." };
const learningSet = {
  type: "LEARNING_SET" as const,
  id: 3,
  title: "Từ vựng gia đình",
  description: "Bộ từ dành cho gia đình.",
  vocabularyCount: 12,
  grade: "GRADE_1" as const
};

function response(query = "family"): GlobalSearchResponse {
  return { query, vocabulary: [vocabulary], topics: [topic], learningSets: [learningSet] };
}

function requestUrl() {
  const [url] = vi.mocked(fetch).mock.calls.at(-1) ?? [];
  return new URL(String(url), window.location.origin);
}

function SearchHarness({ initialRecent = [] }: { initialRecent?: string[] }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(true);
  return (
    <>
      <div data-testid="location">{location.pathname}</div>
      <button type="button" onClick={() => setOpen(true)}>Reopen search</button>
      {open ? (
        <GlobalSearchPalette
          learnerId="00000000-0000-4000-8000-000000000021"
          onClose={() => setOpen(false)}
          onSelect={(result: GlobalSearchResult, query) => {
            persistRecentSearches(addRecentSearch(readRecentSearches().length ? readRecentSearches() : initialRecent, query));
            setOpen(false);
            const path = result.type === "VOCABULARY"
              ? `/vocabulary/${result.id}`
              : result.type === "TOPIC"
                ? `/topics/${result.id}`
                : `/learning-sets/${result.id}`;
            navigate(path);
          }}
        />
      ) : null}
    </>
  );
}

function renderPalette(initialRecent?: string[]) {
  return render(<MemoryRouter initialEntries={["/"]}><SearchHarness initialRecent={initialRecent} /></MemoryRouter>);
}

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});
describe("global search palette", () => {
  it("autofocuses input and shows recent searches for an empty query without calling the API", async () => {
    window.localStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(["family", "food"]));
    vi.spyOn(globalThis, "fetch");
    renderPalette();

    expect(await screen.findByRole("searchbox", { name: "Tìm từ vựng, chủ đề hoặc bộ từ" })).toHaveFocus();
    expect(screen.getByRole("heading", { name: "Tìm kiếm gần đây" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "family" })).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Xóa tất cả" }));
    expect(screen.queryByRole("button", { name: "family" })).not.toBeInTheDocument();
    expect(window.localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY)).toBeNull();
  });

  it("debounces a single request and renders typed vocabulary, topic and Learning Set groups", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(response()), { status: 200 }));
    const { container } = renderPalette();
    const input = screen.getByRole("searchbox", { name: "Tìm từ vựng, chủ đề hoặc bộ từ" });

    fireEvent.change(input, { target: { value: "fam" } });
    expect(screen.getByText("Đang tìm kiếm…")).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Đang tìm kiếm…" })).toHaveAttribute("aria-busy", "true");
    expect(container.querySelectorAll(".async-skeleton-search-group")).toHaveLength(3);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: "family" } });

    expect((await screen.findAllByRole("option"))[0]).toHaveTextContent("family");
    expect(screen.getByRole("group", { name: "Từ vựng (1)" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Chủ đề (1)" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Bộ từ (1)" })).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledOnce();
    expect(requestUrl().searchParams.get("q")).toBe("family");
    expect(requestUrl().searchParams.get("limit")).toBe("5");
  });

  it("does not let a late response for an older query overwrite the latest results", async () => {
    const pending: Array<(response: Response) => void> = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise((resolve) => pending.push(resolve)));
    renderPalette();
    const input = screen.getByRole("searchbox", { name: "Tìm từ vựng, chủ đề hoặc bộ từ" });

    fireEvent.change(input, { target: { value: "old" } });
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    fireEvent.change(input, { target: { value: "new" } });
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    pending[1]!(new Response(JSON.stringify(response("new")), { status: 200 }));
    expect(await screen.findByText("Gia đình")).toBeInTheDocument();
    pending[0]!(new Response(JSON.stringify(response("old")), { status: 200 }));
    await new Promise((resolve) => window.setTimeout(resolve, 0));

    expect(screen.getByRole("listbox")).toHaveAttribute("aria-label", "Kết quả tìm kiếm: new");
    expect(input).toHaveValue("new");
  });

  it("shows a no-results state without displaying stale results", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      query: "zzzz",
      vocabulary: [],
      topics: [],
      learningSets: []
    }), { status: 200 }));
    renderPalette();
    fireEvent.change(screen.getByRole("searchbox", { name: "Tìm từ vựng, chủ đề hoặc bộ từ" }), { target: { value: "zzzz" } });

    expect(await screen.findByRole("heading", { name: "Không tìm thấy kết quả" })).toBeInTheDocument();
    expect(screen.getByText("Thử từ khóa khác hoặc kiểm tra chính tả.")).toBeInTheDocument();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("shows a safe error and retries the failed query", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new Error("internal transport detail"))
      .mockResolvedValueOnce(new Response(JSON.stringify(response()), { status: 200 }));
    renderPalette();
    fireEvent.change(screen.getByRole("searchbox", { name: "Tìm từ vựng, chủ đề hoặc bộ từ" }), { target: { value: "family" } });

    expect(await screen.findByRole("heading", { name: "Không thể tải kết quả" })).toBeInTheDocument();
    expect(screen.getByText("Không thể tải kết quả tìm kiếm. Vui lòng thử lại.")).toBeInTheDocument();
    expect(screen.queryByText("internal transport detail")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    expect((await screen.findAllByRole("option"))[0]).toHaveTextContent("family");
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it.each([
    [vocabulary, "family", "/vocabulary/1"],
    [topic, "Gia đình", "/topics/2"],
    [learningSet, "Từ vựng gia đình", "/learning-sets/3"]
  ] as const)("navigates the selected result of each entity type", async (result, title, destination) => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(response()), { status: 200 }));
    renderPalette();
    fireEvent.change(screen.getByRole("searchbox", { name: "Tìm từ vựng, chủ đề hoặc bộ từ" }), { target: { value: "family" } });
    const options = await screen.findAllByRole("option");
    const resultIndex = result.type === "VOCABULARY" ? 0 : result.type === "TOPIC" ? 1 : 2;
    fireEvent.click(options[resultIndex]!);
    expect(options[resultIndex]).toHaveTextContent(title);

    expect(screen.getByTestId("location")).toHaveTextContent(destination);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY) ?? "[]")).toContain("family");
  });

  it("uses ArrowDown and ArrowUp to select results and Enter to navigate", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(response()), { status: 200 }));
    renderPalette();
    const input = screen.getByRole("searchbox", { name: "Tìm từ vựng, chủ đề hoặc bộ từ" });
    fireEvent.change(input, { target: { value: "family" } });
    const options = await screen.findAllByRole("option");

    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(options[1]).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(options[0]).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByTestId("location")).toHaveTextContent("/vocabulary/1");
  });

  it("closes the palette on Escape", async () => {
    renderPalette();
    fireEvent.keyDown(screen.getByRole("searchbox", { name: "Tìm từ vựng, chủ đề hoặc bộ từ" }), { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
