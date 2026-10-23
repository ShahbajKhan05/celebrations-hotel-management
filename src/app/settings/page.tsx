"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";

type PropertySettings = {
  propertyName: string;
  propertyType: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  phone: string;
  email: string;
  currency: string;
  taxRate: string;
  checkInTime: string;
  checkOutTime: string;
  bookingPrefix: string;
};

const STORAGE_KEY = "celebrations-hotel-settings";

const defaultSettings: PropertySettings = {
  propertyName: "Celebrations Hotel & Resort",
  propertyType: "Hotel & Resort",
  address: "",
  city: "Rewa",
  state: "Madhya Pradesh",
  country: "India",
  pincode: "",
  phone: "",
  email: "",
  currency: "INR",
  taxRate: "5",
  checkInTime: "12:00",
  checkOutTime: "11:00",
  bookingPrefix: "BK",
};

const inputClass =
  "mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

const labelClass = "text-sm font-medium text-gray-700";

const tabs = [
  { name: "Property", icon: "🏨" },
  { name: "Contact", icon: "📞" },
  { name: "Operations", icon: "⚙️" },
  { name: "System", icon: "🖥️" },
] as const;

function readSettings(value: unknown): PropertySettings | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const data = value as Record<string, unknown>;
  const result = { ...defaultSettings };

  for (const key of Object.keys(defaultSettings) as (keyof PropertySettings)[]) {
    const field = data[key];

    if (typeof field === "string") {
      result[key] = field;
    }
  }

  if (
    !result.propertyName.trim() ||
    !["INR", "USD", "EUR", "GBP"].includes(result.currency)
  ) {
    return null;
  }

  const tax = Number(result.taxRate);

  if (!Number.isFinite(tax) || tax < 0 || tax > 100) {
    return null;
  }

  return result;
}

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

