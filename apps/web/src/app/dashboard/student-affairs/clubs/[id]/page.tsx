"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useList } from "@/lib/useList";
import { useResource } from "@/lib/useResource";
import { PermissionGate } from "@/components/PermissionGate";
import { StudentAffairsTabs } from "@/components/StudentAffairsTabs";
import { Pagination } from "@/components/Pagination";
import { Button, buttonClasses, Field, Select, TextInput } from "@/components/Form";
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
} from "@/components/ui";
import { useStudents } from "@/lib/useLookups";
import { CLUB_MEMBERSHIP_STATUS_OPTIONS } from "@/lib/studentAffairsOptions";
import type { ClubMembership, StudentClub } from "@/lib/types";

export default function ClubDetailPage() {
  return (
    <PermissionGate permission="student_affairs.view">
      <ClubDetailView />
    </PermissionGate>
  );
}

function ClubDetailView() {
  const params = useParams<{ id: string }>();
  const { can } = useAuth();
  const { data, loading, error } = useResource<StudentClub>(
    params?.id ? `/v1/student-affairs/clubs/${params.id}` : null
  );

  const [version, setVersion] = useState(0);
  const memberships = useList<ClubMembership>(
    `/v1/student-affairs/clubs/${params.id}/members`,
    { _r: version }
  );

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <EmptyState message="Club not found." />;

  return (
    <div className="space-y-6">
      <StudentAffairsTabs active="clubs" />

      <PageHeader
        title={data.name}
        description={data.category ?? data.code}
        actions={
          <>
            {can("student_affairs.edit") ? (
              <Link
                href={`/dashboard/student-affairs/clubs/${data.id}/edit`}
                className={buttonClasses("secondary")}
              >
                Edit
              </Link>
            ) : null}
            <Link
              href="/dashboard/student-affairs/clubs"
              className={buttonClasses("secondary")}
            >
              Back
            </Link>
          </>
        }
      />

      <SectionCard title="Club profile">
        <DataList>
          <DataItem label="Code" value={data.code} />
          <DataItem label="Category" value={data.category ?? "-"} />
          <DataItem label="Patron" value={data.patron?.name ?? "-"} />
          <DataItem
            label="Members"
            value={String(data.members_count ?? memberships.meta?.total ?? 0)}
          />
          <DataItem
            label="Status"
            value={<Badge value={data.is_active ? "active" : "inactive"} />}
          />
          {data.description ? (
            <DataItem label="Description" value={data.description} />
          ) : null}
        </DataList>
      </SectionCard>

      {can("student_affairs.edit") ? (
        <AddMemberForm
          clubId={data.id}
          onAdded={() => setVersion((current) => current + 1)}
        />
      ) : null}

      <Card>
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Roster</h2>
        </div>
        {memberships.loading ? (
          <div className="p-6">
            <Spinner />
          </div>
        ) : memberships.items.length === 0 ? (
          <div className="p-6">
            <EmptyState message="No members on this club yet." />
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Student</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Joined</th>
                <th className="px-5 py-3 font-medium">Status</th>
                {can("student_affairs.edit") ? <th className="px-5 py-3" /> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {memberships.items.map((membership) => (
                <tr key={membership.id}>
                  <td className="px-5 py-3 text-slate-900">
                    {membership.student?.full_name ??
                      `Student #${membership.student_id}`}
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {membership.role ?? "-"}
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {membership.joined_on ?? "-"}
                  </td>
                  <td className="px-5 py-3">
                    <Badge value={membership.status ?? "unknown"} />
                  </td>
                  {can("student_affairs.edit") ? (
                    <td className="px-5 py-3 text-right">
                      <RemoveMemberButton
                        clubId={data.id}
                        membershipId={membership.id}
                        onRemoved={() =>
                          setVersion((current) => current + 1)
                        }
                      />
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {memberships.meta ? (
          <Pagination
            page={memberships.page}
            lastPage={memberships.meta.last_page}
            total={memberships.meta.total}
            onPage={memberships.setPage}
          />
        ) : null}
      </Card>
    </div>
  );
}

function AddMemberForm({
  clubId,
  onAdded,
}: {
  clubId: number;
  onAdded: () => void;
}) {
  const { items: students } = useStudents();
  const [studentId, setStudentId] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("active");
  const [joinedOn, setJoinedOn] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/v1/student-affairs/clubs/${clubId}/members`, {
        method: "POST",
        body: {
          student_id: Number(studentId),
          status,
          ...(role ? { role } : {}),
          ...(joinedOn ? { joined_on: joinedOn } : {}),
        },
      });
      setStudentId("");
      setRole("");
      setStatus("active");
      setJoinedOn("");
      onAdded();
    } catch (err: unknown) {
      setError(
        err instanceof ApiError ? err.message : "Unable to add this member."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-sm font-semibold text-slate-900">Add member</h2>
      <p className="mt-0.5 text-xs text-slate-500">
        Adding an existing member updates their roster entry.
      </p>
      {error ? (
        <div className="mt-4">
          <ErrorNotice message={error} />
        </div>
      ) : null}
      <div className="mt-4 grid gap-4 sm:grid-cols-4">
        <Field label="Student" htmlFor="club_member_student" required>
          <Select
            id="club_member_student"
            value={studentId}
            onChange={(event) => setStudentId(event.target.value)}
          >
            <option value="">Select student</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.full_name} ({student.admission_no})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Role" htmlFor="club_member_role">
          <TextInput
            id="club_member_role"
            value={role}
            onChange={(event) => setRole(event.target.value)}
            placeholder="e.g. President"
          />
        </Field>
        <Field label="Status" htmlFor="club_member_status">
          <Select
            id="club_member_status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            {CLUB_MEMBERSHIP_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Joined on" htmlFor="club_member_joined">
          <TextInput
            id="club_member_joined"
            type="date"
            value={joinedOn}
            onChange={(event) => setJoinedOn(event.target.value)}
          />
        </Field>
      </div>
      <div className="mt-4">
        <Button onClick={submit} loading={busy} disabled={!studentId}>
          Add member
        </Button>
      </div>
    </Card>
  );
}

function RemoveMemberButton({
  clubId,
  membershipId,
  onRemoved,
}: {
  clubId: number;
  membershipId: number;
  onRemoved: () => void;
}) {
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    setBusy(true);
    try {
      await apiFetch(
        `/v1/student-affairs/clubs/${clubId}/members/${membershipId}`,
        { method: "DELETE" }
      );
      onRemoved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant="danger" onClick={remove} loading={busy}>
      Remove
    </Button>
  );
}
