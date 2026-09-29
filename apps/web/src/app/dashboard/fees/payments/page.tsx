"use client";

import { useState } from "react";
import Link from "next/link";
import { Table } from "@heroui/react";
import { useList } from "@/lib/useList";
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
import type { FeePayment } from "@/lib/types";

const METHODS = [
  { value: "", label: "All methods" },
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "cheque", label: "Cheque" },
  { value: "online", label: "Online" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];

const STATUSES = [
  { value: "", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "posted", label: "Posted" },
  { value: "void", label: "Void" },
];

export default function FeePaymentsPage() {
  return (
    <PermissionGate permission="fee.view">
      <PaymentsTable />
    </PermissionGate>
  );
}

function PaymentsTable() {
  const [method, setMethod] = useState("");
  const [status, setStatus] = useState("");

  const filters: Record<string, string> = {};
  if (method) filters.method = method;
  if (status) filters.status = status;

  const { items, meta, loading, error, page, setPage, search, setSearch } =
    useList<FeePayment>("/v1/fee-payments", filters);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fee payments"
        description="Receipts recorded across all vouchers."
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
                placeholder="Search receipt or student"
              />
            </div>
            <Link
              href="/dashboard/fees"
              className={buttonClasses("secondary")}
            >
              Vouchers
            </Link>
          </>
        }
      />

      <div className="flex flex-wrap gap-3">
        <div className="w-44">
          <Select
            value={method}
            onChange={(event) => {
              setPage(1);
              setMethod(event.target.value);
            }}
          >
            {METHODS.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
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
          <EmptyState message="No payments match your filters." />
        ) : (
          <Table variant="secondary">
            <Table.ScrollContainer>
              <Table.Content aria-label="Fee payments" className="min-w-[960px]">
                <Table.Header>
                  <Table.Column isRowHeader>Receipt no</Table.Column>
                  <Table.Column>Student</Table.Column>
                  <Table.Column>Voucher</Table.Column>
                  <Table.Column>Date</Table.Column>
                  <Table.Column className="text-right">Amount</Table.Column>
                  <Table.Column>Method</Table.Column>
                  <Table.Column>Status</Table.Column>
                </Table.Header>
                <Table.Body>
                  {items.map((payment) => (
                    <Table.Row key={payment.id} id={payment.id}>
                      <Table.Cell className="font-mono text-xs text-muted">
                        <Link
                          href={`/dashboard/fees/payments/${payment.id}`}
                          className="hover:underline"
                        >
                          {payment.receipt_no}
                        </Link>
                      </Table.Cell>
                      <Table.Cell className="font-medium text-foreground">
                        {payment.student ? (
                          <Link
                            href={`/dashboard/students/${payment.student.id}`}
                            className="hover:underline"
                          >
                            {payment.student.full_name}
                          </Link>
                        ) : (
                          `Student #${payment.student_id}`
                        )}
                      </Table.Cell>
                      <Table.Cell className="font-mono text-xs text-muted">
                        {payment.voucher ? (
                          <Link
                            href={`/dashboard/fees/${payment.voucher.id}`}
                            className="hover:underline"
                          >
                            {payment.voucher.voucher_no}
                          </Link>
                        ) : (
                          "-"
                        )}
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {formatDate(payment.payment_date)}
                      </Table.Cell>
                      <Table.Cell className="text-right font-medium text-foreground">
                        {formatCurrency(payment.amount)}
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {humanize(payment.method)}
                      </Table.Cell>
                      <Table.Cell>
                        <Badge value={payment.status} />
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
