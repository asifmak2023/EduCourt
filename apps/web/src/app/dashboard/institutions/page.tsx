"use client";

import { useAuth } from "@/lib/auth";
import { useList } from "@/lib/useList";
import { PermissionGate } from "@/components/PermissionGate";
import { InstitutionsTabs } from "@/components/InstitutionsTabs";
import { HubGrid, type HubSection } from "@/components/ModuleHub";
import { PageHeader, StatCard } from "@/components/ui";
import type { Campus, Institution } from "@/lib/types";

const INSTITUTIONS_SECTIONS: HubSection[] = [
  {
    href: "/dashboard/institutions/list",
    title: "Institutions",
    description: "Groupings and their guardrail settings.",
    icon: "building",
  },
  {
    href: "/dashboard/institutions/campuses",
    title: "Campuses",
    description: "Tenant boundaries and campus profiles.",
    icon: "grid",
  },
  {
    href: "/dashboard/institutions/list/new",
    title: "New institution",
    description: "Create a grouping for a new tenant.",
    icon: "userPlus",
  },
  {
    href: "/dashboard/institutions/campuses/new",
    title: "New campus",
    description: "Add a campus to an institution.",
    icon: "building",
  },
];

export default function InstitutionsPage() {
  return (
    <PermissionGate permission="institution.view">
      <InstitutionsHome />
    </PermissionGate>
  );
}

function InstitutionsHome() {
  const { can } = useAuth();
  const sections = INSTITUTIONS_SECTIONS.filter((section) => {
    if (section.href.endsWith("/list/new")) {
      return can("institution.create");
    }
    if (section.href.endsWith("/campuses/new")) {
      return can("campus.create");
    }
    return true;
  });
  const { meta: institutionMeta } = useList<Institution>("/v1/institutions", {
    per_page: 1,
  });
  const { meta: campusMeta } = useList<Campus>("/v1/campuses", {
    per_page: 1,
  });

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        title="Institutions and campuses"
        description="Groupings and tenant boundaries across the platform."
      />

      <InstitutionsTabs active="overview" />

      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard
          label="Institutions"
          value={institutionMeta?.total ?? 0}
          hint="Grouping / guardrail level"
        />
        <StatCard
          label="Campuses"
          value={campusMeta?.total ?? 0}
          hint="Tenant boundaries"
        />
      </div>

      <HubGrid sections={sections} />
    </div>
  );
}
