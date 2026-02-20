"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/app/stores/auth-store";

export function withAdminRoute<P extends object>(WrappedComponent: React.ComponentType<P>) {
  function ProtectedContent(props: P) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const status = useAuthStore((state) => state.status);
    const user = useAuthStore((state) => state.user);

    useEffect(() => {
      const nextPath = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

      if (status !== "authenticated") {
        router.replace(`/admin/login?next=${encodeURIComponent(nextPath)}`);
        return;
      }

      if (user?.role !== "ROOM_ADMIN") {
        router.replace("/admin/login");
      }
    }, [pathname, router, searchParams, status, user?.role]);

    if (status !== "authenticated" || user?.role !== "ROOM_ADMIN") {
      return (
        <div className="flex min-h-[50vh] items-center justify-center">
          <p className="rounded-full border border-foreground/15 bg-surface px-5 py-2 text-sm text-foreground/70">
            Redirecting to admin login...
          </p>
        </div>
      );
    }

    return <WrappedComponent {...props} />;
  }

  return function AdminProtectedComponent(props: P) {
    return (
      <Suspense
        fallback={
          <div className="flex min-h-[50vh] items-center justify-center">
            <p className="rounded-full border border-foreground/15 bg-surface px-5 py-2 text-sm text-foreground/70">
              Loading admin page...
            </p>
          </div>
        }
      >
        <ProtectedContent {...props} />
      </Suspense>
    );
  };
}
