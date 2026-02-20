"use client";

import { withProtectedRoute } from "@/app/lib/auth/withProtectedRoute";

function NewBookingPageContent() {
  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-foreground/10 bg-surface p-6">
      <p className="text-xs uppercase tracking-[0.2em] text-sage">Booking flow</p>
      <h1 className="text-2xl font-semibold text-foreground">Create booking</h1>
      <p className="text-sm text-foreground/70">
        You are authenticated. This booking form is the protected Day 4 entry point.
      </p>
      <div className="rounded-2xl border border-foreground/10 bg-surface-muted px-4 py-3 text-sm text-foreground/70">
        Next step: connect hotel search + room selection + create booking request.
      </div>
    </div>
  );
}

export default withProtectedRoute(NewBookingPageContent);
