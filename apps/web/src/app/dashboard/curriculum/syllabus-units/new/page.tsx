"use client";

import {
  useAcademicYears,
  useClassRooms,
  useSubjects,
  useTerms,
} from "@/lib/useLookups";
import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import { Spinner } from "@/components/ui";

export default function NewSyllabusUnitPage() {
  const { items: years, loading } = useAcademicYears();
  const { items: classes } = useClassRooms();
  const { items: subjects } = useSubjects();
  const { items: terms } = useTerms();

  if (loading) return <Spinner />;

  return (
    <PermissionGate permission="curriculum.create">
      <MasterForm
        title="New syllabus unit"
        description="Add a topic to a class and subject."
        endpoint="/v1/syllabus-units"
        redirectTo="/dashboard/curriculum/syllabus-units"
        initial={{}}
        fields={[
          {
            name: "academic_year_id",
            label: "Academic year",
            type: "select",
            required: true,
            options: years.map((year) => ({
              value: String(year.id),
              label: year.name,
            })),
          },
          {
            name: "class_room_id",
            label: "Class",
            type: "select",
            required: true,
            options: classes.map((room) => ({
              value: String(room.id),
              label: room.name,
            })),
          },
          {
            name: "subject_id",
            label: "Subject",
            type: "select",
            required: true,
            options: subjects.map((subject) => ({
              value: String(subject.id),
              label: subject.name,
            })),
          },
          {
            name: "term_id",
            label: "Term",
            type: "select",
            placeholder: "Optional",
            options: terms.map((term) => ({
              value: String(term.id),
              label: term.name,
            })),
          },
          {
            name: "title",
            label: "Title",
            type: "text",
            required: true,
            span: 2,
          },
          {
            name: "description",
            label: "Description",
            type: "text",
            span: 2,
          },
          {
            name: "sequence",
            label: "Sequence",
            type: "number",
            min: "1",
          },
          {
            name: "estimated_periods",
            label: "Estimated periods",
            type: "number",
            min: "0",
          },
        ]}
      />
    </PermissionGate>
  );
}
