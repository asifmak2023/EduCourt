"use client";

import { useAuth } from "@/lib/auth";
import { useClassRooms, useSubjects, useTerms } from "@/lib/useLookups";
import { MasterList } from "@/components/MasterList";
import type { SyllabusUnit } from "@/lib/types";

export default function SyllabusUnitsPage() {
  const { can } = useAuth();
  const { items: classes } = useClassRooms();
  const { items: subjects } = useSubjects();
  const { items: terms } = useTerms();

  return (
    <MasterList<SyllabusUnit>
      title="Syllabus units"
      description="Topics sequenced per class and subject."
      endpoint="/v1/syllabus-units"
      createHref={
        can("curriculum.create")
          ? "/dashboard/curriculum/syllabus-units/new"
          : undefined
      }
      createLabel="New unit"
      editHref={(unit) => `/dashboard/curriculum/syllabus-units/${unit.id}/edit`}
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
          param: "term_id",
          placeholder: "All terms",
          options: terms.map((term) => ({
            value: String(term.id),
            label: term.name,
          })),
        },
      ]}
      columns={[
        { header: "Title", render: (unit) => unit.title },
        {
          header: "Class",
          render: (unit) => unit.class_room?.name ?? "-",
        },
        {
          header: "Subject",
          render: (unit) => unit.subject?.name ?? "-",
        },
        { header: "Term", render: (unit) => unit.term?.name ?? "-" },
        {
          header: "Sequence",
          align: "right",
          render: (unit) => unit.sequence,
        },
        {
          header: "Periods",
          align: "right",
          render: (unit) => unit.estimated_periods ?? "-",
        },
      ]}
    />
  );
}
