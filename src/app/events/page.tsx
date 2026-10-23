"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

type EventStatus = "Confirmed" | "Tentative" | "Completed" | "Cancelled";

type EventRecord = {
  id: string;
  name: string;
  date: string;
  venue: string;
  guests: number;
  budget: number;
  advance: number;
  status: EventStatus;
};

type EventForm = {
  name: string;
  date: string;
  venue: string;
  guests: string;
  budget: string;
  advance: string;
  status: EventStatus;
};

const STORAGE_KEY = "celebrations-hotel-events";

const VENUES = [
  "Grand Ballroom",
  "Conference Hall",
  "Garden Lawn",
  "Banquet Hall 1",
  "Banquet Hall 2",
  "Poolside Area",
];

const STATUSES: EventStatus[] = [
  "Confirmed",
  "Tentative",
  "Completed",
  "Cancelled",
];

const initialEvents: EventRecord[] = [
  {
    id: "EV-001",
    name: "Wedding Reception",
    date: "2026-10-28",
    venue: "Grand Ballroom",
    guests: 250,
    budget: 500000,
    advance: 100000,
    status: "Confirmed",
  },
  {
    id: "EV-002",
    name: "Corporate Meeting",
    date: "2026-10-30",
    venue: "Conference Hall",
    guests: 60,
    budget: 80000,
    advance: 0,
    status: "Tentative",
  },
  {
    id: "EV-003",
    name: "Birthday Celebration",
    date: "2026-11-02",
    venue: "Garden Lawn",
    guests: 80,
    budget: 120000,
    advance: 30000,
    status: "Confirmed",
  },
];

const emptyForm: EventForm = {
  name: "",
  date: "",
  venue: "Grand Ballroom",
  guests: "100",
  budget: "0",
  advance: "0",
  status: "Tentative",
};

const currency = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

const formatDate = (date: string) =>
  date
    ? new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const statusStyles: Record<EventStatus, string> = {
  Confirmed: "bg-green-100 text-green-700",
  Tentative: "bg-amber-100 text-amber-700",
  Completed: "bg-blue-100 text-blue-700",
  Cancelled: "bg-red-100 text-red-700",
};

