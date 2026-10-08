import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import "@testing-library/jest-dom/vitest";
import { SessionSummary } from "./session-summary";
import { createStudySessionResult } from "./study-session-result";
import type { StudyScope } from "./study-queue";
describe("Summary source continuity", () => {
  it.each<[StudyScope, string]>([
    [{ type: "pathway" }, "/study/setup?source=pathway"],
    [{ type: "all" }, "/study/setup?source=all"],
    [{ type: "custom", ids: [1, 2] }, "/study/setup?source=custom&setIds=1%2C2"],
    [{ type: "saved", all: true }, "/study/setup?saved=1&content=all"],
    [{ type: "weak" }, "/study/setup?weak=1"]
  ])("preserves $type on Học tiếp", (scope, href) => {
    render(<MemoryRouter><SessionSummary result={createStudySessionResult([])} scope={scope} streak={null} onReviewWrong={() => {}} /></MemoryRouter>);
    expect(screen.getByRole("link", { name: /Học tiếp/ })).toHaveAttribute("href", href);
  });
});
