"use client";

import { useMemo, useState } from "react";
import { useBookings } from "@/components/BookingStorage";
import { useGuests, type Guest } from "@/components/GuestStorage";

const emptyForm = {
  name: "",
  phone: "",
  email: "",
  address: "",
};

export default function GuestsPage() {
  const { bookings, isLoaded: bookingsLoaded } = useBookings();
  const {
    guests: savedGuests,
    isLoaded: guestsLoaded,
    addGuest,
    updateGuest,
    deleteGuest,
  } = useGuests();

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  const guests = useMemo(() => {
    const guestMap = new Map<
      string,
      {
        id: string;
        name: string;
        phone: string;
        email: string;
        address: string;
        totalBookings: number;
        latestCheckIn: string;
        bookings: typeof bookings;
        savedGuest?: Guest;
      }
    >();

    // Guests added directly from the Guest Management page.
    savedGuests.forEach((guest) => {
      const key = guest.phone.trim()
        ? `phone:${guest.phone.trim()}`
        : `saved:${guest.id}`;

      guestMap.set(key, {
        id: guest.id,
        name: guest.name,
        phone: guest.phone,
        email: guest.email,
        address: guest.address,
        totalBookings: 0,
        latestCheckIn: "",
        bookings: [],
        savedGuest: guest,
      });
    });

    // Merge reservation records with matching guest profiles.
    bookings.forEach((booking) => {
      const phone = booking.phone.trim();
      const name = booking.guest.trim();

      const key = phone
        ? `phone:${phone}`
        : `name:${name.toLowerCase()}`;

      const existing = guestMap.get(key);

      if (existing) {
        existing.totalBookings += 1;
        existing.bookings.push(booking);

        if (booking.checkIn > existing.latestCheckIn) {
          existing.latestCheckIn = booking.checkIn;
          existing.name = name || existing.name;
          existing.phone = phone || existing.phone;
        }
      } else {
        guestMap.set(key, {
          id: `booking:${key}`,
          name,
          phone,
          email: "",
          address: "",
          totalBookings: 1,
          latestCheckIn: booking.checkIn,
          bookings: [booking],
        });
      }
    });

    return Array.from(guestMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [savedGuests, bookings]);

  const filteredGuests = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return guests;

    return guests.filter(
      (guest) =>
        guest.name.toLowerCase().includes(query) ||
        guest.phone.toLowerCase().includes(query) ||
        guest.email.toLowerCase().includes(query) ||
        guest.id.toLowerCase().includes(query)
    );
  }, [guests, search]);

  const repeatGuests = guests.filter(
    (guest) => guest.totalBookings > 1
  ).length;

  function openAddForm() {
    setEditingGuest(null);
    setForm(emptyForm);
    setError("");
    setShowForm(true);
  }

  function openEditForm(guest: (typeof guests)[number]) {
    if (!guest.savedGuest) {
      setError(
        "Ye guest booking se aaya hai. Pehle ise Add Guest form se profile ke roop mein save karein."
      );
      return;
    }

    setEditingGuest(guest.savedGuest);
    setForm({
      name: guest.savedGuest.name,
      phone: guest.savedGuest.phone,
      email: guest.savedGuest.email,
      address: guest.savedGuest.address,
    });
    setError("");
    setShowForm(true);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const name = form.name.trim();
    const phone = form.phone.trim();
    const email = form.email.trim();

    if (!name) {
      setError("Guest ka naam zaroori hai.");
      return;
    }

    if (!phone && !email) {
      setError("Phone number ya email mein se kam se kam ek bharein.");
      return;
    }

    const duplicate = savedGuests.find(
      (guest) =>
        guest.id !== editingGuest?.id &&
        ((phone && guest.phone.trim() === phone) ||
          (email &&
            guest.email.trim().toLowerCase() === email.toLowerCase()))
    );

    if (duplicate) {
      setError("Is phone number ya email se guest pehle se maujood hai.");
      return;
    }

    const guestData = {
      name,
      phone,
      email,
      address: form.address.trim(),
    };

    if (editingGuest) {
      updateGuest({
        ...editingGuest,
        ...guestData,
      });
    } else {
      addGuest(guestData);
    }

    setForm(emptyForm);
    setEditingGuest(null);
    setShowForm(false);
  }

  function handleDelete(guest: (typeof guests)[number]) {
    if (!guest.savedGuest) {
      alert(
        "Ye guest booking record se generate hua hai. Is record ko Bookings page se manage karein."
      );
      return;
    }

    const confirmed = window.confirm(
      `Kya aap ${guest.name} ka saved guest profile delete karna chahte hain? Booking records delete nahi honge.`
    );

    if (confirmed) {
      deleteGuest(guest.savedGuest.id);

      if (selectedGuest?.id === guest.id) {
        setSelectedGuest(null);
      }
    }
  }

  function formatDate(date: string) {
    if (!date) return "—";

    return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  if (!bookingsLoaded || !guestsLoaded) {
    return <div className="p-6 text-sm text-gray-500">Loading guest records...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Guest Management
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Add and manage guest profiles and reservation history.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => window.print()}
            className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Print List
          </button>

          <button
            onClick={openAddForm}
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            + Add Guest
          </button>
        </div>
      </div>

      {error && !showForm && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p>{error}</p>
          <button
            onClick={() => setError("")}
            className="font-bold"
            aria-label="Dismiss message"
          >
            ×
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Total Guests" value={guests.length} />
        <StatCard title="Total Bookings" value={bookings.length} />
        <StatCard title="Repeat Guests" value={repeatGuests} />
      </div>

      {showForm && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {editingGuest ? "Edit Guest" : "Add New Guest"}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Guest ki details neeche bharein.
              </p>
            </div>

            <button
              onClick={() => {
                setShowForm(false);
                setEditingGuest(null);
                setError("");
              }}
              className="rounded-lg px-3 py-2 text-xl text-gray-500 hover:bg-gray-100"
              aria-label="Close form"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField label="Guest Name *">
                <input
                  required
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  placeholder="Enter full name"
                  className={inputClass}
                />
              </FormField>

              <FormField label="Phone Number">
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) =>
                    setForm({ ...form, phone: e.target.value })
                  }
                  placeholder="Enter phone number"
                  className={inputClass}
                />
              </FormField>

              <FormField label="Email Address">
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm({ ...form, email: e.target.value })
                  }
                  placeholder="guest@example.com"
                  className={inputClass}
                />
              </FormField>

              <FormField label="Address">
                <input
                  value={form.address}
                  onChange={(e) =>
                    setForm({ ...form, address: e.target.value })
                  }
                  placeholder="Enter address"
                  className={inputClass}
                />
              </FormField>
            </div>

            <p className="text-xs text-gray-500">
              Phone number ya email mein se kam se kam ek dena zaroori hai.
            </p>

            {error && (
              <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="submit"
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                {editingGuest ? "Save Changes" : "Save Guest"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingGuest(null);
                  setError("");
                }}
                className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Guest Directory
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {filteredGuests.length} guests found
            </p>
          </div>

          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone, email..."
            className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:max-w-xs"
          />
        </div>

        {filteredGuests.length === 0 ? (
          <div className="p-10 text-center">
            <div className="text-4xl">👤</div>
            <p className="mt-3 font-semibold text-gray-700">
              {search ? "No matching guests" : "No guest records yet"}
            </p>
            <p className="mt-2 text-sm text-gray-500">
              {search
                ? "Try another search term."
                : "Click + Add Guest to create your first guest profile."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-5 py-4">Guest</th>
                  <th className="px-5 py-4">Phone</th>
                  <th className="px-5 py-4">Bookings</th>
                  <th className="px-5 py-4">Latest Check-in</th>
                  <th className="px-5 py-4">Guest Type</th>
                  <th className="px-5 py-4">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredGuests.map((guest) => (
                  <tr key={guest.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
                          {guest.name.charAt(0).toUpperCase() || "G"}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {guest.name || "Unknown Guest"}
                          </p>
                          <p className="text-xs text-gray-500">
                            {guest.email || guest.id}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-gray-600">
                      {guest.phone || "—"}
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                        {guest.totalBookings}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-gray-600">
                      {formatDate(guest.latestCheckIn)}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          guest.totalBookings > 1
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {guest.totalBookings > 1
                          ? "Repeat Guest"
                          : "New Guest"}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedGuest(guest.savedGuest ?? null)}
                          disabled={!guest.savedGuest}
                          title={
                            guest.savedGuest
                              ? "View guest profile"
                              : "Profile details are generated from booking"
                          }
                          className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          View
                        </button>

                        <button
                          onClick={() => openEditForm(guest)}
                          className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => handleDelete(guest)}
                          className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedGuest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="flex items-start justify-between border-b border-gray-100 p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                  Guest Profile
                </p>
                <h2 className="mt-1 text-xl font-bold text-gray-900">
                  {selectedGuest.name}
                </h2>
              </div>

              <button
                onClick={() => setSelectedGuest(null)}
                className="rounded-lg px-3 py-2 text-xl text-gray-500 hover:bg-gray-100"
                aria-label="Close guest profile"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
              <Detail label="Phone" value={selectedGuest.phone} />
              <Detail label="Email" value={selectedGuest.email} />
              <Detail label="Address" value={selectedGuest.address} />
              <Detail
                label="Profile Created"
                value={formatDate(selectedGuest.createdAt.slice(0, 10))}
              />
            </div>

            <div className="px-5 pb-5">
              <h3 className="mb-3 font-semibold text-gray-900">
                Booking History
              </h3>

              {bookings.filter(
                (booking) =>
                  selectedGuest.phone.trim() &&
                  booking.phone.trim() === selectedGuest.phone.trim()
              ).length === 0 ? (
                <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
                  Is phone number ke saath koi booking nahi mili.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                      <tr>
                        <th className="px-4 py-3">Booking ID</th>
                        <th className="px-4 py-3">Room</th>
                        <th className="px-4 py-3">Check-in</th>
                        <th className="px-4 py-3">Check-out</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {bookings
                        .filter(
                          (booking) =>
                            selectedGuest.phone.trim() &&
                            booking.phone.trim() === selectedGuest.phone.trim()
                        )
                        .map((booking) => (
                          <tr key={booking.id}>
                            <td className="whitespace-nowrap px-4 py-3">
                              {booking.id}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3">
                              {booking.room}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3">
                              {formatDate(booking.checkIn)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3">
                              {formatDate(booking.checkOut)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3">
                              {booking.status}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end border-t border-gray-100 p-5">
              <button
                onClick={() => setSelectedGuest(null)}
                className="rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

function StatCard({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-gray-700">
        {label}
      </span>
      {children}
    </label>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-gray-50 p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold text-gray-900">
        {value || "Not provided"}
      </p>
    </div>
  );
}