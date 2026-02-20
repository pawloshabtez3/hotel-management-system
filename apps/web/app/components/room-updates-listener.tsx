"use client";

import { useEffect } from "react";
import { useRoomRealtime } from "@/app/lib/use-room-realtime";
import { useToast } from "@/app/lib/use-toast";

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
  const toast = useToast();
  const { latestEvent, isConnected } = useRoomRealtime({
    roomIds,
    hotelIds,
    resyncQueryKeys,
  });

  useEffect(() => {
    if (!latestEvent) {
      return;
    }

    toast.info({
      title: "Room status updated",
      description: `Room ${latestEvent.roomId.slice(0, 8)} is now ${latestEvent.status ?? "unknown"}.`,
    });
  }, [latestEvent, toast]);

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
