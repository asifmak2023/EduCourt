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
import { formatDate, formatNumber } from "@/lib/format";
import type { CourseRegistration } from "@/lib/types";

export default function RegistrationDetailPage() {
  return (
    <PermissionGate permission="credit.view">
      <RegistrationDetailView />
    </PermissionGate>
  );
}

function RegistrationDetailView() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { can } = useAuth();
  const { data, loading, error, reload } = useResource<CourseRegistration>(
    id ? `/v1/course-registrations/${id}` : null
  );

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <EmptyState message="Registration not found." />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.student?.full_name ?? `Registration #${data.id}`}
        description={data.subject?.name ?? "Course registration"}
        actions={
          <Link
            href="/dashboard/credits/registrations"
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
          <DataItem label="Student" value={data.student?.full_name ?? "-"} />
          <DataItem label="Term" value={data.term?.name ?? "-"} />
          <DataItem label="Subject" value={data.subject?.name ?? "-"} />
          <DataItem
            label="Credit hours"
            value={formatNumber(data.credit_hours)}
          />
          <DataItem label="Registered on" value={formatDate(data.registered_on)} />
        </DataList>
        {data.remarks ? (
          <p className="mt-5 border-t border-border-secondary pt-4 text-sm text-muted">
            Remarks: {data.remarks}
          </p>
        ) : null}
      </Card>

      {can("credit.edit") && data.status !== "dropped" ? (
        <DropAction id={data.id} onChanged={reload} />
      ) : null}
      {can("credit.delete") ? <DeleteAction id={data.id} /> : null}
    </div>
  );
}

function DropAction({
  id,
  onChanged,
}: {
  id: number;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const drop = async () => {
    setBusy(true);
    setError(null);

    try {
      await apiFetch(`/v1/course-registrations/${id}/drop`, { method: "POST" });
      onChanged();
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Unable to drop.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Drop course</h2>
          <p className="mt-0.5 text-xs text-muted">
            Mark this registration as dropped for the term.
          </p>
        </div>
        <Button type="button" loading={busy} onClick={drop}>
          Drop
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
      await apiFetch(`/v1/course-registrations/${id}`, { method: "DELETE" });
      router.push("/dashboard/credits/registrations");
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
            Delete this registration record.
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
