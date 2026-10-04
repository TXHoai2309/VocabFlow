import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useSearchParams } from "react-router";
import type { WeakWordsItem, WeakWordsResponse, WeakWordsStatus } from "@vocabflow/contracts";
import { usePronunciationAudio } from "../study/pronunciation-audio";
import { useActiveLearner } from "./learner-context-hook";
import { requestWeakWords, WeakWordsClientError } from "./weak-words-client";

type PageState = "loading" | "ready" | "error";
const PAGE_SIZE = 20;
const STATUS_OPTIONS: { value: WeakWordsStatus | "all"; label: string }[] = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "weak", label: "Weak" },
  { value: "learning", label: "Learning" },
  { value: "stable", label: "Stable" }
];

function statusValue(value: string | null): WeakWordsStatus | null {
  return value === "weak" || value === "learning" || value === "stable" ? value : null;
}

function pageValue(value: string | null) {
  if (!value || !/^\d+$/.test(value)) return 1;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}

function statusLabel(status: WeakWordsItem["weaknessStatus"]) {
  if (status === "WEAK") return "Weak";
  return status === "LEARNING" ? "Learning" : "Stable";
}

function dueLabel(item: WeakWordsItem) {
  if (item.dueStatus === "OVERDUE") return `Quá hạn ${Math.abs(item.daysUntilDue ?? 0)} ngày`;
  if (item.dueStatus === "DUE_TODAY") return "Đến hạn hôm nay";
  if (item.dueStatus === "UPCOMING") return `Đến hạn sau ${item.daysUntilDue} ngày`;
  return "Chưa có lịch ôn";
}

function AudioIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H3v6h3l5 4zM15.5 8.5a5 5 0 0 1 0 7m3-10a9 9 0 0 1 0 13" /></svg>;
}

function WeakWordRow({ item }: { item: WeakWordsItem }) {
  const [imageFailed, setImageFailed] = useState(false);
  const audio = usePronunciationAudio(item.vocabulary.audioUrl, item.vocabulary.word, item.vocabulary.id);
  return (
    <li className="weak-words-row-item" data-testid={`weak-word-${item.vocabulary.id}`}>
      <article className="weak-words-row">
        <Link className="weak-words-word-link" to={`/vocabulary/${item.vocabulary.id}`} aria-label={`${item.vocabulary.word}. ${item.vocabulary.vietnamese}. Xem chi tiết`}>
          <span className="weak-words-thumbnail">
            {item.vocabulary.imageUrl && !imageFailed
              ? <img src={item.vocabulary.imageUrl} alt={`Hình minh họa ${item.vocabulary.word}`} loading="lazy" onError={() => setImageFailed(true)} />
              : <span aria-hidden="true">▧</span>}
          </span>
          <span className="weak-words-main-copy">
            <strong>{item.vocabulary.word}</strong>
            {item.vocabulary.ipa ? <small>{item.vocabulary.ipa}</small> : null}
            <span>{item.vocabulary.vietnamese}</span>
            <span className="weak-words-taxonomy">
              {item.vocabulary.topic ? <span>{item.vocabulary.topic}</span> : null}
              {item.vocabulary.level ? <span>{item.vocabulary.level === "GENERAL" ? "Chung" : `Lớp ${item.vocabulary.level.slice(-1)}`}</span> : null}
            </span>
          </span>
        </Link>
        <div className="weak-words-review-signal">
          <span className={`weak-words-status is-${item.weaknessStatus.toLowerCase()}`}>{statusLabel(item.weaknessStatus)}</span>
          {item.recentAccuracy === null
            ? <span>Chưa đủ dữ liệu ôn</span>
            : <span>Độ chính xác {item.recentAccuracy}% · Quên {item.forgottenCount} trong {item.reviewCount} lượt gần đây</span>}
          <span className={`weak-words-due is-${item.dueStatus.toLowerCase()}`}>{dueLabel(item)}</span>
        </div>
        <button
          className="weak-words-audio"
          type="button"
          disabled={!audio.hasAudio || audio.state === "loading" || audio.state === "error"}
          aria-label={`Nghe phát âm ${item.vocabulary.word}`}
          aria-pressed={audio.state === "playing"}
          title={audio.hasAudio ? `Nghe phát âm ${item.vocabulary.word}` : "Chưa có âm thanh phát âm"}
          onClick={() => audio.state === "playing" ? audio.pause() : audio.play()}
        ><AudioIcon /></button>
      </article>
    </li>
  );
}

