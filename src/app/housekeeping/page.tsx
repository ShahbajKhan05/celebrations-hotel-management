"use client";

import { useEffect, useMemo, useState } from "react";

type Room = { number: string; type: string; price: number; status: "Available" | "Occupied" | "Maintenance" | string };
type TaskStatus = "Needs Cleaning" | "In Progress" | "Clean" | "Inspected";
type HousekeepingTask = { roomNumber: string; status: TaskStatus; assignedTo: string; notes: string; updatedAt: string };
const ROOM_KEY = "celebrations-hotel-rooms";
const TASK_KEY = "celebrations-hotel-housekeeping";
const STATUSES: TaskStatus[] = ["Needs Cleaning", "In Progress", "Clean", "Inspected"];
const readJSON = <T,>(key: string, fallback: T): T => {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback; } catch { return fallback; }
};
const badge: Record<TaskStatus, string> = {
  "Needs Cleaning": "bg-rose-50 text-rose-700 ring-rose-200",
  "In Progress": "bg-amber-50 text-amber-700 ring-amber-200",
  Clean: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Inspected: "bg-blue-50 text-blue-700 ring-blue-200",
};

export default function HousekeepingPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [tasks, setTasks] = useState<Record<string, HousekeepingTask>>({});
  const [staff, setStaff] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const currentRooms = readJSON<Room[]>(ROOM_KEY, []);
    const savedTasks = readJSON<Record<string, HousekeepingTask>>(TASK_KEY, {});
    const team = readJSON<Array<{ name?: string; status?: string }>>("celebrations-hotel-staff", []);
    const next = { ...savedTasks };
    currentRooms.forEach((room) => {
      if (!next[room.number]) next[room.number] = { roomNumber: room.number, status: room.status === "Occupied" ? "Needs Cleaning" : "Clean", assignedTo: "", notes: "", updatedAt: new Date().toISOString() };
    });
    setRooms(currentRooms);
    setTasks(next);
    setStaff(team.filter((item) => item.name && item.status !== "Inactive").map((item) => item.name as string));
    localStorage.setItem(TASK_KEY, JSON.stringify(next));
    setLoaded(true);
  }, []);

  const visibleRooms = useMemo(() => rooms.filter((room) => {
    const task = tasks[room.number];
    const text = `${room.number} ${room.type} ${task?.assignedTo ?? ""}`.toLowerCase();
    return text.includes(query.toLowerCase().trim()) && (filter === "All" || task?.status === filter);
  }), [rooms, tasks, query, filter]);

  const counts = useMemo(() => ({
    total: rooms.length,
    needs: rooms.filter((r) => tasks[r.number]?.status === "Needs Cleaning").length,
    progress: rooms.filter((r) => tasks[r.number]?.status === "In Progress").length,
    clean: rooms.filter((r) => tasks[r.number]?.status === "Clean" || tasks[r.number]?.status === "Inspected").length,
  }), [rooms, tasks]);

  function updateTask(roomNumber: string, patch: Partial<HousekeepingTask>) {
    const next = { ...tasks, [roomNumber]: { ...tasks[roomNumber], roomNumber, status: tasks[roomNumber]?.status ?? "Needs Cleaning", assignedTo: tasks[roomNumber]?.assignedTo ?? "", notes: tasks[roomNumber]?.notes ?? "", ...patch, updatedAt: new Date().toISOString() } };
    setTasks(next);
    localStorage.setItem(TASK_KEY, JSON.stringify(next));
    setMessage(`Room ${roomNumber} housekeeping update save ho gaya.`);
  }

  function exportCSV() {
    const rows = [["Room", "Type", "Room Status", "Housekeeping Status", "Assigned To", "Notes", "Last Updated"], ...visibleRooms.map((room) => {
      const task = tasks[room.number];
      return [room.number, room.type, room.status, task?.status ?? "Needs Cleaning", task?.assignedTo ?? "", task?.notes ?? "", task?.updatedAt ?? ""];
    })];
    const csv = rows.map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a");
    link.href = url; link.download = "celebrations-housekeeping.csv"; link.click(); URL.revokeObjectURL(url);
  }

  if (!loaded) return <main className="p-8 text-sm text-slate-500">Loading housekeeping…</main>;

  return <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
    <header className="flex flex-col justify-between gap-4 rounded-3xl bg-gradient-to-r from-slate-950 via-teal-950 to-emerald-900 p-6 text-white sm:flex-row sm:items-center sm:p-8">
      <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-200">Rooms operations</p><h1 className="mt-2 text-3xl font-bold">Housekeeping</h1><p className="mt-2 max-w-2xl text-sm text-emerald-100">Room cleaning queue, staff assignment aur inspection status manage karo.</p></div>
      <button onClick={exportCSV} className="rounded-xl bg-white px-4 py-3 text-sm font-bold text-emerald-950 hover:bg-emerald-50">↓ Export CSV</button>
    </header>

    {message && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}<button onClick={() => setMessage("")} className="ml-3 font-bold">×</button></div>}

    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {[{ label: "Total Rooms", value: counts.total, tone: "text-slate-900" }, { label: "Needs Cleaning", value: counts.needs, tone: "text-rose-700" }, { label: "In Progress", value: counts.progress, tone: "text-amber-700" }, { label: "Clean / Inspected", value: counts.clean, tone: "text-emerald-700" }].map((card) => <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{card.label}</p><p className={`mt-2 text-3xl font-bold ${card.tone}`}>{card.value}</p></div>)}
    </section>

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 md:flex-row md:items-center md:justify-between"><div><h2 className="font-bold text-slate-900">Room Cleaning Board</h2><p className="mt-1 text-xs text-slate-500">Updates browser ke localStorage mein save hote hain.</p></div><div className="flex flex-col gap-2 sm:flex-row"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search room, type, staff…" className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"/><select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm"><option>All</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></div></div>
      {visibleRooms.length === 0 ? <div className="p-12 text-center"><p className="font-semibold text-slate-700">No rooms found</p><p className="mt-1 text-sm text-slate-500">Pehle Rooms page par rooms add karo, ya search/filter badlo.</p></div> : <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">{visibleRooms.map((room) => { const task = tasks[room.number] ?? { roomNumber: room.number, status: "Needs Cleaning" as TaskStatus, assignedTo: "", notes: "", updatedAt: "" }; return <article key={room.number} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Room {room.number}</p><h3 className="mt-1 text-lg font-bold text-slate-900">{room.type || "Standard Room"}</h3><p className="mt-1 text-xs text-slate-500">Room status: {room.status}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${badge[task.status] ?? badge["Needs Cleaning"]}`}>{task.status}</span></div><div className="mt-4 space-y-3"><label className="block text-xs font-semibold text-slate-600">Cleaning status<select value={task.status} onChange={(e) => updateTask(room.number, { status: e.target.value as TaskStatus })} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm">{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></label><label className="block text-xs font-semibold text-slate-600">Assigned staff<select value={task.assignedTo} onChange={(e) => updateTask(room.number, { assignedTo: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"><option value="">Unassigned</option>{staff.map((name) => <option key={name}>{name}</option>)}</select></label><label className="block text-xs font-semibold text-slate-600">Notes<textarea value={task.notes} onChange={(e) => updateTask(room.number, { notes: e.target.value })} rows={2} placeholder="Towels, minibar, maintenance note…" className="mt-1 w-full resize-y rounded-xl border border-slate-300 px-3 py-2.5 text-sm"/></label><button onClick={() => updateTask(room.number, { notes: task.notes })} className="w-full rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white hover:bg-slate-700">Save Room Task</button></div></article>; })}</div>}
    </section>
    <p className="text-xs leading-5 text-slate-500">Note: Housekeeping status is tracked separately from the room’s Available / Occupied / Maintenance status. This browser-only version does not send background alerts or sync across devices.</p>
  </main>;
}
