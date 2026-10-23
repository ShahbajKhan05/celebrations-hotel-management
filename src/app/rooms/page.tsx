"use client";

import { useEffect, useState } from "react";

type Room = {
  number: string;
  type: string;
  price: number;
  status: "Available" | "Occupied" | "Maintenance";
};

const STORAGE_KEY = "celebrations-hotel-rooms";

const initialRooms: Room[] = [
  { number: "108", type: "Standard", price: 1800, status: "Available" },
  { number: "204", type: "Deluxe", price: 2800, status: "Occupied" },
  { number: "305", type: "Suite", price: 4500, status: "Available" },
  { number: "401", type: "Deluxe", price: 2800, status: "Available" },
  { number: "502", type: "Premium Suite", price: 6000, status: "Maintenance" },
];

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const [form, setForm] = useState({
    number: "",
    type: "Standard",
    price: "",
    status: "Available" as Room["status"],
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (saved) {
        const parsed: unknown = JSON.parse(saved);

        if (Array.isArray(parsed)) {
          setRooms(parsed as Room[]);
        } else {
          setRooms(initialRooms);
        }
      } else {
        setRooms(initialRooms);
      }
    } catch {
      setRooms(initialRooms);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (loaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms));
    }
  }, [rooms, loaded]);

  function addRoom(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const number = form.number.trim();

    if (rooms.some((room) => room.number === number)) {
      alert("Ye room number pehle se exist karta hai.");
      return;
    }

    setRooms((previous) => [
      ...previous,
      {
        number,
        type: form.type,
        price: Number(form.price),
        status: form.status,
      },
    ]);

    setForm({
      number: "",
      type: "Standard",
      price: "",
      status: "Available",
    });

    setShowForm(false);
  }

  function updateStatus(number: string, status: Room["status"]) {
    setRooms((previous) =>
      previous.map((room) =>
        room.number === number ? { ...room, status } : room,
      ),
    );
  }

  const filteredRooms = rooms.filter((room) => {
    const matchesSearch =
      room.number.toLowerCase().includes(search.toLowerCase()) ||
      room.type.toLowerCase().includes(search.toLowerCase());

    return matchesSearch && (filter === "All" || room.status === filter);
  });

  const statusStyle = {
    Available: "bg-emerald-100 text-emerald-700",
    Occupied: "bg-blue-100 text-blue-700",
    Maintenance: "bg-amber-100 text-amber-700",
  };

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
          onClick={() => setShowForm(!showForm)}
          className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
        >
          + Add Room
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {(["Available", "Occupied", "Maintenance"] as const).map((status) => (
          <div key={status} className="rounded-2xl border bg-white p-5">
            <p className="text-sm text-slate-500">{status} Rooms</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {rooms.filter((room) => room.status === status).length}
            </p>
          </div>
        ))}
      </div>

      {showForm && (
        <form
          onSubmit={addRoom}
          className="grid grid-cols-1 gap-4 rounded-2xl border bg-white p-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          <input
            required
            placeholder="Room number"
            value={form.number}
            onChange={(e) => setForm({ ...form, number: e.target.value })}
            className="rounded-xl border px-4 py-3"
          />

          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
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
            placeholder="Price per night (₹)"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            className="rounded-xl border px-4 py-3"
          />

          <button
            type="submit"
            className="rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-700"
          >
            Save Room
          </button>
        </form>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          placeholder="Search room number or type..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border bg-white px-4 py-3 sm:flex-1"
        />

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
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
                    value={room.status}
                    onChange={(e) =>
                      updateStatus(room.number, e.target.value as Room["status"])
                    }
                    className="rounded-lg border bg-white px-3 py-2"
                  >
                    <option>Available</option>
                    <option>Occupied</option>
                    <option>Maintenance</option>
                  </select>
                </td>
              </tr>
            ))}

            {filteredRooms.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-slate-500">
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