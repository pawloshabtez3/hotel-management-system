"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/app/stores/auth-store";
import { BookingGateButton } from "./booking-gate-button";
import { LocationSelector } from "./location-selector";

type AppShellProps = {
  children: React.ReactNode;
};

const navItems = [
  { href: "/", label: "Stays" },
  { href: "/dashboard", label: "My bookings" },
  { href: "/admin", label: "Admin" },
];

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <header className="sticky top-4 z-40 mx-auto w-full max-w-7xl px-4 md:px-6">
        <div className="glass-card rounded-3xl px-4 py-3 md:px-5">
          <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent text-surface font-semibold shadow-sm">
              HS
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-sage">Harborstay</p>
              <p className="text-xs text-foreground/70">Hotel booking platform</p>
            </div>
          </div>
          <div className="hidden md:block">
            <LocationSelector />
          </div>
          <div className="flex items-center gap-2">
            <BookingGateButton />
            {user ? (
              <button
                className="btn-secondary px-4 py-2"
                onClick={clearAuth}
                type="button"
              >
                Sign out
              </button>
            ) : (
              <Link className="btn-secondary inline-flex items-center justify-center px-4 py-2" href="/login">
                Login
              </Link>
            )}
          </div>
        </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl gap-6 px-4 py-6 md:px-6 md:py-8">
        <aside className="panel hidden h-fit w-64 shrink-0 rounded-3xl p-4 md:flex md:flex-col md:gap-3">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
                  active ? "bg-accent text-surface shadow-sm" : "panel-soft text-foreground hover:bg-mist"
                }`}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            );
          })}
          <div className="mt-2">
            <LocationSelector />
          </div>
        </aside>

        <main className="w-full">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-foreground/10 bg-surface/95 backdrop-blur md:hidden">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-3 gap-2 px-4 py-2">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                className={`rounded-xl px-3 py-2 text-center text-xs font-semibold ${
                  active ? "bg-accent text-surface" : "text-foreground/70"
                }`}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
