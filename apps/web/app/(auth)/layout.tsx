export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background px-6 py-12">
      <div className="glass-card mx-auto w-full max-w-xl rounded-3xl p-8">
        {children}
      </div>
    </div>
  );
}
