import { describe, expect, it } from "vitest";
import type { LearningSetSummary } from "@vocabflow/contracts";
import { filterLearningSets, readLearningSetCatalogFilters } from "./learning-set-catalog";

const sets: LearningSetSummary[] = [
  { id: 1, slug: "family-grade-1", name: "Gia đình", description: "Từ gần gũi về gia đình.", grade: "GRADE_1", enabled: true, sortOrder: 1, vocabularyCount: 8, topics: [{ id: 11, slug: "family", name: "Gia đình" }] },
  { id: 2, slug: "food-grade-2", name: "Đồ ăn", description: "Từ vựng món ăn.", grade: "GRADE_2", enabled: true, sortOrder: 2, vocabularyCount: 7, topics: [{ id: 12, slug: "food", name: "Ẩm thực" }] },
  { id: 3, slug: "family-general", name: "Quan hệ gia đình nâng cao", description: "Nhóm chủ đề gia đình.", grade: null, enabled: true, sortOrder: 3, vocabularyCount: 12, topics: [{ id: 11, slug: "family", name: "Gia đình" }] }
];

describe("learning set catalog filters", () => {
  it("reads only valid grade and topic values while retaining the search text", () => {
    expect(readLearningSetCatalogFilters(new URLSearchParams("level=GRADE_1&topicId=11&q=+gia+đình+")))
      .toEqual({ grade: "GRADE_1", topicId: 11, query: "gia đình" });
    expect(readLearningSetCatalogFilters(new URLSearchParams("level=A1&topicId=0")))
      .toEqual({ grade: null, topicId: null, query: "" });
  });

  it("intersects grade and topic filters and searches titles, descriptions and related topics", () => {
    expect(filterLearningSets(sets, { grade: "GRADE_1", topicId: 11, query: "" }).map((set) => set.id)).toEqual([1]);
    expect(filterLearningSets(sets, { grade: null, topicId: 12, query: "gia đình" })).toEqual([]);
    expect(filterLearningSets(sets, { grade: null, topicId: 11, query: "QUAN HỆ" }).map((set) => set.id)).toEqual([3]);
  });
});
