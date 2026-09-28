"use client";

import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import { SportsTabs } from "@/components/SportsTabs";
import { useSports, useUsers } from "@/lib/useLookups";
import { SPORT_GENDER_OPTIONS } from "@/lib/sportsOptions";

export default function NewSportTeamPage() {
  const { items: sports } = useSports();
  const { items: users } = useUsers();

  return (
    <PermissionGate permission="sports.create">
      <div className="space-y-6">
        <SportsTabs active="teams" />
        <MasterForm
          title="New team"
          description="Create a squad for a sport."
          endpoint="/v1/sports/teams"
          redirectTo="/dashboard/sports/teams"
          initial={{ is_active: true }}
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
