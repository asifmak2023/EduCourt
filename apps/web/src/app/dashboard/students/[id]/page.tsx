"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Table } from "@heroui/react";
import { useTranslation } from "@eis/i18n";
import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/useResource";
import { PermissionGate } from "@/components/PermissionGate";
import { Avatar } from "@/components/Avatar";
import { ApiError, apiFetch } from "@/lib/api";
import { Button, buttonClasses, Field, Select, TextArea, TextInput } from "@/components/Form";
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
import { formatDate, humanize } from "@/lib/format";
import type { StudentDetail } from "@/lib/types";

export default function StudentDetailPage() {
  return (
    <PermissionGate permission="student.view">
      <StudentDetailView />
    </PermissionGate>
  );
}

function StudentDetailView() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { can } = useAuth();
  const { t } = useTranslation();

  const { data, loading, error, reload } = useResource<StudentDetail>(
    id ? `/v1/students/${id}` : null
  );

  if (loading) {
    return <Spinner />;
  }

  if (error) {
    return <ErrorNotice message={error} />;
  }

  if (!data) {
    return <EmptyState message="students.notFound" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.full_name}
        description={t("students.admissionNoWith", { no: data.admission_no })}
        actions={
          <>
            <Link
              href="/dashboard/students"
              className={buttonClasses("secondary")}
            >
              {t("common.back")}
            </Link>
            {can("student.edit") || can("student.photo") ? (
              <Link
                href={`/dashboard/students/${data.id}/edit`}
                className={buttonClasses("secondary")}
              >
                {can("student.edit") ? t("common.edit") : t("students.photo")}
              </Link>
            ) : null}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-4">
        <Avatar name={data.full_name} photoUrl={data.photo_url} size="lg" />
        <div className="flex flex-wrap items-center gap-2">
          <Badge value={data.status} />
          {data.gender ? <Badge value={data.gender} /> : null}
        </div>
      </div>

      <SectionCard title="students.profileSection">
        <DataList>
          <DataItem label="students.field.dateOfBirth" value={formatDate(data.date_of_birth)} />
          <DataItem label="common.gender" value={humanize(data.gender)} />
          <DataItem label="students.field.nationalId" value={data.national_id} />
          <DataItem label="students.field.bloodGroup" value={data.blood_group} />
          <DataItem label="students.field.nationality" value={data.nationality} />
          <DataItem label="students.field.religion" value={data.religion} />
          <DataItem label="students.field.category" value={data.category} />
          <DataItem label="common.email" value={data.email} />
          <DataItem label="common.phone" value={data.phone} />
          <DataItem label="common.city" value={data.city} />
          <DataItem label="students.field.previousSchool" value={data.previous_school} />
          <DataItem
            label="students.field.admissionDate"
            value={formatDate(data.admission_date)}
          />
          <DataItem label="common.address" value={data.address} />
          <DataItem label="common.notes" value={data.notes} />
        </DataList>
      </SectionCard>

      <SectionCard
        title="students.guardians"
        description="students.guardiansDesc"
      >
        {data.guardians.length === 0 ? (
          <EmptyState message="students.noGuardians" />
        ) : (
          <ul className="divide-y divide-border">
            {data.guardians.map((guardian) => (
              <li
                key={guardian.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {guardian.name}
                  </p>
                  <p className="text-xs text-muted">
                    {[guardian.phone, guardian.email]
                      .filter(Boolean)
                      .join(" · ") || t("students.noContactDetails")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {guardian.relationship ? (
                    <Badge value={guardian.relationship} />
                  ) : null}
                  {guardian.is_primary ? <Badge value={t("common.primary")} /> : null}
                  {guardian.is_emergency_contact ? (
                    <Badge value={t("common.emergency")} />
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard
        title="students.enrollments"
        description="students.enrollmentsDesc"
      >
        {data.enrollments.length === 0 ? (
          <EmptyState message="students.noEnrollments" />
        ) : (
          <Table variant="secondary">
            <Table.ScrollContainer>
              <Table.Content aria-label={t("students.enrollments")} className="min-w-[880px]">
                <Table.Header>
                  <Table.Column isRowHeader>{t("common.academicYear")}</Table.Column>
                  <Table.Column>{t("common.class")}</Table.Column>
                  <Table.Column>{t("common.section")}</Table.Column>
                  <Table.Column>{t("common.rollNo")}</Table.Column>
                  <Table.Column>{t("common.status")}</Table.Column>
                  <Table.Column>{t("common.starts")}</Table.Column>
                  <Table.Column>{t("common.ends")}</Table.Column>
                </Table.Header>
                <Table.Body>
                  {data.enrollments.map((enrollment) => (
                    <Table.Row key={enrollment.id} id={enrollment.id}>
                      <Table.Cell className="text-foreground">
                        {enrollment.academic_year?.name ?? "-"}
                      </Table.Cell>
                      <Table.Cell className="text-foreground">
                        {enrollment.class_room?.name ?? "-"}
                      </Table.Cell>
                      <Table.Cell className="text-foreground">
                        {enrollment.section?.name ?? "-"}
                      </Table.Cell>
                      <Table.Cell className="text-foreground">
                        {enrollment.roll_number ?? "-"}
                      </Table.Cell>
                      <Table.Cell>
                        <Badge value={enrollment.status} />
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {formatDate(enrollment.starts_on)}
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {formatDate(enrollment.ends_on)}
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        )}
      </SectionCard>

      {can("student.approve") && data.status === "active" ? (
        <WithdrawPanel studentId={data.id} onDone={reload} />
      ) : null}
    </div>
  );
}

function WithdrawPanel({
  studentId,
  onDone,
}: {
  studentId: number;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("withdrawn");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const { t } = useTranslation();

  const submit = async () => {
    setBusy(true);
    setError(null);
    setDone(false);

    try {
      await apiFetch(`/v1/students/${studentId}/withdraw`, {
        method: "POST",
        body: {
          status,
          date: date || undefined,
          notes: notes || undefined,
        },
      });

      setDone(true);
      setOpen(false);
      onDone();
    } catch (err: unknown) {
      setError(
        err instanceof ApiError ? err.message : "students.withdraw.error"
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            {t("students.withdraw.title")}
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            {t("students.withdraw.desc")}
          </p>
        </div>
        <Button
          variant="secondary"
          type="button"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? t("common.cancel") : t("students.withdraw.start")}
        </Button>
      </div>

      {done ? (
        <div className="mt-4">
          <SuccessNotice message="students.withdraw.updated" />
        </div>
      ) : null}

      {open ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <Field label="common.outcome" htmlFor="withdraw-status">
            <Select
              id="withdraw-status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="withdrawn">{t("status.withdrawn")}</option>
              <option value="transferred">{t("status.transferred")}</option>
            </Select>
          </Field>
          <Field label="common.effectiveDate" htmlFor="withdraw-date">
            <TextInput
              id="withdraw-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </Field>
          <Field label="common.notes" htmlFor="withdraw-notes" className="sm:col-span-3">
            <TextArea
              id="withdraw-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </Field>
          {error ? (
            <div className="sm:col-span-3">
              <ErrorNotice message={error} />
            </div>
          ) : null}
          <div className="sm:col-span-3">
            <Button
              variant="danger"
              type="button"
              loading={busy}
              onClick={() => void submit()}
            >
              {t("common.confirm")}
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
