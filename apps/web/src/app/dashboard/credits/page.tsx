"use client";

import { PermissionGate } from "@/components/PermissionGate";
import { ModuleHub, type HubSection } from "@/components/ModuleHub";

const SECTIONS: HubSection[] = [
  {
    href: "/dashboard/credits/registrations",
    title: "Course registrations",
    description: "Register students for term courses and manage drops.",
    icon: "grid",
  },
  {
    href: "/dashboard/credits/term-gpa",
    title: "Term GPA",
    description: "Credit-weighted grade point average for one term.",
    icon: "chart",
  },
  {
    href: "/dashboard/credits/transcript",
    title: "Transcript",
    description: "Cumulative GPA with a per-term breakdown.",
    icon: "award",
  },
];

export default function CreditsPage() {
  return (
    <PermissionGate permission="credit.view">
      <ModuleHub
        title="Credits & GPA"
        description="Credit-hour course registration and GPA for college campuses."
        sections={SECTIONS}
      />
    </PermissionGate>
  );
}
