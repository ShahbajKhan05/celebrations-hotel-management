"use client";

import { useEffect, useMemo, useState } from "react";

type CleaningStatus =
  | "Needs Cleaning"
  | "In Progress"
  | "Clean"
  | "Inspected";

type HousekeepingTask = {
  id: string;
  room: string;
  status: CleaningStatus;
  assignedTo?: string;
  notes?: string;
  priority?: "Low" | "Normal" | "High";
  updatedAt?: string;
};

type Room = {
  number: string;
  status?: string;
};

type Staff = {
  id?: string;
  name: string;
  status?: string;
};

const HOUSEKEEPING_KEY = "celebrations-hotel-housekeeping";
const ROOMS_KEY = "celebrations-hotel-rooms";
const STAFF_KEY = "celebrations-hotel-staff";

const statuses: CleaningStatus[] = [
  "Needs Cleaning",
  "In Progress",
  "Clean",
  "Inspected",
];

const statusStyles: Record<CleaningStatus, string> = {
  "Needs Cleaning": "bg-red-100 text-red-700",
  "In Progress": "bg-amber-100 text-amber-700",
  Clean: "bg-emerald-100 text-emerald-700",
  Inspected: "bg-blue-100 text-blue-700",
};

export default function HousekeepingDashboardPage() {
  const [tasks, setTasks] = useState<HousekeepingTask[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [editing, setEditing] = useState<HousekeepingTask | null>(null);

  useEffect(() => {
    try {
      const savedTasks = localStorage.getItem(HOUSEKEEPING_KEY);
      const savedStaff = localStorage.getItem(STAFF_KEY);
      const savedRooms = localStorage.getItem(ROOMS_KEY);

      const parsedTasks: unknown = savedTasks
        ? JSON.parse(savedTasks)
        : [];

      const parsedStaff: unknown = savedStaff
        ? JSON.parse(savedStaff)
        : [];

      const parsedRooms: unknown = savedRooms
        ? JSON.parse(savedRooms)
        : [];

      const validTasks = Array.isArray(parsedTasks)
        ? (parsedTasks as HousekeepingTask[])
        : [];

      const validStaff = Array.isArray(parsedStaff)
        ? (parsedStaff as Staff[])
        : [];

      const validRooms = Array.isArray(parsedRooms)
        ? (parsedRooms as Room[])
        : [];

      // Existing room tasks are preserved. Missing room tasks are added.
      const existingRooms = new Set(
        validTasks.map((task) => String(task.room))
      );

      const missingTasks: HousekeepingTask[] = validRooms
        .filter((room) => !existingRooms.has(String(room.number)))
        .map((room) => ({
          id: crypto.randomUUID(),
          room: String(room.number),
          status:
            room.status === "Occupied" ? "Needs Cleaning" : "Clean",
          assignedTo: "",
          notes: "",
          priority: "Normal",
          updatedAt: new Date().toISOString(),
        }));

      setTasks([...validTasks, ...missingTasks]);
      setStaff(validStaff);
    } catch {
      alert("Housekeeping data load nahi ho saka.");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(HOUSEKEEPING_KEY, JSON.stringify(tasks));
  }, [tasks, loaded]);

  function updateTask(
    id: string,
    updates: Partial<HousekeepingTask>
  ) {
    setTasks((current) =>
      current.map((task) =>
        task.id === id
          ? {
              ...task,
              ...updates,
              updatedAt: new Date().toISOString(),
            }
          : task
      )
    );
  }

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();

    return tasks
      .filter((task) => {
        const matchesSearch = [
          task.room,
          task.assignedTo ?? "",
          task.notes ?? "",
        ].some((value) => value.toLowerCase().includes(query));

        const matchesStatus =
          filter === "All" || task.status === filter;

        const matchesPriority =
          priorityFilter === "All" ||
          (task.priority ?? "Normal") === priorityFilter;

        return matchesSearch && matchesStatus && matchesPriority;
      })
      .sort((a, b) => {
        const priorityRank = { High: 0, Normal: 1, Low: 2 };
        const priorityDifference =
          priorityRank[a.priority ?? "Normal"] -
          priorityRank[b.priority ?? "Normal"];

        if (priorityDifference !== 0) return priorityDifference;

        return a.room.localeCompare(b.room, undefined, {
          numeric: true,
        });
      });
  }, [tasks, search, filter, priorityFilter]);

  const counts = {
    total: tasks.length,
    dirty: tasks.filter((t) => t.status === "Needs Cleaning").length,
    progress: tasks.filter((t) => t.status === "In Progress").length,
    clean: tasks.filter(
      (t) => t.status === "Clean" || t.status === "Inspected"
    ).length,
  };

  function exportCSV() {
    const rows = [
      ["Room", "Status", "Priority", "Assigned Staff", "Notes"],
      ...filteredTasks.map((task) => [
        task.room,
        task.status,
        task.priority ?? "Normal",
        task.assignedTo ?? "",
        task.notes ?? "",
      ]),
    ];

    const csv = rows
      .map((row) =>
        row
          .map(
            (value) =>
              `"${String(value).replace(/"/g, '""')}"`
          )
          .join(",")
      )
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "housekeeping-report.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  if (!loaded) {
    return <main className="p-5">Loading housekeeping dashboard...</main>;
  }

  return (
    <main className="min-h-screen bg-gray-50 p-3 sm:p-5 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">
              🧹 Housekeeping Dashboard
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Room cleaning, assignments and inspection tracking.
            </p>
          </div>

          <button
            onClick={exportCSV}
            className="min-h-11 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 font-semibold hover:bg-gray-100 sm:w-auto"
          >
            ⬇ Export CSV
          </button>
        </header>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            {
              label: "Total Rooms",
              value: counts.total,
              color: "text-gray-900",
              icon: "🏨",
            },
            {
              label: "Needs Cleaning",
              value: counts.dirty,
              color: "text-red-600",
              icon: "🧹",
            },
            {
              label: "In Progress",
              value: counts.progress,
              color: "text-amber-600",
              icon: "⏳",
            },
            {
              label: "Clean / Inspected",
              value: counts.clean,
              color: "text-emerald-600",
              icon: "✅",
            },
          ].map((card) => (
            <div
              key={card.label}
              className="min-w-0 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-gray-500 sm:text-sm">
                  {card.label}
                </p>
                <span>{card.icon}</span>
              </div>
              <p className={`mt-3 text-2xl font-extrabold sm:text-3xl ${card.color}`}>
                {card.value}
              </p>
            </div>
          ))}
        </section>

        <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search room, staff or notes..."
              className="min-h-11 w-full min-w-0 rounded-lg border border-gray-300 px-3 md:col-span-1"
            />

            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3"
            >
              <option value="All">All Cleaning Statuses</option>
              {statuses.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3"
            >
              <option value="All">All Priorities</option>
              <option value="High">High Priority</option>
              <option value="Normal">Normal Priority</option>
              <option value="Low">Low Priority</option>
            </select>
          </div>

          {filteredTasks.length === 0 ? (
            <div className="rounded-xl bg-gray-50 p-8 text-center">
              <p className="text-3xl">🧹</p>
              <p className="mt-2 font-semibold text-gray-700">
                No housekeeping tasks found
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Check your filters or add rooms in the Rooms module.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredTasks.map((task) => (
                <article
                  key={task.id}
                  className="min-w-0 rounded-xl border border-gray-200 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-medium text-gray-500">
                        ROOM NUMBER
                      </p>
                      <h2 className="text-2xl font-extrabold text-gray-900">
                        {task.room}
                      </h2>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        statusStyles[task.status]
                      }`}
                    >
                      {task.status}
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Cleaning Status
                      <select
                        value={task.status}
                        onChange={(e) =>
                          updateTask(task.id, {
                            status: e.target.value as CleaningStatus,
                          })
                        }
                        className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3"
                      >
                        {statuses.map((status) => (
                          <option key={status}>{status}</option>
                        ))}
                      </select>
                    </label>

                    <label className="block text-sm font-medium text-gray-700">
                      Assign Staff
                      <select
                        value={task.assignedTo ?? ""}
                        onChange={(e) =>
                          updateTask(task.id, {
                            assignedTo: e.target.value,
                          })
                        }
                        className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3"
                      >
                        <option value="">Unassigned</option>
                        {staff
                          .filter(
                            (member) =>
                              !member.status || member.status === "Active"
                          )
                          .map((member, index) => (
                            <option
                              key={member.id ?? `${member.name}-${index}`}
                              value={member.name}
                            >
                              {member.name}
                            </option>
                          ))}
                      </select>
                    </label>

                    <label className="block text-sm font-medium text-gray-700">
                      Priority
                      <select
                        value={task.priority ?? "Normal"}
                        onChange={(e) =>
                          updateTask(task.id, {
                            priority: e.target.value as
                              | "Low"
                              | "Normal"
                              | "High",
                          })
                        }
                        className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3"
                      >
                        <option value="Low">Low</option>
                        <option value="Normal">Normal</option>
                        <option value="High">High</option>
                      </select>
                    </label>

                    <label className="block text-sm font-medium text-gray-700">
                      Notes
                      <textarea
                        value={task.notes ?? ""}
                        onChange={(e) =>
                          updateTask(task.id, { notes: e.target.value })
                        }
                        placeholder="Cleaning instructions..."
                        rows={2}
                        className="mt-1 w-full rounded-lg border border-gray-300 p-3"
                      />
                    </label>

                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3">
                      <span className="text-xs text-gray-400">
                        {task.assignedTo
                          ? `Assigned: ${task.assignedTo}`
                          : "Not assigned"}
                      </span>

                      <button
                        onClick={() =>
                          setEditing(editing?.id === task.id ? null : task)
                        }
                        className="min-h-11 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold hover:bg-gray-50"
                      >
                        {editing?.id === task.id ? "Close" : "Quick Actions"}
                      </button>
                    </div>

                    {editing?.id === task.id && (
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <button
                          onClick={() =>
                            updateTask(task.id, { status: "In Progress" })
                          }
                          className="min-h-11 rounded-lg bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-800"
                        >
                          Start Cleaning
                        </button>
                        <button
                          onClick={() =>
                            updateTask(task.id, { status: "Clean" })
                          }
                          className="min-h-11 rounded-lg bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-800"
                        >
                          Mark Clean
                        </button>
                        <button
                          onClick={() =>
                            updateTask(task.id, { status: "Inspected" })
                          }
                          className="min-h-11 rounded-lg bg-blue-100 px-3 py-2 text-sm font-semibold text-blue-800 sm:col-span-2"
                        >
                          Mark Inspected
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <p className="text-xs leading-5 text-gray-500">
          Data is stored in this browser&apos;s localStorage. Changes made
          here update the housekeeping storage, but other devices will not
          receive them automatically without a shared backend.
        </p>
      </div>
    </main>
  );
}