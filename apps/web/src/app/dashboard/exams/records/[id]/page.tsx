"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Table } from "@heroui/react";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/useResource";
import { useClassRooms } from "@/lib/useLookups";
import { PermissionGate } from "@/components/PermissionGate";
import { Button, Select, buttonClasses } from "@/components/Form";
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
import { formatDate, formatNumber } from "@/lib/format";
import type { Exam, MeritListRow } from "@/lib/types";

export default function ExamDetailPage() {
  return (
    <PermissionGate permission="exam.view">
      <ExamDetailView />
    </PermissionGate>
  );
}

function ExamDetailView() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { can } = useAuth();

  const { data, loading, error, reload } = useResource<Exam>(
    id ? `/v1/exams/${id}` : null
  );

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <EmptyState message="Exam not found." />;

  const papers = data.papers ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.name}
        description={data.exam_type?.name ?? "Examination"}
        actions={
          <>
            <Link
              href="/dashboard/exams/records"
              className={buttonClasses("secondary")}
            >
              Back
            </Link>
            {can("exam.create") ? (
              <Link
                href={`/dashboard/exams/papers/new`}
                className={buttonClasses("secondary")}
              >
                Add paper
              </Link>
            ) : null}
            {can("exam.edit") ? (
              <Link
                href={`/dashboard/exams/records/${data.id}/edit`}
                className={buttonClasses("secondary")}
              >
                Edit
              </Link>
            ) : null}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge value={data.status} />
        <span className="text-xs text-muted">
          {formatDate(data.starts_on)} - {formatDate(data.ends_on)}
        </span>
      </div>

      <Card className="p-6">
        <DataList>
          <DataItem label="Exam type" value={data.exam_type?.name ?? "-"} />
          <DataItem label="Starts on" value={formatDate(data.starts_on)} />
          <DataItem label="Ends on" value={formatDate(data.ends_on)} />
          <DataItem label="Papers" value={formatNumber(papers.length)} />
        </DataList>
        {data.description ? (
          <p className="mt-5 border-t border-border-secondary pt-4 text-sm text-muted">
            {data.description}
          </p>
        ) : null}
      </Card>

      <SectionCard title="Papers">
        {papers.length === 0 ? (
          <EmptyState message="No papers have been scheduled for this exam." />
        ) : (
          <Table variant="secondary">
            <Table.ScrollContainer>
              <Table.Content aria-label="Exam papers" className="min-w-[840px]">
                <Table.Header>
                  <Table.Column isRowHeader>Date</Table.Column>
                  <Table.Column>Class</Table.Column>
                  <Table.Column>Subject</Table.Column>
                  <Table.Column>Room</Table.Column>
                  <Table.Column className="text-right">Max</Table.Column>
                  <Table.Column className="text-right">Pass</Table.Column>
                  <Table.Column className="text-right">Actions</Table.Column>
                </Table.Header>
                <Table.Body>
                  {papers.map((paper) => (
                    <Table.Row key={paper.id} id={paper.id}>
                      <Table.Cell className="text-muted">
                        {formatDate(paper.exam_date)}
                      </Table.Cell>
                      <Table.Cell className="text-foreground">
                        {paper.class_room?.name ?? `#${paper.class_room_id}`}
                      </Table.Cell>
                      <Table.Cell className="text-foreground">
                        {paper.subject?.name ?? `#${paper.subject_id}`}
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {paper.room?.name ?? "-"}
                      </Table.Cell>
                      <Table.Cell className="text-right text-muted">
                        {formatNumber(paper.max_marks)}
                      </Table.Cell>
                      <Table.Cell className="text-right text-muted">
                        {formatNumber(paper.pass_marks)}
                      </Table.Cell>
                      <Table.Cell className="text-right">
                        {can("exam.marks") ? (
                          <Link
                            href={`/dashboard/exams/marks?paper=${paper.id}`}
                            className="text-xs font-medium text-foreground hover:underline"
                          >
                            Enter marks
                          </Link>
                        ) : null}
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        )}
      </SectionCard>

      <MeritListSection examId={data.id} />

      {data.status !== "published" && can("exam.approve") ? (
        <PublishExam examId={data.id} onChanged={reload} />
      ) : null}
    </div>
  );
}

function MeritListSection({ examId }: { examId: number }) {
  const { items: classes } = useClassRooms();
  const [classId, setClassId] = useState("");

  const [rows, setRows] = useState<MeritListRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    const controller = new AbortController();

    const run = async () => {
      if (!classId) {
        setRows(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await apiFetch<{ data: MeritListRow[] }>(
          `/v1/exams/${examId}/merit-list?class_room_id=${classId}`,
          { signal: controller.signal }
        );
        setRows(response.data);
      } catch (err: unknown) {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          setError(
            err instanceof ApiError ? err.message : "Unable to load merit list."
          );
        }
      } finally {
        setLoading(false);
      }
    };

    void run();

    return () => controller.abort();
  }, [examId, classId]);

  useEffect(() => load(), [load]);

  return (
    <SectionCard title="Merit list">
      <div className="mb-4 w-56">
        <Select
          value={classId}
          onChange={(event) => setClassId(event.target.value)}
        >
          <option value="">Select a class</option>
          {classes.map((room) => (
            <option key={room.id} value={room.id}>
              {room.name}
            </option>
          ))}
        </Select>
      </div>

      {error ? <ErrorNotice message={error} /> : null}

      {classId === "" ? (
        <EmptyState message="Choose a class to rank its students." />
      ) : loading ? (
        <Spinner />
      ) : rows && rows.length > 0 ? (
        <Table variant="secondary">
          <Table.ScrollContainer>
            <Table.Content aria-label="Merit list" className="min-w-[640px]">
              <Table.Header>
                <Table.Column isRowHeader>Rank</Table.Column>
                <Table.Column>Student</Table.Column>
                <Table.Column className="text-right">Total</Table.Column>
                <Table.Column className="text-right">Percentage</Table.Column>
                <Table.Column>Grade</Table.Column>
              </Table.Header>
              <Table.Body>
                {rows.map((row) => (
                  <Table.Row key={row.student_id} id={row.student_id}>
                    <Table.Cell className="text-muted">{row.rank}</Table.Cell>
                    <Table.Cell className="font-medium text-foreground">
                      {row.student}
                    </Table.Cell>
                    <Table.Cell className="text-right text-muted">
                      {formatNumber(row.total_obtained)}
                    </Table.Cell>
                    <Table.Cell className="text-right text-muted">
                      {row.percentage}%
                    </Table.Cell>
                    <Table.Cell className="text-muted">
                      {row.grade ?? "-"}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      ) : (
        <EmptyState message="No marks have been recorded for this class." />
      )}
    </SectionCard>
  );
}

function PublishExam({
  examId,
  onChanged,
}: {
  examId: number;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const publish = async () => {
    setBusy(true);
    setError(null);

    try {
      await apiFetch(`/v1/exams/${examId}/publish`, { method: "POST" });
      setDone("Results published.");
      onChanged();
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Unable to publish.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Publish results
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            Publishing marks the exam results as final for parents and students.
          </p>
        </div>
        <Button type="button" loading={busy} onClick={publish}>
          Publish
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
