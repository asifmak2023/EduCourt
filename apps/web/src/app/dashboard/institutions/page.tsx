"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useList } from "@/lib/useList";
import { PermissionGate } from "@/components/PermissionGate";
import { InstitutionsTabs } from "@/components/InstitutionsTabs";
import { Card, PageHeader, StatCard } from "@/components/ui";
import { buttonClasses } from "@/components/Form";
import type { Campus, Institution } from "@/lib/types";

export default function InstitutionsPage() {
  return (
    <PermissionGate permission="institution.view">
      <InstitutionsHome />
    </PermissionGate>
  );
}

function InstitutionsHome() {
  const { can } = useAuth();
  const { meta: institutionMeta } = useList<Institution>("/v1/institutions", {
    per_page: 1,
  });
  const { meta: campusMeta } = useList<Campus>("/v1/campuses", {
    per_page: 1,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Institutions and campuses"
        description="Groupings and tenant boundaries across the platform."
      />

      <InstitutionsTabs active="overview" />

      <div className="grid gap-4 sm:grid-cols-2">
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

      <Card className="space-y-4 p-5">
        <p className="text-sm text-muted">
          A campus is the tenant boundary for data isolation. Institutions
          group campuses and act as a guardrail for cross-campus roles. Manage
          both from the tabs above.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/institutions/list"
            className={buttonClasses("secondary")}
          >
            View institutions
          </Link>
          <Link
            href="/dashboard/institutions/campuses"
            className={buttonClasses("secondary")}
          >
            View campuses
          </Link>
          {can("institution.create") ? (
            <Link
              href="/dashboard/institutions/list/new"
              className={buttonClasses("primary")}
            >
              New institution
            </Link>
          ) : null}
          {can("campus.create") ? (
            <Link
              href="/dashboard/institutions/campuses/new"
              className={buttonClasses("primary")}
            >
              New campus
            </Link>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
