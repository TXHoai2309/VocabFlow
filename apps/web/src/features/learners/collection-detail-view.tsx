import { useState } from "react";
import { Link } from "react-router";
import type { VocabularyLevel } from "@vocabflow/contracts";
import { VocabularyCard, type VocabularyCardItem } from "./vocabulary-card";
import { EmptyState } from "../../components/async-states";
import { getPrimaryVietnameseMeaning } from "../vocabulary/vocabulary-presentation";

export type CollectionKind = "topic" | "learning-set";

type CollectionDetailViewProps = {
  kind: CollectionKind;
  title: string;
  description: string;
  level: VocabularyLevel | null;
  items: VocabularyCardItem[];
  learnedCount: number;
  progressTotal: number;
  masteredCount: number;
  studyHref: string;
  studyReady: boolean;
  directStudyScope?: boolean;
  assignmentHref?: string;
};

type CollectionIconName = "topic" | "book" | "info" | "count" | "level" | "folder" | "play" | "search";

function CollectionIcon({ name }: { name: CollectionIconName }) {
  const paths: Record<CollectionIconName, string> = {
    topic: "M4 6h6l2 2h8v11H4zM4 6V4h6l2 2",
    book: "M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 0 4 22zM4 5.5v14A2.5 2.5 0 0 1 6.5 17H20",
    info: "M12 16v-4m0-4h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0z",
    count: "M4 5h16v14H4zM8 9h8M8 13h5",
    level: "M4 19V10m5 9V5m5 14v-7m5 7V3M2 21h20",
    folder: "M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 8h18",
    play: "m8 5 12 7-12 7z",
    search: "m20 20-4.4-4.4M18 10.5a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0z"
  };

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill={name === "play" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" focusable="false">
      <path d={paths[name]} />
    </svg>
  );
}

function gradeLabel(grade: VocabularyLevel) {
  return grade === "GENERAL" ? "Chung" : `Lớp ${grade.slice(-1)}`;
}

