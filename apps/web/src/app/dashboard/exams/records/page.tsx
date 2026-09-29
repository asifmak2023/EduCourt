"use client";

import { useState } from "react";
import Link from "next/link";
import { Table } from "@heroui/react";
import { useList } from "@/lib/useList";
import { useAcademicYears, useExamTypes } from "@/lib/useLookups";
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
import { formatDate } from "@/lib/format";
import type { Exam } from "@/lib/types";

const STATUSES = [
  { value: "scheduled", label: "Scheduled" },
  { value: "ongoing", label: "Ongoing" },
  { value: "completed", label: "Completed" },
  { value: "published", label: "Published" },
];

export default function ExamRecordsPage() {
  return (
    <PermissionGate permission="exam.view">
      <RecordsTable />
    </PermissionGate>
  );
}

function RecordsTable() {
  const { can } = useAuth();
  const { items: years } = useAcademicYears();
  const { items: types } = useExamTypes();

  const [yearId, setYearId] = useState("");
  const [typeId, setTypeId] = useState("");
  const [status, setStatus] = useState("");

  const params: Record<string, string | number> = {};
  if (yearId) params.academic_year_id = Number(yearId);
  if (typeId) params.exam_type_id = Number(typeId);
  if (status) params.status = status;

  const { items, meta, loading, error, page, setPage } = useList<Exam>(
    "/v1/exams",
    params
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Examinations"
        description="Exam windows across academic years."
        actions={
          <>
            <Link href="/dashboard/exams" className={buttonClasses("secondary")}>
              Back
            </Link>
            {can("exam.create") ? (
              <Link
                href="/dashboard/exams/records/new"
                className={buttonClasses()}
              >
                New exam
              </Link>
            ) : null}
          </>
        }
      />

      <div className="flex flex-wrap gap-3">
        <div className="w-56">
          <Select
            value={yearId}
            onChange={(event) => {
              setPage(1);
              setYearId(event.target.value);
            }}
          >
            <option value="">All years</option>
            {years.map((year) => (
              <option key={year.id} value={year.id}>
                {year.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-56">
          <Select
            value={typeId}
            onChange={(event) => {
              setPage(1);
              setTypeId(event.target.value);
            }}
          >
            <option value="">All types</option>
            {types.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
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
          <EmptyState message="No exams match your filters." />
        ) : (
          <Table variant="secondary">
            <Table.ScrollContainer>
              <Table.Content aria-label="Examinations" className="min-w-[720px]">
                <Table.Header>
                  <Table.Column isRowHeader>Name</Table.Column>
                  <Table.Column>Type</Table.Column>
                  <Table.Column>Starts</Table.Column>
                  <Table.Column>Ends</Table.Column>
                  <Table.Column>Status</Table.Column>
                </Table.Header>
                <Table.Body>
                  {items.map((exam) => (
                    <Table.Row key={exam.id} id={exam.id}>
                      <Table.Cell className="font-medium text-foreground">
                        <Link
                          href={`/dashboard/exams/records/${exam.id}`}
                          className="hover:underline"
                        >
                          {exam.name}
                        </Link>
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {exam.exam_type?.name ?? "-"}
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {formatDate(exam.starts_on)}
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {formatDate(exam.ends_on)}
                      </Table.Cell>
                      <Table.Cell>
                        <Badge value={exam.status} />
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
