"use client";

import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import { SportsTabs } from "@/components/SportsTabs";
import { useUsers } from "@/lib/useLookups";
import { SPORT_CATEGORY_OPTIONS } from "@/lib/sportsOptions";

export default function NewSportPage() {
  const { items: users } = useUsers();

  return (
    <PermissionGate permission="sports.create">
      <div className="space-y-6">
        <SportsTabs active="catalog" />
        <MasterForm
          title="New sport"
          description="Add a sport to the campus catalogue."
          endpoint="/v1/sports"
          redirectTo="/dashboard/sports/catalog"
          initial={{ category: "outdoor", is_active: true }}
          fields={[
            { name: "name", label: "Name", type: "text", required: true },
            { name: "code", label: "Code", type: "text", required: true },
            {
              name: "category",
              label: "Category",
              type: "select",
              options: SPORT_CATEGORY_OPTIONS,
            },
            { name: "season", label: "Season", type: "text" },
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
            {
              name: "min_age_years",
              label: "Minimum age",
              type: "number",
              min: "1",
            },
            {
              name: "max_age_years",
              label: "Maximum age",
              type: "number",
              min: "1",
            },
            {
              name: "min_attendance_percent",
              label: "Minimum attendance %",
              type: "number",
              min: "0",
              step: "0.01",
            },
            {
              name: "budget",
              label: "Budget",
              type: "number",
              min: "0",
              step: "0.01",
            },
            {
              name: "rules",
              label: "Rules",
              type: "text",
              span: 2,
            },
            {
              name: "description",
              label: "Description",
              type: "text",
              span: 2,
            },
            { name: "is_active", label: "Active", type: "checkbox" },
          ]}
        />
      </div>
    </PermissionGate>
  );
}
