"use client";

import Link from "next/link";

export const CANTEEN_TABS = [
  { key: "overview", href: "/dashboard/canteen", label: "Overview" },
  { key: "items", href: "/dashboard/canteen/items", label: "Menu items" },
  { key: "suppliers", href: "/dashboard/canteen/suppliers", label: "Suppliers" },
  { key: "stock", href: "/dashboard/canteen/stock-entries", label: "Stock" },
  { key: "sales", href: "/dashboard/canteen/sales", label: "Sales" },
  { key: "wallets", href: "/dashboard/canteen/wallets", label: "Wallets" },
  { key: "hygiene", href: "/dashboard/canteen/hygiene", label: "Hygiene" },
  { key: "reports", href: "/dashboard/canteen/reports", label: "Reports" },
];

export function CanteenTabs({ active }: { active: string }) {
  return (
    <nav className="flex flex-wrap gap-2">
      {CANTEEN_TABS.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={
            tab.key === active
              ? "rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white"
              : "rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-slate-400"
          }
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
