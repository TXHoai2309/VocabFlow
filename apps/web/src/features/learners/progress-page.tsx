import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router";
import type {
  ActivitySummaryResponse,
  LearnerDto,
  ProgressHistoryResponse,
  ProgressSummaryResponse,
  TopicProgressResponse,
  VocabularyLevel
} from "@vocabflow/contracts";
import { useActiveLearner } from "./learner-context-hook";
import { ProgressSummaryClientError, requestProgressSummary } from "./progress-summary-client";
import { ActivitySummaryClientError, requestActivitySummary } from "./activity-summary-client";
import { requestProgressHistory, requestTopicProgress } from "./progress-insights-client";
import { requestResetLearnerProgress, ResetLearnerProgressClientError } from "./reset-progress-client";
import { EmptyState, ErrorState, LoadingState } from "../../components/async-states";
import { useToast } from "../../components/toast/toast-context";

type LoadState = "loading" | "ready" | "error";
type ProgressPeriod = "7d" | "30d";

const LEVEL_ORDER: Record<VocabularyLevel, number> = {
  GRADE_1: 1,
  GRADE_2: 2,
  GRADE_3: 3,
  GRADE_4: 4,
  GRADE_5: 5,
  GENERAL: 6
};

const LEVEL_LABELS: Record<VocabularyLevel, string> = {
  GRADE_1: "Lớp 1",
  GRADE_2: "Lớp 2",
  GRADE_3: "Lớp 3",
  GRADE_4: "Lớp 4",
  GRADE_5: "Lớp 5",
  GENERAL: "Chung"
};

function periodFromSearch(searchParams: URLSearchParams): ProgressPeriod {
  return searchParams.get("period") === "30d" ? "30d" : "7d";
}

function dateMinus(value: string, days: number): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day - days)).toISOString().slice(0, 10);
}

function progressErrorMessage(error: unknown): string {
  if (
    (error instanceof ProgressSummaryClientError || error instanceof ActivitySummaryClientError)
    && (error.status === 401 || error.code === "UNAUTHORIZED")
  ) return "Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.";
  if (
    (error instanceof ProgressSummaryClientError || error instanceof ActivitySummaryClientError)
    && (error.status === 403 || error.code === "HOUSEHOLD_ACCESS_DENIED")
  ) return "Không thể xem tiến trình của người học này.";
  return "Không thể tải tiến trình lúc này. Vui lòng thử lại.";
}

function resetErrorMessage(error: unknown): string {
  if (error instanceof ResetLearnerProgressClientError && (error.status === 401 || error.code === "UNAUTHORIZED")) {
    return "Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.";
  }
  if (error instanceof ResetLearnerProgressClientError && (error.status === 403 || error.code === "HOUSEHOLD_ACCESS_DENIED")) {
    return "Không thể đặt lại tiến trình của người học này.";
  }
  return "Không thể đặt lại tiến trình lúc này. Vui lòng thử lại.";
}

function accuracyFor(history: ProgressHistoryResponse | null) {
  const remembered = history?.days.reduce((sum, day) => sum + day.remembered, 0) ?? 0;
  const forgotten = history?.days.reduce((sum, day) => sum + day.forgotten, 0) ?? 0;
  const total = remembered + forgotten;
  return {
    remembered,
    forgotten,
    total,
    percent: total === 0 ? null : Math.round(remembered / total * 100)
  };
}

function sortedLevelProgress(summary: ProgressSummaryResponse) {
  return [...summary.progressByLevel]
    .filter((level) => level.total > 0)
    .sort((a, b) => (a.level === null ? 7 : LEVEL_ORDER[a.level]) - (b.level === null ? 7 : LEVEL_ORDER[b.level]));
}

function relevantTopics(progress: TopicProgressResponse | null) {
  return (progress?.topics ?? [])
    .filter((topic) => topic.total > 0 && topic.learningCount + topic.masteredCount > 0)
    .sort((a, b) => {
      const aLearned = a.learningCount + a.masteredCount;
      const bLearned = b.learningCount + b.masteredCount;
      const aPartial = aLearned < a.total;
      const bPartial = bLearned < b.total;
      if (aPartial !== bPartial) return aPartial ? -1 : 1;
      if (aPartial && bPartial) {
        const ratioDifference = aLearned / a.total - bLearned / b.total;
        if (ratioDifference !== 0) return ratioDifference;
      }
      return a.name.localeCompare(b.name, "vi");
    })
    .slice(0, 5);
}

