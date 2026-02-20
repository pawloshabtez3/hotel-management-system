"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { queryClient } from "./lib/query-client";
import { connectSocket, disconnectSocket } from "./lib/socket-client";
import { useAuthStore } from "./stores/auth-store";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const status = useAuthStore((state) => state.status);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!("serviceWorker" in navigator)) {
      return;
    }

    void navigator.serviceWorker.register("/sw.js").catch(() => {
      // silently ignore in dev
    });
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      connectSocket();
      return;
    }

    disconnectSocket();
  }, [status]);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
