"use client";

import { useState } from "react";
import Link from "next/link";
import { Table } from "@heroui/react";
import { useList } from "@/lib/useList";
import { useExams } from "@/lib/useLookups";
import { useAuth } from "@/lib/auth";
import { PermissionGate } from "@/components/PermissionGate";
import { Pagination } from "@/components/Pagination";
import { Select, buttonClasses } from "@/components/Form";
import {
  Badge,
  Card,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Spinner,
} from "@/components/ui";
import { formatNumber } from "@/lib/format";
import type { ExamModeration } from "@/lib/types";

const STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "applied", label: "Applied" },
  { value: "rejected", label: "Rejected" },
];

export default function ModerationsPage() {
  return (
    <PermissionGate permission="exam.view">
      <ModerationsTable />
    </PermissionGate>
  );
}

function ModerationsTable() {
  const { can } = useAuth();
  const { items: exams } = useExams();
  const [examId, setExamId] = useState("");
  const [status, setStatus] = useState("");

  const params: Record<string, string | number> = {};
  if (examId) params.exam_id = Number(examId);
  if (status) params.status = status;

  const { items, meta, loading, error, page, setPage } =
    useList<ExamModeration>("/v1/exam-moderations", params);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Moderations"
        description="Grace marks and scaling applied to exam papers."
        actions={
          <>
            <Link href="/dashboard/exams" className={buttonClasses("secondary")}>
              Back
            </Link>
            {can("exam.edit") ? (
              <Link
                href="/dashboard/exams/moderations/new"
                className={buttonClasses()}
              >
                New moderation
              </Link>
            ) : null}
          </>
        }
      />

      <div className="flex flex-wrap gap-3">
        <div className="w-64">
          <Select
            value={examId}
            onChange={(event) => {
              setPage(1);
              setExamId(event.target.value);
            }}
          >
            <option value="">All exams</option>
            {exams.map((exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-44">
          <Select
            value={status}
            onChange={(event) => {
              setPage(1);
              setStatus(event.target.value);
            }}
          >
            <option value="">All statuses</option>
            {STATUSES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {error ? <ErrorNotice message={error} /> : null}

      <Card>
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <EmptyState message="No moderations match your filters." />
        ) : (
          <Table variant="secondary">
            <Table.ScrollContainer>
              <Table.Content
                aria-label="Exam moderations"
                className="min-w-[760px]"
              >
                <Table.Header>
                  <Table.Column isRowHeader>Paper</Table.Column>
                  <Table.Column>Type</Table.Column>
                  <Table.Column className="text-right">Value</Table.Column>
                  <Table.Column>Status</Table.Column>
                  <Table.Column>Reason</Table.Column>
                </Table.Header>
                <Table.Body>
                  {items.map((moderation) => (
                    <Table.Row key={moderation.id} id={moderation.id}>
                      <Table.Cell className="font-medium text-foreground">
                        <Link
                          href={`/dashboard/exams/moderations/${moderation.id}`}
                          className="hover:underline"
                        >
                          {moderation.paper?.class_room?.name ?? "-"} -{" "}
                          {moderation.paper?.subject?.name ?? "-"}
                        </Link>
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {moderation.type === "grace_marks"
                          ? "Grace marks"
                          : moderation.type === "scaling"
                            ? "Scaling"
                            : "-"}
                      </Table.Cell>
                      <Table.Cell className="text-right text-muted">
                        {formatNumber(moderation.value)}
                      </Table.Cell>
                      <Table.Cell>
                        <Badge value={moderation.status} />
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {moderation.reason ?? "-"}
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        )}

        {meta ? (
          <Pagination
            page={page}
            lastPage={meta.last_page}
            total={meta.total}
            onPage={setPage}
          />
        ) : null}
      </Card>
    </div>
  );
}
