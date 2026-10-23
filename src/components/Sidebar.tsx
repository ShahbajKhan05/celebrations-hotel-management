"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { label: "Dashboard", path: "/", icon: "▦" },
  { label: "Rooms", path: "/rooms", icon: "⌂" },
  { label: "Bookings", path: "/bookings", icon: "▤" },
  { label: "Guests", path: "/guests", icon: "♙" },
  { label: "Restaurant POS", path: "/pos", icon: "♨" },
  { label: "Inventory", path: "/inventory", icon: "▣" },
  { label: "Events & Banquets", path: "/events", icon: "✧" },
  { label: "Staff", path: "/staff", icon: "♧" },
  { label: "Reports", path: "/reports", icon: "▥" },
  { label: "Notifications", path: "/notifications", icon: "♢" },
  { label: "Settings", path: "/settings", icon: "⚙" },
];

type SidebarProps = {
  mobileOpen: boolean;
  onClose: () => void;
};

export default function Sidebar({
  mobileOpen,
  onClose,
}: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/40 md:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-slate-200 bg-white px-4 py-5 transition-transform duration-200 md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-8 flex items-center gap-3 px-1">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-indigo-600 text-2xl font-bold text-white shadow-lg shadow-indigo-200">
            C
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-extrabold tracking-wide text-slate-900">
              CELEBRATIONS
            </p>
            <p className="mt-1 text-[10px] tracking-[2px] text-slate-500">
              HOTEL & RESORT
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="rounded-lg px-2 py-1 text-2xl text-slate-500 hover:bg-slate-100 md:hidden"
          >
            ×
          </button>
        </div>

        <p className="mb-3 px-3 text-[10px] font-bold tracking-[1.5px] text-slate-400">
          PROPERTY MANAGEMENT
        </p>

        <nav className="flex-1 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const active =
              item.path === "/"
                ? pathname === "/"
                : pathname === item.path ||
                  pathname.startsWith(`${item.path}/`);

            return (
              <Link
                href={item.path}
                key={item.path}
                onClick={onClose}
                className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                  active
                    ? "bg-indigo-50 font-semibold text-indigo-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                }`}
              >
                <span className="grid w-6 shrink-0 place-items-center text-lg">
                  {item.icon}
                </span>

                <span className="min-w-0 flex-1">{item.label}</span>

                {item.path === "/notifications" && (
                  <span className="h-2 w-2 rounded-full bg-orange-500" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-5 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4">
          <div className="mb-3 grid h-9 w-9 place-items-center rounded-xl bg-white text-lg text-indigo-600">
            ✦
          </div>
          <p className="text-sm font-bold text-slate-800">
            Need assistance?
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Manage your property with confidence.
          </p>
          <button
            type="button"
            onClick={() =>
              window.alert("Demo support: Contact your system administrator.")
            }
            className="mt-3 text-xs font-bold text-indigo-700 hover:text-indigo-900"
          >
            Contact Support →
          </button>
        </div>

        <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-4">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
            AD
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-800">
              Admin User
            </p>
            <p className="mt-1 truncate text-[11px] text-slate-500">
              Property Administrator
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}