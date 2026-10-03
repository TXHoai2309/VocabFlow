import type { CSSProperties } from "react";
import { Link } from "react-router";
import type {
  ActivitySummaryResponse,
  ContinueLearningCandidate,
  LearnerDto,
  LearnerLearningSetDto,
  ProgressHistoryResponse,
  ProgressSummaryResponse,
  ReviewQueueResponse,
  VocabularyLevel
} from "@vocabflow/contracts";

export type HomeResource<T> =
  | { status: "loading" }
  | { status: "ready"; data: T }
  | { status: "error" };

function initials(value: string) {
  return value.trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join("").toLocaleUpperCase() || "?";
}

function greetingForNow() {
  const hour = new Date().getHours();
  if (hour < 12) return "Chào buổi sáng";
  if (hour < 17) return "Chào buổi chiều";
  return "Chào buổi tối";
}

export function HomeDashboardHeader({
  parentName,
  learner,
  level
}: {
  parentName: string;
  learner: LearnerDto;
  level: number | null;
}) {
  return (
    <header className="home-header">
      <div className="home-header-heading">
        <div>
          <h1>{greetingForNow()}, {parentName}! <span aria-hidden="true">👋</span></h1>
          <p>Cùng học thật tốt hôm nay nhé!</p>
        </div>
      </div>
      <div className="home-header-actions">
        <Link className="home-learner-switcher" to="/learners" aria-label={`Đổi người học. Người học hiện tại: ${learner.displayName}${level === null ? "" : `, Cấp độ ${level}`}`}>
          <span className="home-learner-avatar" aria-hidden="true">{initials(learner.displayName)}</span>
          <span className="home-learner-label"><strong>{learner.displayName}</strong>{level === null ? null : <span>Cấp độ {level}</span>}</span>
        </Link>
        <span className="home-notification-visual" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>
        </span>
      </div>
    </header>
  );
}

export function HomeSessionLoading() {
  return (
    <main className="home-session-state" aria-busy="true">
      <div className="home-session-skeleton" role="status"><span className="home-skeleton home-skeleton-title" /><span className="home-skeleton home-skeleton-line" />Đang tải trang học tập…</div>
      <div className="home-session-skeleton-cards" aria-hidden="true">{Array.from({ length: 4 }, (_, index) => <span className="home-skeleton" key={index} />)}</div>
    </main>
  );
}

export function HomeSessionError({ onRetry }: { onRetry: () => void }) {
  return (
    <main className="home-session-state">
      <section className="home-session-error" role="alert">
        <h1>Không thể kiểm tra phiên đăng nhập.</h1>
        <p>Vui lòng thử lại. Dữ liệu học tập của bạn chưa bị thay đổi.</p>
        <button className="home-button home-button-primary" type="button" onClick={onRetry}>Thử lại</button>
      </section>
    </main>
  );
}

