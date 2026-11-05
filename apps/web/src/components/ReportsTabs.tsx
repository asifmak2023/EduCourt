"use client";

import Link from "next/link";
import { buttonClasses } from "@/components/Form";
import { useAuth } from "@/lib/auth";

export const REPORTS_TABS = [
  { key: "overview", href: "/dashboard/reports", label: "Overview", permission: null },
  {
    key: "campus",
    href: "/dashboard/reports/campus",
    label: "Campus",
    permission: "report.campus",
  },
  {
    key: "head-office",
    href: "/dashboard/reports/head-office",
    label: "Head office",
    permission: "report.campus",
  },
  {
    key: "progress",
    href: "/dashboard/reports/progress",
    label: "Progress",
    permission: "report.students",
  },
  {
    key: "attendance",
    href: "/dashboard/reports/attendance",
    label: "Attendance",
    permission: "report.attendance",
  },
  {
    key: "results",
    href: "/dashboard/reports/results",
    label: "Results",
    permission: "report.results",
  },
  {
    key: "staff",
    href: "/dashboard/reports/staff",
    label: "Staff",
    permission: "report.staff",
  },
  {
    key: "students",
    href: "/dashboard/reports/students",
    label: "Student yearly",
    permission: "report.students",
  },
  {
    key: "financial",
    href: "/dashboard/reports/financial",
    label: "Financial",
    permission: "report.finance",
  },
  {
    key: "payroll",
    href: "/dashboard/reports/payroll",
    label: "Payroll",
    permission: "report.payroll",
  },
] as const;

export function ReportsTabs({ active }: { active: string }) {
  const { can } = useAuth();

  return (
    <nav className="flex flex-wrap gap-2">
      {REPORTS_TABS.filter(
        (tab) => tab.permission === null || can(tab.permission)
      ).map((tab) => (
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
