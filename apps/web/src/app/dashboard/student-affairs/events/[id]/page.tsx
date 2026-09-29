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
import { StudentAffairsTabs } from "@/components/StudentAffairsTabs";
import { Pagination } from "@/components/Pagination";
import {
  Button,
  buttonClasses,
  Field,
  Select,
  TextInput,
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
} from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import { useStudents } from "@/lib/useLookups";
import { EVENT_PARTICIPANT_STATUS_OPTIONS } from "@/lib/studentAffairsOptions";
import type { EventParticipant, StudentEvent } from "@/lib/types";

export default function EventDetailPage() {
  return (
    <PermissionGate permission="student_affairs.view">
      <EventDetailView />
    </PermissionGate>
  );
}

function EventDetailView() {
  const params = useParams<{ id: string }>();
  const { can } = useAuth();
  const { data, loading, error } = useResource<StudentEvent>(
    params?.id ? `/v1/student-affairs/events/${params.id}` : null
  );

  const [version, setVersion] = useState(0);
  const participants = useList<EventParticipant>(
    `/v1/student-affairs/events/${params.id}/participants`,
    { _r: version }
  );

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <EmptyState message="Event not found." />;

  const bump = () => setVersion((current) => current + 1);

  return (
    <div className="space-y-6">
      <StudentAffairsTabs active="events" />

      <PageHeader
        title={data.title}
        description={data.type ?? undefined}
        actions={
          <>
            {can("student_affairs.edit") ? (
              <Link
                href={`/dashboard/student-affairs/events/${data.id}/edit`}
                className={buttonClasses("secondary")}
              >
                Edit
              </Link>
            ) : null}
            <Link
              href="/dashboard/student-affairs/events"
              className={buttonClasses("secondary")}
            >
              Back
            </Link>
          </>
        }
      />

      <SectionCard title="Event profile">
        <DataList>
          <DataItem label="Starts" value={data.starts_on ?? "-"} />
          <DataItem label="Ends" value={data.ends_on ?? "-"} />
          <DataItem label="Venue" value={data.venue ?? "-"} />
          <DataItem
            label="Budget"
            value={data.budget ? formatCurrency(Number(data.budget)) : "-"}
          />
          <DataItem label="Organizer" value={data.organizer?.name ?? "-"} />
          <DataItem
            label="Participants"
            value={String(data.participants_count ?? participants.meta?.total ?? 0)}
          />
          <DataItem
            label="Status"
            value={<Badge value={data.status ?? "unknown"} />}
          />
          {data.description ? (
            <DataItem label="Description" value={data.description} />
          ) : null}
        </DataList>
      </SectionCard>

      {can("student_affairs.edit") ? (
        <AddParticipantForm eventId={data.id} onAdded={bump} />
      ) : null}

      <Card>
        <div className="border-b border-border-secondary px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">Participants</h2>
        </div>
        {participants.loading ? (
          <div className="p-6">
            <Spinner />
          </div>
        ) : participants.items.length === 0 ? (
          <div className="p-6">
            <EmptyState message="No participants registered yet." />
          </div>
        ) : (
          <Table variant="secondary">
            <Table.ScrollContainer>
              <Table.Content aria-label="Participants">
              <Table.Header>
                <Table.Column isRowHeader>Student</Table.Column>
                <Table.Column>Role</Table.Column>
                <Table.Column>Position</Table.Column>
                <Table.Column>Status</Table.Column>
                {can("student_affairs.edit") ? <Table.Column aria-label="Actions" /> : null}
              </Table.Header>
              <Table.Body>
              {participants.items.map((participant) => (
                <Table.Row key={participant.id} id={participant.id}>
                  <Table.Cell className="text-foreground">{participant.student?.full_name ??
                      `Student #${participant.student_id}`}</Table.Cell>
                  <Table.Cell className="text-muted">{participant.role ?? "-"}</Table.Cell>
                  <Table.Cell className="text-muted">{participant.position ?? "-"}</Table.Cell>
                  <Table.Cell>{can("student_affairs.edit") ? (
                      <ParticipantStatusSelect
                        eventId={data.id}
                        participant={participant}
                        onUpdated={bump}
                      />
                    ) : (
                      <Badge value={participant.status ?? "unknown"} />
                    )}</Table.Cell>
                  {can("student_affairs.edit") ? (
                    <Table.Cell className="text-right"><RemoveParticipantButton
                        eventId={data.id}
                        participantId={participant.id}
                        onRemoved={bump}
                      /></Table.Cell>
                  ) : null}
                </Table.Row>
              ))}
              </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        )}

        {participants.meta ? (
          <Pagination
            page={participants.page}
            lastPage={participants.meta.last_page}
            total={participants.meta.total}
            onPage={participants.setPage}
          />
        ) : null}
      </Card>
    </div>
  );
}

