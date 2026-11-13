"use client";

import { useState } from "react";
import Link from "next/link";
import { Table } from "@heroui/react";
import { useList } from "@/lib/useList";
import { useIncomeSources } from "@/lib/useLookups";
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
import type { OtherIncome } from "@/lib/types";

export default function OtherIncomePage() {
  return (
    <PermissionGate permission="finance.view">
      <OtherIncomeTable />
    </PermissionGate>
  );
}

function OtherIncomeTable() {
  const { can } = useAuth();
  const { items: sources } = useIncomeSources();

  const [sourceId, setSourceId] = useState("");
  const [status, setStatus] = useState("");

  const filters: Record<string, string | number> = {};
  if (sourceId) filters.income_source_id = Number(sourceId);
  if (status) filters.status = status;

  const { items, meta, loading, error, page, setPage, search, setSearch } =
    useList<OtherIncome>("/v1/other-incomes", filters);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Other income"
        description="Non-fee income posted directly to the ledger."
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
                placeholder="Search receipt, payer or reference"
              />
            </div>
            {can("finance.create") ? (
              <Link
                href="/dashboard/finance/other-income/new"
                className={buttonClasses()}
              >
                Record income
              </Link>
            ) : null}
          </>
        }
      />

      <div className="flex flex-wrap gap-3">
        <div className="w-56">
          <Select
            value={sourceId}
            onChange={(event) => {
              setPage(1);
              setSourceId(event.target.value);
            }}
          >
            <option value="">All sources</option>
            {sources.map((source) => (
              <option key={source.id} value={source.id}>
                {source.name}
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
            <option value="posted">Posted</option>
            <option value="draft">Draft</option>
            <option value="void">Void</option>
          </Select>
        </div>
      </div>

      {error ? <ErrorNotice message={error} /> : null}

      <Card>
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <EmptyState message="No other income recorded yet." />
        ) : (
          <Table variant="secondary">
            <Table.ScrollContainer>
              <Table.Content aria-label="Other income" className="min-w-[860px]">
                <Table.Header>
                  <Table.Column isRowHeader>Receipt</Table.Column>
                  <Table.Column>Date</Table.Column>
                  <Table.Column>Source</Table.Column>
                  <Table.Column>Payer</Table.Column>
                  <Table.Column className="text-right">Amount</Table.Column>
                  <Table.Column>Status</Table.Column>
                </Table.Header>
                <Table.Body>
                  {items.map((income) => (
                    <Table.Row key={income.id} id={income.id}>
                      <Table.Cell className="font-mono text-xs text-muted">
                        {income.receipt_no}
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {formatDate(income.received_on)}
                      </Table.Cell>
                      <Table.Cell className="text-foreground">
                        {income.source?.name ?? "-"}
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {income.payer_name ?? "-"}
                      </Table.Cell>
                      <Table.Cell className="text-right font-medium text-foreground">
                        {formatCurrency(income.amount)}
                      </Table.Cell>
                      <Table.Cell>
                        <Badge value={income.status} />
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
