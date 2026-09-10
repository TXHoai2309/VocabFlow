import { Link, Route, Routes } from "react-router";
import { LoginPage } from "./features/auth/login-page";
import { RegisterPage } from "./features/auth/register-page";
import { LearnerPage } from "./features/learners/learner-page";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <Link className="brand" to="/" aria-label="VocabFlow home">
          <span className="brand-mark" aria-hidden="true">V</span>
          <span>VocabFlow</span>
        </Link>
        <nav aria-label="Foundation navigation">
          <Link to="/foundation">Foundation route</Link>
        </nav>
      </header>
      <main className="app-main">{children}</main>
      <footer className="app-footer">Family learning foundation · BATCH 0</footer>
    </div>
  );
}

function Home() {
  return (
    <section className="hero" aria-labelledby="home-title">
      <div className="eyebrow">Foundation ready</div>
      <h1 id="home-title">A dependable place to build better learning habits.</h1>
      <p>
        VocabFlow BATCH 0 establishes the shared shell, routing and API boundary that future
        family learning features can build on.
      </p>
      <div className="actions">
        <Link className="button primary" to="/foundation">Open nested route</Link>
        <a className="button secondary" href="/api/health">Check API health</a>
      </div>
    </section>
  );
}

function FoundationRoute() {
  return (
    <section className="panel" aria-labelledby="foundation-title">
      <Link className="back-link" to="/">← Back home</Link>
      <p className="eyebrow">Nested route</p>
      <h1 id="foundation-title">The foundation route is working.</h1>
      <p>Refresh this URL in production preview to verify SPA deep-link behavior.</p>
      <div className="status-row" role="status">
        <span className="status-dot" aria-hidden="true" /> Worker + SPA same-origin boundary ready
      </div>
    </section>
  );
}

function NotFound() {
  return (
    <section className="panel" aria-labelledby="not-found-title">
      <p className="eyebrow">404</p>
      <h1 id="not-found-title">That route is not available yet.</h1>
      <Link className="button primary" to="/">Return home</Link>
    </section>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/learners" element={<LearnerPage />} />
      <Route path="/" element={<Shell><Home /></Shell>} />
      <Route path="/foundation" element={<Shell><FoundationRoute /></Shell>} />
      <Route path="*" element={<Shell><NotFound /></Shell>} />
    </Routes>
  );
}