function getNextId(events: EventRecord[]) {
  const highest = events.reduce((max, event) => {
    const match = event.id.match(/^EV-(\d+)$/);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);

  return `EV-${String(highest + 1).padStart(3, "0")}`;
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success"
  );

  const [form, setForm] = useState<EventForm>({ ...emptyForm });

  // Load saved events from LocalStorage.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (saved !== null) {
        const parsed: unknown = JSON.parse(saved);
        setEvents(Array.isArray(parsed) ? (parsed as EventRecord[]) : initialEvents);
      } else {
        setEvents(initialEvents);
      }
    } catch {
      setEvents(initialEvents);
    }

    setIsLoaded(true);
  }, []);

  // Save changes automatically.
  useEffect(() => {
    if (!isLoaded) return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    } catch {
      setMessageType("error");
      setMessage("Could not save data in this browser.");
    }
  }, [events, isLoaded]);

  function notify(text: string, type: "success" | "error" = "success") {
    setMessage(text);
    setMessageType(type);
  }

  function openCreateForm() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setShowForm(true);
    setMessage("");
  }

  function openEditForm(event: EventRecord) {
    setEditingId(event.id);
    setForm({
      name: event.name,
      date: event.date,
      venue: event.venue,
      guests: String(event.guests),
      budget: String(event.budget),
      advance: String(event.advance),
      status: event.status,
    });
    setShowForm(true);
    setMessage("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm({ ...emptyForm });
    setMessage("");
  }

  function saveEvent(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const name = form.name.trim();
    const venue = form.venue.trim();
    const guests = Number(form.guests);
    const budget = Number(form.budget);
    const advance = Number(form.advance);

    if (!name || !form.date || !venue) {
      notify("Please fill in all required fields.", "error");
      return;
    }

    if (
      !Number.isInteger(guests) ||
      guests < 1 ||
      !Number.isFinite(budget) ||
      !Number.isFinite(advance) ||
      budget < 0 ||
      advance < 0 ||
      advance > budget
    ) {
      notify(
        "Enter valid guest and payment amounts. Advance cannot exceed budget.",
        "error"
      );
      return;
    }

    const venueConflict = events.some(
      (existing) =>
        existing.id !== editingId &&
        existing.date === form.date &&
        existing.venue.toLowerCase() === venue.toLowerCase() &&
        existing.status !== "Cancelled"
    );

    if (venueConflict) {
      notify(
        "This venue already has an event on that date. Choose another venue or date.",
        "error"
      );
      return;
    }

    if (editingId) {
      setEvents((current) =>
        current.map((event) =>
          event.id === editingId
            ? {
                ...event,
                name,
                date: form.date,
                venue,
                guests,
                budget,
                advance,
                status: form.status,
              }
            : event
        )
      );

      notify("Event updated successfully!");
    } else {
      const newEvent: EventRecord = {
        id: getNextId(events),
        name,
        date: form.date,
        venue,
        guests,
        budget,
        advance,
        status: form.status,
      };

      setEvents((current) => [...current, newEvent]);
      notify("Event created successfully!");
    }

    setShowForm(false);
    setEditingId(null);
    setForm({ ...emptyForm });
  }

  function updateStatus(id: string, status: EventStatus) {
    setEvents((current) =>
      current.map((event) =>
        event.id === id ? { ...event, status } : event
      )
    );

    notify(`Event status updated to ${status}.`);
  }

  function deleteEvent(id: string) {
    const event = events.find((item) => item.id === id);
    if (!event) return;

    const confirmed = window.confirm(
      `Delete "${event.name}" (${event.id})? This cannot be undone.`
    );

    if (!confirmed) return;

    setEvents((current) => current.filter((item) => item.id !== id));

    if (editingId === id) {
      closeForm();
    }

    notify("Event deleted successfully.");
  }

  function exportCSV() {
    const headers = [
      "Event ID",
      "Event Name",
      "Date",
      "Venue",
      "Guests",
      "Budget",
      "Advance",
      "Outstanding",
      "Status",
    ];

    const rows = filteredEvents.map((event) => [
      event.id,
      event.name,
      event.date,
      event.venue,
      event.guests,
      event.budget,
      event.advance,
      Math.max(0, event.budget - event.advance),
      event.status,
    ]);

    const escapeCSV = (value: string | number) =>
      `"${String(value).replace(/"/g, '""')}"`;

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCSV).join(","))
      .join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "celebrations-events.csv";
    link.click();

    URL.revokeObjectURL(url);
    notify("Events exported to CSV successfully.");
  }

  const filteredEvents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return events
      .filter((event) => {
        const matchesSearch =
          event.name.toLowerCase().includes(query) ||
          event.id.toLowerCase().includes(query) ||
          event.venue.toLowerCase().includes(query);

        const matchesStatus =
          statusFilter === "All" || event.status === statusFilter;

        const matchesDate = !dateFilter || event.date === dateFilter;

        return matchesSearch && matchesStatus && matchesDate;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [events, search, statusFilter, dateFilter]);

  const [todayString, setTodayString] = useState("");

  useEffect(() => {
    const today = new Date();
    const formattedToday = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, "0"),
      String(today.getDate()).padStart(2, "0"),
    ].join("-");

    setTodayString(formattedToday);
  }, []);

  const confirmedEvents = events.filter(
    (event) => event.status === "Confirmed"
  ).length;

  const upcomingEvents = events.filter(
    (event) =>
      event.date >= todayString &&
      event.status !== "Cancelled" &&
      event.status !== "Completed"
  ).length;

  const totalGuests = events
    .filter((event) => event.status !== "Cancelled")
    .reduce((sum, event) => sum + event.guests, 0);

  const totalBudget = events
    .filter((event) => event.status !== "Cancelled")
    .reduce((sum, event) => sum + event.budget, 0);

  const totalAdvance = events
    .filter((event) => event.status !== "Cancelled")
    .reduce((sum, event) => sum + event.advance, 0);

  const totalOutstanding = events
    .filter((event) => event.status !== "Cancelled")
    .reduce(
      (sum, event) => sum + Math.max(0, event.budget - event.advance),
      0
    );

  if (!isLoaded) {
    return (
      <div className="p-6 text-gray-500">
        Loading events...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Events &amp; Banquets
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage weddings, corporate meetings, parties and banquet bookings.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportCSV}
            className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Export CSV
          </button>

          <button
            type="button"
            onClick={openCreateForm}
            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            + Create Event
          </button>
        </div>
      </div>

      {/* Notifications */}
      {message && (
        <div
          role="status"
          className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
            messageType === "error"
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-green-200 bg-green-50 text-green-800"
          }`}
        >
          <span>{message}</span>
          <button
            type="button"
            onClick={() => setMessage("")}
            aria-label="Dismiss message"
          >
            ✕
          </button>
        </div>
      )}

      {/* Create / Edit Form */}
      {showForm && (
        <form
          onSubmit={saveEvent}
          className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {editingId ? "Edit Event" : "Create New Event"}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Fields marked * are required.
              </p>
            </div>

            <button
              type="button"
              onClick={closeForm}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Event Name *
              </label>
              <input
                required
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value })
                }
                placeholder="e.g. Wedding Reception"
                className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Event Date *
              </label>
              <input
                required
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm({ ...form, date: e.target.value })
                }
                className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Venue *
              </label>
              <select
                required
                value={form.venue}
                onChange={(e) =>
                  setForm({ ...form, venue: e.target.value })
                }
                className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-blue-500"
              >
                {VENUES.map((venue) => (
                  <option key={venue} value={venue}>
                    {venue}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Number of Guests *
              </label>
              <input
                required
                type="number"
                min="1"
                step="1"
                value={form.guests}
                onChange={(e) =>
                  setForm({ ...form, guests: e.target.value })
                }
                className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Total Budget (₹) *
              </label>
              <input
                required
                type="number"
                min="0"
                step="1"
                value={form.budget}
                onChange={(e) =>
                  setForm({ ...form, budget: e.target.value })
                }
                className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Advance Payment (₹) *
              </label>
              <input
                required
                type="number"
                min="0"
                step="1"
                value={form.advance}
                onChange={(e) =>
                  setForm({ ...form, advance: e.target.value })
                }
                className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Outstanding:{" "}
                {currency(
                  Math.max(0, Number(form.budget) - Number(form.advance))
                )}
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Booking Status
              </label>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({
                    ...form,
                    status: e.target.value as EventStatus,
                  })
                }
                className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-blue-500"
              >
                <option value="Tentative">Tentative</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              {editingId ? "Save Changes" : "Create Event"}
            </button>

            <button
              type="button"
              onClick={closeForm}
              className="rounded-xl border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Total Events</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {events.length}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            All registered events
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Confirmed Events</p>
          <p className="mt-2 text-3xl font-bold text-green-600">
            {confirmedEvents}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Bookings confirmed
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Upcoming Events</p>
          <p className="mt-2 text-3xl font-bold text-blue-600">
            {upcomingEvents}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Today and future dates
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Outstanding Balance</p>
          <p className="mt-2 text-2xl font-bold text-amber-600">
            {currency(totalOutstanding)}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Excludes cancelled events
          </p>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Total Expected Guests</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {totalGuests.toLocaleString("en-IN")}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Total Event Budget</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {currency(totalBudget)}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Advance Collected</p>
          <p className="mt-2 text-2xl font-bold text-green-600">
            {currency(totalAdvance)}
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-gray-100 p-5 lg:flex-row">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search event name, venue or event ID..."
            className="min-w-0 flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
          >
            <option value="All">All Statuses</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            aria-label="Filter events by date"
            className="rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
          />

          {(search || statusFilter !== "All" || dateFilter) && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatusFilter("All");
                setDateFilter("");
              }}
              className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Clear Filters
            </button>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 px-5 py-3">
          <p className="text-sm text-gray-500">
            Showing{" "}
            <span className="font-semibold text-gray-900">
              {filteredEvents.length}
            </span>{" "}
            of {events.length} events
          </p>
        </div>

        {/* Events Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="whitespace-nowrap px-5 py-4">
                  Event ID / Name
                </th>
                <th className="whitespace-nowrap px-5 py-4">
                  Date / Venue
                </th>
                <th className="whitespace-nowrap px-5 py-4">Guests</th>
                <th className="whitespace-nowrap px-5 py-4">Budget</th>
                <th className="whitespace-nowrap px-5 py-4">Advance</th>
                <th className="whitespace-nowrap px-5 py-4">Balance</th>
                <th className="whitespace-nowrap px-5 py-4">Status</th>
                <th className="whitespace-nowrap px-5 py-4">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {filteredEvents.map((event) => (
                <tr key={event.id} className="hover:bg-gray-50">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-gray-900">
                      {event.name}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {event.id}
                    </p>
                  </td>

                  <td className="whitespace-nowrap px-5 py-4">
                    <p className="text-gray-900">
                      {formatDate(event.date)}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {event.venue}
                    </p>
                  </td>

                  <td className="px-5 py-4 text-gray-700">
                    {event.guests.toLocaleString("en-IN")}
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 font-medium text-gray-900">
                    {currency(event.budget)}
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 font-medium text-green-700">
                    {currency(event.advance)}
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 font-medium text-amber-700">
                    {currency(
                      Math.max(0, event.budget - event.advance)
                    )}
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[event.status]}`}
                    >
                      {event.status}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex min-w-36 flex-col gap-2">
                      <select
                        aria-label={`Update status for ${event.name}`}
                        value={event.status}
                        onChange={(e) =>
                          updateStatus(
                            event.id,
                            e.target.value as EventStatus
                          )
                        }
                        className="rounded-lg border border-gray-200 px-2 py-2 text-xs outline-none focus:border-blue-500"
                      >
                        {STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => openEditForm(event)}
                        className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                      >
                        Edit Event
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteEvent(event.id)}
                        className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                      >
                        Delete Event
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredEvents.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-12 text-center text-gray-500"
                  >
                    <p className="font-medium text-gray-700">
                      No events found
                    </p>
                    <p className="mt-1 text-sm">
                      Try changing your search or filters, or create a new event.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}