function periodDays(period: ProgressPeriod) {
  return period === "30d" ? 30 : 7;
}

function periodLabel(period: ProgressPeriod) {
  return period === "30d" ? "30 ngày gần đây" : "7 ngày gần đây";
}

function xPosition(index: number, count: number, left: number, width: number) {
  return left + width * (index + 0.5) / Math.max(1, count);
}

function labelIndexes(count: number, period: ProgressPeriod) {
  if (period === "7d") return Array.from({ length: count }, (_, index) => index);
  return Array.from({ length: count }, (_, index) => index)
    .filter((index) => index % 5 === 0 || index === count - 1);
}

function axisDateLabel(date: string, period: ProgressPeriod) {
  const parsed = new Date(`${date}T00:00:00Z`);
  return period === "7d"
    ? new Intl.DateTimeFormat("vi-VN", { weekday: "short", timeZone: "UTC" }).format(parsed)
    : new Intl.DateTimeFormat("vi-VN", { day: "numeric", month: "numeric", timeZone: "UTC" }).format(parsed);
}

function dateFullLabel(date: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(`${date}T00:00:00Z`));
}

function ProgressMetric({
  testId,
  label,
  value,
  detail
}: {
  testId: string;
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div className="progress-metric-card" data-testid={testId}>
      <dt>{label}</dt>
      <dd>{value}</dd>
      <p>{detail}</p>
    </div>
  );
}

function CoverageBar({ label, learned, total }: { label: string; learned: number; total: number }) {
  const percent = total > 0 ? Math.round(learned / total * 100) : 0;
  return (
    <div
      className="progress-coverage-bar"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-valuetext={`${learned} trên ${total} từ, ${percent}%`}
    >
      <span style={{ width: `${percent}%` }} />
    </div>
  );
}

