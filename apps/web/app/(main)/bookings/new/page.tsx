"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import { withProtectedRoute } from "@/app/lib/auth/withProtectedRoute";
import { createBooking, createPaymentStubByBookingId, getHotelDetail } from "@/app/lib/hotels-api";
import { toApiErrorMessage } from "@/app/lib/api-client";

function nightsBetween(checkIn: string, checkOut: string) {
  const inDate = new Date(checkIn);
  const outDate = new Date(checkOut);
  if (Number.isNaN(inDate.getTime()) || Number.isNaN(outDate.getTime())) {
    return 0;
  }

  const ms = outDate.getTime() - inDate.getTime();
  return Math.max(Math.ceil(ms / (24 * 60 * 60 * 1000)), 0);
}

function formatPrice(value: number | string) {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return "$0";
  }
  return `$${parsed.toFixed(0)}`;
}

function NewBookingPageContent() {
  const search = useSearchParams();

  const hotelId = search.get("hotelId") ?? "";
  const roomId = search.get("roomId") ?? "";
  const checkIn = search.get("checkIn") ?? "";
  const checkOut = search.get("checkOut") ?? "";

  const [bookingId, setBookingId] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const bookingNights = useMemo(() => nightsBetween(checkIn, checkOut), [checkIn, checkOut]);

  const hotelQuery = useQuery({
    queryKey: ["booking-hotel", hotelId],
    queryFn: () => getHotelDetail({ id: hotelId, checkIn, checkOut }),
    enabled: Boolean(hotelId),
  });

  const selectedRoom = useMemo(
    () => hotelQuery.data?.rooms.find((room) => room.id === roomId) ?? null,
    [hotelQuery.data?.rooms, roomId],
  );

  const totalPrice = useMemo(() => {
    if (!selectedRoom || bookingNights <= 0) {
      return null;
    }

    return Number(selectedRoom.pricePerNight) * bookingNights;
  }, [bookingNights, selectedRoom]);

  useEffect(() => {
    if (!bookingId) {
      return;
    }

    const payload = JSON.stringify({ bookingId, checkIn, checkOut, generatedAt: new Date().toISOString() });
    void QRCode.toDataURL(payload, { width: 220 }).then((dataUrl) => setQrDataUrl(dataUrl));
  }, [bookingId, checkIn, checkOut]);

  const bookingMutation = useMutation({
    mutationFn: () =>
      createBooking({
        roomId,
        checkIn,
        checkOut,
      }),
  });

  const paymentMutation = useMutation({
    mutationFn: createPaymentStubByBookingId,
    onSuccess: (_paymentData, id) => {
      setBookingId(id);
    },
  });

  const onConfirmAndPay = async () => {
    if (!roomId || !checkIn || !checkOut) {
      return;
    }

    const booking = await bookingMutation.mutateAsync();
    await paymentMutation.mutateAsync(booking.id);
  };

  const hasParams = Boolean(hotelId && roomId && checkIn && checkOut);

  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-foreground/10 bg-surface p-6">
      <p className="text-xs uppercase tracking-[0.2em] text-sage">Booking flow</p>
      <h1 className="text-2xl font-semibold text-foreground">Booking summary</h1>

      {!hasParams ? (
        <div className="rounded-2xl border border-foreground/10 bg-surface-muted px-4 py-3 text-sm text-foreground/70">
          Select a hotel and room first from the discovery page.
        </div>
      ) : null}

      {hotelQuery.isLoading ? (
        <div className="rounded-2xl border border-foreground/10 bg-surface-muted px-4 py-3 text-sm text-foreground/70">
          Loading booking details...
        </div>
      ) : null}

      {hotelQuery.isError ? (
        <div className="rounded-2xl border border-foreground/10 bg-surface-muted px-4 py-3 text-sm text-accent-strong">
          {toApiErrorMessage(hotelQuery.error)}
        </div>
      ) : null}

      {hasParams ? (
        <div className="grid gap-3 rounded-2xl border border-foreground/10 bg-surface-muted p-4 text-sm text-foreground/75">
          <p>
            Hotel: <span className="font-semibold text-foreground">{hotelQuery.data?.name ?? hotelId}</span>
          </p>
          <p>
            Room: <span className="font-semibold text-foreground">{selectedRoom?.type ?? roomId}</span>
          </p>
          <p>
            Dates: <span className="font-semibold text-foreground">{checkIn} → {checkOut}</span>
          </p>
          <p>
            Nights: <span className="font-semibold text-foreground">{bookingNights}</span>
          </p>
          <p>
            Estimated total: <span className="font-semibold text-foreground">{totalPrice ? formatPrice(totalPrice) : "-"}</span>
          </p>
        </div>
      ) : null}

      <button
        className="rounded-full bg-forest px-5 py-3 text-sm font-semibold text-surface disabled:cursor-not-allowed disabled:opacity-50"
        disabled={
          !hasParams ||
          bookingMutation.isPending ||
          paymentMutation.isPending ||
          !selectedRoom ||
          bookingNights <= 0
        }
        onClick={() => void onConfirmAndPay()}
        type="button"
      >
        {bookingMutation.isPending || paymentMutation.isPending
          ? "Processing payment stub..."
          : "Confirm booking and pay (stub)"}
      </button>

      {bookingMutation.isError ? (
        <div className="rounded-2xl border border-foreground/10 bg-surface-muted px-4 py-3 text-sm text-accent-strong">
          {toApiErrorMessage(bookingMutation.error)}
        </div>
      ) : null}

      {paymentMutation.isError ? (
        <div className="rounded-2xl border border-foreground/10 bg-surface-muted px-4 py-3 text-sm text-accent-strong">
          {toApiErrorMessage(paymentMutation.error)}
        </div>
      ) : null}

      {paymentMutation.isSuccess && bookingId ? (
        <div className="grid gap-3 rounded-2xl border border-foreground/10 bg-surface-muted p-4">
          <p className="text-sm font-semibold text-forest">Payment successful (stub)</p>
          <p className="text-xs text-foreground/70">
            Booking ID: {bookingId}. Keep this QR for check-in verification.
          </p>
          {qrDataUrl ? (
            <img alt="Booking QR code" className="h-44 w-44 rounded-xl border border-foreground/10 bg-surface p-2" src={qrDataUrl} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

const ProtectedBookingPage = withProtectedRoute(NewBookingPageContent);

export default function BookingNewPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-2xl border border-foreground/10 bg-surface px-4 py-6 text-sm text-foreground/70">
          Loading booking page...
        </div>
      }
    >
      <ProtectedBookingPage />
    </Suspense>
  );
}
