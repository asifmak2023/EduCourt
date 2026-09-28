"use client";

import Link from "next/link";
import { PermissionGate } from "@/components/PermissionGate";
import { Card, PageHeader } from "@/components/ui";

const SECTIONS = [
  {
    href: "/dashboard/hr/payroll/runs",
    title: "Payroll runs",
    description: "Generate, approve and pay monthly payroll.",
  },
  {
    href: "/dashboard/hr/payroll/salaries",
    title: "Salary structures",
    description: "Basic salary and component lines per staff member.",
  },
  {
    href: "/dashboard/hr/payroll/components",
    title: "Salary components",
    description: "Earnings and deductions used to build salaries.",
  },
  {
    href: "/dashboard/hr/payroll/adjustments",
    title: "Adjustments",
    description: "Incentives, rewards, overtime and deductions by period.",
  },
];

export default function PayrollPage() {
  return (
    <PermissionGate permission="payroll.view">
      <div className="space-y-6">
        <PageHeader
          title="Payroll"
          description="Salary structures, components and monthly runs."
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SECTIONS.map((section) => (
            <Link key={section.href} href={section.href}>
              <Card className="h-full p-5 transition hover:border-slate-400">
                <p className="text-sm font-semibold text-slate-900">
                  {section.title}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {section.description}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </PermissionGate>
  );
}
