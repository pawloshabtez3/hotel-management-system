"use client";

import { io, type Socket } from "socket.io-client";
import { WS_URL } from "./config";
import { useAuthStore } from "@/app/stores/auth-store";

let socket: Socket | null = null;

export function getSocket() {
  return socket;
}

export function connectSocket() {
  const token = useAuthStore.getState().token;
  if (!token) {
    return null;
  }

  if (socket?.connected) {
    return socket;
  }

  if (!socket) {
    socket = io(WS_URL, {
      transports: ["websocket"],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      auth: {
        token,
      },
    });
  } else {
    socket.auth = { token };
  }

  socket.connect();
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
  }
}
