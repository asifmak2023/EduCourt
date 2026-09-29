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
import { formatCurrency, formatDate } from "@/lib/format";
import type { JournalEntry } from "@/lib/types";

const STATUSES = [
  { value: "", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "posted", label: "Posted" },
  { value: "reversed", label: "Reversed" },
];

export default function JournalPage() {
  return (
    <PermissionGate permission="finance.view">
      <JournalTable />
    </PermissionGate>
  );
}

function JournalTable() {
  const { can } = useAuth();
  const { items: fiscalYears } = useFiscalYears();

  const [status, setStatus] = useState("");
  const [fiscalYearId, setFiscalYearId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filters: Record<string, string | number> = {};
  if (status) filters.status = status;
  if (fiscalYearId) filters.fiscal_year_id = Number(fiscalYearId);
  if (from) filters.from = from;
  if (to) filters.to = to;

  const { items, meta, loading, error, page, setPage, search, setSearch } =
    useList<JournalEntry>("/v1/journal-entries", filters);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Journal"
        description="Double-entry journal entries; posted entries are immutable."
        actions={
          <>
            <div className="w-60">
              <TextInput
                type="search"
                value={search}
                onChange={(event) => {
                  setPage(1);
                  setSearch(event.target.value);
                }}
                placeholder="Search reference or memo"
              />
            </div>
            <Link
              href="/dashboard/finance/accounts"
              className={buttonClasses("secondary")}
            >
              Accounts
            </Link>
            {can("finance.create") ? (
              <Link
                href="/dashboard/finance/journal/new"
                className={buttonClasses()}
              >
                New entry
              </Link>
            ) : null}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-40">
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
        <div className="w-44">
          <TextInput
            type="date"
            value={from}
            onChange={(event) => {
              setPage(1);
              setFrom(event.target.value);
            }}
          />
        </div>
        <div className="w-44">
          <TextInput
            type="date"
            value={to}
            onChange={(event) => {
              setPage(1);
              setTo(event.target.value);
            }}
          />
        </div>
      </div>

      {error ? <ErrorNotice message={error} /> : null}

      <Card>
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <EmptyState message="No journal entries match your filters." />
        ) : (
          <Table variant="secondary">
            <Table.ScrollContainer>
              <Table.Content
                aria-label="Journal entries"
                className="min-w-[820px]"
              >
                <Table.Header>
                  <Table.Column isRowHeader>Reference</Table.Column>
                  <Table.Column>Date</Table.Column>
                  <Table.Column>Memo</Table.Column>
                  <Table.Column className="text-right">Debit</Table.Column>
                  <Table.Column className="text-right">Credit</Table.Column>
                  <Table.Column>Status</Table.Column>
                </Table.Header>
                <Table.Body>
                  {items.map((entry) => (
                    <Table.Row key={entry.id} id={entry.id}>
                      <Table.Cell className="font-mono text-xs text-muted">
                        <Link
                          href={`/dashboard/finance/journal/${entry.id}`}
                          className="hover:underline"
                        >
                          {entry.reference}
                        </Link>
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {formatDate(entry.entry_date)}
                      </Table.Cell>
                      <Table.Cell className="text-foreground">
                        {entry.memo ?? "-"}
                      </Table.Cell>
                      <Table.Cell className="text-right text-foreground">
                        {formatCurrency(entry.total_debit)}
                      </Table.Cell>
                      <Table.Cell className="text-right text-foreground">
                        {formatCurrency(entry.total_credit)}
                      </Table.Cell>
                      <Table.Cell>
                        <Badge value={entry.status} />
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
