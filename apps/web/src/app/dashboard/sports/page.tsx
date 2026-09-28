"use client";

import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/useResource";
import { PermissionGate } from "@/components/PermissionGate";
import { SportsTabs } from "@/components/SportsTabs";
import { Card, PageHeader, Spinner, StatCard } from "@/components/ui";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { SportSummary } from "@/lib/types";

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
    <div className="space-y-6">
      <PageHeader
        title="Sports"
        description="Sports catalogue, teams, fixtures, achievements and equipment."
      />

      <SportsTabs active="overview" />

      {summary ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      <Card className="p-5">
        <p className="text-sm text-slate-600">
          Use the tabs above to manage the sports catalogue, build teams and
          rosters, schedule training and fixtures, log achievements and track
          equipment.
        </p>
      </Card>
    </div>
  );
}