function ParticipantStatusSelect({
  eventId,
  participant,
  onUpdated,
}: {
  eventId: number;
  participant: EventParticipant;
  onUpdated: () => void;
}) {
  const [busy, setBusy] = useState(false);

  const update = async (status: string) => {
    setBusy(true);
    try {
      await apiFetch(
        `/v1/student-affairs/events/${eventId}/participants/${participant.id}`,
        { method: "PUT", body: { status } }
      );
      onUpdated();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Select
      value={participant.status ?? "registered"}
      disabled={busy}
      onChange={(event) => update(event.target.value)}
      className="w-36"
    >
      {EVENT_PARTICIPANT_STATUS_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </Select>
  );
}

function AddParticipantForm({
  eventId,
  onAdded,
}: {
  eventId: number;
  onAdded: () => void;
}) {
  const { items: students } = useStudents();
  const [studentId, setStudentId] = useState("");
  const [role, setRole] = useState("");
  const [position, setPosition] = useState("");
  const [status, setStatus] = useState("registered");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/v1/student-affairs/events/${eventId}/participants`, {
        method: "POST",
        body: {
          student_id: Number(studentId),
          status,
          ...(role ? { role } : {}),
          ...(position ? { position } : {}),
        },
      });
      setStudentId("");
      setRole("");
      setPosition("");
      setStatus("registered");
      onAdded();
    } catch (err: unknown) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Unable to add this participant."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-sm font-semibold text-foreground">Add participant</h2>
      <p className="mt-0.5 text-xs text-muted">
        Adding an existing participant updates their entry.
      </p>
      {error ? (
        <div className="mt-4">
          <ErrorNotice message={error} />
        </div>
      ) : null}
      <div className="mt-4 grid gap-4 sm:grid-cols-4">
        <Field label="Student" htmlFor="event_participant_student" required>
          <Select
            id="event_participant_student"
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
        <Field label="Role" htmlFor="event_participant_role">
          <TextInput
            id="event_participant_role"
            value={role}
            onChange={(event) => setRole(event.target.value)}
            placeholder="e.g. Speaker"
          />
        </Field>
        <Field label="Position" htmlFor="event_participant_position">
          <TextInput
            id="event_participant_position"
            value={position}
            onChange={(event) => setPosition(event.target.value)}
            placeholder="e.g. 2nd"
          />
        </Field>
        <Field label="Status" htmlFor="event_participant_status">
          <Select
            id="event_participant_status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            {EVENT_PARTICIPANT_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="mt-4">
        <Button onClick={submit} loading={busy} disabled={!studentId}>
          Add participant
        </Button>
      </div>
    </Card>
  );
}

function RemoveParticipantButton({
  eventId,
  participantId,
  onRemoved,
}: {
  eventId: number;
  participantId: number;
  onRemoved: () => void;
}) {
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    setBusy(true);
    try {
      await apiFetch(
        `/v1/student-affairs/events/${eventId}/participants/${participantId}`,
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
