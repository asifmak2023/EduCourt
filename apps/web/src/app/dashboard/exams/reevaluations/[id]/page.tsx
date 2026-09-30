"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/useResource";
import { formatDateTime } from "@/lib/format";
import { PermissionGate } from "@/components/PermissionGate";
import { Button, Field, Select, TextInput, buttonClasses } from "@/components/Form";
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
import type { ExamReevaluation } from "@/lib/types";

const STATUSES = [
  { value: "under_review", label: "Under review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export default function ReevaluationDetailPage() {
  return (
    <PermissionGate permission="exam.view">
      <ReevaluationDetailView />
    </PermissionGate>
  );
}

function ReevaluationDetailView() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { can } = useAuth();

  const { data, loading, error, reload } = useResource<ExamReevaluation>(
    id ? `/v1/exam-reevaluations/${id}` : null
  );

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <EmptyState message="Re-evaluation not found." />;

  const isFinal = data.status === "completed";

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.student?.full_name ?? `Re-evaluation #${data.id}`}
        description={data.exam?.name ?? "Re-evaluation"}
        actions={
          <Link
            href="/dashboard/exams/reevaluations"
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
          <DataItem
            label="Original marks"
            value={data.original_marks === null ? "-" : String(data.original_marks)}
          />
          <DataItem
            label="Revised marks"
            value={data.revised_marks === null ? "-" : String(data.revised_marks)}
          />
          <DataItem label="Reviewed at" value={formatDateTime(data.reviewed_at)} />
        </DataList>
        {data.reason ? (
          <p className="mt-5 border-t border-border-secondary pt-4 text-sm text-muted">
            Reason: {data.reason}
          </p>
        ) : null}
        {data.remarks ? (
          <p className="mt-2 text-sm text-muted">Remarks: {data.remarks}</p>
        ) : null}
      </Card>

      {can("exam.approve") && !isFinal ? (
        <ReviewActions reevaluationId={data.id} onChanged={reload} />
      ) : null}
      {can("exam.edit") ? (
        <DeleteAction reevaluationId={data.id} />
      ) : null}
    </div>
  );
}

function ReviewActions({
  reevaluationId,
  onChanged,
}: {
  reevaluationId: number;
  onChanged: () => void;
}) {
  const [status, setStatus] = useState("under_review");
  const [revisedMarks, setRevisedMarks] = useState("");
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);

    try {
      await apiFetch(`/v1/exam-reevaluations/${reevaluationId}/review`, {
        method: "POST",
        body: {
          status,
          ...(status === "approved" && revisedMarks !== ""
            ? { revised_marks: Number(revisedMarks) }
            : {}),
          ...(remarks ? { remarks } : {}),
        },
      });
      setDone("Review recorded.");
      onChanged();
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-sm font-semibold text-foreground">Review</h2>
      <p className="mt-0.5 text-xs text-muted">
        Approving with revised marks updates the effective score for the student.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Field label="Status" htmlFor="review_status" required>
          <Select
            id="review_status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            {STATUSES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Revised marks"
          htmlFor="review_marks"
          hint="Required when approving."
        >
          <TextInput
            id="review_marks"
            type="number"
            min="0"
            step="0.01"
            value={revisedMarks}
            onChange={(event) => setRevisedMarks(event.target.value)}
          />
        </Field>
        <Field label="Remarks" htmlFor="review_remarks">
          <TextInput
            id="review_remarks"
            value={remarks}
            onChange={(event) => setRemarks(event.target.value)}
          />
        </Field>
      </div>

      <div className="mt-4 flex justify-end">
        <Button
          type="button"
          loading={busy}
          disabled={status === "approved" && revisedMarks === ""}
          onClick={submit}
        >
          Save review
        </Button>
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

function DeleteAction({ reevaluationId }: { reevaluationId: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async () => {
    setBusy(true);
    setError(null);

    try {
      await apiFetch(`/v1/exam-reevaluations/${reevaluationId}`, {
        method: "DELETE",
      });
      router.push("/dashboard/exams/reevaluations");
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
            Archive this re-evaluation request.
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
