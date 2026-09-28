"use client";

import { useAuth } from "@/lib/auth";
import {
  useAcademicYears,
  useClassRooms,
  useSections,
  useSubjects,
  useUsers,
} from "@/lib/useLookups";
import { PermissionGate } from "@/components/PermissionGate";
import { MasterForm, type MasterField } from "@/components/MasterForm";
import { Spinner } from "@/components/ui";

export default function NewTeachingAssignmentPage() {
  return (
    <PermissionGate permission="academic.create">
      <NewTeachingAssignmentForm />
    </PermissionGate>
  );
}

function NewTeachingAssignmentForm() {
  const { can } = useAuth();
  const { items: years, loading: yearsLoading } = useAcademicYears();
  const { items: classes } = useClassRooms();
  const { items: sections } = useSections();
  const { items: subjects } = useSubjects();
  const { items: users } = useUsers(can("user.view"));

  if (yearsLoading) return <Spinner />;

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
      title="New teaching assignment"
      description="The subject must already be mapped to the class."
      endpoint="/v1/teaching-assignments"
      redirectTo="/dashboard/academics/teaching-assignments"
      submitLabel="Create assignment"
      fields={fields}
      initial={{
        academic_year_id: "",
        teacher_user_id: "",
        class_room_id: "",
        section_id: "",
        subject_id: "",
        weekly_periods: "",
        is_active: true,
      }}
    />
  );
}
