import { AccountLearningState } from "./account-learning-state";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import type { LearnerDto, LearnerSavedVocabularyDto, VocabularyLevel } from "@vocabflow/contracts";
import { useActiveLearner } from "./learner-context-hook";
import { VocabularyCard } from "./vocabulary-card";
import { EmptyState, ErrorState, LoadingState } from "../../components/async-states";
import { useToast } from "../../components/toast/toast-context";
import { requestSavedVocabulary, unsaveVocabulary } from "./saved-vocabulary-client";

type PageState = "loading" | "ready" | "error";

const levelOptions: { value: VocabularyLevel; label: string }[] = [
  { value: "GRADE_1", label: "Lớp 1" },
  { value: "GRADE_2", label: "Lớp 2" },
  { value: "GRADE_3", label: "Lớp 3" },
  { value: "GRADE_4", label: "Lớp 4" },
  { value: "GRADE_5", label: "Lớp 5" },
  { value: "GENERAL", label: "Chung" }
];

function isVocabularyLevel(value: string): value is VocabularyLevel {
  return levelOptions.some((option) => option.value === value);
}

function savedErrorMessage(error: unknown) {
  if (error instanceof Error && "status" in error) {
    const status = (error as { status?: unknown }).status;
    if (status === 401) return "Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.";
    if (status === 403) return "Không thể xem từ đã lưu của bạn.";
  }
  return "Không thể tải từ đã lưu lúc này. Vui lòng thử lại.";
}

export function SavedWordsPage() {
  const { activeLearner } = useActiveLearner();
  if (!activeLearner) {
    return <AccountLearningState />;
  }
  return <SavedWordsExperience key={activeLearner.id} activeLearner={activeLearner} />;
}