function StudyIllustration() {
  return (
    <svg className="home-hero-illustration" viewBox="0 0 390 260" aria-hidden="true">
      <defs>
        <linearGradient id="home-sweater" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#FFD17A" /><stop offset="1" stopColor="#FF9F55" /></linearGradient>
        <linearGradient id="home-book" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#FDFBFF" /><stop offset="1" stopColor="#C8C7FF" /></linearGradient>
      </defs>
      <circle cx="216" cy="130" r="108" fill="#FFFFFF" opacity=".09" />
      <path d="M35 215c32-40 70-38 102 0 25-37 59-36 83 1 25-31 56-26 76 1h64v43H28z" fill="#BBB8FF" opacity=".7" />
      <path d="M72 188c5-43 22-68 44-78-4 30-15 53-44 78zm39-7c0-39 14-65 37-78 0 29-7 55-37 78z" fill="#6ED9C2" />
      <path d="M269 187c-2-43 9-68 32-87 6 31 1 59-32 87zm27-2c6-36 25-57 51-67-4 28-17 51-51 67z" fill="#72D9C4" />
      <path d="M150 220c0-36 22-60 52-60h48c32 0 51 24 56 60l4 40H143z" fill="url(#home-sweater)" />
      <path d="M151 108c-4-46 22-81 65-83 47-3 74 27 75 73-1 22-10 35-22 48l-20 22h-81l-18-26z" fill="#28203F" />
      <path d="M181 91c0-31 16-50 41-50 29 0 47 21 47 51v26c0 31-20 53-46 53-25 0-42-22-42-53z" fill="#FFD3B5" />
      <path d="M175 108c-20-28-13-67 13-84 24-16 64-11 82 16-18-10-30-9-43-5-1 20-18 36-53 40z" fill="#28203F" />
      <path d="M180 99c-18 2-27 16-24 34 2 11 9 18 20 18zm88-3c18 4 24 18 19 35-3 10-10 16-20 17z" fill="#28203F" />
      <ellipse cx="203" cy="111" rx="4" ry="6" fill="#28203F" /><ellipse cx="247" cy="111" rx="4" ry="6" fill="#28203F" />
      <circle cx="191" cy="127" r="8" fill="#FBA8A1" opacity=".65" /><circle cx="257" cy="127" r="8" fill="#FBA8A1" opacity=".65" />
      <path d="M215 137c7 7 15 7 22 0" fill="none" stroke="#A34449" strokeWidth="3" strokeLinecap="round" />
      <path d="M166 195c19 0 30 13 35 32h82c4-19 15-31 32-34l4 67H145z" fill="#FFB65D" />
      <path d="M144 200c20-14 39-17 58-8l39 27c13 9 21 14 36 17l-8 17c-18-2-32-7-47-17l-35-20c-9-5-19-2-26 4z" fill="#FFD3B5" />
      <path d="M135 205c18-9 36-8 51 1l21 13v34h-88v-31z" fill="url(#home-book)" />
      <path d="M207 219c20-14 41-17 63-8v42h-63z" fill="#817BFF" />
      <path d="M207 219c-8-5-15-5-21 0v39h21zm0 0c8-5 15-5 21 0v39h-21z" fill="none" stroke="#635BFF" strokeWidth="2" />
      <path d="m113 56 8 12 13 4-13 5-8 12-4-12-13-5 13-4zm214 34 6 9 10 3-10 4-6 9-4-9-9-4 9-3z" fill="#FFE37A" />
      <path d="m93 129 5 8 9 3-9 3-5 9-3-9-9-3 9-3z" fill="#AAA6FF" />
    </svg>
  );
}

function SectionLoading({ label }: { label: string }) {
  return <div className="home-section-loading" role="status" aria-label={label}><span className="home-skeleton home-skeleton-line" /><span className="home-skeleton home-skeleton-line short" /></div>;
}

function gradeLabel(grade: VocabularyLevel | null) {
  if (!grade || grade === "GENERAL") return "Chung";
  return grade.replace("GRADE_", "Lớp ");
}

export function DailyStudyHero({
  queue,
  activity
}: {
  queue: HomeResource<ReviewQueueResponse>;
  activity: HomeResource<ActivitySummaryResponse>;
}) {
  const hasQueue = queue.status === "ready" && queue.data.queue.length > 0;
  const dueCount = queue.status === "ready" ? queue.data.dueCount : null;
  const newCount = queue.status === "ready" ? queue.data.newCount : null;
  const streak = activity.status === "ready" ? activity.data.streak.currentStreak : null;
  return (
    <section className="home-hero" aria-labelledby="home-hero-title">
      <div className="home-hero-copy">
        <p className="home-eyebrow">VocabFlow</p>
        <h2 id="home-hero-title">Sẵn sàng học chưa?</h2>
        {queue.status === "loading" ? <p>Đang kiểm tra danh sách học hôm nay…</p> : null}
        {queue.status === "error" ? <p>Không thể tải danh sách học hôm nay. Nhấn Thử lại bên dưới để kiểm tra lại.</p> : null}
        {queue.status === "ready" && hasQueue ? <p>Hôm nay bạn có {dueCount} từ cần ôn tập và {newCount} từ mới. Hãy duy trì chuỗi ngày học nhé!</p> : null}
        {queue.status === "ready" && !hasQueue ? <p>Hôm nay bạn đã hoàn thành danh sách học. Hãy quay lại khi có thêm từ mới nhé.</p> : null}
        {hasQueue ? <Link className="home-button home-button-light" to="/study/setup">Bắt đầu học <span aria-hidden="true">→</span></Link> : (
          <button className="home-button home-button-light" type="button" disabled>
            {queue.status === "loading" ? "Đang tải danh sách học…" : queue.status === "error" ? "Danh sách học chưa khả dụng" : "Đã hoàn thành danh sách hôm nay"}
          </button>
        )}
      </div>
      <div className="home-hero-art"><StudyIllustration /></div>
      <div className="home-streak" role="img" aria-label={streak === null ? "Đang tải chuỗi ngày học" : `${streak} ngày liên tiếp`}>
        <span aria-hidden="true">🔥</span>
        <strong>{streak ?? "—"}</strong>
        <small>ngày liên tiếp</small>
      </div>
    </section>
  );
}

