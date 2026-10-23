"use client";

import { useEffect, useMemo, useState } from "react";
import { useBookings } from "@/components/BookingStorage";

type Room = {
  number: string;
  type: string;
  price: number;
  status: "Available" | "Occupied" | "Maintenance";
};

type POSOrder = {
  id: string;
  total?: number;
  grandTotal?: number;
  amount?: number;
  status?: string;
  createdAt?: string;
  date?: string;
};

const ROOMS_KEY = "celebrations-hotel-rooms";
const POS_KEY = "celebrations-hotel-pos-orders";

const INACTIVE_BOOKING_STATUSES = [
  "cancelled",
  "canceled",
  "checked out",
  "checked-out",
  "checkedout",
  "completed",
];

function readArray<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);

    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);

    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function isActiveBooking(status: string): boolean {
  return !INACTIVE_BOOKING_STATUSES.includes(
    status.trim().toLowerCase()
  );
}

function isToday(dateString?: string): boolean {
  if (!dateString) return false;

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return false;

  const today = new Date();

  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function getNights(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;

  const start = new Date(`${checkIn}T00:00:00`);
  const end = new Date(`${checkOut}T00:00:00`);

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime())
  ) {
    return 0;
  }

  const difference = end.getTime() - start.getTime();

  return Math.max(0, Math.ceil(difference / 86400000));
}

function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
}

