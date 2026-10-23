
"use client";

import { useEffect, useMemo, useState } from "react";
import { useBookings } from "@/components/BookingStorage";

const INACTIVE = [
  "cancelled",
  "canceled",
  "checked out",
  "checked-out",
  "completed",
];

function dateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function parseDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );

  if (
    date.getFullYear() !== Number(match[1]) ||
    date.getMonth() !== Number(match[2]) - 1 ||
    date.getDate() !== Number(match[3])
  ) {
    return null;
  }

  return date;
}

export default function BookingCalendarPage() {
  const { bookings, isLoaded } = useBookings();

  // Stable initial values prevent current-time reads during prerender.
  const [month, setMonth] = useState(() => new Date(2000, 0, 1));
  const [todayString, setTodayString] = useState("");
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [rooms, setRooms] = useState<{ number: string; status: string }[]>([]);

  useEffect(() => {
    const now = new Date();
    setMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setTodayString(dateKey(now));
    setSelectedDate(dateKey(now));

    try {
      const parsed = JSON.parse(
        window.localStorage.getItem("celebrations-hotel-rooms") || "[]",
      );
      setRooms(Array.isArray(parsed) ? parsed : []);
    } catch {
      setRooms([]);
    }

    const refreshRooms = () => {
      try {
        const parsed = JSON.parse(
          window.localStorage.getItem("celebrations-hotel-rooms") || "[]",
        );
        setRooms(Array.isArray(parsed) ? parsed : []);
      } catch {
        setRooms([]);
      }
    };

    window.addEventListener("storage", refreshRooms);
    window.addEventListener("hotel-rooms-updated", refreshRooms);
    window.addEventListener("focus", refreshRooms);

    return () => {
      window.removeEventListener("storage", refreshRooms);
      window.removeEventListener("hotel-rooms-updated", refreshRooms);
      window.removeEventListener("focus", refreshRooms);
    };
  }, []);

  const firstDay = new Date(
    month.getFullYear(),
    month.getMonth(),
    1,
  ).getDay();

  const daysInMonth = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
  ).getDate();

  const cells = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  const activeBookings = bookings.filter(
    (booking) => !INACTIVE.includes(booking.status.toLowerCase()),
  );

  function bookingsOnDate(date: string) {
    return activeBookings.filter((booking) => {
      const checkIn = parseDate(booking.checkIn);
      const checkOut = parseDate(booking.checkOut);
      const selected = parseDate(date);

      if (!checkIn || !checkOut || !selected) return false;

      // Check-out date par room ko occupied nahi ginte.
      return selected >= checkIn && selected < checkOut;
    });
  }

  const selectedBookings = useMemo(
    () =>
      bookingsOnDate(selectedDate).filter((booking) => {
        const query = search.toLowerCase();

        return (
          booking.guest.toLowerCase().includes(query) ||
          booking.room.toLowerCase().includes(query) ||
          booking.phone.includes(query)
        );
      }),
    [bookings, selectedDate, search],
  );

  const occupiedRoomNumbers = new Set(
    bookingsOnDate(selectedDate).map((booking) => String(booking.room)),
  );

  const availableRooms = rooms.filter(
    (room: { number: string; status: string }) =>
      room.status !== "Maintenance" &&
      !occupiedRoomNumbers.has(String(room.number)),
  ).length;

  if (!isLoaded) {
    return <main className="p-8">Loading calendar...</main>;
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-amber-600">
            Reservations
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Booking Calendar
          </h1>
          <p className="mt-2 text-slate-500">
            Daily reservations aur room availability dekhein.
          </p>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Stat
            title="Total Rooms"
            value={rooms.length}
          />
          <Stat
            title="Occupied on Selected Date"
            value={occupiedRoomNumbers.size}
          />
          <Stat
            title="Available on Selected Date"
            value={availableRooms}
          />
        </div>

        <section className="mb-6 rounded-2xl border bg-white p-4 shadow-sm md:p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold">
              {month.toLocaleDateString("en-IN", {
                month: "long",
                year: "numeric",
              })}
            </h2>

            <div className="flex gap-2">
              <button
                onClick={() =>
                  setMonth(
                    new Date(
                      month.getFullYear(),
                      month.getMonth() - 1,
                      1,
                    ),
                  )
                }
                className="rounded-lg border px-4 py-2 hover:bg-slate-100"
              >
                ← Prev
              </button>

              <button
                onClick={() => {
                  const now = new Date();
                  setMonth(new Date(now.getFullYear(), now.getMonth(), 1));
                  setSelectedDate(dateKey(now));
                }}
                className="rounded-lg border px-4 py-2 hover:bg-slate-100"
              >
                Today
              </button>

              <button
                onClick={() =>
                  setMonth(
                    new Date(
                      month.getFullYear(),
                      month.getMonth() + 1,
                      1,
                    ),
                  )
                }
                className="rounded-lg border px-4 py-2 hover:bg-slate-100"
              >
                Next →
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 md:gap-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
              (day) => (
                <div
                  key={day}
                  className="py-2 text-center text-xs font-bold text-slate-500 md:text-sm"
                >
                  {day}
                </div>
              ),
            )}

            {cells.map((day, index) => {
              if (!day) {
                return <div key={`empty-${index}`} />;
              }

              const date = dateKey(
                new Date(month.getFullYear(), month.getMonth(), day),
              );

              const dayBookings = bookingsOnDate(date);
              const isSelected = selectedDate === date;
              const isToday = date === todayString;

              return (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className={`min-h-20 rounded-xl border p-1 text-left transition md:min-h-28 md:p-2 ${
                    isSelected
                      ? "border-amber-500 bg-amber-50 ring-2 ring-amber-200"
                      : "border-slate-100 bg-white hover:border-slate-300"
                  }`}
                >
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                      isToday
                        ? "bg-slate-900 text-white"
                        : "text-slate-700"
                    }`}
                  >
                    {day}
                  </span>

                  {dayBookings.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <div className="rounded bg-blue-100 px-1 py-1 text-[10px] font-semibold text-blue-800 md:text-xs">
                        {dayBookings.length} booking(s)
                      </div>

                      <div className="hidden truncate text-xs text-slate-500 sm:block">
                        {dayBookings
                          .slice(0, 2)
                          .map((booking) => booking.guest)
                          .join(", ")}
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
            <span>🟦 Active reservation</span>
            <span>🟡 Selected date</span>
            <span>⚫ Today</span>
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">Selected Date</h2>
              <p className="mt-1 text-sm text-slate-500">
                {parseDate(selectedDate)?.toLocaleDateString("en-IN", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>

            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search guest / room..."
              className="rounded-xl border px-4 py-3 outline-none focus:border-amber-500"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="p-3">Guest</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Room</th>
                  <th className="p-3">Check-In</th>
                  <th className="p-3">Check-Out</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {selectedBookings.map((booking) => (
                  <tr key={booking.id}>
                    <td className="p-3 font-semibold">{booking.guest}</td>
                    <td className="p-3">{booking.phone}</td>
                    <td className="p-3">{booking.room}</td>
                    <td className="p-3">{booking.checkIn}</td>
                    <td className="p-3">{booking.checkOut}</td>
                    <td className="p-3">{booking.status}</td>
                  </tr>
                ))}

                {selectedBookings.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-8 text-center text-slate-500"
                    >
                      Is date par koi active booking nahi mili.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function Stat({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