function errorMessage(error: unknown) {
  if (error instanceof WeakWordsClientError && error.status === 401) return "Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.";
  if (error instanceof WeakWordsClientError && error.status === 403) return "Không thể xem danh sách ôn tập của người học này.";
  return "Không thể tải danh sách từ cần ôn lúc này. Vui lòng thử lại.";
}

export function WeakWordsPage() {
  const { activeLearner } = useActiveLearner();
  const location = useLocation();
  if (!activeLearner) return <Navigate to="/learners" replace state={{ returnTo: `${location.pathname}${location.search}` }} />;
  return <WeakWordsExperience key={activeLearner.id} learnerId={activeLearner.id} learnerName={activeLearner.displayName} />;
}

function WeakWordsExperience({ learnerId, learnerName }: { learnerId: string; learnerName: string }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const status = statusValue(searchParams.get("status"));
  const requestedPage = pageValue(searchParams.get("page"));
  const [state, setState] = useState<PageState>("loading");
  const [completedRequestKey, setCompletedRequestKey] = useState<string | null>(null);
  const [data, setData] = useState<WeakWordsResponse | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const requestKey = JSON.stringify([query, status, requestedPage, retry]);
  const visibleState = completedRequestKey === requestKey ? state : "loading";

  useEffect(() => {
    let cancelled = false;
    void requestWeakWords(learnerId, { q: query, status, page: requestedPage, pageSize: PAGE_SIZE })
      .then((response) => {
        if (cancelled) return;
        setData(response);
        setState("ready");
        setCompletedRequestKey(requestKey);
        if (response.pagination.page !== requestedPage) {
          setSearchParams((current) => {
            const next = new URLSearchParams(current);
            if (response.pagination.page === 1) next.delete("page");
            else next.set("page", String(response.pagination.page));
            return next;
          }, { replace: true });
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setMessage(errorMessage(error));
        setState("error");
        setCompletedRequestKey(requestKey);
      });
    return () => { cancelled = true; };
  }, [learnerId, query, status, requestedPage, retry, requestKey, setSearchParams]);

  const updateFilters = (nextQuery: string, nextStatus: WeakWordsStatus | null) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (nextQuery.trim()) next.set("q", nextQuery);
      else next.delete("q");
      if (nextStatus) next.set("status", nextStatus);
      else next.delete("status");
      next.delete("page");
      return next;
    }, { replace: true });
  };

  const clearFilters = () => updateFilters("", null);
  const hasFilters = Boolean(query.trim() || status);
  const pagination = data?.pagination;

  return (
    <main className="weak-words-page" aria-labelledby="weak-words-title" data-testid="weak-words-page">
      <header className="weak-words-header">
        <div>
          <p className="weak-words-eyebrow">Tiến độ của {learnerName}</p>
          <h1 id="weak-words-title">Từ yếu / Cần ôn lại <span aria-hidden="true">◎</span></h1>
          <p>Danh sách các từ có review gần đây cần bạn chú ý. Ôn tập theo trạng thái thật của từ và lịch ôn hiện tại.</p>
        </div>
        {visibleState === "ready" && data?.summary.weakCount
          ? <Link className="weak-words-primary-action" to="/study/setup?weak=1"><span aria-hidden="true">↻</span> Ôn các từ yếu ngay ({data.summary.weakCount})</Link>
          : visibleState === "ready" && data?.summary.dueCount
            ? <Link className="weak-words-primary-action" to="/study/setup?content=review"><span aria-hidden="true">↻</span> Ôn các từ đến hạn ({data.summary.dueCount})</Link>
            : visibleState === "ready" && data
              ? <button className="weak-words-primary-action" type="button" disabled><span aria-hidden="true">✓</span> Không có từ cần ôn ngay</button>
              : <button className="weak-words-primary-action" type="button" disabled><span aria-hidden="true">↻</span> Ôn các từ yếu ngay</button>}
      </header>

      {visibleState === "loading" ? <div className="weak-words-state" role="status" aria-busy="true">Đang tải tiến trình ôn tập…</div> : null}
      {visibleState === "error" ? (
        <div className="weak-words-state is-error" role="alert">
          <p>{message}</p>
          <button type="button" onClick={() => setRetry((value) => value + 1)}>Thử lại</button>
        </div>
      ) : null}

      {visibleState === "ready" && data ? (
        <>
          <section className="weak-words-summary" aria-label="Tóm tắt tiến trình ôn tập">
            <article className="weak-words-summary-card">
              <span className="weak-words-summary-icon is-red" aria-hidden="true">▥</span>
              <div><h2>Từ yếu</h2><strong data-testid="weak-words-count">{data.summary.weakCount}</strong><p>Từ có bằng chứng ôn tập yếu</p></div>
            </article>
            <article className="weak-words-summary-card">
              <span className="weak-words-summary-icon is-amber" aria-hidden="true">◷</span>
              <div><h2>Đến hạn ôn</h2><strong data-testid="weak-words-due-count">{data.summary.dueCount}</strong><p>Từ đang đến hạn hoặc quá hạn</p></div>
            </article>
            <article className="weak-words-summary-card">
              <span className="weak-words-summary-icon is-purple" aria-hidden="true">◎</span>
              <div>
                <h2>Độ chính xác gần đây</h2>
                <strong data-testid="weak-words-recent-accuracy">{data.summary.recentAccuracy === null ? "Chưa đủ dữ liệu" : `${data.summary.recentAccuracy}%`}</strong>
                <p>{data.summary.recentReviewCount} lượt ôn trong 30 ngày</p>
              </div>
            </article>
          </section>

          {data.summary.weakCount === 0 && data.summary.dueCount === 0
            ? <p className="weak-words-positive-note" role="status">✓ Không có từ cần ôn ngay.</p>
            : null}

          <section className="weak-words-controls" aria-label="Tìm kiếm và lọc từ">
            <label className="weak-words-search">
              <span aria-hidden="true">⌕</span>
              <span className="sr-only">Tìm theo từ tiếng Anh hoặc nghĩa tiếng Việt</span>
              <input type="search" value={query} placeholder="Tìm từ tiếng Anh hoặc nghĩa tiếng Việt…" onChange={(event) => updateFilters(event.target.value, status)} />
            </label>
            <label className="weak-words-filter">
              <span className="sr-only">Lọc theo trạng thái</span>
              <select aria-label="Lọc theo trạng thái" value={status ?? "all"} onChange={(event) => updateFilters(query, event.target.value === "all" ? null : event.target.value as WeakWordsStatus)}>
                {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
          </section>

          {data.items.length > 0 ? (
            <>
              <p className="weak-words-result-count" aria-live="polite"><strong>{data.pagination.totalItems}</strong> từ trong danh sách</p>
              <ul className="weak-words-list" aria-label="Danh sách từ cần chú ý">
                {data.items.map((item) => <WeakWordRow key={item.vocabulary.id} item={item} />)}
              </ul>
              {pagination && pagination.totalPages > 1 ? (
                <nav className="weak-words-pagination" aria-label="Phân trang danh sách từ">
                  <button type="button" disabled={pagination.page <= 1} onClick={() => setSearchParams((current) => { const next = new URLSearchParams(current); next.set("page", String(pagination.page - 1)); return next; }, { replace: true })}>Trang trước</button>
                  <span aria-live="polite">Trang {pagination.page} / {pagination.totalPages}</span>
                  <button type="button" disabled={pagination.page >= pagination.totalPages} onClick={() => setSearchParams((current) => { const next = new URLSearchParams(current); next.set("page", String(pagination.page + 1)); return next; }, { replace: true })}>Trang sau</button>
                </nav>
              ) : null}
            </>
          ) : hasFilters ? (
            <section className="weak-words-empty" role="status">
              <h2>Không tìm thấy từ phù hợp</h2>
              <button className="weak-words-secondary-action" type="button" onClick={clearFilters}>Xóa bộ lọc</button>
            </section>
          ) : (
            <section className="weak-words-empty" role="status">
              <h2>Chưa có từ nào cần chú ý</h2>
              <p>Học và ôn từ trong các bộ đang hoạt động; trạng thái sẽ xuất hiện tại đây khi có dữ liệu.</p>
              <Link className="weak-words-secondary-action" to="/vocabulary">Khám phá từ vựng</Link>
            </section>
          )}
        </>
      ) : null}
    </main>
  );
}
