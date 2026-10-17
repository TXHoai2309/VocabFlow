import { AccountLearningState } from "./account-learning-state";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import type { LearnerDto, LearnerVocabularyBrowseItem, VocabularyBrowsePageSize, VocabularyLevel } from "@vocabflow/contracts";
import { useActiveLearner } from "./learner-context-hook";
import { LearnerVocabularyClientError, requestLearnerVocabularyBrowse } from "./vocabulary-list-client";
import { VocabularyCard } from "./vocabulary-card";
import { EmptyState, ErrorState, LoadingState } from "../../components/async-states";
import { useToast } from "../../components/toast/toast-context";
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
const pageSizes = [20, 30, 50] as const;
const defaultPageSize: VocabularyBrowsePageSize = 30;

function isVocabularyLevel(value: string | null): value is VocabularyLevel {
  return vocabularyLevels.some((level) => level.value === value);
}

function isVocabularyPageSize(value: number): value is VocabularyBrowsePageSize {
  return pageSizes.includes(value as VocabularyBrowsePageSize);
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
    return "Không thể xem từ vựng của bạn.";
  }
  return "Không thể tải từ vựng lúc này. Vui lòng thử lại.";
}

function DebouncedVocabularySearch({ query, updateFilter }: {
  query: string;
  updateFilter: (name: "q" | "level" | "cefr" | "topic" | "pageSize", value: string) => void;
}) {
  const [searchInput, setSearchInput] = useState(query);

  useEffect(() => {
    if (searchInput.trim() === query.trim()) return;
    const timer = window.setTimeout(() => updateFilter("q", searchInput), 300);
    return () => window.clearTimeout(timer);
  }, [query, searchInput, updateFilter]);

  const clearQuery = () => updateFilter("q", "");

  return (
    <div className="vocabulary-search-field">
      <label className="sr-only" htmlFor="vocabulary-search">Tìm từ tiếng Anh hoặc nghĩa tiếng Việt</label>
      <VocabularyIcon name="search" />
      <input
        id="vocabulary-search"
        type="search"
        value={searchInput}
        maxLength={100}
        placeholder="Tìm từ tiếng Anh hoặc nghĩa tiếng Việt..."
        onChange={(event) => setSearchInput(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            updateFilter("q", searchInput);
          }
        }}
        data-testid="vocabulary-search"
      />
      {searchInput ? (
        <button className="vocabulary-search-clear" type="button" aria-label="Xóa tìm kiếm" data-testid="vocabulary-clear-search" onClick={clearQuery}>
          <VocabularyIcon name="clear" />
        </button>
      ) : null}
    </div>
  );
}

export function VocabularyListPage() {
  const { activeLearner } = useActiveLearner();
  if (!activeLearner) {
    return <AccountLearningState />;
  }
  return <VocabularyListExperience key={activeLearner.id} activeLearner={activeLearner} />;
}

