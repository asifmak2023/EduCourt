"use client";

import { StudentAffairsTabs } from "@/components/StudentAffairsTabs";
import { MasterList } from "@/components/MasterList";
import { Badge } from "@/components/ui";
import { CERTIFICATE_STATUS_OPTIONS } from "@/lib/studentAffairsOptions";
import type { StudentCertificate } from "@/lib/types";
import { formatDate } from "@/lib/format";

export default function CertificatesPage() {
  return (
    <div className="space-y-6">
      <StudentAffairsTabs active="certificates" />
      <MasterList<StudentCertificate>
        title="Certificates"
        description="Issue and track student certificates."
        endpoint="/v1/student-affairs/certificates"
        searchable={false}
        createHref="/dashboard/student-affairs/certificates/new"
        createPermission="student_affairs.create"
        createLabel="New certificate"
        editHref={(certificate) =>
          `/dashboard/student-affairs/certificates/${certificate.id}`
        }
        filters={[
          {
            param: "status",
            placeholder: "All statuses",
            options: CERTIFICATE_STATUS_OPTIONS,
          },
        ]}
        columns={[
          { header: "Title", render: (certificate) => certificate.title },
          { header: "Type", render: (certificate) => certificate.type },
          {
            header: "Student",
            render: (certificate) =>
              certificate.student?.full_name ??
              `Student #${certificate.student_id}`,
          },
          { header: "Serial", render: (certificate) => certificate.serial_no ?? "-" },
          { header: "Issued on", render: (certificate) => formatDate(certificate.issued_on) },
          {
            header: "Status",
            render: (certificate) => (
              <Badge value={certificate.status ?? "pending"} />
            ),
          },
        ]}
      />
    </div>
  );
}
