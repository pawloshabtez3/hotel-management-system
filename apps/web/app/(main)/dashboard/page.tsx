"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { HotelCard } from "@/app/components/hotel-card";
import { RatingStars } from "@/app/components/rating-stars";
import { getHotels } from "@/app/lib/hotels-api";
import { toApiErrorMessage } from "@/app/lib/api-client";
import { useDebouncedValue } from "@/app/lib/use-debounced-value";
import { withProtectedRoute } from "@/app/lib/auth/withProtectedRoute";

const PAGE_SIZE = 24;

function DashboardPageContent() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [manualCity, setManualCity] = useState("");
  const [locationReady, setLocationReady] = useState(false);
  const [locationSource, setLocationSource] = useState<"gps" | "manual" | null>(null);
  const [ratingFilter, setRatingFilter] = useState(0);
  const [price, setPrice] = useState(450);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [queryLimit, setQueryLimit] = useState(PAGE_SIZE);
  const [visibleCount, setVisibleCount] = useState(9);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const resetPagination = () => {
    setVisibleCount(9);
    setQueryLimit(PAGE_SIZE);
  };

  const debouncedSearch = useDebouncedValue(search, 300);
  const debouncedCity = useDebouncedValue(city, 300);
  const debouncedPrice = useDebouncedValue(price, 300);

  const hotelsQuery = useQuery({
    enabled: locationReady,
    queryKey: ["dashboard-hotels", debouncedSearch, debouncedCity, debouncedPrice, queryLimit],
    queryFn: () =>
      getHotels({
        q: debouncedSearch,
        city: debouncedCity || undefined,
        minPrice: 1,
        maxPrice: debouncedPrice,
        limit: queryLimit,
      }),
  });

  const filteredHotels = useMemo(
    () =>
      (hotelsQuery.data ?? []).filter((hotel) => {
        const rating = hotel.rating ?? 0;
        return rating >= ratingFilter;
      }),
    [hotelsQuery.data, ratingFilter],
  );

  const visibleHotels = useMemo(
    () => filteredHotels.slice(0, visibleCount),
    [filteredHotels, visibleCount],
  );

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) return;

        setVisibleCount((current) => Math.min(current + 6, filteredHotels.length));

        if (
          visibleCount + 6 >= filteredHotels.length &&
          (hotelsQuery.data?.length ?? 0) >= queryLimit
        ) {
          setQueryLimit((current) => current + PAGE_SIZE);
        }
      },
      { threshold: 0.2 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [filteredHotels.length, hotelsQuery.data?.length, queryLimit, visibleCount]);

  const useGps = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setLocationReady(true);
      setLocationSource("gps");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      () => {
        setLocationReady(true);
        setLocationSource("gps");
      },
      () => {
        setLocationReady(true);
        setLocationSource("gps");
      },
    );
  };

  const useManualCity = () => {
    const normalized = manualCity.trim();
    if (!normalized) return;
    setCity(normalized);
    setLocationReady(true);
    setLocationSource("manual");
  };

  return (
    <div className="flex flex-col gap-6">
      {!locationReady ? (
        <section className="glass-card rounded-3xl p-5 md:p-6">
          <p className="text-[11px] uppercase tracking-[0.24em] text-sage">Location required</p>
          <h1 className="mt-2 text-3xl font-semibold text-foreground md:text-4xl">Find hotels near you</h1>
          <p className="mt-2 text-sm text-foreground/70">
            Choose your location to load nearby hotels automatically.
          </p>
          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
            <button className="btn-primary px-5 py-3" onClick={useGps} type="button">
              Use my current location
            </button>
            <input
              className="input-base"
              onChange={(event) => setManualCity(event.target.value)}
              placeholder="Or enter city manually"
              value={manualCity}
            />
            <button className="btn-secondary px-5 py-3" onClick={useManualCity} type="button">
              Use city
            </button>
          </div>
        </section>
      ) : null}

      <section className="glass-card rounded-3xl p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-sage">Customer Dashboard</p>
            <h1 className="mt-1 text-3xl font-semibold text-foreground md:text-4xl">Discover stays</h1>
            <p className="mt-2 max-w-2xl text-sm text-foreground/70">
              {locationSource === "manual"
                ? `Hotels in ${city}`
                : "Hotels near your selected location"}
            </p>
          </div>
          <div className="flex gap-2">
            <button className={`px-4 py-2 ${viewMode === "grid" ? "btn-primary" : "btn-secondary"}`} onClick={() => setViewMode("grid")} type="button">Grid</button>
            <button className={`px-4 py-2 ${viewMode === "list" ? "btn-primary" : "btn-secondary"}`} onClick={() => setViewMode("list")} type="button">List</button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/60">
            Search
            <input className="input-base mt-2" onChange={(event) => { setSearch(event.target.value); resetPagination(); }} placeholder="Hotel name or keyword" value={search} />
          </label>

          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/60">
            City
            <input className="input-base mt-2" onChange={(event) => { setCity(event.target.value); resetPagination(); }} placeholder="City" value={city} />
          </label>

          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/60">
            Minimum rating
            <select className="input-base mt-2" onChange={(event) => { setRatingFilter(Number(event.target.value)); resetPagination(); }} value={ratingFilter}>
              <option value={0}>All ratings</option>
              <option value={2}>2.0+</option>
              <option value={3}>3.0+</option>
              <option value={4}>4.0+</option>
            </select>
          </label>

          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/60">
            Max nightly price (${price})
            <input className="mt-2 w-full accent-accent" max={600} min={50} onChange={(event) => { setPrice(Number(event.target.value)); resetPagination(); }} step={10} type="range" value={price} />
          </label>

          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/60">
            Check-in
            <input className="input-base mt-2" onChange={(event) => setCheckIn(event.target.value)} type="date" value={checkIn} />
          </label>

          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/60">
            Check-out
            <input className="input-base mt-2" onChange={(event) => setCheckOut(event.target.value)} type="date" value={checkOut} />
          </label>
        </div>
      </section>

      {locationReady && hotelsQuery.isLoading ? <div className="panel rounded-2xl px-4 py-6 text-sm text-foreground/70">Loading hotels...</div> : null}
      {locationReady && hotelsQuery.isError ? <div className="panel rounded-2xl px-4 py-6 text-sm text-accent-strong">{toApiErrorMessage(hotelsQuery.error)}</div> : null}

      {locationReady && !hotelsQuery.isLoading && !hotelsQuery.isError ? (
        <>
          <div className="panel flex items-center justify-between rounded-2xl px-4 py-3 text-sm text-foreground/70">
            <span>Showing {visibleHotels.length} of {filteredHotels.length} stays</span>
            <RatingStars rating={filteredHotels.length ? filteredHotels.reduce((sum, item) => sum + (item.rating ?? 0), 0) / filteredHotels.length : null} />
          </div>

          <section className={viewMode === "grid" ? "grid gap-4 md:grid-cols-2 xl:grid-cols-3" : "grid gap-4"}>
            {visibleHotels.map((hotel) => (
              <HotelCard checkIn={checkIn} checkOut={checkOut} hotel={hotel} key={hotel.id} listView={viewMode === "list"} />
            ))}
          </section>
          <div ref={loadMoreRef} />
          {filteredHotels.length === 0 ? <div className="panel rounded-2xl px-4 py-6 text-sm text-foreground/70">No hotels match this filter set.</div> : null}
        </>
      ) : null}
    </div>
  );
}

export default withProtectedRoute(DashboardPageContent);
