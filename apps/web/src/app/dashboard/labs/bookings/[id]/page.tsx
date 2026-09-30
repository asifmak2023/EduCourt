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
import type { LabBooking } from "@/lib/types";
import { formatDate } from "@/lib/format";

export default function LabBookingDetailPage() {
  return (
    <PermissionGate permission="lab.view">
      <BookingDetailView />
    </PermissionGate>
  );
}

function BookingDetailView() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { can } = useAuth();
  const { data, loading, error, reload } = useResource<LabBooking>(
    id ? `/v1/lab-bookings/${id}` : null
  );

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <EmptyState message="Booking not found." />;

  const active = data.status === "scheduled";

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.lab?.name ?? `Booking #${data.id}`}
        description={data.purpose ?? "Lab session"}
        actions={
          <Link
            href="/dashboard/labs/bookings"
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
          <DataItem label="Lab" value={data.lab?.name ?? `#${data.lab_id}`} />
          <DataItem label="Class" value={data.class_room?.name ?? "-"} />
          <DataItem label="Teacher" value={data.teacher?.name ?? "-"} />
          <DataItem label="Session date" value={formatDate(data.session_date)} />
          <DataItem
            label="Time"
            value={
              data.start_time && data.end_time
                ? `${data.start_time} - ${data.end_time}`
                : "-"
            }
          />
          <DataItem label="Purpose" value={data.purpose ?? "-"} />
        </DataList>
      </Card>

      {can("lab.edit") && active ? (
        <Card className="p-6">
          <h2 className="text-sm font-semibold text-foreground">
            Update status
          </h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <StatusAction
              id={data.id}
              action="complete"
              label="Mark completed"
              onChanged={reload}
            />
            <StatusAction
              id={data.id}
              action="cancel"
              label="Cancel booking"
              variant="danger"
              onChanged={reload}
            />
          </div>
        </Card>
      ) : null}

      {can("lab.delete") ? <DeleteAction id={data.id} /> : null}
    </div>
  );
}

function StatusAction({
  id,
  action,
  label,
  variant = "primary",
  onChanged,
}: {
  id: number;
  action: "complete" | "cancel";
  label: string;
  variant?: "primary" | "danger";
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);

    try {
      await apiFetch(`/v1/lab-bookings/${id}/${action}`, { method: "POST" });
      onChanged();
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Unable to update.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <Button variant={variant} type="button" loading={busy} onClick={run}>
        {label}
      </Button>
      {error ? (
        <div className="mt-2">
          <ErrorNotice message={error} />
        </div>
      ) : null}
    </div>
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
      await apiFetch(`/v1/lab-bookings/${id}`, { method: "DELETE" });
      router.push("/dashboard/labs/bookings");
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
            Archive this booking record.
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
