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
import { GenerateVoucherDialog } from "@/components/GenerateVoucherDialog";
import { formatCurrency, formatDate } from "@/lib/format";
import type { FeeVoucher } from "@/lib/types";

const STATUSES = [
  { value: "", label: "All statuses" },
  { value: "unpaid", label: "Unpaid" },
  { value: "partial", label: "Partial" },
  { value: "paid", label: "Paid" },
  { value: "void", label: "Void" },
];

export default function FeesPage() {
  return (
    <PermissionGate permission="fee.view">
      <VouchersTable />
    </PermissionGate>
  );
}

function VouchersTable() {
  const [status, setStatus] = useState("");

  const { items, meta, loading, error, page, setPage, search, setSearch, reload } =
    useList<FeeVoucher>("/v1/fee-vouchers", status === "" ? {} : { status });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fee vouchers"
        description="Issued vouchers, payments received and outstanding balances."
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
                placeholder="Search voucher no or student"
              />
            </div>
            <Link
              href="/dashboard/fees/payments"
              className={buttonClasses("secondary")}
            >
              Payments
            </Link>
            <GenerateVoucherDialog onDone={reload} />
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
      </div>

      {error ? <ErrorNotice message={error} /> : null}

      <Card>
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <EmptyState message="No fee vouchers match your filters." />
        ) : (
          <Table variant="secondary">
            <Table.ScrollContainer>
              <Table.Content aria-label="Fee vouchers" className="min-w-[900px]">
                <Table.Header>
                  <Table.Column isRowHeader>Voucher no</Table.Column>
                  <Table.Column>Student</Table.Column>
                  <Table.Column className="text-right">Amount</Table.Column>
                  <Table.Column className="text-right">Paid</Table.Column>
                  <Table.Column className="text-right">Balance</Table.Column>
                  <Table.Column>Due date</Table.Column>
                  <Table.Column>Status</Table.Column>
                </Table.Header>
                <Table.Body>
                  {items.map((voucher) => (
                    <Table.Row key={voucher.id} id={voucher.id}>
                      <Table.Cell className="font-mono text-xs text-muted">
                        <Link
                          href={`/dashboard/fees/${voucher.id}`}
                          className="hover:underline"
                        >
                          {voucher.voucher_no}
                        </Link>
                      </Table.Cell>
                      <Table.Cell className="font-medium text-foreground">
                        {voucher.student ? (
                          <Link
                            href={`/dashboard/students/${voucher.student.id}`}
                            className="hover:underline"
                          >
                            {voucher.student.full_name}
                          </Link>
                        ) : (
                          `Student #${voucher.id}`
                        )}
                      </Table.Cell>
                      <Table.Cell className="text-right text-foreground">
                        {formatCurrency(voucher.amount)}
                      </Table.Cell>
                      <Table.Cell className="text-right text-foreground">
                        {formatCurrency(voucher.paid_amount)}
                      </Table.Cell>
                      <Table.Cell className="text-right font-medium text-foreground">
                        {formatCurrency(voucher.balance)}
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {formatDate(voucher.due_date)}
                      </Table.Cell>
                      <Table.Cell>
                        <Badge value={voucher.status} />
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
