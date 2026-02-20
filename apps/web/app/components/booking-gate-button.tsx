"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/app/stores/auth-store";
import { setAuthRedirect } from "@/app/lib/auth-redirect";

export function BookingGateButton() {
  const router = useRouter();
  const status = useAuthStore((state) => state.status);

  const onStartBooking = () => {
    const bookingPath = "/bookings/new";

    if (status === "authenticated") {
      router.push(bookingPath);
      return;
    }

    setAuthRedirect(bookingPath);
    router.push(`/login?next=${encodeURIComponent(bookingPath)}`);
  };

  return (
    <button
      className="rounded-full bg-forest px-4 py-2 text-sm font-semibold text-surface"
      onClick={onStartBooking}
      type="button"
    >
      Start booking
    </button>
  );
}
