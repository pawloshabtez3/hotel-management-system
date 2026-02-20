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
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <header className="sticky top-0 z-40 border-b border-foreground/10 bg-surface/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-surface font-semibold">
              HS
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-sage">Harborstay</p>
              <p className="text-[11px] text-foreground/70">Hotel booking platform</p>
            </div>
          </div>
          <div className="hidden md:block">
            <LocationSelector />
          </div>
          <div className="flex items-center gap-2">
            <BookingGateButton />
            {user ? (
              <button
                className="rounded-full border border-foreground/15 px-4 py-2 text-sm font-semibold"
                onClick={clearAuth}
                type="button"
              >
                Sign out
              </button>
            ) : (
              <Link className="rounded-full border border-foreground/15 px-4 py-2 text-sm font-semibold" href="/login">
                Login
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl gap-6 px-4 py-6 md:px-6 md:py-8">
        <aside className="hidden w-64 shrink-0 rounded-3xl border border-foreground/10 bg-surface p-4 md:flex md:flex-col md:gap-3">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
                  active ? "bg-forest text-surface" : "bg-surface-muted text-foreground"
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

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-foreground/10 bg-surface md:hidden">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-3 gap-2 px-4 py-2">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                className={`rounded-xl px-3 py-2 text-center text-xs font-semibold ${
                  active ? "bg-forest text-surface" : "text-foreground/70"
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
