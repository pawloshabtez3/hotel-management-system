"use client";

import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { withAdminRoute } from "@/app/lib/auth/withAdminRoute";
import { getAdminSettings, updateAdminSettings } from "@/app/lib/admin-api";
import { useToastStore } from "@/app/stores/toast-store";

function AdminSettingsPage() {
  const addToast = useToastStore((state) => state.addToast);
  const settingsQuery = useQuery({
    queryKey: ["admin-settings"],
    queryFn: getAdminSettings,
  });

  const [hotelName, setHotelName] = useState("");
  const [location, setLocation] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [roomTypes, setRoomTypes] = useState("Single,Double,Suite");
  const [allowPayLater, setAllowPayLater] = useState(true);

  useEffect(() => {
    if (!settingsQuery.data) return;
    setHotelName(settingsQuery.data.hotel?.name ?? "");
    setLocation(settingsQuery.data.hotel?.address ?? "");
    setCity(settingsQuery.data.hotel?.city ?? "");
    setCountry(settingsQuery.data.hotel?.country ?? "");
    setRoomTypes((settingsQuery.data.roomTypes ?? []).join(","));
    setAllowPayLater(Boolean(settingsQuery.data.allowPayLater));
  }, [settingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: updateAdminSettings,
    onSuccess: () => addToast({ title: "Settings updated", variant: "success" }),
    onError: () => addToast({ title: "Failed to update settings", variant: "error" }),
  });

  function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveMutation.mutate({
      hotelName,
      location,
      city,
      country,
      roomTypes: roomTypes
        .split(",")
        .map((roomType) => roomType.trim())
        .filter(Boolean),
      allowPayLater,
    });
  }

  return (
    <main className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold text-gray-900">Hotel Settings</h1>
        <p className="mt-1 text-sm text-gray-600">Manage hotel profile and booking preferences.</p>
      </header>

      {settingsQuery.isLoading ? <p className="text-sm text-gray-500">Loading settings...</p> : null}
      {settingsQuery.isError ? <p className="text-sm text-red-600">Failed to load settings.</p> : null}

      <form onSubmit={onSave} className="grid gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-sm font-medium text-gray-700">Hotel name</span>
          <input
            value={hotelName}
            onChange={(event) => setHotelName(event.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </label>

        <label className="space-y-1">
          <span className="text-sm font-medium text-gray-700">Location</span>
          <input
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </label>

        <label className="space-y-1">
          <span className="text-sm font-medium text-gray-700">City</span>
          <input
            value={city}
            onChange={(event) => setCity(event.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </label>

        <label className="space-y-1">
          <span className="text-sm font-medium text-gray-700">Country</span>
          <input
            value={country}
            onChange={(event) => setCountry(event.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </label>

        <label className="space-y-1 sm:col-span-2">
          <span className="text-sm font-medium text-gray-700">Room types (comma separated)</span>
          <input
            value={roomTypes}
            onChange={(event) => setRoomTypes(event.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </label>

        <label className="flex items-center gap-2 sm:col-span-2">
          <input
            type="checkbox"
            checked={allowPayLater}
            onChange={(event) => setAllowPayLater(event.target.checked)}
            className="h-4 w-4"
          />
          <span className="text-sm text-gray-700">Allow pay later</span>
        </label>

        <div className="sm:col-span-2">
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? "Saving..." : "Save settings"}
          </button>
        </div>
      </form>
    </main>
  );
}

export default withAdminRoute(AdminSettingsPage);
