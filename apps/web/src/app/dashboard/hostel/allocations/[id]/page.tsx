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
import type { HostelAllocation } from "@/lib/types";

export default function HostelAllocationDetailPage() {
  return (
    <PermissionGate permission="hostel.view">
      <AllocationDetailView />
    </PermissionGate>
  );
}

function AllocationDetailView() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { can } = useAuth();
  const { data, loading, error, reload } = useResource<HostelAllocation>(
    id ? `/v1/hostel-allocations/${id}` : null
  );

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <EmptyState message="Allocation not found." />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.student?.full_name ?? `Allocation #${data.id}`}
        description={
          [data.hostel?.name, data.room?.room_no].filter(Boolean).join(" · ") ||
          "Hostel allocation"
        }
        actions={
          <Link
            href="/dashboard/hostel/allocations"
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
          <DataItem label="Hostel" value={data.hostel?.name ?? "-"} />
          <DataItem label="Room" value={data.room?.room_no ?? "-"} />
          <DataItem label="Bed" value={data.bed_no ?? "-"} />
          <DataItem label="Allocated on" value={formatDate(data.allocated_on)} />
          <DataItem label="Vacated on" value={formatDate(data.vacated_on)} />
          <DataItem label="Monthly fee" value={formatCurrency(data.monthly_fee)} />
        </DataList>
        {data.notes ? (
          <p className="mt-5 border-t border-border-secondary pt-4 text-sm text-muted">
            Notes: {data.notes}
          </p>
        ) : null}
      </Card>

      {can("hostel.edit") && data.status !== "vacated" ? (
        <VacateAction id={data.id} onChanged={reload} />
      ) : null}
    </div>
  );
}

function VacateAction({
  id,
  onChanged,
}: {
  id: number;
  onChanged: () => void;
}) {
  const [vacatedOn, setVacatedOn] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);

    try {
      await apiFetch(`/v1/hostel-allocations/${id}/vacate`, {
        method: "POST",
        body: vacatedOn ? { vacated_on: vacatedOn } : {},
      });
      onChanged();
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Unable to vacate.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-sm font-semibold text-foreground">Vacate room</h2>
      <p className="mt-0.5 text-xs text-muted">
        Frees the bed and closes the allocation.
      </p>
      <div className="mt-4 max-w-xs">
        <Field label="Vacated on" htmlFor="vacate_date">
          <TextInput
            id="vacate_date"
            type="date"
            value={vacatedOn}
            onChange={(event) => setVacatedOn(event.target.value)}
          />
        </Field>
      </div>
      <div className="mt-4 flex justify-end">
        <Button type="button" loading={busy} onClick={submit}>
          Vacate
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