function StatCard({
  label,
  icon,
  resource,
  value,
  href
}: {
  label: string;
  icon: string;
  resource: HomeResource<unknown>;
  value: number | null;
  href: string;
}) {
  const displayed = resource.status === "loading" ? "…" : resource.status === "error" || value === null ? "—" : value;
  return (
    <Link className="home-stat-card" to={href} aria-label={`${label}: ${displayed}`}>
      <span className="home-stat-icon" aria-hidden="true">{icon}</span>
      <span className="home-stat-copy"><strong>{displayed}</strong><span>{label}</span></span>
      <span className="home-stat-chevron" aria-hidden="true">›</span>
    </Link>
  );
}

export function QuickStats({
  queue,
  summary,
  activity
}: {
  queue: HomeResource<ReviewQueueResponse>;
  summary: HomeResource<ProgressSummaryResponse>;
  activity: HomeResource<ActivitySummaryResponse>;
}) {
  return (
    <section className="home-quick-stats" aria-label="Tóm tắt việc học">
      <StatCard label="Cần ôn tập" icon="📘" resource={queue} value={queue.status === "ready" ? queue.data.dueCount : null} href="/study" />
      <StatCard label="Từ mới" icon="🟩" resource={queue} value={queue.status === "ready" ? queue.data.newCount : null} href="/study" />
      <StatCard label="Đã học" icon="🎓" resource={summary} value={summary.status === "ready" ? summary.data.learnedCount : null} href="/progress" />
      <StatCard label="Chuỗi ngày học" icon="🔥" resource={activity} value={activity.status === "ready" ? activity.data.streak.currentStreak : null} href="/progress" />
    </section>
  );
}

function continueTarget(candidate: ContinueLearningCandidate) {
  if (candidate.scope === "TOPIC" && candidate.scopeId !== null) return `/study/setup?topicId=${candidate.scopeId}`;
  if (candidate.scope === "LEARNING_SET" && candidate.scopeId !== null) return `/study/setup?learningSetId=${candidate.scopeId}`;
  return "/study/setup?saved=1&content=all";
}

function continueScopeLabel(scope: ContinueLearningCandidate["scope"]) {
  if (scope === "TOPIC") return "Chủ đề";
  if (scope === "LEARNING_SET") return "Bộ từ";
  return "Từ đã lưu";
}

