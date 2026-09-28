"use client";

import Link from "next/link";

export const SPORTS_TABS = [
  { key: "overview", href: "/dashboard/sports", label: "Overview" },
  { key: "catalog", href: "/dashboard/sports/catalog", label: "Sports" },
  { key: "teams", href: "/dashboard/sports/teams", label: "Teams" },
  { key: "training", href: "/dashboard/sports/training", label: "Training" },
  { key: "fixtures", href: "/dashboard/sports/fixtures", label: "Fixtures" },
  {
    key: "achievements",
    href: "/dashboard/sports/achievements",
    label: "Achievements",
  },
  { key: "equipment", href: "/dashboard/sports/equipment", label: "Equipment" },
  { key: "reports", href: "/dashboard/sports/reports", label: "Reports" },
];

export function SportsTabs({ active }: { active: string }) {
  return (
    <nav className="flex flex-wrap gap-2">
      {SPORTS_TABS.map((tab) => (
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
