"use client";

import { useEffect, useMemo, useState } from "react";
import { useBookings } from "@/components/BookingStorage";

type Notification = {
  id: string;
  title: string;
  message: string;
  category: "Booking" | "Inventory" | "Event" | "System";
  createdAt: string;
  read: boolean;
};

type InventoryItem = {
  id?: string;
  name: string;
  quantity: number;
  minStock?: number;
};

type HotelEvent = {
  id?: string;
  name: string;
  date: string;
  venue: string;
  status: string;
};

const STORAGE_KEY = "celebrations-hotel-notifications";

const initialNotifications: Notification[] = [
  {
    id: "NT-001",
    title: "Welcome to Celebrations",
    message: "Your hotel management notification centre is ready.",
    category: "System",
    createdAt: new Date().toISOString(),
    read: false,
  },
];

function readJSON<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function makeId() {
  return `NT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function NotificationsPage() {
  const { bookings, isLoaded: bookingsLoaded } = useBookings();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const saved = readJSON<Notification[] | null>(STORAGE_KEY, null);

    setNotifications(
      Array.isArray(saved) ? saved : initialNotifications,
    );
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  }, [notifications, loaded]);

  const unreadCount = notifications.filter((item) => !item.read).length;

  const visibleNotifications = useMemo(() => {
    return notifications.filter((item) => {
      const matchesFilter =
        filter === "All" ||
        (filter === "Unread" && !item.read) ||
        (filter === "Read" && item.read) ||
        item.category === filter;

      const query = search.toLowerCase();

      const matchesSearch =
        item.title.toLowerCase().includes(query) ||
        item.message.toLowerCase().includes(query) ||
        item.id.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query);

      return matchesFilter && matchesSearch;
    });
  }, [notifications, filter, search]);

  const addNotification = (
    title: string,
    message: string,
    category: Notification["category"],
  ) => {
    setNotifications((current) => [
      {
        id: makeId(),
        title,
        message,
        category,
        createdAt: new Date().toISOString(),
        read: false,
      },
      ...current,
    ]);
  };

  const markRead = (id: string) => {
    setNotifications((current) =>
      current.map((item) =>
        item.id === id ? { ...item, read: true } : item,
      ),
    );
  };

  const markUnread = (id: string) => {
    setNotifications((current) =>
      current.map((item) =>
        item.id === id ? { ...item, read: false } : item,
      ),
    );
  };

  const markAllRead = () => {
    setNotifications((current) =>
      current.map((item) => ({ ...item, read: true })),
    );
  };

  const deleteNotification = (id: string) => {
    setNotifications((current) => current.filter((item) => item.id !== id));
  };

  const clearRead = () => {
    setNotifications((current) => current.filter((item) => !item.read));
  };

  const generateAlerts = () => {
    const inventory = readJSON<InventoryItem[]>(
      "celebrations-hotel-inventory",
      [],
    );

    const events = readJSON<HotelEvent[]>(
      "celebrations-hotel-events",
      [],
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const newAlerts: Notification[] = [];

    const upcomingBookings = bookings.filter((booking) => {
      if (booking.status === "Cancelled") return false;

      const checkIn = new Date(`${booking.checkIn}T00:00:00`);
      const difference = Math.round(
        (checkIn.getTime() - today.getTime()) / 86400000,
      );

      return difference >= 0 && difference <= 1;
    });

    upcomingBookings.forEach((booking) => {
      newAlerts.push({
        id: makeId(),
        title: "Upcoming Guest Arrival",
        message: `${booking.guest} — Room ${booking.room}, check-in ${booking.checkIn}.`,
        category: "Booking",
        createdAt: new Date().toISOString(),
        read: false,
      });
    });

    inventory
      .filter((item) => item.quantity <= (item.minStock ?? 0))
      .forEach((item) => {
        newAlerts.push({
          id: makeId(),
          title: item.quantity <= 0 ? "Item Out of Stock" : "Low Inventory Stock",
          message: `${item.name}: ${item.quantity} remaining; minimum stock is ${item.minStock ?? 0}.`,
          category: "Inventory",
          createdAt: new Date().toISOString(),
          read: false,
        });
      });

    events
      .filter((event) => event.status === "Confirmed")
      .forEach((event) => {
        const eventDate = new Date(`${event.date}T00:00:00`);
        const difference = Math.round(
          (eventDate.getTime() - today.getTime()) / 86400000,
        );

        if (difference >= 0 && difference <= 3) {
          newAlerts.push({
            id: makeId(),
            title: "Upcoming Confirmed Event",
            message: `${event.name} at ${event.venue} on ${event.date}.`,
            category: "Event",
            createdAt: new Date().toISOString(),
            read: false,
          });
        }
      });

    if (newAlerts.length === 0) {
      addNotification(
        "No New Operational Alerts",
        "No upcoming arrivals, low-stock items or confirmed events in the next three days were found.",
        "System",
      );
      return;
    }

    setNotifications((current) => {
      const existingMessages = new Set(
        current.map((item) => `${item.title}|${item.message}`),
      );

      const uniqueAlerts = newAlerts.filter(
        (item) => !existingMessages.has(`${item.title}|${item.message}`),
      );

      return [...uniqueAlerts, ...current];
    });
  };

  if (!loaded || !bookingsLoaded) {
    return <div className="p-6 text-sm text-gray-500">Loading notifications...</div>;
  }

  const categoryStyle: Record<string, string> = {
    Booking: "bg-blue-100 text-blue-700",
    Inventory: "bg-amber-100 text-amber-700",
    Event: "bg-purple-100 text-purple-700",
    System: "bg-gray-100 text-gray-700",
  };

  return (
    <main className="min-h-screen space-y-6 bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="mt-1 text-sm text-gray-500">
            Hotel bookings, inventory aur events ke important alerts.
          </p>
        </div>

        <button
          onClick={generateAlerts}
          className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          ↻ Check Operational Alerts
        </button>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Total Notifications</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {notifications.length}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Unread</p>
          <p className="mt-2 text-3xl font-bold text-blue-600">
            {unreadCount}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Read</p>
          <p className="mt-2 text-3xl font-bold text-emerald-600">
            {notifications.length - unreadCount}
          </p>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-gray-100 p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search notifications..."
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500 lg:max-w-sm"
            />

            <div className="flex flex-wrap gap-2">
              <button
                onClick={markAllRead}
                disabled={unreadCount === 0}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
              >
                Mark All Read
              </button>

              <button
                onClick={clearRead}
                disabled={notifications.length === unreadCount}
                className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-40"
              >
                Clear Read
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {["All", "Unread", "Read", "Booking", "Inventory", "Event", "System"].map(
              (item) => (
                <button
                  key={item}
                  onClick={() => setFilter(item)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    filter === item
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {item}
                </button>
              ),
            )}
          </div>
        </div>

        {visibleNotifications.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl">🔔</div>
            <h2 className="mt-3 font-semibold text-gray-800">
              No notifications found
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Search ya filter change karo, ya operational alerts check karo.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {visibleNotifications.map((item) => (
              <article
                key={item.id}
                className={`flex flex-col gap-4 p-4 transition hover:bg-gray-50 sm:flex-row sm:items-start sm:justify-between sm:p-5 ${
                  !item.read ? "bg-blue-50/40" : ""
                }`}
              >
                <div className="flex min-w-0 gap-3">
                  <div
                    className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      categoryStyle[item.category] ?? categoryStyle.System
                    }`}
                  >
                    {item.category === "Booking"
                      ? "📅"
                      : item.category === "Inventory"
                        ? "📦"
                        : item.category === "Event"
                          ? "🎉"
                          : "🔔"}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-gray-900">
                        {item.title}
                      </h3>

                      {!item.read && (
                        <span className="h-2 w-2 rounded-full bg-blue-600" />
                      )}
                    </div>

                    <p className="mt-1 break-words text-sm leading-6 text-gray-600">
                      {item.message}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          categoryStyle[item.category] ?? categoryStyle.System
                        }`}
                      >
                        {item.category}
                      </span>

                      <span className="text-xs text-gray-400">
                        {new Date(item.createdAt).toLocaleString("en-IN")}
                      </span>

                      <span className="text-xs text-gray-400">
                        {item.id}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                  {item.read ? (
                    <button
                      onClick={() => markUnread(item.id)}
                      className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-white"
                    >
                      Mark Unread
                    </button>
                  ) : (
                    <button
                      onClick={() => markRead(item.id)}
                      className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-50"
                    >
                      Mark Read
                    </button>
                  )}

                  <button
                    onClick={() => deleteNotification(item.id)}
                    className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <p className="text-xs leading-5 text-gray-500">
        Notifications isi browser ke localStorage mein save hoti hain.
        Operational alerts generate karne ke liye “Check Operational Alerts”
        click karein; ye automatic background alerts nahi hain.
      </p>
    </main>
  );
}