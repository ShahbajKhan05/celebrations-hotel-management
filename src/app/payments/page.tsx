"use client";

import { useEffect, useMemo, useState } from "react";
import { useBookings, type Booking } from "@/components/BookingStorage";

type Room = {
  number: string;
  type: string;
  price: number;
  status?: string;
};

type PaymentEntry = {
  id: string;
  amount: number;
  method: string;
  date: string;
  note: string;
};

type BookingPayment = {
  bookingId: string;
  paidAmount: number;
  history: PaymentEntry[];
};

const PAYMENT_KEY = "celebrations-hotel-payments";
const ROOM_KEY = "celebrations-hotel-rooms";

const money = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

function getNights(checkIn: string, checkOut: string) {
  const start = new Date(`${checkIn}T00:00:00`).getTime();
  const end = new Date(`${checkOut}T00:00:00`).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 1;
  return Math.max(1, Math.ceil((end - start) / 86400000));
}

function readPayments(): Record<string, BookingPayment> {
  try {
    const raw = localStorage.getItem(PAYMENT_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function downloadCSV(rows: string[][], filename: string) {
  const csv = rows
    .map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\r\n");
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function PaymentsPage() {
  const { bookings, isLoaded } = useBookings();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [payments, setPayments] = useState<Record<string, BookingPayment>>({});
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [selected, setSelected] = useState<Booking | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Cash");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [today, setToday] = useState("");

  useEffect(() => {
    try {
      const rawRooms = localStorage.getItem(ROOM_KEY);
      const parsedRooms = rawRooms ? JSON.parse(rawRooms) : [];
      setRooms(Array.isArray(parsedRooms) ? parsedRooms : []);
    } catch {
      setRooms([]);
    }
    setPayments(readPayments());
    const now = new Date();
    setToday(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`);
    setLoaded(true);
  }, []);

  const activeBookings = useMemo(
    () => bookings.filter((booking) => booking.status !== "Cancelled"),
    [bookings]
  );

  const records = useMemo(() => {
    return activeBookings.map((booking) => {
      const room = rooms.find((item) => item.number === booking.room);
      const total = Math.max(0, Number(room?.price ?? 0)) * getNights(booking.checkIn, booking.checkOut);
      const payment = payments[booking.id];
      const paid = Math.min(total, Math.max(0, Number(payment?.paidAmount ?? 0)));
      const balance = Math.max(0, total - paid);
      const status = paid <= 0 ? "Unpaid" : balance <= 0 ? "Paid" : "Partial";
      return { booking, room, total, paid, balance, status, history: payment?.history ?? [] };
    });
  }, [activeBookings, rooms, payments]);

  const filtered = records.filter((record) => {
    const q = search.toLowerCase().trim();
    const matchesSearch = [record.booking.id, record.booking.guest, record.booking.phone, record.booking.room]
      .some((value) => value?.toLowerCase().includes(q));
    return matchesSearch && (filter === "All" || record.status === filter);
  });

  const totalDue = records.reduce((sum, item) => sum + item.total, 0);
  const totalPaid = records.reduce((sum, item) => sum + item.paid, 0);
  const totalPending = records.reduce((sum, item) => sum + item.balance, 0);

  function persist(next: Record<string, BookingPayment>) {
    setPayments(next);
    localStorage.setItem(PAYMENT_KEY, JSON.stringify(next));
  }

  function recordPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const row = records.find((item) => item.booking.id === selected.id);
    const value = Number(amount);
    if (!row) {
      setMessage("Booking record nahi mili.");
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      setMessage("Valid payment amount enter karo.");
      return;
    }
    if (value > row.balance) {
      setMessage(`Amount pending balance ${money(row.balance)} se zyada nahi ho sakta.`);
      return;
    }
    const previous = payments[selected.id] ?? { bookingId: selected.id, paidAmount: 0, history: [] };
    const entry: PaymentEntry = {
      id: `PAY-${Date.now().toString().slice(-8)}`,
      amount: value,
      method,
      date: today || new Date().toISOString().slice(0, 10),
      note: note.trim(),
    };
    persist({
      ...payments,
      [selected.id]: {
        bookingId: selected.id,
        paidAmount: previous.paidAmount + value,
        history: [entry, ...previous.history],
      },
    });
    setMessage(`${money(value)} payment ${selected.guest} ke liye record ho gayi.`);
    setSelected(null);
    setAmount("");
    setNote("");
  }

  function printPaymentReceipt(bookingId: string, entry: PaymentEntry) {
    const row = records.find((item) => item.booking.id === bookingId);
    if (!row) {
      setMessage("Booking receipt ke liye nahi mili.");
      return;
    }
    const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;",
    }[char] ?? char));
    const paidBefore = row.history.filter((item) => item.id !== entry.id)
      .reduce((sum, item) => sum + item.amount, 0);
    const paidAfter = Math.min(row.total, paidBefore + entry.amount);
    const balanceAfter = Math.max(0, row.total - paidAfter);
    const printWindow = window.open("", "_blank", "width=800,height=700");
    if (!printWindow) {
      setMessage("Receipt print karne ke liye browser pop-up allow karo.");
      return;
    }
    printWindow.document.write(`<!DOCTYPE html><html><head><title>Payment Receipt ${escapeHtml(entry.id)}</title><style>
      body{font-family:Arial,sans-serif;padding:36px;color:#1e293b;max-width:760px;margin:auto}h1{margin-bottom:4px}.muted{color:#64748b;font-size:13px}.box{border:1px solid #cbd5e1;border-radius:12px;padding:24px;margin-top:24px}.row{display:flex;justify-content:space-between;gap:20px;padding:12px 0;border-bottom:1px solid #e2e8f0}.total{font-size:20px;font-weight:bold}.badge{display:inline-block;background:#dcfce7;color:#166534;padding:6px 10px;border-radius:20px;font-size:12px;font-weight:bold}@media print{button{display:none}}
      </style></head><body><h1>Celebrations Hotel &amp; Resort</h1><p class="muted">Payment Receipt</p><div class="box">
      <div class="row"><span>Receipt ID</span><strong>${escapeHtml(entry.id)}</strong></div>
      <div class="row"><span>Booking ID</span><strong>${escapeHtml(row.booking.id)}</strong></div>
      <div class="row"><span>Guest</span><strong>${escapeHtml(row.booking.guest)}</strong></div>
      <div class="row"><span>Phone</span><strong>${escapeHtml(row.booking.phone)}</strong></div>
      <div class="row"><span>Room / Stay</span><strong>${escapeHtml(row.booking.room)} · ${escapeHtml(row.booking.checkIn)} to ${escapeHtml(row.booking.checkOut)}</strong></div>
      <div class="row"><span>Payment Date</span><strong>${escapeHtml(entry.date)}</strong></div>
      <div class="row"><span>Payment Method</span><strong>${escapeHtml(entry.method)}</strong></div>
      ${entry.note ? `<div class="row"><span>Note</span><strong>${escapeHtml(entry.note)}</strong></div>` : ""}
      <div class="row total"><span>Amount Received</span><strong>${money(entry.amount)}</strong></div>
      <div class="row"><span>Total Room Estimate</span><strong>${money(row.total)}</strong></div>
      <div class="row"><span>Total Paid After This Payment</span><strong>${money(paidAfter)}</strong></div>
      <div class="row"><span>Balance After This Payment</span><strong>${money(balanceAfter)}</strong></div>
      <p><span class="badge">PAYMENT RECORDED</span></p><p class="muted">Receipt confirms the payment entry recorded in the local system. Room charges are estimates and exclude taxes, food, events and extras.</p>
      </div><button onclick="window.print()">Print Receipt</button></body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  function exportPayments() {
    const rows = [
      ["Booking ID", "Guest", "Phone", "Room", "Check-in", "Check-out", "Nights", "Room Estimate", "Paid", "Balance", "Payment Status"],
      ...filtered.map(({ booking, total, paid, balance, status }) => [
        booking.id, booking.guest, booking.phone, booking.room, booking.checkIn, booking.checkOut,
        String(getNights(booking.checkIn, booking.checkOut)), String(total), String(paid), String(balance), status,
      ]),
    ];
    downloadCSV(rows, `celebrations-payments-${today || "export"}.csv`);
  }

  function exportHistory() {
    const rows = [
      ["Payment ID", "Booking ID", "Guest", "Date", "Amount", "Method", "Note"],
      ...records.flatMap((record) => record.history.map((entry) => [
        entry.id, record.booking.id, record.booking.guest, entry.date, String(entry.amount), entry.method, entry.note,
      ])),
    ];
    downloadCSV(rows, `celebrations-payment-history-${today || "export"}.csv`);
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 rounded-2xl bg-gradient-to-r from-emerald-950 to-teal-800 p-6 text-white sm:flex-row sm:items-center">
        <div>
          <p className="text-sm text-emerald-200">ACCOUNTS & FRONT DESK</p>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Payments & Balances</h1>
          <p className="mt-2 text-sm text-emerald-100">Advance payments, outstanding balances aur payment history manage karo.</p>
        </div>
        <button onClick={exportPayments} disabled={!filtered.length} className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-emerald-900 hover:bg-emerald-50 disabled:opacity-50">
          ↓ Export Payments CSV
        </button>
      </section>

      {message && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <span>{message}</span>
          <button onClick={() => setMessage("")} className="font-bold">✕</button>
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Total Room Estimates" value={money(totalDue)} icon="🧾" />
        <SummaryCard title="Payments Received" value={money(totalPaid)} icon="💰" />
        <SummaryCard title="Pending Balance" value={money(totalPending)} icon="⏳" />
        <SummaryCard title="Bookings with Balance" value={records.filter((item) => item.balance > 0).length} icon="📌" />
      </section>

      {selected && (
        <section className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Record Payment</p>
              <h2 className="mt-1 text-xl font-bold text-slate-900">{selected.guest}</h2>
              <p className="mt-1 text-sm text-slate-500">{selected.id} · Room {selected.room}</p>
            </div>
            <button onClick={() => setSelected(null)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">Close ✕</button>
          </div>
          {(() => {
            const row = records.find((item) => item.booking.id === selected.id);
            return row ? (
              <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-3">
                <Info label="Room estimate" value={money(row.total)} />
                <Info label="Already paid" value={money(row.paid)} />
                <Info label="Remaining balance" value={money(row.balance)} />
              </div>
            ) : null;
          })()}
          <form onSubmit={recordPayment} className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Payment Amount (₹)">
              <input required type="number" min="1" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Enter amount" className={inputClass} />
            </Field>
            <Field label="Payment Method">
              <select value={method} onChange={(e) => setMethod(e.target.value)} className={inputClass}>
                <option>Cash</option><option>UPI</option><option>Card</option><option>Bank Transfer</option><option>Other</option>
              </select>
            </Field>
            <Field label="Note (optional)">
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Advance / settlement..." className={inputClass} />
            </Field>
            <div className="flex items-end">
              <button type="submit" className="w-full rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800">Save Payment</button>
            </div>
          </form>
        </section>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Booking Payment Ledger</h2>
            <p className="mt-1 text-sm text-slate-500">Payment data booking records se alag save hota hai; booking delete karne par payment history yahan orphan ho sakti hai.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search guest, phone, room..." className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500" />
            <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500">
              <option>All</option><option>Unpaid</option><option>Partial</option><option>Paid</option>
            </select>
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2 px-5 py-3">
          <button onClick={exportHistory} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">↓ Export Payment History</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                {["Booking / Guest", "Room", "Stay", "Estimate", "Paid", "Balance", "Payment Status", "Action"].map((heading) => <th key={heading} className="px-5 py-4">{heading}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(!isLoaded || !loaded) ? (
                <tr><td colSpan={8} className="px-5 py-12 text-center text-slate-500">Loading payment records...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-12 text-center text-slate-500">Koi booking record nahi mili.</td></tr>
              ) : filtered.map((row) => (
                <tr key={row.booking.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4">
                    <p className="font-bold text-slate-800">{row.booking.id}</p>
                    <p className="mt-1 font-medium">{row.booking.guest}</p>
                    <p className="mt-1 text-xs text-slate-500">{row.booking.phone}</p>
                  </td>
                  <td className="px-5 py-4 text-slate-600">Room {row.booking.room}<p className="mt-1 text-xs text-slate-400">{row.room?.type ?? "Room type unavailable"}</p></td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-600">{row.booking.checkIn}<p className="mt-1 text-xs text-slate-400">to {row.booking.checkOut} · {getNights(row.booking.checkIn, row.booking.checkOut)} night(s)</p></td>
                  <td className="whitespace-nowrap px-5 py-4 font-semibold">{money(row.total)}</td>
                  <td className="whitespace-nowrap px-5 py-4 font-semibold text-emerald-700">{money(row.paid)}</td>
                  <td className="whitespace-nowrap px-5 py-4 font-semibold text-rose-700">{money(row.balance)}</td>
                  <td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${row.status === "Paid" ? "bg-emerald-100 text-emerald-700" : row.status === "Partial" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}`}>{row.status}</span></td>
                  <td className="px-5 py-4">
                    {row.balance > 0 ? <button onClick={() => { setSelected(row.booking); setAmount(String(row.balance)); setMessage(""); }} className="whitespace-nowrap rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100">+ Add Payment</button> : <span className="text-xs font-semibold text-emerald-700">Settled ✓</span>}
                    {row.history.length > 0 && <p className="mt-2 text-xs text-slate-500">{row.history.length} payment(s) recorded</p>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 px-5 py-4 text-xs text-slate-500">Showing {filtered.length} of {records.length} active bookings · Estimated room charges only; taxes, food, events and extras are not included.</div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-lg font-bold text-slate-800">Recent Payment History</h2><p className="mt-1 text-sm text-slate-500">Har recorded payment ka audit-style entry.</p></div>
          <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">{records.reduce((sum, row) => sum + row.history.length, 0)} entries</span>
        </div>
        <div className="mt-4 space-y-3">
          {records.flatMap((row) => row.history.map((entry) => ({ ...entry, guest: row.booking.guest, bookingId: row.booking.id })))
            .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
            .slice(0, 8)
            .map((entry) => (
              <div key={entry.id} className="flex flex-col justify-between gap-2 rounded-xl border border-slate-100 p-4 sm:flex-row sm:items-center">
                <div><p className="font-semibold text-slate-800">{entry.guest} <span className="font-normal text-slate-400">· {entry.bookingId}</span></p><p className="mt-1 text-xs text-slate-500">{entry.date} · {entry.method}{entry.note ? ` · ${entry.note}` : ""}</p></div>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <div className="font-bold text-emerald-700">+{money(entry.amount)}</div>
                  <button onClick={() => printPaymentReceipt(entry.bookingId, entry)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">Print Receipt</button>
                </div>
              </div>
            ))}
          {records.every((row) => row.history.length === 0) && <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">Abhi koi payment history nahi hai.</p>}
        </div>
      </section>
    </div>
  );
}

const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>{children}</label>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-semibold uppercase text-slate-500">{label}</p><p className="mt-1 text-lg font-bold text-slate-800">{value}</p></div>;
}

function SummaryCard({ title, value, icon }: { title: string; value: string | number; icon: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between gap-3"><div><p className="text-sm text-slate-500">{title}</p><p className="mt-2 text-2xl font-bold text-slate-800">{value}</p></div><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-2xl">{icon}</span></div></div>;
}
