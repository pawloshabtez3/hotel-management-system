import { apiClient } from "./api-client";
import type { AdminBookingItem, AdminRoomItem, AdminRoomStats, AdminSettings, RoomStatus } from "./types";

export async function getAdminRoomStats(hotelId?: string) {
  const { data } = await apiClient.get<AdminRoomStats>("/rooms/admin/stats", {
    params: {
      hotelId: hotelId || undefined,
    },
  });

  return data;
}

export async function getAdminRooms(hotelId?: string) {
  const { data } = await apiClient.get<AdminRoomItem[]>("/rooms/admin/list", {
    params: {
      hotelId: hotelId || undefined,
    },
  });

  return data;
}

export async function updateRoomStatus(roomId: string, status: RoomStatus) {
  const { data } = await apiClient.put<{ id: string; status: RoomStatus; hotelId: string }>(`/rooms/${roomId}/status`, {
    status,
  });

  return data;
}

export async function createAdminRoom(payload: {
  hotelId: string;
  type: string;
  pricePerNight: number;
  status?: "AVAILABLE" | "RESERVED" | "OCCUPIED" | "UNAVAILABLE" | "MAINTENANCE";
}) {
  const { data } = await apiClient.post("/rooms/admin", payload);
  return data;
}

export async function updateAdminRoom(
  roomId: string,
  payload: {
    type?: string;
    pricePerNight?: number;
    status?: "AVAILABLE" | "RESERVED" | "OCCUPIED" | "UNAVAILABLE" | "MAINTENANCE";
  },
) {
  const { data } = await apiClient.patch(`/rooms/${roomId}`, payload);
  return data;
}

export async function getAdminBookings() {
  const { data } = await apiClient.get<AdminBookingItem[]>("/admin/bookings");
  return data;
}

export async function checkInBooking(bookingId: string) {
  const { data } = await apiClient.post(`/admin/bookings/${bookingId}/check-in`);
  return data;
}

export async function checkOutBooking(bookingId: string) {
  const { data } = await apiClient.post(`/admin/bookings/${bookingId}/check-out`);
  return data;
}

export async function getAdminSettings() {
  const { data } = await apiClient.get<AdminSettings>("/hotels/admin/settings");
  return data;
}

export async function updateAdminSettings(payload: {
  hotelName?: string;
  location?: string;
  city?: string;
  country?: string;
  roomTypes?: string[];
  allowPayLater?: boolean;
}) {
  const { data } = await apiClient.put<AdminSettings>("/hotels/admin/settings", payload);
  return data;
}
