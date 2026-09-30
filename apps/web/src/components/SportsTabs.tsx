"use client";

import Link from "next/link";
import { buttonClasses } from "@/components/Form";

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
          className={buttonClasses(tab.key === active ? "primary" : "secondary")}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