function SavedWordsExperience({ activeLearner }: { activeLearner: LearnerDto }) {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const requestedLevel = searchParams.get("level") ?? "";
  const level = isVocabularyLevel(requestedLevel) ? requestedLevel : "";
  const topic = searchParams.get("topic") ?? "";
  const [state, setState] = useState<PageState>("loading");
  const [savedVocabulary, setSavedVocabulary] = useState<LearnerSavedVocabularyDto[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set());
  const mutationInFlight = useRef(new Set<number>());

  const loadSavedVocabulary = useCallback(async () => {
    setState("loading");
    setMessage(null);
    try {
      setSavedVocabulary(await requestSavedVocabulary(activeLearner.id));
      setState("ready");
    } catch (error) {
      setState("error");
      setMessage(savedErrorMessage(error));
    }
  }, [activeLearner.id]);

  useEffect(() => {
    let cancelled = false;
    void requestSavedVocabulary(activeLearner.id)
      .then((saved) => {
        if (cancelled) return;
        setSavedVocabulary(saved);
        setState("ready");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setMessage(savedErrorMessage(error));
        setState("error");
      });
    return () => { cancelled = true; };
  }, [activeLearner.id]);

  const topics = useMemo(() => [...new Set(savedVocabulary
    .map((entry) => entry.vocabulary.topic?.trim())
    .filter((value): value is string => Boolean(value)))].sort((left, right) => left.localeCompare(right, "vi")), [savedVocabulary]);
  const availableLevels = levelOptions.filter((option) => savedVocabulary.some((entry) => entry.vocabulary.level === option.value));
  const filteredVocabulary = savedVocabulary.filter(({ vocabulary }) => {
    const matchesQuery = !normalizedQuery
      || vocabulary.word.toLocaleLowerCase().includes(normalizedQuery)
      || vocabulary.vietnamese.toLocaleLowerCase().includes(normalizedQuery);
    return matchesQuery && (!level || vocabulary.level === level) && (!topic || vocabulary.topic?.trim() === topic);
  });
  const hasFilters = Boolean(normalizedQuery || level || topic);

  const updateFilter = (name: "q" | "level" | "topic", value: string) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (value) next.set(name, value);
      else next.delete(name);
      return next;
    }, { replace: true });
  };

  const clearFilters = () => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete("q");
      next.delete("level");
      next.delete("topic");
      return next;
    }, { replace: true });
  };

  const removeSaved = useCallback(async (entry: LearnerSavedVocabularyDto) => {
    const vocabularyId = entry.vocabulary.id;
    if (mutationInFlight.current.has(vocabularyId)) return;
    mutationInFlight.current.add(vocabularyId);
    setSavingIds((current) => new Set(current).add(vocabularyId));
    setMessage(null);
    setSavedVocabulary((current) => current.filter((item) => item.vocabulary.id !== vocabularyId));
    try {
      const response = await unsaveVocabulary(activeLearner.id, vocabularyId);
      if (response.saved) throw new Error("INVALID_RESPONSE");
      toast.success("Đã bỏ khỏi Yêu thích");
    } catch {
      setSavedVocabulary((current) => current.some((item) => item.vocabulary.id === vocabularyId)
        ? current
        : [...current, entry].sort((left, right) => right.savedAt.localeCompare(left.savedAt)));
      toast.error("Không thể cập nhật Yêu thích. Vui lòng thử lại.");
    } finally {
      mutationInFlight.current.delete(vocabularyId);
      setSavingIds((current) => {
        const next = new Set(current);
        next.delete(vocabularyId);
        return next;
      });
    }
  }, [activeLearner.id, toast]);

  return (
    <main className="saved-words-page" aria-labelledby="saved-words-title">
      <header className="saved-words-header">
        <div className="saved-words-heading">
          <div>
            <h1 id="saved-words-title">Từ đã lưu</h1>
            <p>Những từ bạn đã lưu để ôn tập sau.</p>
          </div>
          {state === "ready" && savedVocabulary.length > 0 ? <span className="saved-words-total">{savedVocabulary.length} từ</span> : null}
        </div>
        {state === "ready" && savedVocabulary.length > 0 ? (
          <Link className="saved-words-study-button" to="/study/setup?saved=1&content=all">
            <span aria-hidden="true">▶</span> Học tất cả từ đã lưu ({savedVocabulary.length})
          </Link>
        ) : null}
      </header>

      {state === "loading" ? <LoadingState className="saved-words-state" label="Đang tải từ đã lưu…" pattern="rows" /> : null}
      {state === "error" ? (
        <ErrorState className="saved-words-state saved-words-error" title="Không thể tải từ đã lưu" description={message ?? "Vui lòng thử lại."} onRetry={() => void loadSavedVocabulary()} />
      ) : null}
      {state === "ready" && savedVocabulary.length === 0 ? (
        <EmptyState className="saved-words-empty" icon="bookmark" title="Chưa có từ yêu thích" description="Hãy lưu những từ bạn muốn học lại sau." action={<Link className="saved-words-empty-link" to="/vocabulary">Khám phá từ vựng</Link>} />
      ) : null}

      {state === "ready" && savedVocabulary.length > 0 ? (
        <>
          <section className="saved-words-filters" aria-label="Tìm kiếm và lọc từ đã lưu">
            <label className="saved-words-search">
              <span className="sr-only">Tìm trong từ đã lưu</span>
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                value={query}
                placeholder="Tìm trong từ đã lưu..."
                onChange={(event) => updateFilter("q", event.target.value)}
                data-testid="saved-words-search"
              />
            </label>
            <label className="saved-words-select-label">
              <span className="sr-only">Cấp độ</span>
              <select aria-label="Cấp độ" value={level} onChange={(event) => updateFilter("level", event.target.value)} data-testid="saved-words-level">
                <option value="">Tất cả cấp độ</option>
                {availableLevels.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="saved-words-select-label">
              <span className="sr-only">Chủ đề</span>
              <select aria-label="Chủ đề" value={topic} onChange={(event) => updateFilter("topic", event.target.value)} data-testid="saved-words-topic">
                <option value="">Tất cả chủ đề</option>
                {topics.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
          </section>

          {filteredVocabulary.length === 0 ? (
            <EmptyState className="saved-words-empty saved-words-no-results" icon="search" title="Không tìm thấy từ phù hợp" description="Thử thay đổi từ khóa hoặc bộ lọc." action={<button className="saved-words-empty-link" type="button" onClick={clearFilters}>Xóa bộ lọc</button>} />
          ) : (
            <>
              <p className="saved-words-result-count" aria-live="polite"><strong>{filteredVocabulary.length}</strong> {hasFilters ? "kết quả" : "từ đã lưu"}</p>
              <ul className="saved-vocabulary-list">
                {filteredVocabulary.map((entry) => (
                  <VocabularyCard
                    key={entry.vocabulary.id}
                    item={entry.vocabulary}
                    variant="row"
                    showTopic
                    isSaved
                    isSaving={savingIds.has(entry.vocabulary.id)}
                    savedAt={entry.savedAt}
                    onToggleSaved={() => void removeSaved(entry)}
                  />
                ))}
              </ul>
            </>
          )}
        </>
      ) : null}
    </main>
  );
}
