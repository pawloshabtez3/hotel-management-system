"use client";

import { useEffect, useState } from "react";
import { getSocket } from "@/app/lib/socket-client";
import type { RoomUpdateEvent } from "@/app/lib/types";

type RoomUpdatesListenerProps = {
  roomIds: string[];
};

export function RoomUpdatesListener({ roomIds }: RoomUpdatesListenerProps) {
  const [latest, setLatest] = useState<RoomUpdateEvent | null>(null);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || roomIds.length === 0) {
      return;
    }

    roomIds.forEach((roomId) => {
      socket.emit("room:join", { roomId });
    });

    const onRoomUpdate = (event: RoomUpdateEvent) => {
      if (!event?.roomId) {
        return;
      }

      if (!roomIds.includes(event.roomId)) {
        return;
      }

      setLatest(event);
    };

    socket.on("room:update", onRoomUpdate);

    return () => {
      socket.off("room:update", onRoomUpdate);
    };
  }, [roomIds]);

  if (!latest) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-foreground/10 bg-surface-muted px-4 py-3 text-xs text-foreground/70">
      Live update: room {latest.roomId.slice(0, 8)} status is {latest.status ?? "unknown"}
    </div>
  );
}
