"use client";

import { useState } from "react";
import Link from "next/link";
import { Table } from "@heroui/react";
import { useAuth } from "@/lib/auth";
import { useList } from "@/lib/useList";
import { CanteenTabs } from "@/components/CanteenTabs";
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
import { formatCurrency } from "@/lib/format";
import type { CanteenSale } from "@/lib/types";

export default function CanteenSalesPage() {
  const { can } = useAuth();
  const [method, setMethod] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const params: Record<string, string | number> = {};
  if (method) params.payment_method = method;
  if (status) params.status = status;
  if (from) params.from = from;
  if (to) params.to = to;

  const { items, meta, loading, error, page, setPage } =
    useList<CanteenSale>("/v1/canteen/sales", params);

  return (
    <div className="space-y-6">
      <CanteenTabs active="sales" />

      <PageHeader
        title="Canteen sales"
        description="Point-of-sale bills and their payment status."
        actions={
          can("canteen.create") ? (
            <Link
              href="/dashboard/canteen/sales/new"
              className={buttonClasses()}
            >
              New sale
            </Link>
          ) : null
        }
      />

      <div className="flex flex-wrap gap-3">
        <div className="w-48">
          <Select
            value={method}
            onChange={(event) => {
              setPage(1);
              setMethod(event.target.value);
            }}
          >
            <option value="">All methods</option>
            <option value="cash">Cash</option>
            <option value="wallet">Wallet</option>
            <option value="credit">Credit</option>
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
            <option value="completed">Completed</option>
            <option value="void">Void</option>
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
          <EmptyState message="No sales match your filters." />
        ) : (
          <div className="overflow-x-auto">
            <Table variant="secondary">
              <Table.ScrollContainer>
                <Table.Content aria-label="Sales">
                <Table.Header>
                  <Table.Column isRowHeader>Bill</Table.Column>
                  <Table.Column>Customer</Table.Column>
                  <Table.Column>Method</Table.Column>
                  <Table.Column>Sold on</Table.Column>
                  <Table.Column className="text-right">Subtotal</Table.Column>
                  <Table.Column className="text-right">Discount</Table.Column>
                  <Table.Column className="text-right">Total</Table.Column>
                  <Table.Column>Status</Table.Column>
                </Table.Header>
                <Table.Body>
                {items.map((sale) => (
                  <Table.Row key={sale.id} className="hover:bg-surface-secondary" id={sale.id}>
                    <Table.Cell><Link
                        href={`/dashboard/canteen/sales/${sale.id}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {sale.bill_no}
                      </Link></Table.Cell>
                    <Table.Cell className="text-muted">{sale.student?.full_name ?? sale.customer_name ?? "-"}</Table.Cell>
                    <Table.Cell className="text-muted">{sale.payment_method ?? "-"}</Table.Cell>
                    <Table.Cell className="text-muted">{sale.sold_on ?? "-"}</Table.Cell>
                    <Table.Cell className="text-right text-muted">{formatCurrency(sale.subtotal)}</Table.Cell>
                    <Table.Cell className="text-right text-muted">{formatCurrency(sale.discount)}</Table.Cell>
                    <Table.Cell className="text-right text-foreground">{formatCurrency(sale.total)}</Table.Cell>
                    <Table.Cell><Badge value={sale.status ?? "unknown"} /></Table.Cell>
                  </Table.Row>
                ))}
                </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>
          </div>
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
