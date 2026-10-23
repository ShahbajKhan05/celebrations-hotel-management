"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type OrderStatus = "New" | "Preparing" | "Delivered" | "Cancelled";

type ServiceOrder = {
  id: string;
  room: string;
  guest: string;
  items: string;
  amount: number;
  priority: "Normal" | "Urgent";
  status: OrderStatus;
  createdAt: string;
};

const STORAGE_KEY = "celebrations-hotel-room-service";

const activeStatuses: OrderStatus[] = ["New", "Preparing"];

export default function KitchenDisplayPage() {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [filter, setFilter] = useState<"All" | OrderStatus>("All");
  const [loaded, setLoaded] = useState(false);

  const refreshOrders = useCallback(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed: unknown = saved ? JSON.parse(saved) : [];

      if (Array.isArray(parsed)) {
        setOrders(parsed as ServiceOrder[]);
      }
    } catch {
      console.error("Kitchen orders could not be loaded.");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    refreshOrders();

    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null) {
        refreshOrders();
      }
    };

    const onFocus = () => refreshOrders();

    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);

    // Refresh when another tab updates localStorage.
    const timer = window.setInterval(refreshOrders, 3000);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
      window.clearInterval(timer);
    };
  }, [refreshOrders]);

  function updateStatus(id: string, status: OrderStatus) {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed: unknown = saved ? JSON.parse(saved) : [];

      if (!Array.isArray(parsed)) return;

      const updated = (parsed as ServiceOrder[]).map((order) =>
        order.id === id ? { ...order, status } : order
      );

      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setOrders(updated);
    } catch {
      alert("Order update nahi ho saka. Dobara try karein.");
    }
  }

  const visibleOrders = useMemo(() => {
    return orders
      .filter((order) => {
        if (filter === "All") return activeStatuses.includes(order.status);
        return order.status === filter;
      })
      .sort((a, b) => {
        if (a.priority !== b.priority) {
          return a.priority === "Urgent" ? -1 : 1;
        }

        return (
          new Date(a.createdAt).getTime() -
          new Date(b.createdAt).getTime()
        );
      });
  }, [orders, filter]);

  const newCount = orders.filter((o) => o.status === "New").length;
  const preparingCount = orders.filter(
    (o) => o.status === "Preparing"
  ).length;

  if (!loaded) {
    return <main className="p-5">Kitchen display load ho raha hai...</main>;
  }

  return (
    <main className="min-h-screen bg-slate-950 p-3 text-white sm:p-5 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold sm:text-3xl">
              🍳 Kitchen Display
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Room service orders · Auto-refresh every 3 seconds
            </p>
          </div>

          <button
            onClick={refreshOrders}
            className="min-h-11 w-full rounded-xl bg-slate-800 px-4 py-3 font-semibold hover:bg-slate-700 sm:w-auto"
          >
            ↻ Refresh Orders
          </button>
        </header>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-blue-400/20 bg-blue-400/10 p-4">
            <p className="text-sm text-blue-200">🆕 New Orders</p>
            <p className="mt-2 text-3xl font-extrabold">{newCount}</p>
          </div>

          <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4">
            <p className="text-sm text-amber-200">🔥 Preparing</p>
            <p className="mt-2 text-3xl font-extrabold">
              {preparingCount}
            </p>
          </div>
        </section>

        <div className="flex flex-wrap gap-2">
          {(["All", "New", "Preparing"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`min-h-11 rounded-xl px-4 py-2 text-sm font-bold ${
                filter === status
                  ? "bg-white text-slate-950"
                  : "bg-slate-800 text-slate-200 hover:bg-slate-700"
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {visibleOrders.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center sm:p-12">
            <p className="text-5xl">🍽️</p>
            <h2 className="mt-4 text-xl font-bold">No Active Orders</h2>
            <p className="mt-2 text-sm text-slate-400">
              Naya room service order aate hi yahan dikhega.
            </p>
          </div>
        ) : (
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleOrders.map((order) => (
              <article
                key={order.id}
                className={`min-w-0 rounded-2xl border bg-slate-900 p-4 sm:p-5 ${
                  order.priority === "Urgent"
                    ? "border-red-500"
                    : "border-slate-700"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-slate-400">ROOM</p>
                    <h2 className="break-words text-2xl font-extrabold">
                      {order.room}
                    </h2>
                    <p className="mt-1 break-words font-medium text-slate-300">
                      {order.guest}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      order.priority === "Urgent"
                        ? "bg-red-500/20 text-red-300"
                        : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    {order.priority === "Urgent" ? "🚨 URGENT" : "NORMAL"}
                  </span>
                </div>

                <div className="my-4 rounded-xl bg-slate-800 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Order Items
                  </p>
                  <p className="mt-2 break-words text-lg font-semibold">
                    {order.items}
                  </p>
                  <p className="mt-3 text-sm text-emerald-300">
                    ₹{order.amount.toLocaleString("en-IN")}
                  </p>
                </div>

                <p className="mb-4 text-xs text-slate-400">
                  Received:{" "}
                  {new Date(order.createdAt).toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>

                {order.status === "New" ? (
                  <button
                    onClick={() => updateStatus(order.id, "Preparing")}
                    className="min-h-12 w-full rounded-xl bg-amber-500 px-4 py-3 font-extrabold text-slate-950 hover:bg-amber-400"
                  >
                    🔥 Start Preparing
                  </button>
                ) : (
                  <button
                    onClick={() => updateStatus(order.id, "Delivered")}
                    className="min-h-12 w-full rounded-xl bg-emerald-500 px-4 py-3 font-extrabold text-slate-950 hover:bg-emerald-400"
                  >
                    ✓ Mark Delivered
                  </button>
                )}
              </article>
            ))}
          </section>
        )}

        <p className="text-xs leading-5 text-slate-500">
          Heads up: This version uses browser localStorage. Separate devices
          do not automatically share orders; true multi-device kitchen updates
          require a shared backend or database.
        </p>
      </div>
    </main>
  );
}