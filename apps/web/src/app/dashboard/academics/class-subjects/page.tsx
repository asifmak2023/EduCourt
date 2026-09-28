"use client";

import {
  useAcademicYears,
  useClassRooms,
  useSubjects,
} from "@/lib/useLookups";
import { PermissionGate } from "@/components/PermissionGate";
import { MasterList } from "@/components/MasterList";
import { Badge } from "@/components/ui";
import type { ClassSubject } from "@/lib/types";

export default function ClassSubjectsPage() {
  return (
    <PermissionGate permission="academic.view">
      <ClassSubjectsTable />
    </PermissionGate>
  );
}

function ClassSubjectsTable() {
  const { items: years } = useAcademicYears();
  const { items: classes } = useClassRooms();
  const { items: subjects } = useSubjects();

  return (
    <MasterList<ClassSubject>
      title="Class subjects"
      description="Which subjects each class studies, per year."
      endpoint="/v1/class-subjects"
      searchable={false}
      createHref="/dashboard/academics/class-subjects/new"
      createPermission="academic.create"
      createLabel="Map subject"
      editHref={(mapping) =>
        `/dashboard/academics/class-subjects/${mapping.id}/edit`
      }
      filters={[
        {
          param: "academic_year_id",
          placeholder: "All academic years",
          options: years.map((year) => ({
            value: String(year.id),
            label: year.name,
          })),
        },
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
      ]}
      columns={[
        { header: "Class", render: (mapping) => mapping.class_room?.name ?? "-" },
        { header: "Subject", render: (mapping) => mapping.subject?.name ?? "-" },
        {
          header: "Code",
          render: (mapping) => (
            <span className="font-mono text-xs text-slate-500">
              {mapping.subject?.code ?? "-"}
            </span>
          ),
        },
        {
          header: "Elective",
          render: (mapping) => (mapping.is_elective ? "Yes" : "No"),
        },
        {
          header: "Weekly periods",
          align: "right",
          render: (mapping) => mapping.weekly_periods ?? "-",
        },
        {
          header: "Status",
          render: (mapping) => (
            <Badge value={mapping.is_active ? "active" : "inactive"} />
          ),
        },
      ]}
    />
  );
}
