
"use client";

import { useCallback, useEffect } from "react";

const BOOKINGS_KEY = "celebrations-hotel-bookings";
const ROOMS_KEY = "celebrations-hotel-rooms";
const HOUSEKEEPING_KEY = "celebrations-hotel-housekeeping";

type Booking = {
  id: string;
  room: string;
  checkIn: string;
  checkOut: string;
  status: string;
};

type Room = {
  number: string;
  status: string;
};

type HousekeepingTask = {
  room: string;
  status: string;
  assignedTo?: string;
  notes?: string;
  updatedAt?: string;
};

const INACTIVE_STATUSES = [
  "cancelled",
  "canceled",
  "checked out",
  "checked-out",
  "completed",
];

export default function HousekeepingSync() {
  const syncHousekeeping = useCallback(() => {
    try {
      const bookings: Booking[] = JSON.parse(
        localStorage.getItem(BOOKINGS_KEY) || "[]",
      );

      const rooms: Room[] = JSON.parse(
        localStorage.getItem(ROOMS_KEY) || "[]",
      );

      const existing: HousekeepingTask[] = JSON.parse(
        localStorage.getItem(HOUSEKEEPING_KEY) || "[]",
      );

      if (
        !Array.isArray(bookings) ||
        !Array.isArray(rooms) ||
        !Array.isArray(existing)
      ) {
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayTime = today.getTime();
      let changed = false;

      const updated: HousekeepingTask[] = [...existing];

      rooms.forEach((room) => {
        const roomNumber = String(room.number);

        const roomBookings = bookings.filter((booking) => {
          const status = String(booking.status || "").toLowerCase();

          if (
            String(booking.room) !== roomNumber ||
            INACTIVE_STATUSES.includes(status)
          ) {
            return false;
          }

          const checkIn = new Date(`${booking.checkIn}T00:00:00`);
          const checkOut = new Date(`${booking.checkOut}T00:00:00`);

          return (
            !Number.isNaN(checkIn.getTime()) &&
            !Number.isNaN(checkOut.getTime()) &&
            checkIn <= new Date(todayTime) &&
            checkOut > new Date(todayTime)
          );
        });

        const currentTask = updated.find(
          (task) => String(task.room) === roomNumber,
        );

        // Occupied room ki cleaning status overwrite nahi karte.
        if (roomBookings.length > 0) {
          if (!currentTask) {
            updated.push({
              room: roomNumber,
              status: "Clean",
              notes: "Guest currently staying",
              updatedAt: new Date().toISOString(),
            });
            changed = true;
          }

          return;
        }

        const hasCheckedOutToday = bookings.some((booking) => {
          const status = String(booking.status || "").toLowerCase();

          return (
            String(booking.room) === roomNumber &&
            booking.checkOut ===
              `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}` &&
            ["checked out", "checked-out"].includes(status)
          );
        });

        if (hasCheckedOutToday && currentTask?.status === "Clean") {
          const index = updated.findIndex(
            (task) => String(task.room) === roomNumber,
          );

          updated[index] = {
            ...currentTask,
            status: "Needs Cleaning",
            notes: "Guest checked out today",
            updatedAt: new Date().toISOString(),
          };

          changed = true;
        }
      });

      if (changed) {
        localStorage.setItem(
          HOUSEKEEPING_KEY,
          JSON.stringify(updated),
        );

        window.dispatchEvent(new Event("hotel-housekeeping-updated"));
      }
    } catch (error) {
      console.error("Housekeeping sync failed:", error);
    }
  }, []);

  useEffect(() => {
    syncHousekeeping();

    window.addEventListener("focus", syncHousekeeping);
    window.addEventListener("storage", syncHousekeeping);

    const interval = window.setInterval(syncHousekeeping, 15000);

    return () => {
      window.removeEventListener("focus", syncHousekeeping);
      window.removeEventListener("storage", syncHousekeeping);
      window.clearInterval(interval);
    };
  }, [syncHousekeeping]);

  return null;
}
