"use client";

import { useParams } from "next/navigation";
import { useResource } from "@/lib/useResource";
import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import { SportsTabs } from "@/components/SportsTabs";
import { ErrorNotice, Spinner } from "@/components/ui";
import { useSports, useUsers } from "@/lib/useLookups";
import { SPORT_GENDER_OPTIONS } from "@/lib/sportsOptions";
import type { SportTeam } from "@/lib/types";

export default function EditSportTeamPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ? Number(params.id) : undefined;
  const { data, loading, error } = useResource<SportTeam>(
    id ? `/v1/sports/teams/${id}` : null
  );
  const { items: sports } = useSports();
  const { items: users } = useUsers();

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <ErrorNotice message="Team not found." />;

  return (
    <PermissionGate permission="sports.edit">
      <div className="space-y-6">
        <SportsTabs active="teams" />
        <MasterForm
          title="Edit team"
          description={data.name}
          endpoint="/v1/sports/teams"
          recordId={data.id}
          redirectTo={`/dashboard/sports/teams/${data.id}`}
          initial={{
            sport_id: String(data.sport_id),
            name: data.name,
            age_group: data.age_group ?? "",
            gender: data.gender ?? "",
            coach_user_id: data.coach_user_id ? String(data.coach_user_id) : "",
            notes: data.notes ?? "",
            is_active: data.is_active,
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
            { name: "name", label: "Name", type: "text", required: true },
            { name: "age_group", label: "Age group", type: "text" },
            {
              name: "gender",
              label: "Gender",
              type: "select",
              placeholder: "Any",
              options: SPORT_GENDER_OPTIONS,
            },
            {
              name: "coach_user_id",
              label: "Coach",
              type: "select",
              placeholder: "Unassigned",
              options: users.map((user) => ({
                value: String(user.id),
                label: user.name,
              })),
            },
            { name: "notes", label: "Notes", type: "text", span: 2 },
            { name: "is_active", label: "Active", type: "checkbox" },
          ]}
        />
      </div>
    </PermissionGate>
  );
}
