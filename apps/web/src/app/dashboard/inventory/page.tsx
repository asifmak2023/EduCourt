"use client";

import Link from "next/link";
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
            <Card className="h-full p-5 transition hover:border-slate-400">
              <p className="text-sm font-semibold text-slate-900">
                {section.title}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {section.description}
              </p>
            </Card>
          </Link>
        ))}
      </div>

      {data && data.low_stock_items.length > 0 ? (
        <Card>
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-900">
              Items to reorder
            </h2>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Item</th>
                <th className="px-5 py-3 font-medium">Code</th>
                <th className="px-5 py-3 font-medium text-right">On hand</th>
                <th className="px-5 py-3 font-medium text-right">Reorder at</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.low_stock_items.map((item) => (
                <tr key={item.id}>
                  <td className="px-5 py-3">
                    <Link
                      href={`/dashboard/inventory/items/${item.id}`}
                      className="font-medium text-slate-900 hover:underline"
                    >
                      {item.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-slate-600">{item.code}</td>
                  <td className="px-5 py-3 text-right text-slate-900">
                    {formatNumber(item.quantity)}
                  </td>
                  <td className="px-5 py-3 text-right text-slate-600">
                    {formatNumber(item.reorder_level)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : null}
    </div>
  );
}
