"use client";

import { useState } from "react";
import Link from "next/link";
import { Table } from "@heroui/react";
import { useList } from "@/lib/useList";
import { useAcademicYears } from "@/lib/useLookups";
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
import { Select, buttonClasses } from "@/components/Form";
import { formatDate } from "@/lib/format";
import type { Term } from "@/lib/types";

export default function TermsPage() {
  return (
    <PermissionGate permission="academic.view">
      <TermsTable />
    </PermissionGate>
  );
}

function TermsTable() {
  const { can } = useAuth();
  const { items: years } = useAcademicYears();
  const [academicYearId, setAcademicYearId] = useState("");

  const filters: Record<string, string | number> = {};
  if (academicYearId) filters.academic_year_id = Number(academicYearId);

  const { items, meta, loading, error, page, setPage } = useList<Term>(
    "/v1/terms",
    filters
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Terms"
        description="Teaching blocks inside each academic year."
        actions={
          can("academic.create") ? (
            <Link
              href="/dashboard/academics/terms/new"
              className={buttonClasses()}
            >
              New term
            </Link>
          ) : null
        }
      />

      <div className="w-56">
        <Select
          value={academicYearId}
          onChange={(event) => {
            setPage(1);
            setAcademicYearId(event.target.value);
          }}
        >
          <option value="">All academic years</option>
          {years.map((year) => (
            <option key={year.id} value={year.id}>
              {year.name}
            </option>
          ))}
        </Select>
      </div>

      {error ? <ErrorNotice message={error} /> : null}

      <Card>
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <EmptyState message="No terms match your filters." />
        ) : (
          <Table variant="secondary">
            <Table.ScrollContainer>
              <Table.Content aria-label="Terms" className="min-w-[720px]">
                <Table.Header>
                  <Table.Column isRowHeader>Name</Table.Column>
                  <Table.Column>Academic year</Table.Column>
                  <Table.Column>Sequence</Table.Column>
                  <Table.Column>Dates</Table.Column>
                  <Table.Column>Current</Table.Column>
                </Table.Header>
                <Table.Body>
                  {items.map((term) => (
                    <Table.Row key={term.id} id={term.id}>
                      <Table.Cell className="font-medium text-foreground">
                        {can("academic.edit") ? (
                          <Link
                            href={`/dashboard/academics/terms/${term.id}/edit`}
                            className="hover:underline"
                          >
                            {term.name}
                          </Link>
                        ) : (
                          term.name
                        )}
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {term.academic_year?.name ?? "-"}
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {term.sequence}
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {formatDate(term.starts_on)} - {formatDate(term.ends_on)}
                      </Table.Cell>
                      <Table.Cell>
                        {term.is_current ? <Badge value="active" /> : "-"}
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
