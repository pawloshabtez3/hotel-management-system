export default function OfflinePage() {
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-sage">Offline</p>
      <h1 className="text-3xl font-semibold text-foreground">You are currently offline</h1>
      <p className="text-sm text-foreground/70">
        Reconnect to continue syncing room updates and booking operations.
      </p>
    </div>
  );
}
