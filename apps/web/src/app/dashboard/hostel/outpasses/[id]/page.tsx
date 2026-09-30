"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/useResource";
import { formatDateTime } from "@/lib/format";
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
import type { HostelOutpass } from "@/lib/types";

export default function HostelOutpassDetailPage() {
  return (
    <PermissionGate permission="hostel.view">
      <OutpassDetailView />
    </PermissionGate>
  );
}

function OutpassDetailView() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { can } = useAuth();
  const { data, loading, error, reload } = useResource<HostelOutpass>(
    id ? `/v1/hostel-outpasses/${id}` : null
  );

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <EmptyState message="Outpass not found." />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.student?.full_name ?? `Outpass #${data.id}`}
        description="Hostel outpass"
        actions={
          <Link
            href="/dashboard/hostel/outpasses"
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
          <DataItem
            label="Student"
            value={
              data.student
                ? `${data.student.full_name} (${data.student.admission_no})`
                : `#${data.student_id}`
            }
          />
          <DataItem label="From" value={formatDateTime(data.from_datetime)} />
          <DataItem label="To" value={formatDateTime(data.to_datetime)} />
          <DataItem label="Reason" value={data.reason} />
          <DataItem label="Approved at" value={formatDateTime(data.approved_at)} />
        </DataList>
      </Card>

      {can("hostel.edit") ? (
        <OutpassActions outpass={data} onChanged={reload} />
      ) : null}
    </div>
  );
}

function OutpassActions({
  outpass,
  onChanged,
}: {
  outpass: HostelOutpass;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const act = async (action: string, label: string) => {
    setBusy(action);
    setError(null);

    try {
      await apiFetch(`/v1/hostel-outpasses/${outpass.id}/${action}`, {
        method: "POST",
      });
      onChanged();
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : `Unable to ${label}.`);
    } finally {
      setBusy(null);
    }
  };

  if (outpass.status === "pending") {
    return (
      <Card className="p-6">
        <h2 className="text-sm font-semibold text-foreground">Decision</h2>
        <div className="mt-4 flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            loading={busy === "reject"}
            onClick={() => act("reject", "reject")}
          >
            Reject
          </Button>
          <Button
            type="button"
            loading={busy === "approve"}
            onClick={() => act("approve", "approve")}
          >
            Approve
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

  if (outpass.status === "approved") {
    return (
      <Card className="p-6">
        <h2 className="text-sm font-semibold text-foreground">Return</h2>
        <p className="mt-0.5 text-xs text-muted">
          Mark the boarder as returned to close the outpass.
        </p>
        <div className="mt-4 flex justify-end">
          <Button
            type="button"
            loading={busy === "return"}
            onClick={() => act("return", "mark returned")}
          >
            Mark returned
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

  return null;
}
