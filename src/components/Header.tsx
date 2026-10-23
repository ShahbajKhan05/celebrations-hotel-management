"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/rooms": "Rooms",
  "/bookings": "Bookings",
  "/guests": "Guests",
  "/pos": "Restaurant POS",
  "/inventory": "Inventory",
  "/events": "Events & Banquets",
  "/staff": "Staff Management",
  "/reports": "Reports & Analytics",
  "/notifications": "Notifications",
  "/settings": "Settings",
};

type HeaderProps = {
  onMenuClick: () => void;
};

export default function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [search, setSearch] = useState("");

  const title =
    pageTitles[pathname] ||
    Object.entries(pageTitles).find(
      ([path]) => path !== "/" && pathname.startsWith(`${path}/`)
    )?.[1] ||
    "Celebrations";

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const query = search.trim();
    if (!query) return;

    router.push(`/bookings?search=${encodeURIComponent(query)}`);
  }

  return (
    <header className="sticky top-0 z-30 flex min-h-[76px] items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 text-lg text-slate-700 hover:bg-slate-50 md:hidden"
        >
          ☰
        </button>

        <div className="min-w-0">
          <p className="mb-1 truncate text-[11px] text-slate-400">
            Property / {title}
          </p>
          <h1 className="truncate text-lg font-bold text-slate-900 sm:text-xl">
            {title}
          </h1>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <form
          onSubmit={handleSearch}
          className="hidden h-10 w-44 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 sm:flex lg:w-64"
        >
          <span className="text-lg text-slate-400">⌕</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search bookings..."
            aria-label="Search bookings"
            className="min-w-0 flex-1 bg-transparent text-xs text-slate-800 outline-none placeholder:text-slate-400"
          />
          <button
            type="submit"
            aria-label="Submit search"
            className="text-xs text-slate-400 hover:text-indigo-600"
          >
            ↵
          </button>
        </form>

        <Link
          href="/notifications"
          aria-label="Notifications"
          className="relative grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-lg text-slate-600 hover:bg-slate-50"
        >
          ♧
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full border border-white bg-orange-500" />
        </Link>

        <div
          className="grid h-10 w-10 place-items-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700"
          title="Admin User"
        >
          AD
        </div>
      </div>
    </header>
  );
}