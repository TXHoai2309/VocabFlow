import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate, useLocation, useSearchParams } from "react-router";
import type { LearnerDto, LearnerVocabularyDto, VocabularyLevel } from "@vocabflow/contracts";
import { useActiveLearner } from "./learner-context-hook";
import { LearnerVocabularyClientError, requestLearnerVocabulary } from "./vocabulary-list-client";
import { VocabularyCard } from "./vocabulary-card";
import { requestSavedVocabulary, saveVocabulary, unsaveVocabulary } from "./saved-vocabulary-client";

type VocabularyListState = "loading" | "ready" | "error";
type VocabularyIconName = "home" | "book" | "level" | "search" | "clear" | "previous" | "next";

const vocabularyLevels: { value: VocabularyLevel; label: string }[] = [
  { value: "GRADE_1", label: "Lớp 1" },
  { value: "GRADE_2", label: "Lớp 2" },
  { value: "GRADE_3", label: "Lớp 3" },
  { value: "GRADE_4", label: "Lớp 4" },
  { value: "GRADE_5", label: "Lớp 5" },
  { value: "GENERAL", label: "Chung" }
];
const pageSize = 12;

function isVocabularyLevel(value: string | null): value is VocabularyLevel {
  return vocabularyLevels.some((level) => level.value === value);
}

function VocabularyIcon({ name, className }: { name: VocabularyIconName; className?: string }) {
  const paths: Record<VocabularyIconName, string> = {
    home: "m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
    book: "M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 0 4 22zM4 5.5v14A2.5 2.5 0 0 1 6.5 17H20",
    level: "M4 19V10m5 9V5m5 14v-7m5 7V3M2 21h20",
    search: "m20 20-4.4-4.4M18 10.5a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0z",
    clear: "m18 6-12 12M6 6l12 12",
    previous: "m15 18-6-6 6-6",
    next: "m9 18 6-6-6-6"
  };

  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" focusable="false">
      <path d={paths[name]} />
    </svg>
  );
}

function listErrorMessage(error: unknown) {
  if (error instanceof LearnerVocabularyClientError && (error.status === 401 || error.code === "UNAUTHORIZED")) {
    return "Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.";
  }
  if (error instanceof LearnerVocabularyClientError && (error.status === 403 || error.code === "HOUSEHOLD_ACCESS_DENIED")) {
    return "Không thể xem từ vựng của người học này.";
  }
  return "Không thể tải từ vựng lúc này. Vui lòng thử lại.";
}

export function VocabularyListPage() {
  const { activeLearner } = useActiveLearner();
  const location = useLocation();
  if (!activeLearner) {
    return <Navigate to="/learners" replace state={{ returnTo: `${location.pathname}${location.search}` }} />;
  }
  return <VocabularyListExperience key={activeLearner.id} activeLearner={activeLearner} />;
}

