"use client";

import { useRef, useState } from "react";

const STORAGE_KEYS = [
  "celebrations-hotel-bookings",
  "celebrations-hotel-rooms",
  "celebrations-hotel-guests",
  "celebrations-hotel-pos-orders",
  "celebrations-hotel-inventory",
  "celebrations-hotel-events",
  "celebrations-hotel-staff",
  "celebrations-hotel-notifications",
  "celebrations-hotel-settings",
  "celebrations-hotel-payments",
  "celebrations-hotel-housekeeping",
  "celebrations-hotel-work-orders",
];

type BackupData = {
  app: string;
  version: number;
  createdAt: string;
  data: Record<string, unknown>;
};

export default function BackupPage() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [backupDate, setBackupDate] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const createBackup = () => {
    setMessage("");
    setError("");

    try {
      const data: Record<string, unknown> = {};

      STORAGE_KEYS.forEach((key) => {
        const value = localStorage.getItem(key);

        if (value !== null) {
          data[key] = JSON.parse(value);
        }
      });

      const backup: BackupData = {
        app: "Celebrations Hotel Management",
        version: 1,
        createdAt: new Date().toISOString(),
        data,
      };

      const blob = new Blob(
        [JSON.stringify(backup, null, 2)],
        { type: "application/json" }
      );

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `celebrations-backup-${new Date()
        .toISOString()
        .slice(0, 10)}.json`;

      link.click();
      URL.revokeObjectURL(url);

      setBackupDate(new Date().toLocaleString("en-IN"));
      setMessage("Backup successfully download ho gaya!");
    } catch {
      setError("Backup create nahi hua. Browser storage check karo.");
    }
  };

  const restoreBackup = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setMessage("");
    setError("");

    try {
      const text = await file.text();
      const backup = JSON.parse(text) as BackupData;

      if (
        backup.app !== "Celebrations Hotel Management" ||
        backup.version !== 1 ||
        !backup.data ||
        typeof backup.data !== "object" ||
        Array.isArray(backup.data)
      ) {
        throw new Error("Invalid backup format.");
      }

      const validEntries = Object.entries(backup.data);

      if (
        validEntries.some(
          ([key]) => !STORAGE_KEYS.includes(key)
        )
      ) {
        throw new Error("Backup mein unknown data keys hain.");
      }

      validEntries.forEach(([key, value]) => {
        JSON.stringify(value);
        if (value === undefined) {
          throw new Error("Invalid backup data.");
        }
      });

      const confirmed = window.confirm(
        "Restore karne se selected modules ka current data replace ho jayega. Pehle current backup download karna recommended hai. Continue?"
      );

      if (!confirmed) return;

      // Save current data so a failed restore can be rolled back.
      const previous = new Map<string, string | null>();

      validEntries.forEach(([key]) => {
        previous.set(key, localStorage.getItem(key));
      });

      try {
        validEntries.forEach(([key, value]) => {
          localStorage.setItem(key, JSON.stringify(value));
        });
      } catch (restoreError) {
        previous.forEach((value, key) => {
          if (value === null) localStorage.removeItem(key);
          else localStorage.setItem(key, value);
        });

        throw restoreError;
      }

      setBackupDate(
        backup.createdAt
          ? new Date(backup.createdAt).toLocaleString("en-IN")
          : "Unknown"
      );

      setMessage(
        "Restore complete! Data dekhne ke liye page refresh karo."
      );
    } catch {
      setError(
        "Backup file invalid hai ya restore fail hua. Valid JSON backup select karo."
      );
    } finally {
      event.target.value = "";
    }
  };

  const clearData = () => {
    const confirmed = window.confirm(
      "WARNING: Is browser ke hotel module ka data permanently delete ho jayega. Pehle backup download kar lo. Kya sure ho?"
    );

    if (!confirmed) return;

    const secondConfirm = window.confirm(
      "Final confirmation: Kya waqai saara listed hotel data delete karna hai?"
    );

    if (!secondConfirm) return;

    STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));

    setMessage("Listed module data clear ho gaya. Page refresh karo.");
    setError("");
  };

  const card =
    "rounded-2xl border border-gray-200 bg-white p-6 shadow-sm";

  const button =
    "rounded-xl px-5 py-3 text-sm font-bold transition hover:opacity-90";

  return (
    <main className="min-h-screen bg-gray-50 p-4 text-gray-900 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">

        <header>
          <p className="text-sm font-bold uppercase tracking-widest text-amber-600">
            System Administration
          </p>

          <h1 className="mt-2 text-3xl font-black md:text-4xl">
            💾 Backup & Restore
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Hotel data ka backup download karo aur zarurat par restore karo.
          </p>
        </header>

        {message && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-800">
            ✅ {message}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
            ❌ {error}
          </div>
        )}

        <section className="grid gap-5 md:grid-cols-2">

          <div className={card}>
            <div className="text-4xl">📥</div>

            <h2 className="mt-4 text-xl font-extrabold">
              Create Backup
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              Bookings, rooms, guests, POS orders, inventory,
              events, staff, payments aur supported modules ka
              JSON backup download karo.
            </p>

            <button
              onClick={createBackup}
              className={`${button} mt-5 bg-gray-900 text-white`}
            >
              Download Backup
            </button>

            {backupDate && (
              <p className="mt-3 text-xs text-gray-500">
                Last operation: {backupDate}
              </p>
            )}
          </div>

          <div className={card}>
            <div className="text-4xl">📤</div>

            <h2 className="mt-4 text-xl font-extrabold">
              Restore Backup
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              Pehle download ki hui JSON backup file select
              karo. Restore listed modules ka existing data
              replace kar sakta hai.
            </p>

            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              onChange={restoreBackup}
              className="mt-5 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-amber-100 file:px-4 file:py-2 file:font-bold file:text-amber-900"
            />
          </div>
        </section>

        <section className={card}>
          <h2 className="text-xl font-extrabold">
            📋 Included Modules
          </h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              "Bookings",
              "Rooms",
              "Guests",
              "POS Orders",
              "Inventory",
              "Events",
              "Staff",
              "Notifications",
              "Settings",
              "Payments",
              "Housekeeping",
              "Maintenance",
            ].map((name) => (
              <div
                key={name}
                className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-sm font-semibold"
              >
                ✅ {name}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <h2 className="text-lg font-extrabold text-red-800">
            ⚠️ Danger Zone
          </h2>

          <p className="mt-2 text-sm leading-6 text-red-700">
            Ye option listed modules ka localStorage data delete
            karta hai. Action irreversible ho sakta hai agar backup
            nahi hai.
          </p>

          <button
            onClick={clearData}
            className={`${button} mt-4 bg-red-600 text-white`}
          >
            Clear All Module Data
          </button>
        </section>

        <p className="text-xs leading-5 text-gray-400">
          Important: Ye backup sirf isi browser ke listed localStorage
          keys ka hai. Ye server database, doosre devices ya unlisted
          keys ka backup nahi hai. Restore se pehle current backup
          download karna recommended hai.
        </p>

      </div>
    </main>
  );
}