"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  checkInBooking,
  checkOutBooking,
  getAdminBookings,
  getAdminRooms,
  getAdminRoomStats,
  updateRoomStatus,
} from "@/app/lib/admin-api";
import type { AdminRoomItem, RoomStatus } from "@/app/lib/types";
import { withProtectedRoute } from "@/app/lib/auth/withProtectedRoute";
import { toApiErrorMessage } from "@/app/lib/api-client";
import { RoomUpdatesListener } from "@/app/components/room-updates-listener";
import { useAuthStore } from "@/app/stores/auth-store";

const STATUS_OPTIONS: Array<{ label: string; value: RoomStatus }> = [
  { label: "Available", value: "AVAILABLE" },
  { label: "Occupied", value: "OCCUPIED" },
  { label: "Cleaning", value: "UNAVAILABLE" },
];

function AdminPageContent() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const statsQuery = useQuery({
    queryKey: ["admin-room-stats"],
    queryFn: () => getAdminRoomStats(),
  });

  const roomsQuery = useQuery({
    queryKey: ["admin-rooms"],
    queryFn: () => getAdminRooms(),
  });

  const bookingsQuery = useQuery({
    queryKey: ["admin-bookings"],
    queryFn: getAdminBookings,
  });

  const roomIds = useMemo(() => (roomsQuery.data ?? []).map((room) => room.id), [roomsQuery.data]);
  const selectedRoom = useMemo(
    () => (roomsQuery.data ?? []).find((room) => room.id === selectedRoomId) ?? null,
    [roomsQuery.data, selectedRoomId],
  );

  const updateStatusMutation = useMutation({
    mutationFn: ({ roomId, status }: { roomId: string; status: RoomStatus }) => updateRoomStatus(roomId, status),
    onMutate: async ({ roomId, status }) => {
      setMessage(null);
      await queryClient.cancelQueries({ queryKey: ["admin-rooms"] });
      const previousRooms = queryClient.getQueryData<AdminRoomItem[]>(["admin-rooms"]);

      queryClient.setQueryData<AdminRoomItem[]>(["admin-rooms"], (current = []) =>
        current.map((room) => (room.id === roomId ? { ...room, status } : room)),
      );

      return { previousRooms };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousRooms) {
        queryClient.setQueryData(["admin-rooms"], context.previousRooms);
      }
      setMessage("Status update failed. Please retry.");
    },
    onSuccess: () => {
      setMessage("Room status updated.");
      void queryClient.invalidateQueries({ queryKey: ["admin-rooms"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-room-stats"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
    },
  });

  const checkInMutation = useMutation({
    mutationFn: (bookingId: string) => checkInBooking(bookingId),
    onSuccess: () => {
      setMessage("Guest checked in successfully.");
      void queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-rooms"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-room-stats"] });
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: (bookingId: string) => checkOutBooking(bookingId),
    onSuccess: () => {
      setMessage("Guest checked out successfully.");
      void queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-rooms"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-room-stats"] });
    },
  });

  if (user?.role !== "ROOM_ADMIN") {
    return (
      <div className="rounded-3xl border border-foreground/10 bg-surface p-6 text-sm text-foreground/70">
        This page is available to room admins only.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 pb-28 md:pb-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-sage">Admin</p>
        <h1 className="mt-2 text-3xl font-semibold text-foreground">Room Operations</h1>
      </div>

      <RoomUpdatesListener
        roomIds={roomIds}
        resyncQueryKeys={[["admin-rooms"], ["admin-room-stats"], ["admin-bookings"]]}
      />

      {statsQuery.data ? (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Total rooms" value={String(statsQuery.data.total)} />
          <StatCard label="Available" value={String(statsQuery.data.available)} />
          <StatCard label="Reserved" value={String(statsQuery.data.reserved)} />
          <StatCard label="Occupied" value={String(statsQuery.data.occupied)} />
          <StatCard label="Occupancy" value={`${statsQuery.data.occupancyRate}%`} />
        </section>
      ) : null}

      {statsQuery.isError ? (
        <p className="rounded-2xl border border-foreground/10 bg-surface px-4 py-3 text-sm text-accent-strong">
          {toApiErrorMessage(statsQuery.error)}
        </p>
      ) : null}

      <section className="rounded-3xl border border-foreground/10 bg-surface p-4 md:p-5">
        <h2 className="text-lg font-semibold text-foreground">Room status grid</h2>
        <p className="mt-1 text-sm text-foreground/70">Tap a room to manage status quickly.</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {(roomsQuery.data ?? []).map((room) => (
            <button
              className={`rounded-2xl border px-4 py-4 text-left ${
                room.id === selectedRoomId
                  ? "border-forest bg-surface-muted"
                  : "border-foreground/10 bg-surface"
              }`}
              key={room.id}
              onClick={() => setSelectedRoomId(room.id)}
              type="button"
            >
              <p className="text-xs uppercase tracking-[0.2em] text-sage">{room.hotel.name}</p>
              <p className="mt-1 text-base font-semibold text-foreground">{room.type}</p>
              <p className="mt-1 text-sm text-foreground/70">{room.hotel.city}</p>
              <p className="mt-2 text-xs font-semibold text-foreground/70">Status: {room.status}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-foreground/10 bg-surface p-4 md:p-5">
        <h2 className="text-lg font-semibold text-foreground">Check-in / Check-out</h2>
        <div className="mt-3 grid gap-3">
          {(bookingsQuery.data ?? []).slice(0, 8).map((booking) => (
            <article className="rounded-2xl border border-foreground/10 bg-surface-muted px-4 py-3" key={booking.id}>
              <p className="text-xs uppercase tracking-[0.2em] text-sage">Booking {booking.id.slice(0, 8)}</p>
              <p className="mt-1 text-sm text-foreground/70">Guest: {booking.user?.email ?? "N/A"}</p>
              <p className="text-sm text-foreground/70">Room: {booking.room?.type ?? booking.roomId.slice(0, 8)}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  className="rounded-full border border-foreground/15 px-4 py-2 text-sm font-semibold"
                  onClick={() => checkInMutation.mutate(booking.id)}
                  type="button"
                >
                  Check in
                </button>
                <button
                  className="rounded-full border border-foreground/15 px-4 py-2 text-sm font-semibold"
                  onClick={() => checkOutMutation.mutate(booking.id)}
                  type="button"
                >
                  Check out
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {message ? <p className="text-sm text-forest">{message}</p> : null}

      {selectedRoom ? (
        <section className="fixed inset-x-0 bottom-0 z-40 border-t border-foreground/10 bg-surface px-4 py-4 md:static md:rounded-3xl md:border md:px-5">
          <p className="text-xs uppercase tracking-[0.2em] text-sage">Selected room</p>
          <p className="mt-1 text-sm font-semibold text-foreground">{selectedRoom.hotel.name} • {selectedRoom.type}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((option) => (
              <button
                className="min-h-11 rounded-full border border-foreground/15 px-4 text-sm font-semibold"
                key={option.value}
                onClick={() =>
                  updateStatusMutation.mutate({
                    roomId: selectedRoom.id,
                    status: option.value,
                  })
                }
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl border border-foreground/10 bg-surface px-4 py-4">
      <p className="text-xs uppercase tracking-[0.2em] text-sage">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
    </article>
  );
}

export default withProtectedRoute(AdminPageContent);
