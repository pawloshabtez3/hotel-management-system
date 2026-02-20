"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { withAdminRoute } from "@/app/lib/auth/withAdminRoute";
import { getRoomStats } from "@/app/lib/admin-api";

function AdminDashboardPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-room-stats"],
    queryFn: getRoomStats,
    refetchInterval: 30_000,
  });

  const cards = useMemo(
    () => [
      { label: "Total Rooms", value: data?.totalRooms ?? 0 },
      { label: "Available", value: data?.available ?? 0 },
      { label: "Reserved", value: data?.reserved ?? 0 },
      { label: "Occupied", value: data?.occupied ?? 0 },
      { label: "Check-ins Today", value: data?.todayCheckIns ?? 0 },
      { label: "Check-outs Today", value: data?.todayCheckOuts ?? 0 },
    ],
    [data],
  );

  return (
    <main className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold text-gray-900">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">Live overview of room and reservation activity.</p>
      </header>

      {isLoading ? <p className="text-sm text-gray-500">Loading metrics...</p> : null}
      {isError ? <p className="text-sm text-red-600">Unable to load dashboard metrics.</p> : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <article key={card.label} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{card.value}</p>
          </article>
        ))}
      </section>
    </main>
  );
}

export default withAdminRoute(AdminDashboardPage);
