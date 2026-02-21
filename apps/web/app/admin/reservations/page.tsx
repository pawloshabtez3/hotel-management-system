"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { withAdminRoute } from "@/app/lib/auth/withAdminRoute";
import { checkInBooking, checkOutBooking, getAdminBookings } from "@/app/lib/admin-api";
import { useToastStore } from "@/app/stores/toast-store";

function AdminReservationsPage() {
  const queryClient = useQueryClient();
  const addToast = useToastStore((state) => state.addToast);

  const bookingsQuery = useQuery({
    queryKey: ["admin-bookings"],
    queryFn: getAdminBookings,
    refetchInterval: 20_000,
  });

  const checkInMutation = useMutation({
    mutationFn: checkInBooking,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-room-stats"] });
      addToast({ title: "Guest checked in", variant: "success" });
    },
    onError: () => addToast({ title: "Check-in failed", variant: "error" }),
  });

  const checkOutMutation = useMutation({
    mutationFn: checkOutBooking,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-room-stats"] });
      addToast({ title: "Guest checked out", variant: "success" });
    },
    onError: () => addToast({ title: "Check-out failed", variant: "error" }),
  });

  return (
    <main className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold text-gray-900">Reservations</h1>
        <p className="mt-1 text-sm text-gray-600">Monitor booking states and process check-ins/check-outs.</p>
      </header>

      {bookingsQuery.isLoading ? <p className="text-sm text-gray-500">Loading reservations...</p> : null}
      {bookingsQuery.isError ? <p className="text-sm text-red-600">Failed to load reservations.</p> : null}

      <section className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-3 py-2">Guest</th>
              <th className="px-3 py-2">Room</th>
              <th className="px-3 py-2">Dates</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(bookingsQuery.data ?? []).map((booking) => {
              const canCheckIn = booking.status === "CONFIRMED";
              const canCheckOut = booking.status === "CHECKED_IN";

              return (
                <tr key={booking.id} className="border-b border-gray-100">
                  <td className="px-3 py-2 text-gray-700">{booking.user?.email ?? "Guest"}</td>
                  <td className="px-3 py-2 text-gray-700">{booking.room?.type ?? "-"}</td>
                  <td className="px-3 py-2 text-gray-700">
                    {booking.checkIn} → {booking.checkOut}
                  </td>
                  <td className="px-3 py-2 text-gray-700">{booking.status}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => checkInMutation.mutate(booking.id)}
                        className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-400"
                        disabled={!canCheckIn || checkInMutation.isPending || checkOutMutation.isPending}
                      >
                        Check-in
                      </button>
                      <button
                        type="button"
                        onClick={() => checkOutMutation.mutate(booking.id)}
                        className="rounded-md bg-indigo-600 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-400"
                        disabled={!canCheckOut || checkOutMutation.isPending || checkInMutation.isPending}
                      >
                        Check-out
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </main>
  );
}

export default withAdminRoute(AdminReservationsPage);
