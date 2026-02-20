"use client";

import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { API_BASE_URL, AUTH_REFRESH_PATH } from "./config";
import { useAuthStore } from "@/app/stores/auth-store";

type RetriableRequest = InternalAxiosRequestConfig & { _retry?: boolean };

function redirectToLogin() {
  if (typeof window === "undefined") {
    return;
  }

  const path = `${window.location.pathname}${window.location.search}`;
  const next = encodeURIComponent(path || "/bookings/new");

  if (window.location.pathname.startsWith("/admin")) {
    window.location.href = `/admin/login?next=${next}`;
    return;
  }

  window.location.href = `/login?next=${next}`;
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  withCredentials: true,
});

let refreshPromise: Promise<string | null> | null = null;

async function tryRefreshAccessToken() {
  if (!AUTH_REFRESH_PATH) {
    return null;
  }

  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post<{ accessToken?: string }>(AUTH_REFRESH_PATH)
      .then((response) => response.data?.accessToken ?? null)
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const config = error.config as RetriableRequest | undefined;

    if (status === 401 && config && !config._retry) {
      config._retry = true;

      const refreshedToken = await tryRefreshAccessToken();
      if (refreshedToken) {
        useAuthStore.getState().setToken(refreshedToken);
        const headers = axios.AxiosHeaders.from(config.headers ?? {});
        headers.set("Authorization", `Bearer ${refreshedToken}`);
        config.headers = headers;
        return apiClient(config);
      }

      useAuthStore.getState().clearAuth();
      redirectToLogin();
    }

    return Promise.reject(error);
  },
);

export function toApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data =
      error.response?.data && typeof error.response.data === "object"
        ? (error.response.data as { message?: string | string[] })
        : null;
    const message =
      data && "message" in data ? data.message : null;

    if (Array.isArray(message) && message.length > 0) {
      return String(message[0]);
    }

    if (typeof message === "string" && message.length > 0) {
      return message;
    }

    if (typeof error.message === "string" && error.message.length > 0) {
      return error.message;
    }
  }

  return "Something went wrong. Please try again.";
}
