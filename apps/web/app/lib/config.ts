export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3002";

export const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? API_BASE_URL;

export const AUTH_REFRESH_PATH = process.env.NEXT_PUBLIC_AUTH_REFRESH_PATH ?? "";

export const OTP_RESEND_COOLDOWN_SECONDS = 30;
