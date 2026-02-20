"use client";

import Link from "next/link";
import Image from "next/image";
import type { HotelListItem } from "@/app/lib/types";

type HotelCardProps = {
  hotel: HotelListItem;
  checkIn?: string;
  checkOut?: string;
  listView?: boolean;
};

function getImageUrl(hotelId: string) {
  return `https://picsum.photos/seed/hotel-${hotelId}/800/500`;
}

function formatPrice(value: number | string | null) {
  if (value === null || value === undefined) {
    return "Price unavailable";
  }

  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return "Price unavailable";
  }

  return `$${parsed.toFixed(0)}/night`;
}

export function HotelCard({ hotel, checkIn, checkOut, listView = false }: HotelCardProps) {
  const query = new URLSearchParams();
  if (checkIn) {
    query.set("checkIn", checkIn);
  }
  if (checkOut) {
    query.set("checkOut", checkOut);
  }
  const href = `/hotels/${hotel.id}${query.toString() ? `?${query.toString()}` : ""}`;

  return (
    <article
      className={`panel overflow-hidden rounded-3xl transition-transform duration-200 hover:-translate-y-0.5 ${
        listView ? "flex flex-col md:flex-row" : "flex flex-col"
      }`}
    >
      <Image
        alt={hotel.name}
        className={`${listView ? "h-52 w-full md:h-auto md:w-72" : "h-52 w-full"} object-cover`}
        height={500}
        loading="lazy"
        src={getImageUrl(hotel.id)}
        width={800}
      />
      <div className="flex flex-1 flex-col gap-3 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-sage">{hotel.city}</p>
            <h3 className="mt-1 text-xl font-semibold text-foreground">{hotel.name}</h3>
          </div>
          <span className="rounded-full bg-mist px-3 py-1 text-xs font-semibold text-forest">
            {hotel.rating ? hotel.rating.toFixed(1) : "N/A"}
          </span>
        </div>
        <p className="text-sm text-foreground/70">{hotel.country}</p>
        <div className="mt-auto flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-foreground">{formatPrice(hotel.startingPrice)}</p>
          <Link
            className="btn-primary inline-flex items-center justify-center px-4 py-2"
            href={href}
          >
            View rooms
          </Link>
        </div>
      </div>
    </article>
  );
}
