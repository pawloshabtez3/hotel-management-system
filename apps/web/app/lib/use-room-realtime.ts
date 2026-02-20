"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSocket } from "./socket-client";
import type { RoomUpdateEvent } from "./types";

type UseRoomRealtimeInput = {
  roomIds: string[];
  hotelIds?: string[];
  resyncQueryKeys?: readonly unknown[][];
};

export function useRoomRealtime({
  roomIds,
  hotelIds = [],
  resyncQueryKeys = [],
}: UseRoomRealtimeInput) {
  const queryClient = useQueryClient();
  const [latestEvent, setLatestEvent] = useState<RoomUpdateEvent | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const roomIdSet = useMemo(() => new Set(roomIds), [roomIds]);
  const hotelIdSet = useMemo(() => new Set(hotelIds), [hotelIds]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || (roomIds.length === 0 && hotelIds.length === 0)) {
      return;
    }

    const joinAll = () => {
      roomIds.forEach((roomId) => {
        socket.emit("room:join", { roomId });
      });

      hotelIds.forEach((hotelId) => {
        socket.emit("hotel:join", { hotelId });
      });
    };

    const resync = () => {
      resyncQueryKeys.forEach((queryKey) => {
        void queryClient.invalidateQueries({ queryKey });
      });
    };

    const onConnect = () => {
      setIsConnected(true);
      joinAll();
      resync();
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    const handleEvent = (event: RoomUpdateEvent) => {
      if (!event?.roomId || !roomIdSet.has(event.roomId)) {
        if (!event?.hotelId || !hotelIdSet.has(event.hotelId)) {
          return;
        }
      }

      setLatestEvent(event);
      resync();
    };

    if (socket.connected) {
      onConnect();
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("room:update", handleEvent);
    socket.on("hotel:update", handleEvent);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("room:update", handleEvent);
      socket.off("hotel:update", handleEvent);
    };
  }, [hotelIds, hotelIdSet, queryClient, resyncQueryKeys, roomIdSet, roomIds]);

  return {
    latestEvent,
    isConnected,
  };
}
