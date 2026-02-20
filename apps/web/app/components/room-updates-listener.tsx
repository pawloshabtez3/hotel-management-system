"use client";

import { useRoomRealtime } from "@/app/lib/use-room-realtime";

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
  const { latestEvent, isConnected } = useRoomRealtime({
    roomIds,
    hotelIds,
    resyncQueryKeys,
  });

  if (!latestEvent) {
    return (
      <div className="panel-soft rounded-2xl px-4 py-3 text-xs text-foreground/70">
        Realtime: {isConnected ? "connected" : "connecting..."}
      </div>
    );
  }

  return (
    <div className="panel-soft rounded-2xl px-4 py-3 text-xs font-semibold text-foreground/80">
      Live update: room {latestEvent.roomId.slice(0, 8)} is now {latestEvent.status ?? "unknown"}.
    </div>
  );
}
