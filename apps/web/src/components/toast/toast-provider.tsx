import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ToastContext, type ToastContextValue, type ToastType } from "./toast-context";

type ToastMessage = {
  id: number;
  type: ToastType;
  message: string;
};

const MAX_VISIBLE_TOASTS = 3;
const TOAST_DURATIONS: Record<ToastType, number> = { success: 4000, info: 4000, error: 6500 };

function ToastIcon({ type }: { type: ToastType }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {type === "success" ? <><path d="M5 12.5 9.5 17 19 7.5" /><circle cx="12" cy="12" r="10" /></> : null}
      {type === "info" ? <><circle cx="12" cy="12" r="10" /><path d="M12 11v5m0-8h.01" /></> : null}
      {type === "error" ? <><circle cx="12" cy="12" r="10" /><path d="m9 9 6 6m0-6-6 6" /></> : null}
    </svg>
  );
}

function CloseIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="m6 6 12 12M18 6 6 18" /></svg>;
}

function Toast({ item, onDismiss }: { item: ToastMessage; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(item.id), TOAST_DURATIONS[item.type]);
    return () => window.clearTimeout(timer);
  }, [item.id, item.type, onDismiss]);

  const isError = item.type === "error";
  return (
    <div className={`toast toast-${item.type}`} data-testid={`toast-${item.type}`} role={isError ? "alert" : "status"} aria-live={isError ? "assertive" : "polite"}>
      <span className="toast-icon"><ToastIcon type={item.type} /></span>
      <p className="toast-message">{item.message}</p>
      <button className="toast-close" type="button" aria-label="Đóng thông báo" onClick={() => onDismiss(item.id)}><CloseIcon /></button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastMessage[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const push = useCallback((type: ToastType, message: string) => {
    const normalizedMessage = message.trim();
    if (!normalizedMessage) return;
    const item = { id: ++nextId.current, type, message: normalizedMessage };
    setItems((current) => [...current.filter((existing) => existing.type !== type || existing.message !== normalizedMessage), item].slice(-MAX_VISIBLE_TOASTS));
  }, []);

  const value = useMemo<ToastContextValue>(() => ({
    success: (message) => push("success", message),
    info: (message) => push("info", message),
    error: (message) => push("error", message)
  }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-viewport" data-testid="toast-viewport">
        {items.slice().reverse().map((item) => <Toast key={item.id} item={item} onDismiss={dismiss} />)}
      </div>
    </ToastContext.Provider>
  );
}
