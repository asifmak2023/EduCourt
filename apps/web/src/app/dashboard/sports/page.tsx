"use client";

import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/useResource";
import { PermissionGate } from "@/components/PermissionGate";
import { SportsTabs } from "@/components/SportsTabs";
import { HubGrid, type HubSection } from "@/components/ModuleHub";
import { PageHeader, Spinner, StatCard } from "@/components/ui";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { SportSummary } from "@/lib/types";

const SPORTS_SECTIONS: HubSection[] = [
  {
    href: "/dashboard/sports/catalog",
    title: "Sports",
    description: "The catalogue of sports offered.",
    icon: "trophy",
  },
  {
    href: "/dashboard/sports/teams",
    title: "Teams",
    description: "Teams and player rosters.",
    icon: "users",
  },
  {
    href: "/dashboard/sports/training",
    title: "Training",
    description: "Training schedules and attendance.",
    icon: "calendar",
  },
  {
    href: "/dashboard/sports/fixtures",
    title: "Fixtures",
    description: "Matches, results and standings.",
    icon: "clock",
  },
  {
    href: "/dashboard/sports/achievements",
    title: "Achievements",
    description: "Medals, titles and records.",
    icon: "award",
  },
  {
    href: "/dashboard/sports/equipment",
    title: "Equipment",
    description: "Gear stock and valuation.",
    icon: "box",
  },
  {
    href: "/dashboard/sports/reports",
    title: "Reports",
    description: "Participation and performance summaries.",
    icon: "chart",
  },
];

export default function SportsPage() {
  return (
    <PermissionGate permission="sports.view">
      <SportsHome />
    </PermissionGate>
  );
}

function SportsHome() {
  const { can } = useAuth();

  const { data: summary } = useResource<SportSummary>(
    can("sports.export") ? "/v1/sports/reports/summary" : null
  );

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        title="Sports"
        description="Sports catalogue, teams, fixtures, achievements and equipment."
      />

      <SportsTabs active="overview" />

      {summary ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Teams" value={formatNumber(summary.teams)} />
            <StatCard
              label="Active players"
              value={formatNumber(summary.active_members)}
            />
            <StatCard
              label="Fixtures"
              value={formatNumber(summary.fixtures.total)}
              hint={`${formatNumber(summary.fixtures.completed)} completed`}
            />
            <StatCard
              label="Achievements"
              value={formatNumber(summary.achievements)}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Wins"
              value={formatNumber(summary.fixtures.wins)}
              tone="positive"
            />
            <StatCard
              label="Losses"
              value={formatNumber(summary.fixtures.losses)}
              tone="danger"
            />
            <StatCard
              label="Draws"
              value={formatNumber(summary.fixtures.draws)}
            />
            <StatCard
              label="Equipment value"
              value={formatCurrency(summary.equipment.value)}
              hint={`${formatNumber(summary.equipment.out_of_stock)} out of stock`}
            />
          </div>
        </>
      ) : can("sports.export") ? (
        <Spinner />
      ) : null}

      <HubGrid sections={SPORTS_SECTIONS} />
    </div>
  );
}
