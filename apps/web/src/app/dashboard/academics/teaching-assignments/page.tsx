"use client";

import { useAuth } from "@/lib/auth";
import {
  useAcademicYears,
  useClassRooms,
  useSubjects,
  useUsers,
} from "@/lib/useLookups";
import { PermissionGate } from "@/components/PermissionGate";
import { MasterList } from "@/components/MasterList";
import { Badge } from "@/components/ui";
import type { TeachingAssignment } from "@/lib/types";

export default function TeachingAssignmentsPage() {
  return (
    <PermissionGate permission="academic.view">
      <TeachingAssignmentsTable />
    </PermissionGate>
  );
}

function TeachingAssignmentsTable() {
  const { can } = useAuth();
  const { items: years } = useAcademicYears();
  const { items: classes } = useClassRooms();
  const { items: subjects } = useSubjects();
  const { items: users } = useUsers(can("user.view"));

  const filters = [
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
  ];

  if (can("user.view")) {
    filters.push({
      param: "teacher_user_id",
      placeholder: "All teachers",
      options: users.map((user) => ({
        value: String(user.id),
        label: user.name,
      })),
    });
  }

  return (
    <MasterList<TeachingAssignment>
      title="Teaching assignments"
      description="Which teacher takes a subject for a class."
      endpoint="/v1/teaching-assignments"
      searchable={false}
      createHref="/dashboard/academics/teaching-assignments/new"
      createPermission="academic.create"
      createLabel="New assignment"
      editHref={(assignment) =>
        `/dashboard/academics/teaching-assignments/${assignment.id}/edit`
      }
      filters={filters}
      columns={[
        { header: "Teacher", render: (assignment) => assignment.teacher?.name ?? "-" },
        { header: "Subject", render: (assignment) => assignment.subject?.name ?? "-" },
        { header: "Class", render: (assignment) => assignment.class_room?.name ?? "-" },
        { header: "Section", render: (assignment) => assignment.section?.name ?? "-" },
        {
          header: "Weekly periods",
          align: "right",
          render: (assignment) => assignment.weekly_periods ?? "-",
        },
        {
          header: "Status",
          render: (assignment) => (
            <Badge value={assignment.is_active ? "active" : "inactive"} />
          ),
        },
      ]}
    />
  );
}