export function CollectionDetailView({
  kind,
  title,
  description,
  level,
  items,
  learnedCount,
  progressTotal,
  masteredCount,
  studyHref,
  studyReady,
  directStudyScope = false,
  assignmentHref
}: CollectionDetailViewProps) {
  const [query, setQuery] = useState("");
  const trimmedQuery = query.trim().toLowerCase();
  const matchingItems = items.filter((item) => !trimmedQuery
    || item.word.toLowerCase().includes(trimmedQuery)
    || getPrimaryVietnameseMeaning(item).toLowerCase().includes(trimmedQuery));
  const typeLabel = kind === "topic" ? "Chủ đề" : "Bộ từ";
  const collectionPath = kind === "topic" ? "/topics" : "/learning-sets";
  const total = Math.max(0, progressTotal);
  const learned = Math.min(Math.max(0, learnedCount), total);
  const percent = total === 0 ? 0 : Math.round((learned / total) * 100);
  const unlearned = total - learned;
  const complete = total > 0 && masteredCount === total;
  const canStudy = studyReady && items.length > 0;
  const actionHref = canStudy ? studyHref : assignmentHref;
  const actionLabel = !items.length
    ? "Chưa có từ để học"
    : !studyReady
      ? kind === "learning-set" ? "Thêm bộ từ vào học tập" : "Chọn bộ từ để bắt đầu"
      : complete
        ? "Ôn tập lại"
        : learned > 0
          ? "Tiếp tục học"
          : kind === "learning-set" ? "Học bộ này" : "Học chủ đề này";

  return (
    <main className="collection-detail-page" aria-labelledby="collection-detail-title">
      <nav className="collection-detail-breadcrumb" aria-label="Đường dẫn">
        <Link to="/" aria-label="Trang chủ">Trang chủ</Link>
        <span aria-hidden="true">›</span>
        <Link to={collectionPath}>{typeLabel}</Link>
        <span aria-hidden="true">›</span>
        <span aria-current="page">{title}</span>
      </nav>

      <div className="collection-detail-layout">
        <div className="collection-detail-main">
          <header className={`collection-detail-hero collection-detail-hero-${kind}`} data-testid="collection-detail-hero">
            <div className="collection-detail-hero-copy">
              <span className="collection-detail-type">{typeLabel}</span>
              <h1 id="collection-detail-title">{title}</h1>
              <p>{description}</p>
              <div className="collection-detail-badges">
                <span className="collection-detail-badge collection-detail-count">{items.length} từ</span>
                {level ? <span className="collection-detail-badge collection-detail-level">{gradeLabel(level)}</span> : null}
              </div>
            </div>
            <div className="collection-detail-hero-mark" aria-hidden="true">
              <CollectionIcon name={kind === "topic" ? "topic" : "book"} />
            </div>
          </header>

          <section className="collection-vocabulary-section" aria-labelledby="collection-vocabulary-title">
            <div className="collection-vocabulary-heading">
              <div>
                <h2 id="collection-vocabulary-title">Từ vựng trong {kind === "topic" ? "chủ đề" : "bộ này"}</h2>
                <p>{items.length} từ theo thứ tự nội dung</p>
              </div>
              {items.length > 0 ? (
                <div className="collection-vocabulary-search">
                  <CollectionIcon name="search" />
                  <label className="sr-only" htmlFor="collection-vocabulary-search">Tìm từ trong {kind === "topic" ? "chủ đề" : "bộ từ"}</label>
                  <input
                    id="collection-vocabulary-search"
                    type="search"
                    placeholder={`Tìm trong ${kind === "topic" ? "chủ đề" : "bộ từ"} này…`}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </div>
              ) : null}
            </div>

            {items.length === 0 ? (
              <EmptyState className="collection-detail-empty" icon="book" title="Chưa có từ vựng trong nội dung này." description="Nội dung sẽ xuất hiện tại đây khi có từ đang bật." testId="collection-detail-empty" />
            ) : matchingItems.length === 0 ? (
              <EmptyState className="collection-detail-empty" icon="search" title="Không tìm thấy từ phù hợp" description="Thử từ khóa tiếng Anh hoặc nghĩa tiếng Việt khác." action={<button type="button" className="button secondary" onClick={() => setQuery("")}>Xóa tìm kiếm</button>} testId="collection-detail-no-results" />
            ) : (
              <ul className="vocabulary-grid" data-testid="collection-vocabulary-list">
                {matchingItems.map((item) => <VocabularyCard key={item.id} item={item} showStatus />)}
              </ul>
            )}
          </section>
        </div>

        <aside className="collection-detail-aside" aria-label={`Thông tin ${typeLabel.toLowerCase()}`}>
          <section className="collection-detail-card" aria-labelledby="collection-info-title">
            <h2 id="collection-info-title"><CollectionIcon name="info" />Thông tin {typeLabel.toLowerCase()}</h2>
            <dl className="collection-detail-facts">
              <div><dt><CollectionIcon name="count" />Số lượng từ</dt><dd>{items.length} từ</dd></div>
              {level ? <div><dt><CollectionIcon name="level" />Cấp độ</dt><dd>{gradeLabel(level)}</dd></div> : null}
              <div><dt><CollectionIcon name="folder" />Danh mục</dt><dd>{typeLabel}</dd></div>
              <div className="collection-detail-description"><dt>Mô tả</dt><dd>{description}</dd></div>
            </dl>
          </section>

          <section className="collection-detail-card collection-detail-progress" aria-labelledby="collection-progress-title">
            <h2 id="collection-progress-title"><CollectionIcon name="level" />Tiến trình học</h2>
            <div className="collection-progress-row"><span>Đã học</span><strong>{learned} từ <small>({percent}%)</small></strong></div>
            <div className="collection-progress-row"><span>Chưa học</span><strong>{unlearned} từ <small>({100 - percent}%)</small></strong></div>
            <div className="collection-progress-track" role="progressbar" aria-label={`Tiến độ học ${title}`} aria-valuemin={0} aria-valuemax={Math.max(total, 1)} aria-valuenow={learned} aria-valuetext={`${learned} / ${total} từ, ${percent}%`}>
              <span style={{ width: `${percent}%` }} />
            </div>
            {kind === "topic" ? <p className="collection-progress-note">{directStudyScope ? "Tiến độ tính trên các từ V2 thuộc chủ đề này." : "Tiến độ tính trên từ thuộc các bộ học tập của bạn."}</p> : null}
          </section>

          <section className="collection-detail-card collection-detail-action-card" aria-labelledby="collection-action-title">
            <h2 id="collection-action-title"><CollectionIcon name="play" />Học {kind === "topic" ? "chủ đề" : "bộ từ"} này</h2>
            <p>{canStudy ? complete ? "Bạn đã hoàn thành nội dung này." : "Tiến trình được lưu theo từng từ." : items.length === 0 ? "Chưa có nội dung để bắt đầu." : kind === "learning-set" ? "Thêm bộ từ vào học tập để mở phiên học." : "Chưa có từ thuộc các bộ học tập của bạn."}</p>
            {actionHref ? (
              <Link className="collection-detail-study-button" to={actionHref}><CollectionIcon name="play" />{actionLabel}</Link>
            ) : (
              <button className="collection-detail-study-button" type="button" disabled><CollectionIcon name="play" />{actionLabel}</button>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}
