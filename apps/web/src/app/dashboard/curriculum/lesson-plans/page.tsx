"use client";

import { useAuth } from "@/lib/auth";
import { useClassRooms, useSubjects } from "@/lib/useLookups";
import { MasterList } from "@/components/MasterList";
import { Badge } from "@/components/ui";
import type { LessonPlan } from "@/lib/types";

export default function LessonPlansPage() {
  const { can } = useAuth();
  const { items: classes } = useClassRooms();
  const { items: subjects } = useSubjects();

  return (
    <MasterList<LessonPlan>
      title="Lesson plans"
      description="Lesson planning with an approval workflow."
      endpoint="/v1/lesson-plans"
      searchPlaceholder="Search lesson plans"
      createHref={
        can("curriculum.create")
          ? "/dashboard/curriculum/lesson-plans/new"
          : undefined
      }
      createLabel="New plan"
      editHref={(plan) => `/dashboard/curriculum/lesson-plans/${plan.id}`}
      filters={[
        {
          param: "class_room_id",
          placeholder: "All classes",
          options: classes.map((room) => ({
            value: String(room.id),
            label: room.name,
          })),
        },
        {
          param: "subject_id",
          placeholder: "All subjects",
          options: subjects.map((subject) => ({
            value: String(subject.id),
            label: subject.name,
          })),
        },
        {
          param: "status",
          placeholder: "All statuses",
          options: [
            { value: "draft", label: "Draft" },
            { value: "submitted", label: "Submitted" },
            { value: "approved", label: "Approved" },
          ],
        },
      ]}
      columns={[
        { header: "Title", render: (plan) => plan.title },
        { header: "Class", render: (plan) => plan.class_room?.name ?? "-" },
        { header: "Subject", render: (plan) => plan.subject?.name ?? "-" },
        {
          header: "Unit",
          render: (plan) => plan.syllabus_unit?.title ?? "-",
        },
        {
          header: "Planned",
          render: (plan) =>
            plan.planned_from
              ? `${plan.planned_from}${plan.planned_to ? ` to ${plan.planned_to}` : ""}`
              : "-",
        },
        {
          header: "Status",
          render: (plan) => <Badge value={plan.status} />,
        },
      ]}
    />
  );
}
