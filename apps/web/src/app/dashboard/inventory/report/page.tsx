"use client";

import Link from "next/link";
import { Table } from "@heroui/react";
import { useResource } from "@/lib/useResource";
import { PermissionGate } from "@/components/PermissionGate";
import { Button } from "@/components/Form";
import {
  Card,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Spinner,
  StatCard,
} from "@/components/ui";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { InventorySummary } from "@/lib/types";

export default function InventoryReportPage() {
  return (
    <PermissionGate permission="inventory.export">
      <ReportView />
    </PermissionGate>
  );
}

function ReportView() {
  const { data, loading, error, reload } = useResource<InventorySummary>(
    "/v1/inventory/reports/summary"
  );

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <EmptyState message="No summary available." />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory summary"
        description="Item count, stock value and items to reorder."
        actions={
          <Button
            type="button"
            variant="secondary"
            onClick={() => reload()}
          >
            Refresh
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Items" value={formatNumber(data.items)} />
        <StatCard
          label="Stock value"
          value={formatCurrency(data.stock_value)}
        />
        <StatCard
          label="Low stock"
          value={formatNumber(data.low_stock)}
          tone={data.low_stock > 0 ? "danger" : "positive"}
        />
      </div>

      <Card>
        <div className="border-b border-border-secondary px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">
            Items at or below reorder level
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            Replenish these items to avoid stock-outs.
          </p>
        </div>

        {data.low_stock_items.length === 0 ? (
          <div className="p-6">
            <EmptyState message="All items are above their reorder level." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table variant="secondary">
              <Table.ScrollContainer>
                <Table.Content aria-label="Items at or below reorder level">
                <Table.Header>
                  <Table.Column isRowHeader>Item</Table.Column>
                  <Table.Column>Code</Table.Column>
                  <Table.Column className="text-right">On hand</Table.Column>
                  <Table.Column className="text-right">Reorder at</Table.Column>
                </Table.Header>
                <Table.Body>
                {data.low_stock_items.map((item) => (
                  <Table.Row key={item.id} className="hover:bg-surface-secondary" id={item.id}>
                    <Table.Cell><Link
                        href={`/dashboard/inventory/items/${item.id}`}
                        className="text-foreground hover:underline"
                      >
                        {item.name}
                      </Link></Table.Cell>
                    <Table.Cell className="text-muted">{item.code}</Table.Cell>
                    <Table.Cell className="text-right text-foreground">{formatNumber(item.quantity)}</Table.Cell>
                    <Table.Cell className="text-right text-muted">{formatNumber(item.reorder_level)}</Table.Cell>
                  </Table.Row>
                ))}
                </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
