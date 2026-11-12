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
    title: "Staff salaries",
    description: "Effective-dated basic salary and component lines per staff member.",
    icon: "wallet",
  },
  {
    href: "/dashboard/hr/payroll/salary-structures",
    title: "Salary structures",
    description: "Reusable salary templates by designation, applied to staff.",
    icon: "clipboard",
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
