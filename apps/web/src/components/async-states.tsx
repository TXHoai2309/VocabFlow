import type { ReactNode } from "react";

export type LoadingPattern = "cards" | "rows" | "dashboard" | "metrics" | "metric" | "card" | "hero" | "goal" | "chart" | "detail" | "form" | "study-setup" | "study" | "search";
export type StateIcon = "book" | "bookmark" | "chart" | "folder" | "heart" | "learners" | "search" | "topic";

function StateIconGlyph({ name }: { name: StateIcon }) {
  if (name === "search") return <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></>;
  if (name === "bookmark") return <path d="M6 4h12v17l-6-4-6 4z" />;
  if (name === "heart") return <path d="M20.8 8.8c0 5-8.8 11-8.8 11s-8.8-6-8.8-11a4.7 4.7 0 0 1 8.8-2.1 4.7 4.7 0 0 1 8.8 2.1Z" />;
  if (name === "chart") return <><path d="M4 20V11M10 20V5M16 20v-8M22 20H2" /></>;
  if (name === "folder") return <path d="M3 6h7l2 2h9v11H3zM3 6V4h7l2 2" />;
  if (name === "learners") return <><circle cx="9" cy="8" r="3" /><path d="M3 20v-1a6 6 0 0 1 12 0v1M16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 5v1" /></>;
  if (name === "topic") return <><path d="m12 3 9 5-9 5-9-5zM3 12l9 5 9-5M3 16l9 5 9-5" /></>;
  return <><path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5" /></>;
}

function SkeletonShape({ pattern }: { pattern: LoadingPattern }) {
  if (pattern === "search") {
    return <div className="async-skeleton-search" aria-hidden="true">{[0, 1, 2].map((group) => <div className="async-skeleton-search-group" key={group}><i /><i /><i /></div>)}</div>;
  }
  if (pattern === "rows") {
    return <div className="async-skeleton-rows" aria-hidden="true">{Array.from({ length: 5 }, (_, index) => <div className="async-skeleton-row" key={index}><i /><span><i /><i /></span><i /></div>)}</div>;
  }
  if (pattern === "dashboard") {
    return <div className="async-skeleton-dashboard" aria-hidden="true"><div className="async-skeleton-metrics">{Array.from({ length: 4 }, (_, index) => <i key={index} />)}</div><div className="async-skeleton-panels"><i /><i /></div><div className="async-skeleton-panels"><i /><i /></div></div>;
  }
  if (pattern === "metrics") return <div className="async-skeleton-metrics" aria-hidden="true">{Array.from({ length: 4 }, (_, index) => <i key={index} />)}</div>;
  if (pattern === "metric") return <div className="async-skeleton-metric" aria-hidden="true"><i /><i /></div>;
  if (pattern === "hero") return <div className="async-skeleton-hero" aria-hidden="true"><i /><i /><i /><i /></div>;
  if (pattern === "goal") return <div className="async-skeleton-goal" aria-hidden="true"><i /><span><i /><i /><i /><i /></span></div>;
  if (pattern === "card") return <div className="async-skeleton-compact-card" aria-hidden="true"><i /><i /><i /></div>;
  if (pattern === "chart") {
    return <div className="async-skeleton-chart" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></div>;
  }
  if (pattern === "detail") {
    return <div className="async-skeleton-detail" aria-hidden="true"><div className="async-skeleton-detail-hero"><i /><span><i /><i /><i /><i /></span></div><div className="async-skeleton-detail-panels"><i /><i /><i /><i /></div></div>;
  }
  if (pattern === "form") {
    return <div className="async-skeleton-form" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>;
  }
  if (pattern === "study-setup") {
    return <div className="async-skeleton-setup" aria-hidden="true"><i /><div>{[0, 1, 2, 3].map((key) => <i key={key} />)}</div><i /><div>{[0, 1, 2].map((key) => <i key={key} />)}</div><i /><i /></div>;
  }
  if (pattern === "study") {
    return <div className="async-skeleton-study" aria-hidden="true"><i /><section><i /><i /><i /></section><div><i /><i /></div></div>;
  }
  return <div className="async-skeleton-cards" aria-hidden="true">{Array.from({ length: 6 }, (_, index) => <div className="async-skeleton-card" key={index}><i /><span><i /><i /><i /></span></div>)}</div>;
}

export function LoadingState({
  label,
  pattern,
  className = "",
  testId
}: {
  label: string;
  pattern: LoadingPattern;
  className?: string;
  testId?: string;
}) {
  return (
    <div className={`async-loading ${className}`.trim()} data-testid={testId} role="status" aria-live="polite" aria-busy="true" aria-label={label}>
      <span className="sr-only">{label}</span>
      <SkeletonShape pattern={pattern} />
    </div>
  );
}

export function EmptyState({
  icon = "book",
  title,
  description,
  action,
  className = "",
  testId
}: {
  icon?: StateIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
  testId?: string;
}) {
  return (
    <section className={`async-state async-empty ${className}`.trim()} data-testid={testId} role="status">
      <span className="async-state-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><StateIconGlyph name={icon} /></svg></span>
      <h2>{title}</h2>
      <p>{description}</p>
      {action ? <div className="async-state-actions">{action}</div> : null}
    </section>
  );
}

export function ErrorState({
  title = "Không thể tải dữ liệu",
  description = "Đã có lỗi xảy ra. Vui lòng thử lại.",
  onRetry,
  retrying = false,
  action,
  className = "",
  testId
}: {
  title?: string;
  description: string;
  onRetry?: () => void;
  retrying?: boolean;
  action?: ReactNode;
  className?: string;
  testId?: string;
}) {
  return (
    <section className={`async-state async-error ${className}`.trim()} data-testid={testId} role="alert">
      <span className="async-state-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v6m0 4h.01" /></svg></span>
      <h2>{title}</h2>
      <p>{description}</p>
      {onRetry || action ? <div className="async-state-actions">{action}{onRetry ? <button className="async-state-retry" type="button" onClick={onRetry} disabled={retrying}>{retrying ? "Đang thử lại…" : "Thử lại"}</button> : null}</div> : null}
    </section>
  );
}
