
"use client";

import { useMemo, useState } from "react";
import { useBookings } from "@/components/BookingStorage";

type Invoice = {
  bookingId: string;
  extraCharges: number;
  discount: number;
  taxRate: number;
  paid: number;
};

const STORAGE_KEY = "celebrations-hotel-invoices";
const PAYMENT_KEY = "celebrations-hotel-payments";

export default function InvoicesPage() {
  const { bookings, isLoaded } = useBookings();

  const [selectedId, setSelectedId] = useState("");
  const [extraCharges, setExtraCharges] = useState("0");
  const [discount, setDiscount] = useState("0");
  const [taxRate, setTaxRate] = useState("0");
  const [paid, setPaid] = useState("0");
  const [description, setDescription] = useState("Food / Other Services");
  const [saved, setSaved] = useState(false);

  const booking = bookings.find((item) => item.id === selectedId);

  const nights = useMemo(() => {
    if (!booking) return 0;

    const start = new Date(`${booking.checkIn}T00:00:00`);
    const end = new Date(`${booking.checkOut}T00:00:00`);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      end <= start
    ) {
      return 0;
    }

    return Math.round(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    );
  }, [booking]);

  const roomPrice = useMemo(() => {
    if (!booking) return 0;

    try {
      const rooms = JSON.parse(
        localStorage.getItem("celebrations-hotel-rooms") || "[]",
      );

      const room = Array.isArray(rooms)
        ? rooms.find(
            (item: { number?: string }) =>
              String(item.number) === String(booking.room),
          )
        : null;

      return Math.max(0, Number(room?.price) || 0);
    } catch {
      return 0;
    }
  }, [booking]);

  const roomTotal = roomPrice * nights;
  const extras = Math.max(0, Number(extraCharges) || 0);
  const discountAmount = Math.min(
    roomTotal + extras,
    Math.max(0, Number(discount) || 0),
  );
  const taxableAmount = roomTotal + extras - discountAmount;
  const tax = taxableAmount * Math.min(100, Math.max(0, Number(taxRate) || 0)) / 100;
  const total = taxableAmount + tax;
  const paidAmount = Math.min(total, Math.max(0, Number(paid) || 0));
  const balance = Math.max(0, total - paidAmount);

  const money = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(amount);

  function saveInvoice() {
    if (!booking) {
      alert("Pehle booking select karein.");
      return;
    }

    if (nights <= 0) {
      alert("Booking ki check-in aur check-out dates verify karein.");
      return;
    }

    if (
      !Number.isFinite(Number(extraCharges)) ||
      !Number.isFinite(Number(discount)) ||
      !Number.isFinite(Number(taxRate)) ||
      !Number.isFinite(Number(paid)) ||
      Number(extraCharges) < 0 ||
      Number(discount) < 0 ||
      Number(taxRate) < 0 ||
      Number(taxRate) > 100 ||
      Number(paid) < 0
    ) {
      alert("Charges, discount, tax aur payment ki values verify karein.");
      return;
    }

    try {
      const existing = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || "[]",
      );

      const invoices = Array.isArray(existing) ? existing : [];

      const invoice: Invoice & {
        id: string;
        guest: string;
        room: string;
        checkIn: string;
        checkOut: string;
        nights: number;
        roomPrice: number;
        description: string;
        createdAt: string;
        total: number;
        balance: number;
      } = {
        id: `INV-${booking.id}`,
        bookingId: booking.id,
        guest: booking.guest,
        room: booking.room,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        nights,
        roomPrice,
        extraCharges: extras,
        description,
        discount: discountAmount,
        taxRate: Number(taxRate),
        paid: paidAmount,
        total,
        balance,
        createdAt: new Date().toISOString(),
      };

      const updated = [
        ...invoices.filter((item: { bookingId?: string }) =>
          item.bookingId !== booking.id
        ),
        invoice,
      ];

      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setSaved(true);
      alert("Invoice save ho gaya!");
    } catch {
      alert("Invoice save nahi hua. Storage check karein.");
    }
  }

  if (!isLoaded) {
    return <main className="p-8">Loading bookings...</main>;
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <p className="font-semibold uppercase tracking-widest text-amber-600">
            Accounts
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Guest Invoice
          </h1>
          <p className="mt-2 text-slate-500">
            Room bill, additional charges aur payment balance calculate karein.
          </p>
        </div>

        <section className="mb-6 rounded-2xl border bg-white p-5 shadow-sm">
          <label className="mb-2 block font-semibold text-slate-700">
            Select Booking
          </label>

          <select
            value={selectedId}
            onChange={(e) => {
              setSelectedId(e.target.value);
              setSaved(false);
            }}
            className="w-full rounded-xl border p-3"
          >
            <option value="">Choose guest booking</option>
            {bookings.map((item) => (
              <option key={item.id} value={item.id}>
                {item.guest} — Room {item.room} — {item.checkIn}
              </option>
            ))}
          </select>
        </section>

        {booking && (
          <>
            <section className="mb-6 grid gap-4 rounded-2xl border bg-white p-5 sm:grid-cols-2">
              <div>
                <p className="text-sm text-slate-500">Guest Name</p>
                <p className="font-bold">{booking.guest}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Phone</p>
                <p className="font-bold">{booking.phone}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Room</p>
                <p className="font-bold">{booking.room}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Stay Duration</p>
                <p className="font-bold">{nights} night(s)</p>
              </div>
            </section>

            <section
              id="guest-invoice"
              className="rounded-2xl border bg-white p-5 shadow-sm md:p-8"
            >
              <div className="mb-8 flex flex-wrap items-start justify-between gap-4 border-b pb-6">
                <div>
                  <h2 className="text-2xl font-bold">Celebrations Hotel</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Guest Final Invoice
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold">INV-{booking.id}</p>
                  <p className="text-sm text-slate-500">
                    {new Date().toLocaleDateString("en-IN")}
                  </p>
                </div>
              </div>

              <div className="mb-6 grid gap-4 sm:grid-cols-2">
                <Field
                  label="Extra Charges (₹)"
                  value={extraCharges}
                  onChange={(v) => {
                    setExtraCharges(v);
                    setSaved(false);
                  }}
                />
                <Field
                  label="Extra Charges Description"
                  value={description}
                  onChange={(v) => {
                    setDescription(v);
                    setSaved(false);
                  }}
                  text
                />
                <Field
                  label="Discount (₹)"
                  value={discount}
                  onChange={(v) => {
                    setDiscount(v);
                    setSaved(false);
                  }}
                />
                <Field
                  label="Tax (%)"
                  value={taxRate}
                  onChange={(v) => {
                    setTaxRate(v);
                    setSaved(false);
                  }}
                />
                <Field
                  label="Amount Paid (₹)"
                  value={paid}
                  onChange={(v) => {
                    setPaid(v);
                    setSaved(false);
                  }}
                />
              </div>

              <div className="space-y-4 border-t pt-5">
                <BillRow
                  label={`Room Charges (${nights} × ${money(roomPrice)})`}
                  amount={roomTotal}
                />
                <BillRow label={description || "Extra Charges"} amount={extras} />
                <BillRow label="Discount" amount={-discountAmount} />
                <BillRow label={`Tax (${Math.min(100, Math.max(0, Number(taxRate) || 0))}%)`} amount={tax} />

                <div className="flex justify-between border-t pt-4 text-xl font-bold">
                  <span>Grand Total</span>
                  <span>{money(total)}</span>
                </div>

                <BillRow label="Amount Paid" amount={-paidAmount} />

                <div className="flex justify-between rounded-xl bg-amber-50 p-4 text-lg font-bold text-amber-900">
                  <span>Balance Due</span>
                  <span>{money(balance)}</span>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap gap-3 print:hidden">
                <button
                  onClick={saveInvoice}
                  className="rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700"
                >
                  Save Invoice
                </button>

                <button
                  onClick={() => window.print()}
                  className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-700"
                >
                  Print Invoice
                </button>
              </div>

              {saved && (
                <p className="mt-4 text-sm font-semibold text-emerald-700 print:hidden">
                  Invoice saved successfully.
                </p>
              )}
            </section>
          </>
        )}

        {!booking && (
          <div className="rounded-2xl border border-dashed bg-white p-12 text-center text-slate-500">
            Invoice banane ke liye booking select karein.
          </div>
        )}
      </div>

      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }
          body * {
            visibility: hidden;
          }
          #guest-invoice,
          #guest-invoice * {
            visibility: visible;
          }
          #guest-invoice {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none;
            box-shadow: none;
          }
        }
      `}</style>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  text = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  text?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </span>
      <input
        type={text ? "text" : "number"}
        min={text ? undefined : 0}
        max={label === "Tax (%)" ? 100 : undefined}
        step="any"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-amber-500"
      />
    </label>
  );
}

function BillRow({
  label,
  amount,
}: {
  label: string;
  amount: number;
}) {
  return (
    <div className="flex justify-between gap-4 text-sm text-slate-600">
      <span>{label}</span>
      <span className="font-semibold text-slate-900">
        {new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
          maximumFractionDigits: 2,
        }).format(amount)}
      </span>
    </div>
  );
}
