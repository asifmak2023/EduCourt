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
import { humanize } from "@/lib/format";
import type { ChartOfAccount } from "@/lib/types";

const ACCOUNT_TYPES = [
  { value: "", label: "All types" },
  { value: "asset", label: "Asset" },
  { value: "liability", label: "Liability" },
  { value: "equity", label: "Equity" },
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
];

export default function ChartOfAccountsPage() {
  return (
    <PermissionGate permission="finance.view">
      <AccountsTable />
    </PermissionGate>
  );
}

function AccountsTable() {
  const { can } = useAuth();
  const [type, setType] = useState("");

  const { items, meta, loading, error, page, setPage, search, setSearch } =
    useList<ChartOfAccount>(
      "/v1/chart-of-accounts",
      type === "" ? {} : { account_type: type }
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chart of accounts"
        description="Ledger accounts available for journal postings."
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
                placeholder="Search code or name"
              />
            </div>
            <Link
              href="/dashboard/finance/journal"
              className={buttonClasses("secondary")}
            >
              Journal
            </Link>
            {can("finance.create") ? (
              <Link
                href="/dashboard/finance/accounts/new"
                className={buttonClasses()}
              >
                New account
              </Link>
            ) : null}
          </>
        }
      />

      <div className="flex flex-wrap gap-3">
        <div className="w-44">
          <Select
            value={type}
            onChange={(event) => {
              setPage(1);
              setType(event.target.value);
            }}
          >
            {ACCOUNT_TYPES.map((option) => (
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
          <EmptyState message="No accounts match your filters." />
        ) : (
          <Table variant="secondary">
            <Table.ScrollContainer>
              <Table.Content
                aria-label="Chart of accounts"
                className="min-w-[760px]"
              >
                <Table.Header>
                  <Table.Column isRowHeader>Code</Table.Column>
                  <Table.Column>Name</Table.Column>
                  <Table.Column>Type</Table.Column>
                  <Table.Column>Normal</Table.Column>
                  <Table.Column>Kind</Table.Column>
                  <Table.Column>Status</Table.Column>
                </Table.Header>
                <Table.Body>
                  {items.map((account) => (
                    <Table.Row key={account.id} id={account.id}>
                      <Table.Cell className="font-mono text-xs text-muted">
                        <Link
                          href={`/dashboard/finance/accounts/${account.id}`}
                          className="hover:underline"
                        >
                          {account.code}
                        </Link>
                      </Table.Cell>
                      <Table.Cell className="font-medium text-foreground">
                        <Link
                          href={`/dashboard/finance/accounts/${account.id}`}
                          className="hover:underline"
                        >
                          {account.name}
                        </Link>
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {humanize(account.account_type)}
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {humanize(account.normal_balance)}
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {account.is_group ? "Group" : "Postable"}
                      </Table.Cell>
                      <Table.Cell>
                        <Badge value={account.is_active ? "active" : "inactive"} />
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
