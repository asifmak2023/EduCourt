"use client";

import { useState } from "react";
import Link from "next/link";
import { Table } from "@heroui/react";
import { useList } from "@/lib/useList";
import { useAuth } from "@/lib/auth";
import { PermissionGate } from "@/components/PermissionGate";
import { Pagination } from "@/components/Pagination";
import {
  Badge,
  Card,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Spinner,
} from "@/components/ui";
import { Select, TextInput, buttonClasses } from "@/components/Form";
import { formatDate } from "@/lib/format";
import type { AcademicYear } from "@/lib/types";

const STATUSES = [
  { value: "", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "closed", label: "Closed" },
];

export default function AcademicYearsPage() {
  return (
    <PermissionGate permission="academic.view">
      <YearsTable />
    </PermissionGate>
  );
}

function YearsTable() {
  const { can } = useAuth();
  const [status, setStatus] = useState("");

  const filters: Record<string, string | number> = {};
  if (status) filters.status = status;

  const { items, meta, loading, error, page, setPage, search, setSearch } =
    useList<AcademicYear>("/v1/academic-years", filters);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Academic years"
        description="Sessions that scope terms, classes and results."
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
                placeholder="Search name or code"
              />
            </div>
            {can("academic.create") ? (
              <Link
                href="/dashboard/academics/academic-years/new"
                className={buttonClasses()}
              >
                New year
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
            {STATUSES.map((option) => (
              <option key={option.value || "all"} value={option.value}>
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
          <EmptyState message="No academic years match your filters." />
        ) : (
          <Table variant="secondary">
            <Table.ScrollContainer>
              <Table.Content
                aria-label="Academic years"
                className="min-w-[720px]"
              >
                <Table.Header>
                  <Table.Column isRowHeader>Name</Table.Column>
                  <Table.Column>Code</Table.Column>
                  <Table.Column>Dates</Table.Column>
                  <Table.Column>Terms</Table.Column>
                  <Table.Column>Status</Table.Column>
                </Table.Header>
                <Table.Body>
                  {items.map((year) => (
                    <Table.Row key={year.id} id={year.id}>
                      <Table.Cell className="font-medium text-foreground">
                        <Link
                          href={`/dashboard/academics/academic-years/${year.id}`}
                          className="hover:underline"
                        >
                          {year.name}
                        </Link>
                        {year.is_current ? (
                          <span className="ms-2 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent-soft-foreground">
                            Current
                          </span>
                        ) : null}
                      </Table.Cell>
                      <Table.Cell className="font-mono text-xs text-muted">
                        {year.code}
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {formatDate(year.starts_on)} - {formatDate(year.ends_on)}
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {year.terms?.length ?? 0}
                      </Table.Cell>
                      <Table.Cell>
                        <Badge value={year.status} />
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
