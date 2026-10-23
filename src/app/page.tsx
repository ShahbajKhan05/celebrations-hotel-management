"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useBookings } from "@/components/BookingStorage";

type Room = {
  number: string;
  type: string;
  price: number;
  status: "Available" | "Occupied" | "Maintenance";
};

type InventoryItem = {
  id?: string;
  name: string;
  quantity: number;
  unit: string;
  minStock: number;
};

type EventItem = {
  id: string;
  name: string;
  date: string;
  venue: string;
  guests: number;
  status: string;
};

type Settings = {
  propertyName?: string;
  city?: string;
};

const DEFAULT_ROOMS: Room[] = [
  { number: "108", type: "Standard", price: 1800, status: "Available" },
  { number: "204", type: "Deluxe", price: 2800, status: "Occupied" },
  { number: "305", type: "Suite", price: 4500, status: "Available" },
  { number: "401", type: "Deluxe", price: 2800, status: "Available" },
  {
    number: "502",
    type: "Premium Suite",
    price: 6000,
    status: "Maintenance",
  },
];

const money = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

const dateLabel = (date: string) => {
  if (!date) return "—";

  const parsed = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) return date;

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const readStorage = <T,>(key: string, fallback: T): T => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? (JSON.parse(saved) as T) : fallback;
  } catch {
    return fallback;
  }
};

