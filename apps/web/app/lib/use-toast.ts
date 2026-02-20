"use client";

import { useToastStore } from "@/app/stores/toast-store";

type ToastInput = {
  title: string;
  description?: string;
  durationMs?: number;
};

export function useToast() {
  const addToast = useToastStore((state) => state.addToast);

  return {
    info: (input: ToastInput) => addToast({ variant: "info", ...input }),
    success: (input: ToastInput) => addToast({ variant: "success", ...input }),
    error: (input: ToastInput) => addToast({ variant: "error", ...input }),
  };
}
