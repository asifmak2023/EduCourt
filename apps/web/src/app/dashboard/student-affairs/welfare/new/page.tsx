"use client";

import { StudentAffairsTabs } from "@/components/StudentAffairsTabs";
import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import { useStudents } from "@/lib/useLookups";
import {
  WELFARE_STATUS_OPTIONS,
  WELFARE_TYPE_OPTIONS,
} from "@/lib/studentAffairsOptions";

export default function NewWelfareRecordPage() {
  return (
    <PermissionGate permission="student_affairs.create">
      <NewWelfareRecordForm />
    </PermissionGate>
  );
}

function NewWelfareRecordForm() {
  const { items: students } = useStudents();

  return (
    <div className="space-y-6">
      <StudentAffairsTabs active="welfare" />
      <MasterForm
        title="New welfare record"
        description="Log a welfare, health, medical or incident record."
        endpoint="/v1/student-affairs/welfare-records"
        redirectTo="/dashboard/student-affairs/welfare"
        submitLabel="Create record"
        fields={[
          {
            name: "student_id",
            label: "Student",
            type: "select",
            required: true,
            span: 2,
            options: students.map((student) => ({
              value: String(student.id),
              label: `${student.full_name} (${student.admission_no})`,
            })),
          },
          {
            name: "type",
            label: "Type",
            type: "select",
            required: true,
            options: WELFARE_TYPE_OPTIONS,
          },
          {
            name: "status",
            label: "Status",
            type: "select",
            options: WELFARE_STATUS_OPTIONS,
          },
          { name: "title", label: "Title", required: true },
          { name: "recorded_on", label: "Recorded on", type: "date", required: true },
          { name: "description", label: "Description", span: 2 },
          { name: "follow_up", label: "Follow up", span: 2 },
        ]}
        initial={{
          student_id: "",
          type: "welfare",
          status: "open",
          title: "",
          recorded_on: "",
          description: "",
          follow_up: "",
        }}
      />
    </div>
  );
}
