import { useSearchParams } from "react-router";
import { cefrLearningLevels, introductoryLearningLevels, learningLevelLabel, unclassifiedCefrFilter } from "@vocabflow/contracts";
import { catalogGrades, readCatalogLearningFilters } from "./catalog-learning-filter-state";

export function CatalogLearningFilters({ firstWordsAvailable = false }: { firstWordsAvailable?: boolean }) {
  const [params, setParams] = useSearchParams();
  const { level, cefr } = readCatalogLearningFilters(params);
  const change = (key: string, value: string) => setParams((current) => {
    const next = new URLSearchParams(current);
    if (value) next.set(key, value); else next.delete(key);
    next.delete("page"); next.delete("q");
    return next;
  });
  return <div className="catalog-learning-filters" aria-label="Lọc nội dung học">
    <label>Lớp học<select value={level ?? ""} onChange={(event) => change("level", event.target.value)}>
      <option value="">Tất cả lớp học</option>
      {catalogGrades.map((grade) => <option key={grade} value={grade}>{grade === "GENERAL" ? "Chung" : `Lớp ${grade.slice(-1)}`}</option>)}
    </select></label>
    <label>Mức học<select value={cefr ?? ""} onChange={(event) => change("cefr", event.target.value)}>
      <option value="">Tất cả trình độ</option>
      {introductoryLearningLevels.map(({ value, label }) => <option key={value} value={value} disabled={value !== "intro-first-words" || !firstWordsAvailable}>{label}{value === "intro-first-words" && firstWordsAvailable ? "" : " — Chưa có nội dung"}</option>)}
      {cefrLearningLevels.map(({ value }) => <option key={value} value={value}>{learningLevelLabel(value)}</option>)}
      <option value={unclassifiedCefrFilter}>Chưa phân loại</option>
    </select></label>
  </div>;
}
