
"use client";

import { useEffect, useState } from "react";
import { useBookings } from "@/components/BookingStorage";

type ModulePageProps = {
  title: string;
  description: string;
  buttonLabel: string;
  columns: string[];
  rows: string[][];
};

type RoomOption = {
  number: string;
  type: string;
  price: number;
  status: string;
};

const ROOM_STORAGE_KEY = "celebrations-hotel-rooms";

const defaultRooms: RoomOption[] = [
  { number: "108", type: "Standard", price: 1800, status: "Available" },
  { number: "204", type: "Deluxe", price: 2800, status: "Occupied" },
  { number: "305", type: "Suite", price: 4500, status: "Available" },
  { number: "401", type: "Deluxe", price: 2800, status: "Available" },
  { number: "502", type: "Premium Suite", price: 6000, status: "Maintenance" },
];

export default function ModulePage({
  title,
  description,
  buttonLabel,
  columns,
  rows,
}: ModulePageProps) {
  const isBookingsPage = title === "Bookings & Reservations";

  const {
    bookings: savedBookings,
    addBooking,
    isLoaded,
  } = useBookings();

  const [rooms, setRooms] = useState<RoomOption[]>(defaultRooms);
  const [roomsLoaded, setRoomsLoaded] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);

  const [form, setForm] = useState({
    guest: "",
    phone: "",
    room: "",
    checkIn: "",
    checkOut: "",
    status: "Confirmed",
  });

  useEffect(() => {
    try {
      const savedRooms = localStorage.getItem(ROOM_STORAGE_KEY);

      if (savedRooms) {
        const parsed: unknown = JSON.parse(savedRooms);

        if (Array.isArray(parsed)) {
          setRooms(parsed as RoomOption[]);
        }
      }
    } catch (error) {
      console.error("Rooms load nahi ho sake:", error);
    } finally {
      setRoomsLoaded(true);
    }
  }, []);

  const availableRooms = rooms.filter(
    (room) => room.status === "Available",
  );


