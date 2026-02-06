export default function LoginPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-sage">Welcome</p>
        <h1 className="mt-2 text-3xl font-semibold text-foreground">
          Sign in with OTP
        </h1>
        <p className="mt-2 text-sm text-foreground/70">
          We will text a one-time password to verify your account.
        </p>
      </div>
      <form className="flex flex-col gap-4">
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/60">
          Phone number
          <input
            className="mt-2 w-full rounded-2xl border border-foreground/15 px-4 py-3 text-sm"
            type="tel"
            placeholder="+234 801 234 5678"
          />
        </label>
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/60">
          OTP code
          <input
            className="mt-2 w-full rounded-2xl border border-foreground/15 px-4 py-3 text-sm"
            type="text"
            placeholder="123456"
          />
        </label>
        <button className="mt-2 rounded-full bg-forest px-6 py-3 text-sm font-semibold text-surface">
          Verify and continue
        </button>
        <button
          className="rounded-full border border-foreground/15 px-6 py-3 text-sm font-semibold text-foreground"
          type="button"
        >
          Send code
        </button>
      </form>
    </div>
  );
}