function ActivityChart({ history, period }: { history: ProgressHistoryResponse; period: ProgressPeriod }) {
  const days = history.days;
  const total = days.reduce((sum, day) => sum + day.uniqueWords, 0);
  if (total === 0) {
    return <EmptyState className="progress-chart-empty async-state-compact" icon="chart" title="Chưa có hoạt động ôn tập" description="Hoạt động sẽ xuất hiện tại đây khi bạn học trong khoảng thời gian này." />;
  }

  const width = 720;
  const height = 260;
  const left = 48;
  const right = 12;
  const top = 18;
  const bottom = 42;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const maxValue = Math.max(1, ...days.map((day) => day.uniqueWords));
  const maxScale = Math.max(4, Math.ceil(maxValue / 4) * 4);
  const ticks = [...new Set([0, Math.round(maxScale / 2), maxScale])];
  const tickIndexes = labelIndexes(days.length, period);
  const highest = Math.max(...days.map((day) => day.uniqueWords));

  return (
    <figure className="progress-chart" data-testid="activity-chart">
      <svg
        className="progress-chart-svg"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${periodLabel(period)}: ${total} lượt từ vựng duy nhất đã được ôn qua ${days.length} ngày.`}
      >
        <title>Số từ duy nhất đã ôn mỗi ngày</title>
        <desc>Các cột thể hiện số vocabulary khác nhau được ôn trong từng ngày địa phương của gia đình.</desc>
        {ticks.map((tick) => {
          const y = top + plotHeight - tick / maxScale * plotHeight;
          return (
            <g key={tick} className="progress-chart-gridline">
              <line x1={left} x2={width - right} y1={y} y2={y} />
              <text x={left - 10} y={y + 4} textAnchor="end">{tick}</text>
            </g>
          );
        })}
        {days.map((day, index) => {
          const columnWidth = plotWidth / Math.max(1, days.length);
          const barWidth = Math.min(34, columnWidth * 0.58);
          const barHeight = day.uniqueWords / maxScale * plotHeight;
          const x = xPosition(index, days.length, left, plotWidth) - barWidth / 2;
          const y = top + plotHeight - barHeight;
          return (
            <g className="progress-chart-bar-group" key={day.date}>
              <title>{dateFullLabel(day.date)}: {day.uniqueWords} từ duy nhất, {day.reviews} lượt ôn</title>
              <rect x={x} y={y} width={barWidth} height={Math.max(0, barHeight)} rx={5} />
            </g>
          );
        })}
        {tickIndexes.map((index) => (
          <text
            className="progress-chart-date"
            key={days[index]?.date}
            x={xPosition(index, days.length, left, plotWidth)}
            y={height - 12}
            textAnchor="middle"
          >
            {days[index] ? axisDateLabel(days[index].date, period) : ""}
          </text>
        ))}
      </svg>
      <figcaption>
        Cao nhất: {highest} từ duy nhất trong một ngày. Mỗi từ chỉ tính một lần mỗi ngày.
      </figcaption>
      <ul className="progress-chart-data-list">
        {days.map((day) => <li key={day.date}>{dateFullLabel(day.date)}: {day.uniqueWords} từ duy nhất, {day.reviews} lượt ôn.</li>)}
      </ul>
    </figure>
  );
}

function AccuracyChart({ history, period }: { history: ProgressHistoryResponse; period: ProgressPeriod }) {
  const days = history.days.map((day) => {
    const validReviews = day.remembered + day.forgotten;
    return {
      ...day,
      validReviews,
      accuracy: validReviews === 0 ? null : Math.round(day.remembered / validReviews * 100)
    };
  });
  const totalReviews = days.reduce((sum, day) => sum + day.validReviews, 0);
  if (totalReviews === 0) {
    return <EmptyState className="progress-chart-empty async-state-compact" icon="chart" title="Chưa đủ dữ liệu ôn tập" description="Độ chính xác sẽ hiển thị khi có lượt ôn trong khoảng thời gian này." />;
  }

  const width = 720;
  const height = 260;
  const left = 48;
  const right = 12;
  const top = 18;
  const bottom = 42;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const points = days.map((day, index) => ({
    date: day.date,
    accuracy: day.accuracy,
    validReviews: day.validReviews,
    x: xPosition(index, days.length, left, plotWidth),
    y: day.accuracy === null ? null : top + plotHeight - day.accuracy / 100 * plotHeight
  }));
  const segments: typeof points[] = [];
  let segment: typeof points = [];
  for (const point of points) {
    if (point.accuracy === null) {
      if (segment.length > 0) segments.push(segment);
      segment = [];
    } else {
      segment.push(point);
    }
  }
  if (segment.length > 0) segments.push(segment);
  const tickIndexes = labelIndexes(days.length, period);
  const observedDays = points.filter((point) => point.accuracy !== null).length;

  return (
    <figure className="progress-chart" data-testid="accuracy-chart">
      <svg
        className="progress-chart-svg"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${periodLabel(period)}: độ chính xác ôn tập tổng thể ${Math.round(days.reduce((sum, day) => sum + day.remembered, 0) / totalReviews * 100)}% từ ${totalReviews} lượt, có dữ liệu ở ${observedDays} ngày.`}
      >
        <title>Độ chính xác ôn tập theo ngày</title>
        <desc>Tỉ lệ nhớ được tính từ các lượt REMEMBERED chia cho tổng lượt REMEMBERED và FORGOTTEN. Ngày không có lượt ôn được để trống.</desc>
        {[0, 25, 50, 75, 100].map((tick) => {
          const y = top + plotHeight - tick / 100 * plotHeight;
          return (
            <g key={tick} className="progress-chart-gridline">
              <line x1={left} x2={width - right} y1={y} y2={y} />
              <text x={left - 10} y={y + 4} textAnchor="end">{tick}%</text>
            </g>
          );
        })}
        {segments.filter((pointsInSegment) => pointsInSegment.length > 1).map((pointsInSegment, index) => (
          <polyline
            className="progress-accuracy-line"
            key={`segment-${index}`}
            points={pointsInSegment.map((point) => `${point.x},${point.y}`).join(" ")}
          />
        ))}
        {points.map((point) => point.accuracy === null || point.y === null ? null : (
          <g className="progress-accuracy-point" key={point.date}>
            <title>{dateFullLabel(point.date)}: {point.accuracy}% từ {point.validReviews} lượt ôn</title>
            <circle cx={point.x} cy={point.y} r={4.5} />
          </g>
        ))}
        {tickIndexes.map((index) => (
          <text
            className="progress-chart-date"
            key={days[index]?.date}
            x={xPosition(index, days.length, left, plotWidth)}
            y={height - 12}
            textAnchor="middle"
          >
            {days[index] ? axisDateLabel(days[index].date, period) : ""}
          </text>
        ))}
      </svg>
      <figcaption>
        {totalReviews} lượt ôn hợp lệ trong {observedDays} ngày có dữ liệu.
        {totalReviews < 5 ? " Mẫu còn ít; hãy xem đây là tín hiệu ban đầu." : ""}
        {" "}Các ngày trống không có lượt ôn.
      </figcaption>
      <ul className="progress-chart-data-list">
        {days.map((day) => <li key={day.date}>
          {dateFullLabel(day.date)}: {day.accuracy === null ? "không có lượt ôn" : `${day.accuracy}% từ ${day.validReviews} lượt`}.
        </li>)}
      </ul>
    </figure>
  );
}

