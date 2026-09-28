"use client";

import { useParams } from "next/navigation";
import { useResource } from "@/lib/useResource";
import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import { SportsTabs } from "@/components/SportsTabs";
import { ErrorNotice, Spinner } from "@/components/ui";
import { useSportTeams } from "@/lib/useLookups";
import type { SportTrainingSession } from "@/lib/types";

export default function EditSportTrainingPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ? Number(params.id) : undefined;
  const { data, loading, error } = useResource<SportTrainingSession>(
    id ? `/v1/sports/training-sessions/${id}` : null
  );
  const { items: teams } = useSportTeams();

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <ErrorNotice message="Training session not found." />;

  return (
    <PermissionGate permission="sports.edit">
      <div className="space-y-6">
        <SportsTabs active="training" />
        <MasterForm
          title="Edit training session"
          description={data.title}
          endpoint="/v1/sports/training-sessions"
          recordId={data.id}
          redirectTo="/dashboard/sports/training"
          initial={{
            sport_team_id: String(data.sport_team_id),
            title: data.title,
            session_date: data.session_date ?? "",
            start_time: (data.start_time ?? "").slice(0, 5),
            end_time: (data.end_time ?? "").slice(0, 5),
            venue: data.venue ?? "",
            focus: data.focus ?? "",
            notes: data.notes ?? "",
          }}
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
