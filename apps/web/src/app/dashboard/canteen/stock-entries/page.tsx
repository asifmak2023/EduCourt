"use client";

import { useState } from "react";
import Link from "next/link";
import { Table } from "@heroui/react";
import { useAuth } from "@/lib/auth";
import { useList } from "@/lib/useList";
import { useCanteenItems } from "@/lib/useLookups";
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
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import type { CanteenStockEntry } from "@/lib/types";

export default function CanteenStockEntriesPage() {
  const { can } = useAuth();
  const { items: canteenItems } = useCanteenItems();
  const [itemId, setItemId] = useState("");
  const [type, setType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const params: Record<string, string | number> = {};
  if (itemId) params.canteen_item_id = itemId;
  if (type) params.type = type;
  if (from) params.from = from;
  if (to) params.to = to;

  const { items, meta, loading, error, page, setPage } =
    useList<CanteenStockEntry>("/v1/canteen/stock-entries", params);

  return (
    <div className="space-y-6">
      <CanteenTabs active="stock" />

      <PageHeader
        title="Stock entries"
        description="Purchases, wastage and returns for canteen items."
        actions={
          can("canteen.create") ? (
            <Link
              href="/dashboard/canteen/stock-entries/new"
              className={buttonClasses()}
            >
              New stock entry
            </Link>
          ) : null
        }
      />

      <div className="flex flex-wrap gap-3">
        <div className="w-64">
          <Select
            value={itemId}
            onChange={(event) => {
              setPage(1);
              setItemId(event.target.value);
            }}
          >
            <option value="">All items</option>
            {canteenItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-52">
          <Select
            value={type}
            onChange={(event) => {
              setPage(1);
              setType(event.target.value);
            }}
          >
            <option value="">All types</option>
            <option value="purchase">Purchase</option>
            <option value="wastage">Wastage</option>
            <option value="return">Return</option>
            <option value="adjustment">Adjustment</option>
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
          <EmptyState message="No stock entries match your filters." />
        ) : (
          <div className="overflow-x-auto">
            <Table variant="secondary">
              <Table.ScrollContainer>
                <Table.Content aria-label="Stock entries">
                <Table.Header>
                  <Table.Column isRowHeader>Date</Table.Column>
                  <Table.Column>Item</Table.Column>
                  <Table.Column>Type</Table.Column>
                  <Table.Column className="text-right">Quantity</Table.Column>
                  <Table.Column className="text-right">Unit cost</Table.Column>
                  <Table.Column className="text-right">Total</Table.Column>
                  <Table.Column className="text-right">Balance</Table.Column>
                  <Table.Column>Reference</Table.Column>
                </Table.Header>
                <Table.Body>
                {items.map((entry) => (
                  <Table.Row key={entry.id} className="hover:bg-surface-secondary" id={entry.id}>
                    <Table.Cell className="text-muted">{formatDate(entry.entry_date)}</Table.Cell>
                    <Table.Cell><Link
                        href={`/dashboard/canteen/items/${entry.canteen_item_id}`}
                        className="text-foreground hover:underline"
                      >
                        {entry.item?.name ?? `#${entry.canteen_item_id}`}
                      </Link></Table.Cell>
                    <Table.Cell><Badge value={entry.type ?? "unknown"} /></Table.Cell>
                    <Table.Cell className="text-right text-foreground">{formatNumber(entry.quantity)}</Table.Cell>
                    <Table.Cell className="text-right text-muted">{formatCurrency(entry.unit_cost)}</Table.Cell>
                    <Table.Cell className="text-right text-muted">{formatCurrency(entry.total_cost)}</Table.Cell>
                    <Table.Cell className="text-right text-muted">{formatNumber(entry.balance_after)}</Table.Cell>
                    <Table.Cell className="text-muted">{entry.reference ?? entry.supplier?.name ?? "-"}</Table.Cell>
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
