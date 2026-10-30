import { expect, test } from "@playwright/test";

const words = [
  { id: 1, word: "apple", vietnamese: "quả táo", cefr: "A1" },
  { id: 2, word: "greet", vietnamese: "chào hỏi" }
].map((word) => ({ ...word, ipa: null, definitionEn: null, exampleEn: null,
  imageUrl: null, audioUrl: null, topic: null, level: null, enabled: true, contentVersion: 1 }));

for (const width of [375, 1440]) {
  test(`guest retains the chosen level through retry, empty results, reload and study at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    let releaseInitialRead!: () => void;
    const initialRead = new Promise<void>((resolve) => { releaseInitialRead = resolve; });
    let firstBrowse = true;
    let failUnclassified = true;
    const requests: string[] = [];
    await page.route("**/api/**", async (route) => {
      const url = new URL(route.request().url());
      requests.push(url.pathname + url.search);
      if (url.pathname === "/api/auth/get-session") return route.fulfill({ json: null });
      if (url.pathname === "/api/public/vocabulary/browse") {
        if (firstBrowse) { firstBrowse = false; await initialRead; }
        if (url.searchParams.get("cefr") === "UNCLASSIFIED" && failUnclassified) {
          failUnclassified = false;
          return route.fulfill({ status: 503, json: { error: { code: "INTERNAL_ERROR" } } });
        }
        const items = words.filter((word) => {
          const cefr = url.searchParams.get("cefr");
          return (!cefr || (cefr === "UNCLASSIFIED" ? !word.cefr : word.cefr === cefr))
            && (!url.searchParams.get("q") || word.word.includes(url.searchParams.get("q")!));
        }).map(({ definitionEn: _definition, exampleEn: _example, ...word }) => ({
          ...word, status: "NEW", nextReviewDate: null
        }));
        return route.fulfill({ json: { vocabulary: items, total: items.length, page: 1,
          pageSize: 30, totalPages: 1, filters: { cefrOptions: ["A1"], topicOptions: [] } } });
      }
      if (url.pathname === "/api/public/learning-index") return route.fulfill({ json: {
        vocabulary: words.map(({ id, level, cefr }) => ({ id, level, ...(cefr ? { cefr } : {}) })),
        learningSets: [], topics: []
      } });
      if (url.pathname === "/api/public/vocabulary") {
        const ids = (url.searchParams.get("ids") ?? "").split(",").map(Number);
        return route.fulfill({ json: { vocabulary: words.filter((word) => ids.includes(word.id)) } });
      }
      return route.fulfill({ status: 404, json: { error: { code: "NOT_FOUND" } } });
    });

    await page.goto("/vocabulary");
    await expect(page.getByTestId("vocabulary-loading")).toBeVisible();
    releaseInitialRead();
    await expect(page.getByTestId("vocabulary-row-1")).toBeVisible();
    const level = page.getByRole("combobox", { name: "Mức học" });
    await expect(level.locator("option")).toHaveCount(11);
    await expect(level.locator('option[value="intro-first-words"]')).toHaveAttribute("disabled", "");
    await expect(level.locator('option[value="C2"]')).toHaveAttribute("disabled", "");
    await level.focus();
    await level.press("Alt+ArrowDown");
    await page.screenshot({ path: `test-results/us63-native-menu-${width}.png` });
    await level.press("Escape");
    await level.press("ArrowDown");
    await expect(level).toHaveValue("A1");
    const supplementary = page.locator(".vocabulary-additional-filters");
    await supplementary.locator("summary").focus();
    await supplementary.locator("summary").press("Enter");
    await expect(supplementary).toHaveAttribute("open");
    await expect(page.getByRole("combobox", { name: "Lớp học" })).toBeVisible();

    await level.selectOption("UNCLASSIFIED");
    await expect(page.getByTestId("vocabulary-error")).toBeVisible();
    await expect(level).toHaveValue("UNCLASSIFIED");
    await page.getByRole("button", { name: "Thử lại", exact: true }).click();
    await expect(page.getByTestId("vocabulary-row-2")).toBeVisible();
    await expect(page.getByTestId("vocabulary-row-1")).toHaveCount(0);
    await page.getByRole("searchbox", { name: "Tìm từ tiếng Anh hoặc nghĩa tiếng Việt" }).fill("no-match");
    await expect(page.getByTestId("vocabulary-no-results")).toBeVisible();
    await expect(page.getByRole("link", { name: "Học nội dung đã chọn" })).toHaveCount(0);
    await page.getByRole("region", { name: "Tìm kiếm và lọc từ vựng" })
      .getByRole("button", { name: "Xóa tìm kiếm", exact: true }).click();
    await expect(page.getByTestId("vocabulary-row-2")).toBeVisible();
    await page.reload();
    await expect(level).toHaveValue("UNCLASSIFIED");
    await expect(page.getByTestId("vocabulary-row-2")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: `test-results/us63-guest-${width}.png`, fullPage: true });
    await page.getByRole("link", { name: "Học nội dung đã chọn" }).click();
    await expect(page.getByText("Mức học: Chưa phân loại", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Bắt đầu học", exact: true }).click();
    await expect(page.locator(".flashcard-word")).toHaveText("greet");
    expect(requests.some((request) => request.startsWith("/api/learners/"))).toBe(false);
  });
}
