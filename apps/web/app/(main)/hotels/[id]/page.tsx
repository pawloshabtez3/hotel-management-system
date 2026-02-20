"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getHotelDetail } from "@/app/lib/hotels-api";
import { toApiErrorMessage } from "@/app/lib/api-client";

function getImageUrls(hotelId: string) {
  return [1, 2, 3].map((index) => `https://picsum.photos/seed/hotel-${hotelId}-${index}/900/600`);
}

function formatMoney(value: string | number) {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return "$0";
  }

  return `$${parsed.toFixed(0)}`;
}

export default function HotelDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();

  const initialCheckIn = searchParams.get("checkIn") ?? "";
  const initialCheckOut = searchParams.get("checkOut") ?? "";

  const [checkIn, setCheckIn] = useState(initialCheckIn);
  const [checkOut, setCheckOut] = useState(initialCheckOut);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  const hotelQuery = useQuery({
    queryKey: ["hotel", params.id, checkIn, checkOut],
    queryFn: () =>
      getHotelDetail({
        id: params.id,
        checkIn: checkIn || undefined,
        checkOut: checkOut || undefined,
      }),
  });

  const selectedRoom = useMemo(
    () => hotelQuery.data?.rooms.find((room) => room.id === selectedRoomId) ?? null,
    [hotelQuery.data?.rooms, selectedRoomId],
  );

  const onContinue = () => {
    if (!selectedRoomId || !checkIn || !checkOut) {
      return;
    }

    const query = new URLSearchParams({
      hotelId: params.id,
      roomId: selectedRoomId,
      checkIn,
      checkOut,
    });

    router.push(`/bookings/new?${query.toString()}`);
  };

  return (
    <div className="flex flex-col gap-5">
      {hotelQuery.isLoading ? (
        <div className="rounded-2xl border border-foreground/10 bg-surface px-4 py-6 text-sm text-foreground/70">
          Loading hotel details...
        </div>
      ) : null}

      {hotelQuery.isError ? (
        <div className="rounded-2xl border border-foreground/10 bg-surface px-4 py-6 text-sm text-accent-strong">
          {toApiErrorMessage(hotelQuery.error)}
        </div>
      ) : null}

      {hotelQuery.data ? (
        <>
          <section className="rounded-3xl border border-foreground/10 bg-surface p-5 shadow-sm md:p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-sage">{hotelQuery.data.city}</p>
            <h1 className="mt-1 text-3xl font-semibold text-foreground">{hotelQuery.data.name}</h1>
            <p className="mt-2 text-sm text-foreground/70">{hotelQuery.data.description ?? "No description available."}</p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {getImageUrls(hotelQuery.data.id).map((url) => (
                <img
                  alt={hotelQuery.data?.name}
                  className="h-44 w-full rounded-2xl object-cover"
                  key={url}
                  src={url}
                />
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-foreground/10 bg-surface p-5 shadow-sm">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/60">
                Check-in
                <input
                  className="mt-2 w-full rounded-2xl border border-foreground/15 px-3 py-2 text-sm"
                  onChange={(event) => setCheckIn(event.target.value)}
                  type="date"
                  value={checkIn}
                />
              </label>
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/60">
                Check-out
                <input
                  className="mt-2 w-full rounded-2xl border border-foreground/15 px-3 py-2 text-sm"
                  onChange={(event) => setCheckOut(event.target.value)}
                  type="date"
                  value={checkOut}
                />
              </label>
            </div>
            <p className="mt-3 text-xs text-foreground/65">
              Rooms listed here reflect availability for your selected dates.
            </p>
          </section>

          <section className="grid gap-3">
            {hotelQuery.data.rooms.map((room) => {
              const selected = selectedRoomId === room.id;
              return (
                <button
                  className={`rounded-2xl border px-4 py-4 text-left ${
                    selected
                      ? "border-forest bg-surface-muted"
                      : "border-foreground/10 bg-surface"
                  }`}
                  key={room.id}
                  onClick={() => setSelectedRoomId(room.id)}
                  type="button"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-sage">{room.type}</p>
                      <p className="mt-1 text-sm text-foreground/70">
                        {room.services?.bedOptions ?? "Flexible bed options"} • Sleeps{" "}
                        {room.services?.sleepsCount ?? 2}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      {formatMoney(room.pricePerNight)}/night
                    </p>
                  </div>
                </button>
              );
            })}

            {hotelQuery.data.rooms.length === 0 ? (
              <div className="rounded-2xl border border-foreground/10 bg-surface px-4 py-6 text-sm text-foreground/70">
                No available rooms for selected dates.
              </div>
            ) : null}
          </section>

          <section className="rounded-3xl border border-foreground/10 bg-surface p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground">Booking summary</h2>
            <p className="mt-2 text-sm text-foreground/70">
              {selectedRoom
                ? `${selectedRoom.type} • ${formatMoney(selectedRoom.pricePerNight)}/night`
                : "Select a room to continue."}
            </p>
            <button
              className="mt-4 rounded-full bg-forest px-5 py-3 text-sm font-semibold text-surface disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!selectedRoom || !checkIn || !checkOut}
              onClick={onContinue}
              type="button"
            >
              Continue to booking
            </button>
          </section>
        </>
      ) : null}
    </div>
  );
}
