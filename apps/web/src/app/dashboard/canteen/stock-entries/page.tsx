"use client";

import { useState } from "react";
import Link from "next/link";
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
import { formatCurrency, formatNumber } from "@/lib/format";
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
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Item</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium text-right">Quantity</th>
                  <th className="px-5 py-3 font-medium text-right">Unit cost</th>
                  <th className="px-5 py-3 font-medium text-right">Total</th>
                  <th className="px-5 py-3 font-medium text-right">Balance</th>
                  <th className="px-5 py-3 font-medium">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 text-slate-600">
                      {entry.entry_date ?? "-"}
                    </td>
                    <td className="px-5 py-3">
                      <Link
                        href={`/dashboard/canteen/items/${entry.canteen_item_id}`}
                        className="text-slate-900 hover:underline"
                      >
                        {entry.item?.name ?? `#${entry.canteen_item_id}`}
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <Badge value={entry.type ?? "unknown"} />
                    </td>
                    <td className="px-5 py-3 text-right text-slate-900">
                      {formatNumber(entry.quantity)}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-600">
                      {formatCurrency(entry.unit_cost)}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-600">
                      {formatCurrency(entry.total_cost)}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-600">
                      {formatNumber(entry.balance_after)}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {entry.reference ?? entry.supplier?.name ?? "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
