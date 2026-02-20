export type Role = "CUSTOMER" | "ROOM_ADMIN";

export type AuthUser = {
  id: string;
  email: string | null;
  role: Role;
};

export type AuthMeResponse = {
  user: AuthUser;
};

export type VerifyOtpResponse = {
  accessToken: string;
  tokenType: string;
  user: AuthUser;
};

export type SendOtpResponse = {
  ok: boolean;
  ttlSeconds: number;
  emailSent: boolean;
  devOtp?: string;
};

export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CANCELLED";

export type RoomStatus = "AVAILABLE" | "RESERVED" | "OCCUPIED" | "UNAVAILABLE";

export type HotelListItem = {
  id: string;
  name: string;
  rating: number | null;
  city: string;
  country: string;
  startingPrice: string | number | null;
};

export type HotelListQuery = {
  q?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  limit: number;
};

export type HotelRoom = {
  id: string;
  type: string;
  pricePerNight: string | number;
  services: {
    description?: string | null;
    description_fr?: string | null;
    bedOptions?: string | null;
    sleepsCount?: number | null;
    smokingAllowed?: boolean | null;
    tags?: string[];
  } | null;
  status: RoomStatus;
};

export type HotelDetail = {
  id: string;
  name: string;
  description: string | null;
  rating: number | null;
  address: string;
  city: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  rooms: HotelRoom[];
};

export type BookingItem = {
  id: string;
  roomId: string;
  userId: string;
  checkIn: string;
  checkOut: string;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
  room?: {
    id: string;
    type?: string | null;
    name?: string | null;
    number?: string | null;
    status?: RoomStatus;
    hotel?: {
      id: string;
      name: string;
      city?: string | null;
    };
  };
};

export type RoomUpdateEvent = {
  roomId: string;
  hotelId?: string;
  status: RoomStatus | null;
  at: string;
  source?: string;
};

export type AdminRoomItem = {
  id: string;
  hotelId: string;
  type: string;
  status: RoomStatus;
  pricePerNight: string | number;
  hotel: {
    id: string;
    name: string;
    city: string;
    country: string;
  };
};

export type AdminRoomStats = {
  total: number;
  available: number;
  reserved: number;
  occupied: number;
  unavailable: number;
  occupancyRate: number;
};

export type AdminBookingItem = BookingItem & {
  user?: {
    id: string;
    email: string | null;
  };
};

export type CreateBookingPayload = {
  roomId: string;
  checkIn: string;
  checkOut: string;
};

export type PaymentStubResponse = {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
  stub: boolean;
  message: string;
};
