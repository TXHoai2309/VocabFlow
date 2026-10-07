import { createContext, useContext } from "react";

export type ToastType = "success" | "info" | "error";

export type ToastContextValue = {
  success: (message: string) => void;
  info: (message: string) => void;
  error: (message: string) => void;
};

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const toast = useContext(ToastContext);
  if (!toast) throw new Error("useToast must be used within ToastProvider");
  return toast;
}
