import { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router";

const destinations = [
  { label: "Trang chủ", to: "/", icon: "home" },
  { label: "Học tập", to: "/study/setup", icon: "study" },
  { label: "Từ vựng", to: "/vocabulary", icon: "vocabulary" },
  { label: "Chủ đề", to: "/topics", icon: "topics" },
  { label: "Bộ từ", to: "/learning-sets", icon: "sets" },
  { label: "Tiến trình", to: "/progress", icon: "progress" },
  { label: "Người học", to: "/learners", icon: "learners" },
  { label: "Cài đặt", to: "/learner-settings", icon: "settings" }
] as const;

type IconName = typeof destinations[number]["icon"];

function NavigationIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, string> = {
    home: "M3 10.8 12 3l9 7.8v9.7a.5.5 0 0 1-.5.5h-5.8v-6.4H9.3V21H3.5a.5.5 0 0 1-.5-.5z",
    study: "M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5zm0 0v16M8 7h8M8 10h8",
    vocabulary: "M5 4h14v16H5zM8 8h8M8 11h8M8 14h5",
    topics: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
    sets: "M3.5 7.5h7l2 2H20a1 1 0 0 1 1 1v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3.5 7.5v-2a1.5 1.5 0 0 1 1.5-1.5h4l2 2H19",
    progress: "M4 20V12M10 20V5M16 20V9M22 20H2",
    learners: "M16 20v-1.5a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4V20m16 0v-1.5a4 4 0 0 0-2.7-3.8M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm7-7.7a4 4 0 0 1 0 7.4",
    settings: "M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zm0-6 .8 2.2a7.8 7.8 0 0 1 1.8.7l2.1-1 2 2-1 2.1c.3.6.6 1.2.7 1.8l2.2.8v2.8l-2.2.8a7.8 7.8 0 0 1-.7 1.8l1 2.1-2 2-2.1-1a7.8 7.8 0 0 1-1.8.7l-.8 2.2H9.2l-.8-2.2a7.8 7.8 0 0 1-1.8-.7l-2.1 1-2-2 1-2.1a7.8 7.8 0 0 1-.7-1.8L.6 14.7v-2.8l2.2-.8a7.8 7.8 0 0 1 .7-1.8l-1-2.1 2-2 2.1 1a7.8 7.8 0 0 1 1.8-.7l.8-2.2z"
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="app-nav-icon" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name]} /></svg>;
}

function Brand() {
  return (
    <Link className="app-brand" to="/" aria-label="Trang chủ VocabFlow">
      <svg aria-hidden="true" viewBox="0 0 32 32" className="app-brand-mark">
        <path d="M4 6.5c4.8-.9 8.8-.1 12 2.2v17c-3.2-2.3-7.2-3.1-12-2.2z" fill="currentColor" />
        <path d="M28 6.5c-4.8-.9-8.8-.1-12 2.2v17c3.2-2.3 7.2-3.1 12-2.2z" fill="currentColor" opacity=".68" />
      </svg>
      <span>Vocab<span className="app-brand-accent">Flow</span></span>
    </Link>
  );
}

function initials(value: string) {
  return value.trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join("").toLocaleUpperCase() || "?";
}

function PrimaryNavigation({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  return (
    <nav aria-label="Điều hướng chính" className="app-primary-nav">
      {destinations.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          onClick={onNavigate}
          className={({ isActive }) => (isActive || (item.to === "/study/setup" && location.pathname.startsWith("/study"))) ? "app-nav-link is-active" : "app-nav-link"}
        >
          <NavigationIcon name={item.icon} />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

function ParentAccount({ parentName }: { parentName: string }) {
  const displayName = parentName.trim();
  const accountLabel = displayName || "Tài khoản phụ huynh";
  return (
    <div className="app-parent-account">
      <span className="app-parent-avatar" aria-hidden="true">{initials(accountLabel)}</span>
      <span className="app-parent-copy">
        <strong>{accountLabel}</strong>
        {displayName ? <small>Tài khoản phụ huynh</small> : null}
      </span>
    </div>
  );
}

export function AppShell({ parentName }: { parentName: string }) {
  const [navigationOpen, setNavigationOpen] = useState(false);
  const location = useLocation();
  const isStudyFocusMode = location.pathname === "/study" || location.pathname === "/study/exercises";
  return (
    <div className={`app-layout${isStudyFocusMode ? " is-study-focus-mode" : ""}`}>
      <aside className="app-sidebar" aria-label="Thanh điều hướng ứng dụng">
        <Brand />
        <PrimaryNavigation />
        <ParentAccount parentName={parentName} />
      </aside>
      <div className="app-main-column">
        <header className="app-mobile-bar">
          <Brand />
          <button
            className="app-menu-toggle"
            type="button"
            aria-label={navigationOpen ? "Đóng điều hướng" : "Mở điều hướng"}
            aria-expanded={navigationOpen}
            aria-controls="app-mobile-navigation"
            onClick={() => setNavigationOpen((open) => !open)}
          >
            <span aria-hidden="true">{navigationOpen ? "×" : "☰"}</span>
          </button>
        </header>
        <div className="app-tablet-nav"><PrimaryNavigation /></div>
        <div id="app-mobile-navigation" className="app-mobile-nav" hidden={!navigationOpen}>
          <PrimaryNavigation onNavigate={() => setNavigationOpen(false)} />
        </div>
        <Outlet />
      </div>
    </div>
  );
}
