import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import "@testing-library/jest-dom/vitest";
import App from "./App";

describe("foundation SPA", () => {
  it("renders the home shell", () => {
    render(<MemoryRouter initialEntries={["/"]}><App /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: /dependable place/i })).toBeInTheDocument();
  });

  it("renders the nested foundation route", () => {
    render(<MemoryRouter initialEntries={["/foundation"]}><App /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: /foundation route is working/i })).toBeInTheDocument();
  });
});
