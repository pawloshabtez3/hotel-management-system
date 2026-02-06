export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-surface px-6 py-12">
      <div className="mx-auto w-full max-w-xl rounded-3xl border border-foreground/10 bg-white p-8 shadow-sm">
        {children}
      </div>
    </div>
  );
}
