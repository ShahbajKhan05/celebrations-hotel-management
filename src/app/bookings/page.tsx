"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { validateBooking } from "@/lib/bookingValidation";

const BOOKINGS_KEY = "celebrations-hotel-bookings";
const ROOMS_KEY = "celebrations-hotel-rooms";

type Booking = {
  id: string;
  guest: string;
  phone: string;
  room: string;
  checkIn: string;
  checkOut: string;
  status: string;
};

type Room = {
  number: string;
  type: string;
  price: number;
  status: string;
};

type BookingForm = Omit<Booking, "id">;

const EMPTY_FORM: BookingForm = {
  guest: "",
  phone: "",
  room: "",
  checkIn: "",
  checkOut: "",
  status: "Confirmed",
};

const STATUSES = [
  "Confirmed",
  "Pending",
  "Checked In",
  "Checked Out",
  "Cancelled",
];

const money = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

function readStorage<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function dateLabel(value: string) {
  if (!value) return "—";

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function nightsBetween(checkIn: string, checkOut: string) {
  const start = new Date(`${checkIn}T00:00:00`).getTime();
  const end = new Date(`${checkOut}T00:00:00`).getTime();

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return 0;
  }

  return Math.round((end - start) / 86400000);
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();

  const styles: Record<string, string> = {
    confirmed: "bg-emerald-100 text-emerald-700",
    pending: "bg-amber-100 text-amber-700",
    "checked in": "bg-blue-100 text-blue-700",
    "checked out": "bg-slate-100 text-slate-700",
    cancelled: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        styles[normalized] ?? "bg-slate-100 text-slate-700"
      }`}
    >
      {status}
    </span>
  );
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [todayString, setTodayString] = useState("");

  const [form, setForm] = useState<BookingForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const refreshData = useCallback(() => {
    setBookings(readStorage<Booking[]>(BOOKINGS_KEY, []));
    setRooms(readStorage<Room[]>(ROOMS_KEY, []));
    setLoaded(true);
  }, []);

  useEffect(() => {
    refreshData();

    const onStorage = () => refreshData();

    window.addEventListener("storage", onStorage);
    window.addEventListener("hotel-rooms-updated", onStorage);
    window.addEventListener("hotel-bookings-updated", onStorage);
    window.addEventListener("focus", onStorage);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("hotel-rooms-updated", onStorage);
      window.removeEventListener("hotel-bookings-updated", onStorage);
      window.removeEventListener("focus", onStorage);
    };
  }, [refreshData]);

  useEffect(() => {
    const today = new Date();
    const formattedDate = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, "0"),
      String(today.getDate()).padStart(2, "0"),
    ].join("-");

    setTodayString(formattedDate);
  }, []);

  function persistBookings(next: Booking[]) {
    localStorage.setItem(BOOKINGS_KEY, JSON.stringify(next));
    setBookings(next);

    // Notify components in this browser tab.
    window.dispatchEvent(new Event("hotel-bookings-updated"));
  }

  function updateField<K extends keyof BookingForm>(
    key: K,
    value: BookingForm[K],
  ) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError("");
  }

  function saveBooking(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const normalized: Booking = {
      ...form,
      id: editingId ?? crypto.randomUUID(),
      guest: form.guest.trim(),
      phone: form.phone.trim(),
      room: String(form.room).trim(),
    };

    const validationError = validateBooking(normalized, bookings);

    if (validationError) {
      setError(validationError);
      return;
    }

    const selectedRoom = rooms.find(
      (room) => String(room.number) === normalized.room,
    );

    if (!selectedRoom) {
      setError("Selected room does not exist. Please refresh and try again.");
      return;
    }

    if (selectedRoom.status === "Maintenance") {
      setError("This room is under maintenance and cannot be booked.");
      return;
    }

    const nextBookings = editingId
      ? bookings.map((booking) =>
          booking.id === editingId ? normalized : booking,
        )
      : [normalized, ...bookings];

    persistBookings(nextBookings);
    resetForm();

    setSuccess(
      editingId
        ? "Booking updated successfully."
        : "Booking created successfully.",
    );
  }

  function editBooking(booking: Booking) {
    setForm({
      guest: booking.guest,
      phone: booking.phone,
      room: booking.room,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      status: booking.status,
    });

    setEditingId(booking.id);
    setError("");
    setSuccess("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function deleteBooking(booking: Booking) {
    const confirmed = window.confirm(
      `Delete the booking for ${booking.guest} in room ${booking.room}?`,
    );

    if (!confirmed) return;

    persistBookings(bookings.filter((item) => item.id !== booking.id));

    if (editingId === booking.id) resetForm();

    setSuccess("Booking deleted successfully.");
    setError("");
  }

  function changeStatus(booking: Booking, status: string) {
    const updated = { ...booking, status };

    // Revalidate room/date conflicts when reactivating a booking.
    if (!["cancelled", "checked out"].includes(status.toLowerCase())) {
      const validationError = validateBooking(updated, bookings);

      if (validationError) {
        setError(validationError);
        setSuccess("");
        return;
      }

      const room = rooms.find(
        (item) => String(item.number) === String(updated.room),
      );

      if (room?.status === "Maintenance") {
        setError("This room is under maintenance.");
        setSuccess("");
        return;
      }
    }

    persistBookings(
      bookings.map((item) => (item.id === booking.id ? updated : item)),
    );

    setError("");
    setSuccess(`Booking status changed to ${status}.`);
  }

  const filteredBookings = useMemo(() => {
    const query = search.trim().toLowerCase();

    return bookings
      .filter((booking) => {
        const matchesSearch = [
          booking.guest,
          booking.phone,
          booking.room,
          booking.id,
        ].some((value) => String(value ?? "").toLowerCase().includes(query));

        const matchesStatus =
          statusFilter === "All" || booking.status === statusFilter;

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => b.checkIn.localeCompare(a.checkIn));
  }, [bookings, search, statusFilter]);

  const activeBookings = bookings.filter(
    (booking) =>
      !["cancelled", "checked out"].includes(
        booking.status.toLowerCase(),
      ),
  );

  const checkInsToday = todayString
    ? activeBookings.filter(
        (booking) => booking.checkIn === todayString,
      ).length
    : 0;

  const checkOutsToday = todayString
    ? activeBookings.filter(
        (booking) => booking.checkOut === todayString,
      ).length
    : 0;

  const roomRevenue = activeBookings.reduce((total, booking) => {
    const room = rooms.find(
      (item) => String(item.number) === String(booking.room),
    );

    const nights = nightsBetween(booking.checkIn, booking.checkOut);

    return total + (room?.price ?? 0) * nights;
  }, 0);

  function exportCSV() {
    const headers = [
      "Booking ID",
      "Guest",
      "Phone",
      "Room",
      "Check In",
      "Check Out",
      "Nights",
      "Status",
    ];

    const rows = filteredBookings.map((booking) => [
      booking.id,
      booking.guest,
      booking.phone,
      booking.room,
      booking.checkIn,
      booking.checkOut,
      nightsBetween(booking.checkIn, booking.checkOut),
      booking.status,
    ]);

    const escapeCSV = (value: unknown) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCSV).join(","))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "celebrations-bookings.csv";
    link.click();

    URL.revokeObjectURL(url);
  }

  if (!loaded) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">
        Loading bookings...
      </div>
    );
  }

  return (
    <main className="space-y-6">
      <section className="flex flex-col justify-between gap-4 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-700 p-6 text-white sm:flex-row sm:items-center">
        <div>
          <p className="text-sm text-slate-300">
            CELEBRATIONS HOTEL & RESORT
          </p>
          <h1 className="mt-2 text-3xl font-bold">Room Bookings</h1>
          <p className="mt-2 text-sm text-slate-300">
            Create reservations and manage guest check-in/check-out dates.
          </p>
        </div>

        <Link
          href="/"
          className="inline-flex w-fit rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold hover:bg-white/10"
        >
          ← Dashboard
        </Link>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Total Bookings" value={bookings.length} icon="📅" />
        <SummaryCard
          title="Active Bookings"
          value={activeBookings.length}
          icon="🛎️"
        />
        <SummaryCard
          title="Check-ins Today"
          value={checkInsToday}
          icon="🟢"
        />
        <SummaryCard
          title="Check-outs Today"
          value={checkOutsToday}
          icon="🔵"
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              {editingId ? "Edit Booking" : "Create New Booking"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Room availability is checked before saving.
            </p>
          </div>

          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel Edit
            </button>
          )}
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700"
          >
            {success}
          </div>
        )}

        <form onSubmit={saveBooking} className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <FormField label="Guest Name">
            <input
              required
              value={form.guest}
              onChange={(e) => updateField("guest", e.target.value)}
              placeholder="Enter guest name"
              className={inputClass}
            />
          </FormField>

          <FormField label="Phone Number">
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              placeholder="Enter phone number"
              className={inputClass}
            />
          </FormField>

          <FormField label="Room">
            <select
              required
              value={form.room}
              onChange={(e) => updateField("room", e.target.value)}
              className={inputClass}
            >
              <option value="">Select a room</option>
              {rooms.map((room) => (
                <option
                  key={room.number}
                  value={String(room.number)}
                  disabled={
                    room.status === "Maintenance" &&
                    String(room.number) !== form.room
                  }
                >
                  Room {room.number} — {room.type} — {money(room.price)}/night
                  {room.status === "Maintenance" ? " (Maintenance)" : ""}
                </option>
              ))}
            </select>
            {rooms.length === 0 && (
              <p className="mt-1 text-xs text-amber-700">
                No rooms found. Add rooms on the Rooms page first.
              </p>
            )}
          </FormField>

          <FormField label="Check-in Date">
            <input
              required
              type="date"
              value={form.checkIn}
              onChange={(e) => updateField("checkIn", e.target.value)}
              className={inputClass}
            />
          </FormField>

          <FormField label="Check-out Date">
            <input
              required
              type="date"
              min={form.checkIn || undefined}
              value={form.checkOut}
              onChange={(e) => updateField("checkOut", e.target.value)}
              className={inputClass}
            />
          </FormField>

          <FormField label="Booking Status">
            <select
              value={form.status}
              onChange={(e) => updateField("status", e.target.value)}
              className={inputClass}
            >
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </FormField>

          {form.checkIn &&
            form.checkOut &&
            nightsBetween(form.checkIn, form.checkOut) > 0 && (
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 md:col-span-2 xl:col-span-3">
                <p className="text-sm text-blue-800">
                  Duration:{" "}
                  <strong>
                    {nightsBetween(form.checkIn, form.checkOut)} night(s)
                  </strong>
                  {" · "}
                  Estimated room charge:{" "}
                  <strong>
                    {money(
                      (rooms.find(
                        (room) => String(room.number) === form.room,
                      )?.price ?? 0) *
                        nightsBetween(form.checkIn, form.checkOut),
                    )}
                  </strong>
                </p>
                <p className="mt-1 text-xs text-blue-700">
                  Estimate excludes taxes, food, events, and additional
                  services.
                </p>
              </div>
            )}

          <div className="flex flex-wrap gap-3 md:col-span-2 xl:col-span-3">
            <button
              type="submit"
              className="rounded-xl bg-blue-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
            >
              {editingId ? "Save Changes" : "Create Booking"}
            </button>

            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Reset Form
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              All Bookings
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {filteredBookings.length} booking(s) displayed
            </p>
          </div>

          <button
            type="button"
            onClick={exportCSV}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Export CSV ↓
          </button>
        </div>

        <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search guest, phone, room or booking ID..."
            className={inputClass}
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={inputClass}
          >
            <option value="All">All statuses</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-4 font-semibold">Guest</th>
                <th className="px-4 py-4 font-semibold">Phone</th>
                <th className="px-4 py-4 font-semibold">Room</th>
                <th className="px-4 py-4 font-semibold">Check-in</th>
                <th className="px-4 py-4 font-semibold">Check-out</th>
                <th className="px-4 py-4 font-semibold">Nights</th>
                <th className="px-4 py-4 font-semibold">Status</th>
                <th className="px-4 py-4 font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    No bookings found. Create a booking using the form above.
                  </td>
                </tr>
              ) : (
                filteredBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-slate-50">
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-800">
                        {booking.guest}
                      </p>
                      <p className="mt-1 max-w-36 truncate text-xs text-slate-400">
                        ID: {booking.id}
                      </p>
                    </td>

                    <td className="px-4 py-4 text-slate-600">
                      {booking.phone || "—"}
                    </td>

                    <td className="px-4 py-4 font-medium text-slate-700">
                      {booking.room}
                    </td>

                    <td className="px-4 py-4 text-slate-600">
                      {dateLabel(booking.checkIn)}
                    </td>

                    <td className="px-4 py-4 text-slate-600">
                      {dateLabel(booking.checkOut)}
                    </td>

                    <td className="px-4 py-4 text-slate-600">
                      {nightsBetween(booking.checkIn, booking.checkOut)}
                    </td>

                    <td className="px-4 py-4">
                      <select
                        aria-label={`Status for ${booking.guest}`}
                        value={booking.status}
                        onChange={(e) =>
                          changeStatus(booking, e.target.value)
                        }
                        className="max-w-36 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs"
                      >
                        {STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                      <div className="mt-2">
                        <StatusBadge status={booking.status} />
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => editBooking(booking)}
                          className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteBooking(booking)}
                          className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="pb-3 text-center text-xs text-slate-400">
        Booking data is stored in this browser. Estimated room revenue:
        {" "}{money(roomRevenue)}
      </footer>
    </main>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </span>
      {children}
    </label>
  );
}

function SummaryCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-800">{value}</p>
        </div>
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-2xl">
          {icon}
        </span>
      </div>
    </div>
  );
}