export default function DashboardPage() {
  const { bookings, isLoaded } = useBookings();

  const [rooms, setRooms] = useState<Room[]>(DEFAULT_ROOMS);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [propertyName, setPropertyName] = useState(
    "Celebrations Hotel & Resort"
  );
  const [today, setToday] = useState("");

  useEffect(() => {
    const currentDate = new Date();
    setToday(
      [
        currentDate.getFullYear(),
        String(currentDate.getMonth() + 1).padStart(2, "0"),
        String(currentDate.getDate()).padStart(2, "0"),
      ].join("-")
    );

    setRooms(
      readStorage<Room[]>("celebrations-hotel-rooms", DEFAULT_ROOMS)
    );

    setInventory(
      readStorage<InventoryItem[]>("celebrations-hotel-inventory", [])
    );

    setEvents(
      readStorage<EventItem[]>("celebrations-hotel-events", [])
    );

    const settings = readStorage<Settings>(
      "celebrations-hotel-settings",
      {}
    );

    if (settings.propertyName) {
      setPropertyName(settings.propertyName);
    }
  }, []);

  const roomStats = useMemo(() => {
    const total = rooms.length;
    const occupied = rooms.filter(
      (room) => room.status === "Occupied"
    ).length;
    const available = rooms.filter(
      (room) => room.status === "Available"
    ).length;
    const maintenance = rooms.filter(
      (room) => room.status === "Maintenance"
    ).length;

    return {
      total,
      occupied,
      available,
      maintenance,
      occupancy: total ? Math.round((occupied / total) * 100) : 0,
    };
  }, [rooms]);

  const activeBookings = bookings.filter(
    (booking) => booking.status !== "Cancelled"
  );

  const todayCheckIns = activeBookings.filter(
    (booking) => booking.checkIn === today
  ).length;

  const todayCheckOuts = activeBookings.filter(
    (booking) => booking.checkOut === today
  ).length;

  const guestCount = new Set(
    activeBookings.map((booking) =>
      booking.phone?.trim()
        ? booking.phone.trim()
        : booking.guest.trim().toLowerCase()
    )
  ).size;

  const estimatedRevenue = useMemo(() => {
    if (!today) return 0;

    const currentMonth = today.slice(0, 7);

    return activeBookings.reduce((total, booking) => {
      if (!booking.checkIn?.startsWith(currentMonth)) {
        return total;
      }

      const room = rooms.find(
        (item) => item.number === booking.room
      );

      if (!room) return total;

      const checkIn = new Date(`${booking.checkIn}T00:00:00`);
      const checkOut = new Date(`${booking.checkOut}T00:00:00`);

      const nights = Math.max(
        1,
        Math.ceil(
          (checkOut.getTime() - checkIn.getTime()) /
            (1000 * 60 * 60 * 24)
        )
      );

      return total + room.price * nights;
    }, 0);
  }, [activeBookings, rooms, today]);

  const lowStockItems = inventory.filter(
    (item) => item.quantity <= item.minStock
  );

  const upcomingEvents = events
    .filter(
      (event) =>
        event.date >= today &&
        event.status !== "Cancelled" &&
        event.status !== "Completed"
    )
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);

  const recentBookings = [...bookings]
    .sort((a, b) => b.checkIn.localeCompare(a.checkIn))
    .slice(0, 5);

  const quickActions = [
    {
      title: "New Booking",
      description: "Create a room reservation",
      href: "/bookings",
      icon: "📅",
    },
    {
      title: "Manage Rooms",
      description: "Check room status",
      href: "/rooms",
      icon: "🛏️",
    },
    {
      title: "Restaurant POS",
      description: "Create a restaurant order",
      href: "/pos",
      icon: "🍽️",
    },
    {
      title: "Add Event",
      description: "Manage banquets and events",
      href: "/events",
      icon: "🎉",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <section className="flex flex-col justify-between gap-4 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-700 p-6 text-white sm:flex-row sm:items-center">
        <div>
          <p className="text-sm text-slate-300">
            HOTEL MANAGEMENT DASHBOARD
          </p>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
            Welcome to {propertyName}
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            Your hotel operations at a glance.
          </p>
        </div>

        <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3">
          <p className="text-xs text-slate-300">Today</p>
          <p className="mt-1 text-lg font-semibold">
            {today ? dateLabel(today) : "Loading..."}
          </p>
        </div>
      </section>

      {/* KPI Cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Rooms"
          value={roomStats.total}
          detail={`${roomStats.available} available`}
          icon="🛏️"
          color="blue"
        />

        <StatCard
          title="Active Bookings"
          value={activeBookings.length}
          detail={`${todayCheckIns} check-ins today`}
          icon="📅"
          color="purple"
        />

        <StatCard
          title="Unique Guests"
          value={guestCount}
          detail={`${todayCheckOuts} check-outs today`}
          icon="👥"
          color="green"
        />

        <StatCard
          title="Estimated Room Revenue"
          value={money(estimatedRevenue)}
          detail="Based on booking dates and current room prices"
          icon="💰"
          color="orange"
        />
      </section>

      {/* Occupancy + Room Status */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                Room Occupancy
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Current room status overview
              </p>
            </div>

            <Link
              href="/rooms"
              className="text-sm font-semibold text-blue-600 hover:text-blue-800"
            >
              Manage Rooms →
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-1 items-center gap-8 sm:grid-cols-2">
            <div className="flex justify-center">
              <div
                className="relative flex h-44 w-44 items-center justify-center rounded-full"
                style={{
                  background: `conic-gradient(#2563eb 0% ${roomStats.occupancy}%, #e2e8f0 ${roomStats.occupancy}% 100%)`,
                }}
              >
                <div className="flex h-32 w-32 flex-col items-center justify-center rounded-full bg-white">
                  <span className="text-3xl font-bold text-slate-800">
                    {roomStats.occupancy}%
                  </span>
                  <span className="text-xs text-slate-500">
                    Occupied
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <RoomLegend
                label="Occupied"
                count={roomStats.occupied}
                color="bg-blue-600"
              />
              <RoomLegend
                label="Available"
                count={roomStats.available}
                color="bg-emerald-500"
              />
              <RoomLegend
                label="Maintenance"
                count={roomStats.maintenance}
                color="bg-amber-500"
              />

              <div className="border-t border-slate-100 pt-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Total Rooms</span>
                  <span className="font-bold text-slate-800">
                    {roomStats.total}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Today's Operations */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800">
            Today&apos;s Operations
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Daily front-desk overview
          </p>

          <div className="mt-5 space-y-4">
            <OperationRow
              icon="🟢"
              label="Check-ins"
              value={todayCheckIns}
            />
            <OperationRow
              icon="🔵"
              label="Check-outs"
              value={todayCheckOuts}
            />
            <OperationRow
              icon="🛏️"
              label="Available Rooms"
              value={roomStats.available}
            />
            <OperationRow
              icon="🧰"
              label="Low Stock Items"
              value={lowStockItems.length}
            />
          </div>

          <Link
            href="/bookings"
            className="mt-6 block rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            View Bookings
          </Link>
        </div>
      </section>

      {/* Quick Actions */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-800">
            Quick Actions
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Frequently used hotel management modules
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {quickActions.map((action) => (
            <Link
              key={action.title}
              href={action.href}
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
            >
              <span className="text-3xl">{action.icon}</span>
              <h3 className="mt-4 font-bold text-slate-800 group-hover:text-blue-600">
                {action.title}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {action.description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Events + Inventory */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                Upcoming Events
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Scheduled banquets and functions
              </p>
            </div>

            <Link
              href="/events"
              className="text-sm font-semibold text-blue-600 hover:text-blue-800"
            >
              View All →
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {upcomingEvents.length === 0 ? (
              <EmptyState message="No upcoming events found." />
            ) : (
              upcomingEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 rounded-xl bg-slate-50 p-4"
                >
                  <div className="rounded-lg bg-purple-100 px-3 py-2 text-center">
                    <span className="block text-xs text-purple-700">
                      {event.date
                        ? new Date(
                            `${event.date}T00:00:00`
                          ).toLocaleDateString("en-IN", {
                            month: "short",
                          })
                        : "—"}
                    </span>
                    <span className="block text-lg font-bold text-purple-800">
                      {event.date
                        ? new Date(
                            `${event.date}T00:00:00`
                          ).getDate()
                        : "—"}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold text-slate-800">
                      {event.name}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {event.venue} · {event.guests} guests
                    </p>
                  </div>

                  <StatusBadge status={event.status} />
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                Inventory Alerts
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Items at or below minimum stock
              </p>
            </div>

            <Link
              href="/inventory"
              className="text-sm font-semibold text-blue-600 hover:text-blue-800"
            >
              Manage Stock →
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {lowStockItems.length === 0 ? (
              <EmptyState message="No low-stock items. Inventory looks good!" />
            ) : (
              lowStockItems.slice(0, 5).map((item) => (
                <div
                  key={item.id ?? item.name}
                  className="flex items-center justify-between gap-3 rounded-xl bg-amber-50 p-4"
                >
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-slate-800">
                      {item.name}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Minimum stock: {item.minStock} {item.unit}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="font-bold text-amber-700">
                      {item.quantity} {item.unit}
                    </p>
                    <p className="text-xs text-amber-700">
                      {item.quantity <= 0 ? "Out of stock" : "Low stock"}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Recent Bookings */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-6">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              Recent Bookings
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Latest room reservation records
            </p>
          </div>

          <Link
            href="/bookings"
            className="rounded-lg bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
          >
            All Bookings →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-6 py-4 font-semibold">Guest</th>
                <th className="px-6 py-4 font-semibold">Phone</th>
                <th className="px-6 py-4 font-semibold">Room</th>
                <th className="px-6 py-4 font-semibold">Check-in</th>
                <th className="px-6 py-4 font-semibold">Check-out</th>
                <th className="px-6 py-4 font-semibold">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {!isLoaded ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-10 text-center text-slate-500"
                  >
                    Loading bookings...
                  </td>
                </tr>
              ) : recentBookings.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-10 text-center text-slate-500"
                  >
                    No bookings yet. Create your first booking.
                  </td>
                </tr>
              ) : (
                recentBookings.map((booking) => (
                  <tr
                    key={booking.id}
                    className="transition hover:bg-slate-50"
                  >
                    <td className="px-6 py-4 font-semibold text-slate-800">
                      {booking.guest}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {booking.phone || "—"}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {booking.room}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {dateLabel(booking.checkIn)}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {dateLabel(booking.checkOut)}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={booking.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="pb-2 text-center text-xs text-slate-400">
        {propertyName} · Dashboard · Data stored in this browser
      </footer>
    </div>
  );
}

function StatCard({
  title,
  value,
  detail,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  detail: string;
  icon: string;
  color: "blue" | "purple" | "green" | "orange";
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-700",
    purple: "bg-purple-50 text-purple-700",
    green: "bg-emerald-50 text-emerald-700",
    orange: "bg-orange-50 text-orange-700",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <h3 className="mt-2 break-words text-2xl font-bold text-slate-800">
            {value}
          </h3>
        </div>
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl ${colors[color]}`}
        >
          {icon}
        </span>
      </div>

      <p className="mt-3 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

function RoomLegend({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className={`h-3 w-3 rounded-full ${color}`} />
        <span className="text-sm text-slate-600">{label}</span>
      </div>
      <span className="text-sm font-bold text-slate-800">{count}</span>
    </div>
  );
}

function OperationRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
          {icon}
        </span>
        <span className="text-sm text-slate-600">{label}</span>
      </div>
      <span className="text-lg font-bold text-slate-800">{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();

  let style = "bg-slate-100 text-slate-700";

  if (
    normalized === "confirmed" ||
    normalized === "active" ||
    normalized === "completed"
  ) {
    style = "bg-emerald-100 text-emerald-700";
  } else if (
    normalized === "cancelled" ||
    normalized === "canceled" ||
    normalized === "maintenance"
  ) {
    style = "bg-red-100 text-red-700";
  } else if (
    normalized === "pending" ||
    normalized === "tentative" ||
    normalized === "occupied"
  ) {
    style = "bg-amber-100 text-amber-700";
  }

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${style}`}
    >
      {status}
    </span>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}