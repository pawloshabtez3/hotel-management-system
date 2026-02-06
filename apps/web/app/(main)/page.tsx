export default function HomePage() {
  return (
    <div className="flex flex-col gap-12">
      <section className="grid gap-10 rounded-3xl bg-surface px-8 py-12 shadow-sm md:grid-cols-[1.2fr_0.8fr]">
        <div className="flex flex-col gap-6">
          <p className="text-xs uppercase tracking-[0.3em] text-sage">
            Find your next stay
          </p>
          <h1 className="text-4xl font-semibold leading-tight text-foreground md:text-5xl">
            <span className="font-[var(--font-display)]">
              Reserve rooms that feel like home.
            </span>
          </h1>
          <p className="text-base leading-7 text-foreground/70">
            Browse curated hotels, check live availability, and confirm with secure
            payments. Built for guests and room admins who want clarity.
          </p>
          <div className="flex flex-wrap gap-3">
            <button className="rounded-full bg-forest px-6 py-3 text-sm font-semibold text-surface">
              Explore Lagos
            </button>
            <button className="rounded-full border border-foreground/15 px-6 py-3 text-sm font-semibold text-foreground">
              Learn how it works
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              "Real-time availability",
              "OTP login",
              "Flexible payments",
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-foreground/10 bg-surface-muted px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-forest"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-foreground/10 bg-[#1e2d24] p-6 text-surface">
            <p className="text-xs uppercase tracking-[0.2em] text-[#b9c8b5]">
              Today
            </p>
            <p className="mt-3 text-2xl font-semibold">12 rooms available</p>
            <p className="mt-2 text-sm text-[#cdd8c9]">
              Harbor Vista Hotel, Victoria Island
            </p>
          </div>
          <div className="rounded-2xl border border-foreground/10 bg-surface p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-sage">
              Next check-in
            </p>
            <p className="mt-3 text-2xl font-semibold">2:00 PM</p>
            <p className="mt-2 text-sm text-foreground/70">
              Deluxe suite with breakfast included
            </p>
            <button className="mt-6 w-full rounded-full bg-accent px-4 py-2 text-sm font-semibold text-surface">
              Reserve a room
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {["Harbor Vista", "City Garden", "Palm House"].map((name) => (
          <article
            key={name}
            className="rounded-3xl border border-foreground/10 bg-surface p-6 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-sage">
                  {name}
                </p>
                <h3 className="mt-2 text-xl font-semibold">From $85/night</h3>
              </div>
              <span className="rounded-full bg-mist px-3 py-1 text-xs font-semibold text-forest">
                4.8
              </span>
            </div>
            <p className="mt-4 text-sm text-foreground/70">
              Waterfront views, spa access, and flexible check-in windows.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 text-xs text-foreground/60">
              <span className="rounded-full border border-foreground/10 px-3 py-1">
                Breakfast
              </span>
              <span className="rounded-full border border-foreground/10 px-3 py-1">
                Wi-Fi
              </span>
              <span className="rounded-full border border-foreground/10 px-3 py-1">
                Pool
              </span>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
