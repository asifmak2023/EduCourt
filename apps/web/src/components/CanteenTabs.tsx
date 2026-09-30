"use client";

import Link from "next/link";
import { buttonClasses } from "@/components/Form";

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
          className={buttonClasses(tab.key === active ? "primary" : "secondary")}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
