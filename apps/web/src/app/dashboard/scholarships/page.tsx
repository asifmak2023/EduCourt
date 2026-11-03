"use client";

import { PermissionGate } from "@/components/PermissionGate";
import { ModuleHub, type HubSection } from "@/components/ModuleHub";

const SECTIONS: HubSection[] = [
  {
    href: "/dashboard/scholarships/schemes",
    title: "Scholarships",
    description: "Define merit, need-based and sponsored fee concessions.",
    icon: "award",
  },
  {
    href: "/dashboard/scholarships/awards",
    title: "Awards",
    description: "Assign scholarships to students and revoke when needed.",
    icon: "heart",
  },
];

export default function ScholarshipsPage() {
  return (
    <PermissionGate permission="scholarship.view">
      <ModuleHub
        title="Scholarships"
        description="Fee concessions and the students who hold them."
        sections={SECTIONS}
      />
    </PermissionGate>
  );
}
