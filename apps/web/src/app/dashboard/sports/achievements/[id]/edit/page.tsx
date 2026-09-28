"use client";

import { useParams } from "next/navigation";
import { useResource } from "@/lib/useResource";
import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import { SportsTabs } from "@/components/SportsTabs";
import { ErrorNotice, Spinner } from "@/components/ui";
import { useSports, useStudents } from "@/lib/useLookups";
import { ACHIEVEMENT_LEVEL_OPTIONS } from "@/lib/sportsOptions";
import type { SportAchievement } from "@/lib/types";

export default function EditSportAchievementPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ? Number(params.id) : undefined;
  const { data, loading, error } = useResource<SportAchievement>(
    id ? `/v1/sports/achievements/${id}` : null
  );
  const { items: sports } = useSports();
  const { items: students } = useStudents();

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <ErrorNotice message="Achievement not found." />;

  return (
    <PermissionGate permission="sports.edit">
      <div className="space-y-6">
        <SportsTabs active="achievements" />
        <MasterForm
          title="Edit achievement"
          description={data.title}
          endpoint="/v1/sports/achievements"
          recordId={data.id}
          redirectTo="/dashboard/sports/achievements"
          initial={{
            sport_id: String(data.sport_id),
            student_id: data.student_id ? String(data.student_id) : "",
            title: data.title,
            level: data.level ?? "",
            position: data.position ?? "",
            achieved_on: data.achieved_on ?? "",
            description: data.description ?? "",
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
              name: "student_id",
              label: "Student",
              type: "select",
              placeholder: "Team achievement",
              options: students.map((student) => ({
                value: String(student.id),
                label: `${student.full_name} (${student.admission_no})`,
              })),
            },
            { name: "title", label: "Title", type: "text", required: true },
            {
              name: "level",
              label: "Level",
              type: "select",
              options: ACHIEVEMENT_LEVEL_OPTIONS,
            },
            { name: "position", label: "Position", type: "text" },
            {
              name: "achieved_on",
              label: "Achieved on",
              type: "date",
              required: true,
            },
            {
              name: "description",
              label: "Description",
              type: "text",
              span: 2,
            },
          ]}
        />
      </div>
    </PermissionGate>
  );
}
