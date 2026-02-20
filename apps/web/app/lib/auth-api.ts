import { apiClient } from "./api-client";
import type { AdminLoginResponse, AuthMeResponse, SendOtpResponse, VerifyOtpResponse } from "./types";

export async function sendOtp(email: string) {
  const { data } = await apiClient.post<SendOtpResponse>("/auth/otp/send", { email });
  return data;
}

export async function verifyOtp(email: string, code: string) {
  const { data } = await apiClient.post<VerifyOtpResponse>("/auth/otp/verify", {
    email,
    code,
  });
  return data;
}

export async function getMe() {
  const { data } = await apiClient.get<AuthMeResponse>("/auth/me");
  return data;
}

export async function adminLogin(email: string, password: string) {
  const { data } = await apiClient.post<AdminLoginResponse>("/auth/admin/login", {
    email,
    password,
  });
  return data;
}
