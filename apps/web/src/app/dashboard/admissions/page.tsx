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
import type { Admission } from "@/lib/types";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "enquiry", label: "Enquiry" },
  { value: "applied", label: "Applied" },
  { value: "under_review", label: "Under review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "enrolled", label: "Enrolled" },
];

export default function AdmissionsPage() {
  return (
    <PermissionGate permission="admission.view">
      <AdmissionsTable />
    </PermissionGate>
  );
}

function AdmissionsTable() {
  const { can } = useAuth();
  const [status, setStatus] = useState("");

  const { items, meta, loading, error, page, setPage, search, setSearch } =
    useList<Admission>("/v1/admissions", { status });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admissions"
        description="Applications and their current stage."
        actions={
          <>
            <div className="w-64">
              <TextInput
                type="search"
                value={search}
                onChange={(event) => {
                  setPage(1);
                  setSearch(event.target.value);
                }}
                placeholder="Search name, application no or phone"
              />
            </div>
            {can("admission.create") ? (
              <Link
                href="/dashboard/admissions/new"
                className={buttonClasses("primary")}
              >
                New application
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
      </div>

      {error ? <ErrorNotice message={error} /> : null}

      <Card>
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <EmptyState message="No applications match your search." />
        ) : (
          <Table variant="secondary">
            <Table.ScrollContainer>
              <Table.Content aria-label="Admissions" className="min-w-[880px]">
                <Table.Header>
                  <Table.Column isRowHeader>Application no</Table.Column>
                  <Table.Column>Applicant</Table.Column>
                  <Table.Column>Class</Table.Column>
                  <Table.Column>Guardian phone</Table.Column>
                  <Table.Column>Applied</Table.Column>
                  <Table.Column>Status</Table.Column>
                </Table.Header>
                <Table.Body>
                  {items.map((admission) => (
                    <Table.Row key={admission.id} id={admission.id}>
                      <Table.Cell className="font-mono text-xs text-muted">
                        {admission.application_no}
                      </Table.Cell>
                      <Table.Cell className="font-medium text-foreground">
                        <Link
                          href={`/dashboard/admissions/${admission.id}`}
                          className="hover:underline"
                        >
                          {admission.full_name}
                        </Link>
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {admission.class_room ?? "-"}
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {admission.guardian_phone ?? "-"}
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {formatDate(admission.applied_on)}
                      </Table.Cell>
                      <Table.Cell>
                        <Badge value={admission.status} />
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
