import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { TopicsPage } from "./topics-page";

const topics = [{
  id: 1,
  slug: "family",
  name: "Family",
  description: "Vocabulary classified as Family by the imported source.",
  sortOrder: 10,
  enabled: true
}];

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/topics"]}>
      <Routes>
        <Route path="/topics" element={<TopicsPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("US-27 topic browse UI", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("loads topics, opens one, and shows its vocabulary", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ topics }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ vocabulary: [{
        id: 1,
        word: "family",
        ipa: null,
        vietnamese: "gia đình",
        definitionEn: null,
        exampleEn: null,
        imageUrl: null,
        audioUrl: null,
        topic: "Family",
        level: null,
        enabled: true,
        contentVersion: 1
      }] }), { status: 200 }));
    renderPage();

    expect(await screen.findByTestId("topic-family")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("topic-family"));
    expect(await screen.findByTestId("topic-vocabulary-list")).toHaveTextContent("family");
    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/topics", { credentials: "include" });
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/topics/1/vocabulary", { credentials: "include" });
  });

  it("shows an explicit empty topic state", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ topics }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ vocabulary: [] }), { status: 200 }));
    renderPage();
    fireEvent.click(await screen.findByTestId("topic-family"));
    await waitFor(() => expect(screen.getByTestId("topic-vocabulary-empty")).toBeInTheDocument());
  });
});
