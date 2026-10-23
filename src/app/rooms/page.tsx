"use client";

import { useEffect, useState, type FormEvent } from "react";

type Room = {
  number: string;
  type: string;
  price: number;
  status: "Available" | "Occupied" | "Maintenance";
};

type StoredBooking = {
  id: string;
  guest: string;
  phone: string;
  room: string;
  checkIn: string;
  checkOut: string;
  status: string;
};

const STORAGE_KEY = "celebrations-hotel-rooms";
const BOOKINGS_KEY = "celebrations-hotel-bookings";

const initialRooms: Room[] = [
  { number: "108", type: "Standard", price: 1800, status: "Available" },
  { number: "204", type: "Deluxe", price: 2800, status: "Occupied" },
  { number: "305", type: "Suite", price: 4500, status: "Available" },
  { number: "401", type: "Deluxe", price: 2800, status: "Available" },
  { number: "502", type: "Premium Suite", price: 6000, status: "Maintenance" },
];

const statusStyle: Record<Room["status"], string> = {
  Available: "bg-emerald-100 text-emerald-700",
  Occupied: "bg-blue-100 text-blue-700",
  Maintenance: "bg-amber-100 text-amber-700",
};

function isRoom(value: unknown): value is Room {
  if (!value || typeof value !== "object") return false;

  const room = value as Partial<Room>;

  return (
    typeof room.number === "string" &&
    typeof room.type === "string" &&
    typeof room.price === "number" &&
    ["Available", "Occupied", "Maintenance"].includes(room.status ?? "")
  );
}

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingNumber, setEditingNumber] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    number: "",
    type: "Standard",
    price: "",
  });

  useEffect(() => {
    try {
      const savedRooms = localStorage.getItem(STORAGE_KEY);
      const savedBookings = localStorage.getItem(BOOKINGS_KEY);

      let loadedRooms: Room[] = initialRooms;
      let bookings: StoredBooking[] = [];

      if (savedRooms) {
        const parsedRooms: unknown = JSON.parse(savedRooms);

        if (Array.isArray(parsedRooms)) {
          loadedRooms = parsedRooms.filter(isRoom);
        }
      }

      if (savedBookings) {
        const parsedBookings: unknown = JSON.parse(savedBookings);

        if (Array.isArray(parsedBookings)) {
          bookings = parsedBookings as StoredBooking[];
        }
      }

      const syncedRooms = loadedRooms.map((room) => {
        if (room.status === "Maintenance") return room;

        const hasCheckedInGuest = bookings.some(
          (booking) =>
            booking.room === room.number &&
            booking.status === "Checked In",
        );

        if (hasCheckedInGuest) {
          return { ...room, status: "Occupied" as const };
        }

        return room;
      });

      setRooms(syncedRooms);
    } catch {
      setRooms(initialRooms);
      setMessage("Room data load nahi ho paya.");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (loaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms));
    }
  }, [rooms, loaded]);

  function saveRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const number = form.number.trim();
    const price = Number(form.price);

    if (!number) {
      setMessage("Room number enter karo.");
      return;
    }

    if (
      rooms.some(
        (room) =>
          room.number.toLowerCase() === number.toLowerCase() &&
          room.number !== editingNumber
      )
    ) {
      setMessage("Ye room number pehle se exist karta hai.");
      return;
    }

    if (!Number.isFinite(price) || price <= 0) {
      setMessage("Price zero se zyada honi chahiye.");
      return;
    }

    if (editingNumber) {
      setRooms((previous) =>
        previous.map((room) =>
          room.number === editingNumber
            ? { ...room, number, type: form.type, price }
            : room
        )
      );
      setMessage(`Room ${number} successfully update ho gaya.`);
    } else {
      const newRoom: Room = {
        number,
        type: form.type,
        price,
        status: "Available",
      };
      setRooms((previous) => [...previous, newRoom]);
      setMessage("Room successfully add ho gaya.");
    }

    setForm({ number: "", type: "Standard", price: "" });
    setEditingNumber(null);
    setShowForm(false);
  }

  function startEdit(room: Room) {
    setEditingNumber(room.number);
    setForm({
      number: room.number,
      type: room.type,
      price: String(room.price),
    });
    setShowForm(true);
    setMessage("");
  }

  function cancelForm() {
    setShowForm(false);
    setEditingNumber(null);
    setForm({ number: "", type: "Standard", price: "" });
  }

  function deleteRoom(number: string) {
    setMessage("");

    try {
      const savedBookings = localStorage.getItem(BOOKINGS_KEY);
      const bookings: StoredBooking[] = savedBookings
        ? JSON.parse(savedBookings)
        : [];

      const hasActiveBooking = bookings.some(
        (booking) =>
          booking.room === number &&
          !["Cancelled", "Canceled"].includes(booking.status)
      );

      if (hasActiveBooking) {
        setMessage(
          `Room ${number} delete nahi kar sakte: is room se linked booking maujood hai.`
        );
        return;
      }

      if (!window.confirm(`Room ${number} delete karna hai? Ye action undo nahi hoga.`)) {
        return;
      }

      setRooms((previous) => previous.filter((room) => room.number !== number));
      setMessage(`Room ${number} delete ho gaya.`);
    } catch {
      setMessage("Booking data check nahi ho paya; room delete nahi kiya.");
    }
  }

  function updateStatus(number: string, status: Room["status"]) {
    setMessage("");

    try {
      const savedBookings = localStorage.getItem(BOOKINGS_KEY);
      const bookings: StoredBooking[] = savedBookings
        ? JSON.parse(savedBookings)
        : [];

      const hasCheckedInGuest = bookings.some(
        (booking) =>
          booking.room === number && booking.status === "Checked In",
      );

      if (status !== "Maintenance" && hasCheckedInGuest) {
        setMessage(
          "Is room mein guest Checked In hai. Pehle booking ka status update karo.",
        );
        return;
      }

      setRooms((previous) =>
        previous.map((room) =>
          room.number === number ? { ...room, status } : room,
        ),
      );

      setMessage(`Room ${number} ka status update ho gaya.`);
    } catch {
      setMessage("Room status update nahi ho paya.");
    }
  }

  const filteredRooms = rooms.filter((room) => {
    const query = search.toLowerCase().trim();

    const matchesSearch =
      room.number.toLowerCase().includes(query) ||
      room.type.toLowerCase().includes(query);

    return matchesSearch && (filter === "All" || room.status === filter);
  });

  const availableCount = rooms.filter(
    (room) => room.status === "Available",
  ).length;

  const occupiedCount = rooms.filter(
    (room) => room.status === "Occupied",
  ).length;

  const maintenanceCount = rooms.filter(
    (room) => room.status === "Maintenance",
  ).length;

  if (!loaded) {
    return <p className="p-6 text-slate-500">Loading rooms...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Room Management
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Manage rooms, room rates and availability.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowForm((previous) => !previous);
            setMessage("");
          }}
          className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
        >
          {showForm ? "Close Form ✕" : "+ Add Room"}
        </button>
      </div>

      {message && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          {
            label: "Available Rooms",
            count: availableCount,
            style: "border-emerald-200",
          },
          {
            label: "Occupied Rooms",
            count: occupiedCount,
            style: "border-blue-200",
          },
          {
            label: "Maintenance Rooms",
            count: maintenanceCount,
            style: "border-amber-200",
          },
        ].map((item) => (
          <div
            key={item.label}
            className={`rounded-2xl border ${item.style} bg-white p-5`}
          >
            <p className="text-sm text-slate-500">{item.label}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {item.count}
            </p>
          </div>
        ))}
      </div>

      {showForm && (
        <form
          onSubmit={saveRoom}
          className="grid grid-cols-1 gap-4 rounded-2xl border bg-white p-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          <input
            required
            placeholder="Room number"
            value={form.number}
            disabled={Boolean(editingNumber)}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                number: event.target.value,
              }))
            }
            className="rounded-xl border px-4 py-3"
          />

          <select
            value={form.type}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                type: event.target.value,
              }))
            }
            className="rounded-xl border bg-white px-4 py-3"
          >
            <option>Standard</option>
            <option>Deluxe</option>
            <option>Suite</option>
            <option>Premium Suite</option>
          </select>

          <input
            required
            type="number"
            min="1"
            step="1"
            placeholder="Price per night (₹)"
            value={form.price}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                price: event.target.value,
              }))
            }
            className="rounded-xl border px-4 py-3"
          />

          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-700"
            >
              {editingNumber ? "Update Room" : "Save Room"}
            </button>
            <button
              type="button"
              onClick={cancelForm}
              className="rounded-xl border px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          placeholder="Search room number or type..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full rounded-xl border bg-white px-4 py-3 sm:flex-1"
        />

        <select
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          className="rounded-xl border bg-white px-4 py-3"
        >
          <option>All</option>
          <option>Available</option>
          <option>Occupied</option>
          <option>Maintenance</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-2xl border bg-white">
        <table className="w-full min-w-[650px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-5 py-4">Room</th>
              <th className="px-5 py-4">Room Type</th>
              <th className="px-5 py-4">Price / Night</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Update Status</th>
              <th className="px-5 py-4">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y">
            {filteredRooms.map((room) => (
              <tr key={room.number}>
                <td className="px-5 py-4 font-semibold">{room.number}</td>

                <td className="px-5 py-4">{room.type}</td>

                <td className="px-5 py-4">
                  ₹{room.price.toLocaleString("en-IN")}
                </td>

                <td className="px-5 py-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle[room.status]}`}
                  >
                    {room.status}
                  </span>
                </td>

                <td className="px-5 py-4">
                  <select
                    aria-label={`Update status for room ${room.number}`}
                    value={room.status}
                    onChange={(event) =>
                      updateStatus(
                        room.number,
                        event.target.value as Room["status"],
                      )
                    }
                    className="rounded-lg border bg-white px-3 py-2"
                  >
                    <option>Available</option>
                    <option>Occupied</option>
                    <option>Maintenance</option>
                  </select>
                </td>
                <td className="px-5 py-4">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(room)}
                      className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteRoom(room.number)}
                      className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {filteredRooms.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-10 text-center text-slate-500"
                >
                  No rooms found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}