export default function HotelAnalytics() {
  const { bookings } = useBookings();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [posOrders, setPosOrders] = useState<POSOrder[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    function refreshData() {
      setRooms(readArray<Room>(ROOMS_KEY));
      setPosOrders(readArray<POSOrder>(POS_KEY));
      setLoaded(true);
    }

    refreshData();

    function handleStorage(event: StorageEvent) {
      if (
        event.key === null ||
        event.key === ROOMS_KEY ||
        event.key === POS_KEY
      ) {
        refreshData();
      }
    }

    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", refreshData);

    const timer = window.setInterval(refreshData, 5000);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", refreshData);
      window.clearInterval(timer);
    };
  }, []);

  const analytics = useMemo(() => {
    const activeBookings = bookings.filter((booking) =>
      isActiveBooking(booking.status)
    );

    const occupiedRooms = rooms.filter(
      (room) => room.status === "Occupied"
    );

    const availableRooms = rooms.filter(
      (room) => room.status === "Available"
    );

    const maintenanceRooms = rooms.filter(
      (room) => room.status === "Maintenance"
    );

    const occupancyRate =
      rooms.length > 0
        ? Math.round((occupiedRooms.length / rooms.length) * 100)
        : 0;

    const todayCheckIns = bookings.filter(
      (booking) =>
        isToday(booking.checkIn) &&
        isActiveBooking(booking.status)
    );

    const todayCheckOuts = bookings.filter(
      (booking) =>
        isToday(booking.checkOut) &&
        isActiveBooking(booking.status)
    );

    const estimatedRoomRevenue = activeBookings.reduce(
      (total, booking) => {
        const room = rooms.find(
          (item) =>
            String(item.number).toLowerCase() ===
            String(booking.room).toLowerCase()
        );

        if (!room || !Number.isFinite(Number(room.price))) {
          return total;
        }

        const nights = getNights(
          booking.checkIn,
          booking.checkOut
        );

        return total + Number(room.price) * nights;
      },
      0
    );

    const completedOrders = posOrders.filter(
      (order) =>
        (order.status ?? "").toLowerCase() === "completed"
    );

    const restaurantRevenue = completedOrders.reduce(
      (total, order) => {
        const amount = Number(
          order.total ?? order.grandTotal ?? order.amount ?? 0
        );

        return total + (Number.isFinite(amount) ? amount : 0);
      },
      0
    );

    const todayRestaurantRevenue = completedOrders
      .filter((order) => isToday(order.createdAt ?? order.date))
      .reduce((total, order) => {
        const amount = Number(
          order.total ?? order.grandTotal ?? order.amount ?? 0
        );

        return total + (Number.isFinite(amount) ? amount : 0);
      }, 0);

    return {
      totalRooms: rooms.length,
      occupiedRooms: occupiedRooms.length,
      availableRooms: availableRooms.length,
      maintenanceRooms: maintenanceRooms.length,
      activeBookings: activeBookings.length,
      todayCheckIns: todayCheckIns.length,
      todayCheckOuts: todayCheckOuts.length,
      occupancyRate,
      estimatedRoomRevenue,
      restaurantRevenue,
      todayRestaurantRevenue,
      completedOrders: completedOrders.length,
      estimatedCombinedRevenue:
        estimatedRoomRevenue + restaurantRevenue,
    };
  }, [bookings, rooms, posOrders]);

  const cards = [
    {
      title: "Total Rooms",
      value: analytics.totalRooms,
      icon: "🏨",
      description: "All registered rooms",
      color: "border-blue-200",
    },
    {
      title: "Occupied Rooms",
      value: analytics.occupiedRooms,
      icon: "🛏️",
      description: `${analytics.occupancyRate}% occupancy`,
      color: "border-indigo-200",
    },
    {
      title: "Available Rooms",
      value: analytics.availableRooms,
      icon: "✅",
      description: "Ready for guests",
      color: "border-emerald-200",
    },
    {
      title: "Maintenance",
      value: analytics.maintenanceRooms,
      icon: "🔧",
      description: "Rooms under maintenance",
      color: "border-amber-200",
    },
    {
      title: "Active Bookings",
      value: analytics.activeBookings,
      icon: "📋",
      description: "Non-cancelled bookings",
      color: "border-purple-200",
    },
    {
      title: "Today's Check-ins",
      value: analytics.todayCheckIns,
      icon: "🛎️",
      description: "Scheduled arrivals",
      color: "border-cyan-200",
    },
    {
      title: "Today's Check-outs",
      value: analytics.todayCheckOuts,
      icon: "🚪",
      description: "Scheduled departures",
      color: "border-orange-200",
    },
    {
      title: "Completed POS Orders",
      value: analytics.completedOrders,
      icon: "🍽️",
      description: "Restaurant orders",
      color: "border-pink-200",
    },
  ];

  if (!loaded) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
        <p className="text-sm text-gray-500">
          Loading hotel analytics...
        </p>
      </section>
    );
  }

  return (
    <section className="my-6 min-w-0 space-y-5">
      <div>
        <h2 className="text-xl font-extrabold text-gray-900 sm:text-2xl">
          📊 Hotel Analytics
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Hotel occupancy, bookings and estimated revenue overview.
        </p>
      </div>

      {/* Responsive statistics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <article
            key={card.title}
            className={`min-w-0 rounded-2xl border ${card.color} bg-white p-3 shadow-sm sm:p-5`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="break-words text-xs font-medium text-gray-500 sm:text-sm">
                {card.title}
              </p>

              <span className="shrink-0 text-xl sm:text-2xl">
                {card.icon}
              </span>
            </div>

            <p className="mt-3 break-words text-2xl font-extrabold text-gray-900 sm:text-3xl">
              {card.value}
            </p>

            <p className="mt-1 break-words text-xs text-gray-500">
              {card.description}
            </p>
          </article>
        ))}
      </div>

      {/* Occupancy */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-gray-900">
              Room Occupancy
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Occupied rooms compared with registered rooms
            </p>
          </div>

          <span className="text-xl font-extrabold text-indigo-600 sm:text-2xl">
            {analytics.occupancyRate}%
          </span>
        </div>

        <div
          className="mt-4 h-3 overflow-hidden rounded-full bg-gray-100"
          role="progressbar"
          aria-label="Room occupancy"
          aria-valuenow={analytics.occupancyRate}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-indigo-600 transition-all duration-500"
            style={{
              width: `${analytics.occupancyRate}%`,
            }}
          />
        </div>

        <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-gray-500 sm:text-sm">
          <span>
            Occupied: {analytics.occupiedRooms}
          </span>

          <span>
            Available: {analytics.availableRooms}
          </span>

          <span>
            Total: {analytics.totalRooms}
          </span>
        </div>
      </div>

      {/* Revenue overview */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <article className="min-w-0 rounded-2xl bg-indigo-600 p-5 text-white shadow-sm sm:p-6">
          <p className="text-sm text-indigo-100">
            Estimated Room Revenue
          </p>

          <p className="mt-3 break-words text-2xl font-extrabold sm:text-3xl">
            {formatCurrency(analytics.estimatedRoomRevenue)}
          </p>

          <p className="mt-2 text-xs text-indigo-100">
            Based on booking nights and current room prices
          </p>
        </article>

        <article className="min-w-0 rounded-2xl bg-emerald-600 p-5 text-white shadow-sm sm:p-6">
          <p className="text-sm text-emerald-100">
            Completed Restaurant Sales
          </p>

          <p className="mt-3 break-words text-2xl font-extrabold sm:text-3xl">
            {formatCurrency(analytics.restaurantRevenue)}
          </p>

          <p className="mt-2 text-xs text-emerald-100">
            Based on completed POS orders
          </p>
        </article>

        <article className="min-w-0 rounded-2xl bg-gray-900 p-5 text-white shadow-sm sm:p-6">
          <p className="text-sm text-gray-300">
            Combined Estimated Revenue
          </p>

          <p className="mt-3 break-words text-2xl font-extrabold sm:text-3xl">
            {formatCurrency(analytics.estimatedCombinedRevenue)}
          </p>

          <p className="mt-2 text-xs text-gray-300">
            Estimated room revenue + completed POS sales
          </p>
        </article>
      </div>

      {/* Today's restaurant sales */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <h3 className="font-bold text-gray-900">
          🍽️ Today's Restaurant Sales
        </h3>

        <p className="mt-2 break-words text-2xl font-extrabold text-emerald-600 sm:text-3xl">
          {formatCurrency(analytics.todayRestaurantRevenue)}
        </p>

        <p className="mt-1 text-sm text-gray-500">
          Revenue from completed POS orders recorded today.
        </p>
      </div>

      <p className="text-xs leading-5 text-gray-500">
        Analytics uses browser localStorage data. Room revenue is an
        estimate, not verified collections. Restaurant sales depend on
        the amount field and status values stored by your POS module.
        Different devices will not sync automatically without a shared
        backend.
      </p>
    </section>
  );
}