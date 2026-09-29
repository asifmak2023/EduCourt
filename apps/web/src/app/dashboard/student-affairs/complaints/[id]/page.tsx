"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/useResource";
import { PermissionGate } from "@/components/PermissionGate";
import { StudentAffairsTabs } from "@/components/StudentAffairsTabs";
import {
  Button,
  buttonClasses,
  Field,
  Select,
  TextArea,
} from "@/components/Form";
import {
  Badge,
  Card,
  DataItem,
  DataList,
  EmptyState,
  ErrorNotice,
  PageHeader,
  SectionCard,
  Spinner,
  SuccessNotice,
} from "@/components/ui";
import { useUsers } from "@/lib/useLookups";
import type { Complaint } from "@/lib/types";

export default function ComplaintDetailPage() {
  return (
    <PermissionGate permission="student_affairs.view">
      <ComplaintDetailView />
    </PermissionGate>
  );
}

function ComplaintDetailView() {
  const params = useParams<{ id: string }>();
  const { can } = useAuth();
  const { items: users } = useUsers();
  const { data, loading, error, reload } = useResource<Complaint>(
    params?.id ? `/v1/student-affairs/complaints/${params.id}` : null
  );

  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <EmptyState message="Complaint not found." />;

  const refresh = (message: string) => {
    setNotice(message);
    setActionError(null);
    reload();
  };

  const isClosed = data.status === "resolved" || data.status === "rejected";

  return (
    <div className="space-y-6">
      <StudentAffairsTabs active="complaints" />

      <PageHeader
        title={data.subject}
        description={data.reference_no ?? undefined}
        actions={
          <>
            {can("student_affairs.edit") ? (
              <Link
                href={`/dashboard/student-affairs/complaints/${data.id}/edit`}
                className={buttonClasses("secondary")}
              >
                Edit
              </Link>
            ) : null}
            <Link
              href="/dashboard/student-affairs/complaints"
              className={buttonClasses("secondary")}
            >
              Back
            </Link>
          </>
        }
      />

      {notice ? <SuccessNotice message={notice} /> : null}
      {actionError ? <ErrorNotice message={actionError} /> : null}

      <SectionCard title="Complaint details">
        <DataList>
          <DataItem
            label="Student"
            value={
              data.student?.full_name ??
              (data.student_id ? `Student #${data.student_id}` : "-")
            }
          />
          <DataItem label="Against" value={data.against ?? "-"} />
          <DataItem label="Category" value={data.category ?? "-"} />
          <DataItem
            label="Priority"
            value={<Badge value={data.priority ?? "medium"} />}
          />
          <DataItem
            label="Status"
            value={<Badge value={data.status ?? "open"} />}
          />
          <DataItem label="Assigned to" value={data.assigned_to ?? "-"} />
          <DataItem label="Description" value={data.description} />
          {data.resolution ? (
            <DataItem label="Resolution" value={data.resolution} />
          ) : null}
          {data.resolved_at ? (
            <DataItem label="Resolved at" value={data.resolved_at} />
          ) : null}
        </DataList>
      </SectionCard>

      {can("student_affairs.edit") && !isClosed ? (
        <AssignComplaintCard
          complaintId={data.id}
          users={users}
          onAssigned={() => refresh("Complaint assigned.")}
          onError={setActionError}
        />
      ) : null}

      {can("student_affairs.approve") && !isClosed ? (
        <ResolutionCard
          complaintId={data.id}
          onDone={refresh}
          onError={setActionError}
        />
      ) : null}
    </div>
  );
}

function AssignComplaintCard({
  complaintId,
  users,
  onAssigned,
  onError,
}: {
  complaintId: number;
  users: { id: number; name: string }[];
  onAssigned: () => void;
  onError: (message: string) => void;
}) {
  const [assignedTo, setAssignedTo] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await apiFetch(`/v1/student-affairs/complaints/${complaintId}/assign`, {
        method: "POST",
        body: { assigned_to: Number(assignedTo) },
      });
      onAssigned();
    } catch (err: unknown) {
      onError(err instanceof ApiError ? err.message : "Unable to assign.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-sm font-semibold text-foreground">Assign complaint</h2>
      <p className="mt-0.5 text-xs text-muted">
        Assigning sets the status to in progress.
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-4">
        <div className="w-64">
          <Field label="Assign to" htmlFor="complaint_assignee" required>
            <Select
              id="complaint_assignee"
              value={assignedTo}
              onChange={(event) => setAssignedTo(event.target.value)}
            >
              <option value="">Select user</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Button onClick={submit} loading={busy} disabled={!assignedTo}>
          Assign
        </Button>
      </div>
    </Card>
  );
}

function ResolutionCard({
  complaintId,
  onDone,
  onError,
}: {
  complaintId: number;
  onDone: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [resolution, setResolution] = useState("");
  const [busy, setBusy] = useState<"resolve" | "reject" | null>(null);

  const submit = async (action: "resolve" | "reject") => {
    setBusy(action);
    try {
      await apiFetch(
        `/v1/student-affairs/complaints/${complaintId}/${action}`,
        { method: "POST", body: { resolution } }
      );
      setResolution("");
      onDone(action === "resolve" ? "Complaint resolved." : "Complaint rejected.");
    } catch (err: unknown) {
      onError(err instanceof ApiError ? err.message : "Unable to save.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-sm font-semibold text-foreground">Resolution</h2>
      <p className="mt-0.5 text-xs text-muted">
        Record the outcome and close the complaint.
      </p>
      <div className="mt-4">
        <Field label="Resolution" htmlFor="complaint_resolution" required>
          <TextArea
            id="complaint_resolution"
            value={resolution}
            onChange={(event) => setResolution(event.target.value)}
            rows={3}
          />
        </Field>
      </div>
      <div className="mt-4 flex gap-3">
        <Button
          onClick={() => submit("resolve")}
          loading={busy === "resolve"}
          disabled={!resolution.trim()}
        >
          Resolve
        </Button>
        <Button
          variant="danger"
          onClick={() => submit("reject")}
          loading={busy === "reject"}
          disabled={!resolution.trim()}
        >
          Reject
        </Button>
      </div>
    </Card>
  );
}
