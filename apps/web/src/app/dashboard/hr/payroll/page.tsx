"use client";

import { PermissionGate } from "@/components/PermissionGate";
import { ModuleHub, type HubSection } from "@/components/ModuleHub";

const SECTIONS: HubSection[] = [
  {
    href: "/dashboard/hr/payroll/runs",
    title: "Payroll runs",
    description: "Generate, approve and pay monthly payroll.",
    icon: "banknote",
  },
  {
    href: "/dashboard/hr/payroll/salaries",
    title: "Salary structures",
    description: "Basic salary and component lines per staff member.",
    icon: "wallet",
  },
  {
    href: "/dashboard/hr/payroll/components",
    title: "Salary components",
    description: "Earnings and deductions used to build salaries.",
    icon: "list",
  },
  {
    href: "/dashboard/hr/payroll/adjustments",
    title: "Adjustments",
    description: "Incentives, rewards, overtime and deductions by period.",
    icon: "receipt",
  },
];

export default function PayrollPage() {
  return (
    <PermissionGate permission="payroll.view">
      <ModuleHub
        title="Payroll"
        description="Salary structures, components and monthly runs."
        sections={SECTIONS}
      />
    </PermissionGate>
  );
}
