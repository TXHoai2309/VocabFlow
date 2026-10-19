import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { ActiveLearnerContext } from "../learners/learner-context";
import { GUEST_ID, guestLearner, GUEST_STORAGE_EVENT, hasGuestStorageError } from "./guest-store";
import { setGuestCatalogEnabled } from "./learning-fetch";

export function LearningMode({ guest, children }: { guest: boolean; children: ReactNode }) {
  useLayoutEffect(() => {
    setGuestCatalogEnabled(guest);
    return () => setGuestCatalogEnabled(false);
  }, [guest]);
  return children;
}
const noop = () => {};
export function GuestProvider({ children }: { children: ReactNode }) {
  return <ActiveLearnerContext.Provider value={{ userId: GUEST_ID, activeLearner: guestLearner, status: "ready", error: null, retry: noop, setActiveLearner: noop, clearActiveLearner: noop }}>{children}</ActiveLearnerContext.Provider>;
}
export function GuestNotice() {
  const [dismissed, setDismissed] = useState(() => { try { return sessionStorage.getItem("vocabflow.guest-notice.v1") === "dismissed"; } catch { return false; } });
  const [storageError, setStorageError] = useState(hasGuestStorageError);
  useEffect(() => {
    const update = () => setStorageError(hasGuestStorageError());
    window.addEventListener(GUEST_STORAGE_EVENT, update);
    return () => window.removeEventListener(GUEST_STORAGE_EVENT, update);
  }, []);
  if (storageError) return <aside className="guest-notice" role="alert"><strong>Chưa thể lưu tiến độ trên trình duyệt này.</strong><p>Hãy cho phép lưu dữ liệu trang web và kiểm tra dung lượng, rồi thử lại. Tiến độ chỉ được cập nhật khi lưu thành công.</p><Link className="auth-link" to="/register">Đăng ký tài khoản</Link></aside>;
  if (dismissed) return null;
  return <aside className="guest-notice" aria-label="Học không cần tài khoản">
    <div><strong>Bắt đầu học ngay, không cần tài khoản</strong><p>Tiến độ của bạn được lưu trên trình duyệt này. Nên đăng ký để đồng bộ việc học giữa các thiết bị. Tiến độ học khách hiện chưa tự chuyển vào tài khoản; xóa dữ liệu trình duyệt sẽ làm mất tiến độ này.</p></div>
    <div className="guest-notice-actions"><Link className="button primary" to="/register">Đăng ký</Link><button className="button secondary" type="button" onClick={() => { setDismissed(true); try { sessionStorage.setItem("vocabflow.guest-notice.v1", "dismissed"); } catch { /* Dismissal still works in memory. */ } }}>Tiếp tục học</button></div>
  </aside>;
}
