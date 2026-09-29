"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/useResource";
import { PermissionGate } from "@/components/PermissionGate";
import { StudentAffairsTabs } from "@/components/StudentAffairsTabs";
import { Button, buttonClasses } from "@/components/Form";
import {
  Badge,
  Card,
  DataItem,
  DataList,
  EmptyState,
  ErrorNotice,
  PageHeader,
  SectionCard,
  Spinner,
  SuccessNotice,
} from "@/components/ui";
import type { StudentCertificate } from "@/lib/types";

export default function CertificateDetailPage() {
  return (
    <PermissionGate permission="student_affairs.view">
      <CertificateDetailView />
    </PermissionGate>
  );
}

function CertificateDetailView() {
  const params = useParams<{ id: string }>();
  const { can } = useAuth();
  const { data, loading, error, reload } = useResource<StudentCertificate>(
    params?.id ? `/v1/student-affairs/certificates/${params.id}` : null
  );

  const [issuing, setIssuing] = useState(false);
  const [issueError, setIssueError] = useState<string | null>(null);
  const [issued, setIssued] = useState(false);

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <EmptyState message="Certificate not found." />;

  const issue = async () => {
    setIssuing(true);
    setIssueError(null);
    try {
      await apiFetch(`/v1/student-affairs/certificates/${data.id}/issue`, {
        method: "POST",
        body: {},
      });
      setIssued(true);
      reload();
    } catch (err: unknown) {
      setIssueError(
        err instanceof ApiError ? err.message : "Unable to issue certificate."
      );
    } finally {
      setIssuing(false);
    }
  };

  return (
    <div className="space-y-6">
      <StudentAffairsTabs active="certificates" />

      <PageHeader
        title={data.title}
        description={data.type}
        actions={
          <>
            {can("student_affairs.edit") ? (
              <Link
                href={`/dashboard/student-affairs/certificates/${data.id}/edit`}
                className={buttonClasses("secondary")}
              >
                Edit
              </Link>
            ) : null}
            <Link
              href="/dashboard/student-affairs/certificates"
              className={buttonClasses("secondary")}
            >
              Back
            </Link>
          </>
        }
      />

      {issued ? <SuccessNotice message="Certificate issued." /> : null}
      {issueError ? <ErrorNotice message={issueError} /> : null}

      <SectionCard title="Certificate details">
        <DataList>
          <DataItem
            label="Student"
            value={
              data.student?.full_name ?? `Student #${data.student_id}`
            }
          />
          <DataItem label="Type" value={data.type} />
          <DataItem label="Serial number" value={data.serial_no ?? "-"} />
          <DataItem label="Issued on" value={data.issued_on ?? "-"} />
          <DataItem
            label="Status"
            value={<Badge value={data.status ?? "pending"} />}
          />
          {data.remarks ? <DataItem label="Remarks" value={data.remarks} /> : null}
        </DataList>
      </SectionCard>

      {can("student_affairs.approve") && data.status !== "issued" ? (
        <Card className="flex flex-wrap items-center justify-between gap-4 p-6">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Issue certificate
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              Assigns a serial number and marks the certificate as issued.
            </p>
          </div>
          <Button onClick={issue} loading={issuing}>
            Issue certificate
          </Button>
        </Card>
      ) : null}
    </div>
  );
}
