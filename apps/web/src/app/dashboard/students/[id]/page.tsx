"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
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
          <ul className="divide-y divide-slate-100">
            {data.guardians.map((guardian) => (
              <li
                key={guardian.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {guardian.name}
                  </p>
                  <p className="text-xs text-slate-500">
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
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Academic year</th>
                  <th className="px-4 py-2 font-medium">Class</th>
                  <th className="px-4 py-2 font-medium">Section</th>
                  <th className="px-4 py-2 font-medium">Roll no</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Starts</th>
                  <th className="px-4 py-2 font-medium">Ends</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.enrollments.map((enrollment) => (
                  <tr key={enrollment.id}>
                    <td className="px-4 py-2 text-slate-700">
                      {enrollment.academic_year?.name ?? "-"}
                    </td>
                    <td className="px-4 py-2 text-slate-700">
                      {enrollment.class_room?.name ?? "-"}
                    </td>
                    <td className="px-4 py-2 text-slate-700">
                      {enrollment.section?.name ?? "-"}
                    </td>
                    <td className="px-4 py-2 text-slate-700">
                      {enrollment.roll_number ?? "-"}
                    </td>
                    <td className="px-4 py-2">
                      <Badge value={enrollment.status} />
                    </td>
                    <td className="px-4 py-2 text-slate-500">
                      {formatDate(enrollment.starts_on)}
                    </td>
                    <td className="px-4 py-2 text-slate-500">
                      {formatDate(enrollment.ends_on)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
          <h2 className="text-sm font-semibold text-slate-900">
            Withdraw or transfer
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
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
