"use client";

import { useEffect, useState } from "react";

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

export function useBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const savedBookings = localStorage.getItem(STORAGE_KEY);

      if (savedBookings) {
        const parsed: unknown = JSON.parse(savedBookings);

        if (Array.isArray(parsed)) {
          setBookings(parsed as Booking[]);
        }
      }
    } catch (error) {
      console.error("Bookings load nahi ho sakin:", error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
    } catch (error) {
      console.error("Bookings save nahi ho sakin:", error);
    }
  }, [bookings, isLoaded]);

  function addBooking(booking: Booking) {
    setBookings((previous) => [booking, ...previous]);
  }

  function deleteBooking(id: string) {
    setBookings((previous) =>
      previous.filter((booking) => booking.id !== id),
    );
  }

  return {
    bookings,
    addBooking,
    deleteBooking,
    isLoaded,
  };
}