"use client";

import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import { SportsTabs } from "@/components/SportsTabs";
import { useSportTeams, useSports } from "@/lib/useLookups";
import {
  FIXTURE_HOME_AWAY_OPTIONS,
  FIXTURE_STATUS_OPTIONS,
} from "@/lib/sportsOptions";

export default function NewSportFixturePage() {
  const { items: sports } = useSports();
  const { items: teams } = useSportTeams();

  return (
    <PermissionGate permission="sports.create">
      <div className="space-y-6">
        <SportsTabs active="fixtures" />
        <MasterForm
          title="New fixture"
          description="Schedule a match against another school."
          endpoint="/v1/sports/fixtures"
          redirectTo="/dashboard/sports/fixtures"
          initial={{ home_away: "home", status: "scheduled" }}
          fields={[
            {
              name: "sport_id",
              label: "Sport",
              type: "select",
              required: true,
              options: sports.map((sport) => ({
                value: String(sport.id),
                label: sport.name,
              })),
            },
            {
              name: "sport_team_id",
              label: "Team",
              type: "select",
              placeholder: "Not specified",
              options: teams.map((team) => ({
                value: String(team.id),
                label: team.name,
              })),
            },
            {
              name: "opponent",
              label: "Opponent",
              type: "text",
              required: true,
            },
            {
              name: "home_away",
              label: "Home/Away",
              type: "select",
              options: FIXTURE_HOME_AWAY_OPTIONS,
            },
            { name: "venue", label: "Venue", type: "text" },
            {
              name: "fixture_date",
              label: "Fixture date",
              type: "date",
              required: true,
            },
            { name: "start_time", label: "Start time", type: "time" },
            {
              name: "status",
              label: "Status",
              type: "select",
              options: FIXTURE_STATUS_OPTIONS,
            },
            { name: "remarks", label: "Remarks", type: "text", span: 2 },
          ]}
        />
      </div>
    </PermissionGate>
  );
}
