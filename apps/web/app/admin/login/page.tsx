"use client";

import { Suspense, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { adminLogin } from "@/app/lib/auth-api";
import { useAuthStore } from "@/app/stores/auth-store";
import { toApiErrorMessage } from "@/app/lib/api-client";
import { useToast } from "@/app/lib/use-toast";

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((state) => state.setAuth);
  const setStatus = useAuthStore((state) => state.setStatus);
  const toast = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const nextPath = useMemo(() => {
    const next = searchParams.get("next");
    if (!next) return "/admin/dashboard";
    return next.startsWith("/admin") ? next : "/admin/dashboard";
  }, [searchParams]);

  const loginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => adminLogin(email, password),
    onMutate: () => setStatus("loading"),
    onSuccess: (payload) => {
      setAuth(payload.user, payload.accessToken);
      setStatus("authenticated");
      toast.success({ title: "Admin login successful" });
      router.replace(nextPath);
    },
    onError: (error) => {
      setStatus("idle");
      toast.error({ title: "Admin login failed", description: toApiErrorMessage(error) });
    },
  });

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-6 py-12">
      <div>
        <p className="text-[11px] uppercase tracking-[0.24em] text-sage">Admin Access</p>
        <h1 className="mt-2 text-3xl font-semibold text-foreground">Sign in</h1>
      </div>

      <form
        className="panel rounded-3xl p-5"
        onSubmit={(event) => {
          event.preventDefault();
          void loginMutation.mutateAsync({ email: email.trim().toLowerCase(), password });
        }}
      >
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/60">
          Email
          <input className="input-base mt-2" onChange={(e) => setEmail(e.target.value)} type="email" value={email} />
        </label>

        <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.2em] text-foreground/60">
          Password
          <input
            className="input-base mt-2"
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            value={password}
          />
        </label>

        <button className="btn-primary mt-5 w-full px-6 py-3" disabled={loginMutation.isPending} type="submit">
          {loginMutation.isPending ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center px-6">Loading...</div>}>
      <AdminLoginForm />
    </Suspense>
  );
}
