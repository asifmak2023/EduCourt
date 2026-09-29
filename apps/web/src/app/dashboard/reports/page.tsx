"use client";

import Link from "next/link";
import { PermissionGate } from "@/components/PermissionGate";
import { ReportsTabs } from "@/components/ReportsTabs";
import { Card, PageHeader } from "@/components/ui";

const REPORTS = [
  {
    href: "/dashboard/reports/progress",
    title: "Progress",
    description:
      "Student, admission, enrollment and scholarship totals over a period.",
  },
  {
    href: "/dashboard/reports/attendance",
    title: "Attendance",
    description:
      "Present, absent and late totals with a per-class attendance rate.",
  },
  {
    href: "/dashboard/reports/results",
    title: "Results",
    description:
      "Pass rate, grade spread and per-subject averages for a chosen exam.",
  },
  {
    href: "/dashboard/reports/staff",
    title: "Staff",
    description:
      "Headcount by department and type, staff attendance and leave.",
  },
  {
    href: "/dashboard/reports/students",
    title: "Student yearly",
    description:
      "A student's year-by-year attendance, academics and conduct summary.",
  },
  {
    href: "/dashboard/reports/financial",
    title: "Financial",
    description: "Income, expense and surplus from the posted ledger.",
  },
  {
    href: "/dashboard/reports/payroll",
    title: "Payroll",
    description: "Payroll cost by period with gross, deductions and net.",
  },
];

export default function ReportsPage() {
  return (
    <PermissionGate permission="report.view">
      <div className="space-y-6">
        <PageHeader
          title="Reports"
          description="Campus reporting and analytics for the current tenant."
        />
        <ReportsTabs active="overview" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {REPORTS.map((report) => (
            <Link key={report.href} href={report.href}>
              <Card className="h-full p-5 transition hover:border-slate-400">
                <h2 className="text-sm font-semibold text-slate-900">
                  {report.title}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {report.description}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </PermissionGate>
  );
}
