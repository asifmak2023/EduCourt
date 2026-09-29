"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/useResource";
import { PermissionGate } from "@/components/PermissionGate";
import { Button, buttonClasses, Checkbox, Field, TextArea, TextInput } from "@/components/Form";
import {
  Badge,
  Card,
  DataItem,
  DataList,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Spinner,
} from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import type { BookIssue } from "@/lib/types";

export default function BookIssueDetailPage() {
  return (
    <PermissionGate permission="library.view">
      <IssueDetailView />
    </PermissionGate>
  );
}

function IssueDetailView() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { can } = useAuth();
  const { data, loading, error, reload } = useResource<BookIssue>(
    id ? `/v1/library/issues/${id}` : null
  );

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <EmptyState message="Issue record not found." />;

  const open = data.status === "issued" || data.status === "overdue";

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.book?.title ?? `Issue #${data.id}`}
        description={
          data.student ? data.student.full_name : "Library loan"
        }
        actions={
          <Link
            href="/dashboard/library/issues"
            className={buttonClasses("secondary")}
          >
            Back
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge value={data.status ?? "unknown"} />
      </div>

      <Card className="p-6">
        <DataList>
          <DataItem label="Book" value={data.book?.title ?? `#${data.book_id}`} />
          <DataItem label="Member type" value={data.member_type ?? "-"} />
          <DataItem
            label="Student"
            value={
              data.student
                ? `${data.student.full_name} (${data.student.admission_no})`
                : "-"
            }
          />
          <DataItem
            label="Staff"
            value={data.user_id ? `#${data.user_id}` : "-"}
          />
          <DataItem label="Issued on" value={data.issued_on ?? "-"} />
          <DataItem label="Due on" value={data.due_on ?? "-"} />
          <DataItem label="Returned on" value={data.returned_on ?? "-"} />
          <DataItem label="Fine" value={formatCurrency(data.fine_amount)} />
        </DataList>
        {data.notes ? (
          <p className="mt-5 border-t border-border-secondary pt-4 text-sm text-muted">
            Notes: {data.notes}
          </p>
        ) : null}
      </Card>

      {can("library.edit") && open ? (
        <ReturnAction id={data.id} onChanged={reload} />
      ) : null}
    </div>
  );
}

function ReturnAction({
  id,
  onChanged,
}: {
  id: number;
  onChanged: () => void;
}) {
  const [returnedOn, setReturnedOn] = useState("");
  const [lost, setLost] = useState(false);
  const [finePerDay, setFinePerDay] = useState("5");
  const [fineAmount, setFineAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);

    try {
      await apiFetch(`/v1/library/issues/${id}/return`, {
        method: "POST",
        body: {
          ...(returnedOn ? { returned_on: returnedOn } : {}),
          lost,
          ...(lost
            ? fineAmount
              ? { fine_amount: Number(fineAmount) }
              : {}
            : finePerDay
              ? { fine_per_day: Number(finePerDay) }
              : {}),
          ...(notes ? { notes } : {}),
        },
      });
      onChanged();
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Unable to return.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-sm font-semibold text-foreground">Return</h2>
      <p className="mt-0.5 text-xs text-muted">
        Fines accrue per day past the due date unless the copy is lost.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Returned on" htmlFor="return_date">
          <TextInput
            id="return_date"
            type="date"
            value={returnedOn}
            onChange={(event) => setReturnedOn(event.target.value)}
          />
        </Field>
        {lost ? (
          <Field label="Fine amount" htmlFor="return_fine_amount">
            <TextInput
              id="return_fine_amount"
              type="number"
              min="0"
              step="0.01"
              value={fineAmount}
              onChange={(event) => setFineAmount(event.target.value)}
            />
          </Field>
        ) : (
          <Field label="Fine per day" htmlFor="return_fine_per_day">
            <TextInput
              id="return_fine_per_day"
              type="number"
              min="0"
              step="0.01"
              value={finePerDay}
              onChange={(event) => setFinePerDay(event.target.value)}
            />
          </Field>
        )}
        <div className="sm:col-span-2">
          <Checkbox
            label="Mark as lost"
            checked={lost}
            onChange={(event) => setLost(event.target.checked)}
          />
        </div>
        <div className="sm:col-span-2">
          <Field label="Notes" htmlFor="return_notes">
            <TextArea
              id="return_notes"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </Field>
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <Button type="button" loading={busy} onClick={submit}>
          Confirm return
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
