"use client";

import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import { SportsTabs } from "@/components/SportsTabs";
import { useSports, useStudents } from "@/lib/useLookups";
import { ACHIEVEMENT_LEVEL_OPTIONS } from "@/lib/sportsOptions";

export default function NewSportAchievementPage() {
  const { items: sports } = useSports();
  const { items: students } = useStudents();

  return (
    <PermissionGate permission="sports.create">
      <div className="space-y-6">
        <SportsTabs active="achievements" />
        <MasterForm
          title="New achievement"
          description="Record a notable sporting result."
          endpoint="/v1/sports/achievements"
          redirectTo="/dashboard/sports/achievements"
          initial={{ level: "school" }}
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
