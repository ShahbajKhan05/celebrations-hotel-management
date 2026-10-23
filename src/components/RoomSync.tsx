"use client";

import { useCallback, useEffect } from "react";

const BOOKINGS_KEY = "celebrations-hotel-bookings";
const ROOMS_KEY = "celebrations-hotel-rooms";

type Booking = {
  id: string;
  room: string;
  checkIn: string;
  checkOut: string;
  status: string;
};

type Room = {
  number: string;
  type: string;
  price: number;
  status: "Available" | "Occupied" | "Maintenance";
};

const INACTIVE_STATUSES = [
  "cancelled",
  "canceled",
  "checked out",
  "checked-out",
  "completed",
  "checkedout",
];

function parseDate(value: string): number | null {
  if (!value) return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date.getTime();
}

export default function RoomSync() {
  const syncRooms = useCallback(() => {
    try {
      const rawBookings = localStorage.getItem(BOOKINGS_KEY);
      const rawRooms = localStorage.getItem(ROOMS_KEY);

      // Data absent ho to default rooms create ya overwrite mat karo.
      if (rawBookings === null || rawRooms === null) return;

      const bookings: unknown = JSON.parse(rawBookings);
      const rooms: unknown = JSON.parse(rawRooms);

      if (!Array.isArray(bookings) || !Array.isArray(rooms)) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTime = today.getTime();

      const validBookings = (bookings as Booking[]).filter((booking) => {
        const status = String(booking.status ?? "")
          .trim()
          .toLowerCase();

        return (
          !INACTIVE_STATUSES.includes(status) &&
          Boolean(booking.room) &&
          parseDate(booking.checkIn) !== null &&
          parseDate(booking.checkOut) !== null &&
          parseDate(booking.checkOut)! >
            parseDate(booking.checkIn)!
        );
      });

      let changed = false;

      const updatedRooms = (rooms as Room[]).map((room) => {
        // Maintenance rooms ko kabhi auto-change nahi karna.
        if (room.status === "Maintenance") return room;

        const occupied = validBookings.some((booking) => {
          if (String(booking.room) !== String(room.number)) {
            return false;
          }

          const checkIn = parseDate(booking.checkIn);
          const checkOut = parseDate(booking.checkOut);

          if (checkIn === null || checkOut === null) return false;

          // Check-in included; checkout excluded.
          return checkIn <= todayTime && todayTime < checkOut;
        });

        const nextStatus = occupied ? "Occupied" : "Available";

        if (room.status !== nextStatus) {
          changed = true;
          return { ...room, status: nextStatus };
        }

        return room;
      });

      // Unnecessary writes avoid karo.
      if (changed) {
        localStorage.setItem(ROOMS_KEY, JSON.stringify(updatedRooms));
        window.dispatchEvent(new Event("hotel-rooms-updated"));
      }
    } catch (error) {
      console.error("Room synchronization failed:", error);
    }
  }, []);

  useEffect(() => {
    syncRooms();

    window.addEventListener("focus", syncRooms);
    window.addEventListener("storage", syncRooms);

    const interval = window.setInterval(syncRooms, 15000);

    return () => {
      window.removeEventListener("focus", syncRooms);
      window.removeEventListener("storage", syncRooms);
      window.clearInterval(interval);
    };
  }, [syncRooms]);

  return null;
}