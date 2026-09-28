"use client";

import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/useResource";
import {
  useAcademicYears,
  useClassRooms,
  useSections,
  useSubjects,
  useUsers,
} from "@/lib/useLookups";
import { PermissionGate } from "@/components/PermissionGate";
import { MasterForm, type MasterField } from "@/components/MasterForm";
import { ErrorNotice, Spinner } from "@/components/ui";
import type { TeachingAssignment } from "@/lib/types";

export default function EditTeachingAssignmentPage() {
  return (
    <PermissionGate permission="academic.edit">
      <EditTeachingAssignmentLoader />
    </PermissionGate>
  );
}

function EditTeachingAssignmentLoader() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { can } = useAuth();
  const { data, loading, error } = useResource<TeachingAssignment>(
    id ? `/v1/teaching-assignments/${id}` : null
  );
  const { items: years, loading: yearsLoading } = useAcademicYears();
  const { items: classes } = useClassRooms();
  const { items: sections } = useSections();
  const { items: subjects } = useSubjects();
  const { items: users } = useUsers(can("user.view"));

  if (loading || yearsLoading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <ErrorNotice message="Assignment not found." />;

  const teacherField: MasterField = can("user.view")
    ? {
        name: "teacher_user_id",
        label: "Teacher",
        type: "select",
        required: true,
        options: users.map((user) => ({
          value: String(user.id),
          label: user.name,
        })),
      }
    : {
        name: "teacher_user_id",
        label: "Teacher user ID",
        type: "number",
        required: true,
        hint: "You do not have the user directory permission; enter the teacher's user ID.",
      };

  const fields: MasterField[] = [
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
    teacherField,
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
      name: "section_id",
      label: "Section",
      type: "select",
      options: sections.map((section) => ({
        value: String(section.id),
        label: `${section.name} (${section.class_room?.name ?? ""})`,
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
    { name: "is_active", label: "Active", type: "checkbox" },
  ];

  return (
    <MasterForm
      title="Edit teaching assignment"
      endpoint="/v1/teaching-assignments"
      recordId={data.id}
      redirectTo="/dashboard/academics/teaching-assignments"
      fields={fields}
      initial={{
        academic_year_id: String(data.academic_year_id),
        teacher_user_id: String(data.teacher_user_id),
        class_room_id: String(data.class_room_id),
        section_id: data.section_id === null ? "" : String(data.section_id),
        subject_id: String(data.subject_id),
        weekly_periods:
          data.weekly_periods === null ? "" : String(data.weekly_periods),
        is_active: data.is_active,
      }}
    />
  );
}
