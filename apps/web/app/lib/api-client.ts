"use client";

import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { API_BASE_URL } from "./config";
import { useAuthStore } from "@/app/stores/auth-store";

type RetriableRequest = InternalAxiosRequestConfig & { _retry?: boolean };

function redirectToLogin() {
  if (typeof window === "undefined") {
    return;
  }

  const path = `${window.location.pathname}${window.location.search}`;
  const next = encodeURIComponent(path || "/bookings/new");
  window.location.href = `/login?next=${next}`;
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status;
    const config = error.config as RetriableRequest | undefined;

    if (status === 401 && config && !config._retry) {
      config._retry = true;
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
