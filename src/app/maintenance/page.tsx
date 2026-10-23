"use client";

import { useEffect, useState } from "react";

type WorkOrder = {
  id: string;
  room: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  assignedTo: string;
  dueDate: string;
  cost: number;
  notes: string;
  reportedAt: string;
};

const KEY = "celebrations-hotel-work-orders";

const initialForm = {
  room: "General Area",
  title: "",
  category: "General",
  priority: "Medium",
  status: "Open",
  assignedTo: "",
  dueDate: "",
  cost: 0,
  notes: "",
};

export default function MaintenancePage() {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [rooms, setRooms] = useState<{ number: string }[]>([]);
  const [staff, setStaff] = useState<{ name: string }[]>([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [message, setMessage] = useState("");

  useEffect(() => {
    try {
      setOrders(JSON.parse(localStorage.getItem(KEY) || "[]"));
      setRooms(
        JSON.parse(
          localStorage.getItem("celebrations-hotel-rooms") || "[]"
        )
      );
      setStaff(
        JSON.parse(
          localStorage.getItem("celebrations-hotel-staff") || "[]"
        )
      );
    } catch {
      setMessage("Data load nahi ho saka.");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(orders));
  }, [orders]);

  const update = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const saveOrder = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!form.title.trim()) {
      setMessage("Work description required hai.");
      return;
    }

    if (!Number.isFinite(Number(form.cost)) || Number(form.cost) < 0) {
      setMessage("Cost valid honi chahiye.");
      return;
    }

    if (editingId) {
      setOrders((prev) =>
        prev.map((order) =>
          order.id === editingId
            ? { ...order, ...form, cost: Number(form.cost) }
            : order
        )
      );
      setMessage("Work order updated!");
    } else {
      const order: WorkOrder = {
        ...form,
        id: `WO-${Date.now()}`,
        title: form.title.trim(),
        cost: Number(form.cost),
        reportedAt: new Date().toISOString(),
      };

      setOrders((prev) => [order, ...prev]);
      setMessage("Work order created!");
    }

    setForm({ ...initialForm });
    setEditingId(null);
  };

  const editOrder = (order: WorkOrder) => {
    setForm({
      room: order.room,
      title: order.title,
      category: order.category,
      priority: order.priority,
      status: order.status,
      assignedTo: order.assignedTo,
      dueDate: order.dueDate,
      cost: order.cost,
      notes: order.notes,
    });

    setEditingId(order.id);
    setMessage("");
  };

  const deleteOrder = (id: string) => {
    if (!confirm("Delete this work order?")) return;

    setOrders((prev) => prev.filter((order) => order.id !== id));

    if (editingId === id) {
      setEditingId(null);
      setForm({ ...initialForm });
    }

    setMessage("Work order deleted.");
  };

  const filteredOrders = orders.filter((order) => {
    const text = [
      order.id,
      order.room,
      order.title,
      order.category,
      order.assignedTo,
    ]
      .join(" ")
      .toLowerCase();

    return (
      text.includes(search.toLowerCase()) &&
      (filter === "All" || order.status === filter)
    );
  });

  const openCount = orders.filter(
    (order) => order.status === "Open"
  ).length;

  const progressCount = orders.filter(
    (order) => order.status === "In Progress"
  ).length;

  const urgentCount = orders.filter(
    (order) =>
      order.priority === "Urgent" && order.status !== "Resolved"
  ).length;

  const resolvedCost = orders
    .filter((order) => order.status === "Resolved")
    .reduce((sum, order) => sum + Number(order.cost || 0), 0);

  const exportCSV = () => {
    const headers = [
      "ID",
      "Room",
      "Description",
      "Category",
      "Priority",
      "Status",
      "Assigned To",
      "Due Date",
      "Cost",
      "Notes",
    ];

    const rows = filteredOrders.map((order) => [
      order.id,
      order.room,
      order.title,
      order.category,
      order.priority,
      order.status,
      order.assignedTo,
      order.dueDate,
      order.cost,
      order.notes,
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map(
            (value) =>
              `"${String(value ?? "").replace(/"/g, '""')}"`
          )
          .join(",")
      )
      .join("\n");

    const url = URL.createObjectURL(
      new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
    );

    const a = document.createElement("a");
    a.href = url;
    a.download = "maintenance-work-orders.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const inputClass =
    "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100";

  const cardClass =
    "rounded-2xl border border-gray-200 bg-white p-5 shadow-sm";

  return (
    <main className="min-h-screen bg-gray-50 p-4 text-gray-900 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-amber-600">
              Property Operations
            </p>
            <h1 className="mt-2 text-3xl font-black md:text-4xl">
              🔧 Maintenance Management
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Repairs, technicians, priorities aur maintenance costs manage karo.
            </p>
          </div>

          <button
            onClick={exportCSV}
            className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-bold hover:bg-gray-100"
          >
            Export CSV
          </button>
        </header>

        {message && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
            {message}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Open Work", value: openCount, icon: "📋" },
            { label: "In Progress", value: progressCount, icon: "🛠️" },
            { label: "Urgent Issues", value: urgentCount, icon: "🚨" },
            {
              label: "Resolved Cost",
              value: `₹${resolvedCost.toLocaleString("en-IN")}`,
              icon: "💰",
            },
          ].map((item) => (
            <div key={item.label} className={cardClass}>
              <p className="text-sm text-gray-500">{item.label}</p>
              <div className="mt-3 flex items-center justify-between">
                <p className="text-2xl font-black">{item.value}</p>
                <span className="text-2xl">{item.icon}</span>
              </div>
            </div>
          ))}
        </section>

        <section className="grid items-start gap-6 lg:grid-cols-2">

          <form onSubmit={saveOrder} className={`${cardClass} space-y-4`}>
            <h2 className="text-xl font-extrabold">
              {editingId ? "✏️ Edit Work Order" : "➕ Create Work Order"}
            </h2>

            <div>
              <label className="mb-1.5 block text-sm font-semibold">
                Work Description *
              </label>
              <input
                required
                className={inputClass}
                placeholder="AC repair, water leakage..."
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-semibold">
                  Room / Area
                </label>
                <select
                  className={inputClass}
                  value={form.room}
                  onChange={(e) => update("room", e.target.value)}
                >
                  <option>General Area</option>
                  {rooms.map((room) => (
                    <option key={room.number} value={room.number}>
                      Room {room.number}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold">
                  Category
                </label>
                <select
                  className={inputClass}
                  value={form.category}
                  onChange={(e) => update("category", e.target.value)}
                >
                  {["General", "Plumbing", "Electrical", "AC / HVAC", "Furniture", "Appliance"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold">
                  Priority
                </label>
                <select
                  className={inputClass}
                  value={form.priority}
                  onChange={(e) => update("priority", e.target.value)}
                >
                  {["Low", "Medium", "High", "Urgent"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold">
                  Status
                </label>
                <select
                  className={inputClass}
                  value={form.status}
                  onChange={(e) => update("status", e.target.value)}
                >
                  {["Open", "In Progress", "On Hold", "Resolved"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold">
                  Assign Technician
                </label>
                <select
                  className={inputClass}
                  value={form.assignedTo}
                  onChange={(e) => update("assignedTo", e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {staff.filter((s) => s.name).map((person, index) => (
                    <option key={`${person.name}-${index}`} value={person.name}>
                      {person.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold">
                  Due Date
                </label>
                <input
                  type="date"
                  className={inputClass}
                  value={form.dueDate}
                  onChange={(e) => update("dueDate", e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold">
                  Repair Cost (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputClass}
                  value={form.cost}
                  onChange={(e) => update("cost", Number(e.target.value))}
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold">
                Notes
              </label>
              <textarea
                rows={3}
                className={inputClass}
                placeholder="Issue details, parts required..."
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-bold text-white hover:bg-gray-700"
              >
                {editingId ? "Save Changes" : "Create Work Order"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setForm({ ...initialForm });
                  }}
                  className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-bold"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          <section className={cardClass}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-extrabold">
                Work Orders ({filteredOrders.length})
              </h2>

              <select
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                aria-label="Filter by status"
              >
                {["All", "Open", "In Progress", "On Hold", "Resolved"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </div>

            <input
              className={`${inputClass} mt-4`}
              placeholder="Search work orders..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <div className="mt-4 space-y-3">
              {filteredOrders.length === 0 ? (
                <p className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
                  Abhi koi work order nahi hai.
                </p>
              ) : (
                filteredOrders.map((order) => (
                  <article
                    key={order.id}
                    className="rounded-xl border border-gray-200 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold text-gray-400">
                          {order.id}
                        </p>
                        <h3 className="mt-1 font-extrabold">{order.title}</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          Room: {order.room} · {order.category}
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          Technician: {order.assignedTo || "Unassigned"}
                        </p>
                        {order.dueDate && (
                          <p className="mt-1 text-xs text-gray-500">
                            Due: {order.dueDate}
                          </p>
                        )}
                      </div>

                      <div className="text-right">
                        <p className="font-bold">
                          ₹{Number(order.cost).toLocaleString("en-IN")}
                        </p>
                        <span
                          className={`mt-2 inline-block rounded-full px-2.5 py-1 text-xs font-bold ${
                            order.priority === "Urgent"
                              ? "bg-red-100 text-red-700"
                              : order.priority === "High"
                              ? "bg-orange-100 text-orange-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {order.priority}
                        </span>
                        <p className="mt-2 text-xs font-semibold text-gray-500">
                          {order.status}
                        </p>
                      </div>
                    </div>

                    {order.notes && (
                      <p className="mt-3 whitespace-pre-wrap text-sm text-gray-600">
                        {order.notes}
                      </p>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-3">
                      <button
                        onClick={() => editOrder(order)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-bold hover:bg-gray-50"
                      >
                        Edit
                      </button>

                      {order.status !== "Resolved" && (
                        <button
                          onClick={() =>
                            setOrders((prev) =>
                              prev.map((item) =>
                                item.id === order.id
                                  ? { ...item, status: "Resolved" }
                                  : item
                              )
                            )
                          }
                          className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white"
                        >
                          Mark Resolved
                        </button>
                      )}

                      <button
                        onClick={() => deleteOrder(order.id)}
                        className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </section>

        <p className="text-xs text-gray-400">
          Data browser localStorage mein save hota hai.
        </p>
      </div>
    </main>
  );
}