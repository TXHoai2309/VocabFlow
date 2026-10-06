import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { GlobalSearchResponse, GlobalSearchResult } from "@vocabflow/contracts";
import { requestGlobalSearch } from "./global-search-client";
import {
  clearPersistedRecentSearches,
  readRecentSearches
} from "./recent-searches";
import { EmptyState, ErrorState, LoadingState } from "../../components/async-states";

type SearchPhase = "EMPTY_QUERY" | "LOADING" | "READY" | "NO_RESULTS" | "ERROR";
type SearchResult = GlobalSearchResponse["vocabulary"][number]
  | GlobalSearchResponse["topics"][number]
  | GlobalSearchResponse["learningSets"][number];
type SearchGroup =
  | { type: "VOCABULARY"; label: string; results: GlobalSearchResponse["vocabulary"] }
  | { type: "TOPIC"; label: string; results: GlobalSearchResponse["topics"] }
  | { type: "LEARNING_SET"; label: string; results: GlobalSearchResponse["learningSets"] };

const emptyResponse: GlobalSearchResponse = { query: "", vocabulary: [], topics: [], learningSets: [] };

function SearchGlyph() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></svg>;
}

function CloseGlyph() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="m6 6 12 12M18 6 6 18" /></svg>;
}

function EntityGlyph({ type }: { type: SearchResult["type"] }) {
  if (type === "VOCABULARY") return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5" /></svg>;
  if (type === "TOPIC") return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 11 12 4l8 7v9H4zM9 20v-6h6v6" /></svg>;
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7.5h7l2 2h9v10H3zM3 7V5h7l2 2" /></svg>;
}

function resultLabel(type: SearchResult["type"]) {
  if (type === "VOCABULARY") return "Từ vựng";
  if (type === "TOPIC") return "Chủ đề";
  return "Bộ từ";
}

function resultSubtitle(result: SearchResult) {
  if (result.type === "VOCABULARY") return result.subtitle;
  if (result.type === "TOPIC") return result.description;
  const gradeLabel = result.grade === "GENERAL" ? "Chung" : result.grade?.replace("GRADE_", "Lớp ");
  const parts = [result.description, `${result.vocabularyCount} từ`, gradeLabel];
  return parts.filter(Boolean).join(" · ");
}

