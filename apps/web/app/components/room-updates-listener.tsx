"use client";

import { useEffect, useState } from "react";
import { useRoomRealtime } from "@/app/lib/use-room-realtime";
import type { RoomUpdateEvent } from "@/app/lib/types";

type RoomUpdatesListenerProps = {
  roomIds: string[];
  hotelIds?: string[];
  resyncQueryKeys?: readonly unknown[][];
};

export function RoomUpdatesListener({
  roomIds,
  hotelIds = [],
  resyncQueryKeys = [],
}: RoomUpdatesListenerProps) {
  const [latest, setLatest] = useState<RoomUpdateEvent | null>(null);
  const { latestEvent, isConnected } = useRoomRealtime({
    roomIds,
    hotelIds,
    resyncQueryKeys,
  });

  useEffect(() => {
    if (!latestEvent) {
      return;
    }

    setLatest(latestEvent);
    const timeout = window.setTimeout(() => {
      setLatest((current) => (current?.roomId === latestEvent.roomId ? null : current));
    }, 5000);

    return () => window.clearTimeout(timeout);
  }, [latestEvent]);

  if (!latest) {
    return (
      <div className="rounded-2xl border border-foreground/10 bg-surface-muted px-4 py-3 text-xs text-foreground/70">
        Realtime: {isConnected ? "connected" : "connecting..."}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-foreground/10 bg-surface-muted px-4 py-3 text-xs text-foreground/80">
      Live update: room {latest.roomId.slice(0, 8)} is now {latest.status ?? "unknown"}.
    </div>
  );
}
