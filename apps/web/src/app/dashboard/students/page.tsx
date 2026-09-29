"use client";

import { useState } from "react";
import Link from "next/link";
import { Table } from "@heroui/react";
import { useList } from "@/lib/useList";
import { useAuth } from "@/lib/auth";
import { PermissionGate } from "@/components/PermissionGate";
import { Pagination } from "@/components/Pagination";
import { Select, TextInput, buttonClasses } from "@/components/Form";
import {
  Badge,
  Card,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Spinner,
} from "@/components/ui";
import { formatDate } from "@/lib/format";
import type { Student } from "@/lib/types";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "graduated", label: "Graduated" },
  { value: "transferred", label: "Transferred" },
  { value: "withdrawn", label: "Withdrawn" },
];

export default function StudentsPage() {
  return (
    <PermissionGate permission="student.view">
      <StudentsTable />
    </PermissionGate>
  );
}

function StudentsTable() {
  const { can } = useAuth();
  const [status, setStatus] = useState("");
  const [gender, setGender] = useState("");

  const { items, meta, loading, error, page, setPage, search, setSearch } =
    useList<Student>("/v1/students", { status, gender });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        description="Student register for the active campus."
        actions={
          <>
            <div className="w-56">
              <TextInput
                type="search"
                value={search}
                onChange={(event) => {
                  setPage(1);
                  setSearch(event.target.value);
                }}
                placeholder="Search name or admission no"
              />
            </div>
            {can("student.create") ? (
              <Link
                href="/dashboard/students/new"
                className={buttonClasses("primary")}
              >
                New student
              </Link>
            ) : null}
          </>
        }
      />

      <div className="flex flex-wrap gap-3">
        <div className="w-52">
          <Select
            value={status}
            onChange={(event) => {
              setPage(1);
              setStatus(event.target.value);
            }}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-52">
          <Select
            value={gender}
            onChange={(event) => {
              setPage(1);
              setGender(event.target.value);
            }}
          >
            <option value="">All genders</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </Select>
        </div>
      </div>

      {error ? <ErrorNotice message={error} /> : null}

      <Card>
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <EmptyState message="No students match your search." />
        ) : (
          <Table variant="secondary">
            <Table.ScrollContainer>
              <Table.Content aria-label="Students" className="min-w-[760px]">
                <Table.Header>
                  <Table.Column isRowHeader>Admission no</Table.Column>
                  <Table.Column>Name</Table.Column>
                  <Table.Column>Gender</Table.Column>
                  <Table.Column>Date of birth</Table.Column>
                  <Table.Column>Status</Table.Column>
                </Table.Header>
                <Table.Body>
                  {items.map((student) => (
                    <Table.Row key={student.id} id={student.id}>
                      <Table.Cell className="font-mono text-xs text-muted">
                        {student.admission_no}
                      </Table.Cell>
                      <Table.Cell className="font-medium text-foreground">
                        <Link
                          href={`/dashboard/students/${student.id}`}
                          className="hover:underline"
                        >
                          {student.full_name}
                        </Link>
                      </Table.Cell>
                      <Table.Cell className="capitalize text-muted">
                        {student.gender ?? "-"}
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {formatDate(student.date_of_birth)}
                      </Table.Cell>
                      <Table.Cell>
                        <Badge value={student.status} />
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
