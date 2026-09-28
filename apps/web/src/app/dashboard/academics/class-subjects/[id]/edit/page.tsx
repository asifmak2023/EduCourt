"use client";

import { useParams } from "next/navigation";
import { useResource } from "@/lib/useResource";
import {
  useAcademicYears,
  useClassRooms,
  useSubjects,
} from "@/lib/useLookups";
import { PermissionGate } from "@/components/PermissionGate";
import { MasterForm } from "@/components/MasterForm";
import { ErrorNotice, Spinner } from "@/components/ui";
import type { ClassSubject } from "@/lib/types";

export default function EditClassSubjectPage() {
  return (
    <PermissionGate permission="academic.edit">
      <EditClassSubjectLoader />
    </PermissionGate>
  );
}

function EditClassSubjectLoader() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { data, loading, error } = useResource<ClassSubject>(
    id ? `/v1/class-subjects/${id}` : null
  );
  const { items: years, loading: yearsLoading } = useAcademicYears();
  const { items: classes } = useClassRooms();
  const { items: subjects } = useSubjects();

  if (loading || yearsLoading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <ErrorNotice message="Mapping not found." />;

  return (
    <MasterForm
      title="Edit class subject"
      endpoint="/v1/class-subjects"
      recordId={data.id}
      redirectTo="/dashboard/academics/class-subjects"
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
        academic_year_id: String(data.academic_year_id),
        class_room_id: String(data.class_room_id),
        subject_id: String(data.subject_id),
        weekly_periods:
          data.weekly_periods === null ? "" : String(data.weekly_periods),
        is_elective: data.is_elective,
        is_active: data.is_active,
      }}
    />
  );
}
