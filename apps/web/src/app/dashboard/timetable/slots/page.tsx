"use client";

import { academicYearSelectOptions } from "@/lib/academicYear";
import { useAcademicYears, useClassRooms, usePeriods } from "@/lib/useLookups";
import { PermissionGate } from "@/components/PermissionGate";
import { MasterList } from "@/components/MasterList";
import { Badge } from "@/components/ui";
import type { TimetableSlot } from "@/lib/types";

const DAYS: Record<number, string> = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
  7: "Sunday",
};

export default function TimetableSlotsPage() {
  return (
    <PermissionGate permission="timetable.view">
      <SlotsTable />
    </PermissionGate>
  );
}

function SlotsTable() {
  const { items: years } = useAcademicYears();
  const { items: classes } = useClassRooms();
  const { items: periods } = usePeriods();

  return (
    <MasterList<TimetableSlot>
      title="Timetable slots"
      description="Individual class-period placements."
      endpoint="/v1/timetable-slots"
      searchable={false}
      createHref="/dashboard/timetable/slots/new"
      createPermission="timetable.create"
      createLabel="New slot"
      editHref={(slot) => `/dashboard/timetable/slots/${slot.id}/edit`}
      filters={[
        {
          param: "academic_year_id",
          placeholder: "All academic years",
          options: academicYearSelectOptions(years),
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
          param: "day_of_week",
          placeholder: "All days",
          options: Object.entries(DAYS).map(([value, label]) => ({
            value,
            label,
          })),
        },
        {
          param: "period_id",
          placeholder: "All periods",
          options: [...periods]
            .sort((a, b) => a.sequence - b.sequence)
            .map((period) => ({
              value: String(period.id),
              label: `${period.sequence}. ${period.name}`,
            })),
        },
      ]}
      columns={[
        { header: "Period", render: (slot) => slot.period?.name ?? "-" },
        { header: "Day", render: (slot) => DAYS[slot.day_of_week] ?? "-" },
        { header: "Class", render: (slot) => slot.class_room?.name ?? "-" },
        { header: "Section", render: (slot) => slot.section?.name ?? "-" },
        {
          header: "Subject",
          render: (slot) => slot.subject?.name ?? "-",
        },
        { header: "Teacher", render: (slot) => slot.teacher?.name ?? "-" },
        { header: "Room", render: (slot) => slot.room?.name ?? "-" },
        {
          header: "Status",
          render: (slot) => (
            <Badge value={slot.is_published ? "active" : "draft"} />
          ),
        },
      ]}
    />
  );
}