function lastActivityLabel(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function ContinueLearningCard({
  queue,
  continuation,
  onRetry
}: {
  queue: HomeResource<ReviewQueueResponse>;
  continuation: HomeResource<ContinueLearningCandidate | null>;
  onRetry: () => void;
}) {
  const next = queue.status === "ready" ? queue.data.queue[0] : undefined;
  const candidate = continuation.status === "ready" ? continuation.data : null;
  const showFallback = candidate === null && (continuation.status === "ready" || continuation.status === "error");
  return (
    <section className="home-card home-continue-card" aria-labelledby="home-continue-title">
      <div className="home-card-heading"><h2 id="home-continue-title">Tiếp tục học</h2></div>
      {continuation.status === "loading" ? <SectionLoading label="Đang kiểm tra mục học tiếp" /> : null}
      {continuation.status === "error" ? <div className="home-inline-state" role="status"><span>Chưa thể kiểm tra bộ từ đang học dở. Hiển thị danh sách học hiện tại nếu có.</span> <button className="home-continue-retry" type="button" onClick={onRetry}>Thử lại</button></div> : null}
      {candidate ? (
        <div className="home-next-item home-continue-candidate">
          <div className="home-next-art" aria-hidden="true"><span>{candidate.scope === "TOPIC" ? "🏷️" : candidate.scope === "LEARNING_SET" ? "📚" : "🔖"}</span></div>
          <div className="home-next-copy">
            <small>{continueScopeLabel(candidate.scope)}</small>
            <strong>{candidate.title}</strong>
            <div className="home-continue-progress-copy">
              <span>Đã học {candidate.learnedCount} / {candidate.totalCount} từ</span>
              <small>{candidate.progressPercent}%</small>
            </div>
            <div
              className="home-continue-progress"
              role="progressbar"
              aria-label={`Tiến trình ${candidate.title}`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={candidate.progressPercent}
              aria-valuetext={`${candidate.learnedCount} trên ${candidate.totalCount} từ, ${candidate.progressPercent}%`}
            >
              <span style={{ width: `${candidate.progressPercent}%` }} />
            </div>
            {candidate.lastActivityAt ? <time className="home-continue-last-activity" dateTime={candidate.lastActivityAt}>Hoạt động gần nhất: {lastActivityLabel(candidate.lastActivityAt)}</time> : null}
          </div>
          <Link className="home-button home-button-primary" aria-label={`Tiếp tục học ${candidate.title}`} to={continueTarget(candidate)}>Tiếp tục học</Link>
        </div>
      ) : null}
      {showFallback && queue.status === "loading" ? <SectionLoading label="Đang tải danh sách học hiện tại" /> : null}
      {showFallback && queue.status === "error" ? <p className="home-inline-state" role="status">Chưa thể tải danh sách học hiện tại. Hãy thử lại.</p> : null}
      {showFallback && queue.status === "ready" && !next ? <div className="home-empty-state" role="status"><span aria-hidden="true">✨</span><p>Chưa có chủ đề hoặc bộ từ nào đang học dở.</p><small>Bạn có thể bắt đầu một phiên học mới từ danh sách hiện tại.</small></div> : null}
      {showFallback && next ? (
        <div className="home-next-item">
          <div className="home-next-art" aria-hidden="true"><span>📖</span><i>✦</i></div>
          <div className="home-next-copy">
            <small>Tiếp theo trong danh sách học hiện tại · {next.queueType === "DUE" ? "Ôn tập" : "Từ mới"}</small>
            <strong>{next.vocabulary.word}</strong>
            <span>{next.vocabulary.vietnamese}</span>
          </div>
          <Link className="home-button home-button-primary" to="/study/setup">Bắt đầu phiên học</Link>
        </div>
      ) : null}
    </section>
  );
}

export function LearningSetsCard({
  learnerName,
  resource
}: {
  learnerName: string;
  resource: HomeResource<LearnerLearningSetDto[]>;
}) {
  const active = resource.status === "ready" ? resource.data.filter((item) => item.active) : [];
  return (
    <section className="home-card home-learning-sets-card" aria-labelledby="home-learning-sets-title">
      <div className="home-card-heading">
        <h2 id="home-learning-sets-title">Bộ từ của {learnerName}</h2>
        <Link to="/learning-sets">Xem tất cả</Link>
      </div>
      {resource.status === "loading" ? <SectionLoading label="Đang tải các bộ từ đã chọn" /> : null}
      {resource.status === "error" ? <p className="home-inline-state" role="status">Không thể tải các bộ từ đã chọn. Hãy thử lại.</p> : null}
      {resource.status === "ready" && active.length === 0 ? (
        <div className="home-empty-state home-sets-empty" role="status">
          <span aria-hidden="true">📚</span><p>Người học này chưa có bộ từ nào.</p>
          <Link className="home-text-link" to="/learning-sets/assign">Chọn bộ từ</Link>
        </div>
      ) : null}
      {active.length > 0 ? (
        <ul className="home-learning-set-list">
          {active.slice(0, 4).map(({ learningSet }) => (
            <li key={learningSet.id}>
              <Link to={`/learning-sets/${learningSet.id}`} className="home-learning-set-row">
                <span className="home-learning-set-icon" aria-hidden="true">{learningSet.slug.includes("food") ? "🍎" : learningSet.slug.includes("school") ? "🎒" : "🌱"}</span>
                <span className="home-learning-set-copy"><strong>{learningSet.name}</strong><small>{learningSet.vocabularyCount} từ · {gradeLabel(learningSet.grade)}</small></span>
                <span className="home-stat-chevron" aria-hidden="true">›</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function weekday(date: string) {
  return new Intl.DateTimeFormat("vi-VN", { weekday: "short", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}

function dateLabel(date: string) {
  return new Intl.DateTimeFormat("vi-VN", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}

function HomeHistoryContent({ history, mode }: { history: ProgressHistoryResponse; mode: "chart" | "activity" }) {
  const activeDays = history.days.filter((day) => day.reviews > 0 || day.uniqueWords > 0);
  if (mode === "chart") {
    const maximum = Math.max(1, ...history.days.map((day) => day.uniqueWords));
    return (
      <ul className="home-week-chart" role="list" aria-label="Số từ khác nhau đã học mỗi ngày trong 7 ngày qua">
        {history.days.map((day) => {
          const barStyle = { "--bar-height": `${day.uniqueWords === 0 ? 2 : (day.uniqueWords / maximum) * 100}%` } as CSSProperties;
          return (
            <li className="home-week-chart-day" key={day.date}>
              <span className="home-week-chart-value">{day.uniqueWords}</span>
              <span className="home-week-chart-track" aria-hidden="true"><span className="home-week-chart-bar" style={barStyle} /></span>
              <span className="home-week-chart-label">{weekday(day.date)}</span>
              <span className="home-sr-only">{day.uniqueWords} từ khác nhau đã học vào ngày {dateLabel(day.date)}</span>
            </li>
          );
        })}
      </ul>
    );
  }
  if (activeDays.length === 0) {
    return <div className="home-empty-state" role="status"><span aria-hidden="true">🌿</span><p>Chưa có hoạt động ôn tập nào trong 7 ngày qua.</p></div>;
  }
  return (
    <ul className="home-activity-list">
      {activeDays.slice(-3).reverse().map((day) => (
        <li key={day.date}>
          <span className="home-activity-icon" aria-hidden="true">✓</span>
          <span className="home-activity-copy"><strong>{day.uniqueWords} từ khác nhau đã học</strong><small>{day.reviews} lượt ôn tập</small></span>
          <time dateTime={day.date}>{dateLabel(day.date)}</time>
        </li>
      ))}
    </ul>
  );
}

export function WeeklyProgressCard({ resource }: { resource: HomeResource<ProgressHistoryResponse> }) {
  return (
    <section className="home-card home-week-card" aria-labelledby="home-week-title">
      <div className="home-card-heading"><h2 id="home-week-title">Tiến trình của bạn</h2><span className="home-period-label">7 ngày gần đây</span></div>
      {resource.status === "loading" ? <SectionLoading label="Đang tải tiến trình trong tuần" /> : null}
      {resource.status === "error" ? <p className="home-inline-state" role="status">Không thể tải tiến trình trong tuần. Hãy thử lại.</p> : null}
      {resource.status === "ready" && resource.data.days.every((day) => day.uniqueWords === 0) ? <p className="home-chart-empty" role="status">Hoạt động học tập sẽ hiển thị tại đây khi bạn bắt đầu học.</p> : null}
      {resource.status === "ready" && resource.data.days.some((day) => day.uniqueWords > 0) ? <HomeHistoryContent history={resource.data} mode="chart" /> : null}
    </section>
  );
}

export function RecentActivityCard({ resource }: { resource: HomeResource<ProgressHistoryResponse> }) {
  return (
    <section className="home-card home-activity-card" aria-labelledby="home-activity-title">
      <div className="home-card-heading"><h2 id="home-activity-title">Hoạt động gần đây</h2><Link to="/progress">Xem tất cả</Link></div>
      {resource.status === "loading" ? <SectionLoading label="Đang tải hoạt động gần đây" /> : null}
      {resource.status === "error" ? <p className="home-inline-state" role="status">Không thể tải hoạt động gần đây. Hãy thử lại.</p> : null}
      {resource.status === "ready" ? <HomeHistoryContent history={resource.data} mode="activity" /> : null}
    </section>
  );
}

export function DashboardErrorNotice({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="home-error-notice" role="alert">
      <p>Không thể tải một số thông tin trên trang chủ.</p>
      <button className="home-button home-button-secondary" type="button" onClick={onRetry}>Thử lại</button>
    </div>
  );
}
