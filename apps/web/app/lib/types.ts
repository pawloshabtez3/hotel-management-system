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
  devOtp?: string;
};

export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CANCELLED"
  | "CHECKED_IN"
  | "CHECKED_OUT";

export type RoomStatus = "AVAILABLE" | "RESERVED" | "OCCUPIED" | "MAINTENANCE";

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
  status: RoomStatus | null;
  at: string;
  source?: string;
};
