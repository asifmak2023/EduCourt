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
import { formatCurrency } from "@/lib/format";
import type { ExamSupplementary } from "@/lib/types";

export default function SupplementaryDetailPage() {
  return (
    <PermissionGate permission="exam.view">
      <SupplementaryDetailView />
    </PermissionGate>
  );
}

function SupplementaryDetailView() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { can } = useAuth();
  const { data, loading, error, reload } = useResource<ExamSupplementary>(
    id ? `/v1/exam-supplementaries/${id}` : null
  );

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <EmptyState message="Registration not found." />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.student?.full_name ?? `Registration #${data.id}`}
        description={data.original_exam?.name ?? "Supplementary exam"}
        actions={
          <Link
            href="/dashboard/exams/supplementaries"
            className={buttonClasses("secondary")}
          >
            Back
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge value={data.status} />
        <Badge value={data.is_paid ? "paid" : "unpaid"} />
      </div>

      <Card className="p-6">
        <DataList>
          <DataItem label="Original exam" value={data.original_exam?.name ?? "-"} />
          <DataItem label="Target exam" value={data.exam?.name ?? "-"} />
          <DataItem label="Subject" value={data.subject?.name ?? "-"} />
          <DataItem label="Fee" value={formatCurrency(data.fee_amount)} />
          <DataItem label="Approved at" value={data.approved_at ?? "-"} />
        </DataList>
        {data.remarks ? (
          <p className="mt-5 border-t border-border-secondary pt-4 text-sm text-muted">
            Remarks: {data.remarks}
          </p>
        ) : null}
      </Card>

      <StatusActions data={data} can={can} onChanged={reload} />

      {can("exam.edit") ? <DeleteAction id={data.id} /> : null}
    </div>
  );
}

function StatusActions({
  data,
  can,
  onChanged,
}: {
  data: ExamSupplementary;
  can: (permission: string) => boolean;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: "approve" | "reject" | "complete") => {
    setBusy(action);
    setError(null);

    try {
      await apiFetch(`/v1/exam-supplementaries/${data.id}/${action}`, {
        method: "POST",
      });
      onChanged();
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Action failed.");
    } finally {
      setBusy(null);
    }
  };

  const canApprove = can("exam.approve");
  const canEdit = can("exam.edit");

  if (data.status === "completed") {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted">
          This supplementary exam is completed; no further actions are available.
        </p>
      </Card>
    );
  }

  const showApprove = canApprove && data.status === "registered";
  const showReject = canApprove && data.status === "registered";
  const showComplete = canEdit && data.status === "approved";

  if (!showApprove && !showReject && !showComplete) {
    return null;
  }

  return (
    <Card className="p-6">
      <h2 className="text-sm font-semibold text-foreground">Actions</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {showApprove ? (
          <Button
            type="button"
            loading={busy === "approve"}
            onClick={() => run("approve")}
          >
            Approve
          </Button>
        ) : null}
        {showComplete ? (
          <Button
            type="button"
            loading={busy === "complete"}
            onClick={() => run("complete")}
          >
            Mark completed
          </Button>
        ) : null}
        {showReject ? (
          <Button
            type="button"
            variant="danger"
            loading={busy === "reject"}
            onClick={() => run("reject")}
          >
            Reject
          </Button>
        ) : null}
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
      await apiFetch(`/v1/exam-supplementaries/${id}`, { method: "DELETE" });
      router.push("/dashboard/exams/supplementaries");
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
            Archive this registration.
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
