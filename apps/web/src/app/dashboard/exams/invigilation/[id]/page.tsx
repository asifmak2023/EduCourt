"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/useResource";
import { PermissionGate } from "@/components/PermissionGate";
import {
  Button,
  Field,
  Select,
  TextArea,
  buttonClasses,
} from "@/components/Form";
import {
  Badge,
  Card,
  DataItem,
  DataList,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Spinner,
  SuccessNotice,
} from "@/components/ui";
import type { InvigilationDuty } from "@/lib/types";

const ROLES = [
  { value: "chief", label: "Chief invigilator" },
  { value: "assistant", label: "Assistant invigilator" },
];

export default function InvigilationDetailPage() {
  return (
    <PermissionGate permission="exam.view">
      <InvigilationDetailView />
    </PermissionGate>
  );
}

function InvigilationDetailView() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { can } = useAuth();

  const { data, loading, error, reload } = useResource<InvigilationDuty>(
    id ? `/v1/invigilation-duties/${id}` : null
  );

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <EmptyState message="Duty not found." />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.user?.name ?? `Duty #${data.id}`}
        description="Invigilation duty"
        actions={
          <Link
            href="/dashboard/exams/invigilation"
            className={buttonClasses("secondary")}
          >
            Back
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge value={data.role} />
      </div>

      <Card className="p-6">
        <DataList>
          <DataItem label="Invigilator" value={data.user?.name ?? "-"} />
          <DataItem
            label="Paper"
            value={
              data.paper
                ? `${data.paper.class_room?.name ?? "-"} - ${
                    data.paper.subject?.name ?? "-"
                  }`
                : `Paper #${data.exam_paper_id}`
            }
          />
          <DataItem label="Exam date" value={data.paper?.exam_date ?? "-"} />
          <DataItem
            label="Assigned"
            value={data.created_at ? data.created_at : "-"}
          />
        </DataList>
        {data.notes ? (
          <p className="mt-5 border-t border-slate-100 pt-4 text-sm text-slate-600">
            Notes: {data.notes}
          </p>
        ) : null}
      </Card>

      {can("exam.edit") ? (
        <EditActions duty={data} onChanged={reload} />
      ) : null}
      {can("exam.edit") ? <DeleteAction id={data.id} /> : null}
    </div>
  );
}

function EditActions({
  duty,
  onChanged,
}: {
  duty: InvigilationDuty;
  onChanged: () => void;
}) {
  const [role, setRole] = useState(duty.role ?? "assistant");
  const [notes, setNotes] = useState(duty.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);

    try {
      await apiFetch(`/v1/invigilation-duties/${duty.id}`, {
        method: "PUT",
        body: { role, notes },
      });
      setDone("Duty updated.");
      onChanged();
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Unable to update.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-sm font-semibold text-slate-900">Edit duty</h2>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Role" htmlFor="edit_role" required>
          <Select
            id="edit_role"
            value={role}
            onChange={(event) => setRole(event.target.value)}
          >
            {ROLES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Notes" htmlFor="edit_notes">
          <TextArea
            id="edit_notes"
            rows={2}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </Field>
      </div>

      <div className="mt-4 flex justify-end">
        <Button type="button" loading={busy} onClick={submit}>
          Save changes
        </Button>
      </div>

      {done ? (
        <div className="mt-4">
          <SuccessNotice message={done} />
        </div>
      ) : null}
      {error ? (
        <div className="mt-4">
          <ErrorNotice message={error} />
        </div>
      ) : null}
    </Card>
  );
}

function DeleteAction({ id }: { id: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async () => {
    setBusy(true);
    setError(null);

    try {
      await apiFetch(`/v1/invigilation-duties/${id}`, { method: "DELETE" });
      router.push("/dashboard/exams/invigilation");
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Unable to delete.");
      setBusy(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Remove</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Unassign this invigilator.
          </p>
        </div>
        <Button variant="danger" type="button" loading={busy} onClick={remove}>
          Delete
        </Button>
      </div>
      {error ? (
        <div className="mt-4">
          <ErrorNotice message={error} />
        </div>
      ) : null}
    </Card>
  );
}
