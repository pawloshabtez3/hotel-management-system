"use client";

import { create } from "zustand";

export type AuthUser = {
  id: string;
  phoneNumber: string;
  role: "CUSTOMER" | "ROOM_ADMIN";
};

type AuthState = {
  user: AuthUser | null;
  token: string | null;
  status: "idle" | "loading" | "authenticated";
  setAuth: (user: AuthUser, token: string) => void;
  clearAuth: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  status: "idle",
  setAuth: (user, token) =>
    set({
      user,
      token,
      status: "authenticated",
    }),
  clearAuth: () =>
    set({
      user: null,
      token: null,
      status: "idle",
    }),
}));
