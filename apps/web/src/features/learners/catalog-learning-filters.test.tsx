import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CatalogLearningFilters } from "./catalog-learning-filters";

afterEach(() => vi.unstubAllEnvs());
describe("published first words availability", () => {
  it("enables real published first words in a Production build, with foundation still unavailable", () => {
    vi.stubEnv("DEV", false);
    render(<MemoryRouter><CatalogLearningFilters firstWordsAvailable /></MemoryRouter>);
    expect(screen.getByRole("option", { name: "Từ đầu tiên" })).toBeEnabled();
    expect(screen.getByRole("option", { name: "Làm quen chữ và âm — Chưa có nội dung" })).toBeDisabled();
  });
  it("keeps absent first words disabled rather than deriving them from missing CEFR", () => {
    render(<MemoryRouter><CatalogLearningFilters /></MemoryRouter>);
    expect(screen.getByRole("option", { name: "Từ đầu tiên — Chưa có nội dung" })).toBeDisabled();
  });
});
