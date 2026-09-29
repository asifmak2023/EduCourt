"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Table } from "@heroui/react";
import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/useResource";
import { PermissionGate } from "@/components/PermissionGate";
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
    return <EmptyState message="Student not found." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.full_name}
        description={`Admission no ${data.admission_no}`}
        actions={
          <>
            <Link
              href="/dashboard/students"
              className={buttonClasses("secondary")}
            >
              Back
            </Link>
            {can("student.edit") ? (
              <Link
                href={`/dashboard/students/${data.id}/edit`}
                className={buttonClasses("secondary")}
              >
                Edit
              </Link>
            ) : null}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge value={data.status} />
        {data.gender ? <Badge value={data.gender} /> : null}
      </div>

      <SectionCard title="Profile">
        <DataList>
          <DataItem label="Date of birth" value={formatDate(data.date_of_birth)} />
          <DataItem label="Gender" value={humanize(data.gender)} />
          <DataItem label="National ID" value={data.national_id} />
          <DataItem label="Blood group" value={data.blood_group} />
          <DataItem label="Nationality" value={data.nationality} />
          <DataItem label="Religion" value={data.religion} />
          <DataItem label="Category" value={data.category} />
          <DataItem label="Email" value={data.email} />
          <DataItem label="Phone" value={data.phone} />
          <DataItem label="City" value={data.city} />
          <DataItem label="Previous school" value={data.previous_school} />
          <DataItem
            label="Admission date"
            value={formatDate(data.admission_date)}
          />
          <DataItem label="Address" value={data.address} />
          <DataItem label="Notes" value={data.notes} />
        </DataList>
      </SectionCard>

      <SectionCard
        title="Guardians"
        description="Contacts linked to this student."
      >
        {data.guardians.length === 0 ? (
          <EmptyState message="No guardians linked yet." />
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
                      .join(" · ") || "No contact details"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {guardian.relationship ? (
                    <Badge value={guardian.relationship} />
                  ) : null}
                  {guardian.is_primary ? <Badge value="primary" /> : null}
                  {guardian.is_emergency_contact ? (
                    <Badge value="emergency" />
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard
        title="Enrollments"
        description="Class placement history."
      >
        {data.enrollments.length === 0 ? (
          <EmptyState message="No enrollments recorded." />
        ) : (
          <Table variant="secondary">
            <Table.ScrollContainer>
              <Table.Content aria-label="Enrollments" className="min-w-[880px]">
                <Table.Header>
                  <Table.Column isRowHeader>Academic year</Table.Column>
                  <Table.Column>Class</Table.Column>
                  <Table.Column>Section</Table.Column>
                  <Table.Column>Roll no</Table.Column>
                  <Table.Column>Status</Table.Column>
                  <Table.Column>Starts</Table.Column>
                  <Table.Column>Ends</Table.Column>
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
        err instanceof ApiError ? err.message : "Unable to withdraw student."
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
            Withdraw or transfer
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            Closes all active enrollments for this student.
          </p>
        </div>
        <Button
          variant="secondary"
          type="button"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Cancel" : "Start"}
        </Button>
      </div>

      {done ? (
        <div className="mt-4">
          <SuccessNotice message="Student record updated." />
        </div>
      ) : null}

      {open ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <Field label="Outcome" htmlFor="withdraw-status">
            <Select
              id="withdraw-status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="withdrawn">Withdrawn</option>
              <option value="transferred">Transferred</option>
            </Select>
          </Field>
          <Field label="Effective date" htmlFor="withdraw-date">
            <TextInput
              id="withdraw-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </Field>
          <Field label="Notes" htmlFor="withdraw-notes" className="sm:col-span-3">
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
              Confirm
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
