"use client";

import { Suspense } from "react";
import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/app/stores/auth-store";
import { setAuthRedirect } from "@/app/lib/auth-redirect";

export function withProtectedRoute<P extends object>(WrappedComponent: React.ComponentType<P>) {
  function ProtectedContent(props: P) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const status = useAuthStore((state) => state.status);

    useEffect(() => {
      if (status === "authenticated") {
        return;
      }

      const query = searchParams.toString();
      const nextPath = query ? `${pathname}?${query}` : pathname;
      setAuthRedirect(nextPath);
      router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
    }, [pathname, router, searchParams, status]);

    if (status !== "authenticated") {
      return (
        <div className="flex min-h-[50vh] items-center justify-center">
          <p className="rounded-full border border-foreground/15 bg-surface px-5 py-2 text-sm text-foreground/70">
            Redirecting to secure login...
          </p>
        </div>
      );
    }

    return <WrappedComponent {...props} />;
  }

  function ProtectedComponent(props: P) {
    return (
      <Suspense
        fallback={
          <div className="flex min-h-[50vh] items-center justify-center">
            <p className="rounded-full border border-foreground/15 bg-surface px-5 py-2 text-sm text-foreground/70">
              Loading secure page...
            </p>
          </div>
        }
      >
        <ProtectedContent {...props} />
      </Suspense>
    );
  }

  return ProtectedComponent;
}
