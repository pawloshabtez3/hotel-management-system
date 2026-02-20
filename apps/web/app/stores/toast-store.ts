"use client";

import { create } from "zustand";

export type ToastVariant = "info" | "success" | "error";

export type ToastItem = {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  durationMs: number;
};

type ToastState = {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, "id" | "durationMs"> & { durationMs?: number }) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
};

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = createId();
    const nextToast: ToastItem = {
      id,
      variant: toast.variant,
      title: toast.title,
      description: toast.description,
      durationMs: toast.durationMs ?? 3500,
    };

    set((state) => ({
      toasts: [...state.toasts, nextToast],
    }));

    return id;
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),
  clearToasts: () => set({ toasts: [] }),
}));
