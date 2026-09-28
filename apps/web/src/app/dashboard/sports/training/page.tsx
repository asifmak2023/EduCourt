"use client";

import { SportsTabs } from "@/components/SportsTabs";
import { MasterList } from "@/components/MasterList";
import { useSportTeams } from "@/lib/useLookups";
import type { SportTrainingSession } from "@/lib/types";

export default function SportTrainingPage() {
  const { items: teams } = useSportTeams();

  return (
    <div className="space-y-6">
      <SportsTabs active="training" />
      <MasterList<SportTrainingSession>
        title="Training sessions"
        description="Coaching sessions scheduled per team."
        endpoint="/v1/sports/training-sessions"
        searchable={false}
        createHref="/dashboard/sports/training/new"
        createPermission="sports.create"
        createLabel="New session"
        editHref={(session) => `/dashboard/sports/training/${session.id}/edit`}
        filters={[
          {
            param: "sport_team_id",
            placeholder: "All teams",
            options: teams.map((team) => ({
              value: String(team.id),
              label: team.name,
            })),
          },
        ]}
        columns={[
          { header: "Title", render: (session) => session.title },
          { header: "Team", render: (session) => session.team?.name ?? "-" },
          {
            header: "Date",
            render: (session) => session.session_date ?? "-",
          },
          {
            header: "Time",
            render: (session) =>
              session.start_time
                ? `${session.start_time}${session.end_time ? ` - ${session.end_time}` : ""}`
                : "-",
          },
          { header: "Venue", render: (session) => session.venue ?? "-" },
          { header: "Focus", render: (session) => session.focus ?? "-" },
        ]}
      />
    </div>
  );
}
