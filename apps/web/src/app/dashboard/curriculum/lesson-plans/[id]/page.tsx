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
import type { LessonPlan } from "@/lib/types";

export default function LessonPlanDetailPage() {
  return (
    <PermissionGate permission="curriculum.view">
      <LessonPlanDetailView />
    </PermissionGate>
  );
}

function LessonPlanDetailView() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { can } = useAuth();
  const { data, loading, error, reload } = useResource<LessonPlan>(
    id ? `/v1/lesson-plans/${id}` : null
  );

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <EmptyState message="Lesson plan not found." />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.title}
        description={`${data.class_room?.name ?? "-"} - ${
          data.subject?.name ?? "-"
        }`}
        actions={
          <>
            <Link
              href="/dashboard/curriculum/lesson-plans"
              className={buttonClasses("secondary")}
            >
              Back
            </Link>
            {can("curriculum.edit") ? (
              <Link
                href={`/dashboard/curriculum/lesson-plans/${data.id}/edit`}
                className={buttonClasses()}
              >
                Edit
              </Link>
            ) : null}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge value={data.status} />
      </div>

      <Card className="p-6">
        <DataList>
          <DataItem label="Syllabus unit" value={data.syllabus_unit?.title ?? "-"} />
          <DataItem label="Term" value={data.syllabus_unit?.term?.name ?? "-"} />
          <DataItem label="Planned from" value={data.planned_from ?? "-"} />
          <DataItem label="Planned to" value={data.planned_to ?? "-"} />
          <DataItem label="Approved at" value={data.approved_at ?? "-"} />
        </DataList>

        <div className="mt-5 space-y-4 border-t border-border pt-4">
          {(
            [
              ["Objectives", data.objectives],
              ["Content", data.content],
              ["Resources", data.resources],
              ["Activities", data.activities],
              ["Assessment", data.assessment],
            ] as const
          ).map(([label, value]) =>
            value ? (
              <div key={label}>
                <h3 className="text-xs font-medium uppercase tracking-wide text-muted">
                  {label}
                </h3>
                <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
                  {value}
                </p>
              </div>
            ) : null
          )}
        </div>
      </Card>

      {can("curriculum.approve") && data.status !== "approved" ? (
        <ApproveAction id={data.id} onChanged={reload} />
      ) : null}
      {can("curriculum.delete") ? <DeleteAction id={data.id} /> : null}
    </div>
  );
}

function ApproveAction({
  id,
  onChanged,
}: {
  id: number;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const approve = async () => {
    setBusy(true);
    setError(null);

    try {
      await apiFetch(`/v1/lesson-plans/${id}/approve`, { method: "POST" });
      onChanged();
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Unable to approve.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Approval</h2>
          <p className="mt-0.5 text-xs text-muted">
            Approve this lesson plan to lock it.
          </p>
        </div>
        <Button type="button" loading={busy} onClick={approve}>
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

function DeleteAction({ id }: { id: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async () => {
    setBusy(true);
    setError(null);

    try {
      await apiFetch(`/v1/lesson-plans/${id}`, { method: "DELETE" });
      router.push("/dashboard/curriculum/lesson-plans");
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
            Delete this lesson plan.
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
