"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Alert = {
  id: string;
  title: string;
  message: string;
  type: "danger" | "warning" | "info";
  link: string;
};

const KEYS = {
  payments: "celebrations-hotel-payments",
  bookings: "celebrations-hotel-bookings",
  inventory: "celebrations-hotel-inventory",
  housekeeping: "celebrations-hotel-housekeeping",
  maintenance: "celebrations-hotel-work-orders",
};

function readData(key: string): Record<string, unknown>[] {
  try {
    const data = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export default function DashboardAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const refreshAlerts = () => {
      const next: Alert[] = [];

      // Pending payment balances
      const payments = readData(KEYS.payments);
      const bookings = readData(KEYS.bookings);

      const paymentMap = new Map(
        payments.map((p) => [String(p.bookingId), p])
      );

      bookings.forEach((booking) => {
        const id = String(booking.id || "");
        const payment = paymentMap.get(id);

        const paid = Number(payment?.paidAmount || 0);

        if (!payment || paid <= 0) {
          next.push({
            id: `payment-${id}`,
            title: "Payment Pending",
            message: `${String(booking.guest || "Guest")} — Booking ${id}`,
            type: "warning",
            link: "/payments",
          });
        }
      });

      // Low stock inventory
      readData(KEYS.inventory).forEach((item) => {
        const quantity = Number(item.quantity ?? item.stock ?? 0);
        const minimum = Number(item.minStock ?? item.minimumStock ?? 5);

        if (quantity <= 0) {
          next.push({
            id: `stock-out-${String(item.id || item.name)}`,
            title: "Out of Stock",
            message: `${String(item.name || "Item")} has no stock left.`,
            type: "danger",
            link: "/inventory",
          });
        } else if (quantity <= minimum) {
          next.push({
            id: `stock-low-${String(item.id || item.name)}`,
            title: "Low Inventory",
            message: `${String(item.name || "Item")} — ${quantity} remaining.`,
            type: "warning",
            link: "/inventory",
          });
        }
      });

      // Housekeeping alerts
      readData(KEYS.housekeeping).forEach((task) => {
        const status = String(task.status || "");
        const room = String(task.room || task.roomNumber || "Room");

        if (status === "Needs Cleaning") {
          next.push({
            id: `clean-${room}`,
            title: "Room Needs Cleaning",
            message: `${room} is waiting for housekeeping.`,
            type: "warning",
            link: "/housekeeping",
          });
        }
      });

      // Unresolved maintenance work
      readData(KEYS.maintenance).forEach((order) => {
        const status = String(order.status || "");

        if (status !== "Resolved") {
          const priority = String(order.priority || "Medium");

          next.push({
            id: `maintenance-${String(order.id)}`,
            title: `${priority} Maintenance`,
            message: `${String(order.title || "Repair")} — ${String(order.room || "General Area")}`,
            type:
              priority === "Urgent" || priority === "High"
                ? "danger"
                : "info",
            link: "/maintenance",
          });
        }
      });

      setAlerts(next);
      setLoaded(true);
    };

    refreshAlerts();

    // Refresh when this page is active and when another tab updates storage.
    const interval = window.setInterval(refreshAlerts, 5000);
    window.addEventListener("storage", refreshAlerts);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("storage", refreshAlerts);
    };
  }, []);

  const styles = {
    danger: "border-red-200 bg-red-50 text-red-800",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    info: "border-blue-200 bg-blue-50 text-blue-900",
  };

  if (!loaded) return null;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold">
            🔔 Operational Alerts
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Payments, inventory, housekeeping aur maintenance.
          </p>
        </div>

        <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-bold">
          {alerts.length} Alerts
        </span>
      </div>

      {alerts.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-gray-300 p-6 text-center">
          <p className="text-lg font-bold text-emerald-700">
            ✅ All Clear!
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Koi active operational alert nahi hai.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {alerts.slice(0, 10).map((alert) => (
            <Link
              key={alert.id}
              href={alert.link}
              className={`block rounded-xl border p-4 transition hover:shadow-sm ${styles[alert.type]}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold">{alert.title}</p>
                  <p className="mt-1 text-sm">{alert.message}</p>
                </div>
                <span aria-hidden="true">→</span>
              </div>
            </Link>
          ))}

          {alerts.length > 10 && (
            <p className="text-center text-sm text-gray-500">
              +{alerts.length - 10} more alerts
            </p>
          )}
        </div>
      )}
    </section>
  );
}