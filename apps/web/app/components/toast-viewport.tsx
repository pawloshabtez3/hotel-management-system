"use client";

import { useEffect } from "react";
import { useToastStore, type ToastItem } from "@/app/stores/toast-store";

const toastVariantClass: Record<ToastItem["variant"], string> = {
  info: "border-foreground/15",
  success: "border-emerald-500/35",
  error: "border-red-500/35",
};

export function ToastViewport() {
  const toasts = useToastStore((state) => state.toasts);
  const removeToast = useToastStore((state) => state.removeToast);

  useEffect(() => {
    const timers = toasts.map((toast) => {
      const timeout = window.setTimeout(() => {
        removeToast(toast.id);
      }, toast.durationMs);

      return { id: toast.id, timeout };
    });

    return () => {
      timers.forEach(({ timeout }) => window.clearTimeout(timeout));
    };
  }, [removeToast, toasts]);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex justify-center px-4 md:inset-auto md:right-4 md:top-4 md:w-full md:max-w-sm md:justify-end md:px-0">
      <div className="flex w-full max-w-md flex-col gap-2">
        {toasts.map((toast) => (
          <article
            className={`pointer-events-auto panel rounded-2xl border px-4 py-3 shadow-lg ${toastVariantClass[toast.variant]}`}
            key={toast.id}
            role="status"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">{toast.title}</p>
                {toast.description ? (
                  <p className="mt-1 text-xs text-foreground/70">{toast.description}</p>
                ) : null}
              </div>
              <button
                aria-label="Dismiss notification"
                className="btn-secondary min-h-8 h-8 px-2 text-xs"
                onClick={() => removeToast(toast.id)}
                type="button"
              >
                ✕
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
