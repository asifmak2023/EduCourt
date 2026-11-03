"use client";

import { PermissionGate } from "@/components/PermissionGate";
import { ModuleHub, type HubSection } from "@/components/ModuleHub";

const SECTIONS: HubSection[] = [
  {
    href: "/dashboard/hr/staff",
    title: "Staff",
    description: "Staff register with department, designation and profile.",
    icon: "idCard",
  },
  {
    href: "/dashboard/hr/departments",
    title: "Departments",
    description: "Departments and their heads.",
    icon: "building",
  },
  {
    href: "/dashboard/hr/designations",
    title: "Designations",
    description: "Job titles, grades and descriptions.",
    icon: "award",
  },
  {
    href: "/dashboard/hr/reports",
    title: "Reports",
    description: "Headcount and joiner/leaver movements.",
    icon: "chart",
  },
];

export default function HrPage() {
  return (
    <PermissionGate permission="hr.view">
      <ModuleHub
        title="Human resources"
        description="Staff register, organisation structure and reports."
        sections={SECTIONS}
      />
    </PermissionGate>
  );
}
