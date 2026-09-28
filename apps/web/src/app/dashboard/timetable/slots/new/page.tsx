"use client";

import { useAuth } from "@/lib/auth";
import {
  useAcademicYears,
  useClassRooms,
  usePeriods,
  useRooms,
  useSections,
  useSubjects,
  useTerms,
  useUsers,
} from "@/lib/useLookups";
import { PermissionGate } from "@/components/PermissionGate";
import { MasterForm, type MasterField } from "@/components/MasterForm";
import { Spinner } from "@/components/ui";

const DAY_OPTIONS = [
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
  { value: "7", label: "Sunday" },
];

export default function NewTimetableSlotPage() {
  return (
    <PermissionGate permission="timetable.create">
      <NewSlotForm />
    </PermissionGate>
  );
}

function NewSlotForm() {
  const { can } = useAuth();
  const { items: years, loading: yearsLoading } = useAcademicYears();
  const { items: terms } = useTerms();
  const { items: classes } = useClassRooms();
  const { items: sections } = useSections();
  const { items: periods } = usePeriods();
  const { items: subjects } = useSubjects();
  const { items: rooms } = useRooms();
  const { items: users } = useUsers(can("user.view"));

  if (yearsLoading) return <Spinner />;

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
    {
      name: "term_id",
      label: "Term",
      type: "select",
      options: terms.map((term) => ({
        value: String(term.id),
        label: `${term.name} (${term.academic_year?.name ?? ""})`,
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
      name: "section_id",
      label: "Section",
      type: "select",
      options: sections.map((section) => ({
        value: String(section.id),
        label: `${section.name} (${section.class_room?.name ?? ""})`,
      })),
    },
    {
      name: "period_id",
      label: "Period",
      type: "select",
      required: true,
      options: [...periods]
        .sort((a, b) => a.sequence - b.sequence)
        .map((period) => ({
          value: String(period.id),
          label: `${period.sequence}. ${period.name}`,
        })),
    },
    {
      name: "day_of_week",
      label: "Day",
      type: "select",
      required: true,
      options: DAY_OPTIONS,
    },
    {
      name: "subject_id",
      label: "Subject",
      type: "select",
      options: subjects.map((subject) => ({
        value: String(subject.id),
        label: `${subject.code} - ${subject.name}`,
      })),
    },
    {
      name: "teacher_user_id",
      label: "Teacher",
      type: "select",
      options: users.map((user) => ({
        value: String(user.id),
        label: user.name,
      })),
    },
    {
      name: "room_id",
      label: "Room",
      type: "select",
      options: rooms.map((room) => ({
        value: String(room.id),
        label: room.name,
      })),
    },
    { name: "notes", label: "Notes", span: 2 },
    { name: "is_published", label: "Published", type: "checkbox" },
  ];

  return (
    <MasterForm
      title="New timetable slot"
      description="Place one subject into a class period."
      endpoint="/v1/timetable-slots"
      redirectTo="/dashboard/timetable/slots"
      submitLabel="Create slot"
      fields={fields}
      initial={{
        academic_year_id: "",
        term_id: "",
        class_room_id: "",
        section_id: "",
        period_id: "",
        day_of_week: "1",
        subject_id: "",
        teacher_user_id: "",
        room_id: "",
        notes: "",
        is_published: false,
      }}
    />
  );
}
