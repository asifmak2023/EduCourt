"use client";

import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/useResource";
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
import { ErrorNotice, Spinner } from "@/components/ui";
import type { TimetableSlot } from "@/lib/types";

const DAY_OPTIONS = [
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
  { value: "7", label: "Sunday" },
];

export default function EditTimetableSlotPage() {
  return (
    <PermissionGate permission="timetable.edit">
      <EditSlotLoader />
    </PermissionGate>
  );
}

function EditSlotLoader() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { can } = useAuth();
  const { data, loading, error } = useResource<TimetableSlot>(
    id ? `/v1/timetable-slots/${id}` : null
  );
  const { items: years, loading: yearsLoading } = useAcademicYears();
  const { items: terms } = useTerms();
  const { items: classes } = useClassRooms();
  const { items: sections } = useSections();
  const { items: periods } = usePeriods();
  const { items: subjects } = useSubjects();
  const { items: rooms } = useRooms();
  const { items: users } = useUsers(can("user.view"));

  if (loading || yearsLoading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <ErrorNotice message="Timetable slot not found." />;

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
      title="Edit timetable slot"
      endpoint="/v1/timetable-slots"
      recordId={data.id}
      redirectTo="/dashboard/timetable/slots"
      fields={fields}
      initial={{
        academic_year_id: String(data.academic_year_id),
        term_id: data.term_id === null ? "" : String(data.term_id),
        class_room_id: String(data.class_room_id),
        section_id: data.section_id === null ? "" : String(data.section_id),
        period_id: String(data.period_id),
        day_of_week: String(data.day_of_week),
        subject_id: data.subject_id === null ? "" : String(data.subject_id),
        teacher_user_id:
          data.teacher_user_id === null ? "" : String(data.teacher_user_id),
        room_id: data.room_id === null ? "" : String(data.room_id),
        notes: data.notes ?? "",
        is_published: data.is_published,
      }}
    />
  );
}
