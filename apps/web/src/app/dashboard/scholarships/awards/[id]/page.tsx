"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/useResource";
import { PermissionGate } from "@/components/PermissionGate";
import { Button, buttonClasses } from "@/components/Form";
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
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import type { ScholarshipAward } from "@/lib/types";

export default function ScholarshipAwardDetailPage() {
  return (
    <PermissionGate permission="scholarship.view">
      <AwardDetailView />
    </PermissionGate>
  );
}

function AwardDetailView() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { can } = useAuth();
  const { data, loading, error, reload } = useResource<ScholarshipAward>(
    id ? `/v1/scholarship-awards/${id}` : null
  );

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <EmptyState message="Award not found." />;

  const isFixed = data.scholarship?.discount_type === "fixed";
  const valueLabel =
    data.effective_value === null || data.effective_value === undefined
      ? "-"
      : isFixed
        ? formatCurrency(data.effective_value)
        : `${formatNumber(data.effective_value)}%`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.student?.name ?? `Award #${data.id}`}
        description={data.scholarship?.name ?? "Scholarship award"}
        actions={
          <Link
            href="/dashboard/scholarships/awards"
            className={buttonClasses("secondary")}
          >
            Back
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge value={data.status} />
      </div>

      <Card className="p-6">
        <DataList>
          <DataItem
            label="Student"
            value={
              data.student
                ? `${data.student.name} (${data.student.admission_no})`
                : "-"
            }
          />
          <DataItem label="Scholarship" value={data.scholarship?.name ?? "-"} />
          <DataItem label="Awarded on" value={formatDate(data.awarded_on)} />
          <DataItem label="Value" value={valueLabel} />
          <DataItem label="Approved by" value={data.approved_by ?? "-"} />
          <DataItem label="Revoked on" value={formatDate(data.revoked_on)} />
        </DataList>
        {data.notes ? (
          <p className="mt-5 border-t border-border-secondary pt-4 text-sm text-muted">
            Notes: {data.notes}
          </p>
        ) : null}
      </Card>

      {can("scholarship.approve") && data.status !== "revoked" ? (
        <RevokeAction id={data.id} onChanged={reload} />
      ) : null}
      {can("scholarship.delete") ? <DeleteAction id={data.id} /> : null}
    </div>
  );
}

function RevokeAction({
  id,
  onChanged,
}: {
  id: number;
  onChanged: () => void;
}) {
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const revoke = async () => {
    setBusy(true);
    setError(null);

    try {
      await apiFetch(`/v1/scholarship-awards/${id}/revoke`, {
        method: "POST",
        body: { ...(notes ? { notes } : {}) },
      });
      onChanged();
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Unable to revoke.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-sm font-semibold text-foreground">Revoke</h2>
      <p className="mt-0.5 text-xs text-muted">
        Revoking keeps the record but ends the concession.
      </p>
      <div className="mt-4 flex items-end gap-3">
        <input
          type="text"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Revocation note (optional)"
          className="w-full max-w-md rounded-lg border border-border-secondary px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        />
        <Button type="button" loading={busy} onClick={revoke}>
          Revoke
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

function DeleteAction({ id }: { id: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async () => {
    setBusy(true);
    setError(null);

    try {
      await apiFetch(`/v1/scholarship-awards/${id}`, { method: "DELETE" });
      router.push("/dashboard/scholarships/awards");
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Unable to delete.");
      setBusy(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Remove</h2>
          <p className="mt-0.5 text-xs text-muted">
            Archive this award record.
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
