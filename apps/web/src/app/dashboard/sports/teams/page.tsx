"use client";

import { SportsTabs } from "@/components/SportsTabs";
import { MasterList } from "@/components/MasterList";
import { Badge } from "@/components/ui";
import { useSports } from "@/lib/useLookups";
import type { SportTeam } from "@/lib/types";

export default function SportTeamsPage() {
  const { items: sports } = useSports();

  return (
    <div className="space-y-6">
      <SportsTabs active="teams" />
      <MasterList<SportTeam>
        title="Teams"
        description="Squads built from the sports catalogue, with a coach and roster."
        endpoint="/v1/sports/teams"
        searchable={false}
        createHref="/dashboard/sports/teams/new"
        createPermission="sports.create"
        createLabel="New team"
        editHref={(team) => `/dashboard/sports/teams/${team.id}`}
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
            param: "is_active",
            placeholder: "All states",
            options: [
              { value: "1", label: "Active" },
              { value: "0", label: "Inactive" },
            ],
          },
        ]}
        columns={[
          { header: "Team", render: (team) => team.name },
          { header: "Sport", render: (team) => team.sport?.name ?? "-" },
          { header: "Age group", render: (team) => team.age_group ?? "-" },
          { header: "Gender", render: (team) => team.gender ?? "-" },
          { header: "Coach", render: (team) => team.coach?.name ?? "-" },
          {
            header: "Players",
            align: "right",
            render: (team) => team.members_count ?? 0,
          },
          {
            header: "Status",
            render: (team) => (
              <Badge value={team.is_active ? "active" : "inactive"} />
            ),
          },
        ]}
      />
    </div>
  );
}
