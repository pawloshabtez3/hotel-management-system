export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-foreground/10 bg-surface/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-surface font-semibold">
              HS
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-sage">
                Harborstay
              </p>
              <p className="text-xs text-foreground/70">Hotel booking platform</p>
            </div>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-foreground/70 md:flex">
            <a className="hover:text-foreground" href="/">
              Stays
            </a>
            <a className="hover:text-foreground" href="/admin">
              Admin
            </a>
            <a className="hover:text-foreground" href="/login">
              Login
            </a>
          </nav>
          <a
            className="rounded-full bg-forest px-4 py-2 text-sm font-semibold text-surface"
            href="/login"
          >
            Start booking
          </a>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-6 py-10">{children}</main>
      <footer className="border-t border-foreground/10 py-8 text-center text-xs text-foreground/60">
        Harborstay. Crafted for calm stays and clear schedules.
      </footer>
    </div>
  );
}
