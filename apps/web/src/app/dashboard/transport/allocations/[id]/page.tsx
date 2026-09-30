"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/useResource";
import { PermissionGate } from "@/components/PermissionGate";
import { Button, buttonClasses, Field, TextInput } from "@/components/Form";
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
import { formatCurrency, formatDate } from "@/lib/format";
import type { TransportAllocation } from "@/lib/types";

export default function TransportAllocationDetailPage() {
  return (
    <PermissionGate permission="transport.view">
      <AllocationDetailView />
    </PermissionGate>
  );
}

function AllocationDetailView() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { can } = useAuth();
  const { data, loading, error, reload } = useResource<TransportAllocation>(
    id ? `/v1/transport/allocations/${id}` : null
  );

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <EmptyState message="Allocation not found." />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.student?.full_name ?? `Allocation #${data.id}`}
        description={data.route?.name ?? "Transport allocation"}
        actions={
          <Link
            href="/dashboard/transport/allocations"
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
          <DataItem label="Route" value={data.route?.name ?? "-"} />
          <DataItem label="Stop" value={data.stop?.name ?? "-"} />
          <DataItem label="Vehicle" value={data.vehicle?.name ?? "-"} />
          <DataItem label="Direction" value={data.direction ?? "-"} />
          <DataItem label="Start date" value={formatDate(data.start_date)} />
          <DataItem label="End date" value={formatDate(data.end_date)} />
          <DataItem label="Fare" value={formatCurrency(data.fare)} />
        </DataList>
        {data.notes ? (
          <p className="mt-5 border-t border-border-secondary pt-4 text-sm text-muted">
            Notes: {data.notes}
          </p>
        ) : null}
      </Card>

      {can("transport.edit") && data.status === "active" ? (
        <DeallocateAction id={data.id} onChanged={reload} />
      ) : null}
    </div>
  );
}

function DeallocateAction({
  id,
  onChanged,
}: {
  id: number;
  onChanged: () => void;
}) {
  const [endDate, setEndDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);

    try {
      await apiFetch(`/v1/transport/allocations/${id}/deallocate`, {
        method: "POST",
        body: endDate ? { end_date: endDate } : {},
      });
      onChanged();
    } catch (err: unknown) {
      setError(
        err instanceof ApiError ? err.message : "Unable to deallocate."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-sm font-semibold text-foreground">End allocation</h2>
      <p className="mt-0.5 text-xs text-muted">
        Ends the student&apos;s transport allocation on the chosen date.
      </p>
      <div className="mt-4 max-w-xs">
        <Field label="End date" htmlFor="deallocate_date">
          <TextInput
            id="deallocate_date"
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
          />
        </Field>
      </div>
      <div className="mt-4 flex justify-end">
        <Button type="button" loading={busy} onClick={submit}>
          Deallocate
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
