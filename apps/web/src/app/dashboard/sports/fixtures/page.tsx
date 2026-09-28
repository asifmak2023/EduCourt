"use client";

import Link from "next/link";
import { SportsTabs } from "@/components/SportsTabs";
import { MasterList } from "@/components/MasterList";
import { Badge } from "@/components/ui";
import { useSports } from "@/lib/useLookups";
import {
  FIXTURE_STATUS_OPTIONS,
} from "@/lib/sportsOptions";
import type { SportFixture } from "@/lib/types";

export default function SportFixturesPage() {
  const { items: sports } = useSports();

  return (
    <div className="space-y-6">
      <SportsTabs active="fixtures" />
      <MasterList<SportFixture>
        title="Fixtures"
        description="Matches against other schools with results and outcomes."
        endpoint="/v1/sports/fixtures"
        searchable={false}
        createHref="/dashboard/sports/fixtures/new"
        createPermission="sports.create"
        createLabel="New fixture"
        editHref={(fixture) => `/dashboard/sports/fixtures/${fixture.id}`}
        filters={[
          {
            param: "sport_id",
            placeholder: "All sports",
            options: sports.map((sport) => ({
              value: String(sport.id),
              label: sport.name,
            })),
          },
          {
            param: "status",
            placeholder: "All statuses",
            options: FIXTURE_STATUS_OPTIONS,
          },
          {
            param: "outcome",
            placeholder: "All outcomes",
            options: [
              { value: "win", label: "Win" },
              { value: "loss", label: "Loss" },
              { value: "draw", label: "Draw" },
            ],
          },
        ]}
        columns={[
          {
            header: "Date",
            render: (fixture) => fixture.fixture_date ?? "-",
          },
          { header: "Sport", render: (fixture) => fixture.sport?.name ?? "-" },
          { header: "Team", render: (fixture) => fixture.team?.name ?? "-" },
          { header: "Opponent", render: (fixture) => fixture.opponent },
          {
            header: "Home/Away",
            render: (fixture) => fixture.home_away ?? "-",
          },
          {
            header: "Score",
            align: "right",
            render: (fixture) =>
              fixture.our_score === null
                ? "-"
                : `${fixture.our_score} - ${fixture.opponent_score}`,
          },
          {
            header: "Status",
            render: (fixture) => <Badge value={fixture.status ?? "unknown"} />,
          },
          {
            header: "Outcome",
            render: (fixture) => <Badge value={fixture.outcome ?? "pending"} />,
          },
        ]}
      />
      <p className="text-xs text-slate-500">
        Open a fixture to record its result.{" "}
        <Link
          href="/dashboard/sports/reports"
          className="text-slate-700 underline"
        >
          View the season report
        </Link>
        .
      </p>
    </div>
  );
}
