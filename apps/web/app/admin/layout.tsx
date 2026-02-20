"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/app/stores/auth-store";

const adminNav = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/rooms", label: "Rooms" },
  { href: "/admin/reservations", label: "Reservations" },
  { href: "/admin/settings", label: "Settings" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const clearAuth = useAuthStore((state) => state.clearAuth);

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-foreground/10 bg-surface/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-sage">Admin Panel</p>
            <p className="text-sm font-semibold text-foreground">Room Management</p>
          </div>
          <button className="btn-secondary px-4 py-2" onClick={clearAuth} type="button">
            Sign out
          </button>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl gap-6 px-4 py-6 md:px-6">
        <aside className="panel hidden h-fit w-64 shrink-0 rounded-3xl p-4 md:flex md:flex-col md:gap-3">
          {adminNav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
                  active ? "bg-accent text-surface" : "panel-soft text-foreground hover:bg-mist"
                }`}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            );
          })}
        </aside>
        <main className="w-full">{children}</main>
      </div>
    </div>
  );
}
