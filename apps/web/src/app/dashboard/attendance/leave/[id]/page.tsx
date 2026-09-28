"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/useResource";
import { PermissionGate } from "@/components/PermissionGate";
import { Button, Field, TextArea, buttonClasses } from "@/components/Form";
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
import { formatDate, formatNumber } from "@/lib/format";
import type { LeaveRequest } from "@/lib/types";

export default function LeaveRequestDetailPage() {
  return (
    <PermissionGate permission="attendance.view">
      <LeaveDetailView />
    </PermissionGate>
  );
}

function LeaveDetailView() {
  const { id } = useParams<{ id: string }>();
  const { can } = useAuth();

  const { data, loading, error, reload } = useResource<LeaveRequest>(
    id ? `/v1/leave-requests/${id}` : null
  );

  if (loading) {
    return <Spinner />;
  }

  if (error) {
    return <ErrorNotice message={error} />;
  }

  if (!data) {
    return <EmptyState message="Leave request not found." />;
  }

  const isPending = data.status === "pending";

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.user?.name ?? `Request #${data.id}`}
        description={`${data.leave_type_label ?? "Leave"} request`}
        actions={
          <Link
            href="/dashboard/attendance/leave"
            className={buttonClasses("secondary")}
          >
            Back
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge value={data.status} />
        <span className="text-xs text-slate-500">
          {formatDate(data.from_date)} - {formatDate(data.to_date)}
        </span>
      </div>

      <Card className="p-6">
        <DataList>
          <DataItem label="Employee" value={data.user?.name ?? `#${data.user_id}`} />
          <DataItem label="Type" value={data.leave_type_label ?? "-"} />
          <DataItem
            label="Days"
            value={data.days === null ? "-" : formatNumber(data.days)}
          />
          <DataItem label="From" value={formatDate(data.from_date)} />
          <DataItem label="To" value={formatDate(data.to_date)} />
          <DataItem label="Decided by" value={data.decided_by ?? "-"} />
          <DataItem label="Decided on" value={formatDate(data.decided_on)} />
        </DataList>

        {data.reason ? (
          <p className="mt-5 border-t border-slate-100 pt-4 text-sm text-slate-600">
            {data.reason}
          </p>
        ) : null}

        {data.decision_note ? (
          <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
            Decision note: {data.decision_note}
          </p>
        ) : null}
      </Card>

      {isPending ? (
        <DecisionActions
          leaveId={data.id}
          canApprove={can("attendance.approve")}
          canCancel={can("attendance.edit")}
          onChanged={reload}
        />
      ) : null}
    </div>
  );
}

function DecisionActions({
  leaveId,
  canApprove,
  canCancel,
  onChanged,
}: {
  leaveId: number;
  canApprove: boolean;
  canCancel: boolean;
  onChanged: () => void;
}) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const act = async (
    action: "approve" | "reject" | "cancel",
    message: string
  ) => {
    setBusy(true);
    setError(null);

    try {
      await apiFetch(`/v1/leave-requests/${leaveId}/${action}`, {
        method: "POST",
        body: action === "cancel" ? {} : { decision_note: note || undefined },
      });
      setDone(message);
      setNote("");
      onChanged();
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-sm font-semibold text-slate-900">Decision</h2>
      <p className="mt-0.5 text-xs text-slate-500">
        Approve, reject or cancel this pending request.
      </p>

      <div className="mt-4">
        <Field label="Decision note" htmlFor="decision_note">
          <TextArea
            id="decision_note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Optional note recorded with the decision"
          />
        </Field>
      </div>

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        {canCancel ? (
          <Button
            variant="secondary"
            type="button"
            loading={busy}
            onClick={() => act("cancel", "Request cancelled.")}
          >
            Cancel request
          </Button>
        ) : null}
        {canApprove ? (
          <>
            <Button
              variant="danger"
              type="button"
              loading={busy}
              onClick={() => act("reject", "Request rejected.")}
            >
              Reject
            </Button>
            <Button
              type="button"
              loading={busy}
              onClick={() => act("approve", "Request approved.")}
            >
              Approve
            </Button>
          </>
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
