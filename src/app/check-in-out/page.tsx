
"use client";

import { useEffect, useMemo, useState } from "react";
import { useBookings } from "@/components/BookingStorage";

const INACTIVE_STATUSES = [
  "checked out",
  "cancelled",
  "canceled",
];

export default function CheckInOutPage() {
  const { bookings, updateBooking, isLoaded } = useBookings();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [todayString, setTodayString] = useState("");

  // Date ko browser mount hone ke baad initialize karo.
  useEffect(() => {
    const today = new Date();

    const formattedDate = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, "0"),
      String(today.getDate()).padStart(2, "0"),
    ].join("-");

    setTodayString(formattedDate);
  }, []);

  const visibleBookings = useMemo(() => {
    const query = search.trim().toLowerCase();

    return bookings.filter((booking) => {
      const guest = String(booking.guest ?? "").toLowerCase();
      const phone = String(booking.phone ?? "");
      const room = String(booking.room ?? "").toLowerCase();
      const status = String(booking.status ?? "").toLowerCase();

      const matchesSearch =
        guest.includes(query) ||
        phone.includes(query) ||
        room.includes(query);

      const matchesFilter =
        filter === "All" ||
        (filter === "Expected Today" &&
          todayString !== "" &&
          booking.checkIn === todayString &&
          !INACTIVE_STATUSES.includes(status) &&
          status !== "checked-in") ||
        (filter === "Checked In" &&
          (status === "checked in" || status === "checked-in")) ||
        (filter === "Checked Out" &&
          (status === "checked out" || status === "checked-out"));

      return matchesSearch && matchesFilter;
    });
  }, [bookings, search, filter, todayString]);

  function changeStatus(id: string, status: string) {
    const success = updateBooking(id, { status });

    if (success) {
      window.alert(`Booking status updated: ${status}`);
    } else {
      window.alert("Booking update nahi hui. Dobara try karein.");
    }
  }

  if (!isLoaded) {
    return (
      <main className="min-h-screen bg-slate-50 p-4 md:p-8">
        <div className="mx-auto max-w-7xl rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
          Loading bookings...
        </div>
      </main>
    );
  }

  const checkedIn = bookings.filter((booking) => {
    const status = booking.status.toLowerCase();
    return status === "checked in" || status === "checked-in";
  }).length;

  const checkedOut = bookings.filter((booking) => {
    const status = booking.status.toLowerCase();
    return status === "checked out" || status === "checked-out";
  }).length;

  const expectedToday = todayString
    ? bookings.filter((booking) => {
        const status = booking.status.toLowerCase();

        return (
          booking.checkIn === todayString &&
          !INACTIVE_STATUSES.includes(status) &&
          status !== "checked-in"
        );
      }).length
    : 0;

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-700 p-5 text-white sm:p-7">
          <p className="text-sm font-semibold uppercase tracking-widest text-amber-400">
            Front Desk
          </p>

          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
            Check-In / Check-Out
          </h1>

          <p className="mt-2 text-sm text-slate-300 sm:text-base">
            Guest arrivals, active stays aur departures manage karein.
          </p>
        </header>

        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard title="Expected Today" value={expectedToday} />
          <StatCard title="Currently Checked In" value={checkedIn} />
          <StatCard title="Checked Out" value={checkedOut} />
        </section>

        <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_220px]">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Guest, phone ya room search..."
            aria-label="Search bookings"
            className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
          />

          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            aria-label="Filter bookings by status"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-amber-500"
          >
            <option value="All">All Bookings</option>
            <option value="Expected Today">Expected Today</option>
            <option value="Checked In">Checked In</option>
            <option value="Checked Out">Checked Out</option>
          </select>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4 sm:p-5">
            <h2 className="text-lg font-bold text-slate-900">
              Guest Arrivals & Departures
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {visibleBookings.length} booking(s) found
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="p-4 font-semibold">Guest</th>
                  <th className="p-4 font-semibold">Room</th>
                  <th className="p-4 font-semibold">Check-In</th>
                  <th className="p-4 font-semibold">Check-Out</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {visibleBookings.map((booking) => {
                  const status = booking.status.toLowerCase();

                  const isCheckedIn =
                    status === "checked in" || status === "checked-in";

                  const isCheckedOut =
                    status === "checked out" || status === "checked-out";

                  const isCancelled = [
                    "cancelled",
                    "canceled",
                  ].includes(status);

                  return (
                    <tr
                      key={booking.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="p-4">
                        <p className="font-semibold text-slate-900">
                          {booking.guest}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {booking.phone || "No phone"}
                        </p>
                      </td>

                      <td className="p-4 font-medium text-slate-700">
                        {booking.room}
                      </td>

                      <td className="whitespace-nowrap p-4 text-slate-600">
                        {booking.checkIn}
                      </td>

                      <td className="whitespace-nowrap p-4 text-slate-600">
                        {booking.checkOut}
                      </td>

                      <td className="p-4">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${
                            isCheckedIn
                              ? "bg-emerald-100 text-emerald-700"
                              : isCheckedOut
                                ? "bg-slate-200 text-slate-700"
                                : isCancelled
                                  ? "bg-red-100 text-red-700"
                                  : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {booking.status}
                        </span>
                      </td>

                      <td className="p-4">
                        {isCancelled ? (
                          <span className="text-xs text-slate-400">
                            Cancelled
                          </span>
                        ) : isCheckedOut ? (
                          <span className="text-xs text-slate-400">
                            Completed
                          </span>
                        ) : isCheckedIn ? (
                          <button
                            type="button"
                            onClick={() =>
                              changeStatus(booking.id, "Checked Out")
                            }
                            className="whitespace-nowrap rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700"
                          >
                            Check-Out
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              changeStatus(booking.id, "Checked In")
                            }
                            className="whitespace-nowrap rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
                          >
                            Check-In
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {visibleBookings.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-10 text-center text-slate-500"
                    >
                      Koi booking nahi mili.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
            Mobile par table ke andar swipe karke saare columns dekh sakte hain.
          </p>
        </section>
      </div>
    </main>
  );
}

function StatCard({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
