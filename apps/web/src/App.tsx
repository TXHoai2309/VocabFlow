import { Link, Navigate, Route, Routes } from "react-router";
import { AppShell } from "./components/app-shell";
import { ToastProvider } from "./components/toast/toast-provider";
import { authClient } from "./features/auth/auth-client";
import { LoginPage } from "./features/auth/login-page";
import { RegisterPage } from "./features/auth/register-page";
import { ActiveLearnerProvider } from "./features/learners/learner-context-provider";
import { useActiveLearner } from "./features/learners/learner-context-hook";
import { AccountLearningState } from "./features/learners/account-learning-state";
import { ProgressPage } from "./features/learners/progress-page";
import { LearnerSettingsPage } from "./features/learners/learner-settings-page";
import { VocabularyListPage } from "./features/learners/vocabulary-list-page";
import { VocabularyDetailPage } from "./features/learners/vocabulary-detail-page";
import { SavedWordsPage } from "./features/learners/saved-words-page";
import { WeakWordsPage } from "./features/learners/weak-words-page";
import { TopicDetailPage, TopicsPage } from "./features/learners/topics-page";
import { ExerciseStudyPage, StudyPage } from "./features/study/study-page";
import { StudySetupPage } from "./features/study/study-setup-page";
import { LearningSetDetailPage, LearningSetsPage } from "./features/learning-sets/learning-sets-page";
import { LearnerLearningSetsPage } from "./features/learning-sets/learner-learning-sets-page";
import { HomePage } from "./features/home/home-page";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <Link className="brand" to="/" aria-label="Trang chủ VocabFlow">
          <span className="brand-mark" aria-hidden="true">V</span>
          <span>VocabFlow</span>
        </Link>
        <nav aria-label="Điều hướng nền tảng">
          <Link to="/foundation">Trang nền tảng</Link>
        </nav>
      </header>
      <main className="app-main">{children}</main>
      <footer className="app-footer">Nền tảng học từ vựng · Đợt 0</footer>
    </div>
  );
}

function FoundationRoute() {
  return (
    <section className="panel" aria-labelledby="foundation-title">
      <Link className="back-link" to="/">← Về trang chủ</Link>
      <p className="eyebrow">Trang con</p>
      <h1 id="foundation-title">Trang nền tảng đang hoạt động.</h1>
      <p>Tải lại địa chỉ này trên bản xem trước để kiểm tra liên kết sâu của ứng dụng.</p>
      <div className="status-row" role="status">
        <span className="status-dot" aria-hidden="true" /> Ranh giới Worker và ứng dụng cùng nguồn đã sẵn sàng
      </div>
    </section>
  );
}

function NotFound() {
  return (
    <section className="panel" aria-labelledby="not-found-title">
      <p className="eyebrow">404</p>
      <h1 id="not-found-title">Trang này hiện chưa khả dụng.</h1>
      <Link className="button primary" to="/">Về trang chủ</Link>
    </section>
  );
}

function AuthenticatedAppShell({ parentName }: { parentName: string }) {
  const { activeLearner, status } = useActiveLearner();
  if (status !== "ready" || !activeLearner) return <AccountLearningState />;
  return <ToastProvider><AppShell parentName={parentName} /></ToastProvider>;
}

function AppShellRoute() {
  const sessionState = authClient.useSession();

  if (sessionState.isPending) {
    return (
      <main className="auth-page" aria-busy="true">
        <section className="auth-card">
          <p className="auth-copy" role="status">Đang kiểm tra phiên đăng nhập…</p>
        </section>
      </main>
    );
  }

  if (sessionState.error) {
    return (
      <main className="auth-page">
        <section className="auth-card" role="alert">
          <h1 className="auth-title">Không thể xác minh phiên đăng nhập</h1>
          <p className="auth-copy">Vui lòng thử lại.</p>
          <button className="auth-retry" type="button" onClick={() => void sessionState.refetch()}>
            Thử lại
          </button>
        </section>
      </main>
    );
  }

  const user = sessionState.data?.user;
  if (!user?.id) return <Navigate to="/login" replace />;

  const parentName = typeof user.name === "string" ? user.name : "";
  return (
    <ActiveLearnerProvider key={user.id} userId={user.id} userName={parentName}>
      <AuthenticatedAppShell parentName={parentName} />
    </ActiveLearnerProvider>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/learners" element={<Navigate to="/" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<AppShellRoute />}>
        <Route path="/progress" element={<ProgressPage />} />
        <Route path="/learner-settings" element={<LearnerSettingsPage />} />
        <Route path="/vocabulary" element={<VocabularyListPage />} />
        <Route path="/vocabulary/:vocabularyId" element={<VocabularyDetailPage />} />
        <Route path="/saved" element={<SavedWordsPage />} />
        <Route path="/weak-words" element={<WeakWordsPage />} />
        <Route path="/topics" element={<TopicsPage />} />
        <Route path="/topics/:topicId" element={<TopicDetailPage />} />
        <Route path="/learning-sets" element={<LearningSetsPage />} />
        <Route path="/learning-sets/assign" element={<LearnerLearningSetsPage />} />
        <Route path="/learning-sets/:learningSetId" element={<LearningSetDetailPage />} />
        <Route path="/study/setup" element={<StudySetupPage />} />
        <Route path="/study" element={<StudyPage />} />
        <Route path="/study/exercises" element={<ExerciseStudyPage />} />
        <Route index element={<HomePage />} />
      </Route>
      <Route path="/foundation" element={<Shell><FoundationRoute /></Shell>} />
      <Route path="*" element={<Shell><NotFound /></Shell>} />
    </Routes>
  );
}

export default function App() {
  return <AppRoutes />;
}
