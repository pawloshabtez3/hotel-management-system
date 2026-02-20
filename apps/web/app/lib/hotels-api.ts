import { apiClient } from "./api-client";
import type {
  HotelDetail,
  HotelListItem,
  HotelListQuery,
  PaymentStubResponse,
  CreateBookingPayload,
  BookingItem,
} from "./types";

export async function getHotels(query: HotelListQuery) {
  const { data } = await apiClient.get<HotelListItem[]>("/hotels", {
    params: {
      city: query.city || undefined,
      q: query.q || undefined,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
      limit: query.limit,
    },
  });
  return data;
}

export async function getHotelDetail(input: {
  id: string;
  checkIn?: string;
  checkOut?: string;
}) {
  const { data } = await apiClient.get<HotelDetail>(`/hotels/${input.id}`, {
    params: {
      checkIn: input.checkIn || undefined,
      checkOut: input.checkOut || undefined,
    },
  });
  return data;
}

export async function createBooking(payload: CreateBookingPayload) {
  const { data } = await apiClient.post<BookingItem>("/bookings", payload);
  return data;
}

export async function createPaymentStubByBookingId(bookingId: string) {
  const { data } = await apiClient.post<PaymentStubResponse>(`/bookings/${bookingId}/pay`);
  return data;
}
