"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { sendOtp, verifyOtp } from "@/app/lib/auth-api";
import { consumeAuthRedirect, setAuthRedirect } from "@/app/lib/auth-redirect";
import { maskEmail, normalizeEmail } from "@/app/lib/auth-utils";
import { OTP_RESEND_COOLDOWN_SECONDS } from "@/app/lib/config";
import { toApiErrorMessage } from "@/app/lib/api-client";
import { useAuthStore } from "@/app/stores/auth-store";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="panel flex min-h-[30vh] items-center justify-center rounded-2xl text-sm text-foreground/70">
          Loading login...
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((state) => state.setAuth);
  const pendingEmail = useAuthStore((state) => state.pendingEmail);
  const setPendingEmail = useAuthStore((state) => state.setPendingEmail);
  const setOtpStatus = useAuthStore((state) => state.setOtpStatus);
  const setStatus = useAuthStore((state) => state.setStatus);

  const [email, setEmail] = useState(pendingEmail ?? "");
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const nextPath = useMemo(() => {
    const next = searchParams.get("next");
    if (!next) {
      return "/bookings/new";
    }

    return next.startsWith("/") ? next : "/bookings/new";
  }, [searchParams]);

  useEffect(() => {
    setAuthRedirect(nextPath);
  }, [nextPath]);

  useEffect(() => {
    if (!cooldown) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setCooldown((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => window.clearTimeout(timeout);
  }, [cooldown]);

  const sendOtpMutation = useMutation({
    mutationFn: sendOtp,
    onMutate: () => {
      setErrorMessage(null);
      setMessage(null);
      setOtpStatus("sending");
    },
    onSuccess: (payload) => {
      const normalized = normalizeEmail(email);
      setPendingEmail(normalized);

      if (payload.emailSent) {
        setCooldown(OTP_RESEND_COOLDOWN_SECONDS);
        setMessage("If this email is valid, a one-time code has been sent.");
      } else {
        setCooldown(0);
        if (payload.devOtp) {
          setMessage(`Email delivery is unavailable in development. Use OTP: ${payload.devOtp}`);
        } else {
          setErrorMessage("Unable to send email code right now. Please try again shortly.");
        }
      }

      setOtpStatus("idle");
    },
    onError: (error) => {
      setOtpStatus("idle");
      setErrorMessage(toApiErrorMessage(error));
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: ({ email, code }: { email: string; code: string }) => verifyOtp(email, code),
    onMutate: () => {
      setErrorMessage(null);
      setMessage(null);
      setOtpStatus("verifying");
      setStatus("loading");
    },
    onSuccess: (payload) => {
      setAuth(payload.user, payload.accessToken);
      setStatus("authenticated");
      setMessage("Login successful. Redirecting...");
      const redirectPath = consumeAuthRedirect(nextPath);
      router.replace(redirectPath);
    },
    onError: () => {
      setOtpStatus("idle");
      setStatus("idle");
      setErrorMessage("Verification failed. Check the code and try again.");
    },
  });

  const normalizedEmail = normalizeEmail(email);
  const canSendOtp = normalizedEmail.includes("@") && cooldown === 0;
  const canVerify = otp.trim().length === 6 && normalizedEmail.includes("@");

  const onSendCode = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSendOtp) {
      return;
    }

    void sendOtpMutation.mutateAsync(normalizedEmail);
  };

  const onVerifyCode = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canVerify) {
      return;
    }

    void verifyOtpMutation.mutateAsync({
      email: normalizedEmail,
      code: otp.trim(),
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-[11px] uppercase tracking-[0.3em] text-sage">Secure access</p>
        <h1 className="mt-2 text-3xl font-semibold text-foreground md:text-4xl">Sign in with email OTP</h1>
        <p className="mt-2 text-sm text-foreground/70">
          Authentication is requested only when you start a booking.
        </p>
      </div>

      <form className="flex flex-col gap-4" onSubmit={onVerifyCode}>
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/60">
          Email
          <input
            className="input-base mt-2"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            type="email"
            value={email}
          />
        </label>

        <button
          className="btn-secondary px-6 py-3 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!canSendOtp || sendOtpMutation.isPending}
          onClick={onSendCode}
          type="button"
        >
          {sendOtpMutation.isPending
            ? "Sending code..."
            : cooldown > 0
              ? `Resend in ${cooldown}s`
              : "Send code"}
        </button>

        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/60">
          OTP code
          <input
            className="input-base mt-2"
            inputMode="numeric"
            maxLength={6}
            onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))}
            placeholder="123456"
            type="text"
            value={otp}
          />
        </label>

        <button
          className="btn-primary mt-2 px-6 py-3 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!canVerify || verifyOtpMutation.isPending}
          type="submit"
        >
          {verifyOtpMutation.isPending ? "Verifying..." : "Verify and continue"}
        </button>
      </form>

      <div className="panel-soft rounded-2xl px-4 py-3 text-xs text-foreground/70">
        {pendingEmail
          ? `Code sent to ${maskEmail(pendingEmail)} (expires shortly).`
          : "For privacy, we use generic auth responses and do not disclose account status."}
      </div>

      {message ? <p className="text-sm font-semibold text-accent-strong">{message}</p> : null}
      {errorMessage ? <p className="text-sm text-accent-strong">{errorMessage}</p> : null}
    </div>
  );
}
