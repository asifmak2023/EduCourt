"use client";

import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import { SportsTabs } from "@/components/SportsTabs";
import { useSportTeams } from "@/lib/useLookups";

export default function NewSportTrainingPage() {
  const { items: teams } = useSportTeams();

  return (
    <PermissionGate permission="sports.create">
      <div className="space-y-6">
        <SportsTabs active="training" />
        <MasterForm
          title="New training session"
          description="Schedule a coaching session."
          endpoint="/v1/sports/training-sessions"
          redirectTo="/dashboard/sports/training"
          initial={{}}
          fields={[
            {
              name: "sport_team_id",
              label: "Team",
              type: "select",
              required: true,
              options: teams.map((team) => ({
                value: String(team.id),
                label: team.name,
              })),
            },
            { name: "title", label: "Title", type: "text", required: true },
            {
              name: "session_date",
              label: "Session date",
              type: "date",
              required: true,
            },
            { name: "start_time", label: "Start time", type: "time" },
            { name: "end_time", label: "End time", type: "time" },
            { name: "venue", label: "Venue", type: "text" },
            { name: "focus", label: "Focus", type: "text" },
            { name: "notes", label: "Notes", type: "text", span: 2 },
          ]}
        />
      </div>
    </PermissionGate>
  );
}
