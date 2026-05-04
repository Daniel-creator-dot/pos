"use client";

import { useEffect, useState, useCallback, ReactNode } from "react";
import { CheckCircle, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastProps {
  toast: ToastMessage;
  onRemove: (id: string) => void;
}

function Toast({ toast, onRemove }: ToastProps) {
  const { id, type, title, message } = toast;

  useEffect(() => {
    const duration = toast.duration ?? 4000;
    if (duration > 0) {
      const timer = setTimeout(() => {
        onRemove(id);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [id, toast.duration, onRemove]);

  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
    warning: AlertCircle,
  };

  const styles = {
    success: {
      bg: "bg-green-50",
      border: "border-green-200",
      icon: "text-green-500",
      title: "text-green-800",
      close: "text-green-500 hover:text-green-700",
    },
    error: {
      bg: "bg-red-50",
      border: "border-red-200",
      icon: "text-red-500",
      title: "text-red-800",
      close: "text-red-500 hover:text-red-700",
    },
    info: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      icon: "text-blue-500",
      title: "text-blue-800",
      close: "text-blue-500 hover:text-blue-700",
    },
    warning: {
      bg: "bg-yellow-50",
      border: "border-yellow-200",
      icon: "text-yellow-500",
      title: "text-yellow-800",
      close: "text-yellow-500 hover:text-yellow-700",
    },
  };

  const currentStyle = styles[type];
  const Icon = icons[type];

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg border shadow-md ${currentStyle.bg} ${currentStyle.border} animate-slide-in-right min-w-[300px] max-w-md`}
      role="alert"
    >
      <Icon className={`w-5 h-5 flex-shrink-0 ${currentStyle.icon} mt-0.5`} />
      <div className="flex-1 min-w-0">
        <p className={`font-medium ${currentStyle.title}`}>{title}</p>
        {message && <p className={`text-sm mt-1 ${currentStyle.title} opacity-80`}>{message}</p>}
      </div>
      <button
        onClick={() => onRemove(id)}
        className={`flex-shrink-0 ${currentStyle.close} transition-colors`}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// Toast Container and Context
interface ToastProviderProps {
  children: ReactNode;
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback(
    (type: ToastType, title: string, message?: string, duration?: number) => {
      const id = `${Date.now()}-${Math.random()}`;
      const toast: ToastMessage = { id, type, title, message, duration };
      setToasts((prev) => [...prev, toast]);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback(
    (title: string, message?: string, duration?: number) => {
      addToast("success", title, message, duration);
    },
    [addToast]
  );

  const error = useCallback(
    (title: string, message?: string, duration?: number) => {
      addToast("error", title, message, duration);
    },
    [addToast]
  );

  const info = useCallback(
    (title: string, message?: string, duration?: number) => {
      addToast("info", title, message, duration);
    },
    [addToast]
  );

  const warning = useCallback(
    (title: string, message?: string, duration?: number) => {
      addToast("warning", title, message, duration);
    },
    [addToast]
  );

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    info,
    warning,
  };
}

export function ToastContainer({ toasts, onRemove }: { toasts: ToastMessage[]; onRemove: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[60] flex flex-col gap-2">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

export default Toast;