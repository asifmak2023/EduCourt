"use client";

import { useParams } from "next/navigation";
import { useResource } from "@/lib/useResource";
import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import { SportsTabs } from "@/components/SportsTabs";
import { ErrorNotice, Spinner } from "@/components/ui";
import { useUsers } from "@/lib/useLookups";
import { SPORT_CATEGORY_OPTIONS } from "@/lib/sportsOptions";
import type { Sport } from "@/lib/types";

export default function EditSportPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ? Number(params.id) : undefined;
  const { data, loading, error } = useResource<Sport>(
    id ? `/v1/sports/${id}` : null
  );
  const { items: users } = useUsers();

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <ErrorNotice message="Sport not found." />;

  const stringValue = (value: string | number | null) =>
    value === null || value === undefined ? "" : String(value);

  return (
    <PermissionGate permission="sports.edit">
      <div className="space-y-6">
        <SportsTabs active="catalog" />
        <MasterForm
          title="Edit sport"
          description={data.name}
          endpoint="/v1/sports"
          recordId={data.id}
          redirectTo="/dashboard/sports/catalog"
          initial={{
            name: data.name,
            code: data.code,
            category: data.category ?? "",
            season: data.season ?? "",
            coach_user_id: stringValue(data.coach_user_id),
            min_age_years: stringValue(data.min_age_years),
            max_age_years: stringValue(data.max_age_years),
            min_attendance_percent: stringValue(data.min_attendance_percent),
            budget: stringValue(data.budget),
            rules: data.rules ?? "",
            description: data.description ?? "",
            is_active: data.is_active,
          }}
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
            { name: "rules", label: "Rules", type: "text", span: 2 },
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
