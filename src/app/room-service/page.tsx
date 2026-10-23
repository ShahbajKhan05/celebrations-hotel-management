"use client";

import { useEffect, useMemo, useState } from "react";

type ServiceOrder = {
  id: string;
  room: string;
  guest: string;
  items: string;
  amount: number;
  priority: "Normal" | "Urgent";
  status: "New" | "Preparing" | "Delivered" | "Cancelled";
  createdAt: string;
};

const KEY = "celebrations-hotel-room-service";

const statuses: ServiceOrder["status"][] = [
  "New",
  "Preparing",
  "Delivered",
  "Cancelled",
];

export default function RoomServicePage() {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    room: "",
    guest: "",
    items: "",
    amount: "",
    priority: "Normal" as ServiceOrder["priority"],
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setOrders(parsed);
      }
    } catch {
      console.error("Room service orders could not be loaded.");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(KEY, JSON.stringify(orders));
  }, [orders, loaded]);

  function createOrder(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const amount = Number(form.amount);

    if (!form.room.trim() || !form.guest.trim() || !form.items.trim()) {
      alert("Please fill in all required fields.");
      return;
    }

    if (!Number.isFinite(amount) || amount < 0) {
      alert("Enter a valid amount.");
      return;
    }

    const order: ServiceOrder = {
      id: crypto.randomUUID(),
      room: form.room.trim(),
      guest: form.guest.trim(),
      items: form.items.trim(),
      amount,
      priority: form.priority,
      status: "New",
      createdAt: new Date().toISOString(),
    };

    setOrders((prev) => [order, ...prev]);
    setForm({
      room: "",
      guest: "",
      items: "",
      amount: "",
      priority: "Normal",
    });
    setShowForm(false);
  }

  function updateStatus(id: string, status: ServiceOrder["status"]) {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === id ? { ...order, status } : order
      )
    );
  }

  function deleteOrder(id: string) {
    if (!window.confirm("Delete this room service order?")) return;
    setOrders((prev) => prev.filter((order) => order.id !== id));
  }

  const filteredOrders = useMemo(() => {
    const query = search.toLowerCase().trim();

    return orders.filter((order) => {
      const matchesSearch = [
        order.room,
        order.guest,
        order.items,
        order.id,
      ].some((value) => value.toLowerCase().includes(query));

      const matchesStatus = filter === "All" || order.status === filter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, search, filter]);

  const pending = orders.filter(
    (order) => order.status === "New" || order.status === "Preparing"
  ).length;

  const delivered = orders.filter(
    (order) => order.status === "Delivered"
  ).length;

  const revenue = orders
    .filter((order) => order.status === "Delivered")
    .reduce((sum, order) => sum + order.amount, 0);

  if (!loaded) {
    return <main className="p-5 text-gray-500">Loading room service...</main>;
  }

  return (
    <main className="min-h-screen bg-gray-50 p-3 sm:p-5 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              🍽️ Room Service
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage guest food and service orders.
            </p>
          </div>

          <button
            onClick={() => setShowForm((value) => !value)}
            className="min-h-11 w-full rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700 sm:w-auto"
          >
            {showForm ? "Close Form" : "+ New Order"}
          </button>
        </header>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Total Orders", value: orders.length, icon: "📋" },
            { label: "Pending Orders", value: pending, icon: "⏳" },
            { label: "Delivered", value: delivered, icon: "✅" },
            {
              label: "Delivered Revenue",
              value: `₹${revenue.toLocaleString("en-IN")}`,
              icon: "💰",
            },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5"
            >
              <p className="text-sm text-gray-500">{card.label}</p>
              <div className="mt-3 flex items-center justify-between gap-2">
                <p className="break-words text-2xl font-bold text-gray-900">
                  {card.value}
                </p>
                <span className="text-2xl">{card.icon}</span>
              </div>
            </div>
          ))}
        </section>

        {showForm && (
          <form
            onSubmit={createOrder}
            className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6"
          >
            <h2 className="text-lg font-bold text-gray-900">Create Order</h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <label className="text-sm font-medium text-gray-700">
                Room Number *
                <input
                  required
                  value={form.room}
                  onChange={(e) =>
                    setForm({ ...form, room: e.target.value })
                  }
                  placeholder="e.g. 101"
                  className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 px-3 outline-none focus:border-indigo-500"
                />
              </label>

              <label className="text-sm font-medium text-gray-700">
                Guest Name *
                <input
                  required
                  value={form.guest}
                  onChange={(e) =>
                    setForm({ ...form, guest: e.target.value })
                  }
                  placeholder="Guest name"
                  className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 px-3 outline-none focus:border-indigo-500"
                />
              </label>

              <label className="text-sm font-medium text-gray-700">
                Amount (₹) *
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) =>
                    setForm({ ...form, amount: e.target.value })
                  }
                  placeholder="500"
                  className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 px-3 outline-none focus:border-indigo-500"
                />
              </label>

              <label className="text-sm font-medium text-gray-700 sm:col-span-2 lg:col-span-2">
                Food / Service Items *
                <input
                  required
                  value={form.items}
                  onChange={(e) =>
                    setForm({ ...form, items: e.target.value })
                  }
                  placeholder="2 coffees, 1 sandwich..."
                  className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 px-3 outline-none focus:border-indigo-500"
                />
              </label>

              <label className="text-sm font-medium text-gray-700">
                Priority
                <select
                  value={form.priority}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      priority: e.target.value as ServiceOrder["priority"],
                    })
                  }
                  className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3"
                >
                  <option>Normal</option>
                  <option>Urgent</option>
                </select>
              </label>
            </div>

            <button
              type="submit"
              className="min-h-11 w-full rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700 sm:w-auto"
            >
              Save Order
            </button>
          </form>
        )}

        <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 md:flex-row">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search room, guest or items..."
              className="min-h-11 w-full min-w-0 rounded-lg border border-gray-300 px-3 md:flex-1"
            />

            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 md:w-52"
            >
              <option value="All">All Statuses</option>
              {statuses.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="rounded-xl bg-gray-50 px-4 py-12 text-center">
              <p className="text-3xl">🍽️</p>
              <p className="mt-2 font-semibold text-gray-700">No orders found</p>
              <p className="mt-1 text-sm text-gray-500">
                Create a room service order to get started.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {filteredOrders.map((order) => (
                <article
                  key={order.id}
                  className="min-w-0 rounded-xl border border-gray-200 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words font-bold text-gray-900">
                        Room {order.room} · {order.guest}
                      </p>
                      <p className="mt-1 break-words text-sm text-gray-600">
                        {order.items}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                        order.priority === "Urgent"
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {order.priority}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-lg font-bold text-indigo-700">
                      ₹{order.amount.toLocaleString("en-IN")}
                    </p>

                    <select
                      aria-label={`Status for room ${order.room}`}
                      value={order.status}
                      onChange={(e) =>
                        updateStatus(
                          order.id,
                          e.target.value as ServiceOrder["status"]
                        )
                      }
                      className="min-h-11 min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-2 text-sm sm:flex-none"
                    >
                      {statuses.map((status) => (
                        <option key={status}>{status}</option>
                      ))}
                    </select>
                  </div>

                  <p className="mt-3 break-words text-xs text-gray-400">
                    Order: {order.id.slice(0, 8)} ·{" "}
                    {new Date(order.createdAt).toLocaleString("en-IN")}
                  </p>

                  <button
                    onClick={() => deleteOrder(order.id)}
                    className="mt-3 min-h-11 w-full rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 sm:w-auto"
                  >
                    Delete Order
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        <p className="text-xs leading-5 text-gray-500">
          Note: Orders are stored in this browser&apos;s localStorage. They
          will not automatically sync across different devices.
        </p>
      </div>
    </main>
  );
}