function VocabularyListExperience({ activeLearner }: { activeLearner: LearnerDto }) {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const normalizedQuery = query.trim();
  const requestedLevel = searchParams.get("level");
  const level = isVocabularyLevel(requestedLevel) ? requestedLevel : "";
  const cefr = searchParams.get("cefr") ?? "";
  const topic = searchParams.get("topic") ?? "";
  const requestedPage = Number(searchParams.get("page"));
  const pageFromUrl = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const requestedPageSize = Number(searchParams.get("pageSize"));
  const pageSize = isVocabularyPageSize(requestedPageSize) ? requestedPageSize : defaultPageSize;
  const [state, setState] = useState<VocabularyListState>("loading");
  const [resultKey, setResultKey] = useState<string | null>(null);
  const [vocabulary, setVocabulary] = useState<LearnerVocabularyBrowseItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [cefrOptions, setCefrOptions] = useState<string[]>([]);
  const [topicOptions, setTopicOptions] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [savedVocabularyState, setSavedVocabularyState] = useState<"loading" | "ready" | "error">("loading");
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set());
  const mutationInFlight = useRef(new Set<number>());

  const updateFilter = useCallback((name: "q" | "level" | "cefr" | "topic" | "pageSize", value: string) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      const normalizedValue = name === "q" ? value.trim() : value;
      if (normalizedValue) next.set(name, normalizedValue);
      else next.delete(name);
      next.delete("page");
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const browseRequestKey = JSON.stringify([
    activeLearner.id, pageFromUrl, pageSize, normalizedQuery, level, cefr, topic, reloadToken
  ]);

  useEffect(() => {
    const controller = new AbortController();
    const requestKey = browseRequestKey;
    void requestLearnerVocabularyBrowse(activeLearner.id, {
      page: pageFromUrl,
      pageSize,
      ...(normalizedQuery ? { q: normalizedQuery } : {}),
      ...(level ? { level } : {}),
      ...(cefr ? { cefr } : {}),
      ...(topic ? { topic } : {})
    }, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setVocabulary(result.vocabulary);
        setTotal(result.total);
        setTotalPages(result.totalPages);
        setCefrOptions(result.filters.cefrOptions);
        setTopicOptions(result.filters.topicOptions);
        setState("ready");
        setMessage(null);
        setResultKey(requestKey);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || (error instanceof Error && error.name === "AbortError")) return;
        setState("error");
        setMessage(listErrorMessage(error));
        setResultKey(requestKey);
      });
    return () => controller.abort();
  }, [activeLearner.id, browseRequestKey, cefr, level, normalizedQuery, pageFromUrl, pageSize, reloadToken, topic]);

  const loadSavedVocabulary = useCallback(async () => {
    setSavedVocabularyState("loading");
    try {
      const saved = await requestSavedVocabulary(activeLearner.id);
      setSavedIds(new Set(saved.map((item) => item.vocabulary.id)));
      setSavedVocabularyState("ready");
    } catch {
      setSavedVocabularyState("error");
    }
  }, [activeLearner.id, setSavedIds, setSavedVocabularyState]);

  const toggleSaved = useCallback(async (item: LearnerVocabularyBrowseItem) => {
    if (savedVocabularyState !== "ready" || mutationInFlight.current.has(item.id)) return;
    const wasSaved = savedIds.has(item.id);
    mutationInFlight.current.add(item.id);
    setSavingIds((current) => new Set(current).add(item.id));
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
      toast.success(wasSaved ? "Đã bỏ khỏi Yêu thích" : "Đã thêm vào Yêu thích");
    } catch {
      setSavedIds((current) => {
        const next = new Set(current);
        if (wasSaved) next.add(item.id);
        else next.delete(item.id);
        return next;
      });
      toast.error("Không thể cập nhật Yêu thích. Vui lòng thử lại.");
    } finally {
      mutationInFlight.current.delete(item.id);
      setSavingIds((current) => {
        const next = new Set(current);
        next.delete(item.id);
        return next;
      });
    }
  }, [activeLearner.id, savedIds, savedVocabularyState, setSavedIds, setSavingIds, toast]);

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

  const hasFilters = Boolean(normalizedQuery || level || cefr || topic);
  const currentPage = Math.min(pageFromUrl, totalPages);
  const visibleState = resultKey === browseRequestKey ? state : "loading";

  useEffect(() => {
    if (resultKey === browseRequestKey && state === "ready" && pageFromUrl > totalPages) {
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        if (currentPage === 1) next.delete("page");
        else next.set("page", String(currentPage));
        return next;
      }, { replace: true });
    }
  }, [browseRequestKey, currentPage, pageFromUrl, resultKey, setSearchParams, state, totalPages]);

  const goToPage = (page: number) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (page <= 1) next.delete("page");
      else next.set("page", String(page));
      return next;
    }, { replace: true });
  };

  const clearActiveFilter = () => {
    const filter = normalizedQuery ? "q" : level ? "level" : cefr ? "cefr" : "topic";
    updateFilter(filter, "");
  };
  const visiblePageNumbers = Array.from(
    { length: Math.min(3, totalPages) },
    (_, index) => Math.max(1, Math.min(currentPage - 1, totalPages - 2)) + index
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
            <h1 id="vocabulary-list-title">Từ vựng của bạn</h1>
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
        <DebouncedVocabularySearch key={query} query={query} updateFilter={updateFilter} />
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
        {cefrOptions.length > 0 ? (
          <label className="vocabulary-level-control">
            <span className="sr-only">CEFR</span>
            <select aria-label="CEFR" className="vocabulary-level-select" data-testid="vocabulary-cefr-filter" value={cefr} onChange={(event) => updateFilter("cefr", event.target.value)}>
              <option value="">CEFR: Tất cả</option>
              {cefrOptions.map((value) => <option key={value} value={value}>CEFR {value}</option>)}
            </select>
          </label>
        ) : null}
        {topicOptions.length > 0 ? (
          <label className="vocabulary-level-control">
            <span className="sr-only">Chủ đề</span>
            <select aria-label="Chủ đề" className="vocabulary-level-select" data-testid="vocabulary-topic-filter" value={topic} onChange={(event) => updateFilter("topic", event.target.value)}>
              <option value="">Chủ đề: Tất cả</option>
              {topicOptions.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
        ) : null}
      </section>

      {visibleState === "loading" ? (
        <LoadingState className="vocabulary-list-state" label="Đang tải từ vựng…" pattern="cards" testId="vocabulary-loading" />
      ) : null}

      {visibleState === "error" ? (
        <ErrorState className="vocabulary-list-state vocabulary-list-error" title="Không thể tải danh sách từ vựng" description={message ?? "Vui lòng thử lại."} onRetry={() => setReloadToken((value) => value + 1)} testId="vocabulary-error" />
      ) : null}

      {savedVocabularyState === "error" ? (
        <div className="saved-vocabulary-inline-error" role="alert">
          <span>Không thể tải trạng thái từ đã lưu.</span>
          <button type="button" onClick={() => void loadSavedVocabulary()}>Thử lại</button>
        </div>
      ) : null}

      {visibleState === "ready" ? (
        total === 0 && !hasFilters ? (
          <EmptyState className="vocabulary-empty" icon="book" title="Chưa có từ vựng" description="Danh sách từ vựng hiện đang trống." testId="vocabulary-empty-state" />
        ) : total === 0 ? (
          <EmptyState className="vocabulary-empty" icon="search" title="Không tìm thấy từ vựng" description="Thử từ khóa khác hoặc thay đổi bộ lọc." testId="vocabulary-no-results" action={<button className="vocabulary-empty-clear" type="button" data-testid="vocabulary-empty-clear" onClick={clearActiveFilter}>{normalizedQuery ? "Xóa tìm kiếm" : "Xóa bộ lọc"}</button>} />
        ) : (
          <>
            <div className="vocabulary-results-row">
              <p className="vocabulary-result-count" aria-live="polite">
                <strong>{total.toLocaleString("vi-VN")}</strong> {hasFilters ? "kết quả" : "từ"}
              </p>
              <span className="vocabulary-page-summary">Trang {currentPage} / {totalPages}</span>
            </div>
            <ul className="vocabulary-grid" data-testid="vocabulary-grid">
              {vocabulary.map((item) => (
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
            <div className="vocabulary-pagination-row">
              <label className="vocabulary-page-size-control">
                <span>Số từ mỗi trang</span>
                <select aria-label="Số từ mỗi trang" data-testid="vocabulary-page-size" value={pageSize} onChange={(event) => updateFilter("pageSize", event.target.value)}>
                  {pageSizes.map((size) => <option key={size} value={size}>{size} từ</option>)}
                </select>
              </label>
              <span className="vocabulary-range-summary" aria-live="polite">
                {((currentPage - 1) * pageSize + 1).toLocaleString("vi-VN")}–{((currentPage - 1) * pageSize + vocabulary.length).toLocaleString("vi-VN")} / {total.toLocaleString("vi-VN")}
              </span>
            {totalPages > 1 ? (
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
                {currentPage < totalPages - 1 ? <span aria-hidden="true" className="vocabulary-pagination-gap">…</span> : null}
                <button type="button" aria-label="Trang sau" disabled={currentPage === totalPages} onClick={() => goToPage(currentPage + 1)}>
                  <VocabularyIcon name="next" />
                </button>
              </nav>
            ) : null}
            </div>
          </>
        )
      ) : null}
    </main>
  );
}
