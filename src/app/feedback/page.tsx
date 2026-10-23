"use client";

import { useEffect, useMemo, useState } from "react";

type Feedback = {
  id: string;
  guest: string;
  room: string;
  rating: number;
  category: string;
  comment: string;
  staff: string;
  status: "New" | "Reviewed" | "Resolved";
  date: string;
};

const STORAGE_KEY = "celebrations-hotel-feedback";

const categories = [
  "Room & Cleanliness",
  "Food & Restaurant",
  "Staff Behaviour",
  "Event Management",
  "Facilities",
  "Other",
];

const statusStyles: Record<Feedback["status"], string> = {
  New: "bg-amber-100 text-amber-800",
  Reviewed: "bg-blue-100 text-blue-800",
  Resolved: "bg-emerald-100 text-emerald-800",
};

export default function FeedbackPage() {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [ratingFilter, setRatingFilter] = useState("All");

  const [form, setForm] = useState({
    guest: "",
    room: "",
    rating: "5",
    category: categories[0],
    comment: "",
    staff: "",
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (Array.isArray(parsed)) setFeedback(parsed);
      }
    } catch {
      console.error("Feedback data could not be loaded.");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(feedback));
  }, [feedback, loaded]);

  function addFeedback(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const rating = Number(form.rating);

    if (!form.guest.trim() || !form.comment.trim()) {
      alert("Guest name aur feedback comment required hain.");
      return;
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      alert("Rating 1 se 5 ke beech select karein.");
      return;
    }

    const newFeedback: Feedback = {
      id: crypto.randomUUID(),
      guest: form.guest.trim(),
      room: form.room.trim(),
      rating,
      category: form.category,
      comment: form.comment.trim(),
      staff: form.staff.trim(),
      status: "New",
      date: new Date().toISOString(),
    };

    setFeedback((prev) => [newFeedback, ...prev]);

    setForm({
      guest: "",
      room: "",
      rating: "5",
      category: categories[0],
      comment: "",
      staff: "",
    });

    setShowForm(false);
  }

  function updateStatus(id: string, status: Feedback["status"]) {
    setFeedback((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status } : item))
    );
  }

  function deleteFeedback(id: string) {
    if (!window.confirm("Is feedback ko permanently delete karein?")) return;
    setFeedback((prev) => prev.filter((item) => item.id !== id));
  }

  const filteredFeedback = useMemo(() => {
    const query = search.toLowerCase().trim();

    return feedback.filter((item) => {
      const matchesSearch = [
        item.guest,
        item.room,
        item.comment,
        item.category,
        item.staff,
      ].some((value) => value.toLowerCase().includes(query));

      const matchesStatus =
        statusFilter === "All" || item.status === statusFilter;

      const matchesRating =
        ratingFilter === "All" || item.rating === Number(ratingFilter);

      return matchesSearch && matchesStatus && matchesRating;
    });
  }, [feedback, search, statusFilter, ratingFilter]);

  const averageRating = feedback.length
    ? feedback.reduce((sum, item) => sum + item.rating, 0) / feedback.length
    : 0;

  const resolvedCount = feedback.filter(
    (item) => item.status === "Resolved"
  ).length;

  const pendingCount = feedback.filter(
    (item) => item.status === "New"
  ).length;

  const fiveStarCount = feedback.filter(
    (item) => item.rating === 5
  ).length;

  function exportCSV() {
    const rows = [
      ["Guest", "Room", "Rating", "Category", "Comment", "Staff", "Status", "Date"],
      ...filteredFeedback.map((item) => [
        item.guest,
        item.room,
        item.rating,
        item.category,
        item.comment,
        item.staff,
        item.status,
        new Date(item.date).toLocaleString("en-IN"),
      ]),
    ];

    const csv = rows
      .map((row) =>
        row
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "guest-feedback.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  if (!loaded) {
    return <main className="p-5">Loading feedback...</main>;
  }

  return (
    <main className="min-h-screen bg-gray-50 p-3 sm:p-5 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">
              ⭐ Guest Feedback & Reviews
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Guest satisfaction, complaints and service quality.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              onClick={exportCSV}
              className="min-h-11 rounded-xl border border-gray-300 bg-white px-4 py-3 font-semibold hover:bg-gray-100"
            >
              Export CSV
            </button>

            <button
              onClick={() => setShowForm((value) => !value)}
              className="min-h-11 rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700"
            >
              {showForm ? "Close Form" : "+ Add Feedback"}
            </button>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[
            {
              label: "Total Reviews",
              value: feedback.length,
              icon: "📝",
            },
            {
              label: "Average Rating",
              value: `${averageRating.toFixed(1)} / 5`,
              icon: "⭐",
            },
            {
              label: "Pending Reviews",
              value: pendingCount,
              icon: "⏳",
            },
            {
              label: "Resolved",
              value: resolvedCount,
              icon: "✅",
            },
          ].map((card) => (
            <div
              key={card.label}
              className="min-w-0 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-gray-500 sm:text-sm">{card.label}</p>
                <span>{card.icon}</span>
              </div>
              <p className="mt-3 break-words text-2xl font-extrabold text-gray-900 sm:text-3xl">
                {card.value}
              </p>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Customer Satisfaction
              </h2>
              <p className="text-sm text-gray-500">
                Based on {feedback.length} recorded reviews
              </p>
            </div>
            <p className="text-sm font-semibold text-amber-600">
              ⭐ {fiveStarCount} five-star reviews
            </p>
          </div>

          <div className="mt-5 space-y-3">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = feedback.filter(
                (item) => item.rating === rating
              ).length;

              const percentage = feedback.length
                ? (count / feedback.length) * 100
                : 0;

              return (
                <div
                  key={rating}
                  className="grid grid-cols-[40px_minmax(0,1fr)_35px] items-center gap-3"
                >
                  <span className="text-sm font-medium text-gray-600">
                    {rating} ⭐
                  </span>

                  <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-amber-400 transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  <span className="text-right text-sm text-gray-500">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {showForm && (
          <form
            onSubmit={addFeedback}
            className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6"
          >
            <h2 className="text-lg font-bold text-gray-900">
              Record Guest Feedback
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <label className="text-sm font-medium text-gray-700">
                Guest Name *
                <input
                  required
                  value={form.guest}
                  onChange={(e) =>
                    setForm({ ...form, guest: e.target.value })
                  }
                  placeholder="Guest name"
                  className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 px-3"
                />
              </label>

              <label className="text-sm font-medium text-gray-700">
                Room Number
                <input
                  value={form.room}
                  onChange={(e) =>
                    setForm({ ...form, room: e.target.value })
                  }
                  placeholder="e.g. 101"
                  className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 px-3"
                />
              </label>

              <label className="text-sm font-medium text-gray-700">
                Rating *
                <select
                  value={form.rating}
                  onChange={(e) =>
                    setForm({ ...form, rating: e.target.value })
                  }
                  className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3"
                >
                  <option value="5">⭐⭐⭐⭐⭐ - Excellent</option>
                  <option value="4">⭐⭐⭐⭐ - Very Good</option>
                  <option value="3">⭐⭐⭐ - Average</option>
                  <option value="2">⭐⭐ - Poor</option>
                  <option value="1">⭐ - Very Poor</option>
                </select>
              </label>

              <label className="text-sm font-medium text-gray-700">
                Category *
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                  className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3"
                >
                  {categories.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-medium text-gray-700 sm:col-span-1 lg:col-span-2">
                Staff Member (Optional)
                <input
                  value={form.staff}
                  onChange={(e) =>
                    setForm({ ...form, staff: e.target.value })
                  }
                  placeholder="Staff name"
                  className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 px-3"
                />
              </label>

              <label className="text-sm font-medium text-gray-700 sm:col-span-2 lg:col-span-3">
                Feedback / Complaint *
                <textarea
                  required
                  rows={4}
                  value={form.comment}
                  onChange={(e) =>
                    setForm({ ...form, comment: e.target.value })
                  }
                  placeholder="Guest ka feedback ya complaint..."
                  className="mt-1 w-full rounded-lg border border-gray-300 p-3"
                />
              </label>
            </div>

            <button
              type="submit"
              className="min-h-11 w-full rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700 sm:w-auto"
            >
              Save Feedback
            </button>
          </form>
        )}

        <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="text-lg font-bold text-gray-900">
            Reviews & Complaints
          </h2>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search guest, room, staff..."
              className="min-h-11 w-full min-w-0 rounded-lg border border-gray-300 px-3 md:col-span-1"
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3"
            >
              <option value="All">All Statuses</option>
              <option value="New">New</option>
              <option value="Reviewed">Reviewed</option>
              <option value="Resolved">Resolved</option>
            </select>

            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
              className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3"
            >
              <option value="All">All Ratings</option>
              {[5, 4, 3, 2, 1].map((rating) => (
                <option key={rating} value={rating}>
                  {rating} Star{rating > 1 ? "s" : ""}
                </option>
              ))}
            </select>
          </div>

          {filteredFeedback.length === 0 ? (
            <div className="rounded-xl bg-gray-50 p-8 text-center">
              <p className="text-3xl">⭐</p>
              <p className="mt-2 font-semibold text-gray-700">
                No feedback found
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Add feedback or adjust the filters.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {filteredFeedback.map((item) => (
                <article
                  key={item.id}
                  className="min-w-0 rounded-xl border border-gray-200 p-4 sm:p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="break-words font-bold text-gray-900">
                        {item.guest}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {item.room ? `Room ${item.room} · ` : ""}
                        {item.category}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${statusStyles[item.status]}`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <p className="mt-3 break-words text-lg text-amber-500">
                    {"★".repeat(item.rating)}
                    <span className="text-gray-200">
                      {"★".repeat(5 - item.rating)}
                    </span>
                  </p>

                  <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-gray-700">
                    {item.comment}
                  </p>

                  {item.staff && (
                    <p className="mt-3 text-sm text-gray-500">
                      Staff: {item.staff}
                    </p>
                  )}

                  <p className="mt-2 text-xs text-gray-400">
                    {new Date(item.date).toLocaleString("en-IN")}
                  </p>

                  <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <select
                      aria-label={`Status for feedback by ${item.guest}`}
                      value={item.status}
                      onChange={(e) =>
                        updateStatus(
                          item.id,
                          e.target.value as Feedback["status"]
                        )
                      }
                      className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm"
                    >
                      <option value="New">New</option>
                      <option value="Reviewed">Reviewed</option>
                      <option value="Resolved">Resolved</option>
                    </select>

                    <button
                      onClick={() => deleteFeedback(item.id)}
                      className="min-h-11 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                    >
                      Delete Feedback
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <p className="text-xs leading-5 text-gray-500">
          Feedback is stored in this browser&apos;s localStorage. This is an
          internal management screen, not a public guest submission form.
          For guest submissions from their own phones, add a secure API and
          database.
        </p>
      </div>
    </main>
  );
}