"use client";

import Link from "next/link";

export const REPORTS_TABS = [
  { key: "overview", href: "/dashboard/reports", label: "Overview" },
  {
    key: "progress",
    href: "/dashboard/reports/progress",
    label: "Progress",
  },
  {
    key: "attendance",
    href: "/dashboard/reports/attendance",
    label: "Attendance",
  },
  { key: "results", href: "/dashboard/reports/results", label: "Results" },
  { key: "staff", href: "/dashboard/reports/staff", label: "Staff" },
  {
    key: "students",
    href: "/dashboard/reports/students",
    label: "Student yearly",
  },
  {
    key: "financial",
    href: "/dashboard/reports/financial",
    label: "Financial",
  },
  { key: "payroll", href: "/dashboard/reports/payroll", label: "Payroll" },
];

export function ReportsTabs({ active }: { active: string }) {
  return (
    <nav className="flex flex-wrap gap-2">
      {REPORTS_TABS.map((tab) => (
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
