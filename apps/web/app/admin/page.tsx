export default function AdminPage() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-6 py-12">
      <h1 className="text-3xl font-semibold text-foreground">Room Admin</h1>
      <p className="text-sm text-foreground/70">
        This space will host real-time room availability, check-ins, and
        maintenance status updates.
      </p>
    </div>
  );
}