function VocabularyListExperience({ activeLearner }: { activeLearner: LearnerDto }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const normalizedQuery = query.trim().toLowerCase();
  const requestedLevel = searchParams.get("level");
  const level = isVocabularyLevel(requestedLevel) ? requestedLevel : "";
  const requestedPage = Number(searchParams.get("page"));
  const pageFromUrl = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const [state, setState] = useState<VocabularyListState>("loading");
  const [vocabulary, setVocabulary] = useState<LearnerVocabularyDto[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [savedVocabularyState, setSavedVocabularyState] = useState<"loading" | "ready" | "error">("loading");
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set());
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const mutationInFlight = useRef(new Set<number>());

  const loadVocabulary = useCallback(async () => {
    setState("loading");
    setVocabulary([]);
    setMessage(null);
    try {
      setVocabulary(await requestLearnerVocabulary(activeLearner.id));
      setState("ready");
    } catch (error) {
      setState("error");
      setMessage(listErrorMessage(error));
    }
  }, [activeLearner.id]);

  const loadSavedVocabulary = useCallback(async () => {
    setSavedVocabularyState("loading");
    setSavedMessage(null);
    try {
      const saved = await requestSavedVocabulary(activeLearner.id);
      setSavedIds(new Set(saved.map((item) => item.vocabulary.id)));
      setSavedVocabularyState("ready");
    } catch {
      setSavedVocabularyState("error");
    }
  }, [activeLearner.id]);

  const toggleSaved = useCallback(async (item: LearnerVocabularyDto) => {
    if (savedVocabularyState !== "ready" || mutationInFlight.current.has(item.id)) return;
    const wasSaved = savedIds.has(item.id);
    mutationInFlight.current.add(item.id);
    setSavingIds((current) => new Set(current).add(item.id));
    setSavedMessage(null);
    setSavedIds((current) => {
      const next = new Set(current);
      if (wasSaved) next.delete(item.id);
      else next.add(item.id);
      return next;
    });
    try {
      const response = wasSaved
        ? await unsaveVocabulary(activeLearner.id, item.id)
        : await saveVocabulary(activeLearner.id, item.id);
      if (response.saved === wasSaved) throw new Error("INVALID_RESPONSE");
    } catch {
      setSavedIds((current) => {
        const next = new Set(current);
        if (wasSaved) next.add(item.id);
        else next.delete(item.id);
        return next;
      });
      setSavedMessage("Không thể lưu từ. Vui lòng thử lại.");
    } finally {
      mutationInFlight.current.delete(item.id);
      setSavingIds((current) => {
        const next = new Set(current);
        next.delete(item.id);
        return next;
      });
    }
  }, [activeLearner.id, savedIds, savedVocabularyState]);

  useEffect(() => {
    let cancelled = false;
    void requestLearnerVocabulary(activeLearner.id)
      .then((response) => {
        if (cancelled) return;
        setVocabulary(response);
        setState("ready");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState("error");
        setMessage(listErrorMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, [activeLearner.id]);

  useEffect(() => {
    let cancelled = false;
    void requestSavedVocabulary(activeLearner.id)
      .then((saved) => {
        if (cancelled) return;
        setSavedIds(new Set(saved.map((item) => item.vocabulary.id)));
        setSavedVocabularyState("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setSavedVocabularyState("error");
      });
    return () => { cancelled = true; };
  }, [activeLearner.id]);

  const filteredVocabulary = vocabulary.filter((item) => {
    const matchesQuery = !normalizedQuery
      || item.word.toLowerCase().includes(normalizedQuery)
      || item.vietnamese.toLowerCase().includes(normalizedQuery);
    return matchesQuery && (!level || item.level === level);
  });
  const pageCount = Math.max(1, Math.ceil(filteredVocabulary.length / pageSize));
  const currentPage = Math.min(pageFromUrl, pageCount);
  const pageVocabulary = filteredVocabulary.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const hasFilters = Boolean(normalizedQuery || level);

  useEffect(() => {
    if (state === "ready" && searchParams.has("page") && pageFromUrl !== currentPage) {
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        if (currentPage === 1) next.delete("page");
        else next.set("page", String(currentPage));
        return next;
      }, { replace: true });
    }
  }, [currentPage, pageFromUrl, searchParams, setSearchParams, state]);

  const updateFilter = (name: "q" | "level", value: string) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (value) next.set(name, value);
      else next.delete(name);
      next.delete("page");
      return next;
    }, { replace: true });
  };

  const goToPage = (page: number) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (page <= 1) next.delete("page");
      else next.set("page", String(page));
      return next;
    }, { replace: true });
  };

  const clearQuery = () => updateFilter("q", "");
  const clearLevel = () => updateFilter("level", "");
  const visiblePageNumbers = Array.from(
    { length: Math.min(3, pageCount) },
    (_, index) => Math.max(1, Math.min(currentPage - 1, pageCount - 2)) + index
  );

  return (
    <main className="vocabulary-page" aria-labelledby="vocabulary-list-title">
      <header className="vocabulary-page-header">
        <nav className="vocabulary-breadcrumb" aria-label="Đường dẫn">
          <Link to="/" aria-label="Trang chủ"><VocabularyIcon name="home" /></Link>
          <span aria-hidden="true">›</span>
          <span aria-current="page">Từ vựng</span>
        </nav>
        <div className="vocabulary-heading-row">
          <div className="vocabulary-heading-copy">
            <h1 id="vocabulary-list-title">Từ vựng của {activeLearner.displayName}</h1>
            <p>Khám phá và ôn tập các từ vựng theo chương trình học.</p>
          </div>
          <Link className="vocabulary-topics-link" to="/topics">
            <VocabularyIcon name="book" />
            <span>Duyệt theo chủ đề</span>
            <VocabularyIcon name="next" />
          </Link>
        </div>
      </header>

      <section className="vocabulary-toolbar" aria-label="Tìm kiếm và lọc từ vựng">
        <div className="vocabulary-search-field">
          <label className="sr-only" htmlFor="vocabulary-search">Tìm từ tiếng Anh hoặc nghĩa tiếng Việt</label>
          <VocabularyIcon name="search" />
          <input
            id="vocabulary-search"
            type="search"
            value={query}
            placeholder="Tìm từ tiếng Anh hoặc nghĩa tiếng Việt..."
            onChange={(event) => updateFilter("q", event.target.value)}
            data-testid="vocabulary-search"
          />
          {query ? (
            <button className="vocabulary-search-clear" type="button" aria-label="Xóa tìm kiếm" data-testid="vocabulary-clear-search" onClick={clearQuery}>
              <VocabularyIcon name="clear" />
            </button>
          ) : null}
        </div>
        <label className="vocabulary-level-control">
          <VocabularyIcon name="level" />
          <span className="sr-only">Cấp độ</span>
          <select
            id="vocabulary-level-filter"
            aria-label="Cấp độ"
            className="vocabulary-level-select"
            data-testid="vocabulary-level-filter"
            value={level}
            onChange={(event) => updateFilter("level", event.target.value)}
          >
            <option value="">Cấp độ: Tất cả</option>
            {vocabularyLevels.map((option) => <option key={option.value} value={option.value}>Cấp độ: {option.label}</option>)}
          </select>
        </label>
      </section>

      {state === "loading" ? (
        <div className="vocabulary-list-state" data-testid="vocabulary-loading" role="status">Đang tải từ vựng…</div>
      ) : null}

      {state === "error" ? (
        <div className="vocabulary-list-state vocabulary-list-error" data-testid="vocabulary-error" role="alert">
          <p>{message}</p>
          <button className="auth-retry" type="button" onClick={() => void loadVocabulary()}>Thử lại</button>
        </div>
      ) : null}

      {savedVocabularyState === "error" ? (
        <div className="saved-vocabulary-inline-error" role="alert">
          <span>Không thể tải trạng thái từ đã lưu.</span>
          <button type="button" onClick={() => void loadSavedVocabulary()}>Thử lại</button>
        </div>
      ) : null}
      {savedMessage ? <p className="saved-vocabulary-inline-error" role="alert">{savedMessage}</p> : null}

      {state === "ready" ? (
        vocabulary.length === 0 ? (
          <div className="vocabulary-empty" data-testid="vocabulary-empty-state" role="status">
            <h2>Chưa có từ vựng</h2>
            <p>Danh sách từ vựng hiện đang trống.</p>
          </div>
        ) : filteredVocabulary.length === 0 ? (
          <div className="vocabulary-empty" data-testid="vocabulary-no-results" role="status">
            <h2>Không tìm thấy từ phù hợp</h2>
            <p>Thử từ khóa khác hoặc thay đổi bộ lọc.</p>
            <button className="vocabulary-empty-clear" type="button" data-testid="vocabulary-empty-clear" onClick={normalizedQuery ? clearQuery : clearLevel}>
              {normalizedQuery ? "Xóa tìm kiếm" : "Xóa bộ lọc"}
            </button>
          </div>
        ) : (
          <>
            <div className="vocabulary-results-row">
              <p className="vocabulary-result-count" aria-live="polite">
                <strong>{filteredVocabulary.length}</strong> {hasFilters ? "kết quả" : "từ"}
              </p>
              {pageCount > 1 ? <span className="vocabulary-page-summary">Trang {currentPage} / {pageCount}</span> : null}
            </div>
            <ul className="vocabulary-grid" data-testid="vocabulary-grid">
              {pageVocabulary.map((item) => (
                <VocabularyCard
                  key={item.id}
                  item={item}
                  isSaved={savedIds.has(item.id)}
                  isSaving={savingIds.has(item.id)}
                  bookmarkDisabled={savedVocabularyState !== "ready"}
                  onToggleSaved={() => void toggleSaved(item)}
                />
              ))}
            </ul>
            {pageCount > 1 ? (
              <nav className="vocabulary-pagination" aria-label="Phân trang từ vựng">
                <button type="button" aria-label="Trang trước" disabled={currentPage === 1} onClick={() => goToPage(currentPage - 1)}>
                  <VocabularyIcon name="previous" />
                </button>
                {currentPage > 2 ? <span aria-hidden="true" className="vocabulary-pagination-gap">…</span> : null}
                {visiblePageNumbers.map((page) => (
                  <button key={page} type="button" aria-label={`Trang ${page}`} aria-current={page === currentPage ? "page" : undefined} onClick={() => goToPage(page)}>
                    {page}
                  </button>
                ))}
                {currentPage < pageCount - 1 ? <span aria-hidden="true" className="vocabulary-pagination-gap">…</span> : null}
                <button type="button" aria-label="Trang sau" disabled={currentPage === pageCount} onClick={() => goToPage(currentPage + 1)}>
                  <VocabularyIcon name="next" />
                </button>
              </nav>
            ) : null}
          </>
        )
      ) : null}
    </main>
  );
}
