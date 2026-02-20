"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { withProtectedRoute } from "@/app/lib/auth/withProtectedRoute";
import { getMyBookings } from "@/app/lib/bookings-api";
import { RoomUpdatesListener } from "@/app/components/room-updates-listener";
import { toApiErrorMessage } from "@/app/lib/api-client";

function DashboardPageContent() {
  const bookingsQuery = useQuery({
    queryKey: ["my-bookings"],
    queryFn: getMyBookings,
  });

  const roomIds = useMemo(
    () => (bookingsQuery.data ?? []).map((item) => item.roomId).filter(Boolean),
    [bookingsQuery.data],
  );

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-sage">Dashboard</p>
        <h1 className="mt-2 text-3xl font-semibold text-foreground">My bookings</h1>
      </div>

      <RoomUpdatesListener roomIds={roomIds} />

      {bookingsQuery.isLoading ? (
        <div className="rounded-2xl border border-foreground/10 bg-surface px-4 py-6 text-sm text-foreground/70">
          Loading your bookings...
        </div>
      ) : null}

      {bookingsQuery.isError ? (
        <div className="rounded-2xl border border-foreground/10 bg-surface px-4 py-6 text-sm text-accent-strong">
          {toApiErrorMessage(bookingsQuery.error)}
        </div>
      ) : null}

      {!bookingsQuery.isLoading && !bookingsQuery.isError && (bookingsQuery.data?.length ?? 0) === 0 ? (
        <div className="rounded-2xl border border-foreground/10 bg-surface px-4 py-6 text-sm text-foreground/70">
          No bookings yet. Start by selecting a stay and creating your first reservation.
        </div>
      ) : null}

      {(bookingsQuery.data?.length ?? 0) > 0 ? (
        <div className="grid gap-3">
          {bookingsQuery.data?.map((booking) => (
            <article
              className="rounded-2xl border border-foreground/10 bg-surface px-4 py-4"
              key={booking.id}
            >
              <p className="text-xs uppercase tracking-[0.2em] text-sage">Booking</p>
              <h2 className="mt-1 text-lg font-semibold text-foreground">{booking.id.slice(0, 8)}</h2>
              <div className="mt-2 text-sm text-foreground/70">
                <p>Status: {booking.status}</p>
                <p>
                  Check in: {new Date(booking.checkIn).toLocaleDateString()} | Check out:{" "}
                  {new Date(booking.checkOut).toLocaleDateString()}
                </p>
                <p>Room: {booking.roomId.slice(0, 8)}</p>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default withProtectedRoute(DashboardPageContent);
