"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Table } from "@heroui/react";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useList } from "@/lib/useList";
import { useResource } from "@/lib/useResource";
import { PermissionGate } from "@/components/PermissionGate";
import { SportsTabs } from "@/components/SportsTabs";
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
import type { SportTeam, SportTeamMember } from "@/lib/types";

export default function SportTeamDetailPage() {
  return (
    <PermissionGate permission="sports.view">
      <TeamDetailView />
    </PermissionGate>
  );
}

function TeamDetailView() {
  const params = useParams<{ id: string }>();
  const { can } = useAuth();
  const { data, loading, error } = useResource<SportTeam>(
    params?.id ? `/v1/sports/teams/${params.id}` : null
  );

  const [version, setVersion] = useState(0);
  const members = useList<SportTeamMember>(
    `/v1/sports/teams/${params.id}/members`,
    { _r: version }
  );

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <EmptyState message="Team not found." />;

  return (
    <div className="space-y-6">
      <SportsTabs active="teams" />

      <PageHeader
        title={data.name}
        description={data.sport?.name ?? undefined}
        actions={
          <>
            {can("sports.edit") ? (
              <Link
                href={`/dashboard/sports/teams/${data.id}/edit`}
                className={buttonClasses("secondary")}
              >
                Edit
              </Link>
            ) : null}
            <Link
              href="/dashboard/sports/teams"
              className={buttonClasses("secondary")}
            >
              Back
            </Link>
          </>
        }
      />

      <SectionCard title="Team profile">
        <DataList>
          <DataItem label="Sport" value={data.sport?.name ?? "-"} />
          <DataItem label="Age group" value={data.age_group ?? "-"} />
          <DataItem label="Gender" value={data.gender ?? "-"} />
          <DataItem label="Coach" value={data.coach?.name ?? "-"} />
          <DataItem
            label="Players"
            value={String(data.members_count ?? members.meta?.total ?? 0)}
          />
          <DataItem
            label="Status"
            value={<Badge value={data.is_active ? "active" : "inactive"} />}
          />
          {data.notes ? <DataItem label="Notes" value={data.notes} /> : null}
        </DataList>
      </SectionCard>

      {can("sports.edit") ? (
        <AddMemberForm
          teamId={data.id}
          onAdded={() => {
            setVersion((current) => current + 1);
          }}
        />
      ) : null}

      <Card>
        <div className="border-b border-border-secondary px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">Roster</h2>
        </div>
        {members.loading ? (
          <div className="p-6">
            <Spinner />
          </div>
        ) : members.items.length === 0 ? (
          <div className="p-6">
            <EmptyState message="No players on this team yet." />
          </div>
        ) : (
          <Table variant="secondary">
            <Table.ScrollContainer>
              <Table.Content aria-label="Roster">
              <Table.Header>
                <Table.Column isRowHeader>Student</Table.Column>
                <Table.Column>Position</Table.Column>
                <Table.Column>Jersey</Table.Column>
                <Table.Column>Joined</Table.Column>
                <Table.Column>Status</Table.Column>
                {can("sports.edit") ? <Table.Column aria-label="Actions" /> : null}
              </Table.Header>
              <Table.Body>
              {members.items.map((member) => (
                <Table.Row key={member.id} id={member.id}>
                  <Table.Cell className="text-foreground">{member.student?.full_name ?? `Student #${member.student_id}`}</Table.Cell>
                  <Table.Cell className="text-muted">{member.position ?? "-"}</Table.Cell>
                  <Table.Cell className="text-muted">{member.jersey_no ?? "-"}</Table.Cell>
                  <Table.Cell className="text-muted">{member.joined_on ?? "-"}</Table.Cell>
                  <Table.Cell><Badge value={member.status ?? "unknown"} /></Table.Cell>
                  {can("sports.edit") ? (
                    <Table.Cell className="text-right"><RemoveMemberButton
                        teamId={data.id}
                        memberId={member.id}
                        onRemoved={() =>
                          setVersion((current) => current + 1)
                        }
                      /></Table.Cell>
                  ) : null}
                </Table.Row>
              ))}
              </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        )}

        {members.meta ? (
          <Pagination
            page={members.page}
            lastPage={members.meta.last_page}
            total={members.meta.total}
            onPage={members.setPage}
          />
        ) : null}
      </Card>
    </div>
  );
}

function AddMemberForm({
  teamId,
  onAdded,
}: {
  teamId: number;
  onAdded: () => void;
}) {
  const { items: students } = useStudents();
  const [studentId, setStudentId] = useState("");
  const [position, setPosition] = useState("");
  const [jerseyNo, setJerseyNo] = useState("");
  const [joinedOn, setJoinedOn] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/v1/sports/teams/${teamId}/members`, {
        method: "POST",
        body: {
          student_id: Number(studentId),
          ...(position ? { position } : {}),
          ...(jerseyNo ? { jersey_no: jerseyNo } : {}),
          ...(joinedOn ? { joined_on: joinedOn } : {}),
        },
      });
      setStudentId("");
      setPosition("");
      setJerseyNo("");
      setJoinedOn("");
      onAdded();
    } catch (err: unknown) {
      setError(
        err instanceof ApiError ? err.message : "Unable to add this player."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-sm font-semibold text-foreground">Add player</h2>
      <p className="mt-0.5 text-xs text-muted">
        Adding an existing player updates their roster entry.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-4">
        <Field label="Student" htmlFor="member_student" required>
          <Select
            id="member_student"
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
        <Field label="Position" htmlFor="member_position">
          <TextInput
            id="member_position"
            value={position}
            onChange={(event) => setPosition(event.target.value)}
          />
        </Field>
        <Field label="Jersey no." htmlFor="member_jersey">
          <TextInput
            id="member_jersey"
            value={jerseyNo}
            onChange={(event) => setJerseyNo(event.target.value)}
          />
        </Field>
        <Field label="Joined on" htmlFor="member_joined">
          <TextInput
            id="member_joined"
            type="date"
            value={joinedOn}
            onChange={(event) => setJoinedOn(event.target.value)}
          />
        </Field>
      </div>
      {error ? (
        <div className="mt-4">
          <ErrorNotice message={error} />
        </div>
      ) : null}
      <div className="mt-4 flex justify-end">
        <Button
          type="button"
          loading={busy}
          disabled={!studentId}
          onClick={submit}
        >
          Add player
        </Button>
      </div>
    </Card>
  );
}

function RemoveMemberButton({
  teamId,
  memberId,
  onRemoved,
}: {
  teamId: number;
  memberId: number;
  onRemoved: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async () => {
    if (!confirm("Remove this player from the team?")) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/v1/sports/teams/${teamId}/members/${memberId}`, {
        method: "DELETE",
      });
      onRemoved();
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Unable to remove.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" variant="secondary" loading={busy} onClick={remove}>
        Remove
      </Button>
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </div>
  );
}