export function GlobalSearchPalette({
  learnerId,
  onClose,
  onSelect
}: {
  learnerId: string | null;
  onClose: () => void;
  onSelect: (result: GlobalSearchResult, query: string) => void;
}) {
  const dialogId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const requestSequence = useRef(0);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GlobalSearchResponse>(emptyResponse);
  const [settledQuery, setSettledQuery] = useState("");
  const [phase, setPhase] = useState<SearchPhase>("EMPTY_QUERY");
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>(readRecentSearches);
  const [retryCount, setRetryCount] = useState(0);
  const normalizedQuery = query.trim().normalize("NFC");

  const groupedResults = useMemo<SearchGroup[]>(() => [
    { type: "VOCABULARY" as const, label: "Từ vựng", results: results.vocabulary },
    { type: "TOPIC" as const, label: "Chủ đề", results: results.topics },
    { type: "LEARNING_SET" as const, label: "Bộ từ", results: results.learningSets }
  ].filter((group) => group.results.length > 0), [results]);
  const flatResults = useMemo(() => groupedResults.reduce<SearchResult[]>((all, group) => {
    all.push(...group.results);
    return all;
  }, []), [groupedResults]);
  const currentPhase: SearchPhase = !normalizedQuery
    ? "EMPTY_QUERY"
    : !learnerId
      ? "ERROR"
    : settledQuery !== normalizedQuery
      ? "LOADING"
      : phase;

  useEffect(() => {
    inputRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    if (!normalizedQuery || !learnerId) return;

    const sequence = ++requestSequence.current;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void requestGlobalSearch(learnerId, normalizedQuery, controller.signal).then((response) => {
        if (controller.signal.aborted || sequence !== requestSequence.current) return;
        setResults(response);
        setSettledQuery(normalizedQuery);
        const hasResults = response.vocabulary.length + response.topics.length + response.learningSets.length > 0;
        setPhase(hasResults ? "READY" : "NO_RESULTS");
        setActiveIndex(hasResults ? 0 : -1);
      }).catch(() => {
        if (controller.signal.aborted || sequence !== requestSequence.current) return;
        setResults(emptyResponse);
        setSettledQuery(normalizedQuery);
        setPhase("ERROR");
      });
    }, 200);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [learnerId, normalizedQuery, retryCount]);

  useEffect(() => {
    if (activeIndex < 0) return;
    dialogRef.current?.querySelector<HTMLElement>(`[data-result-index="${activeIndex}"]`)?.scrollIntoView?.({ block: "nearest" });
  }, [activeIndex]);

  const selectResult = (result: GlobalSearchResult) => onSelect(result, normalizedQuery);

  function onDialogKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (currentPhase === "READY" && event.key === "ArrowDown" && flatResults.length > 0) {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % flatResults.length);
      return;
    }
    if (currentPhase === "READY" && event.key === "ArrowUp" && flatResults.length > 0) {
      event.preventDefault();
      setActiveIndex((current) => (current <= 0 ? flatResults.length - 1 : current - 1));
      return;
    }
    if (currentPhase === "READY" && event.key === "Enter" && activeIndex >= 0 && flatResults[activeIndex]) {
      event.preventDefault();
      selectResult(flatResults[activeIndex]!);
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>("input:not([disabled]), button:not([disabled])");
    if (!focusable?.length) return;
    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  const groupIds = new Map(groupedResults.map((group) => [group.type, `${dialogId}-${group.type.toLowerCase()}`]));
  const activeResultId = currentPhase !== "READY" || activeIndex < 0 ? undefined : `${dialogId}-result-${activeIndex}`;

  return (
    <div className="global-search-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div
        ref={dialogRef}
        id="global-search-dialog"
        className="global-search-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${dialogId}-title`}
        onKeyDown={onDialogKeyDown}
      >
        <div className="global-search-dialog-head">
          <h2 id={`${dialogId}-title`}>Tìm kiếm toàn cục</h2>
          <button className="global-search-close" type="button" aria-label="Đóng tìm kiếm" onClick={onClose}><CloseGlyph /></button>
        </div>
        <div className="global-search-input-wrap">
          <SearchGlyph />
          <input
            ref={inputRef}
            type="search"
            value={query}
            aria-label="Tìm từ vựng, chủ đề hoặc bộ từ"
            aria-autocomplete="list"
            aria-controls={currentPhase === "READY" ? `${dialogId}-results` : undefined}
            aria-activedescendant={activeResultId}
            placeholder="Tìm từ vựng, chủ đề hoặc bộ từ..."
            onChange={(event) => setQuery(event.target.value)}
          />
          {query ? <button className="global-search-clear" type="button" aria-label="Xóa nội dung tìm kiếm" onClick={() => { setQuery(""); inputRef.current?.focus(); }}><CloseGlyph /></button> : null}
        </div>

        {currentPhase === "EMPTY_QUERY" ? (
          <section className="global-search-recents" aria-labelledby={`${dialogId}-recent-heading`}>
            <div className="global-search-section-heading">
              <h3 id={`${dialogId}-recent-heading`}>Tìm kiếm gần đây</h3>
              {recentSearches.length > 0 ? <button type="button" onClick={() => { clearPersistedRecentSearches(); setRecentSearches([]); }}>Xóa tất cả</button> : null}
            </div>
            {recentSearches.length > 0 ? (
              <div className="global-search-recent-list">
                {recentSearches.map((recent) => <button type="button" className="global-search-recent" key={recent} onClick={() => { setQuery(recent); setActiveIndex(-1); }}><span aria-hidden="true">◷</span>{recent}</button>)}
              </div>
            ) : <p className="global-search-hint">Bắt đầu nhập để tìm từ vựng, chủ đề hoặc bộ từ.</p>}
          </section>
        ) : null}

        {currentPhase === "LOADING" ? <LoadingState className="global-search-async-state" label="Đang tìm kiếm…" pattern="search" /> : null}
        {currentPhase === "NO_RESULTS" ? <EmptyState className="global-search-async-state" icon="search" title="Không tìm thấy kết quả" description="Thử từ khóa khác hoặc kiểm tra chính tả." /> : null}
        {currentPhase === "ERROR" ? <ErrorState className="global-search-async-state" title="Không thể tải kết quả" description="Không thể tải kết quả tìm kiếm. Vui lòng thử lại." onRetry={() => setRetryCount((count) => count + 1)} /> : null}

        {currentPhase === "READY" ? (
          <div className="global-search-results" id={`${dialogId}-results`} role="listbox" aria-label={`Kết quả tìm kiếm: ${normalizedQuery}`}>
            {groupedResults.map((group) => (
              <section className="global-search-group" key={group.type} role="group" aria-labelledby={groupIds.get(group.type)}>
                <div className="global-search-section-heading">
                  <h3 id={groupIds.get(group.type)}>{group.label} <span>({group.results.length})</span></h3>
                </div>
                {group.results.map((result) => {
                  const index = flatResults.indexOf(result);
                  const selected = index === activeIndex;
                  return (
                    <button
                      id={`${dialogId}-result-${index}`}
                      data-result-index={index}
                      className={`global-search-result${selected ? " is-active" : ""}`}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      key={`${result.type}-${result.id}`}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => selectResult(result)}
                    >
                      {result.type === "VOCABULARY" && result.imageUrl
                        ? <img className="global-search-result-image" src={result.imageUrl} alt="" loading="lazy" />
                        : <span className={`global-search-result-icon is-${result.type.toLowerCase()}`}><EntityGlyph type={result.type} /></span>}
                      <span className="global-search-result-copy"><strong>{result.title}</strong><small>{resultSubtitle(result)}</small></span>
                      <span className="global-search-result-kind">{resultLabel(result.type)}</span>
                      <span className="global-search-result-chevron" aria-hidden="true">›</span>
                    </button>
                  );
                })}
              </section>
            ))}
          </div>
        ) : null}

        <div className="global-search-keyboard-hint" aria-hidden="true">
          <span><kbd>Enter</kbd> để mở</span><span><kbd>↑</kbd><kbd>↓</kbd> để di chuyển</span><span><kbd>Esc</kbd> để đóng</span>
        </div>
        {!learnerId ? <p className="global-search-learner-hint">Chọn người học trước khi tìm kiếm.</p> : null}
      </div>
    </div>
  );
}
