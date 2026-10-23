"use client";

import { useEffect, useMemo, useState } from "react";
import { useBookings, type Booking } from "@/components/BookingStorage";

type Room = {
  number: string;
  type: string;
  price: number;
  status: "Available" | "Occupied" | "Maintenance";
};

type InventoryItem = {
  id?: string;
  name: string;
  category?: string;
  quantity: number;
  unit?: string;
  minStock?: number;
};

type HotelEvent = {
  id?: string;
  name: string;
  date: string;
  venue: string;
  guests: number;
  budget: number;
  advance: number;
  status: string;
};

type StaffMember = {
  id?: string;
  name: string;
  department: string;
  salary: number;
  status: string;
};

type PosOrder = {
  id?: string;
  orderId?: string;
  createdAt?: string;
  date?: string;
  total?: number;
  grandTotal?: number;
  amount?: number;
  status?: string;
  paymentMethod?: string;
  payment?: string;
};

const POS_STORAGE_KEY = "celebrations-hotel-pos-orders";

function readStorage<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

function downloadCSV(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((row) =>
      row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(","),
    )
    .join("\r\n");

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function inPeriod(dateValue: string | undefined, period: string) {
  if (period === "all") return true;
  if (!dateValue) return false;

  const date = dateValue.slice(0, 10);
  const end = today();

  if (date > end) return false;
  if (period === "today") return date === end;

  const now = new Date();
  const start = new Date(now);

  if (period === "week") start.setDate(now.getDate() - 6);
  else if (period === "month") start.setDate(1);
  else if (period === "year") start.setMonth(0, 1);

  const startString = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
  return date >= startString && date <= end;
}

function orderDate(order: PosOrder) {
  return order.createdAt ?? order.date ?? "";
}

function orderAmount(order: PosOrder) {
  return Number(order.grandTotal ?? order.total ?? order.amount ?? 0) || 0;
}

function orderIdentifier(order: PosOrder, index: number) {
  return order.orderId ?? order.id ?? `Order ${index + 1}`;
}

export default function ReportsPage() {
  const { bookings, isLoaded } = useBookings();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [events, setEvents] = useState<HotelEvent[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [orders, setOrders] = useState<PosOrder[]>([]);
  const [period, setPeriod] = useState("month");
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    setRooms(readStorage<Room[]>("celebrations-hotel-rooms", []));
    setInventory(readStorage<InventoryItem[]>("celebrations-hotel-inventory", []));
    setEvents(readStorage<HotelEvent[]>("celebrations-hotel-events", []));
    setStaff(readStorage<StaffMember[]>("celebrations-hotel-staff", []));
    setOrders(readStorage<PosOrder[]>(POS_STORAGE_KEY, []));
    setDataLoaded(true);
  }, []);

  const filteredBookings = useMemo(
    () =>
      bookings.filter(
        (booking) =>
          booking.status !== "Cancelled" && inPeriod(booking.checkIn, period),
      ),
    [bookings, period],
  );

  const activeBookings = bookings.filter(
    (booking) => booking.status !== "Cancelled",
  );

  const filteredOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          order.status !== "Cancelled" && inPeriod(orderDate(order), period),
      ),
    [orders, period],
  );

  const occupiedRooms = rooms.filter(
    (room) => room.status === "Occupied",
  ).length;

  const occupancy = rooms.length
    ? Math.round((occupiedRooms / rooms.length) * 100)
    : 0;

  const bookingRevenue = filteredBookings.reduce((total, booking) => {
    const room = rooms.find((item) => item.number === booking.room);
    return total + (room?.price ?? 0);
  }, 0);

  const posRevenue = filteredOrders.reduce(
    (total, order) => total + orderAmount(order),
    0,
  );

  const totalRevenue = bookingRevenue + posRevenue;

  const lowStockItems = inventory.filter(
    (item) => item.quantity <= (item.minStock ?? 0),
  );

  const outOfStockItems = inventory.filter((item) => item.quantity <= 0);

  const confirmedEvents = events.filter(
    (event) => event.status === "Confirmed",
  );

  const eventBudget = confirmedEvents.reduce(
    (total, event) => total + (Number(event.budget) || 0),
    0,
  );

  const eventAdvance = confirmedEvents.reduce(
    (total, event) => total + (Number(event.advance) || 0),
    0,
  );

  const monthlyPayroll = staff
    .filter((member) => member.status !== "Inactive")
    .reduce((total, member) => total + (Number(member.salary) || 0), 0);

  const exportReport = () => {
    const rows: (string | number)[][] = [
      ["Celebrations Hotel & Resort", "Reports & Analytics"],
      ["Generated On", today()],
      ["Selected Period", period],
      [],
      ["HOTEL PERFORMANCE"],
      ["Metric", "Value"],
      ["Total Rooms", rooms.length],
      ["Occupied Rooms", occupiedRooms],
      ["Room Occupancy", `${occupancy}%`],
      ["Total Bookings (all time)", activeBookings.length],
      ["Bookings in Selected Period", filteredBookings.length],
      ["Estimated Booking Revenue", bookingRevenue],
      ["POS Orders in Selected Period", filteredOrders.length],
      ["POS Revenue in Selected Period", posRevenue],
      ["Combined Estimated Revenue", totalRevenue],
      [],
      ["INVENTORY"],
      ["Item", "Category", "Quantity", "Unit", "Minimum Stock", "Stock Status"],
      ...inventory.map((item) => [
        item.name,
        item.category ?? "",
        item.quantity,
        item.unit ?? "",
        item.minStock ?? 0,
        item.quantity <= 0
          ? "Out of Stock"
          : item.quantity <= (item.minStock ?? 0)
            ? "Low Stock"
            : "In Stock",
      ]),
      [],
      ["EVENTS"],
      ["Event", "Date", "Venue", "Guests", "Budget", "Advance", "Status"],
      ...events.map((event) => [
        event.name,
        event.date,
        event.venue,
        event.guests,
        event.budget,
        event.advance,
        event.status,
      ]),
      [],
      ["STAFF"],
      ["Employee", "Department", "Salary", "Status"],
      ...staff.map((member) => [
        member.name,
        member.department,
        member.salary,
        member.status,
      ]),
      [],
      ["POS ORDERS"],
      ["Order ID", "Date", "Amount", "Payment Method", "Status"],
      ...filteredOrders.map((order, index) => [
        orderIdentifier(order, index),
        orderDate(order),
        orderAmount(order),
        order.paymentMethod ?? order.payment ?? "",
        order.status ?? "Unknown",
      ]),
    ];

    downloadCSV(`celebrations-report-${today()}.csv`, rows);
  };

  if (!isLoaded || !dataLoaded) {
    return <div className="p-6 text-sm text-gray-500">Reports load ho rahi hain...</div>;
  }

  const cards = [
    {
      title: "Total Rooms",
      value: String(rooms.length),
      detail: `${occupiedRooms} currently occupied`,
      icon: "🛏️",
    },
    {
      title: "Room Occupancy",
      value: `${occupancy}%`,
      detail: `${rooms.length - occupiedRooms} rooms not occupied`,
      icon: "🏨",
    },
    {
      title: "Bookings",
      value: String(filteredBookings.length),
      detail: `Selected period: ${period}`,
      icon: "📅",
    },
    {
      title: "Estimated Booking Revenue",
      value: money(bookingRevenue),
      detail: "Current room price × bookings",
      icon: "🛎️",
    },
    {
      title: "POS Sales",
      value: money(posRevenue),
      detail: `${filteredOrders.length} orders in selected period`,
      icon: "🧾",
    },
    {
      title: "Combined Estimated Revenue",
      value: money(totalRevenue),
      detail: "Booking estimate + POS sales",
      icon: "💰",
    },
    {
      title: "Low Stock Items",
      value: String(lowStockItems.length),
      detail: `${outOfStockItems.length} items out of stock`,
      icon: "📦",
    },
    {
      title: "Active Staff",
      value: String(staff.filter((member) => member.status === "Active").length),
      detail: `${staff.length} staff records`,
      icon: "👥",
    },
    {
      title: "Confirmed Events",
      value: String(confirmedEvents.length),
      detail: `Budget: ${money(eventBudget)}`,
      icon: "🎉",
    },
  ];

  const reportRows = [
    {
      name: "Room Occupancy",
      value: `${occupancy}%`,
      description: `${occupiedRooms} of ${rooms.length} rooms marked Occupied`,
      type: "Operations",
    },
    {
      name: "Bookings",
      value: String(filteredBookings.length),
      description: `Check-ins in the ${period} period`,
      type: "Bookings",
    },
    {
      name: "Estimated Booking Revenue",
      value: money(bookingRevenue),
      description: "Current room prices multiplied by matching bookings",
      type: "Revenue",
    },
    {
      name: "POS Sales",
      value: money(posRevenue),
      description: `${filteredOrders.length} non-cancelled orders`,
      type: "POS",
    },
    {
      name: "Confirmed Events",
      value: String(confirmedEvents.length),
      description: `Planned budget: ${money(eventBudget)}`,
      type: "Events",
    },
    {
      name: "Event Advances",
      value: money(eventAdvance),
      description: "Advance recorded for confirmed events",
      type: "Events",
    },
    {
      name: "Estimated Monthly Payroll",
      value: money(monthlyPayroll),
      description: "Staff not marked Inactive",
      type: "Staff",
    },
  ];

  const roomBreakdown = [
    {
      label: "Available",
      count: rooms.filter((room) => room.status === "Available").length,
      color: "bg-emerald-500",
    },
    {
      label: "Occupied",
      count: occupiedRooms,
      color: "bg-blue-500",
    },
    {
      label: "Maintenance",
      count: rooms.filter((room) => room.status === "Maintenance").length,
      color: "bg-amber-500",
    },
  ];

  return (
    <main className="min-h-screen space-y-6 bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="mt-1 text-sm text-gray-500">
            Hotel bookings, revenue, POS sales, inventory, events aur staff analytics.
          </p>
        </div>

        <button
          onClick={exportReport}
          className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          ↓ Export CSV Report
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4">
        <div>
          <h2 className="font-semibold text-gray-900">Report Period</h2>
          <p className="text-sm text-gray-500">
            Booking check-in aur POS order date ke basis par filter karein.
          </p>
        </div>

        <select
          value={period}
          onChange={(event) => setPeriod(event.target.value)}
          className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 outline-none focus:border-blue-500"
        >
          <option value="today">Today</option>
          <option value="week">Last 7 Days</option>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
          <option value="all">All Time</option>
        </select>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.title}
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium text-gray-500">{card.title}</p>
              <span className="text-2xl">{card.icon}</span>
            </div>
            <p className="mt-3 break-words text-2xl font-bold text-gray-900">{card.value}</p>
            <p className="mt-2 text-xs text-gray-500">{card.detail}</p>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 p-5">
            <h2 className="font-bold text-gray-900">Performance Summary</h2>
            <p className="mt-1 text-sm text-gray-500">Operational reports and key metrics</p>
          </div>

          <div className="divide-y divide-gray-100">
            {reportRows.map((report) => (
              <div
                key={report.name}
                className="flex items-center justify-between gap-4 p-4 sm:p-5"
              >
                <div className="min-w-0">
                  <p className="font-medium text-gray-800">{report.name}</p>
                  <p className="mt-1 text-xs text-gray-500">{report.description}</p>
                  <span className="mt-2 inline-block rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                    {report.type}
                  </span>
                </div>
                <p className="shrink-0 text-right font-bold text-gray-900">{report.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="font-bold text-gray-900">Room Status</h2>
            <p className="mt-1 text-sm text-gray-500">Current room status breakdown</p>

            {roomBreakdown.map((item) => (
              <div key={item.label} className="mt-5">
                <div className="mb-2 flex justify-between text-sm">
                  <span className="text-gray-600">{item.label}</span>
                  <span className="font-semibold text-gray-900">{item.count} rooms</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-full rounded-full ${item.color}`}
                    style={{
                      width: `${rooms.length ? (item.count / rooms.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="font-bold text-gray-900">Inventory Alerts</h2>
            <p className="mt-1 text-sm text-gray-500">Items requiring stock attention</p>

            {lowStockItems.length === 0 ? (
              <p className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">
                All inventory items are above their minimum stock level.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {lowStockItems.map((item) => (
                  <div
                    key={item.id ?? item.name}
                    className="flex items-center justify-between gap-3 rounded-xl bg-amber-50 p-3"
                  >
                    <div>
                      <p className="font-medium text-gray-800">{item.name}</p>
                      <p className="text-xs text-gray-500">
                        Minimum: {item.minStock ?? 0} {item.unit ?? ""}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-bold ${
                        item.quantity <= 0 ? "text-red-600" : "text-amber-700"
                      }`}
                    >
                      {item.quantity} {item.unit ?? ""}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 p-5">
          <h2 className="font-bold text-gray-900">Bookings Report</h2>
          <p className="mt-1 text-sm text-gray-500">
            Selected period ke bookings — cancelled bookings excluded.
          </p>
        </div>

        {filteredBookings.length === 0 ? (
          <div className="p-8 text-center">
            <p className="font-medium text-gray-700">No bookings found</p>
            <p className="mt-1 text-sm text-gray-500">
              Selected period mein koi matching booking nahi hai.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-5 py-4 font-semibold">Booking ID</th>
                  <th className="px-5 py-4 font-semibold">Guest</th>
                  <th className="px-5 py-4 font-semibold">Room</th>
                  <th className="px-5 py-4 font-semibold">Check-in</th>
                  <th className="px-5 py-4 font-semibold">Check-out</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredBookings.map((booking: Booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4 font-medium text-blue-700">{booking.id}</td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-900">{booking.guest}</p>
                      <p className="text-xs text-gray-500">{booking.phone}</p>
                    </td>
                    <td className="px-5 py-4 text-gray-700">{booking.room}</td>
                    <td className="px-5 py-4 text-gray-600">{booking.checkIn}</td>
                    <td className="px-5 py-4 text-gray-600">{booking.checkOut}</td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                        {booking.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 p-5">
          <h2 className="font-bold text-gray-900">POS Sales Report</h2>
          <p className="mt-1 text-sm text-gray-500">
            Saved POS orders for the selected period.
          </p>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            Selected period mein koi POS order nahi mila.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-5 py-4 font-semibold">Order ID</th>
                  <th className="px-5 py-4 font-semibold">Date</th>
                  <th className="px-5 py-4 font-semibold">Payment</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredOrders.map((order, index) => (
                  <tr key={`${orderIdentifier(order, index)}-${index}`} className="hover:bg-gray-50">
                    <td className="px-5 py-4 font-medium text-blue-700">
                      {orderIdentifier(order, index)}
                    </td>
                    <td className="px-5 py-4 text-gray-600">{orderDate(order).slice(0, 10) || "—"}</td>
                    <td className="px-5 py-4 text-gray-600">
                      {order.paymentMethod ?? order.payment ?? "—"}
                    </td>
                    <td className="px-5 py-4 text-gray-600">{order.status ?? "Unknown"}</td>
                    <td className="px-5 py-4 text-right font-semibold text-gray-900">
                      {money(orderAmount(order))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-xs leading-5 text-gray-500">
        Note: Booking revenue current room prices se estimate hota hai; ise actual collected
        payment na samjhein. POS sales saved order data par based hain. Combined revenue
        dono ko jodta hai, isliye double-counting possible hai agar POS orders mein room
        charges bhi included hon. Occupancy current room status hai, historical occupancy
        nahi. Data isi browser ke localStorage se read hota hai.
      </p>
    </main>
  );
}