import { apiClient } from "./api-client";
import type { BookingItem } from "./types";

export async function getMyBookings() {
  const { data } = await apiClient.get<BookingItem[]>("/bookings");
  return data;
}