export function ProgressPage() {
  const { activeLearner } = useActiveLearner();
  if (!activeLearner) return <Navigate to="/learners" replace />;
  return <ProgressExperience key={activeLearner.id} activeLearner={activeLearner} />;
}

function ProgressExperience({ activeLearner }: { activeLearner: LearnerDto }) {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const period = periodFromSearch(searchParams);
  const [summaryRetry, setSummaryRetry] = useState(0);
  const [historyRetry, setHistoryRetry] = useState(0);
  const [topicRetry, setTopicRetry] = useState(0);
  const [summaryState, setSummaryState] = useState<LoadState>("loading");
  const [summary, setSummary] = useState<ProgressSummaryResponse | null>(null);
  const [activity, setActivity] = useState<ActivitySummaryResponse | null>(null);
  const [summaryMessage, setSummaryMessage] = useState<string | null>(null);
  const [historyState, setHistoryState] = useState<LoadState>("loading");
  const [history, setHistory] = useState<ProgressHistoryResponse | null>(null);
  const [topicState, setTopicState] = useState<LoadState>("loading");
  const [topicProgress, setTopicProgress] = useState<TopicProgressResponse | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const resetTriggerRef = useRef<HTMLButtonElement>(null);
  const resetCancelRef = useRef<HTMLButtonElement>(null);
  const resetDialogRef = useRef<HTMLElement>(null);
  const resetSubmittingRef = useRef(false);
  const restoreResetFocusRef = useRef(false);

  useEffect(() => {
    resetSubmittingRef.current = resetSubmitting;
  }, [resetSubmitting]);

  useEffect(() => {
    if (!resetOpen) {
      if (restoreResetFocusRef.current) {
        restoreResetFocusRef.current = false;
        resetTriggerRef.current?.focus();
      }
      return;
    }
    resetCancelRef.current?.focus();
    const onDialogKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !resetSubmittingRef.current) {
        event.preventDefault();
        restoreResetFocusRef.current = true;
        setResetOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(resetDialogRef.current?.querySelectorAll<HTMLElement>("button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])") ?? []);
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) {
        event.preventDefault();
        resetDialogRef.current?.focus();
        return;
      }
      if (event.shiftKey && (document.activeElement === first || !resetDialogRef.current?.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !resetDialogRef.current?.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onDialogKeyDown);
    return () => document.removeEventListener("keydown", onDialogKeyDown);
  }, [resetOpen]);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      requestProgressSummary(activeLearner.id),
      requestActivitySummary(activeLearner.id)
    ]).then(([summaryResponse, activityResponse]) => {
      if (cancelled) return;
      setSummary(summaryResponse);
      setActivity(activityResponse);
      setSummaryState("ready");
    }).catch((error: unknown) => {
      if (cancelled) return;
      setSummaryState("error");
      setSummaryMessage(progressErrorMessage(error));
    });
    return () => { cancelled = true; };
  }, [activeLearner.id, summaryRetry]);

  useEffect(() => {
    let cancelled = false;
    void requestTopicProgress(activeLearner.id).then((response) => {
      if (cancelled) return;
      setTopicProgress(response);
      setTopicState("ready");
    }).catch(() => {
      if (!cancelled) setTopicState("error");
    });
    return () => { cancelled = true; };
  }, [activeLearner.id, topicRetry]);

  const activityLocalDate = activity?.localDate;
  useEffect(() => {
    if (!activityLocalDate) return;
    let cancelled = false;
    const to = activityLocalDate;
    const from = dateMinus(to, periodDays(period) - 1);
    void requestProgressHistory(activeLearner.id, from, to).then((response) => {
      if (cancelled) return;
      setHistory(response);
      setHistoryState("ready");
    }).catch(() => {
      if (!cancelled) setHistoryState("error");
    });
    return () => { cancelled = true; };
  }, [activeLearner.id, activityLocalDate, period, historyRetry]);

  async function handleReset() {
    if (resetSubmitting) return;
    resetDialogRef.current?.focus();
    setResetSubmitting(true);
    setResetError(null);
    try {
      await requestResetLearnerProgress(activeLearner.id);
      restoreResetFocusRef.current = true;
      setResetOpen(false);
      toast.success("Đã đặt lại tiến trình");
      setSummaryState("loading");
      setSummary(null);
      setActivity(null);
      setHistoryState("loading");
      setTopicProgress(null);
      setHistory(null);
      setTopicState("loading");
      setSummaryRetry((current) => current + 1);
      setHistoryRetry((current) => current + 1);
      setTopicRetry((current) => current + 1);
    } catch (error) {
      setResetError(resetErrorMessage(error));
    } finally {
      setResetSubmitting(false);
    }
  }

  const accuracy = accuracyFor(history);
  const levels = summary ? sortedLevelProgress(summary) : [];
  const topics = relevantTopics(topicProgress);
  const lowestPartialTopicId = topics.find((topic) => {
    const learned = topic.learningCount + topic.masteredCount;
    return learned > 0 && learned < topic.total;
  })?.topicId;

  function changePeriod(value: string) {
    const nextPeriod: ProgressPeriod = value === "30d" ? "30d" : "7d";
    setHistoryState("loading");
    setHistory(null);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set("period", nextPeriod);
      return next;
    });
  }

  function retrySummary() {
    setSummaryState("loading");
    setSummary(null);
    setActivity(null);
    setSummaryMessage(null);
    setHistoryState("loading");
    setHistory(null);
    setSummaryRetry((current) => current + 1);
  }

  function retryHistory() {
    setHistoryState("loading");
    setHistory(null);
    setHistoryRetry((current) => current + 1);
  }

  function retryTopics() {
    setTopicState("loading");
    setTopicProgress(null);
    setTopicRetry((current) => current + 1);
  }

  return (
    <main className="learner-page progress-page" aria-labelledby="progress-title">
      <div className="progress-dashboard">
        <header className="progress-dashboard-header">
          <div>
            <p className="progress-dashboard-eyebrow">Tiến trình của {activeLearner.displayName}</p>
            <h1 id="progress-title">Tiến trình học tập</h1>
            <p>Theo dõi tiến độ và điểm cần cải thiện của bạn.</p>
          </div>
          <label className="progress-period-control">
            <span>Khoảng thời gian</span>
            <select aria-label="Khoảng thời gian" data-testid="progress-period" value={period} onChange={(event) => changePeriod(event.target.value)}>
              <option value="7d">7 ngày gần đây</option>
              <option value="30d">30 ngày gần đây</option>
            </select>
          </label>
        </header>

        {summaryState === "loading" ? <LoadingState className="progress-dashboard-state" label="Đang tải tiến trình…" pattern="dashboard" testId="progress-loading" /> : null}
        {summaryState === "error" ? <ErrorState className="progress-dashboard-state progress-dashboard-error" title="Không thể tải tiến trình" description={summaryMessage ?? "Vui lòng thử lại."} onRetry={retrySummary} testId="progress-error" /> : null}

        {summaryState === "ready" && summary && activity ? (
          <div className="progress-dashboard-content" data-testid="progress-summary">
            {summary.learnedCount === 0 ? (
              <EmptyState className="progress-dashboard-empty" icon="chart" title="Chưa học từ nào" description="Bắt đầu học để ghi nhận tiến trình đầu tiên." action={<Link className="progress-empty-link" to="/study/setup">Bắt đầu học</Link>} testId="progress-empty-state" />
            ) : null}

            <dl className="progress-metric-grid" aria-label="Tóm tắt tiến trình">
              <ProgressMetric testId="progress-metric-learned" label="Đã học" value={summary.learnedCount} detail="Từ có tiến trình đã lưu" />
              <ProgressMetric testId="progress-metric-mastered" label="Đã thành thạo" value={summary.masteredCount} detail="Trạng thái hiện tại" />
              <ProgressMetric
                testId="progress-metric-accuracy"
                label="Độ chính xác ôn tập"
                value={historyState === "error" || accuracy.percent === null ? "—" : `${accuracy.percent}%`}
                detail={historyState === "error"
                  ? "Không tải được dữ liệu ôn tập"
                  : historyState === "loading"
                    ? "Đang tải dữ liệu ôn tập"
                  : accuracy.total === 0
                    ? `Chưa có lượt ôn trong ${periodLabel(period).toLowerCase()}`
                    : `${accuracy.total} lượt ôn · ${periodLabel(period).toLowerCase()}`}
              />
              <ProgressMetric
                testId="progress-metric-streak"
                label="Chuỗi hiện tại"
                value={`${activity.streak.currentStreak} ngày`}
                detail="Theo ngày học của gia đình"
              />
            </dl>

            <div className="progress-chart-grid">
              <section className="progress-dashboard-panel" aria-labelledby="progress-activity-title">
                <div className="progress-panel-heading">
                  <div>
                    <h2 id="progress-activity-title">Hoạt động học tập</h2>
                    <p>Số từ duy nhất đã ôn mỗi ngày · {periodLabel(period)}</p>
                  </div>
                </div>
                {historyState === "loading" ? <LoadingState className="progress-panel-state" label="Đang tải hoạt động học tập…" pattern="chart" /> : null}
                {historyState === "error" ? <ErrorState className="progress-panel-state progress-inline-error" title="Không thể tải hoạt động" description="Không thể tải hoạt động trong kỳ này." onRetry={retryHistory} /> : null}
                {historyState === "ready" && history ? <ActivityChart history={history} period={period} /> : null}
              </section>

              <section className="progress-dashboard-panel" aria-labelledby="progress-accuracy-title">
                <div className="progress-panel-heading">
                  <div>
                    <h2 id="progress-accuracy-title">Độ chính xác ôn tập</h2>
                    <p>Đã nhớ / (đã nhớ + chưa nhớ) · {periodLabel(period)}</p>
                  </div>
                </div>
                {historyState === "loading" ? <LoadingState className="progress-panel-state" label="Đang tải độ chính xác ôn tập…" pattern="chart" /> : null}
                {historyState === "error" ? <ErrorState className="progress-panel-state progress-inline-error" title="Không thể tải độ chính xác" description="Không thể tải kết quả ôn tập trong kỳ này." onRetry={retryHistory} /> : null}
                {historyState === "ready" && history ? <AccuracyChart history={history} period={period} /> : null}
              </section>
            </div>

            <div className="progress-breakdown-grid">
              <section className="progress-dashboard-panel" aria-labelledby="progress-level-title">
                <div className="progress-panel-heading">
                  <div>
                    <h2 id="progress-level-title">Tiến độ theo cấp độ</h2>
                    <p>Từ đã học trên tổng từ trong các bộ đang học</p>
                  </div>
                </div>
                {levels.length === 0 ? (
                  <EmptyState className="progress-panel-state async-state-compact" icon="book" title="Chưa có từ được phân cấp" description="Không có cấp độ khả dụng trong các bộ đang học." testId="level-progress-empty" />
                ) : (
                  <ul className="progress-coverage-list" data-testid="level-progress-list">
                    {levels.map((level) => {
                      const label = level.level === null ? "Chưa phân cấp" : LEVEL_LABELS[level.level];
                      return (
                        <li className="progress-coverage-row" key={level.level ?? "unclassified"}>
                          <span className="progress-coverage-label">{label}</span>
                          <div className="progress-coverage-main">
                            <div className="progress-coverage-numbers"><strong>{level.learnedCount} / {level.total}</strong><span>{Math.round(level.learnedCount / level.total * 100)}%</span></div>
                            <CoverageBar label={`Tiến độ ${label}`} learned={level.learnedCount} total={level.total} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              <section className="progress-dashboard-panel" aria-labelledby="progress-topic-title">
                <div className="progress-panel-heading">
                  <div>
                    <h2 id="progress-topic-title">Tiến độ theo chủ đề</h2>
                    <p>Chủ đề đã bắt đầu · tối đa 5 chủ đề</p>
                  </div>
                  <Link className="progress-panel-link" to="/topics">Xem tất cả</Link>
                </div>
                {topicState === "loading" ? <LoadingState className="progress-panel-state" label="Đang tải tiến độ chủ đề…" pattern="rows" /> : null}
                {topicState === "error" ? <ErrorState className="progress-panel-state progress-inline-error" title="Không thể tải tiến độ chủ đề" description="Vui lòng thử lại." onRetry={retryTopics} /> : null}
                {topicState === "ready" && topicProgress && topics.length === 0 ? (
                  <EmptyState className="progress-panel-state async-state-compact" icon="topic" title="Chưa có tiến độ chủ đề" description="Tiến độ sẽ xuất hiện khi bạn học từ trong các chủ đề đang hoạt động." testId="topic-progress-empty" />
                ) : null}
                {topicState === "ready" && topics.length > 0 ? (
                  <ul className="progress-coverage-list" data-testid="topic-progress-list">
                    {topics.map((topic) => {
                      const learned = topic.learningCount + topic.masteredCount;
                      const percent = Math.round(learned / topic.total * 100);
                      return (
                        <li className="progress-coverage-row" key={topic.topicId}>
                          <span className="progress-coverage-label">
                            {topic.name}
                            {topic.topicId === lowestPartialTopicId ? <small>Tiến độ thấp nhất</small> : null}
                          </span>
                          <div className="progress-coverage-main">
                            <div className="progress-coverage-numbers"><strong>{learned} / {topic.total}</strong><span>{percent}%</span></div>
                            <CoverageBar label={`Tiến độ chủ đề ${topic.name}`} learned={learned} total={topic.total} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </section>
            </div>
          </div>
        ) : null}

        <details className="progress-reset-details">
          <summary>Quản lý tiến trình</summary>
          <p>Đặt lại chỉ xóa trạng thái học hiện tại. Lịch sử ôn tập và chuỗi ngày vẫn được giữ lại.</p>
          <button
            ref={resetTriggerRef}
            className="progress-reset-button"
            type="button"
            onClick={() => {
              setResetError(null);
              setResetOpen(true);
            }}
            disabled={resetSubmitting}
          >
            Đặt lại tiến trình
          </button>
        </details>
      </div>

      {resetOpen ? (
        <div className="reset-dialog-backdrop">
          <section ref={resetDialogRef} className="reset-dialog" tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="reset-progress-title" aria-describedby="reset-progress-description">
            <span className="reset-dialog-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3" /></svg></span>
            <h2 id="reset-progress-title">Đặt lại tiến trình của {activeLearner.displayName}?</h2>
            <p id="reset-progress-description">
              Tiến trình học hiện tại của người học này sẽ được đưa về trạng thái từ mới. Chỉ người học này bị ảnh hưởng;
              lịch sử ôn tập vẫn được giữ lại.
            </p>
            {resetError ? <p className="reset-dialog-error" role="alert">{resetError}</p> : null}
            <div className="reset-dialog-actions">
              <button ref={resetCancelRef} className="auth-retry reset-dialog-cancel" type="button" onClick={() => { restoreResetFocusRef.current = true; setResetOpen(false); }} disabled={resetSubmitting}>Hủy</button>
              <button className="progress-reset-button" type="button" onClick={() => void handleReset()} disabled={resetSubmitting} aria-busy={resetSubmitting}>
                {resetSubmitting ? "Đang đặt lại…" : "Xác nhận đặt lại"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
