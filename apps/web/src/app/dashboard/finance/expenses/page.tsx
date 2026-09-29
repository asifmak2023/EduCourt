"use client";

import { useState } from "react";
import Link from "next/link";
import { Table } from "@heroui/react";
import { useList } from "@/lib/useList";
import { useVendors } from "@/lib/useLookups";
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
import type { Expense } from "@/lib/types";

const STATUSES = [
  { value: "", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "approved", label: "Approved" },
  { value: "partial", label: "Partially paid" },
  { value: "paid", label: "Paid" },
  { value: "void", label: "Void" },
];

export default function ExpensesPage() {
  return (
    <PermissionGate permission="finance.view">
      <ExpensesTable />
    </PermissionGate>
  );
}

function ExpensesTable() {
  const { can } = useAuth();
  const { items: vendors } = useVendors();

  const [status, setStatus] = useState("");
  const [vendorId, setVendorId] = useState("");

  const filters: Record<string, string | number> = {};
  if (status) filters.status = status;
  if (vendorId) filters.vendor_id = Number(vendorId);

  const { items, meta, loading, error, page, setPage, search, setSearch } =
    useList<Expense>("/v1/expenses", filters);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        description="Vendor bills and other operating expenditure."
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
                placeholder="Search reference, bill or payee"
              />
            </div>
            {can("finance.create") ? (
              <Link
                href="/dashboard/finance/expenses/new"
                className={buttonClasses()}
              >
                New expense
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
        <div className="w-56">
          <Select
            value={vendorId}
            onChange={(event) => {
              setPage(1);
              setVendorId(event.target.value);
            }}
          >
            <option value="">All vendors</option>
            {vendors.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.name}
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
          <EmptyState message="No expenses match your filters." />
        ) : (
          <Table variant="secondary">
            <Table.ScrollContainer>
              <Table.Content aria-label="Expenses" className="min-w-[920px]">
                <Table.Header>
                  <Table.Column isRowHeader>Reference</Table.Column>
                  <Table.Column>Date</Table.Column>
                  <Table.Column>Payee</Table.Column>
                  <Table.Column className="text-right">Total</Table.Column>
                  <Table.Column className="text-right">Paid</Table.Column>
                  <Table.Column className="text-right">Outstanding</Table.Column>
                  <Table.Column>Status</Table.Column>
                </Table.Header>
                <Table.Body>
                  {items.map((expense) => (
                    <Table.Row key={expense.id} id={expense.id}>
                      <Table.Cell className="font-mono text-xs text-muted">
                        <Link
                          href={`/dashboard/finance/expenses/${expense.id}`}
                          className="hover:underline"
                        >
                          {expense.reference}
                        </Link>
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {formatDate(expense.expense_date)}
                      </Table.Cell>
                      <Table.Cell className="text-foreground">
                        {expense.vendor?.name ?? expense.payee_name ?? "-"}
                      </Table.Cell>
                      <Table.Cell className="text-right text-foreground">
                        {formatCurrency(expense.total)}
                      </Table.Cell>
                      <Table.Cell className="text-right text-foreground">
                        {formatCurrency(expense.paid_amount)}
                      </Table.Cell>
                      <Table.Cell className="text-right font-medium text-foreground">
                        {formatCurrency(expense.outstanding)}
                      </Table.Cell>
                      <Table.Cell>
                        <Badge value={expense.status} />
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
