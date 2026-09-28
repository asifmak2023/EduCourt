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
  SuccessNotice,
} from "@/components/ui";
import { formatNumber } from "@/lib/format";
import type { ExamModeration } from "@/lib/types";

export default function ModerationDetailPage() {
  return (
    <PermissionGate permission="exam.view">
      <ModerationDetailView />
    </PermissionGate>
  );
}

function ModerationDetailView() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { can } = useAuth();

  const { data, loading, error, reload } = useResource<ExamModeration>(
    id ? `/v1/exam-moderations/${id}` : null
  );

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <EmptyState message="Moderation not found." />;

  const typeLabel =
    data.type === "grace_marks" ? "Grace marks" : data.type === "scaling" ? "Scaling" : "-";

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Moderation #${data.id}`}
        description={data.exam?.name ?? "Exam moderation"}
        actions={
          <Link
            href="/dashboard/exams/moderations"
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
          <DataItem label="Exam" value={data.exam?.name ?? "-"} />
          <DataItem
            label="Paper"
            value={`${data.paper?.class_room?.name ?? "-"} - ${
              data.paper?.subject?.name ?? "-"
            }`}
          />
          <DataItem label="Type" value={typeLabel} />
          <DataItem label="Value" value={formatNumber(data.value)} />
          <DataItem label="Applied at" value={data.applied_at ?? "-"} />
        </DataList>
        {data.reason ? (
          <p className="mt-5 border-t border-slate-100 pt-4 text-sm text-slate-600">
            {data.reason}
          </p>
        ) : null}
      </Card>

      <Actions
        moderation={data}
        canApprove={can("exam.approve")}
        canDelete={can("exam.edit")}
        onChanged={reload}
      />
    </div>
  );
}

function Actions({
  moderation,
  canApprove,
  canDelete,
  onChanged,
}: {
  moderation: ExamModeration;
  canApprove: boolean;
  canDelete: boolean;
  onChanged: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const act = async (path: string, message: string, method = "POST") => {
    setBusy(true);
    setError(null);

    try {
      await apiFetch(`/v1/exam-moderations/${moderation.id}/${path}`, {
        method,
      });
      setDone(message);
      onChanged();
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setError(null);

    try {
      await apiFetch(`/v1/exam-moderations/${moderation.id}`, {
        method: "DELETE",
      });
      router.push("/dashboard/exams/moderations");
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Unable to delete.");
      setBusy(false);
    }
  };

  const status = moderation.status;

  return (
    <Card className="p-6">
      <h2 className="text-sm font-semibold text-slate-900">Actions</h2>
      <p className="mt-0.5 text-xs text-slate-500">
        Approve a moderation, then apply it to rewrite the paper marks.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {canApprove && status === "pending" ? (
          <Button
            type="button"
            loading={busy}
            onClick={() => act("approve", "Moderation approved.")}
          >
            Approve
          </Button>
        ) : null}
        {canApprove && status === "approved" ? (
          <Button
            type="button"
            loading={busy}
            onClick={() => act("apply", "Moderation applied to marks.")}
          >
            Apply to marks
          </Button>
        ) : null}
        {canApprove && (status === "pending" || status === "approved") ? (
          <Button
            variant="danger"
            type="button"
            loading={busy}
            onClick={() => act("reject", "Moderation rejected.")}
          >
            Reject
          </Button>
        ) : null}
        {canDelete && status !== "applied" ? (
          <Button
            variant="secondary"
            type="button"
            loading={busy}
            onClick={remove}
          >
            Delete
          </Button>
        ) : null}
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
