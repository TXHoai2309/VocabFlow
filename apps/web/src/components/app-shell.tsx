import { useEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation } from "react-router";

const destinations = [
  { label: "Trang chủ", to: "/", icon: "home" },
  { label: "Từ vựng", to: "/vocabulary", icon: "vocabulary" },
  { label: "Học tập", to: "/study/setup", icon: "study" },
  { label: "Tiến trình", to: "/progress", icon: "progress" },
  { label: "Yêu thích", to: "/saved", icon: "saved" },
  { label: "Cài đặt", to: "/learner-settings", icon: "settings" }
] as const;

type IconName = typeof destinations[number]["icon"];
type NavigationVariant = "desktop" | "mobile";
type AccountPlacement = "sidebar" | "mobile";

function isDestinationActive(pathname: string, destination: string) {
  if (destination === "/") return pathname === "/";
  if (destination === "/vocabulary") return pathname === "/vocabulary" || pathname.startsWith("/vocabulary/");
  if (destination === "/study/setup") return ["/study/setup", "/study", "/study/exercises"].includes(pathname);
  return pathname === destination;
}

function NavigationIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, string> = {
    home: "M3 10.8 12 3l9 7.8v9.7a.5.5 0 0 1-.5.5h-5.8v-6.4H9.3V21H3.5a.5.5 0 0 1-.5-.5z",
    study: "M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5zm0 0v16M8 7h8M8 10h8",
    vocabulary: "M5 4h14v16H5zM8 8h8M8 11h8M8 14h5",
    saved: "M6 4h12v17l-6-4-6 4z",
    progress: "M4 20V12M10 20V5M16 20V9M22 20H2",
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

function PrimaryNavigation({ variant }: { variant: NavigationVariant }) {
  const location = useLocation();
  const items = variant === "mobile" ? destinations.slice(0, 5) : destinations;
  return (
    <nav aria-label={variant === "mobile" ? "Điều hướng chính trên di động" : "Điều hướng chính"} className={`app-primary-nav is-${variant}${variant === "mobile" ? " app-mobile-bottom-nav" : ""}`}>
      <ul className="app-nav-list">
        {items.map((item, index) => {
          const isActive = isDestinationActive(location.pathname, item.to);
          const isSettingsDivider = variant === "desktop" && index === 5;
          return (
            <li key={item.to} className={isSettingsDivider ? "app-nav-divider" : undefined}>
              <Link
                to={item.to}
                aria-current={isActive ? "page" : undefined}
                className={isActive ? "app-nav-link is-active" : "app-nav-link"}
              >
                <NavigationIcon name={item.icon} />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function AccountMenu({ parentName, placement }: { parentName: string; placement: AccountPlacement }) {
  const displayName = parentName.trim();
  const accountLabel = displayName || "Tài khoản phụ huynh";
  const menuId = `app-account-menu-${placement}`;
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  function closeMenu() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <div className={`app-account-menu-wrap is-${placement}`} ref={rootRef}>
      <button
        ref={triggerRef}
        className="app-account-trigger"
        type="button"
        aria-label={`Tài khoản phụ huynh của ${accountLabel}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key !== "ArrowDown") return;
          event.preventDefault();
          setOpen(true);
        }}
      >
        <span className="app-parent-avatar" aria-hidden="true">{initials(accountLabel)}</span>
        <span className="app-parent-copy">
          <strong>{accountLabel}</strong>
          <small>Tài khoản phụ huynh</small>
        </span>
        <span className="app-account-chevron" aria-hidden="true">⌄</span>
      </button>
      <div
        ref={menuRef}
        className="app-account-menu"
        id={menuId}
        role="menu"
        aria-label="Tài khoản"
        hidden={!open}
        onKeyDown={(event) => {
          const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]'));
          const currentIndex = items.indexOf(document.activeElement as HTMLElement);
          let nextIndex: number;
          if (event.key === "ArrowDown") nextIndex = (currentIndex + 1) % items.length;
          else if (event.key === "ArrowUp") nextIndex = (currentIndex - 1 + items.length) % items.length;
          else if (event.key === "Home") nextIndex = 0;
          else if (event.key === "End") nextIndex = items.length - 1;
          else return;
          event.preventDefault();
          items[nextIndex]?.focus();
        }}
      >
        <p className="app-account-menu-heading" role="presentation">{accountLabel}</p>
        <Link role="menuitem" to="/learners" onClick={closeMenu}>Người học</Link>
        <Link role="menuitem" to="/learner-settings" onClick={closeMenu}>Cài đặt</Link>
      </div>
    </div>
  );
}

export function AppShell({ parentName }: { parentName: string }) {
  return (
    <div className="app-layout">
      <aside className="app-sidebar" aria-label="Thanh điều hướng ứng dụng">
        <Brand />
        <PrimaryNavigation variant="desktop" />
        <AccountMenu parentName={parentName} placement="sidebar" />
      </aside>
      <div className="app-main-column">
        <header className="app-mobile-bar">
          <Brand />
          <AccountMenu parentName={parentName} placement="mobile" />
        </header>
        <Outlet />
        <PrimaryNavigation variant="mobile" />
      </div>
    </div>
  );
}
