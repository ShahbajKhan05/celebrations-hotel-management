"use client";

import { useEffect, useState } from "react";

export type Guest = {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  createdAt: string;
};

const STORAGE_KEY = "celebrations-hotel-guests";

export function useGuests() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (saved) {
        const parsed: unknown = JSON.parse(saved);

        if (Array.isArray(parsed)) {
          setGuests(parsed);
        }
      }
    } catch (error) {
      console.error("Failed to load guests:", error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(guests));
    }
  }, [guests, isLoaded]);

  function addGuest(
    data: Omit<Guest, "id" | "createdAt">
  ) {
    const guest: Guest = {
      ...data,
      id: `G-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
    };

    setGuests((previous) => [...previous, guest]);

    return guest;
  }

  function updateGuest(updatedGuest: Guest) {
    setGuests((previous) =>
      previous.map((guest) =>
        guest.id === updatedGuest.id ? updatedGuest : guest
      )
    );
  }

  function deleteGuest(id: string) {
    setGuests((previous) =>
      previous.filter((guest) => guest.id !== id)
    );
  }

  return {
    guests,
    isLoaded,
    addGuest,
    updateGuest,
    deleteGuest,
  };
}