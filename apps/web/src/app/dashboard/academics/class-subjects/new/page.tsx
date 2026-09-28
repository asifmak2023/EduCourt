"use client";

import {
  useAcademicYears,
  useClassRooms,
  useSubjects,
} from "@/lib/useLookups";
import { PermissionGate } from "@/components/PermissionGate";
import { MasterForm } from "@/components/MasterForm";
import { Spinner } from "@/components/ui";

export default function NewClassSubjectPage() {
  return (
    <PermissionGate permission="academic.create">
      <NewClassSubjectForm />
    </PermissionGate>
  );
}

function NewClassSubjectForm() {
  const { items: years, loading: yearsLoading } = useAcademicYears();
  const { items: classes } = useClassRooms();
  const { items: subjects } = useSubjects();

  if (yearsLoading) return <Spinner />;

  return (
    <MasterForm
      title="Map subject to class"
      description="A subject must be mapped before a teacher can be assigned."
      endpoint="/v1/class-subjects"
      redirectTo="/dashboard/academics/class-subjects"
      submitLabel="Map subject"
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
            label: `${subject.code} - ${subject.name}`,
          })),
        },
        {
          name: "weekly_periods",
          label: "Weekly periods",
          type: "number",
          min: "0",
        },
        { name: "is_elective", label: "Elective", type: "checkbox" },
        { name: "is_active", label: "Active", type: "checkbox" },
      ]}
      initial={{
        academic_year_id: "",
        class_room_id: "",
        subject_id: "",
        weekly_periods: "",
        is_elective: false,
        is_active: true,
      }}
    />
  );
}
