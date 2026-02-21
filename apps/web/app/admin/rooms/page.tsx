"use client";

import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { withAdminRoute } from "@/app/lib/auth/withAdminRoute";
import { createAdminRoom, getAdminRooms, updateAdminRoom } from "@/app/lib/admin-api";
import { useToastStore } from "@/app/stores/toast-store";
import type { AdminRoomItem } from "@/app/lib/types";

function AdminRoomsPage() {
  const addToast = useToastStore((state) => state.addToast);
  const queryClient = useQueryClient();

  const [roomType, setRoomType] = useState("Standard");
  const [roomPrice, setRoomPrice] = useState("100");
  const [editingRoom, setEditingRoom] = useState<AdminRoomItem | null>(null);
  const [editType, setEditType] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editStatus, setEditStatus] = useState<"AVAILABLE" | "RESERVED" | "OCCUPIED" | "UNAVAILABLE" | "MAINTENANCE">("AVAILABLE");

  const roomsQuery = useQuery({
    queryKey: ["admin-rooms"],
    queryFn: () => getAdminRooms(),
    refetchInterval: 20_000,
  });

  const createMutation = useMutation({
    mutationFn: createAdminRoom,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-rooms"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-room-stats"] });
      setRoomType("Standard");
      setRoomPrice("100");
      addToast({ title: "Room created", variant: "success" });
    },
    onError: () => addToast({ title: "Failed to create room", variant: "error" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ roomId, payload }: { roomId: string; payload: { type?: string; pricePerNight?: number; status?: "AVAILABLE" | "RESERVED" | "OCCUPIED" | "UNAVAILABLE" | "MAINTENANCE" } }) =>
      updateAdminRoom(roomId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-rooms"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-room-stats"] });
      setEditingRoom(null);
      addToast({ title: "Room updated", variant: "success" });
    },
    onError: () => addToast({ title: "Failed to update room", variant: "error" }),
  });

  function onCreateRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const hotelId = roomsQuery.data?.[0]?.hotelId;
    if (!hotelId) {
      addToast({ title: "Admin hotel context missing", variant: "error" });
      return;
    }

    createMutation.mutate({
      hotelId,
      type: roomType.trim(),
      pricePerNight: Number(roomPrice),
      status: "AVAILABLE",
    });
  }

  function openEdit(room: AdminRoomItem) {
    setEditingRoom(room);
    setEditType(room.type);
    setEditPrice(String(room.pricePerNight));
    setEditStatus(room.status as "AVAILABLE" | "RESERVED" | "OCCUPIED" | "UNAVAILABLE");
  }

  function onSaveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingRoom) return;

    updateMutation.mutate({
      roomId: editingRoom.id,
      payload: {
        type: editType.trim(),
        pricePerNight: Number(editPrice),
        status: editStatus,
      },
    });
  }

  const rooms = useMemo(() => roomsQuery.data ?? [], [roomsQuery.data]);

  return (
    <main className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-gray-900">Room Management</h1>
        <p className="mt-1 text-sm text-gray-600">Create and update room type, status, and nightly pricing.</p>
      </header>

      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-medium text-gray-900">Add Room</h2>
        <form onSubmit={onCreateRoom} className="mt-4 grid gap-3 sm:grid-cols-3">
          <input
            value={roomType}
            onChange={(event) => setRoomType(event.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="Room type"
            required
          />
          <input
            type="number"
            min={1}
            value={roomPrice}
            onChange={(event) => setRoomPrice(event.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="Price per night"
            required
          />
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Adding..." : "Add Room"}
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-medium text-gray-900">Rooms</h2>
        {roomsQuery.isLoading ? <p className="mt-3 text-sm text-gray-500">Loading rooms...</p> : null}
        {roomsQuery.isError ? <p className="mt-3 text-sm text-red-600">Failed to load rooms.</p> : null}

        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-2 py-2">Room</th>
                <th className="px-2 py-2">Type</th>
                <th className="px-2 py-2">Price</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((room) => (
                <tr key={room.id} className="border-b border-gray-100">
                  <td className="px-2 py-2 text-gray-700">{room.roomNumber ?? room.id.slice(0, 8)}</td>
                  <td className="px-2 py-2 text-gray-700">{room.type}</td>
                  <td className="px-2 py-2 text-gray-700">${room.pricePerNight}</td>
                  <td className="px-2 py-2 text-gray-700">{room.status}</td>
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      onClick={() => openEdit(room)}
                      className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {editingRoom ? (
        <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-medium text-gray-900">Edit Room</h2>
          <form onSubmit={onSaveEdit} className="mt-4 grid gap-3 sm:grid-cols-4">
            <input
              value={editType}
              onChange={(event) => setEditType(event.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              required
            />
            <input
              type="number"
              min={1}
              value={editPrice}
              onChange={(event) => setEditPrice(event.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              required
            />
            <select
              value={editStatus}
              onChange={(event) => setEditStatus(event.target.value as "AVAILABLE" | "RESERVED" | "OCCUPIED" | "UNAVAILABLE" | "MAINTENANCE")}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="AVAILABLE">AVAILABLE</option>
              <option value="RESERVED">RESERVED</option>
              <option value="OCCUPIED">OCCUPIED</option>
              <option value="UNAVAILABLE">UNAVAILABLE</option>
              <option value="MAINTENANCE">MAINTENANCE</option>
            </select>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
                disabled={updateMutation.isPending}
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setEditingRoom(null)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      ) : null}
    </main>
  );
}

export default withAdminRoute(AdminRoomsPage);