export default function SettingsPage() {
  const [settings, setSettings] =
    useState<PropertySettings>(defaultSettings);
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] =
    useState<(typeof tabs)[number]["name"]>("Property");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);

      if (stored) {
        const parsed: unknown = JSON.parse(stored);

        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          setSettings({
            ...defaultSettings,
            ...(parsed as Partial<PropertySettings>),
          });
        }
      }
    } catch {
      setMessage("Saved settings read nahi ho sakin. Default values use ho rahi hain.");
      setMessageType("error");
    }

    setLoaded(true);
  }, []);

  const updateField = (field: keyof PropertySettings, value: string) => {
    setSettings((current) => ({ ...current, [field]: value }));
    setSaved(false);
    setMessage("");
  };

  const showMessage = (
    text: string,
    type: "success" | "error" = "success",
  ) => {
    setMessage(text);
    setMessageType(type);
  };

  const saveSettings = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!settings.propertyName.trim()) {
      setActiveTab("Property");
      showMessage("Property name required hai.", "error");
      return;
    }

    const tax = Number(settings.taxRate);

    if (settings.taxRate.trim() === "" || !Number.isFinite(tax) || tax < 0 || tax > 100) {
      setActiveTab("Operations");
      showMessage("Tax rate 0 se 100 ke beech honi chahiye.", "error");
      return;
    }

    if (settings.email.trim()) {
      const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        settings.email.trim(),
      );

      if (!emailValid) {
        setActiveTab("Contact");
        showMessage("Valid email address enter karein.", "error");
        return;
      }
    }

    if (settings.pincode.trim() && !/^[a-zA-Z0-9 -]{3,10}$/.test(settings.pincode.trim())) {
      setActiveTab("Property");
      showMessage("PIN code format check karein.", "error");
      return;
    }

    if (!/^[a-zA-Z0-9_-]{1,8}$/.test(settings.bookingPrefix.trim())) {
      setActiveTab("Operations");
      showMessage("Booking prefix mein sirf letters, numbers, _ aur - use karein (max 8).", "error");
      return;
    }

    try {
      const normalized: PropertySettings = {
        ...settings,
        propertyName: settings.propertyName.trim(),
        address: settings.address.trim(),
        city: settings.city.trim(),
        state: settings.state.trim(),
        country: settings.country.trim(),
        pincode: settings.pincode.trim(),
        phone: settings.phone.trim(),
        email: settings.email.trim(),
        taxRate: String(tax),
        bookingPrefix: settings.bookingPrefix.trim().toUpperCase(),
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      setSettings(normalized);
      setSaved(true);
      showMessage("Settings successfully save ho gayi hain.");
    } catch {
      showMessage("Settings save nahi hui. Browser storage check karein.", "error");
    }
  };

  const resetSettings = () => {
    const confirmed = window.confirm(
      "Property settings ko default values par reset karna hai? Ye action undo nahi hoga.",
    );

    if (!confirmed) return;

    try {
      localStorage.removeItem(STORAGE_KEY);
      setSettings({ ...defaultSettings });
      setSaved(false);
      showMessage("Settings default values par reset ho gayi hain.");
    } catch {
      showMessage("Settings reset nahi ho sakin.", "error");
    }
  };

  const exportSettings = () => {
    const payload = {
      app: "Celebrations Hotel & Resort Management System",
      version: 1,
      exportedAt: new Date().toISOString(),
      settings,
    };

    downloadFile(
      "celebrations-hotel-settings-backup.json",
      JSON.stringify(payload, null, 2),
      "application/json",
    );

    showMessage("Settings backup JSON file download ho gayi.");
  };

  const importSettings = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      const text = await file.text();
      const parsed: unknown = JSON.parse(text);

      let candidate: unknown = parsed;

      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const object = parsed as Record<string, unknown>;
        if ("settings" in object) candidate = object.settings;
      }

      const imported = readSettings(candidate);

      if (!imported) {
        showMessage(
          "Backup file valid nahi hai. Sahi settings JSON file select karein.",
          "error",
        );
        return;
      }

      const confirmed = window.confirm(
        "Imported settings current form ki values replace karengi. Continue karein?",
      );

      if (!confirmed) return;

      setSettings(imported);
      setSaved(false);
      showMessage("Backup load ho gaya. Changes apply karne ke liye Save Settings dabayein.");
    } catch {
      showMessage("File read nahi hui. Valid JSON backup select karein.", "error");
    } finally {
      event.target.value = "";
    }
  };

  const exportSettingsCsv = () => {
    const rows: [string, string][] = [
      ["Property Name", settings.propertyName],
      ["Property Type", settings.propertyType],
      ["Address", settings.address],
      ["City", settings.city],
      ["State", settings.state],
      ["Country", settings.country],
      ["PIN Code", settings.pincode],
      ["Phone", settings.phone],
      ["Email", settings.email],
      ["Currency", settings.currency],
      ["Tax Rate (%)", settings.taxRate],
      ["Check-in Time", settings.checkInTime],
      ["Check-out Time", settings.checkOutTime],
      ["Booking Prefix", settings.bookingPrefix],
    ];

    const csv = [
      "Setting,Value",
      ...rows.map(([key, value]) =>
        [key, value].map((item) => `"${item.replace(/"/g, '""')}"`).join(","),
      ),
    ].join("\n");

    downloadFile("celebrations-hotel-settings.csv", csv, "text/csv;charset=utf-8;");
    showMessage("Settings CSV export ho gayi.");
  };

  if (!loaded) {
    return (
      <div className="p-6 text-sm text-gray-500">
        Loading settings...
      </div>
    );
  }

  return (
    <main className="min-h-screen space-y-6 bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Property Settings
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Hotel profile, contact details aur operational configuration manage karein.
          </p>
        </div>

        <span className="w-fit rounded-full bg-blue-100 px-4 py-2 text-xs font-semibold text-blue-700">
          ⚙️ SYSTEM CONFIGURATION
        </span>
      </div>

      {message && (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-xl border p-4 text-sm font-medium ${
            messageType === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {message}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-blue-700 to-indigo-700 p-6 text-white sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-3xl">
              🏨
            </div>

            <div className="min-w-0">
              <h2 className="break-words text-xl font-bold">
                {settings.propertyName || "Your Property"}
              </h2>
              <p className="mt-1 text-sm text-blue-100">
                {[settings.city, settings.state, settings.country]
                  .filter(Boolean)
                  .join(", ") || "Property location not set"}
              </p>
              <span className="mt-3 inline-block rounded-full bg-white/15 px-3 py-1 text-xs">
                {settings.propertyType}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto border-b border-gray-100 p-3 sm:p-4">
          {tabs.map((tab) => (
            <button
              key={tab.name}
              type="button"
              onClick={() => setActiveTab(tab.name)}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition ${
                activeTab === tab.name
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <span>{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </div>

        <form onSubmit={saveSettings} className="p-5 sm:p-8">
          {activeTab === "Property" && (
            <section>
              <h3 className="text-lg font-bold text-gray-900">
                Property Information
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Hotel ka naam aur complete address update karein.
              </p>

              <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
                <label className={labelClass}>
                  Property Name *
                  <input
                    required
                    value={settings.propertyName}
                    onChange={(e) => updateField("propertyName", e.target.value)}
                    className={inputClass}
                    placeholder="Hotel name"
                  />
                </label>

                <label className={labelClass}>
                  Property Type
                  <select
                    value={settings.propertyType}
                    onChange={(e) => updateField("propertyType", e.target.value)}
                    className={inputClass}
                  >
                    <option>Hotel & Resort</option>
                    <option>Hotel</option>
                    <option>Resort</option>
                    <option>Guest House</option>
                    <option>Banquet & Events Venue</option>
                  </select>
                </label>

                <label className={`${labelClass} md:col-span-2`}>
                  Street Address
                  <input
                    value={settings.address}
                    onChange={(e) => updateField("address", e.target.value)}
                    className={inputClass}
                    placeholder="Building, street, area"
                  />
                </label>

                <label className={labelClass}>
                  City
                  <input
                    value={settings.city}
                    onChange={(e) => updateField("city", e.target.value)}
                    className={inputClass}
                  />
                </label>

                <label className={labelClass}>
                  State
                  <input
                    value={settings.state}
                    onChange={(e) => updateField("state", e.target.value)}
                    className={inputClass}
                  />
                </label>

                <label className={labelClass}>
                  Country
                  <input
                    value={settings.country}
                    onChange={(e) => updateField("country", e.target.value)}
                    className={inputClass}
                  />
                </label>

                <label className={labelClass}>
                  PIN Code
                  <input
                    value={settings.pincode}
                    onChange={(e) => updateField("pincode", e.target.value)}
                    className={inputClass}
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="Postal / PIN code"
                  />
                </label>
              </div>
            </section>
          )}

          {activeTab === "Contact" && (
            <section>
              <h3 className="text-lg font-bold text-gray-900">
                Contact Information
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Guest enquiries aur hotel contact details.
              </p>

              <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
                <label className={labelClass}>
                  Contact Phone
                  <input
                    type="tel"
                    value={settings.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    className={inputClass}
                    placeholder="+91 XXXXX XXXXX"
                  />
                </label>

                <label className={labelClass}>
                  Contact Email
                  <input
                    type="email"
                    value={settings.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    className={inputClass}
                    placeholder="hotel@example.com"
                  />
                </label>
              </div>
            </section>
          )}

          {activeTab === "Operations" && (
            <section>
              <h3 className="text-lg font-bold text-gray-900">
                Operational Settings
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Default check-in, check-out aur tax configuration.
              </p>

              <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
                <label className={labelClass}>
                  Default Check-in Time
                  <input
                    type="time"
                    value={settings.checkInTime}
                    onChange={(e) => updateField("checkInTime", e.target.value)}
                    className={inputClass}
                  />
                </label>

                <label className={labelClass}>
                  Default Check-out Time
                  <input
                    type="time"
                    value={settings.checkOutTime}
                    onChange={(e) => updateField("checkOutTime", e.target.value)}
                    className={inputClass}
                  />
                </label>

                <label className={labelClass}>
                  Default Tax Rate (%)
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={settings.taxRate}
                    onChange={(e) => updateField("taxRate", e.target.value)}
                    className={inputClass}
                  />
                  <span className="mt-2 block text-xs font-normal text-gray-500">
                    Save hone ke baad bhi POS tax tabhi change hoga jab POS module ko settings se connect kiya jayega.
                  </span>
                </label>

                <label className={labelClass}>
                  Booking ID Prefix
                  <input
                    value={settings.bookingPrefix}
                    onChange={(e) => updateField("bookingPrefix", e.target.value)}
                    maxLength={8}
                    className={inputClass}
                    placeholder="BK"
                  />
                  <span className="mt-2 block text-xs font-normal text-gray-500">
                    Existing booking IDs automatically change nahi honge.
                  </span>
                </label>
              </div>
            </section>
          )}

          {activeTab === "System" && (
            <section>
              <h3 className="text-lg font-bold text-gray-900">
                System Preferences
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Currency, settings backup aur local configuration manage karein.
              </p>

              <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
                <label className={labelClass}>
                  Currency
                  <select
                    value={settings.currency}
                    onChange={(e) => updateField("currency", e.target.value)}
                    className={inputClass}
                  >
                    <option value="INR">INR — Indian Rupee (₹)</option>
                    <option value="USD">USD — US Dollar ($)</option>
                    <option value="EUR">EUR — Euro (€)</option>
                    <option value="GBP">GBP — British Pound (£)</option>
                  </select>
                </label>

                <div className="rounded-xl bg-blue-50 p-4 text-sm leading-6 text-blue-800">
                  <strong>Storage:</strong> Settings isi browser ke localStorage mein save hoti hain. Abhi cloud database ya multi-user sync connected nahi hai.
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-gray-200 p-5">
                <h4 className="font-semibold text-gray-900">
                  📦 Backup & Restore
                </h4>
                <p className="mt-1 text-sm text-gray-500">
                  Settings ko JSON backup ke roop mein download karein, ya pehle se saved backup import karein.
                </p>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={exportSettings}
                    className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    ⬇ Export JSON
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    ⬆ Import JSON
                  </button>

                  <button
                    type="button"
                    onClick={exportSettingsCsv}
                    className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    📄 Export CSV
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    onChange={importSettings}
                    className="hidden"
                  />
                </div>

                <p className="mt-3 text-xs text-gray-500">
                  Import ki gayi settings ko permanently save karne ke liye Save Settings dabana zaroori hai.
                </p>
              </div>

              <div className="mt-6 rounded-xl border border-red-200 p-5">
                <h4 className="font-semibold text-red-700">
                  Reset Property Settings
                </h4>
                <p className="mt-1 text-sm text-gray-500">
                  Sirf property settings ko default values par restore karein. Bookings, rooms, staff aur doosre module records delete nahi honge.
                </p>

                <button
                  type="button"
                  onClick={resetSettings}
                  className="mt-4 rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  Reset Settings
                </button>
              </div>
            </section>
          )}

          <div className="mt-8 flex flex-col gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div aria-live="polite">
              {saved && (
                <p className="text-sm font-medium text-emerald-600">
                  ✓ Settings successfully saved.
                </p>
              )}
              {!saved && (
                <p className="text-xs text-gray-500">
                  Changes ko apply karne ke liye Save Settings dabayein.
                </p>
              )}
            </div>

            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              💾 Save Settings
            </button>
          </div>
        </form>
      </section>

      <p className="text-xs leading-5 text-gray-500">
        Note: Currency, tax rate, check-in/check-out aur booking prefix abhi configuration fields hain. Doosre modules mein automatically apply karne ke liye un modules ko bhi settings storage se connect karna hoga.
      </p>
    </main>
  );
}