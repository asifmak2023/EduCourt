"use client";

import { useState } from "react";
import Link from "next/link";
import { Table } from "@heroui/react";
import { useList } from "@/lib/useList";
import { useFiscalYears } from "@/lib/useLookups";
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
import { formatCurrency, formatDate, humanize } from "@/lib/format";
import type { Budget } from "@/lib/types";

const STATUSES = [
  { value: "", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "approved", label: "Approved" },
  { value: "closed", label: "Closed" },
];

export default function BudgetsPage() {
  return (
    <PermissionGate permission="finance.view">
      <BudgetsTable />
    </PermissionGate>
  );
}

function BudgetsTable() {
  const { can } = useAuth();
  const { items: fiscalYears } = useFiscalYears();

  const [status, setStatus] = useState("");
  const [fiscalYearId, setFiscalYearId] = useState("");

  const filters: Record<string, string | number> = {};
  if (status) filters.status = status;
  if (fiscalYearId) filters.fiscal_year_id = Number(fiscalYearId);

  const { items, meta, loading, error, page, setPage, search, setSearch } =
    useList<Budget>("/v1/budgets", filters);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Budgets"
        description="Planned spend per account, measured against actuals."
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
                placeholder="Search budget name"
              />
            </div>
            {can("finance.create") ? (
              <Link
                href="/dashboard/finance/budgets/new"
                className={buttonClasses()}
              >
                New budget
              </Link>
            ) : null}
          </>
        }
      />

      <div className="flex flex-wrap gap-3">
        <div className="w-44">
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
        <div className="w-52">
          <Select
            value={fiscalYearId}
            onChange={(event) => {
              setPage(1);
              setFiscalYearId(event.target.value);
            }}
          >
            <option value="">All fiscal years</option>
            {fiscalYears.map((year) => (
              <option key={year.id} value={year.id}>
                {year.name} ({year.code})
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
          <EmptyState message="No budgets match your filters." />
        ) : (
          <Table variant="secondary">
            <Table.ScrollContainer>
              <Table.Content aria-label="Budgets" className="min-w-[860px]">
                <Table.Header>
                  <Table.Column isRowHeader>Name</Table.Column>
                  <Table.Column>Fiscal year</Table.Column>
                  <Table.Column>Period</Table.Column>
                  <Table.Column>Dates</Table.Column>
                  <Table.Column className="text-right">Budget</Table.Column>
                  <Table.Column>Status</Table.Column>
                </Table.Header>
                <Table.Body>
                  {items.map((budget) => (
                    <Table.Row key={budget.id} id={budget.id}>
                      <Table.Cell className="font-medium text-foreground">
                        <Link
                          href={`/dashboard/finance/budgets/${budget.id}`}
                          className="hover:underline"
                        >
                          {budget.name}
                        </Link>
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {budget.fiscal_year?.name ?? "-"}
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {humanize(budget.period_type)}
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {formatDate(budget.starts_on)} - {formatDate(budget.ends_on)}
                      </Table.Cell>
                      <Table.Cell className="text-right text-foreground">
                        {formatCurrency(budget.total_budget)}
                      </Table.Cell>
                      <Table.Cell>
                        <Badge value={budget.status} />
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
