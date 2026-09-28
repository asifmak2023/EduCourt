"use client";

import { useParams } from "next/navigation";
import { useResource } from "@/lib/useResource";
import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import { SportsTabs } from "@/components/SportsTabs";
import { ErrorNotice, Spinner } from "@/components/ui";
import { useSportTeams, useSports } from "@/lib/useLookups";
import {
  FIXTURE_HOME_AWAY_OPTIONS,
  FIXTURE_STATUS_OPTIONS,
} from "@/lib/sportsOptions";
import type { SportFixture } from "@/lib/types";

export default function EditSportFixturePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ? Number(params.id) : undefined;
  const { data, loading, error } = useResource<SportFixture>(
    id ? `/v1/sports/fixtures/${id}` : null
  );
  const { items: sports } = useSports();
  const { items: teams } = useSportTeams();

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <ErrorNotice message="Fixture not found." />;

  return (
    <PermissionGate permission="sports.edit">
      <div className="space-y-6">
        <SportsTabs active="fixtures" />
        <MasterForm
          title="Edit fixture"
          description={`vs ${data.opponent}`}
          endpoint="/v1/sports/fixtures"
          recordId={data.id}
          redirectTo={`/dashboard/sports/fixtures/${data.id}`}
          initial={{
            sport_id: String(data.sport_id),
            sport_team_id: data.sport_team_id
              ? String(data.sport_team_id)
              : "",
            opponent: data.opponent,
            home_away: data.home_away ?? "",
            venue: data.venue ?? "",
            fixture_date: data.fixture_date ?? "",
            start_time: (data.start_time ?? "").slice(0, 5),
            status: data.status ?? "",
            remarks: data.remarks ?? "",
          }}
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
