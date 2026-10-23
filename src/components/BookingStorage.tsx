
"use client";

import { useCallback, useEffect, useState } from "react";

export type Booking = {
  id: string;
  guest: string;
  phone: string;
  room: string;
  checkIn: string;
  checkOut: string;
  status: string;
};

const STORAGE_KEY = "celebrations-hotel-bookings";
const UPDATE_EVENT = "hotel-bookings-updated";

function readBookings(): Booking[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) return [];

    const parsed: unknown = JSON.parse(saved);

    return Array.isArray(parsed) ? (parsed as Booking[]) : [];
  } catch (error) {
    console.error("Bookings load nahi ho sakin:", error);
    return [];
  }
}

function saveBookings(bookings: Booking[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));

    // Same browser tab ke doosre components ko notify karo.
    window.dispatchEvent(new Event(UPDATE_EVENT));

    return true;
  } catch (error) {
    console.error("Bookings save nahi ho sakin:", error);
    return false;
  }
}

export function useBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initial load + doosre components se hone wale updates.
  useEffect(() => {
    const refreshBookings = () => {
      setBookings(readBookings());
    };

    refreshBookings();
    setIsLoaded(true);

    // Same tab updates.
    window.addEventListener(UPDATE_EVENT, refreshBookings);

    // Other browser tabs updates.
    window.addEventListener("storage", refreshBookings);

    // Tab dobara active hone par refresh.
    window.addEventListener("focus", refreshBookings);

    return () => {
      window.removeEventListener(UPDATE_EVENT, refreshBookings);
      window.removeEventListener("storage", refreshBookings);
      window.removeEventListener("focus", refreshBookings);
    };
  }, []);

  const addBooking = useCallback((booking: Booking) => {
    const current = readBookings();

    // Duplicate ID se bachao.
    if (current.some((item) => item.id === booking.id)) {
      console.error("Duplicate booking ID:", booking.id);
      return false;
    }

    return saveBookings([booking, ...current]);
  }, []);

  const updateBooking = useCallback(
    (id: string, updates: Partial<Omit<Booking, "id">>) => {
      const current = readBookings();
      const exists = current.some((item) => item.id === id);

      if (!exists) {
        console.error("Booking nahi mili:", id);
        return false;
      }

      const updated = current.map((booking) =>
        booking.id === id ? { ...booking, ...updates, id } : booking,
      );

      return saveBookings(updated);
    },
    [],
  );

  const deleteBooking = useCallback((id: string) => {
    const current = readBookings();
    const updated = current.filter((booking) => booking.id !== id);

    if (updated.length === current.length) return false;

    return saveBookings(updated);
  }, []);

  const refreshBookings = useCallback(() => {
    setBookings(readBookings());
  }, []);

  return {
    bookings,
    addBooking,
    updateBooking,
    deleteBooking,
    refreshBookings,
    isLoaded,
  };
}
