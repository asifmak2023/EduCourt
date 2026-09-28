"use client";

import Link from "next/link";
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
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">
            Items at or below reorder level
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Replenish these items to avoid stock-outs.
          </p>
        </div>

        {data.low_stock_items.length === 0 ? (
          <div className="p-6">
            <EmptyState message="All items are above their reorder level." />
          </div>
        ) : (
          <div className="overflow-x-auto">
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
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <Link
                        href={`/dashboard/inventory/items/${item.id}`}
                        className="text-slate-900 hover:underline"
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
          </div>
        )}
      </Card>
    </div>
  );
}