const formatDate = (date: string) =>
  new Date(date + "T00:00:00").toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });


  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isLoaded || !roomsLoaded) return;

    if (!form.checkIn || !form.checkOut) {
      alert("Check-in aur check-out dates select karo.");
      return;
    }

    if (form.checkOut <= form.checkIn) {
      alert("Check-out date, check-in date ke baad honi chahiye.");
      return;
    }

    const selectedRoom = rooms.find(
      (room) =>
        room.number === form.room && room.status === "Available",
    );

    if (!selectedRoom) {
      alert("Please ek available room select karo.");
      return;
    }

    const overlappingBooking = savedBookings.some((booking) => {
      return (
        booking.room === form.room &&
        booking.status !== "Cancelled" &&
        form.checkIn < booking.checkOut &&
        form.checkOut > booking.checkIn
      );
    });

    if (overlappingBooking) {
      alert("Ye room selected dates par pehle se booked hai.");
      return;
    }

    const bookingId = `BK-${Date.now().toString().slice(-8)}`;

    addBooking({
      id: bookingId,
      guest: form.guest.trim(),
      phone: form.phone,
      room: form.room,
      checkIn: form.checkIn,
      checkOut: form.checkOut,
      status: form.status,
    });

    setForm({
      guest: "",
      phone: "",
      room: "",
      checkIn: "",
      checkOut: "",
      status: "Confirmed",
    });

    setShowBookingForm(false);
    alert(`Booking ${bookingId} successfully save ho gayi!`);
  }

  const bookingRows = savedBookings.map((booking) => [
    booking.id,
    booking.guest,
    booking.room,
    formatDate(booking.checkIn),
    booking.status,
  ]);

  const displayRows = isBookingsPage
    ? [
        ...bookingRows,
        ...rows.filter(
          (row) =>
            !savedBookings.some((booking) => booking.id === row[0]),
        ),
      ]
    : rows;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {title}
          </h1>
          <p className="mt-2 text-sm text-slate-500">{description}</p>
        </div>

        <button
          type="button"
          onClick={() => setShowBookingForm(true)}
          className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          + {buttonLabel}
        </button>
      </div>

      {isBookingsPage && showBookingForm && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Create New Booking
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Guest aur reservation ki details bharo.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowBookingForm(false)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Guest Name *
                </label>
                <input
                  required
                  value={form.guest}
                  onChange={(event) =>
                    setForm({ ...form, guest: event.target.value })
                  }
                  placeholder="Enter guest name"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Mobile Number *
                </label>
                <input
                  required
                  type="tel"
                  pattern="[0-9]{10}"
                  value={form.phone}
                  onChange={(event) =>
                    setForm({ ...form, phone: event.target.value })
                  }
                  placeholder="10-digit mobile number"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Available Room *
                </label>
                <select
                  required
                  value={form.room}
                  onChange={(event) =>
                    setForm({ ...form, room: event.target.value })
                  }
                  disabled={!roomsLoaded || availableRooms.length === 0}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                >
                  <option value="">
                    {!roomsLoaded
                      ? "Loading rooms..."
                      : availableRooms.length === 0
                        ? "No available rooms"
                        : "Select a room"}
                  </option>

                  {availableRooms.map((room) => (
                    <option key={room.number} value={room.number}>
                      Room {room.number} — {room.type} — ₹
                      {room.price.toLocaleString("en-IN")}/night
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Check-in Date *
                </label>
                <input
                  required
                  type="date"
                  min={new Date().toLocaleDateString("en-CA")}
                  value={form.checkIn}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      checkIn: event.target.value,
                      checkOut:
                        form.checkOut &&
                        form.checkOut <= event.target.value
                          ? ""
                          : form.checkOut,
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Check-out Date *
                </label>
                <input
                  required
                  type="date"
                  min={
                    form.checkIn
                      ? (() => {
                          const date = new Date(
                            `${form.checkIn}T00:00:00`,
                          );
                          date.setDate(date.getDate() + 1);
                          return [
                            date.getFullYear(),
                            String(date.getMonth() + 1).padStart(2, "0"),
                            String(date.getDate()).padStart(2, "0"),
                          ].join("-");
                        })()
                      : new Date().toLocaleDateString("en-CA")
                  }
                  value={form.checkOut}
                  onChange={(event) =>
                    setForm({ ...form, checkOut: event.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Booking Status
                </label>
                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm({ ...form, status: event.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option>Confirmed</option>
                  <option>Pending</option>
                </select>
              </div>
            </div>

            {availableRooms.length === 0 && roomsLoaded && (
              <p className="text-sm text-amber-700">
                Pehle Rooms page par ek room ko Available mark karo.
              </p>
            )}

            <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowBookingForm(false)}
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  !isLoaded ||
                  !roomsLoaded ||
                  availableRooms.length === 0
                }
                className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoaded && roomsLoaded
                  ? "Save Booking"
                  : "Loading..."}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {columns.map((column) => (
                  <th key={column} className="px-5 py-4 font-semibold">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {displayRows.map((row, rowIndex) => (
                <tr
                  key={`${row[0]}-${rowIndex}`}
                  className="transition hover:bg-slate-50"
                >
                  {row.map((cell, cellIndex) => (
                    <td
                      key={`${cell}-${cellIndex}`}
                      className="whitespace-nowrap px-5 py-4 text-slate-600"
                    >
                      {cellIndex === row.length - 1 ? (
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            cell.toLowerCase().includes("checked")
                              ? "bg-emerald-50 text-emerald-700"
                              : cell.toLowerCase().includes("pending")
                                ? "bg-amber-50 text-amber-700"
                                : cell.toLowerCase().includes("cancelled")
                                  ? "bg-red-50 text-red-700"
                                  : "bg-blue-50 text-blue-700"
                          }`}
                        >
                          {cell}
                        </span>
                      ) : (
                        cell
                      )}
                    </td>
                  ))}
              </tr>
            ))}

            {displayRows.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-5 py-10 text-center text-slate-500"
                >
                  No records found.
                </td>
              </tr>
            )}
          </tbody>
          </table>
        </div>
      </div>

      {isBookingsPage && (
        <p className="text-xs text-slate-500">
          Bookings is browser mein save hoti hain; abhi devices ke beech share
          nahi hoti.
        </p>
      )}
    </div>
  );
}
