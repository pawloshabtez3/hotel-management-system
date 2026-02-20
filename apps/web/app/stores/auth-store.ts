"use client";

import { create } from "zustand";
import type { AuthUser } from "@/app/lib/types";

type AuthState = {
  user: AuthUser | null;
  token: string | null;
  pendingEmail: string | null;
  status: "idle" | "loading" | "authenticated";
  otpStatus: "idle" | "sending" | "verifying";
  setAuth: (user: AuthUser, token: string) => void;
  setPendingEmail: (email: string | null) => void;
  setStatus: (status: AuthState["status"]) => void;
  setOtpStatus: (status: AuthState["otpStatus"]) => void;
  clearAuth: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  pendingEmail: null,
  status: "idle",
  otpStatus: "idle",
  setAuth: (user, token) =>
    set({
      user,
      token,
      pendingEmail: null,
      otpStatus: "idle",
      status: "authenticated",
    }),
  setPendingEmail: (email) => set({ pendingEmail: email }),
  setStatus: (status) => set({ status }),
  setOtpStatus: (otpStatus) => set({ otpStatus }),
  clearAuth: () =>
    set({
      user: null,
      token: null,
      pendingEmail: null,
      otpStatus: "idle",
      status: "idle",
    }),
}));
