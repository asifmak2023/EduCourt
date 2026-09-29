"use client";

import Link from "next/link";
import { Table } from "@heroui/react";
import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/useResource";
import { PermissionGate } from "@/components/PermissionGate";
import { Card, PageHeader, Spinner, StatCard } from "@/components/ui";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { InventorySummary } from "@/lib/types";

export default function InventoryPage() {
  return (
    <PermissionGate permission="inventory.view">
      <InventoryHome />
    </PermissionGate>
  );
}

const SECTIONS = [
  {
    href: "/dashboard/inventory/items",
    title: "Stock items",
    description: "Quantities, reorder levels and unit costs.",
  },
  {
    href: "/dashboard/inventory/categories",
    title: "Categories",
    description: "Group store items for reporting and filters.",
  },
  {
    href: "/dashboard/inventory/report",
    title: "Summary report",
    description: "Item count, stock value and items to reorder.",
  },
];

function InventoryHome() {
  const { can } = useAuth();
  const { data, loading } = useResource<InventorySummary>(
    can("inventory.export") ? "/v1/inventory/reports/summary" : null
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description="General store stock and movements."
      />

      {loading ? (
        <Spinner />
      ) : data ? (
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
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card className="h-full p-5 transition hover:border-accent">
              <p className="text-sm font-semibold text-foreground">
                {section.title}
              </p>
              <p className="mt-1 text-sm text-muted">
                {section.description}
              </p>
            </Card>
          </Link>
        ))}
      </div>

      {data && data.low_stock_items.length > 0 ? (
        <Card>
          <div className="border-b border-border-secondary px-5 py-4">
            <h2 className="text-sm font-semibold text-foreground">
              Items to reorder
            </h2>
          </div>
          <Table variant="secondary">
            <Table.ScrollContainer>
              <Table.Content aria-label="Items to reorder">
              <Table.Header>
                <Table.Column isRowHeader>Item</Table.Column>
                <Table.Column>Code</Table.Column>
                <Table.Column className="text-right">On hand</Table.Column>
                <Table.Column className="text-right">Reorder at</Table.Column>
              </Table.Header>
              <Table.Body>
              {data.low_stock_items.map((item) => (
                <Table.Row key={item.id} id={item.id}>
                  <Table.Cell><Link
                      href={`/dashboard/inventory/items/${item.id}`}
                      className="font-medium text-foreground hover:underline"
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
        </Card>
      ) : null}
    </div>
  );
}
