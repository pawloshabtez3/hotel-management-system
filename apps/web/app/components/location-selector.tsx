"use client";

import { useLocationStore } from "@/app/stores/location-store";

const CITY_OPTIONS = [
  "Addis Ababa",
  "Adama",
  "Bahir Dar",
  "Hawassa",
  "Dire Dawa",
];

export function LocationSelector() {
  const {
    mode,
    selectedCity,
    gpsLabel,
    isLocating,
    setMode,
    setCity,
    startLocating,
    setGpsLabel,
  } = useLocationStore();

  const onUseGps = () => {
    if (!navigator.geolocation) {
      setGpsLabel("GPS unavailable in this browser");
      return;
    }

    startLocating();
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const lat = coords.latitude.toFixed(3);
        const lng = coords.longitude.toFixed(3);
        setGpsLabel(`GPS ${lat}, ${lng}`);
      },
      () => {
        setGpsLabel("GPS access denied");
      },
      {
        timeout: 6000,
      },
    );
  };

  return (
    <div className="panel-soft flex min-w-64 flex-col gap-2 rounded-2xl px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sage">Location</p>
      <div className="flex items-center gap-2">
        <select
          aria-label="Choose city"
          className="input-base"
          disabled={mode === "gps"}
          onChange={(event) => setCity(event.target.value)}
          value={selectedCity}
        >
          {CITY_OPTIONS.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
        <button
          className="btn-secondary px-3 py-2 text-xs"
          onClick={onUseGps}
          type="button"
        >
          {isLocating ? "Locating..." : "Use GPS"}
        </button>
      </div>
      <div className="text-xs text-foreground/65">
        {mode === "gps" && gpsLabel ? gpsLabel : `Manual: ${selectedCity}`}
      </div>
      <div className="flex gap-2 text-[10px] text-foreground/60">
        <button
          className="chip"
          onClick={() => setMode("manual")}
          type="button"
        >
          Manual
        </button>
        <button
          className="chip"
          onClick={() => setMode("gps")}
          type="button"
        >
          GPS
        </button>
      </div>
    </div>
  );
}
