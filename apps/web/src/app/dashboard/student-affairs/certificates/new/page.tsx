"use client";

import { StudentAffairsTabs } from "@/components/StudentAffairsTabs";
import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import { useStudents } from "@/lib/useLookups";
import { CERTIFICATE_STATUS_OPTIONS } from "@/lib/studentAffairsOptions";

export default function NewCertificatePage() {
  return (
    <PermissionGate permission="student_affairs.create">
      <NewCertificateForm />
    </PermissionGate>
  );
}

function NewCertificateForm() {
  const { items: students } = useStudents();

  return (
    <div className="space-y-6">
      <StudentAffairsTabs active="certificates" />
      <MasterForm
        title="New certificate"
        description="Record a certificate. Issue it from the detail page."
        endpoint="/v1/student-affairs/certificates"
        redirectTo="/dashboard/student-affairs/certificates"
        submitLabel="Create certificate"
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
          { name: "type", label: "Type", required: true },
          { name: "title", label: "Title", required: true },
          {
            name: "status",
            label: "Status",
            type: "select",
            options: CERTIFICATE_STATUS_OPTIONS,
          },
          { name: "serial_no", label: "Serial number" },
          { name: "issued_on", label: "Issued on", type: "date" },
          { name: "remarks", label: "Remarks", span: 2 },
        ]}
        initial={{
          student_id: "",
          type: "",
          title: "",
          status: "pending",
          serial_no: "",
          issued_on: "",
          remarks: "",
        }}
      />
    </div>
  );
}
